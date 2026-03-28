import CoalitionFire from '../Coalition_symbol/Coalition_Fire.jsx'
import CoalitionWater from '../Coalition_symbol/Coalition_Water.jsx'
import CoalitionWind from '../Coalition_symbol/Coalition_Wind.jsx'
import CoalitionEarth from '../Coalition_symbol/Coalition_Earth.jsx'

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
