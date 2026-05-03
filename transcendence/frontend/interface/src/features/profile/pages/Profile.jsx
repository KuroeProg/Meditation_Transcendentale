import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/index.js'
import { useFriendInvite } from '../../chat/index.js'
import UserProfileLink from '../../../components/common/UserProfileLink.jsx'
import Logo42 from '../../../components/common/Logo/Logo42.jsx'
import ProfileCoalitionIcon from '../../../components/common/ProfileCoalitionIcon.jsx'
import { AUTH_PATHS } from '../../../config/authEndpoints.js'
import { coalitionToSlug, coalitionSlugToLabel } from '../../theme/services/coalitionTheme.js'
import { deriveCoalitionPresentation, deriveCursusLevel } from '../services/profileService.js'
import { get42AvatarUrl } from '../../../utils/sessionUser.js'
import GameStatsSummarySection from '../../stats/components/GameStatsSummarySection.jsx'

const ACHIEVEMENTS_BY_ID = {
	first_game: { id: 'first_game', title: 'Premier pas', description: 'Jouer sa première partie.' },
	ten_games: { id: 'ten_games', title: 'Habitué du plateau', description: 'Jouer 10 parties.' },
	first_win: { id: 'first_win', title: 'Première victoire', description: 'Remporter sa première partie.' },
	five_wins: { id: 'five_wins', title: 'Compétiteur', description: 'Atteindre 5 victoires.' },
}

function EditableField({ value, onSave, label, placeholder, multiline = false, testId = null }) {
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
				data-testid={testId ? `${testId}-display` : undefined}
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
				data-testid={testId ? `${testId}-input` : undefined}
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
			data-testid={testId ? `${testId}-input` : undefined}
			value={draft}
			onChange={(e) => setDraft(e.target.value)}
			onBlur={commit}
			onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
			maxLength={150}
		/>
	)
}

function FriendItem({ friend, onChallenge, challengeDisabled }) {
	const u = friend.user
	const online = Boolean(u.is_online)
	return (
		<li className="profile-friend-item">
			<img className="profile-friend-avatar" src={u.avatar} alt="" />
			<div className="profile-friend-info">
				<UserProfileLink userId={u.id} username={u.username} className="profile-friend-name" />
				<span className={`profile-friend-status ${online ? 'is-online' : ''}`}>
					{online ? 'En ligne' : 'Hors ligne'}
				</span>
			</div>
			{online && friend.status === 'accepted' && (
				<button
					className="profile-friend-challenge"
					onClick={() => onChallenge(u)}
					type="button"
					disabled={challengeDisabled}
					title={challengeDisabled ? 'Invitation deja en attente' : 'Defier'}
				>
					Defier
				</button>
			)}
		</li>
	)
}

