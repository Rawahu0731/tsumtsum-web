import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Play, Session } from '../types';
import { summarize } from '../utils/stats';

const formatNumber = new Intl.NumberFormat('en-US');

type SessionDetailProps = {
  session: Session;
  plays: Play[];
  onDeletePlay: (playId: string) => void;
};

export default function SessionDetail({ session, plays, onDeletePlay }: SessionDetailProps) {
  const ordered = plays.slice().sort((a, b) => a.ts - b.ts);
  const chartData = ordered.map((play, index) => ({
    index: index + 1,
    cpm: Math.round(play.cpm),
  }));
  const stats = summarize(ordered.map((play) => play.cpm));
  const hourly = stats.avg * 60;

  return (
    <section className="session-detail">
      <header>
        <h3>Session Detail</h3>
        <div className="session-detail-sub">{session.character} · SL{session.skill}</div>
      </header>
      <div className="session-detail-stats">
        <div>
          <span>Avg CPM</span>
          <strong>{stats.avg.toFixed(0)}</strong>
        </div>
        <div>
          <span>Hourly</span>
          <strong>{hourly.toFixed(0)}</strong>
        </div>
        <div>
          <span>Plays</span>
          <strong>{ordered.length}</strong>
        </div>
        <div>
          <span>Std Dev</span>
          <strong>{stats.stdDev.toFixed(0)}</strong>
        </div>
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
        {ordered.map((play, index) => (
          <div key={play.id} className="play-row">
            <div className="play-index">#{index + 1}</div>
            <div className="play-time">{play.time}</div>
            <div className="play-coins">{formatNumber.format(play.coins)}</div>
            <div className="play-cpm">{formatNumber.format(Math.round(play.cpm))}</div>
            <button
              className="btn btn-ghost btn-delete"
              type="button"
              onClick={() => onDeletePlay(play.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
