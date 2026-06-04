import { useMemo, useState } from 'react';
import './index.css';
import './App.css';
import TabBar from './components/TabBar';
import MeasurePage from './pages/MeasurePage';
import RankingPage from './pages/RankingPage';
import AnalysisPage from './pages/AnalysisPage';
import { useCpmStore } from './hooks/useCpmStore';
import { summarize } from './utils/stats';
import { conditionKey, conditionLabel } from './utils/condition';

export default function CpmMain() {
  const [activeTab, setActiveTab] = useState<'measure' | 'ranking' | 'analysis'>('measure');
  const {
    store,
    updateDraft,
    savePlay,
    deletePlay,
    deleteCondition,
  } = useCpmStore();


  const conditionId = useMemo(() => conditionKey({
    character: store.draft.character,
    skill: store.draft.skill,
    terminal: store.draft.terminal,
    items: store.draft.items,
  }), [store.draft.character, store.draft.skill, store.draft.terminal, store.draft.items]);

  const conditionPlays = useMemo(() => (
    store.plays.filter((play) => conditionKey(play) === conditionId)
  ), [store.plays, conditionId]);

  const activeStats = useMemo(() => summarize(conditionPlays.map((p) => p.cpm)), [conditionPlays]);
  const latestPlay = conditionPlays.length ? conditionPlays[0] : null;
  const conditionLabelText = useMemo(() => conditionLabel({
    character: store.draft.character,
    skill: store.draft.skill,
    terminal: store.draft.terminal,
  }), [store.draft.character, store.draft.skill, store.draft.terminal]);

  return (
    <div className="cpm-root">
      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'measure' && (
        <MeasurePage
          draft={store.draft}
          onDraftChange={updateDraft}
          conditionLabel={conditionLabelText}
          playCount={conditionPlays.length}
          onSavePlay={(time, coins) => savePlay({ draft: store.draft, time, coins })}
          stats={activeStats}
          latestCpm={latestPlay?.cpm ?? null}
        />
      )}

      {activeTab === 'ranking' && <RankingPage plays={store.plays} />}
      {activeTab === 'analysis' && (
        <AnalysisPage
          plays={store.plays}
          onDeletePlay={deletePlay}
          onDeleteCondition={deleteCondition}
        />
      )}
    </div>
  );
}

export { CpmMain };
