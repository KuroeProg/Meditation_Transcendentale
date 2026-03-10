// import { useState, useEffect, useRef } from 'react';

// export function useChessTimer(initialSeconds, isActive) {
// 	const [timeLeft, setTimeLeft] = useState(initialSeconds);
// 	const intervalRef = useRef(null);

// 	useEffect(() => {
// 		if (isActive && timeLeft > 0) {
// 		intervalRef.current = setInterval(() => {
// 			setTimeLeft(prev => {
// 			if (prev <= 1) {
// 				clearInterval(intervalRef.current);
// 				return 0;
// 			}
// 			return prev - 1;
// 			});
// 		}, 1000);
// 		}
// 		return () => clearInterval(intervalRef.current);
// 	}, [isActive]);

// 	useEffect(() => {
// 		if (timeLeft === 0) {
// 			console.log("Temps écoulé !");   //to check
// 		}
// 	}, [timeLeft]);

// 	const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
// 	const seconds = String(timeLeft % 60).padStart(2, '0');

// 	return `${minutes}:${seconds}`;
// }