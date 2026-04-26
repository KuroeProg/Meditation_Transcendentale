import { useEffect, useRef } from "react";
import { Chess } from "chess.js";
import {
  playClockTimeout,
  playGameDraw,
  playGameResign,
  playGameWin,
  playMoveCheck,
  playPieceMoveFromFlags,
  playUiErrorDeny,
  unlockGameAudio,
} from "../../audio/services/gameSfx.js";
import { tryPlayGameBgm } from "../../audio/services/gameBgm.js";

function isCheckSan(san) {
  if (typeof san !== "string") return false;
  return san.includes("+") || san.includes("#");
}

function resolveLastMoveFlags(moveLog) {
  if (!Array.isArray(moveLog) || moveLog.length === 0) return "";

  const chess = new Chess();
  let lastFlags = "";

  for (let i = 0; i < moveLog.length; i++) {
    const move = moveLog[i];
    if (!move || !move.san) {
      break;
    }

    let result = null;
    try {
      result = chess.move(move.san, { sloppy: false });
    } catch (error) {
      break;
    }

    if (!result) {
      break;
    }

    if (i === moveLog.length - 1) {
      lastFlags = result.flags ?? "";
    }
  }

  return lastFlags;
}

export function useChessAudio({
  moveLog = [],
  winner = null,
  moveFeedback = null,
  enabled = true,
}) {
  const prevMoveCountRef = useRef(0);
  const prevWinnerRef = useRef(null);
  const prevFeedbackRef = useRef(null);
  const gameBgmStartedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      prevMoveCountRef.current = moveLog.length;
      return;
    }

    const prevCount = prevMoveCountRef.current;
    const nextCount = moveLog.length;

    if (nextCount === 0) {
      gameBgmStartedRef.current = false;
    }

    if (nextCount <= prevCount) {
      prevMoveCountRef.current = nextCount;
      return;
    }

    const lastMove = moveLog[nextCount - 1];
    if (!lastMove?.san) {
      prevMoveCountRef.current = nextCount;
      return;
    }

    unlockGameAudio();
    // BGM partie : après 2 demi-coups (blancs + noirs ont chacun joué), comme le chrono serveur.
    if (!gameBgmStartedRef.current && nextCount >= 2) {
      gameBgmStartedRef.current = true;
      void tryPlayGameBgm();
    }

    const flags = resolveLastMoveFlags(moveLog);
    playPieceMoveFromFlags(flags);

    if (isCheckSan(lastMove.san)) {
      playMoveCheck();
    }

    prevMoveCountRef.current = nextCount;
  }, [enabled, moveLog]);

  useEffect(() => {
    if (!enabled) {
      prevWinnerRef.current = winner;
      return;
    }

    if (winner === prevWinnerRef.current) return;
    prevWinnerRef.current = winner;
    if (!winner) return;

    unlockGameAudio();

    if (winner === "White" || winner === "Black") {
      playGameWin();
      return;
    }

    if (winner === "Nulle") {
      playGameDraw();
      return;
    }

    if (winner === "White-Resign" || winner === "Black-Resign") {
      playGameResign();
      return;
    }

    if (winner === "White-Timeout" || winner === "Black-Timeout") {
      playClockTimeout();
    }
  }, [enabled, winner]);

  useEffect(() => {
    if (!enabled) {
      prevFeedbackRef.current = moveFeedback;
      return;
    }

    const current =
      typeof moveFeedback === "string" ? moveFeedback.trim() : String(moveFeedback ?? "").trim();
    const previous =
      typeof prevFeedbackRef.current === "string"
        ? prevFeedbackRef.current.trim()
        : String(prevFeedbackRef.current ?? "").trim();

    if (!current || current === previous) {
      prevFeedbackRef.current = moveFeedback;
      return;
    }

    const lowered = current.toLowerCase();
    const shouldPlayInvalid =
      lowered.includes("invalid") ||
      lowered.includes("illegal") ||
      lowered.includes("not your turn") ||
      lowered.includes("ce n'est pas") ||
      lowered.includes("refus") ||
      lowered.includes("reject");

    if (shouldPlayInvalid) {
      unlockGameAudio();
      playUiErrorDeny();
    }

    prevFeedbackRef.current = moveFeedback;
  }, [enabled, moveFeedback]);
}
