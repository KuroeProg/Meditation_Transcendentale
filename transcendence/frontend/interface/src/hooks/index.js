// 🔄 DEPRECATED - This folder is legacy
// All hooks have been moved to features/*/hooks/
// 
// Use instead:
// - import { useAuth } from '@/features/auth/hooks'
// - import { useChessEngine } from '@/features/chess/hooks'
// - import { useGameAudioPrefs } from '@/features/audio/hooks'
// - import { useReduceMotionPref } from '@/features/theme/hooks'

console.warn('⚠️ Importing from legacy /hooks - migrate to features/*/hooks/')

// Re-export for backward compatibility during migration
export { useAuth } from '@/features/auth/hooks/useAuth'
export { useChessSocket } from '@/features/chess/hooks/useChessSocket'
export { useGameAudioPrefs } from '@/features/audio/hooks/useGameAudioPrefs'
export { useReduceMotionPref } from '@/features/theme/hooks/useReduceMotionPref'
