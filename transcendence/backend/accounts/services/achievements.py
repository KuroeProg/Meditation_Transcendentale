from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AchievementDefinition:
    id: str
    title: str
    description: str


ACHIEVEMENTS_CATALOG = (
    AchievementDefinition(
        id='first_game',
        title='Premier pas',
        description='Jouer sa première partie.',
    ),
    AchievementDefinition(
        id='ten_games',
        title='Habitué du plateau',
        description='Jouer 10 parties.',
    ),
    AchievementDefinition(
        id='first_win',
        title='Première victoire',
        description='Remporter sa première partie.',
    ),
    AchievementDefinition(
        id='five_wins',
        title='Compétiteur',
        description='Atteindre 5 victoires.',
    ),
)

ACHIEVEMENTS_BY_ID = {item.id: item for item in ACHIEVEMENTS_CATALOG}


def _should_unlock(achievement_id: str, user) -> bool:
    if achievement_id == 'first_game':
        return int(user.games_played or 0) >= 1
    if achievement_id == 'ten_games':
        return int(user.games_played or 0) >= 10
    if achievement_id == 'first_win':
        return int(user.games_won or 0) >= 1
    if achievement_id == 'five_wins':
        return int(user.games_won or 0) >= 5
    return False


def evaluate_achievements(user):
    unlocked = list(user.achievements or [])
    unlocked_set = set(unlocked)
    newly_unlocked = []

    for achievement in ACHIEVEMENTS_CATALOG:
        if achievement.id in unlocked_set:
            continue
        if _should_unlock(achievement.id, user):
            unlocked.append(achievement.id)
            unlocked_set.add(achievement.id)
            newly_unlocked.append(achievement)

    if newly_unlocked:
        user.achievements = unlocked
        user.save(update_fields=['achievements'])

    return newly_unlocked


def get_achievement_payloads(achievement_ids):
    payloads = []
    for achievement_id in achievement_ids or []:
        definition = ACHIEVEMENTS_BY_ID.get(str(achievement_id))
        if definition is None:
            continue
        payloads.append({
            'id': definition.id,
            'title': definition.title,
            'description': definition.description,
        })
    return payloads
