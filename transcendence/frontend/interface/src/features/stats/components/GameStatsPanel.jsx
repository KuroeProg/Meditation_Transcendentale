import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import {
  buildPerfChartData,
  buildMaterialChartData,
  buildMovePieceUsageData,
  buildGamePanelState,
  getResultInfo,
} from '../services/statsCalculator.js'
import { PerformanceChartSection } from './charts/PerformanceChartSection.jsx'
import { PieceUsageChartSection } from './charts/PieceUsageChartSection.jsx'
import { MoveListView } from './MoveListView.jsx'
import { HistoryView } from './HistoryView.jsx'
import { FriendsView } from './FriendsView.jsx'
import { ResultBanner } from './ResultBanner.jsx'
import { SummaryCards } from './SummaryCards.jsx'
import { ControlBar } from './ControlBar.jsx'
import { DrawOfferBanners } from './DrawOfferBanners.jsx'
import { RematchOfferBanner } from './RematchOfferBanner.jsx'
import { ResignConfirmModal } from './ResignConfirmModal.jsx'
import { DrawOfferModal } from './DrawOfferModal.jsx'
import { StatsTabsNav } from './StatsTabsNav.jsx'
import { InGameChat } from './InGameChat.jsx'
import { GameMusicPanel } from '../../audio/components/GameAudio.jsx'
import { useAuth } from '../../auth/index.js'
import { coalitionToSlug } from '../../theme/services/coalitionTheme.js'
import { fetchHistory } from '../../history/services/historyApi.js'
import { enrichGameForUi } from '../../history/services/historyGameUi.js'
import '../styles/GameStatsPanel.css'

/**
 * Panneau droit en partie : onglet « Parties » charge l’historique via GET /api/game/history
 * (même contrat que la page Annales — voir docs/BACKEND_IN_GAME_SOCIAL.md §9.3).
 */

/** Nombre de parties chargées dans l’onglet « Parties » (GET /api/game/history?limit=…) */
const INGAME_HISTORY_LIMIT = 40

