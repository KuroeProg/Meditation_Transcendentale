# 🎯 auth Feature

## Structure
- `components/` - Feature-specific React components
- `hooks/` - Feature-specific custom hooks
- `pages/` - Page components (if applicable)
- `services/` - Business logic and API calls
- `types/` - TypeScript-style type definitions
- `assets/` - Feature-specific assets (if applicable)
- `styles/` - Feature-specific CSS files (if applicable)

## Migration Status
This folder is part of Phase 1-8 refactoring. Imports may still be scattered.

## Import Convention
```js
// ✓ DO: Import from this feature
import { useAuth } from '@/features/auth/hooks'
import { AuthContext } from '@/features/auth/context'

// ❌ DON'T: Deep imports
import AuthContext from '@/features/auth/context/AuthContext'
```

