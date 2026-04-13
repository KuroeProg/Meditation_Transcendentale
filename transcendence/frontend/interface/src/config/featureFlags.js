/**
 * Désactiver le choixpeau : ne pas définir la variable, ou la mettre à false.
 * Retirer aussi `<SortingHatGate />` dans App.jsx pour enlever tout le code mort au build (tree-shake partiel).
 */
export const SORTING_HAT_COALITION_ENABLED = import.meta.env.VITE_SORTING_HAT_COALITION === 'true'
