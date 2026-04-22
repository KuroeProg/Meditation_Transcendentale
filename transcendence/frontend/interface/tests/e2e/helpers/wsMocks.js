export async function installMatchmakingWebSocketMock(page) {
	await page.addInitScript(() => {
		const NativeWebSocket = window.WebSocket

		function createListenerStore() {
			return {
				open: new Set(),
				message: new Set(),
				error: new Set(),
				close: new Set(),
			}
		}

		function emitMockEvent(socket, type, event) {
			const listeners = socket._listeners?.[type]
			if (!listeners) return
			for (const listener of listeners) {
				try {
					listener.call(socket, event)
				} catch {
					// Listener errors should not break test mocks.
				}
			}
		}

		function wireEvent(socket, type, event) {
			if (type === 'open') socket.onopen?.(event)
			if (type === 'message') socket.onmessage?.(event)
			if (type === 'error') socket.onerror?.(event)
			if (type === 'close') socket.onclose?.(event)
			emitMockEvent(socket, type, event)
		}
		window.__e2eMatchmakingMock = { sockets: [] }

		class MockWebSocket {
			static CONNECTING = 0
			static OPEN = 1
			static CLOSING = 2
			static CLOSED = 3

			constructor(url) {
				this.url = String(url)
				this.readyState = MockWebSocket.CONNECTING
				this.onopen = null
				this.onmessage = null
				this.onerror = null
				this.onclose = null
				this._listeners = createListenerStore()
				this._mocked = this.url.includes('/ws/chess/')

				if (this._mocked) {
					window.__e2eMatchmakingMock.sockets.push(this)
					setTimeout(() => {
						this.readyState = MockWebSocket.OPEN
						wireEvent(this, 'open', { type: 'open' })
					}, 0)
					return
				}

				this._native = new NativeWebSocket(url)
				this._native.onopen = (event) => {
					this.readyState = MockWebSocket.OPEN
					wireEvent(this, 'open', event)
				}
				this._native.onmessage = (event) => wireEvent(this, 'message', event)
				this._native.onerror = (event) => wireEvent(this, 'error', event)
				this._native.onclose = (event) => {
					this.readyState = MockWebSocket.CLOSED
					wireEvent(this, 'close', event)
				}
			}

			addEventListener(type, listener) {
				if (!this._mocked) {
					this._native?.addEventListener?.(type, listener)
					return
				}
				this._listeners?.[type]?.add(listener)
			}

			removeEventListener(type, listener) {
				if (!this._mocked) {
					this._native?.removeEventListener?.(type, listener)
					return
				}
				this._listeners?.[type]?.delete(listener)
			}

			send(raw) {
				if (!this._mocked) {
					this._native?.send(raw)
					return
				}

				let data = null
				try {
					data = JSON.parse(raw)
				} catch {
					data = null
				}

				if (!data || this.url.includes('/ws/chess/training')) return

				if (data.action === 'join_queue') {
					const playerId = String(data.player_id)
					this._queueActive = true
					setTimeout(() => {
						wireEvent(this, 'message', { data: JSON.stringify({ action: 'queue_status', queue_size: 1 }) })
					}, 10)
					window.__e2eMatchmakingMock.triggerMatchFound = () => {
						if (!this._queueActive) return
						wireEvent(this, 'message', {
							data: JSON.stringify({
								action: 'match_found',
								game_id: 'e2e-game-123',
								white_player_id: playerId,
								black_player_id: '99999',
							}),
						})
					}
				}

				if (data.action === 'leave_queue') {
					this._queueActive = false
					setTimeout(() => {
						wireEvent(this, 'message', { data: JSON.stringify({ action: 'queue_status', queue_size: 0 }) })
					}, 10)
				}
			}

			close() {
				if (!this._mocked) {
					this._native?.close()
					return
				}
				this.readyState = MockWebSocket.CLOSED
				wireEvent(this, 'close', { type: 'close' })
			}
		}

		window.WebSocket = MockWebSocket
		window.__e2eMatchmakingMock = window.__e2eMatchmakingMock
	})
}

