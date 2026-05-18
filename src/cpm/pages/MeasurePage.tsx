import { useRef, useState } from 'react';
import type { SessionDraft } from '../types';
import { normalizeItems } from '../utils/items';
import Stopwatch from '../components/Stopwatch';
import ItemsToggleGrid from '../components/ItemsToggleGrid';
import SessionComplete from '../components/SessionComplete';
import { useStopwatch } from '../hooks/useStopwatch';
import type { SavePlayResult } from '../hooks/useCpmStore';

const formatNumber = new Intl.NumberFormat('en-US');

type MeasurePageProps = {
  draft: SessionDraft;
  onDraftChange: (draft: SessionDraft) => void;
  onStartSession: (draft: SessionDraft) => void;
  onEndSession: () => void;
  activeSessionId: string | null;
  activeSessionLabel: string | null;
  activeItemsLabel: string[];
  playCount: number;
  remainingCount: number | null;
  onSavePlay: (time: string, coins: number) => SavePlayResult;
  stats: { avg: number; median: number; min: number; max: number; stdDev: number };
  latestCpm: number | null;
};

export default function MeasurePage({
  draft,
  onDraftChange,
  onStartSession,
  onEndSession,
  activeSessionId,
  activeSessionLabel,
  activeItemsLabel,
  playCount,
  remainingCount,
  onSavePlay,
  stats,
  latestCpm,
}: MeasurePageProps) {
  const [coinInput, setCoinInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const coinRef = useRef<HTMLInputElement | null>(null);
  const stopwatch = useStopwatch();

  const isSessionActive = Boolean(activeSessionId);
  const handleDraftChange = (partial: Partial<SessionDraft>) => {
    onDraftChange({
      ...draft,
      ...partial,
      items: normalizeItems(partial.items ?? draft.items),
    });
  };

  const handleStart = () => {
    if (!draft.character.trim()) {
      setError('Character is required.');
      return;
    }
    setError(null);
    onStartSession(draft);
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

  const reachedTarget = remainingCount !== null && remainingCount <= 0 && playCount > 0;

  return (
    <div className="measure-root">
      <div className="measure-hero">
        <div>
          <h1>CPM Measure</h1>
          <p>Fast, one-hand logging while playing.</p>
        </div>
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
      </div>

      {!isSessionActive && (
        <section className="session-setup">
          <div className="section-title">Session Setup</div>
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
            <label>
              Target Play Count
              <input
                type="number"
                min={0}
                value={draft.targetPlayCount}
                onChange={(event) => handleDraftChange({ targetPlayCount: Number(event.target.value) })}
              />
            </label>
          </div>
          <div className="items-block">
            <div className="items-title">Items</div>
            <ItemsToggleGrid value={draft.items} onChange={(items) => handleDraftChange({ items })} />
          </div>
          {error && <div className="inline-error">{error}</div>}
          <button className="btn btn-primary btn-start" type="button" onClick={handleStart}>
            Start Session
          </button>
        </section>
      )}

      {isSessionActive && (
        <section className="measure-live">
          <div className="session-bar">
            <div>
              <div className="session-label">{activeSessionLabel}</div>
              <div className="session-items">{activeItemsLabel.join(' · ')}</div>
            </div>
            <div className="session-counts">
              <div>
                <span>Plays</span>
                <strong>{playCount}</strong>
              </div>
              <div>
                <span>Remaining</span>
                <strong>{remainingCount === null ? '--' : remainingCount}</strong>
              </div>
            </div>
          </div>

          <Stopwatch
            timeLabel={stopwatch.timeLabel}
            isRunning={stopwatch.isRunning}
            onStart={stopwatch.start}
            onPause={stopwatch.pause}
            onReset={stopwatch.reset}
          />

          <div className="coin-input-block">
            <label>Coins</label>
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
          </div>

          {error && <div className="inline-error">{error}</div>}

          <div className="save-bar">
            <button className="btn btn-primary btn-save" type="button" onClick={handleSave}>
              Save Play
            </button>
            <div className="save-meta">
              <div>Time: {stopwatch.timeLabel}</div>
              <div>Coins: {coinInput ? formatNumber.format(Number(coinInput)) : '--'}</div>
            </div>
          </div>
        </section>
      )}

      {reachedTarget && (
        <SessionComplete
          stats={stats}
          playCount={playCount}
          onFinish={() => {
            onEndSession();
            setCoinInput('');
            stopwatch.reset();
          }}
        />
      )}
    </div>
  );
}
