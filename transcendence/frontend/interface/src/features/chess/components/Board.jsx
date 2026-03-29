import {
  useState,
  useRef,
  useEffect,
  useMemo,
  memo,
  useCallback,
  useLayoutEffect,
} from "react";
import { Chess } from "chess.js";
import { useAuth } from "../../auth/index.js";
import { coalitionToSlug } from "../../theme/services/coalitionTheme.js";
import { getPieceThemeSlugForColor } from "../mock/mockGameOpponent.js";
import { ChessPieceImg } from "./ChessPiecePng.jsx";
import {
  BOARD_TILES,
  buildTileUrlFlat,
  themeHasTileAssets,
} from "../assets/boardTiles.js";
import {
  collectChessGamePreloadUrls,
  preloadChessImages,
} from "../assets/chessAssetPreload.js";

const MOVE_ANIM_MS = 200;

const PROMOTION_PIECE_ORDER = ["q", "r", "b", "n"];

const PROMOTION_LABELS = {
  q: "Dame",
  r: "Tour",
  b: "Fou",
  n: "Cavalier",
};

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

function enPassantCapturedSquare(from, to) {
  return to[0] + from[1];
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

function normalizeFen(fen) {
  return String(fen || "").split(" ").slice(0, 4).join(" ");
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

function pieceSuppressed(sq, anim) {
  if (!anim || anim.phase === "done") return false;
  if (sq === anim.from) return true;
  if (anim.enPassantSq && sq === anim.enPassantSq) return true;
  if (anim.captureOnTo && sq === anim.to) return true;
  return sq === anim.to;
}

const BoardCell = memo(function BoardCell({
  sq,
  isLight,
  useTiles,
  tileCoalitionSlug,
  tileSrc,
  tileRotation,
  pieceType,
  pieceColor,
  pieceThemeSlug,
  isSelected,
  isPossibleMove,
  isPossibleCapture,
  isKingCheckCell,
  isIllegalFlash,
  suppressPiece,
  pieceRotation,
}) {
  const className = [
    "cell",
    isLight ? "light" : "dark",
    useTiles ? "board-tiles" : "",
    isSelected ? "selected" : "",
    isPossibleMove ? "possible-move" : "",
    isPossibleCapture ? "possible-capture" : "",
    isKingCheckCell ? "king-check king-check-attn" : "",
    isIllegalFlash ? "illegal-move-flash" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const showPiece = pieceType && pieceColor && !suppressPiece;

  return (
    <div data-square={sq} className={className}>
      {useTiles && tileSrc && (
        <span className="cell-tile-stack" aria-hidden>
          <img
            className="cell-tile"
            src={tileSrc}
            alt=""
            draggable={false}
            decoding="async"
            style={{ transform: tileRotation }}
            data-tile-theme={tileCoalitionSlug}
            data-tile-shade={isLight ? "light" : "dark"}
          />
        </span>
      )}

      {showPiece && (
        <div className="piece-wrap">
          <ChessPieceImg
            theme={pieceThemeSlug}
            pieceType={pieceType}
            pieceColor={pieceColor}
            className="piece"
            style={{ transform: pieceRotation }}
          />
        </div>
      )}
    </div>
  );
});

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
  const [activeMoveAnim, setActiveMoveAnim] = useState(null);

  const winnerRef = useRef(null);
  const illegalTimerRef = useRef(null);
  const boardRootRef = useRef(null);
  const animRef = useRef(null);
  const animWatchdogRef = useRef(null);
  const activeAnimRef = useRef(false);
  const previousFenRef = useRef(game.fen());

  const pieceRotation = playerColor === "b" ? "rotate(180deg)" : "rotate(0deg)";
  const tileRotation = playerColor === "b" ? "rotate(180deg)" : "rotate(0deg)";
  const tileSeed = BOARD_TILES.seed;

  const whitePieceThemeSlug = whiteCoalition
    ? coalitionToSlug(whiteCoalition)
    : getPieceThemeSlugForColor("w", user);
  const blackPieceThemeSlug = blackCoalition
    ? coalitionToSlug(blackCoalition)
    : getPieceThemeSlugForColor("b", user);

  useEffect(() => {
    if (winner) setPopupOpen(true);
  }, [winner]);

  useEffect(() => {
    winnerRef.current = winner;
  }, [winner]);

  useEffect(() => {
    activeAnimRef.current = activeMoveAnim != null;
    animRef.current = activeMoveAnim;
  }, [activeMoveAnim]);

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

  const finalizeGhostAnimation = useCallback(() => {
    if (animWatchdogRef.current) {
      window.clearTimeout(animWatchdogRef.current);
      animWatchdogRef.current = null;
    }
    setActiveMoveAnim((prev) => (prev ? { ...prev, phase: "done" } : null));
    queueMicrotask(() => {
      setActiveMoveAnim(null);
    });
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
      if (activeAnimRef.current) return;

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

  useEffect(() => {
    const nextFen = game.fen();
    const prevFen = previousFenRef.current;
    if (!prevFen || prevFen === nextFen) {
      previousFenRef.current = nextFen;
      return;
    }

    const moveAnim = findAnimatedMove(prevFen, nextFen);
    previousFenRef.current = nextFen;
    if (!moveAnim || isViewOnly) {
      finalizeGhostAnimation();
      return;
    }

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

    const br = board.getBoundingClientRect();
    const rf = elFrom.getBoundingClientRect();
    const rt = elTo.getBoundingClientRect();
    const x0 = rf.left + rf.width / 2 - br.left;
    const y0 = rf.top + rf.height / 2 - br.top;
    const x1 = rt.left + rt.width / 2 - br.left;
    const y1 = rt.top + rt.height / 2 - br.top;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const size = Math.min(rf.width, rf.height) * 0.88;

    setActiveMoveAnim((prev) =>
      prev && prev.key === a.key
        ? { ...prev, phase: "slide", x0, y0, dx, dy, size }
        : prev,
    );
  }, [activeMoveAnim, finalizeGhostAnimation]);

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

  const kingSquare = game.inCheck() ? findKingSquare(game) : null;
  const position = game.board();
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

  useEffect(() => {
    return () => {
      if (animWatchdogRef.current) {
        window.clearTimeout(animWatchdogRef.current);
      }
    };
  }, []);

  const ghost =
    activeMoveAnim &&
    (activeMoveAnim.phase === "slide" || activeMoveAnim.phase === "sliding") &&
    activeMoveAnim.size != null ? (
      <div
        className={`board-move-ghost ${activeMoveAnim.phase === "sliding" ? "board-move-ghost--sliding" : ""}`}
        style={{
          "--ghost-x0": `${activeMoveAnim.x0}px`,
          "--ghost-y0": `${activeMoveAnim.y0}px`,
          "--ghost-dx": `${activeMoveAnim.dx}px`,
          "--ghost-dy": `${activeMoveAnim.dy}px`,
          "--ghost-size": `${activeMoveAnim.size}px`,
          "--ghost-dur": `${MOVE_ANIM_MS}ms`,
        }}
        onTransitionEnd={onGhostTransitionEnd}
      >
        <ChessPieceImg
          theme={activeMoveAnim.themeSlug}
          pieceType={activeMoveAnim.moving.type}
          pieceColor={activeMoveAnim.moving.color}
          className="board-move-ghost__img"
          style={{ transform: pieceRotation }}
        />
      </div>
    ) : null;

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
          {position.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const sq = toSquare(rowIndex, colIndex);
              const isLight = (rowIndex + colIndex) % 2 === 0;
              const isSelected = selected === sq;
              const isPossibleMove = possibleMoves.includes(sq) && !piece;
              const isPossibleCapture = possibleMoves.includes(sq) && !!piece;
              const isKingInCheck = sq === kingSquare && kingFlash;
              const isIllegal = illegalFlashSq === sq;
              const tileSrc = tilePattern
                ? tilePattern[rowIndex * 8 + colIndex]
                : null;

              return (
                <BoardCell
                  key={`${rowIndex}-${colIndex}`}
                  sq={sq}
                  isLight={isLight}
                  useTiles={useTiles}
                  tileCoalitionSlug={tileCoalitionSlug}
                  tileSrc={tileSrc}
                  tileRotation={tileRotation}
                  pieceType={piece ? piece.type : null}
                  pieceColor={piece ? piece.color : null}
                  pieceThemeSlug={
                    piece
                      ? piece.color === "w"
                        ? whitePieceThemeSlug
                        : blackPieceThemeSlug
                      : ""
                  }
                  isSelected={isSelected}
                  isPossibleMove={isPossibleMove}
                  isPossibleCapture={isPossibleCapture}
                  isKingCheckCell={isKingInCheck}
                  isIllegalFlash={isIllegal}
                  suppressPiece={pieceSuppressed(sq, activeMoveAnim)}
                  pieceRotation={pieceRotation}
                />
              );
            }),
          )}
        </div>

        {ghost}

        {promotionPick && !isViewOnly ? (
          <div
            className="board-promotion-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Choisir la piece de promotion"
          >
            <button
              type="button"
              className="board-promotion-backdrop"
              aria-label="Annuler la promotion"
              onClick={() => setPromotionPick(null)}
            />
            <div className="board-promotion-toolbar">
              <p className="board-promotion-title">Promotion du pion</p>
              <div className="board-promotion-choices">
                {promotionPick.options.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className="board-promotion-btn"
                    aria-label={PROMOTION_LABELS[code] ?? code}
                    onClick={() => {
                      submitMoveRequest(
                        promotionPick.from,
                        promotionPick.to,
                        game.get(promotionPick.from),
                        code,
                      );
                      setPromotionPick(null);
                    }}
                  >
                    <ChessPieceImg
                      theme={promotionPick.themeSlug}
                      pieceType={code}
                      pieceColor={promotionPick.color}
                      className="board-promotion-piece"
                    />
                    <span className="board-promotion-label">
                      {PROMOTION_LABELS[code] ?? code}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Board;