export async function installOnlineGameWebSocketMock(page, gameId = 'e2e-game') {
	await page.addInitScript((targetGameId) => {
		const NativeWebSocket = window.WebSocket

		function createListenerStore() {
			return {
				open: new Set(),
				message: new Set(),
				error: new Set(),
				close: new Set(),
			}
		}

		function emitMockEvent(socket, type, event) {
			const listeners = socket._listeners?.[type]
			if (!listeners) return
			for (const listener of listeners) {
				try {
					listener.call(socket, event)
				} catch {}
			}
		}

		function wireEvent(socket, type, event) {
			if (type === 'open') socket.onopen?.(event)
			if (type === 'message') socket.onmessage?.(event)
			if (type === 'error') socket.onerror?.(event)
			if (type === 'close') socket.onclose?.(event)
			emitMockEvent(socket, type, event)
		}

		class MockWebSocket {
			static CONNECTING = 0
			static OPEN = 1
			static CLOSING = 2
			static CLOSED = 3

			constructor(url) {
				this.url = String(url)
				this.readyState = MockWebSocket.CONNECTING
				this.onopen = null
				this.onmessage = null
				this.onerror = null
				this.onclose = null
				this._listeners = createListenerStore()
				this._mocked = this.url.includes(`/ws/chess/${targetGameId}/`)

				if (this._mocked) {
					setTimeout(() => {
						this.readyState = MockWebSocket.OPEN
						wireEvent(this, 'open', { type: 'open' })
					}, 0)
					return
				}

				this._native = new NativeWebSocket(url)
				this._native.onopen = (event) => {
					this.readyState = MockWebSocket.OPEN
					wireEvent(this, 'open', event)
				}
				this._native.onmessage = (event) => wireEvent(this, 'message', event)
				this._native.onerror = (event) => wireEvent(this, 'error', event)
				this._native.onclose = (event) => {
					this.readyState = MockWebSocket.CLOSED
					wireEvent(this, 'close', event)
				}
			}

			addEventListener(type, listener) {
				if (!this._mocked) {
					this._native?.addEventListener?.(type, listener)
					return
				}
				this._listeners?.[type]?.add(listener)
			}

			removeEventListener(type, listener) {
				if (!this._mocked) {
					this._native?.removeEventListener?.(type, listener)
					return
				}
				this._listeners?.[type]?.delete(listener)
			}

			send(raw) {
				if (!this._mocked) {
					this._native?.send(raw)
					return
				}

				let data = null
				try {
					data = JSON.parse(raw)
				} catch {
					data = null
				}
				if (!data) return

				if (data.action === 'reconnect') {
					setTimeout(() => {
						wireEvent(this, 'message', {
							data: JSON.stringify({
								action: 'game_state',
								game_state: {
									fen: 'rn1qkbnr/pppbpppp/8/3p4/8/3P4/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
									status: 'active',
									white_player_id: 202,
									black_player_id: 101,
									draw_offer_from_player_id: 202,
								},
							}),
						})
					}, 10)
					return
				}

				if (data.action === 'draw_response' && data.accept === true) {
					setTimeout(() => {
						wireEvent(this, 'message', {
							data: JSON.stringify({
								action: 'game_state',
								game_state: {
									fen: 'rn1qkbnr/pppbpppp/8/3p4/8/3P4/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
									status: 'draw',
									white_player_id: 202,
									black_player_id: 101,
									draw_offer_from_player_id: null,
								},
							}),
						})
					}, 20)
				}
			}

			close() {
				if (!this._mocked) {
					this._native?.close()
					return
				}
				this.readyState = MockWebSocket.CLOSED
				wireEvent(this, 'close', { type: 'close' })
			}
		}

		window.WebSocket = MockWebSocket
	}, gameId)
}

