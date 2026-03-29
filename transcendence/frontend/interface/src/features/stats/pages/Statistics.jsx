import { useMemo, useState } from 'react'
import {
	PieChart,
	Pie,
	Cell,
	LineChart,
	Line,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts'
import { useAuth } from '../../auth/hooks/useAuth.js'
import { useReduceMotionPref } from '../../../config/useReduceMotionPref.js'
import { coalitionToSlug } from '../../theme/services/coalitionTheme.js'
import { getPstatsTheme } from '../services/coalitionPstatsTheme.js'
import data from '../assets/mockPersonalStats.json'
import '../styles/Statistics.css'

function WinrateDonut({ pct, size = 110, label, strokeWidth = 10, accent, track, chartAnim }) {
	const d = [{ v: pct }, { v: 100 - pct }]
	return (
		<div className="pstats-donut">
			<ResponsiveContainer width={size} height={size}>
				<PieChart>
					<Pie
						data={d}
						dataKey="v"
						cx="50%"
						cy="50%"
						innerRadius={size / 2 - strokeWidth - 4}
						outerRadius={size / 2 - 4}
						startAngle={90}
						endAngle={-270}
						paddingAngle={0}
						stroke="none"
						isAnimationActive={chartAnim}
					>
						<Cell fill={accent} />
						<Cell fill={track} />
					</Pie>
				</PieChart>
			</ResponsiveContainer>
			<span className="pstats-donut__pct">{pct}%</span>
			<span className="pstats-donut__label">{label}</span>
		</div>
	)
}

function MiniDonut({ pct, size = 56, strokeWidth = 6, accent, track, chartAnim }) {
	const d = [{ v: pct }, { v: 100 - pct }]
	return (
		<div className="pstats-mini-donut">
			<ResponsiveContainer width={size} height={size}>
				<PieChart>
					<Pie
						data={d}
						dataKey="v"
						cx="50%"
						cy="50%"
						innerRadius={size / 2 - strokeWidth - 2}
						outerRadius={size / 2 - 2}
						startAngle={90}
						endAngle={-270}
						paddingAngle={0}
						stroke="none"
						isAnimationActive={chartAnim}
					>
						<Cell fill={accent} />
						<Cell fill={track} />
					</Pie>
				</PieChart>
			</ResponsiveContainer>
			<span className="pstats-mini-donut__pct">{pct}%</span>
		</div>
	)
}

function WinrateGroup({ title, playerPct, allPct, accent, track, allMuted, chartAnim }) {
	return (
		<div className="pstats-wr-group">
			<p className="pstats-wr-group__title">{title}</p>
			<WinrateDonut pct={playerPct} label="WINRATE" accent={accent} track={track} chartAnim={chartAnim} />
			<div className="pstats-wr-group__subs">
				<div className="pstats-wr-sub">
					<MiniDonut pct={playerPct} accent={accent} track={track} chartAnim={chartAnim} />
					<span className="pstats-wr-sub__label">PLAYER</span>
				</div>
				<div className="pstats-wr-sub">
					<MiniDonut pct={allPct} accent={allMuted} track={track} chartAnim={chartAnim} />
					<span className="pstats-wr-sub__label">ALL PLAYERS</span>
				</div>
			</div>
		</div>
	)
}

function PerfTooltip({ active, payload, label, perfMode }) {
	if (!active || !payload?.length) return null
	const isAdv = perfMode === 'advantage'
	return (
		<div className="pstats-tooltip pstats-tooltip--line">
			<div className="pstats-tooltip__title">Partie {label}</div>
			<p className="pstats-tooltip__subtitle">
				{isAdv ? 'Avantage matériel (Δ pions)' : 'ELO — progression'}
			</p>
			{payload.map((p) => (
				<div key={String(p.dataKey)} className="pstats-tooltip__row">
					<span className="pstats-tooltip__dot" style={{ background: p.color }} />
					<span className="pstats-tooltip__name">{p.name}</span>
					<strong className="pstats-tooltip__val">
						{typeof p.value === 'number'
							? isAdv
								? p.value >= 0
									? `+${p.value.toFixed(2)}`
									: p.value.toFixed(2)
								: Math.round(p.value).toLocaleString()
							: p.value}
						{isAdv ? ' pions' : ''}
					</strong>
				</div>
			))}
		</div>
	)
}

function PieceTooltip({ active, payload, label, pieceMode }) {
	if (!active || !payload?.length) return null
	const isPct = pieceMode === 'percentage'
	return (
		<div className="pstats-tooltip pstats-tooltip--bar">
			<div className="pstats-tooltip__title">{label}</div>
			{payload.map((p) => (
				<div key={String(p.dataKey)} className="pstats-tooltip__row">
					<span
						className="pstats-tooltip__dot"
						style={{ background: p.fill ?? p.color }}
					/>
					<span className="pstats-tooltip__name">{p.name}</span>
					<strong className="pstats-tooltip__val">
						{typeof p.value === 'number'
							? isPct
								? `${p.value.toFixed(1)} %`
								: `${Math.round(p.value).toLocaleString()} coups`
							: p.value}
					</strong>
				</div>
			))}
		</div>
	)
}

function PerfChart({ theme, chartAnim }) {
	const [perfMode, setPerfMode] = useState('time')
	const chartData = perfMode === 'time' ? data.perfOverTime : data.perfAdvantage
	const isAdv = perfMode === 'advantage'

	return (
		<div className="pstats-chart-block">
			<div className="pstats-chart-header">
				<span className="pstats-chart-title">
					<i className="ri-line-chart-line" /> Chess Performance Compare Time
				</span>
				<div className="pstats-chart-filters">
					<button
						type="button"
						className={`pstats-filter-btn${perfMode === 'time' ? ' pstats-filter-btn--active' : ''}`}
						onClick={() => setPerfMode('time')}
					>
						<i className="ri-time-line" /> Time (Active)
					</button>
					<button
						type="button"
						className={`pstats-filter-btn${perfMode === 'advantage' ? ' pstats-filter-btn--active' : ''}`}
						onClick={() => setPerfMode('advantage')}
					>
						<i className="ri-scales-line" /> Advantage +/−
					</button>
				</div>
			</div>
			<ResponsiveContainer width="100%" height={210}>
				<LineChart data={chartData} margin={{ top: 10, right: 18, left: 6, bottom: 6 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
					<XAxis
						dataKey="game"
						tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.45)' }}
						tickLine={{ stroke: 'rgba(255,255,255,0.12)' }}
					/>
					<YAxis
						tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.45)' }}
						tickLine={{ stroke: 'rgba(255,255,255,0.12)' }}
						domain={isAdv ? ['auto', 'auto'] : ['auto', 'auto']}
						width={44}
						label={
							isAdv
								? {
										value: 'Δ pions',
										angle: -90,
										position: 'insideLeft',
										fill: 'rgba(255,255,255,0.35)',
										fontSize: 9,
									}
								: {
										value: 'ELO',
										angle: -90,
										position: 'insideLeft',
										fill: 'rgba(255,255,255,0.35)',
										fontSize: 9,
									}
						}
					/>
					<Tooltip
						cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
						content={(props) => <PerfTooltip {...props} perfMode={perfMode} />}
					/>
					<Legend wrapperStyle={{ fontSize: '0.62rem', paddingTop: 4 }} />
					<Line
						type="monotone"
						dataKey="player"
						stroke={theme.accent}
						strokeWidth={2.5}
						dot={{ r: 3, strokeWidth: 0, fill: theme.accent }}
						activeDot={{ r: 5 }}
						name="Toi (moyenne)"
						isAnimationActive={chartAnim}
					/>
					<Line
						type="monotone"
						dataKey="allPlayers"
						stroke={theme.allPlayersLine}
						strokeWidth={2}
						strokeDasharray="6 4"
						dot={{ r: 2, fill: theme.allPlayersLine }}
						name="Moyenne tous les joueurs"
						isAnimationActive={chartAnim}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	)
}

function PieceUsageChart({ theme, chartAnim }) {
	const [pieceMode, setPieceMode] = useState('percentage')
	const barData = useMemo(
		() =>
			data.pieceUsage.map((p) => ({
				...p,
				barPlayer: pieceMode === 'percentage' ? p.player : p.playerRaw,
				barAll: pieceMode === 'percentage' ? p.allPlayers : p.allPlayersRaw,
			})),
		[pieceMode],
	)
	const isPct = pieceMode === 'percentage'

	return (
		<div className="pstats-chart-block">
			<div className="pstats-chart-header">
				<span className="pstats-chart-title">
					<i className="ri-bar-chart-grouped-line" /> Chess Piece Usage Distribution
				</span>
				<div className="pstats-chart-filters">
					<button
						type="button"
						className={`pstats-filter-btn${isPct ? ' pstats-filter-btn--active' : ''}`}
						onClick={() => setPieceMode('percentage')}
					>
						<i className="ri-percent-line" /> Percentage (Active)
					</button>
					<button
						type="button"
						className={`pstats-filter-btn${!isPct ? ' pstats-filter-btn--active' : ''}`}
						onClick={() => setPieceMode('raw')}
					>
						<i className="ri-hashtag" /> Raw Count
					</button>
				</div>
			</div>
			<ResponsiveContainer width="100%" height={220}>
				<BarChart data={barData} margin={{ top: 10, right: 18, left: 6, bottom: 2 }} barGap={4} barCategoryGap="18%">
					<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
					<XAxis
						dataKey="label"
						tick={{ fontSize: 7.5, fill: 'rgba(255,255,255,0.5)' }}
						tickLine={false}
						interval={0}
						angle={-10}
						textAnchor="end"
						height={54}
					/>
					<YAxis
						tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.45)' }}
						tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
						width={40}
						tickFormatter={(v) => (isPct ? `${v}` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)}
						label={
							isPct
								? {
										value: '%',
										angle: -90,
										position: 'insideLeft',
										fill: 'rgba(255,255,255,0.35)',
										fontSize: 9,
									}
								: {
										value: 'Coups',
										angle: -90,
										position: 'insideLeft',
										fill: 'rgba(255,255,255,0.35)',
										fontSize: 9,
									}
						}
					/>
					<Tooltip
						cursor={{ fill: 'rgba(255,255,255,0.07)' }}
						content={(props) => <PieceTooltip {...props} pieceMode={pieceMode} />}
					/>
					<Legend wrapperStyle={{ fontSize: '0.62rem', paddingTop: 6 }} />
					<Bar
						dataKey="barPlayer"
						fill={theme.accent}
						name="Toi"
						radius={[3, 3, 0, 0]}
						maxBarSize={28}
						isAnimationActive={chartAnim}
					/>
					<Bar
						dataKey="barAll"
						fill="rgba(255,255,255,0.22)"
						name="Moyenne tous les joueurs"
						radius={[3, 3, 0, 0]}
						maxBarSize={28}
						isAnimationActive={chartAnim}
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}

function MetricsTable() {
	return (
		<div className="pstats-metrics">
			<div className="pstats-metrics__header">
				<span className="pstats-metrics__col-key">METRIC</span>
				<span className="pstats-metrics__col-val">VALUE</span>
			</div>
			<div className="pstats-metrics__body">
				{data.metrics.map((m, i) => (
					<div key={i} className={`pstats-metrics__row${i % 2 === 0 ? ' pstats-metrics__row--even' : ''}`}>
						<span className="pstats-metrics__key">{m.key}</span>
						<span className="pstats-metrics__val">{m.value}</span>
					</div>
				))}
			</div>
		</div>
	)
}

export default function Statistics() {
	const { user } = useAuth()
	const slug = coalitionToSlug(user?.coalition ?? user?.coalition_name)
	const theme = getPstatsTheme(slug)
	const wr = data.winrates
	const reduceMotion = useReduceMotionPref()
	const chartAnim = !reduceMotion

	const pageStyle = useMemo(
		() => ({
			'--pstats-accent': theme.accent,
			'--pstats-accent-soft': theme.accentSoft,
			'--pstats-accent-border': theme.accentBorder,
			'--pstats-all-line': theme.allPlayersLine,
		}),
		[theme],
	)

	return (
		<div className="pstats-page" style={pageStyle} data-pstats-coalition={slug}>
			<div className="pstats-left">
				<div className="pstats-winrates">
					<WinrateGroup
						title="GLOBAL WINRATE — PLAYER vs. ALL PLAYERS"
						playerPct={wr.global.player}
						allPct={wr.global.allPlayers}
						accent={theme.accent}
						track={theme.donutTrack}
						allMuted={theme.allPlayersLine}
						chartAnim={chartAnim}
					/>
					<WinrateGroup
						title="GLOBAL WINRATE — WITH WHITE PLAYER vs. GLOBAL ALL PLAYERS"
						playerPct={wr.white.player}
						allPct={wr.white.allPlayers}
						accent={theme.accent}
						track={theme.donutTrack}
						allMuted={theme.allPlayersLine}
						chartAnim={chartAnim}
					/>
					<WinrateGroup
						title="GLOBAL WINRATE — WITH BLACK PLAYER vs. GLOBAL ALL PLAYERS"
						playerPct={wr.black.player}
						allPct={wr.black.allPlayers}
						accent={theme.accent}
						track={theme.donutTrack}
						allMuted={theme.allPlayersLine}
						chartAnim={chartAnim}
					/>
				</div>
				<PerfChart theme={theme} chartAnim={chartAnim} />
				<PieceUsageChart theme={theme} chartAnim={chartAnim} />
			</div>
			<div className="pstats-right">
				<MetricsTable />
			</div>
		</div>
	)
}
