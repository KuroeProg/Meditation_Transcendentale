/**
 * Choixpeau : activé par défaut si la variable n’est pas explicitement `false`.
 * (Compte local + coalition vide → cérémonie / attribution.)
 * Désactiver : `VITE_SORTING_HAT_COALITION=false` ou retirer `<SortingHatGate />` de App.jsx.
 * Retester : localStorage `transcendance_sorting_hat_v1_<id>` + `_pending` ; mock `VITE_MOCK_RESET_SORTING_HAT=true`
 */
const raw = import.meta.env.VITE_SORTING_HAT_COALITION
export const SORTING_HAT_COALITION_ENABLED = raw !== 'false' && raw !== '0'
