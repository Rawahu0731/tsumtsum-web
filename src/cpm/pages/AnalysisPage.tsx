import { useEffect, useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Items, Play } from '../types';
import { summarize } from '../utils/stats';
import { conditionKey, conditionLabel } from '../utils/condition';
import { itemsKey, itemsLabel } from '../utils/items';
import { parseTimeToSeconds } from '../utils/format';

const formatNumber = new Intl.NumberFormat('en-US');

type AnalysisPageProps = {
  plays: Play[];
  onDeletePlay: (playId: string) => void;
  onDeleteCondition: (condition: { character: string; skill: number; terminal: string; items: Items }) => void;
};

type ConditionGroup = {
  key: string;
  character: string;
  skill: number;
  terminal: string;
  itemsData: Items;
  plays: Play[];
  stats: ReturnType<typeof summarize>;
  playCount: number;
  lastPlayedAt: number;
  items: string[];
  avgTime: string;
  avgCoins: number;
};

export default function AnalysisPage({ plays, onDeletePlay, onDeleteCondition }: AnalysisPageProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!plays.length) {
      setSelectedKey(null);
      return;
    }
    if (!selectedKey || !plays.some((play) => conditionKey(play) === selectedKey)) {
      setSelectedKey(conditionKey(plays[0]));
    }
  }, [plays, selectedKey]);

  const conditionGroups = useMemo(() => {
    const map = new Map<string, Play[]>();
    plays.forEach((play) => {
      const key = conditionKey(play);
      const group = map.get(key);
      if (group) {
        group.push(play);
      } else {
        map.set(key, [play]);
      }
    });

    const groups: ConditionGroup[] = [];
    map.forEach((groupPlays, key) => {
      if (!groupPlays.length) return;
      const sorted = groupPlays.slice().sort((a, b) => a.ts - b.ts);
      const stats = summarize(sorted.map((p) => p.cpm));
      const times = sorted.map((p) => parseTimeToSeconds(p.time) ?? 0);
      const coins = sorted.map((p) => p.coins);
      const avgTimeSec = times.reduce((acc, v) => acc + v, 0) / sorted.length;
      const avgCoins = coins.reduce((acc, v) => acc + v, 0) / sorted.length;
      const itemKeys = new Set(sorted.map((play) => itemsKey(play.items)));
      const items = itemKeys.size === 1 ? itemsLabel(sorted[0].items) : ['Mixed'];

      groups.push({
        key,
        character: sorted[0].character,
        skill: sorted[0].skill,
        terminal: sorted[0].terminal,
        itemsData: sorted[0].items,
        plays: sorted,
        stats,
        playCount: sorted.length,
        lastPlayedAt: sorted[sorted.length - 1].ts,
        items,
        avgTime: `${Math.floor(avgTimeSec / 60)}:${String(Math.round(avgTimeSec % 60)).padStart(2, '0')}`,
        avgCoins: Math.round(avgCoins),
      });
    });

    return groups.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  }, [plays]);

  const selected = conditionGroups.find((group) => group.key === selectedKey) ?? conditionGroups[0];
  const chartData = useMemo(() => {
    if (!selected) return [];
    return selected.plays.map((play, index) => ({
      index: index + 1,
      cpm: Math.round(play.cpm),
    }));
  }, [selected]);

  const handleDeleteCondition = () => {
    if (!selected) return;
    if (!window.confirm('Delete this condition and all plays?')) return;
    onDeleteCondition({
      character: selected.character,
      skill: selected.skill,
      terminal: selected.terminal,
      items: selected.itemsData,
    });
  };

  const handleDeletePlay = (playId: string) => {
    if (!window.confirm('Delete this play?')) return;
    onDeletePlay(playId);
  };

  return (
    <div className="analysis-root">
      <header className="analysis-header">
        <div>
          <h1>Analysis</h1>
          <p>Condition-based trends and swings, separated by items.</p>
        </div>
        <div className="analysis-summary">
          <div>
            <span>Total Plays</span>
            <strong>{formatNumber.format(plays.length)}</strong>
          </div>
          <div>
            <span>Conditions</span>
            <strong>{formatNumber.format(conditionGroups.length)}</strong>
          </div>
        </div>
      </header>

      <div className="analysis-grid">
        <div className="session-list">
          {conditionGroups.map((group) => (
            <div
              key={group.key}
              className={`condition-card ${group.key === selected?.key ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={group.key === selected?.key}
              onClick={() => setSelectedKey(group.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedKey(group.key);
                }
              }}
            >
              <div className="condition-card-main">
                <div>
                  <div className="session-title">{conditionLabel(group)}</div>
                  <div className="session-meta">Last {new Date(group.lastPlayedAt).toLocaleString()}</div>
                </div>
                <div className="session-actions">
                  <div className="session-count">{group.playCount} plays</div>
                </div>
              </div>
              <div className="session-items">
                {group.items.map((name) => (
                  <span key={name} className="chip">{name}</span>
                ))}
              </div>
              <div className="session-stats">
                <div>
                  <span>Avg</span>
                  <strong>{group.stats.avg.toFixed(0)}</strong>
                </div>
                <div>
                  <span>Hourly</span>
                  <strong>{(group.stats.avg * 60).toFixed(0)}</strong>
                </div>
                <div>
                  <span>Median</span>
                  <strong>{group.stats.median.toFixed(0)}</strong>
                </div>
                <div>
                  <span>Std Dev</span>
                  <strong>{group.stats.stdDev.toFixed(0)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
        {selected && (
          <section className="condition-detail">
            <header className="condition-detail-header">
              <div>
                <h3>Condition Detail</h3>
                <div className="session-detail-sub">{conditionLabel(selected)}</div>
              </div>
              <button className="btn btn-ghost btn-delete" type="button" onClick={handleDeleteCondition}>
                Delete Condition
              </button>
            </header>
            <div className="session-detail-stats">
              <div>
                <span>Avg CPM</span>
                <strong>{selected.stats.avg.toFixed(0)}</strong>
              </div>
              <div>
                <span>Hourly</span>
                <strong>{(selected.stats.avg * 60).toFixed(0)}</strong>
              </div>
              <div>
                <span>Plays</span>
                <strong>{selected.playCount}</strong>
              </div>
              <div>
                <span>Std Dev</span>
                <strong>{selected.stats.stdDev.toFixed(0)}</strong>
              </div>
            </div>
            <div className="condition-meta">
              <div>Avg Time {selected.avgTime}</div>
              <div>Avg Coins {formatNumber.format(selected.avgCoins)}</div>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 10, right: 12, left: 10, bottom: 0 }}>
                  <XAxis dataKey="index" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={56} />
                  <Tooltip
                    formatter={(value) => formatNumber.format(Number(value))}
                    labelFormatter={(label) => `Play ${label}`}
                  />
                  <Line type="monotone" dataKey="cpm" stroke="#ff6b3d" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="play-list">
              {selected.plays.map((play, index) => (
                <div key={play.id} className="play-row">
                  <div className="play-index">#{index + 1}</div>
                  <div className="play-time">{play.time}</div>
                  <div className="play-coins">{formatNumber.format(play.coins)}</div>
                  <div className="play-cpm">{formatNumber.format(Math.round(play.cpm))}</div>
                  <button
                    className="btn btn-ghost btn-delete"
                    type="button"
                    onClick={() => handleDeletePlay(play.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