export async function installChatWebSocketMock(page, conversationId = 1) {
	await page.addInitScript((targetConversationId) => {
		const NativeWebSocket = window.WebSocket
		window.__e2eChatMock = {
			sockets: [],
			triggerTyping(payload = {}) {
				const userId = Number(payload.userId ?? 202)
				const username = String(payload.username ?? 'USER_B')
				const isTyping = Boolean(payload.isTyping)
				for (const socket of window.__e2eChatMock.sockets) {
					socket.onmessage?.({
						data: JSON.stringify({
							action: 'typing',
							user_id: userId,
							username,
							is_typing: isTyping,
						}),
					})
				}
			},
		}

		class MockWebSocket {
			static CONNECTING = 0
			static OPEN = 1
			static CLOSING = 2
			static CLOSED = 3

			constructor(url) {
				this.url = String(url)
				this.readyState = MockWebSocket.CONNECTING
				this.onopen = null
				this.onmessage = null
				this.onerror = null
				this.onclose = null
				this._mocked = this.url.includes(`/ws/chat/${targetConversationId}/`)
				this._currentUserId = 101
				this._messageId = 3000

				if (this._mocked) {
					window.__e2eChatMock.sockets.push(this)
					setTimeout(() => {
						this.readyState = MockWebSocket.OPEN
						this.onopen?.({ type: 'open' })
					}, 0)
					return
				}

				this._native = new NativeWebSocket(url)
				this._native.onopen = (event) => {
					this.readyState = MockWebSocket.OPEN
					this.onopen?.(event)
				}
				this._native.onmessage = (event) => this.onmessage?.(event)
				this._native.onerror = (event) => this.onerror?.(event)
				this._native.onclose = (event) => {
					this.readyState = MockWebSocket.CLOSED
					this.onclose?.(event)
				}
			}

			send(raw) {
				if (!this._mocked) {
					this._native?.send(raw)
					return
				}

				let data = null
				try {
					data = JSON.parse(raw)
				} catch {
					data = null
				}
				if (!data) return

				if (data.action === 'authenticate' && data.user_id != null) {
					this._currentUserId = Number(data.user_id)
					return
				}

				if (data.action === 'send_message') {
					const content = String(data.content || '').trim()
					if (!content) return
					this._messageId += 1
					const message = {
						id: this._messageId,
						content,
						message_type: 'text',
						created_at: new Date().toISOString(),
						sender: {
							id: this._currentUserId,
							username: 'SMOKE_USER',
							avatar: '',
						},
						read_by: [this._currentUserId],
					}
					setTimeout(() => {
						this.onmessage?.({ data: JSON.stringify({ action: 'new_message', message }) })
					}, 20)
				}
			}

			close() {
				if (!this._mocked) {
					this._native?.close()
					return
				}
				window.__e2eChatMock.sockets = window.__e2eChatMock.sockets.filter((socket) => socket !== this)
				this.readyState = MockWebSocket.CLOSED
				this.onclose?.({ type: 'close' })
			}
		}

		window.WebSocket = MockWebSocket
	}, conversationId)
}

export async function installNotificationsWebSocketMock(page, userId = 101) {
	await page.addInitScript((targetUserId) => {
		const NativeWebSocket = window.WebSocket
		window.__e2eNotificationsMock = {
			sockets: [],
			triggerEvent(payload = {}) {
				for (const socket of window.__e2eNotificationsMock.sockets) {
					socket.onmessage?.({ data: JSON.stringify(payload) })
				}
			},
		}

		class MockWebSocket {
			static CONNECTING = 0
			static OPEN = 1
			static CLOSING = 2
			static CLOSED = 3

			constructor(url) {
				this.url = String(url)
				this.readyState = MockWebSocket.CONNECTING
				this.onopen = null
				this.onmessage = null
				this.onerror = null
				this.onclose = null
				this._mocked = this.url.includes(`/ws/notifications/${targetUserId}/`)

				if (this._mocked) {
					window.__e2eNotificationsMock.sockets.push(this)
					setTimeout(() => {
						this.readyState = MockWebSocket.OPEN
						this.onopen?.({ type: 'open' })
					}, 0)
					return
				}

				this._native = new NativeWebSocket(url)
				this._native.onopen = (event) => {
					this.readyState = MockWebSocket.OPEN
					this.onopen?.(event)
				}
				this._native.onmessage = (event) => this.onmessage?.(event)
				this._native.onerror = (event) => this.onerror?.(event)
				this._native.onclose = (event) => {
					this.readyState = MockWebSocket.CLOSED
					this.onclose?.(event)
				}
			}

			send(raw) {
				if (!this._mocked) {
					this._native?.send(raw)
				}
			}

			close() {
				if (!this._mocked) {
					this._native?.close()
					return
				}
				window.__e2eNotificationsMock.sockets = window.__e2eNotificationsMock.sockets.filter((socket) => socket !== this)
				this.readyState = MockWebSocket.CLOSED
				this.onclose?.({ type: 'close' })
			}
		}

		window.WebSocket = MockWebSocket
	}, userId)
}

