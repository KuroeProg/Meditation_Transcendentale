import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { Chess } from "chess.js";

const MOVE_ANIM_MS = 200;

function normalizeFen(fen) {
  return String(fen || "").split(" ").slice(0, 4).join(" ");
}

function enPassantCapturedSquare(from, to) {
  return to[0] + from[1];
}

function findAnimatedMove(prevFen, nextFen) {
  if (!prevFen || !nextFen) return null;
  if (normalizeFen(prevFen) === normalizeFen(nextFen)) return null;

  try {
    const prevGame = new Chess(prevFen);
    const targetFen = normalizeFen(nextFen);
    const moves = prevGame.moves({ verbose: true });

    for (const move of moves) {
      const probe = new Chess(prevFen);
      const made = probe.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
      if (!made) continue;
      if (normalizeFen(probe.fen()) === targetFen) {
        return {
          from: move.from,
          to: move.to,
          moving: { type: move.piece, color: move.color },
          moveFlags: move.flags ?? "",
          captureOnTo: !!prevGame.get(move.to),
          enPassantSq:
            typeof move.flags === "string" && move.flags.includes("e")
              ? enPassantCapturedSquare(move.from, move.to)
              : null,
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function pieceSuppressed(sq, anim) {
  if (!anim || anim.phase === "done") return false;
  if (sq === anim.from) return true;
  if (anim.enPassantSq && sq === anim.enPassantSq) return true;
  if (anim.captureOnTo && sq === anim.to) return true;
  return sq === anim.to;
}

export function useMoveGhostAnimation({
  game,
  isViewOnly,
  whitePieceThemeSlug,
  blackPieceThemeSlug,
  boardRootRef,
}) {
  const [activeMoveAnim, setActiveMoveAnim] = useState(null);
  
  const committedFenRef = useRef(game.fen());
  const previousFenRef = useRef(game.fen());
  const pendingFenRef = useRef(null);
  const animRef = useRef(null);
  const animWatchdogRef = useRef(null);
  const activeAnimRef = useRef(false);

  const finalizeGhostAnimation = useCallback(() => {
    if (animWatchdogRef.current) {
      window.clearTimeout(animWatchdogRef.current);
      animWatchdogRef.current = null;
    }
    previousFenRef.current = pendingFenRef.current ?? committedFenRef.current;
    pendingFenRef.current = null;
    setActiveMoveAnim((prev) => (prev ? { ...prev, phase: "done" } : null));
    queueMicrotask(() => {
      setActiveMoveAnim(null);
    });
  }, []);

  // Track refs when animation changes
  useEffect(() => {
    activeAnimRef.current = activeMoveAnim != null;
    animRef.current = activeMoveAnim;
  }, [activeMoveAnim]);

  // Detect FEN change and initiate animation
  useEffect(() => {
    const nextFen = game.fen();
    const prevFen = committedFenRef.current;
    if (!prevFen || prevFen === nextFen) {
      previousFenRef.current = nextFen;
      committedFenRef.current = nextFen;
      pendingFenRef.current = null;
      return;
    }

    const moveAnim = findAnimatedMove(prevFen, nextFen);
    committedFenRef.current = nextFen;
    if (!moveAnim || isViewOnly) {
      previousFenRef.current = nextFen;
      pendingFenRef.current = null;
      finalizeGhostAnimation();
      return;
    }

    // Keep the board rendered on pre-move state until ghost transition ends.
    previousFenRef.current = prevFen;
    pendingFenRef.current = nextFen;

    const themeSlug =
      moveAnim.moving.color === "w" ? whitePieceThemeSlug : blackPieceThemeSlug;

    setActiveMoveAnim({
      ...moveAnim,
      key: Date.now(),
      phase: "measure",
      themeSlug,
    });
  }, [
    game,
    isViewOnly,
    whitePieceThemeSlug,
    blackPieceThemeSlug,
    finalizeGhostAnimation,
  ]);

  // Measure DOM and calculate animation coordinates
  useLayoutEffect(() => {
    const a = activeMoveAnim;
    if (!a || a.phase !== "measure") return;

    const board = boardRootRef.current;
    const elFrom = board?.querySelector(`[data-square="${a.from}"]`);
    const elTo = board?.querySelector(`[data-square="${a.to}"]`);

    if (!board || !elFrom || !elTo) {
      finalizeGhostAnimation();
      return;
    }

    /* Coordonnées dans l’espace local du plateau (#board) : getBoundingClientRect()
     * est faux quand un ancêtre a une rotation CSS (AABB), d’où l’animation « à l’envers » pour les noirs. */
    const x0 = elFrom.offsetLeft + elFrom.offsetWidth / 2;
    const y0 = elFrom.offsetTop + elFrom.offsetHeight / 2;
    const x1 = elTo.offsetLeft + elTo.offsetWidth / 2;
    const y1 = elTo.offsetTop + elTo.offsetHeight / 2;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const size = Math.min(elFrom.offsetWidth, elFrom.offsetHeight) * 0.88;

    setActiveMoveAnim((prev) =>
      prev && prev.key === a.key
        ? { ...prev, phase: "slide", x0, y0, dx, dy, size }
        : prev,
    );
  }, [activeMoveAnim, finalizeGhostAnimation, boardRootRef]);

  // Trigger CSS transition (slide → sliding)
  useEffect(() => {
    const a = activeMoveAnim;
    if (!a || a.phase !== "slide") return;
    let id2;
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        setActiveMoveAnim((prev) =>
          prev && prev.key === a.key ? { ...prev, phase: "sliding" } : prev,
        );
      });
    });
    return () => {
      cancelAnimationFrame(id1);
      if (id2) cancelAnimationFrame(id2);
    };
  }, [activeMoveAnim?.key, activeMoveAnim?.phase]);

  // Watchdog timer in case transitionend doesn't fire
  useEffect(() => {
    if (!activeMoveAnim || activeMoveAnim.phase !== "sliding") return;
    if (animWatchdogRef.current) window.clearTimeout(animWatchdogRef.current);
    animWatchdogRef.current = window.setTimeout(() => {
      if (animRef.current?.phase === "sliding") {
        finalizeGhostAnimation();
      }
    }, MOVE_ANIM_MS + 80);
    return () => {
      if (animWatchdogRef.current) {
        window.clearTimeout(animWatchdogRef.current);
        animWatchdogRef.current = null;
      }
    };
  }, [activeMoveAnim?.key, activeMoveAnim?.phase, finalizeGhostAnimation]);

  const onGhostTransitionEnd = useCallback(
    (e) => {
      if (e.target !== e.currentTarget) return;
      if (e.propertyName !== "transform") return;
      finalizeGhostAnimation();
    },
    [finalizeGhostAnimation],
  );

  return {
    activeMoveAnim,
    activeMoveAnimRef: activeAnimRef,
    previousFenRef,
    onGhostTransitionEnd,
  };
}
