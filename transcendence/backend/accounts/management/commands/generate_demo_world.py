import json
import os
import random
from datetime import timedelta
from pathlib import Path

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import LocalUser, Friendship
from chat.models import Conversation, Message
from game.models import Game, Move
from game.services.elasticsearch_service import index_game_instance
import re
import chess


class Command(BaseCommand):
    help = 'Generate a coherent demo world with named users, relationships, and game history'

    def add_arguments(self, parser):
        parser.add_argument(
            '--config',
            type=str,
            default=None,
            help='Path to config file (relative to backend dir, defaults to demo_world_config.json)',
        )
        parser.add_argument(
            '--purge',
            action='store_true',
            help='Purge all demo_world users before generating',
        )

    def handle(self, *args, **options):
        # Determine config path
        config_file = options['config'] or 'demo_world_config.json'
        
        # First try relative to backend root
        config_path = Path(config_file)
        if not config_path.is_absolute():
            # Try relative to the backend directory (parent of accounts)
            backend_root = Path(__file__).resolve().parent.parent.parent.parent
            config_path = backend_root / config_file
            
            # If not found, try relative to current working directory
            if not config_path.exists():
                config_path = Path(config_file).resolve()

        if not config_path.exists():
            self.stdout.write(self.style.ERROR(f'Config file not found: {config_path}'))
            return

        # Load config
        with open(config_path, 'r') as f:
            config = json.load(f)

        # Purge if requested
        if options['purge']:
            self.stdout.write('Purging demo world users...')
            usernames = {u['username'] for u in config['users']}
            LocalUser.objects.filter(username__in=usernames).delete()
            self.stdout.write(self.style.SUCCESS('Demo world users purged.'))

        # Create users
        self.stdout.write('Creating users...')
        users = {}
        for user_data in config['users']:
            username = user_data['username']
            # Normalize coalition to one of the allowed values
            allowed_coalitions = {'air', 'feu', 'terre', 'eau'}
            raw_coal = (user_data.get('coalition') or '').strip()
            coal_lower = raw_coal.lower()
            mapping = {
                'the senate': 'feu',
                'house of stone': 'terre',
                'senate': 'feu',
            }
            if coal_lower in allowed_coalitions:
                coalition_final = coal_lower
            else:
                coalition_final = mapping.get(coal_lower, random.choice(list(allowed_coalitions)))

            user, created = LocalUser.objects.get_or_create(
                username=username,
                defaults={
                    'first_name': user_data.get('first_name', ''),
                    'last_name': user_data.get('last_name', ''),
                    'email': user_data.get('email', ''),
                    'bio': user_data.get('bio', ''),
                    'coalition': coalition_final,
                    'elo_bullet': user_data.get('elo_bullet', 1200),
                    'elo_blitz': user_data.get('elo_blitz', 1200),
                    'elo_rapid': user_data.get('elo_rapid', 1200),
                    'is_2fa_enabled': user_data.get('is_2fa_enabled', True),
                    'is_2fa_verified': user_data.get('is_2fa_verified', True),
                },
            )
            if created:
                user.set_password(user_data['password'])
                user.save()
                self.stdout.write(self.style.SUCCESS(f'✓ Created user: {username}'))
            else:
                self.stdout.write(f'  User already exists: {username}')
            users[username] = user

        # Create friendships
        self.stdout.write('\nCreating friendships...')
        for friendship_data in config['friendships']:
            from_user = users[friendship_data['from_username']]
            to_user = users[friendship_data['to_username']]
            status = friendship_data['status']

            friendship, created = Friendship.objects.get_or_create(
                from_user=from_user,
                to_user=to_user,
                defaults={'status': status},
            )
            if created:
                self.stdout.write(
                    f'✓ Friendship: {from_user.username} -> {to_user.username} ({status})'
                )
            else:
                self.stdout.write(
                    f'  Friendship already exists: {from_user.username} -> {to_user.username}'
                )

        # Create games with ELO progression
        self.stdout.write('\nCreating games...')

        # Sample SAN sequences for move generation (simple, plausible move lists)
        sample_sequences = {
            'rapid': [
                'e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7',
                'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Na5', 'Bc2', 'c5',
                'd4', 'Qc7', 'Nbd2', 'Bd7', 'Nf1', 'Rfe8', 'Ng3', 'Bf8', 'Bg5', 'Re6'
            ],
            'blitz': [
                'e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6',
                'Be3', 'e6', 'f3', 'Be7', 'Qd2', 'O-O', 'O-O-O', 'b5'
            ],
            'bullet': [
                'e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4'
            ],
        }

        def parse_pgn_moves(pgn_text):
            # Remove headers and newlines
            s = re.sub(r"\[.*?\]", "", pgn_text, flags=re.S)
            s = s.replace('\n', ' ')
            # Remove comments {...}
            s = re.sub(r"\{.*?\}", '', s)
            # Remove move numbers (e.g., '1.' '23.')
            s = re.sub(r"\d+\.(?:\.\.)?", ' ', s)
            # Remove result markers
            s = re.sub(r"1-0|0-1|1/2-1/2|\*", ' ', s)
            # Collapse spaces
            tokens = [t.strip() for t in s.split() if t.strip()]
            # Filter tokens that look like SAN (quick heuristic)
            moves = [t for t in tokens if not re.match(r"^\d+$", t)]
            return moves

        for game_data in config['games']:
            white_user = users[game_data['player_white']]
            black_user = users[game_data['player_black']]
            winner_user = users[game_data['winner']]
            days_ago = game_data['days_ago']
            started_at = timezone.now() - timedelta(days=days_ago)

            time_category = game_data['time_category']
            time_control = game_data.get('time_control_seconds', 600)
            increment = game_data.get('increment_seconds', 10)

            # Calculate ELO delta (simplified: winner gets ~16, loser gets ~-16)
            # In reality this depends on ratings, but we'll use a simple model
            if winner_user == white_user:
                elo_delta_white = 16
                elo_delta_black = -16
            else:
                elo_delta_white = -16
                elo_delta_black = 16

            # Get ELO before the game
            if time_category == 'bullet':
                elo_white_before = white_user.elo_bullet
                elo_black_before = black_user.elo_bullet
                elo_field = 'elo_bullet'
            elif time_category == 'blitz':
                elo_white_before = white_user.elo_blitz
                elo_black_before = black_user.elo_blitz
                elo_field = 'elo_blitz'
            else:  # rapid
                elo_white_before = white_user.elo_rapid
                elo_black_before = black_user.elo_rapid
                elo_field = 'elo_rapid'

            # Create game
            game = Game.objects.create(
                player_white=white_user,
                player_black=black_user,
                winner=winner_user,
                time_category=time_category,
                time_control_seconds=time_control,
                increment_seconds=increment,
                is_rated=game_data.get('is_rated', True),
                termination_reason=game_data.get('termination_reason', 'checkmate'),
                elo_delta_white=elo_delta_white,
                elo_delta_black=elo_delta_black,
                elo_white_before=elo_white_before,
                elo_black_before=elo_black_before,
                started_at=started_at,
            )

            # Generate move list for the game so it can be replayed
            if game_data.get('pgn'):
                seq = parse_pgn_moves(game_data['pgn'])
            else:
                seq = sample_sequences.get(time_category, sample_sequences['rapid'])

            # Shorten sequence for resignations
            if game_data.get('termination_reason') == 'resignation' and len(seq) > 6:
                seq = seq[: max(6, len(seq)//2) ]

            # Initialize board for SAN -> UCI conversion
            board = chess.Board()

            for i, san_move in enumerate(seq, start=1):
                player = white_user if (i % 2 == 1) else black_user
                
                # Convert SAN to UCI for the replay system
                try:
                    move_obj = board.parse_san(san_move)
                    uci_notation = move_obj.uci()
                    
                    # Better piece detection
                    piece_type = board.piece_at(move_obj.from_square).piece_type
                    piece_map = {
                        chess.PAWN: 'pawn',
                        chess.KNIGHT: 'knight',
                        chess.BISHOP: 'bishop',
                        chess.ROOK: 'rook',
                        chess.QUEEN: 'queen',
                        chess.KING: 'king'
                    }
                    piece = piece_map.get(piece_type, 'pawn')
                    
                    board.push(move_obj)
                except Exception:
                    # Fallback if SAN is somehow invalid
                    uci_notation = san_move
                    piece = 'pawn'

                # Time taken depends on category
                if time_category == 'blitz':
                    time_ms = random.randint(500, 5000)
                elif time_category == 'bullet':
                    time_ms = random.randint(100, 2000)
                else:
                    time_ms = random.randint(1000, 20000)

                material = random.randint(-3, 3)

                Move.objects.create(
                    game=game,
                    player=player,
                    move_number=i,
                    san_notation=uci_notation, # Replay system expects UCI
                    piece_played=piece,
                    time_taken_ms=time_ms,
                    material_advantage=material,
                )

            # Update user ELO ratings
            setattr(white_user, elo_field, getattr(white_user, elo_field) + elo_delta_white)
            setattr(black_user, elo_field, getattr(black_user, elo_field) + elo_delta_black)

            # Update game stats
            white_user.games_played += 1
            black_user.games_played += 1
            if winner_user == white_user:
                white_user.games_won += 1
                black_user.games_lost += 1
            elif winner_user == black_user:
                black_user.games_won += 1
                white_user.games_lost += 1
            else:
                white_user.games_draw += 1
                black_user.games_draw += 1

            white_user.save()
            black_user.save()

            index_game_instance(game)

            self.stdout.write(
                f'✓ Game: {white_user.username} vs {black_user.username} '
                f'({winner_user.username} won)'
            )

        # Create conversations and messages
        self.stdout.write('\nCreating conversations...')
        for conv_data in config['conversations']:
            conv_type = conv_data['type']
            participant_usernames = conv_data['participants']
            participant_users = [users[name] for name in participant_usernames]

            # Find or create conversation
            # Try to find an existing conversation with exactly these participants
            conversation = None
            for existing_conv in Conversation.objects.filter(type=conv_type):
                existing_participants = set(existing_conv.participants.all())
                if existing_participants == set(participant_users):
                    conversation = existing_conv
                    break
            
            if not conversation:
                conversation = Conversation.objects.create(type=conv_type)
                conversation.participants.set(participant_users)
                created = True
            else:
                created = False

            self.stdout.write(
                f'✓ Conversation: {", ".join(participant_usernames)} ({conv_type})'
            )

            # Create messages
            for msg_data in conv_data['messages']:
                sender = users[msg_data['sender']]
                content = msg_data['content']
                message_type = msg_data.get('message_type', 'text')
                days_ago = msg_data['days_ago']
                created_at = timezone.now() - timedelta(days=days_ago)

                message = Message.objects.create(
                    conversation=conversation,
                    sender=sender,
                    content=content,
                    message_type=message_type,
                    created_at=created_at,
                )

                # Mark as read by other participants (simple assumption)
                for user in participant_users:
                    if user != sender:
                        message.read_by.add(user)

                self.stdout.write(f'  ✓ Message from {sender.username}')

        self.stdout.write(
            self.style.SUCCESS(
                '\n✓ Demo world generated successfully! '
                'Login as alice@demo.local (alicedemo123) to get started.'
            )
        )
