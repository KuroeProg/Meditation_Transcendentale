/** Clé sessionStorage : en dev, ignore /api/auth/me pour tester l’UI invité malgré les cookies. */
export const DEV_GUEST_PREVIEW_KEY = 'mt:devGuestPreview'

export function isDevGuestPreviewActive() {
	if (!import.meta.env.DEV) return false
	try {
		return sessionStorage.getItem(DEV_GUEST_PREVIEW_KEY) === '1'
	} catch {
		return false
	}
}

export function enableDevGuestPreview() {
	if (!import.meta.env.DEV) return
	try {
		sessionStorage.setItem(DEV_GUEST_PREVIEW_KEY, '1')
	} catch {
		/* ignore */
	}
}

export function disableDevGuestPreview() {
	try {
		sessionStorage.removeItem(DEV_GUEST_PREVIEW_KEY)
	} catch {
		/* ignore */
	}
}

/**
 * Déconnexion côté API si besoin + flag dev pour ne pas se faire réhydrater par les cookies,
 * puis navigation vers la home invité.
 */
export async function goToGuestHome(logout, navigate) {
	enableDevGuestPreview()
	await logout()
	navigate('/', { replace: true })
}
