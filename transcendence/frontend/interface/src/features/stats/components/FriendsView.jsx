export function FriendsView({ friends = [] }) {
  return (
    <div>
      {friends.map((friend) => (
        <div key={friend.id} className="stats-list-item">
          <span className={`stats-online-dot ${friend.online ? '' : 'stats-online-dot--offline'}`} />
          <span style={{ flex: 1 }}>{friend.name}</span>
          <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>{friend.elo} ELO</span>
        </div>
      ))}
    </div>
  )
}
