import { Chess } from "chess.js";

export function normalizeId(value) {
  if (value == null) return null;
  return String(value);
}

export function getUserId(user) {
  if (!user) return null;
  return user.id ?? user.user_id ?? user.pk ?? user.sub ?? null;
}

export function getPlayerColor(gameState, userId) {
  if (!gameState || userId == null) return null;
  if (String(gameState.white_player_id) === String(userId)) return "w";
  if (String(gameState.black_player_id) === String(userId)) return "b";
  return null;
}

export function getWinnerFromGameState(gameState) {
  const status = gameState?.status;
  if (!status) return null;

  if (status === "checkmate") {
    return gameState.winner_player_id === gameState?.white_player_id
      ? "White"
      : "Black";
  }

  if (status === "stalemate" || status === "draw") return "Nulle";

  if (status === "resigned") {
    return gameState.winner_player_id === gameState?.white_player_id
      ? "White-Resign"
      : "Black-Resign";
  }

  if (status === "timeout") {
    return gameState.winner_player_id === gameState?.white_player_id
      ? "White-Timeout"
      : "Black-Timeout";
  }

  return null;
}

export function getWinnerFromLocalGame(chessGame) {
  if (!chessGame) return null;

  if (chessGame.isCheckmate()) {
    // In checkmate, side to move has lost.
    return chessGame.turn() === "w" ? "Black" : "White";
  }

  if (
    chessGame.isDraw() ||
    chessGame.isStalemate() ||
    chessGame.isInsufficientMaterial() ||
    chessGame.isThreefoldRepetition()
  ) {
    return "Nulle";
  }

  return null;
}

export function getViewFen(moveLog, viewPlies) {
  if (viewPlies == null) return null;
  if (viewPlies === 0) return new Chess().fen();
  if (!moveLog.length) return null;

  const maxPlies = Math.min(viewPlies, moveLog.length);
  const chess = new Chess();
  for (let i = 0; i < maxPlies; i++) {
    const move = moveLog[i];
    if (!move?.san) return null;
    const result = chess.move(move.san);
    if (!result) return null;
  }

  return chess.fen();
}

export function getDisplayedGame(game, viewFen) {
  if (viewFen == null) return game;
  try {
    return new Chess(viewFen);
  } catch {
    return game;
  }
}

export function getDrawOfferFlags(gameState, normalizedUserId) {
  const drawOfferFrom = gameState?.draw_offer_from_player_id;
  const normalizedDrawOfferFrom =
    drawOfferFrom == null ? null : String(drawOfferFrom);

  return {
    drawOfferIncoming:
      normalizedUserId != null &&
      normalizedDrawOfferFrom != null &&
      normalizedDrawOfferFrom !== normalizedUserId,
    drawOfferOutgoing:
      normalizedUserId != null && normalizedDrawOfferFrom === normalizedUserId,
  };
}
