import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/index.js'
import { useFriendInvite } from '../../chat/index.js'
import Logo42 from '../../../components/common/Logo/Logo42.jsx'
import ProfileCoalitionIcon from '../../../components/common/ProfileCoalitionIcon.jsx'
import { coalitionToSlug, coalitionSlugToLabel } from '../../theme/services/coalitionTheme.js'
import { deriveCoalitionPresentation, deriveCursusLevel } from '../services/profileService.js'
import { get42AvatarUrl } from '../../../utils/sessionUser.js'
import GameStatsSummarySection from '../../stats/components/GameStatsSummarySection.jsx'

function EditableField({ value, onSave, label, placeholder, multiline = false }) {
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState(value || '')
	const inputRef = useRef(null)

	useEffect(() => {
		if (editing && inputRef.current) inputRef.current.focus()
	}, [editing])

	const commit = () => {
		setEditing(false)
		if (draft.trim() !== (value || '').trim()) onSave(draft.trim())
	}

	if (!editing) {
		return (
			<span
				className="profile-editable"
				onClick={() => { setDraft(value || ''); setEditing(true) }}
				title={`Cliquer pour modifier ${label}`}
			>
				{value || <span className="muted">{placeholder}</span>}
				<i className="ri-pencil-line profile-edit-icon" />
			</span>
		)
	}

	if (multiline) {
		return (
			<textarea
				ref={inputRef}
				className="profile-edit-input profile-edit-textarea"
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false) }}
				maxLength={500}
				rows={3}
			/>
		)
	}

	return (
		<input
			ref={inputRef}
			className="profile-edit-input"
			value={draft}
			onChange={(e) => setDraft(e.target.value)}
			onBlur={commit}
			onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
			maxLength={150}
		/>
	)
}

function FriendItem({ friend, onChallenge }) {
	const u = friend.user
	const online = Boolean(u.is_online)
	return (
		<li className="profile-friend-item">
			<img className="profile-friend-avatar" src={u.avatar} alt="" />
			<div className="profile-friend-info">
				<span className="profile-friend-name">{u.username}</span>
				<span className={`profile-friend-status ${online ? 'is-online' : ''}`}>
					{online ? 'En ligne' : 'Hors ligne'}
				</span>
			</div>
			{online && friend.status === 'accepted' && (
				<button className="profile-friend-challenge" onClick={() => onChallenge(u)} type="button">
					Defier
				</button>
			)}
		</li>
	)
}

