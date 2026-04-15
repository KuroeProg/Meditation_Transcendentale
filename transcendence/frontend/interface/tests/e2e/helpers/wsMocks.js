export async function installMatchmakingWebSocketMock(page) {
	await page.addInitScript(() => {
		const NativeWebSocket = window.WebSocket

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
				this._mocked = this.url.includes('/ws/chess/')

				if (this._mocked) {
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

				if (!data || this.url.includes('/ws/chess/training')) return

				if (data.action === 'join_queue') {
					const playerId = String(data.player_id)
					setTimeout(() => {
						this.onmessage?.({ data: JSON.stringify({ action: 'queue_status', queue_size: 1 }) })
					}, 10)
					setTimeout(() => {
						this.onmessage?.({
							data: JSON.stringify({
								action: 'match_found',
								game_id: 'e2e-game-123',
								white_player_id: playerId,
								black_player_id: '99999',
							}),
						})
					}, 50)
				}

				if (data.action === 'leave_queue') {
					setTimeout(() => {
						this.onmessage?.({ data: JSON.stringify({ action: 'queue_status', queue_size: 0 }) })
					}, 10)
				}
			}

			close() {
				if (!this._mocked) {
					this._native?.close()
					return
				}
				this.readyState = MockWebSocket.CLOSED
				this.onclose?.({ type: 'close' })
			}
		}

		window.WebSocket = MockWebSocket
	})
}

export async function installChatWebSocketMock(page, conversationId = 1) {
	await page.addInitScript((targetConversationId) => {
		const NativeWebSocket = window.WebSocket

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
				this.readyState = MockWebSocket.CLOSED
				this.onclose?.({ type: 'close' })
			}
		}

		window.WebSocket = MockWebSocket
	}, conversationId)
}
