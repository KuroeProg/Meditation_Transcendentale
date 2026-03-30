from game.game_consumer import GameConsumer
from game.matchmaking_consumer import MatchmakingConsumer

# Réexports pour compatibilité
__all__ = ['GameConsumer', 'MatchmakingConsumer']

# Alias pour compatibilité
ChessConsumer = GameConsumer
