function normalizeCoalitionText(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019']/g, '')
    .replace(/\s+/g, '')
}

export function deriveCoalitionPresentation(user, coalitionToSlug, coalitionSlugToLabel) {
  const coalition = user?.coalition ?? user?.coalition_name ?? user?.coalition_slug
  const hasCoalition = coalition != null && String(coalition).trim() !== ''
  const coalitionSlug = hasCoalition ? coalitionToSlug(coalition) : 'feu'
  const coalitionLabel = hasCoalition ? coalitionSlugToLabel(coalitionSlug) : null
  const coalitionRaw = hasCoalition ? String(coalition).trim() : ''

  const showCoalitionRaw =
    hasCoalition &&
    coalitionRaw !== '' &&
    normalizeCoalitionText(coalitionRaw) !== coalitionSlug &&
    normalizeCoalitionText(coalitionRaw) !== normalizeCoalitionText(coalitionLabel)

  return {
    coalition,
    hasCoalition,
    coalitionSlug,
    coalitionLabel,
    coalitionRaw,
    showCoalitionRaw,
  }
}

export function deriveCursusLevel(user) {
  return user?.cursus_level ?? user?.level ?? user?.pool_level ?? user?.intra_level
}
