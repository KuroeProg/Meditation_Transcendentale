import { useState, useEffect, useRef } from 'react';

function formatTime(seconds) {
	const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
	const secondsLeft = String(seconds % 60).padStart(2, '0');
	return `${minutes}:${secondsLeft}`;
}

function startInterval(callback) {
	return setInterval(callback, 1000);
}

function onTimeOut() {
	console.log("Temps écoulé !");
}

export function useChessTimer(initialSeconds, isActive, onTimeOut) {
	const [timeLeft, setTimeLeft] = useState(initialSeconds);
	const intervalRef = useRef(null);

	useEffect(() => {
		if (isActive && timeLeft > 0) {
		intervalRef.current = startInterval(() => {
			setTimeLeft(prev => {
				if (prev <= 1) {
					clearInterval(intervalRef.current);
					return 0;
				}
				return prev - 1;
			});
		});
	}
	return () => clearInterval(intervalRef.current);
}, [isActive]);

	useEffect(() => {
		if (timeLeft === 0 && onTimeOut) onTimeOut();
	}, [timeLeft]);

	return formatTime(timeLeft);
}