import { useMemo, useState, useEffect } from 'react'
import { useChessSocket } from '../../chess/hooks/useChessSocket.js'
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
import { useAuth } from '../../auth/index.js'
import { useReduceMotionPref } from '../../theme/hooks/useReduceMotionPref.js'
import { coalitionToSlug } from '../../theme/services/coalitionTheme.js'
import { getPstatsTheme } from '../services/coalitionPstatsTheme.js'
import { formatPieceUsageData, buildPieceUsageRows, buildStatsPageStyle } from '../services/statsCalculator.js'
import data from '../assets/mockPersonalStats.json'
import '../styles/Statistics.css'

function WinrateDonut({ pct, drawPct = 0, size = 110, label, strokeWidth = 10, accent, drawColor, track, chartAnim }) {
	const losses = Math.max(0, 100 - pct - drawPct)
	const d = [
		{ name: 'Win', v: pct, color: accent },
		{ name: 'Draw', v: drawPct, color: drawColor },
		{ name: 'Loss', v: losses, color: track }
	]
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
						paddingAngle={0.8}
						stroke="rgba(0,0,0,0.06)"
						strokeWidth={1}
						isAnimationActive={chartAnim}
					>
						{d.map((entry, index) => (
							<Cell key={`cell-${index}`} fill={entry.color} />
						))}
					</Pie>
				</PieChart>
			</ResponsiveContainer>
			<span className="pstats-donut__pct">{pct}%</span>
			<span className="pstats-donut__label">{label}</span>
		</div>
	)
}

function MiniDonut({ pct, drawPct = 0, size = 56, strokeWidth = 6, accent, drawColor, track, chartAnim }) {
	const losses = Math.max(0, 100 - pct - drawPct)
	const d = [
		{ v: pct, color: accent },
		{ v: drawPct, color: drawColor },
		{ v: losses, color: track }
	]
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
						paddingAngle={0.8}
						stroke="rgba(0,0,0,0.06)"
						strokeWidth={1}
						isAnimationActive={chartAnim}
					>
						{d.map((entry, index) => (
							<Cell key={`cell-${index}`} fill={entry.color} />
						))}
					</Pie>
				</PieChart>
			</ResponsiveContainer>
			<span className="pstats-mini-donut__pct">{pct}%</span>
		</div>
	)
}

function WinrateGroup({ title, playerPct, playerDrawPct, allPct, allDrawPct, accent, drawColor, track, allMuted, chartAnim }) {
	return (
		<div className="pstats-wr-group">
			<p className="pstats-wr-group__title">{title}</p>
			<WinrateDonut pct={playerPct} drawPct={playerDrawPct} label="WINRATE" accent={accent} drawColor={drawColor} track={track} chartAnim={chartAnim} />
			<div className="pstats-wr-group__subs">
				<div className="pstats-wr-sub">
					<MiniDonut pct={playerPct} drawPct={playerDrawPct} accent={accent} drawColor={drawColor} track={track} chartAnim={chartAnim} />
					<span className="pstats-wr-sub__label">PLAYER</span>
				</div>
				<div className="pstats-wr-sub">
					<MiniDonut pct={allPct} drawPct={allDrawPct} accent={allMuted} drawColor={drawColor + '88'} track={track} chartAnim={chartAnim} />
					<span className="pstats-wr-sub__label">ALL PLAYERS</span>
				</div>
			</div>
		</div>
	)
}

function PerfTooltip({ active, payload, label, perfMode }) {
	if (!active || !payload?.length) return null
	const isAdv = perfMode === 'advantage'
	const isSpeed = perfMode === 'speed'
	return (
		<div className="pstats-tooltip pstats-tooltip--line">
			<div className="pstats-tooltip__title">{isSpeed ? `Coup n°${label}` : `Partie n°${label}`}</div>
			<p className="pstats-tooltip__subtitle">
				{isAdv ? 'Avantage matériel (Δ pions)' : isSpeed ? 'Vitesse de jeu (secondes/coup)' : 'ELO — progression'}
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
								: isSpeed
									? `${p.value.toFixed(2)}s`
									: Math.round(p.value).toLocaleString()
							: p.value}
						{isAdv ? ' pions' : isSpeed ? '' : ''}
					</strong>
				</div>
			))}
		</div>
	)
}

function PieceTooltip({ active, payload, label }) {
	if (!active || !payload?.length) return null
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
							? `${p.value.toFixed(1)}%`
							: p.value}
					</strong>
				</div>
			))}
		</div>
	)
}

