"""Construction du JSON stocké dans Message.content pour les invitations de partie."""


def build_game_invite_content_dict(payload):
    """
    payload : dict (champs time_control, competitive, time_seconds?, increment?).
    """
    d = {
        'time_control': payload.get('time_control', '10 min'),
        'competitive': bool(payload.get('competitive', False)),
    }
    ts = payload.get('time_seconds')
    if ts is not None:
        try:
            d['time_seconds'] = int(ts)
        except (TypeError, ValueError):
            pass
    try:
        d['increment'] = int(payload.get('increment', 0) or 0)
    except (TypeError, ValueError):
        d['increment'] = 0
    return d
