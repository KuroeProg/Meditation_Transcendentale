/**
 * Choixpeau : `VITE_SORTING_HAT_COALITION=true` + compte `auth_provider === 'local'` (réponse /api/auth/me).
 * Retester : supprimer localStorage `transcendance_sorting_hat_v1_<id>` (et `_pending`) ou `VITE_MOCK_RESET_SORTING_HAT=true` en mock.
 * Mock : `make mock-help`
 *
 * Désactiver : ne pas définir la variable / false, ou retirer `<SortingHatGate />` dans App.jsx.
 */
export const SORTING_HAT_COALITION_ENABLED = import.meta.env.VITE_SORTING_HAT_COALITION === 'true'
