// hooks/useChessSocket.js
import { useEffect, useRef, useState } from 'react';

function getWebSocketOrigin() {
	const explicitWsOrigin = import.meta.env.VITE_WS_ORIGIN;
	const explicitApiOrigin = import.meta.env.VITE_API_ORIGIN;
	const baseOrigin = explicitWsOrigin || explicitApiOrigin || window.location.origin;

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

export function useChessSocket(gameId) {
	const socketRef = useRef(null);
	const [isConnected, setIsConnected] = useState(false);
	const [lastMessage, setLastMessage] = useState(null);
	const [socketError, setSocketError] = useState(null);

	useEffect(() => {
		if (!gameId) {
			return undefined;
		}

		// Connexion au WebSocket
		const wsOrigin = getWebSocketOrigin();
		const url = `${wsOrigin}/ws/chess/${gameId}/`;
		socketRef.current = new WebSocket(url);

		socketRef.current.onopen = () => {
			console.log("WebSocket Connecté !");
			setIsConnected(true);
			setSocketError(null);
			socketRef.current.send(JSON.stringify({ action: 'reconnect' }));
		};

		socketRef.current.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				setLastMessage(data);
			} catch {
				setSocketError('Message WebSocket invalide');
			}
		};

		socketRef.current.onerror = () => {
			setSocketError('Erreur WebSocket');
		};

		socketRef.current.onclose = () => {
			console.log("WebSocket Déconnecté");
			setIsConnected(false);
		};

		// Nettoyage à la fermeture du composant
		return () => {
			if (socketRef.current) {
				socketRef.current.close();
				socketRef.current = null;
			}
		};
	}, [gameId]);

	// Fonction pour envoyer des coups
	const sendMove = (moveData) => {
		if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
			socketRef.current.send(JSON.stringify(moveData));
		}
	};

	return { isConnected, socketError, lastMessage, sendMove };
}