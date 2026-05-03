import { Link } from 'react-router-dom'

export default function UserProfileLink({
	userId,
	username,
	className = '',
	showAt = false,
	onClick = null,
}) {
	const safeUsername = String(username || 'Inconnu')
	const safeUserId = Number(userId)
	const label = showAt ? `@${safeUsername}` : safeUsername
	if (!Number.isFinite(safeUserId)) {
		return <span className={className}>{label}</span>
	}
	return (
		<Link
			to={`/profile/${safeUserId}`}
			className={`user-profile-link ${className}`.trim()}
			onClick={(event) => {
				event.stopPropagation()
				if (typeof onClick === 'function') onClick(event)
			}}
			title={`Voir le profil de ${safeUsername}`}
		>
			{label}
		</Link>
	)
}
