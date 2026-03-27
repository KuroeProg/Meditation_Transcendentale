import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { coalitionToSlug } from '../utils/coalitionTheme.js'

/** `data-coalition` sur `<html>` pour le CSS thème. */
export default function CoalitionHtmlSync() {
	const { user } = useAuth()

	useEffect(() => {
		const slug = coalitionToSlug(user?.coalition ?? user?.coalition_name)
		document.documentElement.setAttribute('data-coalition', slug)
		return () => document.documentElement.removeAttribute('data-coalition')
	}, [user?.coalition, user?.coalition_name])

	return null
}
