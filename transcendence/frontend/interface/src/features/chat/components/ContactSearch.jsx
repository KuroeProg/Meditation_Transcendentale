import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/index.js'
import ProfileCoalitionIcon from '../../../components/common/ProfileCoalitionIcon.jsx'
import { coalitionSlugToLabel, coalitionToSlug } from '../../theme/services/coalitionTheme.js'
import {
	fetchFriends,
	friendAction,
	removeFriend,
	searchUsers,
	sendFriendRequest,
	createConversation,
} from '../services/chatApi.js'

function ContactItem({ contact, onAction, onStartChat }) {
	const u = contact.user
	const online = Boolean(u.is_online)
	const coalSlug = coalitionToSlug(u?.coalition)
	const isBlockedByMe = Boolean(contact.blocked_by_me)
	const isBlockedByOther = contact.status === 'blocked' && !isBlockedByMe
	return (
		<li className="chat-contact-item">
			<img className="chat-contact-avatar" src={u.avatar} alt="" />
			<div className="chat-contact-info">
				<span className="chat-contact-name">{u.username}</span>
				<span className={`chat-contact-status ${online ? 'online' : ''}`}>
					{contact.status === 'blocked'
						? (isBlockedByMe ? 'Bloqué par vous' : 'Bloqué par cet utilisateur')
						: (online ? 'En ligne' : 'Hors ligne')}
					<span className="chat-contact-name-row">
						<span className="chat-contact-name">{u.username}</span>
						<span className="chat-coalition-mini" title={coalitionSlugToLabel(coalSlug)}>
							<ProfileCoalitionIcon slug={coalSlug} />
						</span>
					</span>
				</span>
				{contact.status === 'blocked' && isBlockedByOther && (
					<span className="chat-contact-block-note">Tu es bloque par cet utilisateur</span>
				)}
			</div>
			<div className="chat-contact-actions">
				{contact.status === 'pending' && !contact.is_sender && (
					<>
						<button type="button" className="chat-ca-btn chat-ca-accept" onClick={() => onAction(contact.friendship_id, 'accept')} title="Accepter">
							<i className="ri-check-line" />
						</button>
						<button type="button" className="chat-ca-btn chat-ca-reject" onClick={() => onAction(contact.friendship_id, 'delete')} title="Refuser">
							<i className="ri-close-line" />
						</button>
					</>
				)}
				{contact.status === 'pending' && contact.is_sender && (
					<span className="chat-ca-pending">En attente</span>
				)}
				{contact.status === 'accepted' && (
					<>
						<button type="button" className="chat-ca-btn chat-ca-chat" onClick={() => onStartChat(u.id)} title="Envoyer un message">
							<i className="ri-chat-1-line" />
						</button>
						<button type="button" className="chat-ca-btn chat-ca-block" onClick={() => onAction(contact.friendship_id, 'block')} title="Bloquer">
							<i className="ri-forbid-line" />
						</button>
					</>
				)}
				{contact.status === 'blocked' && isBlockedByMe && (
					<button type="button" className="chat-ca-btn" onClick={() => onAction(contact.friendship_id, 'unblock')} title="Débloquer">
						<i className="ri-lock-unlock-line" />
					</button>
				)}
			</div>
		</li>
	)
}

function SearchResultItem({ user, onAdd }) {
	const online = Boolean(user.is_online)
	const coalSlug = coalitionToSlug(user?.coalition)
	return (
		<li className="chat-contact-item">
			<img className="chat-contact-avatar" src={user.avatar} alt="" />
			<div className="chat-contact-info">
				<span className="chat-contact-name">{user.username}</span>
				<span className={`chat-contact-status ${online ? 'online' : ''}`}>
					{online ? 'En ligne' : 'Hors ligne'}
					<span className="chat-contact-name-row">
						<span className="chat-contact-name">{user.username}</span>
						<span className="chat-coalition-mini" title={coalitionSlugToLabel(coalSlug)}>
							<ProfileCoalitionIcon slug={coalSlug} />
						</span>
					</span>
				</span>
			</div>
			<button type="button" className="chat-ca-btn chat-ca-add" onClick={() => onAdd(user.id)} title="Ajouter en ami">
				<i className="ri-user-add-line" />
			</button>
		</li>
	)
}