function Profile() {
	const { userId: profileUserIdParam } = useParams()
	const { openFriendInvite } = useFriendInvite()
	const { user, loading, error, refetch, isDevMockAuth, logout, resolveUserOnline, hasOutgoingPendingInvite } = useAuth()
	const [friends, setFriends] = useState([])
	const [publicProfile, setPublicProfile] = useState(null)
	const [publicLoading, setPublicLoading] = useState(false)
	const [publicError, setPublicError] = useState(null)
	const [profileSaveError, setProfileSaveError] = useState(null)
	const [avatarUploadError, setAvatarUploadError] = useState(null)
	const [uploading, setUploading] = useState(false)
	const fileInputRef = useRef(null)

	const profileUserId = Number(profileUserIdParam)
	const isPublicProfileRoute = Number.isFinite(profileUserId)
	const isSelfProfile = !isPublicProfileRoute || Number(user?.id) === profileUserId
	const canEditProfile = isSelfProfile
	const displayedUser = isSelfProfile ? user : publicProfile

	const fetchFriends = useCallback(async () => {
		if (!canEditProfile) return
		try {
			const res = await fetch('/api/auth/friends?status=accepted', { credentials: 'include' })
			if (res.ok) {
				const data = await res.json()
				setFriends(data.friends || [])
			}
		} catch {}
	}, [canEditProfile])

	useEffect(() => {
		if (displayedUser && canEditProfile) fetchFriends()
	}, [displayedUser, fetchFriends, canEditProfile])

	useEffect(() => {
		if (!isPublicProfileRoute || !profileUserId || !user || isSelfProfile) {
			setPublicProfile(null)
			setPublicError(null)
			setPublicLoading(false)
			return
		}
		let cancelled = false
		setPublicLoading(true)
		setPublicError(null)
		fetch(`${AUTH_PATHS.publicProfileBase}/${profileUserId}`, { credentials: 'include' })
			.then(async (res) => {
				const data = await res.json().catch(() => ({}))
				if (!res.ok) throw new Error(data?.error || 'Profil introuvable')
				return data
			})
			.then((data) => {
				if (!cancelled) setPublicProfile(data?.profile || null)
			})
			.catch((err) => {
				if (!cancelled) setPublicError(err?.message || 'Impossible de charger ce profil.')
			})
			.finally(() => {
				if (!cancelled) setPublicLoading(false)
			})
		return () => {
			cancelled = true
		}
	}, [isPublicProfileRoute, profileUserId, user, isSelfProfile])

	const updateField = async (field, value) => {
		if (!canEditProfile) return false
		setProfileSaveError(null)
		try {
			const res = await fetch('/api/auth/me/update', {
				method: 'POST',
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
		await logout({ redirectTo: '/auth' })
	}

	const handleAvatarUpload = async (e) => {
		if (!canEditProfile) return
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

	if (!displayedUser) {
		return (
			<div className="page-shell chess-grid-pattern">
				<div className="page-header">
					<h1 className="page-title">{isSelfProfile ? 'Profil' : 'Profil public'}</h1>
				</div>
				{(loading || publicLoading) && <p className="muted">Chargement du profil...</p>}
				{publicError && <p className="error-banner" role="alert">{publicError}</p>}
			</div>
		)
	}

	const email = canEditProfile ? displayedUser?.email ?? null : null
	const {
		coalition, hasCoalition, coalitionSlug, coalitionLabel, showCoalitionRaw,
	} = deriveCoalitionPresentation(displayedUser, coalitionToSlug, coalitionSlugToLabel)
	const levelCursus = deriveCursusLevel(displayedUser)
	const avatarSrc = get42AvatarUrl(displayedUser)
	const friendsWithLivePresence = friends.map((friend) => ({
		...friend,
		user: {
			...friend.user,
			is_online: resolveUserOnline(friend.user),
		},
	}))
	const rawAchievements = Array.isArray(displayedUser?.achievements) ? displayedUser.achievements : []
	const achievements = rawAchievements
		.map((entry) => {
			if (entry && typeof entry === 'object' && entry.id) return entry
			return ACHIEVEMENTS_BY_ID[String(entry)] || null
		})
		.filter(Boolean)

	return (
		<div className="page-shell chess-grid-pattern" data-testid="profile-page">
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
					<div className="profile-avatar-wrap" data-testid="profile-avatar-trigger" onClick={canEditProfile ? () => fileInputRef.current?.click() : undefined} style={{ cursor: canEditProfile ? 'pointer' : 'default' }}>
						<img className="profile-avatar-lg" src={avatarSrc} alt="" data-testid="profile-avatar-image" />
						{canEditProfile && (
							<>
								<div className="profile-avatar-overlay">
									<i className="ri-camera-line" />
								</div>
								<input
									ref={fileInputRef}
									type="file"
									accept="image/jpeg,image/png,image/gif,image/webp"
									data-testid="profile-avatar-input"
									onChange={handleAvatarUpload}
									style={{ display: 'none' }}
								/>
							</>
						)}
						{uploading && <div className="profile-avatar-uploading"><div className="spinner" /></div>}
					</div>
					<div className="profile-hero-text">
						<h2 className="profile-name profile-name-split">
							{canEditProfile ? (
								<EditableField
									value={displayedUser?.first_name ?? ''}
									onSave={(v) => updateField('first_name', v)}
									label="prénom"
									placeholder="Prénom"
								/>
							) : <span>{displayedUser?.first_name ?? ''}</span>}
							<span className="profile-name-gap" aria-hidden> </span>
							{canEditProfile ? (
								<EditableField
									value={displayedUser?.last_name ?? ''}
									onSave={(v) => updateField('last_name', v)}
									label="nom"
									placeholder="Nom"
								/>
							) : <span>{displayedUser?.last_name ?? ''}</span>}
						</h2>
						<p className="profile-username-row muted small">
							<span className="profile-username-label">Nom d&apos;utilisateur :</span>{' '}
							{canEditProfile ? (
								<EditableField
									value={displayedUser?.username ?? ''}
									onSave={(v) => updateField('username', v)}
									label="pseudo"
									placeholder="Pseudo"
									testId="profile-username"
								/>
							) : <strong>{displayedUser?.username ?? ''}</strong>}
						</p>
						{email && <p className="muted small profile-email"><strong>Email :</strong> {email}</p>}
						<p className="profile-bio">
							{canEditProfile ? (
								<EditableField
									value={displayedUser?.bio}
									onSave={(v) => updateField('bio', v)}
									label="bio"
									placeholder="Ajouter une bio..."
									multiline
									testId="profile-bio"
								/>
							) : <span>{displayedUser?.bio || <span className="muted">Aucune bio.</span>}</span>}
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
						<div className="profile-coalition-row">
							<div className="profile-coalition-col">
                                <dt>Coalition</dt>
                                <dd className={hasCoalition ? 'profile-coalition-value' : undefined}>
                                    {hasCoalition ? (
                                        <>
                                            <span className="profile-coalition-icon-wrap" aria-hidden>
                                                <ProfileCoalitionIcon slug={coalitionSlug} />
                                            </span>
                                            <span className="profile-coalition-text">
                                                <span className="profile-coalition-label">{coalitionLabel}</span>
                                            </span>
                                        </>
                                    ) : '—'}
                                </dd>
                            </div>
                            <div className="profile-level-col">
                                <dt>Niveau</dt>
                                <dd className="profile-cursus-level">{levelCursus != null ? String(levelCursus) : '—'}</dd>
                            </div>
						</div>
					</dl>
				</section>

				{/* Stats */}
				<GameStatsSummarySection user={displayedUser} />

				<section className="surface-card" data-testid="profile-achievements">
					<h2 className="card-title">
						<i className="ri-medal-line" style={{ marginRight: '0.5rem' }} />
						Succès ({achievements.length})
					</h2>
					{achievements.length > 0 ? (
						<ul className="profile-achievements-list">
							{achievements.map((achievement) => (
								<li key={achievement.id} className="profile-achievement-item">
									<div className="profile-achievement-icon" aria-hidden="true">
										<i className="ri-trophy-line" />
									</div>
									<div className="profile-achievement-content">
										<strong>{achievement.title}</strong>
										<span className="muted small">{achievement.description}</span>
									</div>
								</li>
							))}
						</ul>
					) : (
						<p className="muted small">Aucun succès débloqué pour le moment.</p>
					)}
				</section>

				{/* Friends */}
				{canEditProfile && (
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
									onChallenge={(u) => openFriendInvite({ friendUserId: u.id, friendLabel: u.username })}
									challengeDisabled={hasOutgoingPendingInvite}
								/>
							))}
						</ul>
					) : (
						<p className="muted small">Aucun ami pour le moment. Recherche des joueurs depuis le chat !</p>
					)}
					</section>
				)}

				{canEditProfile && (
					<div className="profile-mobile-logout">
						<button type="button" className="profile-mobile-logout__btn" onClick={handleLogout} data-testid="profile-logout-button">
							<i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
							Déconnexion
						</button>
					</div>
				)}
			</div>
		</div>
	)
}

export default Profile
