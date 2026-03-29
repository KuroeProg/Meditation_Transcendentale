// 🔄 DEPRECATED - This folder is legacy
// All hooks have been moved to features/*/hooks/
// 
// Use instead:
// - import { useAuth } from '../features/auth/index.js'
// - import { useChessEngine } from '../features/chess/hooks/useChessEngine.js'
// - import { useGameAudioPrefs } from '../features/audio/hooks/useGameAudioPrefs.js'
// - import { useReduceMotionPref } from '../features/theme/hooks/useReduceMotionPref.js'

console.warn('Importing from legacy /hooks - migrate to features/*/hooks/')

// Re-export for backward compatibility during migration
export { useAuth } from '../features/auth/index.js'
export { useChessSocket } from '../features/chess/hooks/useChessSocket.js'
export { useGameAudioPrefs } from '../features/audio/hooks/useGameAudioPrefs.js'
export { useReduceMotionPref } from '../features/theme/hooks/useReduceMotionPref.js'
