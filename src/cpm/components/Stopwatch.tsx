type StopwatchProps = {
  timeLabel: string;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
};

export default function Stopwatch({ timeLabel, isRunning, onStart, onPause, onReset }: StopwatchProps) {
  return (
    <div className="stopwatch-block">
      <div className={`stopwatch-display ${isRunning ? 'running' : ''}`}>{timeLabel}</div>
      <div className="stopwatch-controls">
        {isRunning ? (
          <button className="btn btn-outline" type="button" onClick={onPause}>
            Pause
          </button>
        ) : (
          <button className="btn btn-primary" type="button" onClick={onStart}>
            Start
          </button>
        )}
        <button className="btn btn-ghost" type="button" onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  );
}
