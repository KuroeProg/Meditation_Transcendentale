import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export function PerformanceChartSection({ perfFilter, setPerfFilter, perfData, materialData }) {
  return (
    <div className="stats-chart-section">
      <div className="stats-chart-header">
        <span className="stats-chart-title">Chess Performance Analytics</span>
        <div className="stats-chart-filters">
          <button
            type="button"
            className={`stats-filter-btn ${perfFilter === 'time' ? 'stats-filter-btn--active' : ''}`}
            onClick={() => setPerfFilter('time')}
          >
            Time / turn
          </button>
          <button
            type="button"
            className={`stats-filter-btn ${perfFilter === 'material' ? 'stats-filter-btn--active' : ''}`}
            onClick={() => setPerfFilter('material')}
          >
            Material advantage
          </button>
        </div>
      </div>
      <div className="stats-chart-body">
        <ResponsiveContainer width="100%" height={180}>
          {perfFilter === 'time' ? (
            <LineChart data={perfData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="turn"
                tick={{ fontSize: 10 }}
                label={{
                  value: 'Tour',
                  position: 'insideBottom',
                  offset: -2,
                  fill: 'rgba(255,255,255,0.35)',
                  fontSize: 10,
                }}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                label={{
                  value: 's',
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'rgba(255,255,255,0.35)',
                  fontSize: 10,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a2332',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  fontSize: '0.7rem',
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
              />
              <Legend wrapperStyle={{ fontSize: '0.65rem' }} />
              <Line type="monotone" dataKey="white" stroke="#f0d9b5" strokeWidth={2} dot={{ r: 2 }} name="White" connectNulls />
              <Line type="monotone" dataKey="black" stroke="#769656" strokeWidth={2} dot={{ r: 2 }} name="Black" connectNulls />
            </LineChart>
          ) : (
            <LineChart data={materialData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="ply"
                tick={{ fontSize: 10 }}
                label={{
                  value: 'Coup (ply)',
                  position: 'insideBottom',
                  offset: -2,
                  fill: 'rgba(255,255,255,0.35)',
                  fontSize: 10,
                }}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                label={{
                  value: 'Δ matériel (blancs)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'rgba(255,255,255,0.35)',
                  fontSize: 10,
                }}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a2332',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  fontSize: '0.7rem',
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
              />
              <Legend wrapperStyle={{ fontSize: '0.65rem' }} />
              <Line
                type="monotone"
                dataKey="material"
                stroke="#7dd3fc"
                strokeWidth={2}
                dot={{ r: 2 }}
                name="Avantage (pions)"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
