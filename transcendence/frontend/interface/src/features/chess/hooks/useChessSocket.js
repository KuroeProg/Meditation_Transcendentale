// hooks/useChessSocket.js
import { useCallback, useEffect, useRef, useState } from 'react';

function getWebSocketOrigin() {
	const appOrigin = import.meta.env.VITE_APP_ORIGIN;
	const explicitWsOrigin = import.meta.env.VITE_WS_ORIGIN;
	const explicitApiOrigin = import.meta.env.VITE_API_ORIGIN;
	const baseOrigin = explicitWsOrigin || explicitApiOrigin || appOrigin || window.location.origin;

	if (baseOrigin.startsWith('https://')) {
		return baseOrigin.replace('https://', 'wss://').replace(/\/$/, '');
	}
	if (baseOrigin.startsWith('http://')) {
		return baseOrigin.replace('http://', 'ws://').replace(/\/$/, '');
	}
	if (baseOrigin.startsWith('wss://') || baseOrigin.startsWith('ws://')) {
		return baseOrigin.replace(/\/$/, '');
	}

	const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
	return `${protocol}://${window.location.host}`;
}

export function useChessSocket(gameId, options = {}) {
	const socketRef = useRef(null);
	const onMessageRef = useRef(
		typeof options?.onMessage === 'function' ? options.onMessage : null,
	);
	const [isConnected, setIsConnected] = useState(false);
	const [lastMessage, setLastMessage] = useState(null);
	const [socketError, setSocketError] = useState(null);

	useEffect(() => {
		onMessageRef.current = typeof options?.onMessage === 'function' ? options.onMessage : null;
	}, [options?.onMessage]);

	useEffect(() => {
		if (!gameId) {
			return undefined;
		}

		let isDisposed = false;

		// Connexion au WebSocket
		const wsOrigin = getWebSocketOrigin();
		const url = `${wsOrigin}/ws/chess/${gameId}/`;
		const socket = new WebSocket(url);
		socketRef.current = socket;

		socket.onopen = () => {
			if (isDisposed) {
				socket.close();
				return;
			}
			console.log("WebSocket Connecté !");
			setIsConnected(true);
			setSocketError(null);
			socket.send(JSON.stringify({ action: 'reconnect' }));
		};

		socket.onmessage = (event) => {
			if (isDisposed) return;
			try {
				const data = JSON.parse(event.data);
				if (typeof onMessageRef.current === 'function') {
					onMessageRef.current(data);
				}
				setLastMessage(data);
			} catch {
				setSocketError('Message WebSocket invalide');
			}
		};

		socket.onerror = () => {
			if (isDisposed) return;
			setSocketError('Erreur WebSocket');
		};

		socket.onclose = () => {
			if (isDisposed) return;
			console.log("WebSocket Déconnecté");
			setIsConnected(false);
		};

		// Nettoyage à la fermeture du composant
		return () => {
			isDisposed = true;
			if (socketRef.current === socket) {
				socketRef.current = null;
			}

			if (socket.readyState === WebSocket.OPEN) {
				socket.close();
			}

			if (socket.readyState === WebSocket.CONNECTING) {
				// Evite l'erreur navigateur "closed before the connection is established"
				socket.onopen = () => socket.close();
			}
		};
	}, [gameId]);

	// Fonction stable pour eviter les effets qui rebouclent sur une dependance fonction
	const sendMove = useCallback((moveData) => {
		if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
			socketRef.current.send(JSON.stringify(moveData));
		}
	}, []);

	return { isConnected, socketError, lastMessage, sendMove };
}