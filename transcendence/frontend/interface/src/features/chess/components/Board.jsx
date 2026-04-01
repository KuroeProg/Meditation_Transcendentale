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



const PROMOTION_PIECE_ORDER = ["q", "r", "b", "n"];
const MOVE_ANIM_MS = 200;

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
  isViewOnly = false,
}) {
  const { user } = useAuth();
  const tileCoalitionSlug = coalitionToSlug(
    user?.coalition ?? user?.coalition_name,
  );

  const [selected, setSelected] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [kingFlash, setKingFlash] = useState(false);
  const [localFeedback, setLocalFeedback] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [illegalFlashSq, setIllegalFlashSq] = useState(null);
  const [promotionPick, setPromotionPick] = useState(null);

  const winnerRef = useRef(null);
  const illegalTimerRef = useRef(null);
  const boardRootRef = useRef(null);

  const pieceRotation = playerColor === "b" ? "rotate(180deg)" : "rotate(0deg)";
  const tileRotation = playerColor === "b" ? "rotate(180deg)" : "rotate(0deg)";
  const ghostPieceRotation = "rotate(0deg)";
  const tileSeed = BOARD_TILES.seed;

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
      setLocalFeedback(null);

      if (selected === null) {
        const clickedPiece = game.get(square);
        if (clickedPiece && playerColor && clickedPiece.color !== playerColor) {
          setLocalFeedback("Cette pièce ne vous appartient pas.");
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
          setLocalFeedback("Ce n'est pas votre couleur.");
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
        flashIllegalSquare(square);
        setSelected(null);
        setPossibleMoves([]);
        return;
      }

      if (playerColor && game.turn() !== playerColor) {
        setLocalFeedback("Ce n'est pas votre tour.");
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
      if (e.key === "Escape") setPromotionPick(null);
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

  function getPopupContent(currentWinner) {
    if (currentWinner === "Nulle") {
      return {
        title: "Draw !",
        subtitle: "Equal position",
      };
    }
    if (
      currentWinner === "White-Timeout" ||
      currentWinner === "Black-Timeout"
    ) {
      const color = currentWinner === "White-Timeout" ? "White" : "Black";
      return {
        title: "Time is up !",
        subtitle: `${color} wins on time`,
      };
    }
    return {
      title: "Checkmate !",
      subtitle: `${currentWinner} wins`,
    };
  }

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
      {(localFeedback || moveFeedback) && (
        <p className="popup-winner">{localFeedback || moveFeedback}</p>
      )}

      {popupOpen && (
        <div className="popup-overlay">
          <div className="popup-checkmate">
            <button className="popup-close" onClick={() => setPopupOpen(false)}>
              x
            </button>
            <p className="popup-title">{getPopupContent(winner).title}</p>
            <p className="popup-winner">{getPopupContent(winner).subtitle}</p>
          </div>
        </div>
      )}

      <div className="board-root" ref={boardRootRef}>
        <div
          id="board"
          role="presentation"
          onClick={handleBoardClick}
          style={{
            transform: playerColor === "b" ? "rotate(180deg)" : "rotate(0deg)",
          }}
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
            pieceSuppressed={pieceSuppressed}
          />
        </div>

        <MoveGhost
          activeMoveAnim={activeMoveAnim}
          durationMs={MOVE_ANIM_MS}
          pieceRotation={ghostPieceRotation}
          onTransitionEnd={onGhostTransitionEnd}
        />

        <PromotionPicker
          promotionPick={promotionPick}
          isViewOnly={isViewOnly}
          onCancel={() => setPromotionPick(null)}
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
  );
}

export default Board;
