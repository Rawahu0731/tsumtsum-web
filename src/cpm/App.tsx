import { useMemo, useState } from 'react';
import './index.css';
import './App.css';
import TabBar from './components/TabBar';
import MeasurePage from './pages/MeasurePage';
import RankingPage from './pages/RankingPage';
import AnalysisPage from './pages/AnalysisPage';
import { useCpmStore } from './hooks/useCpmStore';
import { itemsLabel } from './utils/items';
import { summarize } from './utils/stats';

export default function CpmMain() {
  const [activeTab, setActiveTab] = useState<'measure' | 'ranking' | 'analysis'>('measure');
  const {
    store,
    activeSession,
    sessionPlays,
    updateDraft,
    startSession,
    endSession,
    savePlay,
    deletePlay,
    deleteSession,
  } = useCpmStore();

  const activeStats = useMemo(() => summarize(sessionPlays.map((p) => p.cpm)), [sessionPlays]);
  const latestPlay = sessionPlays.length ? sessionPlays[sessionPlays.length - 1] : null;
  const remainingCount = activeSession && activeSession.targetPlayCount > 0
    ? Math.max(activeSession.targetPlayCount - sessionPlays.length, 0)
    : null;

  return (
    <div className="cpm-root">
      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'measure' && (
        <MeasurePage
          draft={store.draft}
          onDraftChange={updateDraft}
          onStartSession={startSession}
          onEndSession={endSession}
          activeSessionId={activeSession?.id ?? null}
          activeSessionLabel={activeSession ? `${activeSession.character} · SL${activeSession.skill}` : null}
          activeItemsLabel={activeSession ? itemsLabel(activeSession.items) : []}
          playCount={sessionPlays.length}
          remainingCount={remainingCount}
          onSavePlay={(time, coins) => savePlay({ time, coins })}
          stats={activeStats}
          latestCpm={latestPlay?.cpm ?? null}
        />
      )}

      {activeTab === 'ranking' && <RankingPage plays={store.plays} />}
      {activeTab === 'analysis' && (
        <AnalysisPage
          sessions={store.sessions}
          plays={store.plays}
          onDeletePlay={deletePlay}
          onDeleteSession={deleteSession}
        />
      )}
    </div>
  );
}

export { CpmMain };
