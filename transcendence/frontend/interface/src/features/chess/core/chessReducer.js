import { Chess } from "chess.js";
import { randomTilePatternSeed } from "../assets/boardTiles.js";
import { CHESS_ACTIONS } from "./chessTypes.js";

export function createInitialChessState() {
  return {
    showDebug: false,
    game: new Chess(),
    gameState: null,
    winner: null,
    moveFeedback: null,
    tilePatternSeed: randomTilePatternSeed(),
    matchGeneration: 0,
    moveLog: [],
    viewPlies: null,
  };
}

export function chessReducer(state, action) {
  switch (action.type) {
    case CHESS_ACTIONS.TOGGLE_DEBUG:
      return {
        ...state,
        showDebug: !state.showDebug,
      };

    case CHESS_ACTIONS.SET_VIEW_PLIES:
      return {
        ...state,
        viewPlies: action.payload,
      };

    case CHESS_ACTIONS.APPEND_MOVE_LOG_ENTRY:
      return {
        ...state,
        moveLog: [...state.moveLog, action.payload],
        viewPlies: null,
      };

    case CHESS_ACTIONS.SET_MOVE_FEEDBACK:
      return {
        ...state,
        moveFeedback: action.payload,
      };

    case CHESS_ACTIONS.CLEAR_MOVE_FEEDBACK:
      return {
        ...state,
        moveFeedback: null,
      };

    case CHESS_ACTIONS.APPLY_SERVER_SNAPSHOT:
      return {
        ...state,
        gameState: action.payload.gameState,
        game: action.payload.game ?? state.game,
        moveLog:
          action.payload.moveLog !== undefined
            ? action.payload.moveLog
            : state.moveLog,
        winner:
          action.payload.winner !== undefined
            ? action.payload.winner
            : state.winner,
      };

    case CHESS_ACTIONS.APPLY_LOCAL_POSITION:
      return {
        ...state,
        game: action.payload.game ?? state.game,
        winner:
          action.payload.winner !== undefined
            ? action.payload.winner
            : state.winner,
        moveFeedback:
          action.payload.moveFeedback !== undefined
            ? action.payload.moveFeedback
            : state.moveFeedback,
      };

    case CHESS_ACTIONS.RESET_MATCH:
      return {
        ...state,
        game: new Chess(),
        gameState: null,
        winner: null,
        moveFeedback: null,
        tilePatternSeed: randomTilePatternSeed(),
        matchGeneration: state.matchGeneration + 1,
        moveLog: [],
        viewPlies: null,
      };

    default:
      return state;
  }
}
