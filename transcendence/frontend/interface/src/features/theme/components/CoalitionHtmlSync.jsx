import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/index.js'
import { coalitionToSlug, shouldUseNeutralGuestTheme } from '../services/coalitionTheme.js'

/** `data-coalition` sur `<html>` pour le CSS thème. */
export default function CoalitionHtmlSync() {
	const { user, loading } = useAuth()
	const { pathname } = useLocation()

	useEffect(() => {
		const raw = user?.coalition ?? user?.coalition_name
		const slug = user
			? raw != null && String(raw).trim() !== ''
				? coalitionToSlug(raw)
				: 'neutral'
			: shouldUseNeutralGuestTheme(pathname, Boolean(user), loading)
				? 'neutral'
				: coalitionToSlug(null)
		document.documentElement.setAttribute('data-coalition', slug)
		return () => document.documentElement.removeAttribute('data-coalition')
	}, [user?.id, user?.coalition, user?.coalition_name, pathname, loading])

	return null
}
