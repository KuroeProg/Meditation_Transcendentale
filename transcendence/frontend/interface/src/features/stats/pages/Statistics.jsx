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

function PerfChart({ theme, chartAnim, moveSpeedHistory = [], gameAdvantageHistory = [], eloHistory = [], isMock = false }) {
	const [perfMode, setPerfMode] = useState('speed') // On met speed par défaut puisque c'est le focus réel
	const chartData = useMemo(() => {
		if (perfMode === 'speed') {
			const history = moveSpeedHistory || [];
			return history.map(m => ({
				...m,
				player: m.speed,
				allPlayers: m.allPlayersSpeed
			}))
		}
		if (perfMode === 'advantage') {
			const history = gameAdvantageHistory || [];
			return history.map(m => ({
				...m,
				player: m.advantage,
				allPlayers: 0 // Une ligne neutre pour la comparaison
			}))
		}
		if (perfMode === 'time') {
			if (!isMock) {
				return eloHistory || [];
			}
			return data.perfOverTime
		}
		return []
	}, [perfMode, moveSpeedHistory, gameAdvantageHistory, eloHistory, isMock])

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

	const formatS = (val) => val !== undefined && val !== null ? `${val}s` : '0s';
	const formatPct = (val) => val !== undefined && val !== null ? `${val}%` : '0%';
	const formatNum = (val) => val !== undefined && val !== null ? val : '0';
	const formatSq = (val) => val !== undefined && val !== null && val !== "None" ? val : 'N/A';

	// Mapping intelligent entre les clés d'affichage et les données réelles
	const statsMapping = realStats ? {
		"Global Wins (Total)": formatNum(realStats?.wins),
		"Global Losses (Total)": formatNum(realStats?.losses),
		"Global Draws (Total)": formatNum(realStats?.draws),
		"Wins as White": formatNum(realStats?.wins_white),
		"Wins as Black": formatNum(realStats?.wins_black),
		"Global Games (Total Wins+Losses+Draws)": formatNum(realStats?.total_games),
		"Draw Percentage": formatPct(realStats?.drawrate_global),
		"Mean Time Spent (Seconds)": formatS(realStats?.avg_duration),
		"Mean Time Spent Turn (Seconds)": formatS(realStats?.avg_thinking_time),
		"Last Game Time Spent (Seconds)": formatS(advanced.last_game_duration),
		"Opening Speed (Initial Moves)": formatS(advanced.opening_speed),
		"Average Response Speed (Initial Moves)": formatS(advanced.opening_speed),
		"Average Response Speed (Last 5 Moves)": formatS(advanced.endgame_speed),
		"Comeback Rate (After -3 Adv)": formatPct(advanced.comeback_rate),
		"Tactical Volatility": formatNum(advanced.volatility),
		"Favorite Killing Square": formatSq(advanced.killing_zone),
		"Favorite Final Square (Coordinate)": formatSq(advanced.killing_zone),
		"Avg Moves per Victory": formatNum(advanced.win_len),
		"Avg Moves per Defeat": formatNum(advanced.loss_len),
		"Peak ELO Achieved": advanced.peak_elo !== undefined && advanced.peak_elo !== null ? advanced.peak_elo : '1200',
		"Highest ELO Defeated": advanced.highest_elo_defeated !== undefined && advanced.highest_elo_defeated !== null ? advanced.highest_elo_defeated : 'N/A',
		"Performance at Tilt (Winrate)": formatPct(advanced.tilt_winrate),
		"Blunder Ratio": formatPct(advanced.blunder_ratio),
		"Aggressive vs. Defensive Score": advanced.aggression_defensive !== undefined && advanced.aggression_defensive !== null ? advanced.aggression_defensive : '0',
	} : {};

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
		const isMock = !realStats;

		return {
			key: m.key,
			displayKey: m.key,
			value: isMock ? m.value : (typeof realValue === 'number' ? realValue.toLocaleString() : (realValue !== undefined ? realValue : 'N/A')),
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
	const [category, setCategory] = useState('rapid')
	const [limit, setLimit] = useState('all')
	const [isExporting, setIsExporting] = useState(false)

	const handleExportPDF = async () => {
		if (isExporting) return
		try {
			setIsExporting(true)
			const res = await fetch('/api/game/stats/export/')
			const data = await res.json()
			
			if (data.status === 'success') {
				const taskId = data.task_id
				const checkStatus = async () => {
					try {
						const sRes = await fetch(`/api/game/stats/export-status/${taskId}/`)
						const sData = await sRes.json()
						if (sData.status === 'SUCCESS') {
							setIsExporting(false)
							// Déclenche le téléchargement
							const link = document.createElement('a')
							link.href = sData.result.url
							link.download = sData.result.filename
							document.body.appendChild(link)
							link.click()
							document.body.removeChild(link)
						} else if (sData.status === 'FAILURE') {
							setIsExporting(false)
							alert("Erreur lors de la génération du PDF")
						} else {
							// On continue de poller
							setTimeout(checkStatus, 2000)
						}
					} catch (e) {
						setIsExporting(false)
						console.error("Status check failed", e)
					}
				}
				setTimeout(checkStatus, 2000)
			} else {
				setIsExporting(false)
				alert(data.error || "Erreur lors du lancement de l'export")
			}
		} catch (err) {
			setIsExporting(false)
			console.error("Export PDF failed:", err)
		}
	}

	// On s'assure de récupérer le bon format d'ID (selon votre backend)
	const userId = user?.id ?? user?.user_id ?? user?.pk ?? user?.sub ?? null

	const slug = coalitionToSlug(user?.coalition ?? user?.coalition_name)
	const theme = getPstatsTheme(slug)
	const wr = esStats ? {
		global: {
			player: esStats.winrate_global ?? 0,
			playerDraw: esStats.drawrate_global ?? 0,
			allPlayers: esStats.all_players_winrate_global ?? 0,
			allDraw: esStats.all_players_drawrate_global ?? 0
		},
		white: {
			player: esStats.winrate_white ?? 0,
			playerDraw: esStats.drawrate_white ?? 0,
			allPlayers: esStats.all_players_winrate_white ?? 0,
			allDraw: esStats.all_players_drawrate_white ?? 0
		},
		black: {
			player: esStats.winrate_black ?? 0,
			playerDraw: esStats.drawrate_black ?? 0,
			allPlayers: esStats.all_players_winrate_black ?? 0,
			allDraw: esStats.all_players_drawrate_black ?? 0
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
				player_id: userId,
				category: category,
				limit: limit
			})
		}
	}, [isConnected, userId, category, limit, sendMove])

	useEffect(() => {
		if (lastMessage?.action === 'player_stats') {
			setEsStats(lastMessage.stats)
		}
	}, [lastMessage])

	const pageStyle = useMemo(() => buildStatsPageStyle(theme), [theme])

	return (
		<div className="pstats-page chess-grid-pattern" style={pageStyle} data-pstats-coalition={slug}>
			<div className="pstats-left">
				<div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', width: '100%', justifyContent: 'center' }}>
					{['bullet', 'blitz', 'rapid'].map(cat => (
						<button
							key={cat}
							onClick={() => setCategory(cat)}
							style={{
								padding: '0.4rem 1.2rem',
								border: `1px solid ${category === cat ? theme.accent : 'rgba(255,255,255,0.1)'}`,
								borderRadius: '6px',
								background: category === cat ? `${theme.accent}22` : 'rgba(255,255,255,0.03)',
								color: category === cat ? theme.accent : 'rgba(255,255,255,0.5)',
								fontSize: '0.65rem',
								fontWeight: 'bold',
								textTransform: 'uppercase',
								letterSpacing: '0.05em',
								cursor: 'pointer',
								transition: 'all 0.2s'
							}}
						>
							{cat}
						</button>
					))}

					<div style={{ width: '2px', background: 'rgba(255,255,255,0.1)', margin: '0 8px', borderRadius: '2px' }} />

					{['5', '10', '20', 'all'].map(lim => (
						<button
							key={lim}
							onClick={() => setLimit(lim)}
							style={{
								padding: '0.4rem 0.8rem',
								border: `1px solid ${limit === lim ? theme.accent : 'rgba(255,255,255,0.1)'}`,
								borderRadius: '6px',
								background: limit === lim ? `${theme.accent}22` : 'rgba(255,255,255,0.03)',
								color: limit === lim ? theme.accent : 'rgba(255,255,255,0.5)',
								fontSize: '0.65rem',
								fontWeight: 'bold',
								textTransform: 'uppercase',
								letterSpacing: '0.05em',
								cursor: 'pointer',
								transition: 'all 0.2s'
							}}
						>
							{lim === 'all' ? 'All' : `Last ${lim}`}
						</button>
					))}

					<button
						onClick={handleExportPDF}
						style={{
							padding: '0.4rem 1.2rem',
							border: `1px solid ${theme.accent}`,
							borderRadius: '6px',
							background: isExporting ? 'rgba(255,255,255,0.1)' : `${theme.accent}44`,
							color: '#fff',
							fontSize: '0.65rem',
							fontWeight: 'bold',
							textTransform: 'uppercase',
							letterSpacing: '0.05em',
							cursor: isExporting ? 'not-allowed' : 'pointer',
							marginLeft: 'auto',
							display: 'flex',
							alignItems: 'center',
							gap: '6px',
							opacity: isExporting ? 0.7 : 1
						}}
						disabled={isExporting}
					>
						<i className={isExporting ? "ri-loader-4-line ri-spin" : "ri-file-pdf-line"} />
						{isExporting ? 'Génération...' : 'Export PDF'}
					</button>
				</div>
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
					isMock={!esStats}
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
