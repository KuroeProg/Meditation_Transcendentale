from django.db import models
from accounts.models import LocalUser

class Game(models.Model):
    """
    Model representing the complete history of a game.
    """

    player_white = models.ForeignKey(LocalUser, related_name='games_as_white', on_delete=models.SET_NULL, null=True)
    player_black = models.ForeignKey(LocalUser, related_name='games_as_black', on_delete=models.SET_NULL, null=True)
    
    winner = models.ForeignKey(LocalUser, related_name='chess_games_won', on_delete=models.SET_NULL, null=True, blank=True)
    
    started_at = models.DateTimeField()
    duration_seconds = models.PositiveIntegerField(null=True, blank=True, help_text="Total duration of the game in seconds")
    
    class Meta:
        db_table = 'games'
        ordering = ['-started_at'] # Most recent games first
    def __str__(self):
        return f"Game {self.id} : {self.player_white} vs {self.player_black}"

class Move(models.Model):
    """
    Model representing an individual move played in a game.
    """
    game = models.ForeignKey(Game, related_name='moves', on_delete=models.CASCADE)
    
    player = models.ForeignKey(LocalUser, related_name='moves_played', on_delete=models.SET_NULL, null=True)
    
    move_number = models.PositiveIntegerField(help_text="Global order of the move in the game (e.g., 1, 2, 3...)")
    
    san_notation = models.CharField(max_length=20, help_text="PGN notation of the move")
    
    piece_played = models.CharField(max_length=20, help_text="Explicit string of the piece played (e.g., 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king')")
    
    time_taken_ms = models.PositiveIntegerField(help_text="Time taken to think and play this move in milliseconds")
    
    material_advantage = models.IntegerField(default=0, help_text="Material advantage after the move (e.g., +1, -3)")
    
    class Meta:
        db_table = 'moves'
        ordering = ['game', 'move_number'] # Default ordering chronologically for each game
    def __str__(self):
        return f"Move {self.move_number} (Game {self.game.id}) by {self.player}"