export default function ContactSearch({ onOpenConversation }) {
	const { resolveUserOnline, isAuthenticated, isLoading } = useAuth()
	const [tab, setTab] = useState('friends')
	const [contacts, setContacts] = useState([])
	const [searchQuery, setSearchQuery] = useState('')
	const [searchResults, setSearchResults] = useState([])
	const [searchLoading, setSearchLoading] = useState(false)

	const loadContacts = useCallback(async () => {
		if (!isAuthenticated) return
		try {
			const data = await fetchFriends()
			setContacts(data.friends || [])
		} catch {}
	}, [isAuthenticated])

	useEffect(() => {
		if (!isAuthenticated || isLoading) {
			setContacts([])
			setSearchResults([])
			setSearchLoading(false)
			return
		}
		loadContacts()
	}, [isAuthenticated, isLoading, loadContacts])

	useEffect(() => {
		if (searchQuery.length < 2) { setSearchResults([]); return }
		const timer = setTimeout(async () => {
			setSearchLoading(true)
			try {
				const data = await searchUsers(searchQuery)
				setSearchResults(data.users || [])
			} catch {}
			setSearchLoading(false)
		}, 300)
		return () => clearTimeout(timer)
	}, [searchQuery])

	const handleAction = async (friendshipId, action) => {
		try {
			if (action === 'delete') {
				await removeFriend(friendshipId)
			} else {
				await friendAction(friendshipId, action)
			}
			loadContacts()
		} catch {}
	}

	const handleAdd = async (userId) => {
		try {
			await sendFriendRequest(userId)
			loadContacts()
			setSearchQuery('')
			setSearchResults([])
		} catch {}
	}

	const handleStartChat = async (userId) => {
		try {
			const conv = await createConversation(userId)
			onOpenConversation(conv)
		} catch {}
	}

	const accepted = contacts.filter((c) => c.status === 'accepted')
	const pending = contacts.filter((c) => c.status === 'pending')
	const blocked = contacts.filter((c) => c.status === 'blocked')
	const toLiveContact = (contact) => ({
		...contact,
		user: {
			...contact.user,
			is_online: resolveUserOnline(contact.user),
		},
	})
	const acceptedLive = accepted.map(toLiveContact)
	const pendingLive = pending.map(toLiveContact)
	const blockedLive = blocked.map(toLiveContact)
	const searchResultsLive = searchResults.map((entry) => ({
		...entry,
		is_online: resolveUserOnline(entry),
	}))

	return (
		<div className="chat-contacts">
			<div className="chat-contacts-tabs">
				<button type="button" className={`chat-tab ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>
					Amis ({accepted.length})
				</button>
				<button type="button" className={`chat-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
					En attente ({pending.length})
				</button>
				<button type="button" className={`chat-tab ${tab === 'blocked' ? 'active' : ''}`} onClick={() => setTab('blocked')}>
					Bloques ({blocked.length})
				</button>
				<button type="button" className={`chat-tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>
					<i className="ri-search-line" />
				</button>
			</div>

			{tab === 'search' && (
				<div className="chat-search-bar">
					<i className="ri-search-line" />
					<input
						type="text"
						placeholder="Rechercher un joueur..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
			)}

			<ul className="chat-contact-list">
				{tab === 'friends' && acceptedLive.map((c) => (
					<ContactItem key={c.friendship_id} contact={c} onAction={handleAction} onStartChat={handleStartChat} />
				))}
				{tab === 'pending' && pendingLive.map((c) => (
					<ContactItem key={c.friendship_id} contact={c} onAction={handleAction} onStartChat={handleStartChat} />
				))}
				{tab === 'blocked' && blockedLive.map((c) => (
					<ContactItem key={c.friendship_id} contact={c} onAction={handleAction} onStartChat={handleStartChat} />
				))}
				{tab === 'search' && searchLoading && <li className="chat-loading">Recherche...</li>}
				{tab === 'search' && !searchLoading && searchResultsLive.map((u) => (
					<SearchResultItem key={u.id} user={u} onAdd={handleAdd} />
				))}
				{tab === 'search' && !searchLoading && searchQuery.length >= 2 && !searchResults.length && (
					<li className="chat-empty">Aucun resultat</li>
				)}
				{tab === 'friends' && !accepted.length && <li className="chat-empty">Aucun ami</li>}
				{tab === 'pending' && !pending.length && <li className="chat-empty">Aucune demande</li>}
				{tab === 'blocked' && !blocked.length && <li className="chat-empty">Aucun utilisateur bloque</li>}
			</ul>
		</div>
	)
}
