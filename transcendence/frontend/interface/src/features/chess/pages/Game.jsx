import Board from "../components/Board.jsx";
import { CapturedPiecesBar } from "../components/CapturedPieces.jsx";
import { useEffect, useCallback, useMemo } from "react";
import { useSynchronizedChessTimers } from "../components/Chrono.jsx";
import { useParams } from "react-router-dom";
import { useAuth } from "../../auth/index.js";
import { useChessSocket } from "../hooks/useChessSocket.js";
import { get42AvatarUrl, getDisplayTitle } from "../../../utils/sessionUser.js";
import GameStatsPanel from "../../stats/components/GameStatsPanel.jsx";
import { GameAmbientBgm } from "../../audio/components/GameAudio.jsx";
import {
  normalizeId,
} from "../core/chessSelectors.js";
import { useChessEngine } from "../hooks/useChessEngine.js";
import { useChessAudio } from "../hooks/useChessAudio.js";

function App() {
  useEffect(() => {
    document.title = "Transcendance Chess Game";
  }, []);

  const { gameId } = useParams();
  const { user } = useAuth();
  const mode = useMemo(() => {
    const id = String(gameId ?? "").toLowerCase();
    if (id === "training" || id === "local" || id.startsWith("training_")) {
      return "training";
    }
    return "online";
  }, [gameId]);

  const { isConnected, socketError, lastMessage, sendMove } =
    useChessSocket(mode === "online" ? gameId : null);

  const {
    state,
    userId,
    playerColor,
    displayedGame,
    toggleDebug,
    handleMoveRequest,
    handleResign,
    handleOfferDraw,
    handleRespondDraw,
    startNewMatch,
    setViewPlies,
    drawOfferIncoming,
    drawOfferOutgoing,
    goReplayFirst,
    goReplayPrev,
    goReplayNext,
    goReplayLast,
  } = useChessEngine({
    mode,
    gameId,
    user,
    lastMessage,
    sendMove,
  });

  const {
    showDebug,
    game,
    gameState,
    winner,
    moveFeedback,
    tilePatternSeed,
    moveLog,
    viewPlies,
  } = state;

  const normalizedUserId = useMemo(() => normalizeId(userId), [userId]);

  useChessAudio({
    moveLog,
    winner,
    moveFeedback,
    enabled: true,
  });

  const handleResetGame = useCallback(() => {
    startNewMatch();
  }, [startNewMatch]);

  // Sync timers from server state
  const onlineTimers = useSynchronizedChessTimers(
    gameState,
    game.turn(),
    moveLog.length,
  );
  const syncedTimers =
    mode === "training"
      ? {
          whiteSeconds: 0,
          blackSeconds: 0,
          whiteTime: "--:--",
          blackTime: "--:--",
        }
      : onlineTimers;

  const whitePlayerId = normalizeId(gameState?.white_player_id);
  const blackPlayerId = normalizeId(gameState?.black_player_id);
  const whiteProfileFromState =
    gameState?.white_player_profile && typeof gameState.white_player_profile === "object"
      ? gameState.white_player_profile
      : null;
  const blackProfileFromState =
    gameState?.black_player_profile && typeof gameState.black_player_profile === "object"
      ? gameState.black_player_profile
      : null;

  const whiteUserProfile =
    whitePlayerId && whitePlayerId === normalizedUserId
      ? user
      : whiteProfileFromState;
  const blackUserProfile =
    blackPlayerId && blackPlayerId === normalizedUserId
      ? user
      : blackProfileFromState;

  const whiteLabel = whiteUserProfile
    ? (getDisplayTitle(whiteUserProfile).primary ?? "Joueur Blanc")
    : "Joueur Blanc";
  const whiteAvatar = get42AvatarUrl(whiteUserProfile);
  const blackLabel = blackUserProfile
    ? (getDisplayTitle(blackUserProfile).primary ?? "Joueur Noir")
    : "Joueur Noir";
  const blackAvatar = get42AvatarUrl(blackUserProfile);

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

  return (
    <div data-testid="game-page">
      <div
        className="game-debug-hud"
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
        onClick={toggleDebug}
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

      <div className="game-container" data-testid="game-shell">
        <GameAmbientBgm />
        <div className="game-board-col">
          <div className="player-bar" data-testid="game-player-bar-top">
            <img className="player-avatar" src={topPlayer.avatar} alt="" />
            <span className={topPlayer.nameClass}>{topPlayer.name}</span>
            <span className={topPlayer.timerClass}>{topPlayer.timer}</span>
          </div>

          <CapturedPiecesBar
            game={displayedGame}
            playerColor={playerColor || 'w'}
            position="top"
          />

          <div className="board-frame" data-testid="game-board-frame">
            <Board
              game={displayedGame}
              winner={winner}
              onMoveRequest={handleMoveRequest}
              playerColor={playerColor}
              whiteCoalition={gameState?.white_player_coalition}
              blackCoalition={gameState?.black_player_coalition}
              moveFeedback={moveFeedback}
              tilePatternSeed={tilePatternSeed}
              isViewOnly={viewPlies !== null}
            />
          </div>

          <CapturedPiecesBar
            game={displayedGame}
            playerColor={playerColor || 'w'}
            position="bottom"
          />

          <div className="player-bar" data-testid="game-player-bar-bottom">
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
            opponentUsername={
              playerColor === 'w' ? blackLabel : whiteLabel
            }
            gameId={gameId}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
