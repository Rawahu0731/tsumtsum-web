import { useRef, useState } from 'react';
import type { SessionDraft } from '../types';
import { normalizeItems } from '../utils/items';
import Stopwatch from '../components/Stopwatch';
import ItemsToggleGrid from '../components/ItemsToggleGrid';
import { useStopwatch } from '../hooks/useStopwatch';
import type { SavePlayResult } from '../hooks/useCpmStore';

const formatNumber = new Intl.NumberFormat('en-US');

type MeasurePageProps = {
  draft: SessionDraft;
  onDraftChange: (draft: SessionDraft) => void;
  conditionLabel: string;
  playCount: number;
  onSavePlay: (time: string, coins: number) => SavePlayResult;
  stats: { avg: number; median: number; min: number; max: number; stdDev: number };
  latestCpm: number | null;
};

export default function MeasurePage({
  draft,
  onDraftChange,
  conditionLabel,
  playCount,
  onSavePlay,
  stats,
  latestCpm,
}: MeasurePageProps) {
  const [coinInput, setCoinInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const coinRef = useRef<HTMLInputElement | null>(null);
  const stopwatch = useStopwatch();

  const handleDraftChange = (partial: Partial<SessionDraft>) => {
    onDraftChange({
      ...draft,
      ...partial,
      items: normalizeItems(partial.items ?? draft.items),
    });
  };

  const handleSave = () => {
    const coins = Number(coinInput);
    const result = onSavePlay(stopwatch.timeLabel, coins);
    if (!result.play) {
      setError(result.error ?? 'Save failed');
      return;
    }
    setError(null);
    setCoinInput('');
    stopwatch.reset();
    coinRef.current?.focus();
  };

  const statBlocks = (
    <div className="measure-stats">
      <div>
        <span>Last CPM</span>
        <strong>{Number.isFinite(latestCpm) ? Math.round(latestCpm ?? 0) : '--'}</strong>
      </div>
      <div>
        <span>Avg CPM</span>
        <strong>{Number.isFinite(stats.avg) ? Math.round(stats.avg) : '--'}</strong>
      </div>
      <div>
        <span>Hourly</span>
        <strong>{Number.isFinite(stats.avg) ? Math.round(stats.avg * 60) : '--'}</strong>
      </div>
      <div>
        <span>Median</span>
        <strong>{Number.isFinite(stats.median) ? Math.round(stats.median) : '--'}</strong>
      </div>
      <div>
        <span>Max</span>
        <strong>{Number.isFinite(stats.max) ? Math.round(stats.max) : '--'}</strong>
      </div>
      <div>
        <span>Std Dev</span>
        <strong>{Number.isFinite(stats.stdDev) ? Math.round(stats.stdDev) : '--'}</strong>
      </div>
    </div>
  );

  return (
    <div className="measure-root">
      <div className="measure-hero">
        <div>
          <h1>CPM Measure</h1>
          <p>Fast, one-hand logging while playing.</p>
          <div className="measure-identity">
            <strong>{conditionLabel}</strong>
            <span>Plays {playCount}</span>
          </div>
        </div>
        <div className="only-desktop">{statBlocks}</div>
        <details className="measure-stats-collapse only-mobile">
          <summary>Stats</summary>
          {statBlocks}
        </details>
      </div>
      <section className="session-setup">
        <div className="section-title">Current Setup</div>
        <div className="form-grid">
          <label>
            Character Name
            <input
              type="text"
              value={draft.character}
              onChange={(event) => handleDraftChange({ character: event.target.value })}
              placeholder="Enter name"
            />
          </label>
          <label>
            Skill Level
            <input
              type="number"
              min={1}
              max={6}
              value={draft.skill}
              onChange={(event) => handleDraftChange({ skill: Number(event.target.value) })}
            />
          </label>
          <label>
            Terminal
            <input
              type="text"
              value={draft.terminal}
              onChange={(event) => handleDraftChange({ terminal: event.target.value })}
              placeholder="Optional"
            />
          </label>
        </div>
        <div className="items-block">
          <div className="items-title">Items</div>
          <ItemsToggleGrid value={draft.items} onChange={(items) => handleDraftChange({ items })} />
        </div>
      </section>

      <section className="measure-live">
        <Stopwatch
          timeLabel={stopwatch.timeLabel}
          isRunning={stopwatch.isRunning}
          onStart={stopwatch.start}
          onPause={stopwatch.pause}
          onReset={stopwatch.reset}
        />

        {error && <div className="inline-error">{error}</div>}

        <div className="save-bar">
          <label className="coin-input-block">
            Coins
            <input
              ref={coinRef}
              className="coin-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={coinInput}
              onChange={(event) => setCoinInput(event.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0"
            />
          </label>
          <button
            className="btn btn-primary btn-save"
            type="button"
            onClick={handleSave}
            disabled={!draft.character.trim()}
          >
            Save Play
          </button>
          <div className="save-meta">
            <div>Time: {stopwatch.timeLabel}</div>
            <div>Coins: {coinInput ? formatNumber.format(Number(coinInput)) : '--'}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
