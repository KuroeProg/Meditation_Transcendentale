import { useCallback } from "react";

export function useChessReplay({ moveLogLength, viewPlies, setViewPlies }) {
  const goReplayFirst = useCallback(() => {
    if (moveLogLength === 0) return;
    setViewPlies(0);
  }, [moveLogLength, setViewPlies]);

  const goReplayPrev = useCallback(() => {
    if (moveLogLength === 0) return;

    if (viewPlies === null) {
      setViewPlies(moveLogLength - 1);
      return;
    }

    if (viewPlies <= 0) {
      setViewPlies(0);
      return;
    }

    setViewPlies(viewPlies - 1);
  }, [moveLogLength, setViewPlies, viewPlies]);

  const goReplayNext = useCallback(() => {
    if (moveLogLength === 0) return;
    if (viewPlies === null) return;

    if (viewPlies >= moveLogLength) {
      setViewPlies(null);
      return;
    }

    setViewPlies(viewPlies + 1);
  }, [moveLogLength, setViewPlies, viewPlies]);

  const goReplayLast = useCallback(() => {
    if (moveLogLength === 0) return;
    setViewPlies(null);
  }, [moveLogLength, setViewPlies]);

  return {
    goReplayFirst,
    goReplayPrev,
    goReplayNext,
    goReplayLast,
  };
}
