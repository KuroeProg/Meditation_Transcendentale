import { useState, useMemo, useRef, useLayoutEffect, useEffect } from "react";
import {
  buildPerfChartData,
  buildMaterialChartData,
  buildMovePieceUsageData,
  getResultInfo,
  resultShortNotation,
} from '../services/statsCalculator.js'
import { PerformanceChartSection } from './charts/PerformanceChartSection.jsx'
import { PieceUsageChartSection } from './charts/PieceUsageChartSection.jsx'
import mockPersonalStats from '../../stats/assets/mockPersonalStats.json'

const mockStats = mockPersonalStats.gamePanel
import '../styles/GameStatsPanel.css'

function MoveListView({ moveLog, viewPlies, onViewPlies, winner }) {
  const listEndRef = useRef(null);
  const selectedHalfIdx =
    viewPlies === null
      ? moveLog.length > 0
        ? moveLog.length - 1
        : -1
      : viewPlies === 0
        ? -1
        : viewPlies - 1;

  useLayoutEffect(() => {
    if (viewPlies !== null) return;
    listEndRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [moveLog.length, viewPlies]);

  const rows = [];
  for (let i = 0; i < moveLog.length; i += 2) {
    rows.push({
      num: Math.floor(i / 2) + 1,
      white: moveLog[i],
      black: moveLog[i + 1],
      wIdx: i,
      bIdx: i + 1,
    });
  }
  const lastTurnNum = rows.length ? rows[rows.length - 1].num : 0;
  const resultStr = resultShortNotation(winner);

  if (!moveLog.length) {
    return (
      <div className="stats-moves-block stats-moves-block--pgn">
        <div className="stats-moves-pgn__tabbar">
          <span className="stats-moves-pgn__tab stats-moves-pgn__tab--active">
            Coups
          </span>
        </div>
        <p className="stats-empty-moves">Aucun coup pour l’instant.</p>
      </div>
    );
  }

  return (
    <div className="stats-moves-block stats-moves-block--pgn">
      <div className="stats-moves-pgn__tabbar">
        <span className="stats-moves-pgn__tab stats-moves-pgn__tab--active">
          Coups
        </span>
        {viewPlies != null ? (
          <button
            type="button"
            className="stats-moves-pgn__live"
            onClick={() => onViewPlies(null)}
          >
            Partie en cours
          </button>
        ) : null}
      </div>
      <div className="stats-move-list stats-move-list--pgn" role="list">
        {rows.map(({ num, white, black, wIdx, bIdx }) => (
          <div
            key={num}
            ref={
              num === lastTurnNum && viewPlies === null ? listEndRef : undefined
            }
            role="listitem"
            className={`stats-pgn-row stats-pgn-row--${num % 2 === 1 ? "odd" : "even"}`}
          >
            <span className="stats-pgn-row__num">{num}.</span>
            <div className="stats-pgn-row__moves">
              <button
                type="button"
                className={`stats-pgn-san-btn stats-pgn-san-btn--w${
                  selectedHalfIdx === wIdx ? " stats-pgn-san-btn--selected" : ""
                }`}
                aria-pressed={selectedHalfIdx === wIdx}
                aria-label={`Blancs ${white.san}, ${(white.timeSpentMs / 1000).toFixed(1)} secondes — afficher la position`}
                onClick={() => onViewPlies(wIdx + 1)}
              >
                {white.san}
              </button>
              {black ? (
                <button
                  type="button"
                  className={`stats-pgn-san-btn stats-pgn-san-btn--b${
                    selectedHalfIdx === bIdx
                      ? " stats-pgn-san-btn--selected"
                      : ""
                  }`}
                  aria-pressed={selectedHalfIdx === bIdx}
                  aria-label={`Noirs ${black.san}, ${(black.timeSpentMs / 1000).toFixed(1)} secondes — afficher la position`}
                  onClick={() => onViewPlies(bIdx + 1)}
                >
                  {black.san}
                </button>
              ) : (
                <span
                  className="stats-pgn-san-btn stats-pgn-san-btn--b stats-pgn-san-btn--empty"
                  aria-hidden
                />
              )}
            </div>
            <div className="stats-pgn-row__times">
              <span className="stats-pgn-row__time">
                {(white.timeSpentMs / 1000).toFixed(1)}s
              </span>
              {black ? (
                <span className="stats-pgn-row__time">
                  {(black.timeSpentMs / 1000).toFixed(1)}s
                </span>
              ) : (
                <span className="stats-pgn-row__time stats-pgn-row__time--placeholder" />
              )}
            </div>
          </div>
        ))}
      </div>
      {resultStr ? <div className="stats-pgn-result">{resultStr}</div> : null}
    </div>
  );
}

function HistoryView() {
  return (
    <div>
      {mockStats.recentGames.map((g) => (
        <div key={g.id} className="stats-list-item">
          <span
            className={`stats-history-result stats-history-result--${g.result}`}
          >
            {g.result}
          </span>
          <span style={{ flex: 1 }}>{g.opponent}</span>
          <span style={{ opacity: 0.4, fontSize: "0.7rem" }}>{g.date}</span>
        </div>
      ))}
    </div>
  );
}

function FriendsView() {
  return (
    <div>
      {mockStats.friends.map((f) => (
        <div key={f.id} className="stats-list-item">
          <span
            className={`stats-online-dot ${f.online ? "" : "stats-online-dot--offline"}`}
          />
          <span style={{ flex: 1 }}>{f.name}</span>
          <span style={{ opacity: 0.4, fontSize: "0.7rem" }}>{f.elo} ELO</span>
        </div>
      ))}
    </div>
  );
}

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

      {gameEnded && (
        <div className="stats-result-banner">
          <p className="stats-result-title">{result.title}</p>
          <p className="stats-result-sub">{result.subtitle}</p>
          {typeof onPlayAgain === "function" && (
            <button
              type="button"
              className="stats-play-again"
              onClick={onPlayAgain}
            >
              Nouvelle partie
            </button>
          )}
        </div>
      )}

      {gameEnded && (
        <div className="stats-cards">
          <div className="stats-card">
            <span className="stats-card__label">Games Played</span>
            <span className="stats-card__value">
              {mockStats.gamesPlayed.toLocaleString()}
              <i className="ri-line-chart-line stats-card__icon" />
            </span>
          </div>
          <div className="stats-card">
            <span className="stats-card__label">Winrate</span>
            <span className="stats-card__value">{mockStats.winrate}%</span>
          </div>
          <div className="stats-card">
            <span className="stats-card__label">ELO Rating</span>
            <span className="stats-card__value">
              {mockStats.eloRating}
              <span
                className={`stats-card__change ${mockStats.eloChange < 0 ? "stats-card__change--negative" : ""}`}
              >
                {mockStats.eloChange > 0 ? "+" : ""}
                {mockStats.eloChange}
              </span>
            </span>
          </div>
        </div>
      )}

      {activeTab === "history" && <HistoryView />}
      {activeTab === "friends" && <FriendsView />}

      {gameEnded && (
        <PerformanceChartSection
          perfFilter={perfFilter}
          setPerfFilter={setPerfFilter}
          perfData={perfData}
          materialData={materialData}
        />
      )}

      {gameEnded && <PieceUsageChartSection pieceData={pieceData} />}

      <div className="stats-control-bar">
        <button
          type="button"
          className={`stats-control-btn stats-control-btn--danger${resignDisabled ? "" : " stats-control-btn--enabled"}`}
          disabled={resignDisabled}
          title="Abandonner la partie"
          onClick={() => setResignOpen(true)}
        >
          <i className="ri-flag-line" aria-hidden />
        </button>
        <button
          type="button"
          className={`stats-control-btn${drawDisabled ? "" : " stats-control-btn--enabled"}`}
          disabled={drawDisabled}
          title="Proposer un match nul à l’adversaire"
          onClick={() => setDrawInfoOpen(true)}
        >
          <i className="ri-shake-hands-line" aria-hidden />
        </button>
        <span className="stats-control-spacer" />
        <button
          type="button"
          className={`stats-control-btn${replayFirstDisabled ? "" : " stats-control-btn--enabled"}`}
          disabled={replayFirstDisabled}
          title="Position de départ"
          onClick={() => onReplayFirst?.()}
        >
          <i className="ri-skip-back-mini-fill" />
        </button>
        <button
          type="button"
          className={`stats-control-btn${replayPrevDisabled ? "" : " stats-control-btn--enabled"}`}
          disabled={replayPrevDisabled}
          title="Coup précédent"
          onClick={() => onReplayPrev?.()}
        >
          <i className="ri-arrow-left-s-line" />
        </button>
        <button
          type="button"
          className={`stats-control-btn${replayNextDisabled ? "" : " stats-control-btn--enabled"}`}
          disabled={replayNextDisabled}
          title="Coup suivant"
          onClick={() => onReplayNext?.()}
        >
          <i className="ri-arrow-right-s-line" />
        </button>
        <button
          type="button"
          className={`stats-control-btn${replayLastDisabled ? "" : " stats-control-btn--enabled"}`}
          disabled={replayLastDisabled}
          title="Dernier coup / partie en cours"
          onClick={() => onReplayLast?.()}
        >
          <i className="ri-skip-forward-mini-fill" />
        </button>
      </div>

      {drawOfferIncoming ? (
        <div className="stats-result-banner">
          <p className="stats-result-title">Proposition de nulle</p>
          <p className="stats-result-sub">
            Votre adversaire propose match nul.
          </p>
          <div className="stats-modal__actions">
            <button
              type="button"
              className="stats-modal__btn stats-modal__btn--ghost"
              onClick={() => onRespondDraw?.(false)}
            >
              Refuser
            </button>
            <button
              type="button"
              className="stats-modal__btn stats-modal__btn--primary"
              onClick={() => onRespondDraw?.(true)}
            >
              Accepter
            </button>
          </div>
        </div>
      ) : null}

      {drawOfferOutgoing ? (
        <div className="stats-result-banner">
          <p className="stats-result-title">Nulle proposée</p>
          <p className="stats-result-sub">
            En attente de réponse de l’adversaire.
          </p>
        </div>
      ) : null}

      {resignOpen ? (
        <div
          className="stats-modal-backdrop"
          role="presentation"
          onClick={() => setResignOpen(false)}
        >
          <div
            className="stats-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stats-resign-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="stats-resign-title" className="stats-modal__title">
              Abandonner la partie ?
            </p>
            <p className="stats-modal__text">
              Les <strong>{resigningColorLabel}</strong> perdent immédiatement.
              Cette action ne peut pas être annulée.
            </p>
            <div className="stats-modal__actions">
              <button
                type="button"
                className="stats-modal__btn stats-modal__btn--ghost"
                onClick={() => setResignOpen(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="stats-modal__btn stats-modal__btn--danger"
                onClick={() => {
                  setResignOpen(false);
                  onResign?.();
                }}
              >
                Abandonner
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {drawInfoOpen ? (
        <div
          className="stats-modal-backdrop"
          role="presentation"
          onClick={() => setDrawInfoOpen(false)}
        >
          <div
            className="stats-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stats-draw-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="stats-draw-title" className="stats-modal__title">
              Proposition de match nul
            </p>
            <p className="stats-modal__text">
              Envoyer une proposition de nulle à votre adversaire ?
            </p>
            <div className="stats-modal__actions">
              <button
                type="button"
                className="stats-modal__btn stats-modal__btn--ghost"
                onClick={() => setDrawInfoOpen(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="stats-modal__btn stats-modal__btn--primary"
                onClick={() => {
                  setDrawInfoOpen(false);
                  onOfferDraw?.();
                }}
              >
                Proposer nul
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
