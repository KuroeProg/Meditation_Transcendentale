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
  - chat-drawer-body
  - chat-conversation-list
  - chat-thread
  - chat-thread-messages
  - chat-message-input
  - chat-send-button
- Profile:
  - profile-page
  - profile-username-display
  - profile-username-input
  - profile-bio-display
  - profile-bio-input
