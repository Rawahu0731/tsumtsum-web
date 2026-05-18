import type { StatsSummary } from '../utils/stats';

type SessionCompleteProps = {
  stats: StatsSummary;
  playCount: number;
  onFinish: () => void;
};

export default function SessionComplete({ stats, playCount, onFinish }: SessionCompleteProps) {
  const hourly = stats.avg * 60;

  return (
    <div className="session-complete">
      <div className="session-complete-card">
        <h3>Session Complete</h3>
        <div className="complete-grid">
          <div>
            <span>Average</span>
            <strong>{stats.avg.toFixed(0)}</strong>
          </div>
          <div>
            <span>Hourly</span>
            <strong>{hourly.toFixed(0)}</strong>
          </div>
          <div>
            <span>Median</span>
            <strong>{stats.median.toFixed(0)}</strong>
          </div>
          <div>
            <span>Max</span>
            <strong>{stats.max.toFixed(0)}</strong>
          </div>
          <div>
            <span>Min</span>
            <strong>{stats.min.toFixed(0)}</strong>
          </div>
          <div>
            <span>Total Plays</span>
            <strong>{playCount}</strong>
          </div>
        </div>
        <button className="btn btn-primary" type="button" onClick={onFinish}>
          Finish Session
        </button>
      </div>
    </div>
  );
}
