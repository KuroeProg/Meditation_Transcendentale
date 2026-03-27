import "../index.css";
import Board from "../objects/Board.jsx";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Chess } from "chess.js";
import { useSynchronizedChessTimers } from "../objects/Chrono.jsx";
import { useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useChessSocket } from "../hooks/useChessSocket.js";
import { get42AvatarUrl, getDisplayTitle } from "../utils/sessionUser.js";
import {
  getMockGameOpponent,
  isMockGameOpponentActive,
} from "../dev/mockGameOpponent.js";
import { randomTilePatternSeed } from "../chess/boardTiles.js";
import GameStatsPanel from "../components/GameStatsPanel.jsx";
import {
  playGameWin,
  playGameDraw,
  playGameResign,
  playClockTimeout,
  unlockGameAudio,
} from "../audio/gameSfx.js";
import {
  GameAmbientBgm,
  GameMusicPanel,
} from "../components/GamePageAudio.jsx";

function uciToMoveObject(uci) {
  if (typeof uci !== "string" || uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
  return { from, to, promotion };
}

function fenAfterPlies(moveLog, count) {
  const c = new Chess();
  for (let i = 0; i < count; i++) {
    const m = moveLog[i];
    if (!m?.san) return null;
    const r = c.move(m.san);
    if (!r) return null;
  }
  return c.fen();
}

function App() {
  useEffect(() => {
    document.title = "Transcendance Chess Game";
  }, []);

  const [showDebug, setShowDebug] = useState(false);

  const [game, setGame] = useState(() => new Chess());
  const [gameState, setGameState] = useState(null);
  const [winner, setWinner] = useState(null);
  const [moveFeedback, setMoveFeedback] = useState(null);
  const [tilePatternSeed, setTilePatternSeed] = useState(() =>
    randomTilePatternSeed(),
  );
  const [matchGeneration, setMatchGeneration] = useState(0);
  const [moveLog, setMoveLog] = useState([]);
  const [viewPlies, setViewPlies] = useState(null);
  const lastMoveTs = useRef(null);
  const moveLogLenRef = useRef(0);
  const lastLoggedFenRef = useRef(new Chess().fen());
  const lastLoggedUciRef = useRef(null);

  const { gameId } = useParams();
  const { user } = useAuth();
  const { isConnected, socketError, lastMessage, sendMove } =
    useChessSocket(gameId);
  const devOpp = isMockGameOpponentActive() ? getMockGameOpponent() : null;

  useEffect(() => {
    moveLogLenRef.current = moveLog.length;
  }, [moveLog.length]);

  useEffect(() => {
    lastMoveTs.current = Date.now();
  }, [matchGeneration]);

  const userId = useMemo(() => {
    if (!user) return null;
    return user.id ?? user.user_id ?? user.pk ?? user.sub ?? null;
  }, [user]);

  const playerColor = useMemo(() => {
    if (!gameState || userId == null) return null;
    if (String(gameState.white_player_id) === String(userId)) return "w";
    if (String(gameState.black_player_id) === String(userId)) return "b";
    return null;
  }, [gameState, userId]);

  const handleMove = useCallback(({ color, piece, from, to, san }) => {
    const now = Date.now();
    const timeSpentMs =
      lastMoveTs.current != null ? now - lastMoveTs.current : 0;
    lastMoveTs.current = now;
    setMoveLog((prev) => [
      ...prev,
      {
        moveNumber: Math.floor(prev.length / 2) + 1,
        color,
        piece,
        from,
        to,
        san,
        timeSpentMs,
      },
    ]);
    setViewPlies(null);
  }, []);

  const logMoveFromServerState = useCallback(
    (incomingState) => {
      const nextFen = incomingState?.fen;
      const nextUci = incomingState?.last_move_uci;

      if (!nextFen || !nextUci) return;
      if (nextFen === lastLoggedFenRef.current) return;
      if (nextUci === lastLoggedUciRef.current) return;

      try {
        const prevBoard = new Chess(lastLoggedFenRef.current);
        const parsedMove = uciToMoveObject(nextUci);
        if (!parsedMove) return;

        const madeMove = prevBoard.move(parsedMove);
        if (!madeMove) return;

        handleMove({
          color: madeMove.color,
          piece: madeMove.piece,
          from: madeMove.from,
          to: madeMove.to,
          san: madeMove.san,
        });

        lastLoggedUciRef.current = nextUci;
      } catch {
        // Ignore malformed/unsynchronized states and keep UI responsive.
      }
    },
    [handleMove],
  );

  const viewFen = useMemo(() => {
    if (viewPlies == null) return null;
    if (viewPlies === 0) return new Chess().fen();
    if (!moveLog.length) return null;
    const n = Math.min(viewPlies, moveLog.length);
    return fenAfterPlies(moveLog, n);
  }, [moveLog, viewPlies]);

  const displayedGame = useMemo(() => {
    if (viewFen == null) return game;
    try {
      return new Chess(viewFen);
    } catch {
      return game;
    }
  }, [game, viewFen]);

  const goReplayFirst = useCallback(() => {
    if (moveLogLenRef.current === 0) return;
    setViewPlies(0);
  }, []);

  const goReplayPrev = useCallback(() => {
    setViewPlies((v) => {
      const len = moveLogLenRef.current;
      if (len === 0) return v;
      if (v === null) return len > 0 ? len - 1 : v;
      if (v <= 0) return 0;
      return v - 1;
    });
  }, []);

  const goReplayNext = useCallback(() => {
    setViewPlies((v) => {
      const len = moveLogLenRef.current;
      if (len === 0) return v;
      if (v === null) return v;
      if (v >= len) return null;
      return v + 1;
    });
  }, []);

  const goReplayLast = useCallback(() => {
    const len = moveLogLenRef.current;
    if (len === 0) return;
    setViewPlies(len);
  }, []);

  const handleResign = useCallback(() => {
    if (winner || userId == null) return;
    sendMove({ action: "resign", player_id: userId });
  }, [winner, userId, sendMove]);

  const handleOfferDraw = useCallback(() => {
    if (winner || userId == null) return;
    sendMove({ action: "draw_offer", player_id: userId });
  }, [winner, userId, sendMove]);

  const handleRespondDraw = useCallback(
    (accept) => {
      if (winner || userId == null) return;
      sendMove({ action: "draw_response", player_id: userId, accept });
    },
    [winner, userId, sendMove],
  );

  const startNewMatch = useCallback(() => {
    setGame(new Chess());
    setWinner(null);
    setTilePatternSeed(randomTilePatternSeed());
    setMatchGeneration((g) => g + 1);
    setMoveLog([]);
    setViewPlies(null);
    lastLoggedFenRef.current = new Chess().fen();
    lastLoggedUciRef.current = null;
    lastMoveTs.current = Date.now();
  }, []);

  // Monitor gameState changes from WebSocket
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.error) {
      setMoveFeedback(lastMessage.error);
      return;
    }

    if (lastMessage.action === "game_state" && lastMessage.game_state) {
      const incomingState = lastMessage.game_state;
      setGameState(incomingState);

      logMoveFromServerState(incomingState);

      // Handle status transitions from server
      if (
        incomingState.status === "checkmate" ||
        incomingState.status === "stalemate"
      ) {
        const winnerColor =
          incomingState.status === "checkmate"
            ? incomingState.winner_player_id === incomingState?.white_player_id
              ? "White"
              : "Black"
            : "Nulle";
        setWinner(winnerColor);
      } else if (incomingState.status === "draw") {
        setWinner("Nulle");
      } else if (incomingState.status === "resigned") {
        setWinner(
          incomingState.winner_player_id === incomingState?.white_player_id
            ? "White-Resign"
            : "Black-Resign",
        );
      } else if (incomingState.status === "timeout") {
        setWinner(
          incomingState.winner_player_id === incomingState?.white_player_id
            ? "White-Timeout"
            : "Black-Timeout",
        );
      }

      // Update local game state to reflect server state
      try {
        const g = new Chess(incomingState.fen);
        setGame(g);
        lastLoggedFenRef.current = g.fen();
      } catch (err) {
        console.error(
          "[chess] Invalid FEN from server:",
          incomingState.fen,
          err,
        );
      }
    }

    if (lastMessage.action === "move_response") {
      setMoveFeedback(null);
    }
  }, [lastMessage, gameState?.white_player_id, logMoveFromServerState]);

  // Play audio effects when game ends
  const prevWinnerRef = useRef(null);
  useEffect(() => {
    if (winner === prevWinnerRef.current) return;
    prevWinnerRef.current = winner;
    if (!winner) return;
    unlockGameAudio();
    if (winner === "White" || winner === "Black") playGameWin();
    else if (winner === "Nulle") playGameDraw();
    else if (winner === "Black-Resign" || winner === "White-Resign")
      playGameResign();
    else if (winner === "White-Timeout" || winner === "Black-Timeout")
      playClockTimeout();
  }, [winner]);

  const handleResetGame = useCallback(() => {
    startNewMatch();
    setMoveFeedback(null);
  }, [startNewMatch]);

  // Sync timers from server state
  const syncedTimers = useSynchronizedChessTimers(gameState, game.turn());

  const whiteLabel = user
    ? (getDisplayTitle(user).primary ?? "Joueur Blanc")
    : "Joueur Blanc";
  const whiteAvatar = get42AvatarUrl(user);
  const blackLabel = devOpp?.displayName ?? "Joueur Noir";
  const blackAvatar = devOpp?.avatarSrc ?? "imgs/PawnLogoB.jpeg";

  const topPlayerColor = playerColor === "b" ? "w" : "b";
  const bottomPlayerColor = playerColor === "b" ? "b" : "w";

  const getPlayerBarData = (color) => {
    if (color === "b") {
      return {
        avatar: blackAvatar,
        name: blackLabel,
        nameClass: "player-nameB",
        timerClass: "player-timerB",
        timer: syncedTimers.blackTime,
      };
    }

    return {
      avatar: whiteAvatar,
      name: whiteLabel,
      nameClass: "player-nameW",
      timerClass: "player-timerW",
      timer: syncedTimers.whiteTime,
    };
  };

  const topPlayer = getPlayerBarData(topPlayerColor);
  const bottomPlayer = getPlayerBarData(bottomPlayerColor);
  const normalizedUserId = userId == null ? null : String(userId);
  const drawOfferFrom = gameState?.draw_offer_from_player_id;
  const normalizedDrawOfferFrom =
    drawOfferFrom == null ? null : String(drawOfferFrom);
  const drawOfferIncoming =
    normalizedUserId != null &&
    normalizedDrawOfferFrom != null &&
    normalizedDrawOfferFrom !== normalizedUserId;
  const drawOfferOutgoing =
    normalizedUserId != null && normalizedDrawOfferFrom === normalizedUserId;

  return (
    <div>
      <div
        style={{
          position: "fixed",
          bottom: 10,
          right: 10,
          zIndex: 999,
          background: showDebug ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)",
          color: "#0f0",
          padding: "10px",
          fontSize: "11px",
          fontFamily: "monospace",
          border: "1px solid #0f0",
          cursor: "pointer",
          maxWidth: "400px",
          maxHeight: "300px",
          overflow: "auto",
        }}
        onClick={() => setShowDebug(!showDebug)}
      >
        {!showDebug ? (
          <div>Debug v</div>
        ) : (
          <div
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "10px",
            }}
          >
            User ID: {userId || "null"}
            <br />
            Auth: {user ? "OK" : "auth-err"}
            <br />
            WS: {isConnected ? "ok" : "ko"}
            <br />
            Error: {socketError || "none"}
            <br />
            Game: {gameId}
            <br />
            Color: {playerColor || "-"}
            <br />
            Status: {gameState?.status || "-"}
            <br />
            ---
            <br />
            user:{" "}
            {JSON.stringify(user ? { id: user.id, login: user.login } : null)}
            <br />
            ---
            <br />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleResetGame();
              }}
              style={{
                padding: "4px 8px",
                marginTop: "5px",
                background: "#0f0",
                color: "#000",
                border: "none",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Reset Game
            </button>
          </div>
        )}
      </div>
      <div className="header" />

      <div className="game-container">
        <GameAmbientBgm />
        <GameMusicPanel />
        <div className="game-board-col">
          <div className="player-bar">
            <img className="player-avatar" src={topPlayer.avatar} alt="" />
            <span className={topPlayer.nameClass}>{topPlayer.name}</span>
            <span className={topPlayer.timerClass}>{topPlayer.timer}</span>
          </div>

          <div className="board-frame">
            <Board
              game={displayedGame}
              winner={winner}
              onMoveRequest={(payload) =>
                sendMove({
                  action: "play_move",
                  player_id: userId,
                  ...payload,
                })
              }
              playerColor={playerColor}
              whiteCoalition={gameState?.white_player_coalition}
              blackCoalition={gameState?.black_player_coalition}
              moveFeedback={moveFeedback}
              isViewOnly={viewPlies !== null}
            />
          </div>

          <div className="player-bar">
            <img className="player-avatar" src={bottomPlayer.avatar} alt="" />
            <span className={bottomPlayer.nameClass}>{bottomPlayer.name}</span>
            <span className={bottomPlayer.timerClass}>
              {bottomPlayer.timer}
            </span>
          </div>
        </div>

        <div className="game-stats-panel-wrap">
          <GameStatsPanel
            moveLog={moveLog}
            winner={winner}
            onPlayAgain={startNewMatch}
            viewPlies={viewPlies}
            onViewPlies={setViewPlies}
            onResign={handleResign}
            playerColor={playerColor}
            drawOfferIncoming={drawOfferIncoming}
            drawOfferOutgoing={drawOfferOutgoing}
            onOfferDraw={handleOfferDraw}
            onRespondDraw={handleRespondDraw}
            onReplayFirst={goReplayFirst}
            onReplayPrev={goReplayPrev}
            onReplayNext={goReplayNext}
            onReplayLast={goReplayLast}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