function Profile() {
	const navigate = useNavigate()
	const { openFriendInvite } = useFriendInvite()
	const { user, loading, error, refetch, isDevMockAuth, logout, resolveUserOnline } = useAuth()
	const [friends, setFriends] = useState([])
	const [profileSaveError, setProfileSaveError] = useState(null)
	const [avatarUploadError, setAvatarUploadError] = useState(null)
	const [uploading, setUploading] = useState(false)
	const fileInputRef = useRef(null)

	const fetchFriends = useCallback(async () => {
		try {
			const res = await fetch('/api/auth/friends?status=accepted', { credentials: 'include' })
			if (res.ok) {
				const data = await res.json()
				setFriends(data.friends || [])
			}
		} catch {}
	}, [])

	useEffect(() => {
		if (user) fetchFriends()
	}, [user, fetchFriends])

	const updateField = async (field, value) => {
		setProfileSaveError(null)
		try {
			const res = await fetch('/api/auth/me/update', {
				method: 'PUT',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ [field]: value }),
			})
			const data = await res.json().catch(() => ({}))
			if (!res.ok) {
				setProfileSaveError(data.error || 'Impossible d\'enregistrer.')
				return false
			}
			refetch()
			return true
		} catch {
			setProfileSaveError('Erreur réseau.')
			return false
		}
	}

	const handleLogout = async () => {
		await logout()
		navigate('/auth', { replace: true })
	}

	const handleAvatarUpload = async (e) => {
		const input = e.target
		const file = input.files?.[0]
		if (!file) return
		setAvatarUploadError(null)
		setUploading(true)
		try {
			const formData = new FormData()
			formData.append('avatar', file)
			const res = await fetch('/api/auth/me/avatar', {
				method: 'POST',
				credentials: 'include',
				body: formData,
			})
			if (res.status === 413) {
				setAvatarUploadError(
					'Image trop volumineuse : choisis un fichier plus léger (la taille maximale autorisée est dépassée).',
				)
				return
			}
			const data = await res.json().catch(() => ({}))
			if (!res.ok) {
				setAvatarUploadError(
					data.error || 'Impossible d’enregistrer cette image. Réessaie avec un autre fichier.',
				)
				return
			}
			refetch()
		} catch {
			setAvatarUploadError('Erreur réseau lors de l’envoi de l’image.')
		} finally {
			setUploading(false)
			input.value = ''
		}
	}

	if (!user) {
		return (
			<div className="page-shell">
				<div className="page-header">
					<h1 className="page-title">Profil</h1>
				</div>
				{loading && <p className="muted">Chargement du profil...</p>}
			</div>
		)
	}

	const email = user?.email ?? null
	const {
		coalition, hasCoalition, coalitionSlug, coalitionLabel, showCoalitionRaw,
	} = deriveCoalitionPresentation(user, coalitionToSlug, coalitionSlugToLabel)
	const levelCursus = deriveCursusLevel(user)
	const avatarSrc = get42AvatarUrl(user)
	const friendsWithLivePresence = friends.map((friend) => ({
		...friend,
		user: {
			...friend.user,
			is_online: resolveUserOnline(friend.user),
		},
	}))

	return (
		<div className="page-shell">
			<div className="page-header">
				<h1 className="page-title">Profil</h1>
			</div>

			{error && !isDevMockAuth && (
				<p className="error-banner" role="alert">{error}</p>
			)}
			{profileSaveError && (
				<p className="error-banner" role="alert">{profileSaveError}</p>
			)}
			{avatarUploadError && (
				<p className="error-banner" role="alert">{avatarUploadError}</p>
			)}

			<div className="profile-layout">
				{/* Hero Card */}
				<section className="surface-card profile-hero">
					<div className="profile-avatar-wrap" onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer' }}>
						<img className="profile-avatar-lg" src={avatarSrc} alt="" />
						<div className="profile-avatar-overlay">
							<i className="ri-camera-line" />
						</div>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/jpeg,image/png,image/gif,image/webp"
							onChange={handleAvatarUpload}
							style={{ display: 'none' }}
						/>
						{uploading && <div className="profile-avatar-uploading"><div className="spinner" /></div>}
					</div>
					<div className="profile-hero-text">
						<h2 className="profile-name profile-name-split">
							<EditableField
								value={user?.first_name ?? ''}
								onSave={(v) => updateField('first_name', v)}
								label="prénom"
								placeholder="Prénom"
							/>
							<span className="profile-name-gap" aria-hidden> </span>
							<EditableField
								value={user?.last_name ?? ''}
								onSave={(v) => updateField('last_name', v)}
								label="nom"
								placeholder="Nom"
							/>
						</h2>
						<p className="profile-username-row muted small">
							<span className="profile-username-label">Nom d&apos;utilisateur :</span>{' '}
							<EditableField
								value={user?.username ?? ''}
								onSave={(v) => updateField('username', v)}
								label="pseudo"
								placeholder="Pseudo"
							/>
						</p>
						{email && <p className="muted small profile-email"><strong>Email :</strong> {email}</p>}
						<p className="profile-bio">
							<EditableField
								value={user?.bio}
								onSave={(v) => updateField('bio', v)}
								label="bio"
								placeholder="Ajouter une bio..."
								multiline
							/>
						</p>
					</div>
				</section>

				{/* Coalition & Level */}
				<section className="surface-card surface-card--42">
					<h2 className="card-title card-title--with-logo42">
						<Logo42 className="logo-42-title" title="42" />
						<span>Coalition &amp; niveau</span>
					</h2>
					<dl className="info-dl info-dl--compact">
						<div className="profile-coalition-field">
							<dt>Coalition</dt>
							<dd className={hasCoalition ? 'profile-coalition-value' : undefined}>
								{hasCoalition ? (
									<>
										<span className="profile-coalition-icon-wrap" aria-hidden>
											<ProfileCoalitionIcon slug={coalitionSlug} />
										</span>
										<span className="profile-coalition-text">
											<span className="profile-coalition-label">{coalitionLabel}</span>
											{showCoalitionRaw && <span className="muted small profile-coalition-raw">{coalition}</span>}
										</span>
									</>
								) : '—'}
							</dd>
						</div>
						<div>
							<dt>Niveau</dt>
							<dd className="profile-cursus-level">{levelCursus != null ? String(levelCursus) : '—'}</dd>
						</div>
					</dl>
				</section>

				{/* Stats */}
				<GameStatsSummarySection user={user} />

				{/* Friends */}
				<section className="surface-card">
					<h2 className="card-title">
						<i className="ri-group-line" style={{ marginRight: '0.5rem' }} />
						Amis ({friends.length})
					</h2>
					{friends.length > 0 ? (
						<ul className="profile-friends-list">
							{friendsWithLivePresence.map((f) => (
								<FriendItem
									key={f.friendship_id}
									friend={f}
									onChallenge={(u) =>
										openFriendInvite({ friendUserId: u.id, friendLabel: u.username })
									}
								/>
							))}
						</ul>
					) : (
						<p className="muted small">Aucun ami pour le moment. Recherche des joueurs depuis le chat !</p>
					)}
				</section>

				<div className="profile-mobile-logout">
					<button type="button" className="profile-mobile-logout__btn" onClick={handleLogout}>
						<i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
						Déconnexion
					</button>
				</div>
			</div>
		</div>
	)
}

export default Profile
