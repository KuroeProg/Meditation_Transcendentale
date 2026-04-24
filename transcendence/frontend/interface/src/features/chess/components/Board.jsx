import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Chess } from "chess.js";
import { useAuth } from "../../auth/index.js";
import { coalitionToSlug } from "../../theme/services/coalitionTheme.js";
import { getPieceThemeSlugForColor } from "../mock/mockGameOpponent.js";
import { useMoveGhostAnimation, pieceSuppressed } from "../hooks/useMoveGhostAnimation.js";
import { CellRenderer } from "./CellRenderer.jsx";
import { MoveGhost } from "./MoveGhost.jsx";
import { PromotionPicker } from "./PromotionPicker.jsx";
import {
  BOARD_TILES,
  buildTileUrlFlat,
  themeHasTileAssets,
} from "../assets/boardTiles.js";
import {
  collectChessGamePreloadUrls,
  preloadChessImages,
} from "../assets/chessAssetPreload.js";
import { playUiErrorDeny, unlockGameAudio } from "../../audio/services/gameSfx.js";



const PROMOTION_PIECE_ORDER = ["q", "r", "b", "n"];
const MOVE_ANIM_MS = 200;
const FILE_LABELS = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANK_LABELS = [8, 7, 6, 5, 4, 3, 2, 1];
const DRAG_THRESHOLD_PX = 5;

function toSquare(row, col) {
  const files = "abcdefgh";
  const ranks = "87654321";
  return files[col] + ranks[row];
}

function squareToRowCol(sq) {
  const col = sq.charCodeAt(0) - 97;
  const row = "87654321".indexOf(sq[1]);
  return { row, col };
}

function findKingSquare(game) {
  const board = game.board();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === "k" && piece.color === game.turn()) {
        return toSquare(row, col);
      }
    }
  }
  return null;
}

function buildUciMove(from, to, movingPiece, promotion) {
  if (!from || !to) return null;
  if (promotion) return `${from}${to}${promotion}`;
  if (!movingPiece) return `${from}${to}`;

  const destinationRank = to[1];
  const isPromotion =
    movingPiece.type === "p" &&
    (destinationRank === "8" || destinationRank === "1");
  return isPromotion ? `${from}${to}q` : `${from}${to}`;
}

