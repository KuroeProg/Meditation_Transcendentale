import CoalitionFire from '../../features/theme/components/CoalitionSymbols/Coalition_Fire.jsx'
import CoalitionWater from '../../features/theme/components/CoalitionSymbols/Coalition_Water.jsx'
import CoalitionWind from '../../features/theme/components/CoalitionSymbols/Coalition_Wind.jsx'
import CoalitionEarth from '../../features/theme/components/CoalitionSymbols/Coalition_Earth.jsx'

const BY_SLUG = {
	feu: CoalitionFire,
	eau: CoalitionWater,
	air: CoalitionWind,
	terre: CoalitionEarth,
}

export default function ProfileCoalitionIcon({ slug }) {
	const Cmp = BY_SLUG[slug] ?? CoalitionFire
	return <Cmp />
}
