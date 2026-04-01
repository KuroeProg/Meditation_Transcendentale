import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export function PieceUsageChartSection({ pieceData }) {
  return (
    <div className="stats-chart-section">
      <div className="stats-chart-header">
        <span className="stats-chart-title">Move Frequency Per Piece Type</span>
        <div className="stats-chart-filters">
          <button type="button" className="stats-filter-btn stats-filter-btn--active">
            % of total moves
          </button>
          <button type="button" className="stats-filter-btn" disabled>
            Raw count
          </button>
        </div>
      </div>
      <div className="stats-chart-body">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={pieceData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="piece" tick={{ fontSize: 9 }} interval={0} angle={-12} textAnchor="end" height={48} />
            <YAxis tick={{ fontSize: 10 }} />
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
            <Bar dataKey="white" fill="#f0d9b5" name="White" radius={[2, 2, 0, 0]} />
            <Bar dataKey="black" fill="#769656" name="Black" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
