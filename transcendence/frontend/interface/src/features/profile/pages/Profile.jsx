import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/index.js'
import Logo42 from '../../../components/common/Logo/Logo42.jsx'
import ProfileCoalitionIcon from '../../../components/common/ProfileCoalitionIcon.jsx'
import { coalitionToSlug, coalitionSlugToLabel } from '../../theme/services/coalitionTheme.js'
import { deriveCoalitionPresentation, deriveCursusLevel } from '../services/profileService.js'
import { get42AvatarUrl, getDisplayTitle } from '../../../utils/sessionUser.js'
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
	return (
		<li className="profile-friend-item">
			<img className="profile-friend-avatar" src={u.avatar} alt="" />
			<div className="profile-friend-info">
				<span className="profile-friend-name">{u.username}</span>
				<span className={`profile-friend-status ${u.is_online ? 'is-online' : ''}`}>
					{u.is_online ? 'En ligne' : 'Hors ligne'}
				</span>
			</div>
			{u.is_online && friend.status === 'accepted' && (
				<button className="profile-friend-challenge" onClick={() => onChallenge(u.id)} type="button">
					Defier
				</button>
			)}
		</li>
	)
}

function LeaderboardRow({ entry, isCurrentUser }) {
	return (
		<tr className={isCurrentUser ? 'leaderboard-current' : ''}>
			<td className="leaderboard-rank">#{entry.rank}</td>
			<td className="leaderboard-user">
				<img className="leaderboard-avatar" src={entry.avatar} alt="" />
				<span>{entry.username}</span>
			</td>
			<td className="leaderboard-elo">{entry.elo_rapid}</td>
			<td className="leaderboard-games">{entry.games_played}</td>
		</tr>
	)
}

function Profile() {
	const { user, loading, error, refetch, isDevMockAuth } = useAuth()
	const [friends, setFriends] = useState([])
	const [leaderboard, setLeaderboard] = useState([])
	const [currentRank, setCurrentRank] = useState(null)
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

	const fetchLeaderboard = useCallback(async () => {
		try {
			const res = await fetch('/api/auth/leaderboard', { credentials: 'include' })
			if (res.ok) {
				const data = await res.json()
				setLeaderboard(data.leaderboard || [])
				setCurrentRank(data.current_user_rank)
			}
		} catch {}
	}, [])

	useEffect(() => {
		if (user) {
			fetchFriends()
			fetchLeaderboard()
		}
	}, [user, fetchFriends, fetchLeaderboard])

	const updateField = async (field, value) => {
		try {
			await fetch('/api/auth/me/update', {
				method: 'PUT',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ [field]: value }),
			})
			refetch()
		} catch {}
	}

	const handleAvatarUpload = async (e) => {
		const file = e.target.files?.[0]
		if (!file) return
		setUploading(true)
		try {
			const formData = new FormData()
			formData.append('avatar', file)
			await fetch('/api/auth/me/avatar', {
				method: 'POST',
				credentials: 'include',
				body: formData,
			})
			refetch()
		} catch {} finally {
			setUploading(false)
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
	const { primary: titlePrimary, secondary: titleSecondary } = getDisplayTitle(user)
	const {
		coalition, hasCoalition, coalitionSlug, coalitionLabel, showCoalitionRaw,
	} = deriveCoalitionPresentation(user, coalitionToSlug, coalitionSlugToLabel)
	const levelCursus = deriveCursusLevel(user)
	const avatarSrc = get42AvatarUrl(user)

	return (
		<div className="page-shell">
			<div className="page-header">
				<h1 className="page-title">Profil</h1>
			</div>

			{error && !isDevMockAuth && (
				<p className="error-banner" role="alert">{error}</p>
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
						<h2 className="profile-name">
							<EditableField value={titlePrimary} onSave={(v) => updateField('first_name', v)} label="nom" placeholder="Ajouter un nom" />
						</h2>
						{titleSecondary && (
							<p className="profile-login42 muted">
								Nom d'utilisateur : <strong>{titleSecondary}</strong>
							</p>
						)}
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
							<dd>{levelCursus != null ? levelCursus : '—'}</dd>
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
							{friends.map((f) => (
								<FriendItem key={f.friendship_id} friend={f} onChallenge={() => {}} />
							))}
						</ul>
					) : (
						<p className="muted small">Aucun ami pour le moment. Recherche des joueurs depuis le chat !</p>
					)}
				</section>

				{/* Leaderboard */}
				<section className="surface-card">
					<h2 className="card-title">
						<i className="ri-trophy-line" style={{ marginRight: '0.5rem' }} />
						Classement
						{currentRank && <span className="profile-rank-badge">#{currentRank}</span>}
					</h2>
					{leaderboard.length > 0 ? (
						<div className="profile-leaderboard-wrap">
							<table className="profile-leaderboard">
								<thead>
									<tr>
										<th>#</th>
										<th>Joueur</th>
										<th>ELO</th>
										<th>Parties</th>
									</tr>
								</thead>
								<tbody>
									{leaderboard.map((entry) => (
										<LeaderboardRow key={entry.id} entry={entry} isCurrentUser={entry.id === user?.id} />
									))}
								</tbody>
							</table>
						</div>
					) : (
						<p className="muted small">Aucune donnee de classement.</p>
					)}
				</section>
			</div>
		</div>
	)
}

export default Profile
