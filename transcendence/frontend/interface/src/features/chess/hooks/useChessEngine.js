import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { Chess } from "chess.js";
import {
  chessReducer,
  createInitialChessState,
} from "../core/chessReducer.js";
import {
  ACTIVE_MATCH_STATUSES,
  CHESS_ACTIONS,
  FINISHED_MATCH_STATUSES,
} from "../core/chessTypes.js";
import {
  getDisplayedGame,
  getDrawOfferFlags,
  getPlayerColor,
  getUserId,
  getViewFen,
  getWinnerFromGameState,
  getWinnerFromLocalGame,
  normalizeId,
} from "../core/chessSelectors.js";
import { useChessReplay } from "./useChessReplay.js";
import { fetchGameDetails } from "../services/chessApi.js";

const ACTIVE_GAME_STORAGE_KEY = "activeGameId";

function uciToMoveObject(uci) {
  if (typeof uci !== "string" || uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
  return { from, to, promotion };
}

function buildPseudoTrainingState(game, userId) {
  return {
    fen: game.fen(),
    status: game.isGameOver() ? "finished" : "active",
    white_player_id: userId,
    black_player_id: null,
    white_time_left: 0,
    black_time_left: 0,
    draw_offer_from_player_id: null,
  };
}

function buildMoveLogFromServerState(incomingState) {
  const rawMoves = Array.isArray(incomingState?.moves) ? incomingState.moves : null;
  if (!rawMoves) return null;

  const replayBoard = new Chess();
  const hydrated = [];

  for (let i = 0; i < rawMoves.length; i += 1) {
    const moveFromServer = rawMoves[i] ?? {};
    const san = moveFromServer.san_notation || moveFromServer.san || "";
    if (!san) continue;

    // Try playing the move as SAN first, then as UCI if it fails
    let madeMove = null;
    try {
      madeMove = replayBoard.move(san);
    } catch (e) {
      const parsedMove = uciToMoveObject(san);
      if (parsedMove) {
        try { madeMove = replayBoard.move(parsedMove); } catch(e2) {}
      }
    }
    
    if (!madeMove) continue;

    hydrated.push({
      moveNumber: Math.floor(i / 2) + 1,
      color: madeMove.color,
      piece: madeMove.piece,
      from: madeMove.from,
      to: madeMove.to,
      san: madeMove.san,
      timeSpentMs:
        Number.isFinite(moveFromServer.timeSpentMs)
          ? moveFromServer.timeSpentMs
          : Number.isFinite(moveFromServer.time_taken_ms)
          ? moveFromServer.time_taken_ms
          : 0,
    });
  }

  return hydrated;
}

export function useChessEngine({ mode, gameId, user, lastMessage, sendMove }) {
  const [state, dispatch] = useReducer(
    chessReducer,
    undefined,
    createInitialChessState,
  );

  const { game, gameState, winner, moveLog, viewPlies, matchGeneration } = state;

  const userId = useMemo(() => getUserId(user), [user]);
  const playerColor = useMemo(() => {
    if (mode === "training") return null;
    return getPlayerColor(gameState, userId);
  }, [gameState, mode, userId]);

  const normalizedUserId = useMemo(() => normalizeId(userId), [userId]);

  const lastMoveTs = useRef(null);
  const lastLoggedFenRef = useRef(new Chess().fen());
  const lastLoggedUciRef = useRef(null);
  const processingMoveRef = useRef(false); // Track if move is currently being processed

  useEffect(() => {
    if (mode !== "online" || !gameId || gameState) return;

    let isMounted = true;
    const cleanId = String(gameId).replace('game-', '');

    fetchGameDetails(cleanId).then(data => {
      if (!isMounted) return;
      
      // If we received a live state while fetching, ignore the API result
      if (state.gameState) return;

      const hydratedMoveLog = buildMoveLogFromServerState({ moves: data.moves });
      const finalBoard = new Chess();
      if (hydratedMoveLog) {
          hydratedMoveLog.forEach(m => {
            try { finalBoard.move(m.san); } catch(e) {}
          });
      }

      // Map API response to typical WebSocket gameState format
      const mappedState = {
        ...data,
        white_player_id: data.white_player_id,
        black_player_id: data.black_player_id,
        white_player_profile: data.player_white,
        black_player_profile: data.player_black,
        status: 'finished',
        fen: finalBoard.fen(),
      };

      dispatch({
        type: CHESS_ACTIONS.APPLY_SERVER_SNAPSHOT,
        payload: {
          gameState: mappedState,
          winner: data.winner_id 
            ? (data.winner_id === data.player_white?.id ? 'White' : 'Black') 
            : (data.termination_reason?.toLowerCase().includes('draw') ? 'Nulle' : null),
          game: finalBoard,
          moveLog: hydratedMoveLog,
        },
      });
    }).catch(() => {
      // Game might be live and not yet in DB, or ID is invalid. 
      // Silently fail as useChessSocket will handle live games.
    });

    return () => { isMounted = false; };
  }, [mode, gameId, gameState, state.gameState]);

  useEffect(() => {
    lastMoveTs.current = Date.now();
  }, [matchGeneration]);

  useEffect(() => {
    if (mode !== "online") return;

    const status = gameState?.status;
    if (!status) return;

    if (ACTIVE_MATCH_STATUSES.has(status)) {
      sessionStorage.setItem(ACTIVE_GAME_STORAGE_KEY, gameId);
      return;
    }

    if (FINISHED_MATCH_STATUSES.has(status)) {
      const lockedGameId = sessionStorage.getItem(ACTIVE_GAME_STORAGE_KEY);
      if (lockedGameId === gameId) {
        sessionStorage.removeItem(ACTIVE_GAME_STORAGE_KEY);
      }
    }
  }, [gameId, gameState?.status, mode]);

  const appendMoveLogEntry = useCallback((moveMeta) => {
    const now = Date.now();
    const timeSpentMs =
      lastMoveTs.current != null ? now - lastMoveTs.current : 0;
    lastMoveTs.current = now;

    // Validate moveMeta has all required fields
    if (!moveMeta || !moveMeta.san) {
      return;
    }

    const entry = {
      moveNumber: Math.floor(moveLog.length / 2) + 1,
      color: moveMeta.color,
      piece: moveMeta.piece,
      from: moveMeta.from,
      to: moveMeta.to,
      san: moveMeta.san,
      timeSpentMs,
    };

    dispatch({
      type: CHESS_ACTIONS.APPEND_MOVE_LOG_ENTRY,
      payload: entry,
    });
  }, [moveLog.length]);

  const setViewPlies = useCallback((plies) => {
    dispatch({ type: CHESS_ACTIONS.SET_VIEW_PLIES, payload: plies });
  }, []);

  const replay = useChessReplay({
    moveLogLength: moveLog.length,
    viewPlies,
    setViewPlies,
  });

  const logMoveFromServerState = useCallback((incomingState) => {
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

      appendMoveLogEntry({
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
  }, [appendMoveLogEntry]);

  useEffect(() => {
    if (mode !== "online") return;
    if (!lastMessage) return;

    if (lastMessage.error) {
      dispatch({
        type: CHESS_ACTIONS.SET_MOVE_FEEDBACK,
        payload: lastMessage.error,
      });
      return;
    }

    if (lastMessage.action === "game_state" && lastMessage.game_state) {
      const incomingState = lastMessage.game_state;
      const hydratedMoveLog = buildMoveLogFromServerState(incomingState);

      if (hydratedMoveLog === null) {
        logMoveFromServerState(incomingState);
      }

      const winnerFromServer = getWinnerFromGameState(incomingState);
      let gameFromServer = null;
      try {
        gameFromServer = new Chess(incomingState.fen);
        lastLoggedFenRef.current = gameFromServer.fen();
        lastLoggedUciRef.current = incomingState.last_move_uci ?? null;
      } catch (err) {
        console.error(
          "[chess] Invalid FEN from server:",
          incomingState.fen,
          err,
        );
      }

      dispatch({
        type: CHESS_ACTIONS.APPLY_SERVER_SNAPSHOT,
        payload: {
          gameState: incomingState,
          winner: winnerFromServer,
          game: gameFromServer,
          moveLog: hydratedMoveLog,
        },
      });
    }

    if (lastMessage.action === "move_response") {
      dispatch({ type: CHESS_ACTIONS.CLEAR_MOVE_FEEDBACK });
    }
  }, [lastMessage, logMoveFromServerState, mode]);

  const handleMoveRequest = useCallback((payload) => {
    if (winner) return;

    // Prevent rapid double-clicks in training mode
    if (mode === "training" && processingMoveRef.current) {
      return;
    }

    if (mode === "online") {
      if (userId == null) return;
      sendMove({
        action: "play_move",
        player_id: userId,
        ...payload,
      });
      return;
    }

    // Training mode - mark as processing
    processingMoveRef.current = true;

    // Re-enable move processing after a short delay (allow state to update)
    const timeout = setTimeout(() => {
      processingMoveRef.current = false;
    }, 50);

    // Training mode
    const moveObj =
      payload?.move != null ? uciToMoveObject(payload.move) : payload ?? null;

    if (!moveObj) {
      clearTimeout(timeout);
      processingMoveRef.current = false;
      dispatch({
        type: CHESS_ACTIONS.SET_MOVE_FEEDBACK,
        payload: "Invalid move",
      });
      return;
    }

    const nextGame = new Chess(game.fen());
    let madeMove = null;

    try {
      madeMove = nextGame.move(moveObj);
    } catch (err) {
      madeMove = null;
    }

    if (!madeMove) {
      clearTimeout(timeout);
      processingMoveRef.current = false;
      dispatch({
        type: CHESS_ACTIONS.SET_MOVE_FEEDBACK,
        payload: "Invalid move",
      });
      return;
    }

    appendMoveLogEntry({
      color: madeMove.color,
      piece: madeMove.piece,
      from: madeMove.from,
      to: madeMove.to,
      san: madeMove.san,
    });

    dispatch({
      type: CHESS_ACTIONS.APPLY_LOCAL_POSITION,
      payload: {
        game: nextGame,
        winner: getWinnerFromLocalGame(nextGame),
        moveFeedback: null,
      },
    });

    if (userId != null) {
      dispatch({
        type: CHESS_ACTIONS.APPLY_SERVER_SNAPSHOT,
        payload: {
          gameState: buildPseudoTrainingState(nextGame, userId),
        },
      });
    }
  }, [appendMoveLogEntry, game, mode, sendMove, userId, winner]);

  const handleResign = useCallback(() => {
    if (winner || userId == null) return;

    if (mode === "online") {
      sendMove({ action: "resign", player_id: userId });
      return;
    }

    dispatch({
      type: CHESS_ACTIONS.APPLY_LOCAL_POSITION,
      payload: {
        winner: game.turn() === "w" ? "Black-Resign" : "White-Resign",
      },
    });
  }, [game, mode, sendMove, userId, winner]);

  const handleOfferDraw = useCallback(() => {
    if (winner || userId == null) return;

    if (mode === "online") {
      sendMove({ action: "draw_offer", player_id: userId });
      return;
    }

    dispatch({
      type: CHESS_ACTIONS.APPLY_LOCAL_POSITION,
      payload: { winner: "Nulle" },
    });
  }, [mode, sendMove, userId, winner]);

  const handleRespondDraw = useCallback(
    (accept) => {
      if (winner || userId == null) return;

      if (mode === "online") {
        sendMove({ action: "draw_response", player_id: userId, accept });
        return;
      }

      if (accept) {
        dispatch({
          type: CHESS_ACTIONS.APPLY_LOCAL_POSITION,
          payload: { winner: "Nulle" },
        });
      }
    },
    [mode, sendMove, userId, winner],
  );

  const startNewMatch = useCallback(() => {
    dispatch({ type: CHESS_ACTIONS.RESET_MATCH });
    lastLoggedFenRef.current = new Chess().fen();
    lastLoggedUciRef.current = null;
    lastMoveTs.current = Date.now();
  }, []);

  const viewFen = useMemo(() => getViewFen(moveLog, viewPlies), [moveLog, viewPlies]);
  const displayedGame = useMemo(
    () => getDisplayedGame(game, viewFen),
    [game, viewFen],
  );

  const drawOffer = useMemo(
    () => getDrawOfferFlags(gameState, normalizedUserId),
    [gameState, normalizedUserId],
  );

  const toggleDebug = useCallback(() => {
    dispatch({ type: CHESS_ACTIONS.TOGGLE_DEBUG });
  }, []);

  return {
    state,
    mode,
    userId,
    playerColor,
    normalizedUserId,
    displayedGame,
    setViewPlies,
    toggleDebug,
    handleMoveRequest,
    handleResign,
    handleOfferDraw,
    handleRespondDraw,
    startNewMatch,
    drawOfferIncoming: drawOffer.drawOfferIncoming,
    drawOfferOutgoing: drawOffer.drawOfferOutgoing,
    ...replay,
  };
}
