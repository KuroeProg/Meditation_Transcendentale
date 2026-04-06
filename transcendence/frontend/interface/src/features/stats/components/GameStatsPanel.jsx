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
}) {
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
          />

          {gameEnded && <ResultBanner result={result} onPlayAgain={onPlayAgain} />}

          {gameEnded && <SummaryCards stats={mockStats} />}

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
        <HistoryView recentGames={mockStats.recentGames} />
      )}

      {activeTab === "friends" && (
        <FriendsView friends={friendsList} />
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
