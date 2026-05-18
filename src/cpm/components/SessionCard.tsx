import type { Session } from '../types';
import type { StatsSummary } from '../utils/stats';
import { itemsLabel } from '../utils/items';

type SessionCardProps = {
  session: Session;
  stats: StatsSummary;
  playCount: number;
  onSelect: () => void;
  onDelete: () => void;
  isActive: boolean;
};

export default function SessionCard({ session, stats, playCount, onSelect, onDelete, isActive }: SessionCardProps) {
  const hourly = stats.avg * 60;

  return (
    <div
      className={`session-card ${isActive ? 'active' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="session-card-main">
        <div>
          <div className="session-title">{session.character || 'Unknown'} · SL{session.skill}</div>
          <div className="session-meta">{new Date(session.createdAt).toLocaleString()}</div>
        </div>
        <div className="session-actions">
          <div className="session-count">{playCount} plays</div>
          <button
            className="btn btn-ghost btn-delete"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          >
            Delete
          </button>
        </div>
      </div>
      <div className="session-items">
        {itemsLabel(session.items).map((name) => (
          <span key={name} className="chip">{name}</span>
        ))}
      </div>
      <div className="session-stats">
        <div>
          <span>Avg</span>
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
          <span>Std Dev</span>
          <strong>{stats.stdDev.toFixed(0)}</strong>
        </div>
      </div>
    </div>
  );
}
