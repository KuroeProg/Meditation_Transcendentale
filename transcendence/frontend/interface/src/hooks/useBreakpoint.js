import { useSyncExternalStore } from 'react'

const MOBILE_QUERY = '(max-width: 770px)'
const TABLET_QUERY = '(min-width: 771px) and (max-width: 1024px)'

function createMediaStore(query) {
	const mql = typeof window !== 'undefined' ? window.matchMedia(query) : null
	return {
		subscribe(cb) {
			mql?.addEventListener('change', cb)
			return () => mql?.removeEventListener('change', cb)
		},
		getSnapshot() {
			return mql?.matches ?? false
		},
		getServerSnapshot() {
			return false
		},
	}
}

const mobileStore = createMediaStore(MOBILE_QUERY)
const tabletStore = createMediaStore(TABLET_QUERY)

export function useBreakpoint() {
	const isMobile = useSyncExternalStore(
		mobileStore.subscribe,
		mobileStore.getSnapshot,
		mobileStore.getServerSnapshot,
	)
	const isTablet = useSyncExternalStore(
		tabletStore.subscribe,
		tabletStore.getSnapshot,
		tabletStore.getServerSnapshot,
	)
	return { isMobile, isTablet, isDesktop: !isMobile && !isTablet }
}
