// 🆕 Chess Type Definitions
// Game modes, statuses, move types

export const GAME_MODES = {
  TRAINING: 'training',
  ONLINE: 'online',
  AI: 'ai',
}

export const GAME_STATUS = {
  WAITING: 'waiting',
  ACTIVE: 'active_match',
  FINISHED: 'finished',
  ABANDONED: 'abandoned',
}

export const MOVE_ANIMATION_PHASES = {
  MEASURE: 'measure',
  SLIDE: 'slide',
  SLIDING: 'sliding',
  DONE: 'done',
}