export async function installUnstableOnlineGameWebSocketMock(page, gameId = 'e2e-flaky') {
	await page.addInitScript((targetGameId) => {
		const NativeWebSocket = window.WebSocket

		function createListenerStore() {
			return {
				open: new Set(),
				message: new Set(),
				error: new Set(),
				close: new Set(),
			}
		}

		function emitMockEvent(socket, type, event) {
			const listeners = socket._listeners?.[type]
			if (!listeners) return
			for (const listener of listeners) {
				try {
					listener.call(socket, event)
				} catch {}
			}
		}

		function wireEvent(socket, type, event) {
			if (type === 'open') socket.onopen?.(event)
			if (type === 'message') socket.onmessage?.(event)
			if (type === 'error') socket.onerror?.(event)
			if (type === 'close') socket.onclose?.(event)
			emitMockEvent(socket, type, event)
		}
		window.__e2eOnlineGameMock = {
			sockets: [],
			triggerDisconnect() {
				for (const socket of window.__e2eOnlineGameMock.sockets) {
					socket.readyState = MockWebSocket.CLOSED
					wireEvent(socket, 'close', { type: 'close', code: 1006 })
				}
				window.__e2eOnlineGameMock.sockets = []
			},
		}

		class MockWebSocket {
			static CONNECTING = 0
			static OPEN = 1
			static CLOSING = 2
			static CLOSED = 3

			constructor(url) {
				this.url = String(url)
				this.readyState = MockWebSocket.CONNECTING
				this.onopen = null
				this.onmessage = null
				this.onerror = null
				this.onclose = null
				this._listeners = createListenerStore()
				this._mocked = this.url.includes(`/ws/chess/${targetGameId}/`)

				if (this._mocked) {
					window.__e2eOnlineGameMock.sockets.push(this)
					setTimeout(() => {
						this.readyState = MockWebSocket.OPEN
						wireEvent(this, 'open', { type: 'open' })
					}, 0)
					return
				}

				this._native = new NativeWebSocket(url)
				this._native.onopen = (event) => {
					this.readyState = MockWebSocket.OPEN
					wireEvent(this, 'open', event)
				}
				this._native.onmessage = (event) => wireEvent(this, 'message', event)
				this._native.onerror = (event) => wireEvent(this, 'error', event)
				this._native.onclose = (event) => {
					this.readyState = MockWebSocket.CLOSED
					wireEvent(this, 'close', event)
				}
			}

			addEventListener(type, listener) {
				if (!this._mocked) {
					this._native?.addEventListener?.(type, listener)
					return
				}
				this._listeners?.[type]?.add(listener)
			}

			removeEventListener(type, listener) {
				if (!this._mocked) {
					this._native?.removeEventListener?.(type, listener)
					return
				}
				this._listeners?.[type]?.delete(listener)
			}

			send(raw) {
				if (!this._mocked) {
					this._native?.send(raw)
					return
				}

				let data = null
				try {
					data = JSON.parse(raw)
				} catch {
					data = null
				}
				if (!data) return

				if (data.action === 'reconnect') {
					setTimeout(() => {
						wireEvent(this, 'message', {
							data: JSON.stringify({
								action: 'game_state',
								game_state: {
									fen: 'rn1qkbnr/pppbpppp/8/3p4/8/3P4/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
									status: 'active',
									white_player_id: 202,
									black_player_id: 101,
									draw_offer_from_player_id: null,
								},
							}),
						})
					}, 10)
				}
			}

			close() {
				if (!this._mocked) {
					this._native?.close()
					return
				}
				window.__e2eOnlineGameMock.sockets = window.__e2eOnlineGameMock.sockets.filter((socket) => socket !== this)
				this.readyState = MockWebSocket.CLOSED
				wireEvent(this, 'close', { type: 'close' })
			}
		}

		window.WebSocket = MockWebSocket
	}, gameId)
}
