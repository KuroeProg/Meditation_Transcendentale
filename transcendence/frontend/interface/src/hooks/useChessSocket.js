// hooks/useChessSocket.js
import { useEffect, useRef, useState } from 'react';

export function useChessSocket(gameId, onMessageReceived) {
	const socketRef = useRef(null);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		// Connexion au WebSocket
		const url = `ws://localhost:8000/ws/chess/${gameId}/`;
		socketRef.current = new WebSocket(url);

		socketRef.current.onopen = () => {
			console.log("WebSocket Connecté !");
			setIsConnected(true);
		};

		socketRef.current.onmessage = (event) => {
			const data = JSON.parse(event.data);
			onMessageReceived(data); // On transmet les données au composant
		};

		socketRef.current.onclose = () => {
			console.log("WebSocket Déconnecté");
			setIsConnected(false);
		};

		// Nettoyage à la fermeture du composant
		return () => {
			socketRef.current.close();
		};
	}, [gameId]);

	// Fonction pour envoyer des coups
	const sendMove = (moveData) => {
		if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
			socketRef.current.send(JSON.stringify(moveData));
		}
	};

	return { isConnected, sendMove };
}