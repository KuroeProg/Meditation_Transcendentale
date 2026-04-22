import { useCallback, useEffect, useState } from 'react'
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

function ContactItem({ contact, onAction, onStartChat, isBusy, error }) {
	const u = contact.user
	const coalSlug = coalitionToSlug(u?.coalition)
	const isPending = contact.status === 'pending' && !contact.is_sender

	return (
		<li className="chat-contact-item">
			<img className="chat-contact-avatar" src={u.avatar} alt="" />
			<div className="chat-contact-info">
				<span className="chat-contact-name-row">
					<span className="chat-contact-name">{u.username}</span>
					<span className="chat-coalition-mini" title={coalitionSlugToLabel(coalSlug)}>
						<ProfileCoalitionIcon slug={coalSlug} />
					</span>
				</span>
				<span className={`chat-contact-status ${u.is_online ? 'online' : ''}`}>
					{u.is_online ? 'En ligne' : 'Hors ligne'}
				</span>
				{error && (
					<span className="chat-ca-error" role="alert">
						<i className="ri-error-warning-line" aria-hidden="true" /> {error}
					</span>
				)}
			</div>
			<div className="chat-contact-actions">
				{isPending && (
					<>
					<button
						type="button"
						className="chat-ca-btn chat-ca-accept"
						onClick={() => onAction(contact.friendship_id, 'accept')}
						disabled={isBusy}
						aria-busy={isBusy}
						aria-label="Accepter la demande d'ami"
						title="Accepter"
						data-testid={`friend-accept-${contact.friendship_id}`}
					>
							{isBusy
								? <i className="ri-loader-4-line" aria-hidden="true" />
								: <i className="ri-check-line" aria-hidden="true" />
							}
						</button>
						<button
							type="button"
							className="chat-ca-btn chat-ca-reject"
							onClick={() => onAction(contact.friendship_id, 'delete')}
							disabled={isBusy}
							aria-label="Refuser la demande d'ami"
							title="Refuser"
						>
							<i className="ri-close-line" aria-hidden="true" />
						</button>
					</>
				)}
				{contact.status === 'pending' && contact.is_sender && (
					<span className="chat-ca-pending">En attente</span>
				)}
				{contact.status === 'accepted' && (
					<>
						<button
							type="button"
							className="chat-ca-btn chat-ca-chat"
							onClick={() => onStartChat(u.id)}
							aria-label="Envoyer un message"
							title="Envoyer un message"
						>
							<i className="ri-chat-1-line" aria-hidden="true" />
						</button>
						<button
							type="button"
							className="chat-ca-btn chat-ca-block"
							onClick={() => onAction(contact.friendship_id, 'block')}
							disabled={isBusy}
							aria-label="Bloquer"
							title="Bloquer"
						>
							<i className="ri-forbid-line" aria-hidden="true" />
						</button>
					</>
				)}
				{contact.status === 'blocked' && contact.is_sender && (
					<button
						type="button"
						className="chat-ca-btn"
						onClick={() => onAction(contact.friendship_id, 'unblock')}
						disabled={isBusy}
						aria-label="Débloquer"
						title="Débloquer"
					>
						<i className="ri-lock-unlock-line" aria-hidden="true" />
					</button>
				)}
			</div>
		</li>
	)
}

function SearchResultItem({ user, onAdd }) {
	const coalSlug = coalitionToSlug(user?.coalition)
	return (
		<li className="chat-contact-item">
			<img className="chat-contact-avatar" src={user.avatar} alt="" />
			<div className="chat-contact-info">
				<span className="chat-contact-name-row">
					<span className="chat-contact-name">{user.username}</span>
					<span className="chat-coalition-mini" title={coalitionSlugToLabel(coalSlug)}>
						<ProfileCoalitionIcon slug={coalSlug} />
					</span>
				</span>
				<span className={`chat-contact-status ${user.is_online ? 'online' : ''}`}>
					{user.is_online ? 'En ligne' : 'Hors ligne'}
				</span>
			</div>
			<button type="button" className="chat-ca-btn chat-ca-add" onClick={() => onAdd(user.id)} title="Ajouter en ami">
				<i className="ri-user-add-line" />
			</button>
		</li>
	)
}

