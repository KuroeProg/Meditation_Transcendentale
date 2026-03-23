import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { coalitionToSlug } from '../utils/coalitionTheme.js'

/**
 * Expose la coalition courante sur <html data-coalition="feu|eau|terre|air"> pour une future DA globale.
 */
export default function CoalitionHtmlSync() {
	const { user } = useAuth()

	useEffect(() => {
		const slug = coalitionToSlug(user?.coalition ?? user?.coalition_name)
		document.documentElement.setAttribute('data-coalition', slug)
		return () => document.documentElement.removeAttribute('data-coalition')
	}, [user?.coalition, user?.coalition_name])

	return null
}
