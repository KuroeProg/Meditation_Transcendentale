import { useState, useMemo, useEffect, useRef } from "react";
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
import { ResignConfirmModal } from './ResignConfirmModal.jsx'
import { DrawOfferModal } from './DrawOfferModal.jsx'
import { StatsTabsNav } from './StatsTabsNav.jsx'
import { InGameChat } from './InGameChat.jsx'
import { GameMusicPanel } from '../../audio/components/GameAudio.jsx'
import { useAuth } from '../../auth/index.js'
import { coalitionToSlug } from '../../theme/services/coalitionTheme.js'
import mockPersonalStats from '../../stats/assets/mockPersonalStats.json'
import '../styles/GameStatsPanel.css'

const mockStats = mockPersonalStats.gamePanel

export default function GameStatsPanel({
  moveLog = [],
  winner,
  onPlayAgain,
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
  gameState = null, // Added gameState prop
  /** libellés barres joueurs — affichés sous « Coups » (même style Annales) */
  whiteLabel = "Joueur blancs",
  blackLabel = "Joueur noirs",
}) {
  const { user } = useAuth()
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
      eloRating: myEloNew ?? initialElo ?? 1500,
      eloChange: myEloChange ?? 0
    };
  }, [user, myEloNew, myEloChange, gameState, isWhite, ratingField]);

  const coalitionSlug = coalitionToSlug(user?.coalition)
  const [activeTab, setActiveTab] = useState("moves");
  const [perfFilter, setPerfFilter] = useState("time");
  const [resignOpen, setResignOpen] = useState(false);
  const [drawInfoOpen, setDrawInfoOpen] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
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

  useEffect(() => {
    if (gameEnded && !prevGameEndedRef.current) {
      setActiveTab("moves");
    }
    prevGameEndedRef.current = gameEnded;
  }, [gameEnded]);

  const perfData = useMemo(() => buildPerfChartData(moveLog), [moveLog]);
  const materialData = useMemo(
    () => buildMaterialChartData(moveLog),
    [moveLog],
  );
  const pieceData = useMemo(() => buildMovePieceUsageData(moveLog), [moveLog]);
  const result = getResultInfo(winner);

  return (
    <div className="game-stats-panel">
      <StatsTabsNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onPlayAgain={onPlayAgain}
        gameEnded={gameEnded}
      />

      {activeTab === "moves" && (
        <>
          <DrawOfferBanners
            drawOfferIncoming={drawOfferIncoming}
            drawOfferOutgoing={drawOfferOutgoing}
            onRespondDraw={onRespondDraw}
          />

          <MoveListView
            moveLog={moveLog}
            viewPlies={viewPlies}
            onViewPlies={onViewPlies ?? (() => {})}
            winner={winner}
            coalitionSlug={coalitionSlug}
            whiteLabel={whiteLabel}
            blackLabel={blackLabel}
          />

          {gameEnded && <ResultBanner result={result} onPlayAgain={onPlayAgain} />}

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
          recentGames={mockStats.recentGames}
          coalitionSlug={coalitionSlug}
          headerAudio={<GameMusicPanel />}
        />
      )}

      {activeTab === "chat" && (
        <InGameChat
          opponentUsername={opponentUsername}
          gameId={gameId}
          coalitionSlug={coalitionSlug}
        />
      )}

      {activeTab === "friends" && (
        <FriendsView
          friends={friendsList}
          friendsRoster={mockStats.friendsRoster}
          myCoalition={user?.coalition}
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