export default function ContactSearch({ onOpenConversation }) {
	const [tab, setTab] = useState('friends')
	const [contacts, setContacts] = useState([])
	const [searchQuery, setSearchQuery] = useState('')
	const [searchResults, setSearchResults] = useState([])
	const [searchLoading, setSearchLoading] = useState(false)
	const [actionBusy, setActionBusy] = useState(null) // friendshipId en cours
	const [actionError, setActionError] = useState(null)

	const loadContacts = useCallback(async () => {
		try {
			const data = await fetchFriends()
			const list = data.friends || []
			setContacts(list)
		} catch {
			/* silencieux si hors ligne */
		}
	}, [])

	useEffect(() => { loadContacts() }, [loadContacts])

	useEffect(() => {
		if (searchQuery.length < 2) { setSearchResults([]); return }
		const timer = setTimeout(async () => {
			setSearchLoading(true)
			try {
				const data = await searchUsers(searchQuery)
				setSearchResults(data.users || [])
			} catch {
				setSearchResults([])
			}
			setSearchLoading(false)
		}, 300)
		return () => clearTimeout(timer)
	}, [searchQuery])

	const handleAction = async (friendshipId, action) => {
		if (actionBusy === friendshipId) return
		setActionBusy(friendshipId)
		setActionError(null)
		try {
			if (action === 'delete') {
				await removeFriend(friendshipId)
			} else {
				await friendAction(friendshipId, action)
			}
			await loadContacts()
		} catch (err) {
			const msg = err?.message || 'Action impossible — réessaie'
			setActionError({ id: friendshipId, msg })
		} finally {
			setActionBusy(null)
		}
	}

	const handleAdd = async (userId) => {
		try {
			await sendFriendRequest(userId)
			await loadContacts()
			setSearchQuery('')
			setSearchResults([])
		} catch (err) {
			const msg = err?.message || 'Impossible d\'envoyer la demande'
			setActionError({ id: `add-${userId}`, msg })
		}
	}

	const handleStartChat = async (userId) => {
		try {
			const conv = await createConversation(userId)
			onOpenConversation(conv)
		} catch {
			/* silencieux */
		}
	}

	const accepted = contacts.filter((c) => c.status === 'accepted')
	const pending = contacts.filter((c) => c.status === 'pending')
	const blocked = contacts.filter((c) => c.status === 'blocked')

	return (
		<div className="chat-contacts">
			<div className="chat-contacts-tabs">
				<button type="button" className={`chat-tab ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>
					Amis ({accepted.length})
				</button>
				<button
					type="button"
					className={`chat-tab ${tab === 'pending' ? 'active' : ''}`}
					data-testid="chat-tab-pending"
					onClick={() => setTab('pending')}
				>
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
				{tab === 'friends' && accepted.map((c) => (
					<ContactItem
						key={c.friendship_id}
						contact={c}
						onAction={handleAction}
						onStartChat={handleStartChat}
						isBusy={actionBusy === c.friendship_id}
						error={actionError?.id === c.friendship_id ? actionError.msg : null}
					/>
				))}
				{tab === 'pending' && pending.map((c) => (
					<ContactItem
						key={c.friendship_id}
						contact={c}
						onAction={handleAction}
						onStartChat={handleStartChat}
						isBusy={actionBusy === c.friendship_id}
						error={actionError?.id === c.friendship_id ? actionError.msg : null}
					/>
				))}
				{tab === 'blocked' && blocked.map((c) => (
					<ContactItem
						key={c.friendship_id}
						contact={c}
						onAction={handleAction}
						onStartChat={handleStartChat}
						isBusy={actionBusy === c.friendship_id}
						error={actionError?.id === c.friendship_id ? actionError.msg : null}
					/>
				))}
				{tab === 'search' && searchLoading && <li className="chat-loading">Recherche...</li>}
				{tab === 'search' && !searchLoading && searchResults.map((u) => (
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
