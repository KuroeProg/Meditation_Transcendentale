# E2E selector contract

This file defines stable selectors used by Playwright specs.

Rules:
- Prefer data-testid for critical actions and state assertions.
- Keep role/text selectors only for stable product copy.
- Add new test ids when a core flow cannot be selected deterministically.

Current stable selectors:
- Home:
  - home-page
  - home-login-cta
  - home-register-cta
  - home-dashboard-link
- Dashboard:
  - dashboard-page
  - dashboard-start-matchmaking
  - matchmaking-modal
  - matchmaking-queue-size
  - matchmaking-cancel
- Game:
  - game-page
  - game-shell
  - game-board-frame
  - game-player-bar-top
  - game-player-bar-bottom
- Chat:
  - chat-fab-cluster
  - chat-open-button
  - chat-drawer
  - chat-drawer-overlay
  - chat-drawer-body
  - chat-conversation-list
  - chat-conversations-loading
  - chat-conversations-empty
  - chat-thread
  - chat-thread-empty
  - chat-thread-messages
  - chat-thread-invite-button
  - chat-message-input
  - chat-send-button
  - chat-toast-button
  - chat-game-invite-card
  - chat-invite-accept
  - friend-invite-modal
  - friend-invite-send
  - chat-conversation-item-${conversationId} (dynamic)
- Profile:
  - profile-page
  - profile-username-display
  - profile-username-input
  - profile-bio-display
  - profile-bio-input
  - profile-avatar-trigger
  - profile-avatar-input
  - profile-avatar-image
  - profile-logout-button

- Stats / History panel (in-game):
  - ingame-bgm-fab (musique — un seul par onglet, dans l’en-tête type Annales)
  - ingame-moves-ghv-header
  - ingame-history-ghv-header
  - ingame-chat-ghv-header
  - ingame-friends-ghv-header
  - ingame-friends-wrap
  - ingame-history-panel
  - ingame-history-list
  - ingame-history-row-${gameId} (dynamic)
- History page (/history):
  - history-page
  - history-filters
  - history-game-list
  - history-row-${gameId} (dynamic)
  - history-row-detail-${gameId} (dynamic)
- In-game chat:
  - ingame-chat
  - ingame-chat-messages
  - ingame-chat-input
  - ingame-chat-send
- Captured pieces HUD:
  - captured-bar-top
  - captured-bar-bottom
- Sorting Hat ceremony:
  - sorting-hat-overlay
  - sorting-hat-dismiss
- Friend requests:
  - friend-accept-${friendshipId} (dynamic)

Notes:
- Some tests still rely on non-testid selectors for legacy areas (example: auth form ids, typing indicator classes).
- When touching these areas, prefer adding a stable `data-testid` and update this file.
