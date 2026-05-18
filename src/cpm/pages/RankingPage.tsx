import { useMemo, useState } from 'react';
import type { Play } from '../types';
import { itemsKey, itemsLabel } from '../utils/items';
import { median, summarize } from '../utils/stats';
import { parseTimeToSeconds } from '../utils/format';

const formatNumber = new Intl.NumberFormat('en-US');

const sortOptions = [
  { value: 'median', label: 'Median CPM' },
  { value: 'avg', label: 'Average CPM' },
  { value: 'max', label: 'Max CPM' },
  { value: 'min', label: 'Min CPM' },
  { value: 'count', label: 'Play Count' },
] as const;

type SortKey = typeof sortOptions[number]['value'];

type RankingRow = {
  key: string;
  character: string;
  skill: number;
  items: string[];
  avg: number;
  median: number;
  max: number;
  min: number;
  stdDev: number;
  count: number;
  avgTime: string;
  avgCoins: number;
};

type RankingPageProps = {
  plays: Play[];
};

export default function RankingPage({ plays }: RankingPageProps) {
  const [sortKey, setSortKey] = useState<SortKey>('median');

  const rows = useMemo(() => {
    const map = new Map<string, { plays: Play[] }>();
    plays.forEach((play) => {
      const key = `${play.character}|${play.skill}|${itemsKey(play.items)}`;
      if (!map.has(key)) {
        map.set(key, { plays: [] });
      }
      map.get(key)?.plays.push(play);
    });

    const list: RankingRow[] = [];
    map.forEach((value, key) => {
      const groupPlays = value.plays;
      if (!groupPlays.length) return;
      const cpms = groupPlays.map((p) => p.cpm);
      const times = groupPlays.map((p) => parseTimeToSeconds(p.time) ?? 0);
      const coins = groupPlays.map((p) => p.coins);
      const stats = summarize(cpms);
      const avgTimeSec = times.reduce((acc, v) => acc + v, 0) / groupPlays.length;
      const avgCoins = coins.reduce((acc, v) => acc + v, 0) / groupPlays.length;

      list.push({
        key,
        character: groupPlays[0].character,
        skill: groupPlays[0].skill,
        items: itemsLabel(groupPlays[0].items),
        avg: stats.avg,
        median: median(cpms),
        max: stats.max,
        min: stats.min,
        stdDev: stats.stdDev,
        count: groupPlays.length,
        avgTime: `${Math.floor(avgTimeSec / 60)}:${String(Math.round(avgTimeSec % 60)).padStart(2, '0')}`,
        avgCoins: Math.round(avgCoins),
      });
    });

    const sorted = list.sort((a, b) => {
      switch (sortKey) {
        case 'avg':
          return b.avg - a.avg;
        case 'max':
          return b.max - a.max;
        case 'min':
          return b.min - a.min;
        case 'count':
          return b.count - a.count;
        case 'median':
        default:
          return b.median - a.median;
      }
    });

    return sorted;
  }, [plays, sortKey]);

  return (
    <div className="ranking-root">
      <header className="ranking-header">
        <div>
          <h1>Ranking</h1>
          <p>Compare efficiency by character, skill, and items.</p>
        </div>
        <div className="sort-select">
          <label>
            Sort By
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="ranking-cards">
        {rows.map((row, index) => (
          <article key={row.key} className="ranking-card">
            <div className="rank-badge">#{index + 1}</div>
            <h3>{row.character} · SL{row.skill}</h3>
            <div className="chip-row">
              {row.items.map((name) => (
                <span key={name} className="chip">{name}</span>
              ))}
            </div>
            <div className="card-stats">
              <div>
                <span>Median</span>
                <strong>{Math.round(row.median)}</strong>
              </div>
              <div>
                <span>Avg</span>
                <strong>{Math.round(row.avg)}</strong>
              </div>
              <div>
                <span>Hourly</span>
                <strong>{Math.round(row.avg * 60)}</strong>
              </div>
              <div>
                <span>Max</span>
                <strong>{Math.round(row.max)}</strong>
              </div>
              <div>
                <span>Min</span>
                <strong>{Math.round(row.min)}</strong>
              </div>
              <div>
                <span>Std Dev</span>
                <strong>{Math.round(row.stdDev)}</strong>
              </div>
            </div>
            <div className="card-meta">
              <span>Plays {row.count}</span>
              <span>Avg Time {row.avgTime}</span>
              <span>Avg Coins {formatNumber.format(row.avgCoins)}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="ranking-table-wrap">
        <table className="ranking-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Character</th>
              <th>Skill</th>
              <th>Items</th>
              <th>Avg CPM</th>
              <th>Hourly</th>
              <th>Median</th>
              <th>Max</th>
              <th>Min</th>
              <th>Std Dev</th>
              <th>Plays</th>
              <th>Avg Time</th>
              <th>Avg Coins</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key}>
                <td>#{index + 1}</td>
                <td>{row.character}</td>
                <td>{row.skill}</td>
                <td>{row.items.join(', ')}</td>
                <td>{Math.round(row.avg)}</td>
                <td>{Math.round(row.avg * 60)}</td>
                <td>{Math.round(row.median)}</td>
                <td>{Math.round(row.max)}</td>
                <td>{Math.round(row.min)}</td>
                <td>{Math.round(row.stdDev)}</td>
                <td>{row.count}</td>
                <td>{row.avgTime}</td>
                <td>{formatNumber.format(row.avgCoins)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
