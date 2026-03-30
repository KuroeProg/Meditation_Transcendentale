import { useState, useMemo, useEffect } from "react";
import {
  buildPerfChartData,
  buildMaterialChartData,
  buildMovePieceUsageData,
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
import mockPersonalStats from '../../stats/assets/mockPersonalStats.json'

const mockStats = mockPersonalStats.gamePanel
import '../styles/GameStatsPanel.css'

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

  const gameEnded = Boolean(winner);
  const plyCount = moveLog.length;
  const browsingHistory = viewPlies !== null;
  const resignDisabled = gameEnded || browsingHistory;
  const drawDisabled =
    gameEnded || browsingHistory || drawOfferIncoming || drawOfferOutgoing;
  const replayFirstDisabled = plyCount === 0 || viewPlies === 0;
  const replayPrevDisabled =
    plyCount === 0 || (viewPlies !== null && viewPlies === 0);
  const replayNextDisabled = plyCount === 0 || viewPlies === null;
  const replayLastDisabled =
    plyCount === 0 || (viewPlies !== null && viewPlies >= plyCount);

  const perfData = useMemo(() => buildPerfChartData(moveLog), [moveLog]);
  const materialData = useMemo(
    () => buildMaterialChartData(moveLog),
    [moveLog],
  );
  const pieceData = useMemo(() => buildMovePieceUsageData(moveLog), [moveLog]);
  const result = getResultInfo(winner);
  const resigningColorLabel = playerColor === "b" ? "noirs" : "blancs";

  const tabs = [
    { id: "moves", icon: "ri-play-fill", label: "Jouer" },
    { id: "newgame", icon: "ri-restart-line", label: "Nouvelle partie" },
    { id: "history", icon: "ri-history-line", label: "Parties" },
    { id: "friends", icon: "ri-group-line", label: "Amis" },
  ];

  return (
    <div className="game-stats-panel">
      <div className="stats-nav">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`stats-nav-btn ${activeTab === t.id ? "stats-nav-btn--active" : ""}`}
            onClick={() => {
              if (t.id === "newgame" && typeof onPlayAgain === "function") {
                onPlayAgain();
                return;
              }
              setActiveTab(t.id);
            }}
          >
            <i className={t.icon} />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "moves" && (
        <MoveListView
          moveLog={moveLog}
          viewPlies={viewPlies}
          onViewPlies={onViewPlies ?? (() => {})}
          winner={winner}
        />
      )}

      {gameEnded && <ResultBanner result={result} onPlayAgain={onPlayAgain} />}

      {gameEnded && <SummaryCards stats={mockStats} />}

      {activeTab === "history" && <HistoryView recentGames={mockStats.recentGames} />}
      {activeTab === "friends" && <FriendsView friends={mockStats.friends} />}

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

      <DrawOfferBanners
        drawOfferIncoming={drawOfferIncoming}
        drawOfferOutgoing={drawOfferOutgoing}
        onRespondDraw={onRespondDraw}
      />

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
