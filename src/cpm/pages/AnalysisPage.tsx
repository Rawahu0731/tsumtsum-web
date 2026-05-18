import { useEffect, useMemo, useState } from 'react';
import type { Play, Session } from '../types';
import { summarize } from '../utils/stats';
import SessionCard from '../components/SessionCard';
import SessionDetail from '../components/SessionDetail';

const formatNumber = new Intl.NumberFormat('en-US');

type AnalysisPageProps = {
  sessions: Session[];
  plays: Play[];
  onDeletePlay: (playId: string) => void;
  onDeleteSession: (sessionId: string) => void;
};

export default function AnalysisPage({ sessions, plays, onDeletePlay, onDeleteSession }: AnalysisPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(sessions[0]?.id ?? null);

  useEffect(() => {
    if (!sessions.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !sessions.some((session) => session.id === selectedId)) {
      setSelectedId(sessions[0].id);
    }
  }, [sessions, selectedId]);

  const sessionStats = useMemo(() => {
    return sessions.map((session) => {
      const sessionPlays = plays.filter((p) => p.sessionId === session.id);
      const stats = summarize(sessionPlays.map((p) => p.cpm));
      return {
        session,
        stats,
        playCount: sessionPlays.length,
        plays: sessionPlays,
      };
    });
  }, [sessions, plays]);

  const selected = sessionStats.find((s) => s.session.id === selectedId) ?? sessionStats[0];

  const handleDeleteSession = (sessionId: string) => {
    if (!window.confirm('Delete this session and all plays?')) return;
    onDeleteSession(sessionId);
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
          <p>Session-by-session trends and swings.</p>
        </div>
        <div className="analysis-summary">
          <div>
            <span>Total Plays</span>
            <strong>{formatNumber.format(plays.length)}</strong>
          </div>
          <div>
            <span>Total Sessions</span>
            <strong>{formatNumber.format(sessions.length)}</strong>
          </div>
        </div>
      </header>

      <div className="analysis-grid">
        <div className="session-list">
          {sessionStats.map((entry) => (
            <SessionCard
              key={entry.session.id}
              session={entry.session}
              stats={entry.stats}
              playCount={entry.playCount}
              onSelect={() => setSelectedId(entry.session.id)}
              onDelete={() => handleDeleteSession(entry.session.id)}
              isActive={entry.session.id === selected?.session.id}
            />
          ))}
        </div>
        {selected && (
          <SessionDetail
            session={selected.session}
            plays={selected.plays}
            onDeletePlay={handleDeletePlay}
          />
        )}
      </div>
    </div>
  );
}