function Board({
  game,
  winner,
  onMoveRequest,
  playerColor,
  whiteCoalition,
  blackCoalition,
  moveFeedback,
  tilePatternSeed,
  isViewOnly = false,
}) {
  const { user } = useAuth();
  const tileCoalitionSlug = coalitionToSlug(
    user?.coalition ?? user?.coalition_name,
  );

  const [selected, setSelected] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [kingFlash, setKingFlash] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [illegalFlashSq, setIllegalFlashSq] = useState(null);
  const [promotionPick, setPromotionPick] = useState(null);

  // Drag and drop
  const [dragSourceSq, setDragSourceSq] = useState(null);
  const [dragOverSq, setDragOverSq] = useState(null);
  const [dragGhost, setDragGhost] = useState(null);

  const winnerRef = useRef(null);
  const illegalTimerRef = useRef(null);
  const boardRootRef = useRef(null);
  // Drag refs : pas de setState pendant le move pour éviter les re-renders
  const dragStateRef = useRef(null);
  const dragOccurredRef = useRef(false);
  /** Gestionnaires window (pointermove / pointerup) pour ne pas capturer le pointeur au mousedown : le clic deux temps reste fiable. */
  const windowDragHandlersRef = useRef({ move: null, up: null });
  /** Prochain changement de FEN issu d’un drag : ne pas lancer l’animation fantôme du plateau. */
  const skipNextGhostAnimRef = useRef(false);

  const pieceRotation = playerColor === "b" ? "rotate(180deg)" : "rotate(0deg)";
  const tileRotation = playerColor === "b" ? "rotate(180deg)" : "rotate(0deg)";
  const ghostPieceRotation = pieceRotation;
  const tileSeed = tilePatternSeed ?? BOARD_TILES.seed;

  const whitePieceThemeSlug = whiteCoalition
    ? coalitionToSlug(whiteCoalition)
    : getPieceThemeSlugForColor("w", user);
  const blackPieceThemeSlug = blackCoalition
    ? coalitionToSlug(blackCoalition)
    : getPieceThemeSlugForColor("b", user);

  // Animation logic via custom hook
  const { activeMoveAnim, activeMoveAnimRef, previousFenRef, onGhostTransitionEnd } =
    useMoveGhostAnimation({
      game,
      isViewOnly,
      whitePieceThemeSlug,
      blackPieceThemeSlug,
      boardRootRef,
      skipNextGhostAnimRef,
    });

  useEffect(() => {
    if (winner) setPopupOpen(true);
  }, [winner]);

  useEffect(() => {
    winnerRef.current = winner;
  }, [winner]);

  useEffect(() => {
    const urls = collectChessGamePreloadUrls(user, tileCoalitionSlug, tileSeed);
    let cancelled = false;

    preloadChessImages(urls).then(() => {
      if (!cancelled && import.meta.env.DEV) {
        console.debug("[chess] assets preloaded:", urls.length);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, tileCoalitionSlug, tileSeed]);

  useEffect(() => {
    return () => {
      if (illegalTimerRef.current) clearTimeout(illegalTimerRef.current);
    };
  }, []);

  const flashKing = useCallback(() => {
    setKingFlash(true);
    setTimeout(() => setKingFlash(false), 600);
  }, []);

  const flashIllegalSquare = useCallback((square) => {
    if (illegalTimerRef.current) {
      clearTimeout(illegalTimerRef.current);
      illegalTimerRef.current = null;
    }
    setIllegalFlashSq(square);
    illegalTimerRef.current = setTimeout(() => {
      setIllegalFlashSq(null);
      illegalTimerRef.current = null;
    }, 480);
  }, []);

  const submitMoveRequest = useCallback(
    (from, to, movingPiece, promotion) => {
      const uciMove = buildUciMove(from, to, movingPiece, promotion);
      if (uciMove && typeof onMoveRequest === "function") {
        onMoveRequest({ move: uciMove });
      }
    },
    [onMoveRequest],
  );

  const handleBoardClick = useCallback(
    (e) => {
      // Un drag vient de se terminer : le click synthétique qui suit est ignoré
      if (dragOccurredRef.current) {
        dragOccurredRef.current = false;
        return;
      }

      const el = e.target.closest?.(".cell[data-square]");
      if (!el || !(el instanceof HTMLElement)) return;
      const sq = el.dataset.square;
      if (!sq || sq.length < 2) return;
      const { row, col } = squareToRowCol(sq);
      if (row < 0 || col < 0 || col > 7) return;

      if (winnerRef.current) return;
      if (isViewOnly) return;
      if (promotionPick) return;
      if (activeMoveAnimRef.current) return;

      const square = toSquare(row, col);
      if (selected === null) {
        const clickedPiece = game.get(square);
        if (clickedPiece && playerColor && clickedPiece.color !== playerColor) {
          unlockGameAudio();
          playUiErrorDeny();
          flashIllegalSquare(square);
          return;
        }

        const moves = game.moves({ square, verbose: true });
        if (moves.length > 0) {
          setSelected(square);
          setPossibleMoves(moves.map((m) => m.to));
        } else if (game.inCheck()) {
          flashKing();
        }
        return;
      }

      if (selected === square) {
        setSelected(null);
        setPossibleMoves([]);
        return;
      }

      const clickedPiece = game.get(square);
      if (clickedPiece && clickedPiece.color === game.turn()) {
        if (playerColor && clickedPiece.color !== playerColor) {
          unlockGameAudio();
          playUiErrorDeny();
          flashIllegalSquare(square);
          setSelected(null);
          setPossibleMoves([]);
          return;
        }

        const moves = game.moves({ square, verbose: true });
        if (moves.length > 0) {
          setSelected(square);
          setPossibleMoves(moves.map((m) => m.to));
        } else {
          setSelected(null);
          setPossibleMoves([]);
        }
        return;
      }

      if (!possibleMoves.includes(square)) {
        unlockGameAudio();
        playUiErrorDeny();
        flashIllegalSquare(square);
        setSelected(null);
        setPossibleMoves([]);
        return;
      }

      if (playerColor && game.turn() !== playerColor) {
        unlockGameAudio();
        playUiErrorDeny();
        flashIllegalSquare(square);
        setSelected(null);
        setPossibleMoves([]);
        return;
      }

      const movingPiece = game.get(selected);
      if (!movingPiece) {
        setSelected(null);
        setPossibleMoves([]);
        return;
      }

      const candidates = game
        .moves({ square: selected, verbose: true })
        .filter((m) => m.to === square);

      const promoCodes = [
        ...new Set(candidates.filter((m) => m.promotion).map((m) => m.promotion)),
      ].sort(
        (a, b) =>
          PROMOTION_PIECE_ORDER.indexOf(a) - PROMOTION_PIECE_ORDER.indexOf(b),
      );

      if (promoCodes.length >= 1) {
        setPromotionPick({
          from: selected,
          to: square,
          color: movingPiece.color,
          themeSlug: movingPiece.color === "w" ? whitePieceThemeSlug : blackPieceThemeSlug,
          options: promoCodes,
        });
        setSelected(null);
        setPossibleMoves([]);
        return;
      }

      submitMoveRequest(selected, square, movingPiece, undefined);
      setSelected(null);
      setPossibleMoves([]);
    },
    [
      game,
      selected,
      possibleMoves,
      playerColor,
      flashKing,
      flashIllegalSquare,
      submitMoveRequest,
      isViewOnly,
      promotionPick,
      whitePieceThemeSlug,
      blackPieceThemeSlug,
    ],
  );

  // --- Drag and drop via Pointer Events (window : préserve le clic deux temps) ---

  const detachWindowDragListeners = useCallback(() => {
    const { move, up } = windowDragHandlersRef.current;
    if (move) window.removeEventListener("pointermove", move, true);
    if (up) {
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", up, true);
    }
    windowDragHandlersRef.current = { move: null, up: null };
  }, []);

  useEffect(() => () => detachWindowDragListeners(), [detachWindowDragListeners]);

  const cleanupDrag = useCallback(() => {
    dragStateRef.current = null;
    setDragSourceSq(null);
    setDragOverSq(null);
    setDragGhost(null);
  }, []);

  const completeDragMove = useCallback(
    (targetSq) => {
      const ds = dragStateRef.current;
      if (!ds) return;

      if (!targetSq || targetSq === ds.from) {
        if (!targetSq) {
          setSelected(null);
          setPossibleMoves([]);
        }
        return;
      }

      if (!ds.legalTargets.includes(targetSq)) {
        unlockGameAudio();
        playUiErrorDeny();
        flashIllegalSquare(targetSq);
        setSelected(null);
        setPossibleMoves([]);
        return;
      }

      const movingPiece = { type: ds.pieceType, color: ds.pieceColor };
      const destinationRank = targetSq[1];
      const isPromo =
        ds.pieceType === "p" && (destinationRank === "8" || destinationRank === "1");

      if (isPromo) {
        const candidates = game
          .moves({ square: ds.from, verbose: true })
          .filter((m) => m.to === targetSq);
        const promoCodes = [
          ...new Set(candidates.filter((m) => m.promotion).map((m) => m.promotion)),
        ].sort((a, b) => PROMOTION_PIECE_ORDER.indexOf(a) - PROMOTION_PIECE_ORDER.indexOf(b));

        if (promoCodes.length >= 1) {
          skipNextGhostAnimRef.current = true;
          setPromotionPick({
            from: ds.from,
            to: targetSq,
            color: movingPiece.color,
            themeSlug: ds.themeSlug,
            options: promoCodes,
          });
          setSelected(null);
          setPossibleMoves([]);
          return;
        }
      }

      skipNextGhostAnimRef.current = true;
      submitMoveRequest(ds.from, targetSq, movingPiece, undefined);
      setSelected(null);
      setPossibleMoves([]);
    },
    [game, flashIllegalSquare, submitMoveRequest],
  );

  const handlePointerDown = useCallback(
    (e) => {
      if (isViewOnly || winnerRef.current || promotionPick || activeMoveAnimRef.current) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      detachWindowDragListeners();

      const el = e.target.closest?.(".cell[data-square]");
      if (!el) return;
      const sq = el.dataset.square;
      if (!sq) return;

      const piece = game.get(sq);
      if (!piece) return;
      if (game.turn() !== piece.color) return;
      if (playerColor && piece.color !== playerColor) return;

      const moves = game.moves({ square: sq, verbose: true });
      if (moves.length === 0) return;

      dragOccurredRef.current = false;
      dragStateRef.current = {
        from: sq,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        pieceType: piece.type,
        pieceColor: piece.color,
        themeSlug: piece.color === "w" ? whitePieceThemeSlug : blackPieceThemeSlug,
        legalTargets: moves.map((m) => m.to),
      };

      const onWindowMove = (ev) => {
        const ds = dragStateRef.current;
        if (!ds || ev.pointerId !== ds.pointerId) return;

        const dist = Math.hypot(ev.clientX - ds.startX, ev.clientY - ds.startY);
        if (!ds.moved && dist < DRAG_THRESHOLD_PX) return;

        if (!ds.moved) {
          ds.moved = true;
          dragOccurredRef.current = true;
          try {
            boardRootRef.current?.setPointerCapture?.(ev.pointerId);
          } catch {
            /* ignore */
          }
          setDragSourceSq(ds.from);
          setSelected(ds.from);
          setPossibleMoves(ds.legalTargets);
          unlockGameAudio();
        }

        setDragGhost({
          x: ev.clientX,
          y: ev.clientY,
          pieceType: ds.pieceType,
          pieceColor: ds.pieceColor,
          themeSlug: ds.themeSlug,
        });

        const elUnder = document.elementFromPoint(ev.clientX, ev.clientY);
        const cellEl = elUnder?.closest?.(".cell[data-square]");
        setDragOverSq(cellEl?.dataset?.square ?? null);
      };

      const onWindowUp = (ev) => {
        const ds = dragStateRef.current;
        if (!ds || ev.pointerId !== ds.pointerId) return;

        try {
          boardRootRef.current?.releasePointerCapture?.(ev.pointerId);
        } catch {
          /* ignore */
        }

        window.removeEventListener("pointermove", onWindowMove, true);
        window.removeEventListener("pointerup", onWindowUp, true);
        window.removeEventListener("pointercancel", onWindowUp, true);
        windowDragHandlersRef.current = { move: null, up: null };

        if (!ds.moved) {
          dragStateRef.current = null;
          return;
        }

        if (ev.type === "pointercancel") {
          setSelected(null);
          setPossibleMoves([]);
          cleanupDrag();
          return;
        }

        const elUnder = document.elementFromPoint(ev.clientX, ev.clientY);
        const cellEl = elUnder?.closest?.(".cell[data-square]");
        const targetSq = cellEl?.dataset?.square ?? null;

        completeDragMove(targetSq);
        cleanupDrag();
      };

      windowDragHandlersRef.current = { move: onWindowMove, up: onWindowUp };
      window.addEventListener("pointermove", onWindowMove, true);
      window.addEventListener("pointerup", onWindowUp, true);
      window.addEventListener("pointercancel", onWindowUp, true);
    },
    [
      game,
      isViewOnly,
      playerColor,
      promotionPick,
      activeMoveAnimRef,
      whitePieceThemeSlug,
      blackPieceThemeSlug,
      detachWindowDragListeners,
      completeDragMove,
      cleanupDrag,
    ],
  );

  useEffect(() => {
    if (!isViewOnly) return;
    setSelected(null);
    setPossibleMoves([]);
    setIllegalFlashSq(null);
    setPromotionPick(null);
  }, [isViewOnly]);

  useEffect(() => {
    if (!promotionPick) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        skipNextGhostAnimRef.current = false;
        setPromotionPick(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [promotionPick]);

  const kingSquare = game.inCheck() ? findKingSquare(game) : null;
  
  // During animation, render PRE-move board to avoid flash of piece at final position
  let position = game.board();
  if (previousFenRef.current && previousFenRef.current !== game.fen()) {
    try {
      const preGame = new Chess(previousFenRef.current);
      position = preGame.board();
    } catch {
      position = game.board();
    }
  }
  
  const useTiles = BOARD_TILES.active && themeHasTileAssets(tileCoalitionSlug);
  const tilePattern = useMemo(
    () => (useTiles ? buildTileUrlFlat(tileSeed, tileCoalitionSlug) : null),
    [useTiles, tileSeed, tileCoalitionSlug],
  );

  useEffect(() => {
    if (!popupOpen) return;

    setSelected(null);
    setPossibleMoves([]);
    setKingFlash(false);
    setIllegalFlashSq(null);
    setPromotionPick(null);
    if (illegalTimerRef.current) {
      clearTimeout(illegalTimerRef.current);
      illegalTimerRef.current = null;
    }
  }, [popupOpen]);

  return (
    <div>
      {moveFeedback ? (
        <p className="popup-winner" role="status">
          {moveFeedback}
        </p>
      ) : null}

      <div className="board-root">
        <div
          className="board-with-coordinates"
          style={{
            transform: playerColor === "b" ? "rotate(180deg)" : undefined,
          }}
        >
          <div
            className="board-coords board-coords--files board-coords--edge-top"
            aria-hidden="true"
          >
            {FILE_LABELS.map((ch) => (
              <span key={`cf-t-${ch}`} className="board-coords__label">
                {ch}
              </span>
            ))}
          </div>
          <div
            className="board-coords board-coords--ranks board-coords--edge-left"
            aria-hidden="true"
          >
            {RANK_LABELS.map((n) => (
              <span key={`rk-l-${n}`} className="board-coords__label">
                {n}
              </span>
            ))}
          </div>

          <div className="board-play-area">
            <div
              id="board"
              data-testid="chess-board"
              ref={boardRootRef}
              role="presentation"
              className={dragSourceSq ? "is-dragging" : undefined}
              onClick={handleBoardClick}
              onPointerDown={handlePointerDown}
            >
              <CellRenderer
                position={position}
                toSquare={toSquare}
                selected={selected}
                possibleMoves={possibleMoves}
                kingSquare={kingSquare}
                kingFlash={kingFlash}
                illegalFlashSq={illegalFlashSq}
                tilePattern={tilePattern}
                useTiles={useTiles}
                tileCoalitionSlug={tileCoalitionSlug}
                tileRotation={tileRotation}
                whitePieceThemeSlug={whitePieceThemeSlug}
                blackPieceThemeSlug={blackPieceThemeSlug}
                activeMoveAnim={activeMoveAnim}
                pieceRotation={pieceRotation}
                pieceSuppressed={(sq, anim) => pieceSuppressed(sq, anim) || sq === dragSourceSq}
                dragOverSq={dragOverSq}
              />

              <MoveGhost
                activeMoveAnim={activeMoveAnim}
                durationMs={MOVE_ANIM_MS}
                pieceRotation={ghostPieceRotation}
                onTransitionEnd={onGhostTransitionEnd}
              />
            </div>

            {/* Contre-rotation : le plateau entier est retourné pour les noirs, pas l’UI de promotion. */}
            <div
              className="board-promotion-unflip"
              style={
                playerColor === "b"
                  ? { transform: "rotate(180deg)" }
                  : undefined
              }
            >
              <PromotionPicker
                promotionPick={promotionPick}
                isViewOnly={isViewOnly}
                onCancel={() => {
                  skipNextGhostAnimRef.current = false;
                  setPromotionPick(null);
                }}
                onChoose={(code) => {
                  submitMoveRequest(
                    promotionPick.from,
                    promotionPick.to,
                    game.get(promotionPick.from),
                    code,
                  );
                  setPromotionPick(null);
                }}
              />
            </div>
          </div>

          <div
            className="board-coords board-coords--ranks board-coords--edge-right"
            aria-hidden="true"
          >
            {RANK_LABELS.map((n) => (
              <span key={`rk-r-${n}`} className="board-coords__label">
                {n}
              </span>
            ))}
          </div>
          <div
            className="board-coords board-coords--files board-coords--edge-bottom"
            aria-hidden="true"
          >
            {FILE_LABELS.map((ch) => (
              <span key={`cf-b-${ch}`} className="board-coords__label">
                {ch}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Ghost de pièce en position fixe : hors du container rotatif pour éviter les décalages */}
      {dragGhost && (
        <div
          className="board-drag-ghost"
          style={{ left: dragGhost.x, top: dragGhost.y }}
          aria-hidden="true"
        >
          <img
            className="board-drag-ghost__img"
            src={`/chess/pieces/${dragGhost.themeSlug}/${dragGhost.pieceColor === "w" ? "light" : "dark"}/${dragGhost.pieceType}.png`}
            alt=""
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}

export default Board;