export default function GameStatsPanel({
  moveLog = [],
  winner,
  onPlayAgain,
  onRematch,
  onRespondRematch,
  rematchOfferIncoming = false,
  rematchOfferOutgoing = false,
  mode,
  viewPlies = null,
  onViewPlies,
  onResign,
  playerColor,
  drawOfferIncoming = false,
  drawOfferOutgoing = false,
  onOfferDraw,
  onRespondDraw,
  onReplayFirst,
  onReplayPrev,
  onReplayNext,
  onReplayLast,
  opponentUsername,
  gameId,
  gameState = null,
  /** libellés barres joueurs — affichés sous « Coups » (même style Annales) */
  whiteLabel = "Joueur blancs",
  blackLabel = "Joueur noirs",
}) {
  const { user, refetch: refetchUser } = useAuth()
  const normalizeId = (id) => id ? String(id) : null;
  
  // Real Elo data from backend
  const eloDeltas = gameState?.elo_deltas;
  const isWhite = normalizeId(gameState?.white_player_id) === normalizeId(user?.id);
  const myEloChange = isWhite ? eloDeltas?.white_delta : eloDeltas?.black_delta;
  const myEloNew = isWhite ? eloDeltas?.white_rating_new : eloDeltas?.black_rating_new;

  const ratingField = useMemo(() => {
    const cat = gameState?.time_category || 'rapid';
    if (cat === 'bullet') return 'elo_bullet';
    if (cat === 'blitz') return 'elo_blitz';
    return 'elo_rapid';
  }, [gameState?.time_category]);

  const currentStats = useMemo(() => {
    const whiteProfile = gameState?.white_player_profile;
    const blackProfile = gameState?.black_player_profile;
    const initialElo = isWhite ? whiteProfile?.[ratingField] : blackProfile?.[ratingField];

    return {
      gamesPlayed: user?.games_played || 0,
      winrate: user?.games_played ? Math.round((user.games_won / user.games_played) * 100) : 0,
      eloRating: myEloNew ?? initialElo ?? 1200,
      eloChange: myEloChange ?? 0
    };
  }, [user, myEloNew, myEloChange, gameState, isWhite, ratingField]);

  const coalitionSlug = coalitionToSlug(user?.coalition)
  const [activeTab, setActiveTab] = useState("moves");
  const [historyGames, setHistoryGames] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyFetchKey, setHistoryFetchKey] = useState(0);
  const [perfFilter, setPerfFilter] = useState("time");
  const [resignOpen, setResignOpen] = useState(false);
  const [drawInfoOpen, setDrawInfoOpen] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [chatUnread, setChatUnread] = useState(0);
  const prevGameEndedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/friends?status=accepted", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setFriendsList(data.friends || []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!resignOpen && !drawInfoOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setResignOpen(false);
        setDrawInfoOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resignOpen, drawInfoOpen]);

  const {
    gameEnded,
    resignDisabled,
    drawDisabled,
    replayFirstDisabled,
    replayPrevDisabled,
    replayNextDisabled,
    replayLastDisabled,
    resigningColorLabel,
  } = buildGamePanelState({
    winner,
    moveLogLength: moveLog.length,
    viewPlies,
    drawOfferIncoming,
    drawOfferOutgoing,
    playerColor,
  });

  const refetchIngameHistory = useCallback(() => {
    setHistoryFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (gameEnded && !prevGameEndedRef.current) {
      setActiveTab("moves");
      // Rafraîchir les stats utilisateur (games_played, winrate, etc.) après la sauvegarde backend
      const timer = setTimeout(() => {
        refetchUser().catch(() => {})
        refetchIngameHistory()
      }, 2500)
      return () => clearTimeout(timer)
    }
    prevGameEndedRef.current = gameEnded;
  }, [gameEnded, refetchUser, refetchIngameHistory]);

  useEffect(() => {
    if (activeTab !== "history") return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    (async () => {
      try {
        const res = await fetchHistory({ limit: INGAME_HISTORY_LIMIT });
        if (cancelled) return;
        const raw = res?.games ?? [];
        setHistoryGames(raw.map(enrichGameForUi));
      } catch (e) {
        if (!cancelled) {
          setHistoryGames([]);
          setHistoryError(e?.message || "Impossible de charger l’historique");
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, historyFetchKey]);

  const perfData = useMemo(() => buildPerfChartData(moveLog), [moveLog]);
  const materialData = useMemo(
    () => buildMaterialChartData(moveLog),
    [moveLog],
  );
  const pieceData = useMemo(() => buildMovePieceUsageData(moveLog), [moveLog]);
  const result = getResultInfo(winner);

  const handleChatUnreadChange = useCallback((count) => {
    setChatUnread(count)
  }, [])

  const handleSetActiveTab = useCallback((tab) => {
    setActiveTab(tab)
    if (tab === 'chat') setChatUnread(0)
  }, [])

  return (
    <div className="game-stats-panel">
      <StatsTabsNav
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        onPlayAgain={onPlayAgain}
        gameEnded={gameEnded}
        chatUnread={chatUnread}
      />

      {activeTab === "moves" && (
        <>
          <DrawOfferBanners
            drawOfferIncoming={drawOfferIncoming}
            drawOfferOutgoing={drawOfferOutgoing}
            onRespondDraw={onRespondDraw}
          />

          {gameEnded && (
            <RematchOfferBanner
              rematchOfferIncoming={rematchOfferIncoming}
              rematchOfferOutgoing={rematchOfferOutgoing}
              onRespondRematch={onRespondRematch}
            />
          )}

          <MoveListView
            moveLog={moveLog}
            viewPlies={viewPlies}
            onViewPlies={onViewPlies ?? (() => {})}
            winner={winner}
            coalitionSlug={coalitionSlug}
            whiteLabel={whiteLabel}
            blackLabel={blackLabel}
          />

          {gameEnded && (
            <ResultBanner
              result={result}
              onPlayAgain={onPlayAgain}
              onRematch={onRematch}
              rematchOfferOutgoing={rematchOfferOutgoing}
              mode={mode}
            />
          )}

          {gameEnded && <SummaryCards stats={currentStats} />}

          {gameEnded && (
            <PerformanceChartSection
              perfFilter={perfFilter}
              setPerfFilter={setPerfFilter}
              perfData={perfData}
              materialData={materialData}
            />
          )}

          {gameEnded && <PieceUsageChartSection pieceData={pieceData} />}

          <ControlBar
            resignDisabled={resignDisabled}
            drawDisabled={drawDisabled}
            replayFirstDisabled={replayFirstDisabled}
            replayPrevDisabled={replayPrevDisabled}
            replayNextDisabled={replayNextDisabled}
            replayLastDisabled={replayLastDisabled}
            onOpenResign={() => setResignOpen(true)}
            onOpenDraw={() => setDrawInfoOpen(true)}
            onReplayFirst={onReplayFirst}
            onReplayPrev={onReplayPrev}
            onReplayNext={onReplayNext}
            onReplayLast={onReplayLast}
          />
        </>
      )}

      {activeTab === "history" && (
        <HistoryView
          recentGames={historyGames}
          coalitionSlug={coalitionSlug}
          headerAudio={<GameMusicPanel />}
          loading={historyLoading}
          error={historyError}
          onRetry={refetchIngameHistory}
        />
      )}

      {/* Toujours monté pour conserver le socket WS, masqué quand inactif */}
      <div style={{ display: activeTab === 'chat' ? 'contents' : 'none' }}>
        <InGameChat
          opponentUsername={opponentUsername}
          gameId={gameId}
          userId={user?.id}
          coalitionSlug={coalitionSlug}
          isVisible={activeTab === 'chat'}
          onUnreadChange={handleChatUnreadChange}
        />
      </div>

      {activeTab === "friends" && (
        <FriendsView
          friends={friendsList}
          coalitionSlug={coalitionSlug}
          headerAudio={<GameMusicPanel />}
        />
      )}

      <ResignConfirmModal
        open={resignOpen}
        resigningColorLabel={resigningColorLabel}
        onCancel={() => setResignOpen(false)}
        onConfirm={() => {
          setResignOpen(false)
          onResign?.()
        }}
      />

      <DrawOfferModal
        open={drawInfoOpen}
        onCancel={() => setDrawInfoOpen(false)}
        onConfirm={() => {
          setDrawInfoOpen(false)
          onOfferDraw?.()
        }}
      />
    </div>
  );
}
