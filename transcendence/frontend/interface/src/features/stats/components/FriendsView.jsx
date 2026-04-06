export function FriendsView({ friends = [] }) {
  return (
    <div>
      {friends.map((entry) => {
        const u = entry.user || entry;
        const key = entry.friendship_id ?? u.id;
        const name = u.username ?? entry.name ?? "—";
        const online = u.is_online ?? entry.online ?? false;
        const elo =
          u.elo_rapid ?? u.elo ?? entry.elo ?? "—";
        return (
          <div key={key} className="stats-list-item">
            <span
              className={`stats-online-dot ${online ? "" : "stats-online-dot--offline"}`}
            />
            <span style={{ flex: 1 }}>{name}</span>
            <span style={{ opacity: 0.4, fontSize: "0.7rem" }}>
              {elo} ELO
            </span>
          </div>
        );
      })}
    </div>
  );
}