function PerfChart({ theme, chartAnim, moveSpeedHistory = [], gameAdvantageHistory = [], eloHistory = [] }) {
	const [perfMode, setPerfMode] = useState('speed') // On met speed par défaut puisque c'est le focus réel
	const chartData = useMemo(() => {
		if (perfMode === 'speed') {
			return moveSpeedHistory.map(m => ({
				...m,
				player: m.speed,
				allPlayers: m.allPlayersSpeed
			}))
		}
		if (perfMode === 'advantage') {
			return gameAdvantageHistory.map(m => ({
				...m,
				player: m.advantage,
				allPlayers: 0 // Une ligne neutre pour la comparaison
			}))
		}
		if (perfMode === 'time') {
			return eloHistory.length > 0 ? eloHistory : data.perfOverTime
		}
		return data.perfOverTime
	}, [perfMode, moveSpeedHistory, gameAdvantageHistory, eloHistory])

	const isAdv = perfMode === 'advantage'
	const isSpeed = perfMode === 'speed'

	return (
		<div className="pstats-chart-block">
			<div className="pstats-chart-header">
				<span className="pstats-chart-title">
					<i className="ri-line-chart-line" /> Chess Performance Compare Time
				</span>
				<div className="pstats-chart-filters">
					<button
						type="button"
						className={`pstats-filter-btn${perfMode === 'speed' ? ' pstats-filter-btn--active' : ''}`}
						onClick={() => setPerfMode('speed')}
					>
						<i className="ri-flashlight-line" /> Move Speed
					</button>
					<button
						type="button"
						className={`pstats-filter-btn${perfMode === 'time' ? ' pstats-filter-btn--active' : ''}`}
						onClick={() => setPerfMode('time')}
					>
						<i className="ri-trophy-line" /> ELO Progression
					</button>
					<button
						type="button"
						className={`pstats-filter-btn${perfMode === 'advantage' ? ' pstats-filter-btn--active' : ''}`}
						onClick={() => setPerfMode('advantage')}
					>
						<i className="ri-scales-line" /> Advantage
					</button>
				</div>
			</div>
			<ResponsiveContainer width="100%" height={210}>
				<LineChart data={chartData} margin={{ top: 10, right: 18, left: 6, bottom: 6 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
					<XAxis
						dataKey={isAdv ? "game_index" : isSpeed ? "move_index" : "game"}
						tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.45)' }}
						tickLine={{ stroke: 'rgba(255,255,255,0.12)' }}
					/>
					<YAxis
						tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.45)' }}
						tickLine={{ stroke: 'rgba(255,255,255,0.12)' }}
						domain={isAdv ? ['auto', 'auto'] : isSpeed ? [0, 'auto'] : ['auto', 'auto']}
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
								: isSpeed 
								? {
									value: 'sec / coup',
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

function PieceUsageChart({ theme, chartAnim, pieceUsage = {}, allPieceUsage = {} }) {
	const [pieceMode, setPieceMode] = useState('raw')
	const barData = useMemo(() => formatPieceUsageData(pieceUsage, allPieceUsage, pieceMode), [pieceUsage, allPieceUsage, pieceMode])
	const isPct = pieceMode === 'percentage'

	return (
		<div className="pstats-chart-block">
			<div className="pstats-chart-header">
				<span className="pstats-chart-title">
					<i className="ri-bar-chart-grouped-line" /> Average Piece Preference Profile (%)
				</span>
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
									value: 'Weight (%)',
									angle: -90,
									position: 'insideLeft',
									fill: 'rgba(255,255,255,0.35)',
									fontSize: 9,
								}
						}
					/>
					<Tooltip
						cursor={{ fill: 'rgba(255,255,255,0.07)' }}
						content={(props) => <PieceTooltip {...props} />}
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

function MetricsTable({ realStats }) {
	// Nouvelles statistiques avancées extraites du backend
	const advanced = realStats?.performance_history?.advanced || {};

	// Mapping intelligent entre les clés d'affichage et les données réelles
	const statsMapping = {
		"Global Wins (Total)": realStats?.wins,
		"Global Losses (Total)": realStats?.losses,
		"Global Draws (Total)": realStats?.draws,
		"Wins as White": realStats?.wins_white,
		"Wins as Black": realStats?.wins_black,
		"Global Games (Total Wins+Losses+Draws)": realStats?.total_games,
		"Draw Percentage": realStats ? `${realStats.drawrate_global}%` : null,
		"Mean Time Spent (Seconds)": (realStats?.avg_duration !== undefined) ? `${realStats.avg_duration}s` : null,
		"Mean Time Spent Turn (Seconds)": (realStats?.avg_thinking_time !== undefined) ? `${realStats.avg_thinking_time}s` : null,
		"Last Game Time Spent (Seconds)": (advanced.last_game_duration !== undefined) ? `${advanced.last_game_duration}s` : null,
		"Opening Speed (Initial Moves)": (advanced.opening_speed !== undefined) ? `${advanced.opening_speed}s` : null,
		"Average Response Speed (Initial Moves)": (advanced.opening_speed !== undefined) ? `${advanced.opening_speed}s` : null,
		"Average Response Speed (Last 5 Moves)": (advanced.endgame_speed !== undefined) ? `${advanced.endgame_speed}s` : null,
		"Comeback Rate (After -3 Adv)": (advanced.comeback_rate !== undefined) ? `${advanced.comeback_rate}%` : null,
		"Tactical Volatility": (advanced.volatility !== undefined) ? advanced.volatility : null,
		"Favorite Killing Square": advanced.killing_zone !== "None" ? advanced.killing_zone : null,
		"Favorite Final Square (Coordinate)": advanced.killing_zone !== "None" ? advanced.killing_zone : null,
		"Avg Moves per Victory": advanced.win_len,
		"Avg Moves per Defeat": advanced.loss_len,
		"Peak ELO Achieved": advanced.peak_elo,
		"Highest ELO Defeated": (advanced.peak_elo !== undefined) ? advanced.peak_elo : null,
		"Performance at Tilt (Winrate)": (advanced.tilt_winrate !== undefined) ? `${advanced.tilt_winrate}%` : null,
		"Blunder Ratio": (advanced.blunder_ratio !== undefined) ? `${advanced.blunder_ratio}%` : null,
		"Aggressive vs. Defensive Score": advanced.aggression_defensive,
	};

	// Explications pour les bulles d'aide (Tooltip English)
	const metricHelp = {
		"Global Wins (Total)": "Total quantity of victories across all your recorded historical games.",
		"Global Losses (Total)": "Total accumulation of defeats tracked by the analytical engine.",
		"Global Draws (Total)": "Number of games where neither side secured a victory (stalemate or draw).",
		"Wins as White": "Your victory percentage when playing with the initiative (white pieces).",
		"Wins as Black": "Your victory percentage when playing from the second position (black pieces).",
		"Global Games (Total Wins+Losses+Draws)": "The grand total of every completed competitive match on your account.",
		"Draw Percentage": "The probability of a match ending in a draw based on your entire history.",
		"Mean Time Spent (Seconds)": "Average duration of your chess games measured in seconds.",
		"Opening Speed (Initial Moves)": "Average time spent per move during the first 10 turns (theoretical readiness).",
		"Comeback Rate (After -3 Adv)": "Percentage of games won after suffering a material disadvantage of 3 points or more.",
		"Tactical Volatility": "Measures the chaos level. Higher values mean significant fluctuations in material advantage.",
		"Favorite Killing Square": "The board coordinate where you statistically perform the most captures.",
		"Avg Moves per Victory": "The average depth of a winning game, showing how fast you typically close a match.",
		"Avg Moves per Defeat": "The average depth of a losing game, showing your typical survival time before defeat.",
		"Peak ELO Achieved": "Highest performance rating calculated from your historical performance peaks.",
		"Highest ELO Defeated": "Maximum performance level of an opponent you successfully defeated.",
		"Performance at Tilt (Winrate)": "Winrate in games started within 30 minutes of a loss (measures emotional discipline).",
		"Blunder Ratio": "Percentage of moves causing a drop of 2+ points in material advantage in a single turn.",
		"Aggressive vs. Defensive Score": "Ratio of captures and offensive pressure compared to safe/positional play."
	};

	const dynamicMetrics = data.metrics.map(m => {
		const realValue = statsMapping[m.key];
		const isMock = realValue === undefined || realValue === null;

		return {
			key: m.key,
			displayKey: m.key,
			value: isMock ? m.value : realValue.toLocaleString(),
			isMock,
			help: metricHelp[m.key] || "Analytics data for this metric."
		};
	});

	return (
		<div className="pstats-metrics">
			<div className="pstats-metrics__header">
				<span className="pstats-metrics__col-key">METRIC</span>
				<span className="pstats-metrics__col-val">VALUE</span>
			</div>
			<div className="pstats-metrics__body">
				{dynamicMetrics.map((m, i) => (
					<div key={i} className={`pstats-metrics__row${i % 2 === 0 ? ' pstats-metrics__row--even' : ''}`}>
						<div className="pstats-metrics__key-wrapper">
							<i className="ri-information-line pstats-metrics__help-trigger" />
							<span className="pstats-metrics__key">{m.key}</span>
							
							<div className="pstats-help-tooltip">
								<span className="pstats-help-tooltip__title">{m.displayKey}</span>
								<span className="pstats-help-tooltip__desc">{m.help}</span>
							</div>
						</div>
						<span className="pstats-metrics__val">{m.value}</span>
					</div>
				))}
			</div>
		</div>
	)
}

export default function Statistics() {
	const { user } = useAuth()
	const { isConnected, lastMessage, sendMove } = useChessSocket('matchmaking')
	const [esStats, setEsStats] = useState(null)

	// On s'assure de récupérer le bon format d'ID (selon votre backend)
	const userId = user?.id ?? user?.user_id ?? user?.pk ?? user?.sub ?? null

	const slug = coalitionToSlug(user?.coalition ?? user?.coalition_name)
	const theme = getPstatsTheme(slug)
	const wr = esStats ? {
		global: {
			player: esStats.winrate_global,
			playerDraw: esStats.drawrate_global,
			allPlayers: esStats.all_players_winrate_global,
			allDraw: esStats.all_players_drawrate_global
		},
		white: {
			player: esStats.winrate_white,
			playerDraw: esStats.drawrate_white,
			allPlayers: esStats.all_players_winrate_white,
			allDraw: esStats.all_players_drawrate_white
		},
		black: {
			player: esStats.winrate_black,
			playerDraw: esStats.drawrate_black,
			allPlayers: esStats.all_players_winrate_black,
			allDraw: esStats.all_players_drawrate_black
		},
	} : {
		global: { player: data.winrates.global.player, playerDraw: 0, allPlayers: data.winrates.global.allPlayers, allDraw: 0 },
		white: { player: data.winrates.white.player, playerDraw: 0, allPlayers: data.winrates.white.allPlayers, allDraw: 0 },
		black: { player: data.winrates.black.player, playerDraw: 0, allPlayers: data.winrates.black.allPlayers, allDraw: 0 },
	}
	const reduceMotion = useReduceMotionPref()
	const chartAnim = !reduceMotion

	useEffect(() => {
		if (isConnected && userId != null) {
			sendMove({
				action: 'get_stats',
				player_id: userId
			})
		}
	}, [isConnected, userId, sendMove])

	useEffect(() => {
		if (lastMessage?.action === 'player_stats') {
			setEsStats(lastMessage.stats)
		}
	}, [lastMessage])

	const pageStyle = useMemo(() => buildStatsPageStyle(theme), [theme])

	return (
		<div className="pstats-page" style={pageStyle} data-pstats-coalition={slug}>
			<div className="pstats-left">
				<div className="pstats-winrates">
					<WinrateGroup
						title="Global Winrate — player vs. all players"
						playerPct={wr.global.player}
						playerDrawPct={wr.global.playerDraw}
						allPct={wr.global.allPlayers}
						allDrawPct={wr.global.allDraw}
						accent={theme.accent}
						drawColor={theme.draw}
						track={theme.donutTrack}
						allMuted={theme.allPlayersLine}
						chartAnim={chartAnim}
					/>
					<WinrateGroup
						title="Global Winrate — with white player vs. global all players"
						playerPct={wr.white.player}
						playerDrawPct={wr.white.playerDraw}
						allPct={wr.white.allPlayers}
						allDrawPct={wr.white.allDraw}
						accent={theme.accent}
						drawColor={theme.draw}
						track={theme.donutTrack}
						allMuted={theme.allPlayersLine}
						chartAnim={chartAnim}
					/>
					<WinrateGroup
						title="Global Winrate — with black player vs. global all players"
						playerPct={wr.black.player}
						playerDrawPct={wr.black.playerDraw}
						allPct={wr.black.allPlayers}
						allDrawPct={wr.black.allDraw}
						accent={theme.accent}
						drawColor={theme.draw}
						track={theme.donutTrack}
						allMuted={theme.allPlayersLine}
						chartAnim={chartAnim}
					/>
				</div>
				<PerfChart 
					theme={theme} 
					chartAnim={chartAnim} 
					moveSpeedHistory={esStats?.performance_history?.move_speed_history} 
					gameAdvantageHistory={esStats?.performance_history?.game_advantage_history}
					eloHistory={esStats?.performance_history?.elo_history}
				/>
				<PieceUsageChart 
					theme={theme} 
					chartAnim={chartAnim} 
					pieceUsage={esStats?.piece_usage}
					allPieceUsage={esStats?.all_players_piece_usage}
				/>
			</div>
			<div className="pstats-right">
				<MetricsTable realStats={esStats} />
			</div>
		</div>
	)
}
