/**
 * Source unique de configuration pour la navigation.
 * Partagée entre Sidebar (desktop) et BottomNav (mobile).
 * Ajouter/supprimer un élément ici l'applique aux deux navigations.
 */
export const NAV_ITEMS = [
	{ to: '/dashboard', icon: 'fa-table-columns', label: 'Dashboard' },
	{ to: '/game',      icon: 'fa-chess',          label: 'Jouer'     },
	{ to: '/profile',  icon: 'fa-user',            label: 'Profil'    },
	{ to: '/statistics',icon: 'fa-chart-pie',      label: 'Stats'     },
	{ to: '/history',  icon: 'fa-scroll',          label: 'Annales'   },
	{ to: '/settings', icon: 'fa-gear',            label: 'Réglages'  },
]
