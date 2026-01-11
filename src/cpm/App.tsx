import { useState, useRef, useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import './index.css'
import './App.css'
import Usage from './pages/Usage'

function CpmMain() {
  const navigate = useNavigate();
  const [time, setTime] = useState('00:00');
  const [coins, setCoins] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [score, setScore] = useState(false);
  const [coin, setCoin] = useState(true);
  const [exp, setExp] = useState(false);
  const [timeItem, setTimeItem] = useState(false);
  const [bomb, setBomb] = useState(false);
  const [fivetofour, setFivetofour] = useState(true);
  const [character, setCharacter] = useState('');
  const [skill, setSkill] = useState(1);
  const [entries, setEntries] = useState<Array<{ character: string; skill: number; cpm: number; ts: number; time?: string; coins?: number; items: { score: boolean; coin: boolean; exp: boolean; timeItem: boolean; bomb: boolean; fivetofour: boolean } }>>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  const handleCalcClick = () => {
    const timeParts = time.split(':');
    const minutes = Number(timeParts[0]);
    const seconds = Number(timeParts[1]);
    const totalMinutes = minutes + (seconds / 60);
    let lastCoins = coins;

    if (coin) lastCoins = lastCoins * 1.3;

    if (score) lastCoins -= 500;
    if (coin) lastCoins -= 500;
    if (exp) lastCoins -= 500;
    if (timeItem) lastCoins -= 1000;
    if (bomb) lastCoins -= 1500;
    if (fivetofour) lastCoins -= 1800;

    setResult(lastCoins / totalMinutes);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cpm_entries');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((e: any) => ({
            character: String(e.character || ''),
            skill: Number(e.skill || 1),
            cpm: Number(e.cpm || 0),
            ts: Number(e.ts || Date.now()),
            time: String(e.time || '00:00'),
            coins: Number(e.coins || e.coins === 0 ? e.coins : (e.coins === undefined ? 0 : Number(e.coins))),
            items: e.items || {
              score: !!e.score,
              coin: e.coin === undefined ? true : !!e.coin,
              exp: !!e.exp,
              timeItem: !!e.timeItem,
              bomb: !!e.bomb,
              fivetofour: e.fivetofour === undefined ? true : !!e.fivetofour,
            }
          }));
          setEntries(normalized as any);
        }
      }
    } catch (e) {
      console.error('failed to load entries', e);
    }
  }, []);

  function itemsKey(it: { score: boolean; coin: boolean; exp: boolean; timeItem: boolean; bomb: boolean; fivetofour: boolean }) {
    return `S:${it.score ? 1 : 0}|C:${it.coin ? 1 : 0}|E:${it.exp ? 1 : 0}|T:${it.timeItem ? 1 : 0}|B:${it.bomb ? 1 : 0}|F:${it.fivetofour ? 1 : 0}`;
  }

  function itemsLabel(it: { score: boolean; coin: boolean; exp: boolean; timeItem: boolean; bomb: boolean; fivetofour: boolean }) {
    const names: string[] = [];
    if (it.score) names.push('スコア');
    if (it.coin) names.push('コイン');
    if (it.exp) names.push('EXP');
    if (it.timeItem) names.push('タイム');
    if (it.bomb) names.push('ボム');
    if (it.fivetofour) names.push('5→4');
    return names.length ? names : ['なし'];
  }

  function itemsEqual(a: any, b: any) {
    return !!a && !!b &&
      Boolean(a.score) === Boolean(b.score) &&
      Boolean(a.coin) === Boolean(b.coin) &&
      Boolean(a.exp) === Boolean(b.exp) &&
      Boolean(a.timeItem) === Boolean(b.timeItem) &&
      Boolean(a.bomb) === Boolean(b.bomb) &&
      Boolean(a.fivetofour) === Boolean(b.fivetofour);
  }

  const aggregated = (() => {
    const map = new Map<string, { character: string; skill: number; items: any; sum: number; count: number; sumTimeSec: number; sumCoins: number }>();
    entries.forEach(e => {
      const key = `${e.character}::${e.skill}::${itemsKey(e.items)}`;
      const cur = map.get(key);
      const timeParts = String(e.time || '00:00').split(':');
      const minutes = Number(timeParts[0] || 0);
      const seconds = Number(timeParts[1] || 0);
      const totalSec = (Number.isFinite(minutes) ? minutes : 0) * 60 + (Number.isFinite(seconds) ? seconds : 0);
      const coinsVal = Number(e.coins || 0);
      if (cur) {
        cur.sum += e.cpm;
        cur.count += 1;
        cur.sumTimeSec += totalSec;
        cur.sumCoins += coinsVal;
      } else {
        map.set(key, { character: e.character, skill: e.skill, items: e.items, sum: e.cpm, count: 1, sumTimeSec: totalSec, sumCoins: coinsVal });
      }
    });
    const arr = Array.from(map.values()).map(v => ({
      character: v.character,
      skill: v.skill,
      items: v.items,
      avg: v.sum / v.count,
      count: v.count,
      avgTimeSec: Math.round(v.sumTimeSec / v.count),
      avgCoins: Math.round(v.sumCoins / v.count),
    }));
    arr.sort((a, b) => b.avg - a.avg);
    return arr;
  })();

  function saveEntriesToStorage(next: typeof entries) {
    try {
      localStorage.setItem('cpm_entries', JSON.stringify(next));
    } catch (e) {
      console.error('failed to save entries', e);
    }
  }

  const handleDeleteEntry = (ts: number) => {
    if (!window.confirm('このエントリを削除しますか？')) return;
    const next = entries.filter(e => e.ts !== ts);
    setEntries(next);
    saveEntriesToStorage(next);
  }

  const handleSave = () => {
    if (!character.trim()) {
      window.alert('キャラクター名を入力してください');
      return;
    }
    if (result == null || Number.isNaN(result)) {
      window.alert('計算を実行してください');
      return;
    }
    const newItems = { score, coin, exp, timeItem, bomb, fivetofour };
    // 重複チェック: character, skill, items, time, coins, cpm (小数2桁で比較)
    const exists = entries.some(e =>
      String(e.character || '').trim() === character.trim() &&
      Number(e.skill) === Number(skill) &&
      itemsEqual(e.items, newItems) &&
      String(e.time || '') === String(time || '') &&
      Number(e.coins || 0) === Number(coins || 0) &&
      Math.abs(Number(e.cpm || 0) - Number(result)) < 0.01
    );

    if (exists) {
      window.alert('同じ記録は既に登録されています');
      return;
    }

    const entry = { character: character.trim(), skill, cpm: result, ts: Date.now(), time, coins, items: newItems };
    const next = [entry, ...entries];
    setEntries(next);
    saveEntriesToStorage(next);
  }

  const handleExportJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cpm_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); // Append to body to ensure click works in all browsers
      a.click();
      document.body.removeChild(a); // Clean up
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('export failed', e);
      window.alert('Export failed');
    }
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  }

  const handleFileChange = async (e: any) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('Invalid JSON format');
      const items: Array<any> = [];
        parsed.forEach((it: any) => {
        if (!it || typeof it !== 'object') return;
        const character = String(it.character || '');
        const skill = Number(it.skill || 1);
        const cpm = Number(it.cpm || 0);
        const ts = Number(it.ts || Date.now());
        const timeVal = String(it.time || '00:00');
        const coinsVal = Number(it.coins || (it.coins === 0 ? 0 : (it.coins === undefined ? 0 : Number(it.coins))));
        const itemsObj = it.items || {
          score: !!it.score,
          coin: it.coin === undefined ? true : !!it.coin,
          exp: !!it.exp,
          timeItem: !!it.timeItem,
          bomb: !!it.bomb,
          fivetofour: it.fivetofour === undefined ? true : !!it.fivetofour,
        };
        items.push({ character, skill, cpm, ts, time: timeVal, coins: coinsVal, items: itemsObj });
      });
      const map = new Map<number, any>();
      entries.forEach(e => map.set(e.ts, e));
      items.forEach(i => map.set(i.ts, i));
      const merged = Array.from(map.values()).sort((a, b) => b.ts - a.ts);
      setEntries(merged);
      saveEntriesToStorage(merged);
      setImportError(null);
      window.alert('Import successful');
    } catch (err: any) {
      console.error('import failed', err);
      setImportError(err?.message || String(err));
      window.alert('Import failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleApply(stopwatchTime: string) {
    setTime(stopwatchTime);
  }

  return (
    <>
      <header className="app-header">
        <h1>CPM Calculator</h1>
        <p className="subtitle">ツムツム コイン効率計算ツール</p>
      </header>

      <nav className="nav-bar">
        <button onClick={() => navigate('usage')}>Usage</button>
        <button onClick={handleExportJSON}>Export Data</button>
        <button onClick={handleImportClick}>Import JSON</button>
        <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleFileChange} />
      </nav>

      {importError && (
        <div style={{
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#fef2f2',
          color: '#b91c1c',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem'
        }}>
          Import Error: {importError}
        </div>
      )}

      {/* Main Grid could be added here for larger screens, but keeping single column for focus */}

      <div className="card">
        <Stopwatch onApply={handleApply} />
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Calculation</h2>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Character Name</label>
            <input
              type='text'
              value={character}
              onChange={e => setCharacter(e.target.value)}
              placeholder="名称を入力..."
              style={{ fontSize: '16px' }} // prevent iOS zoom
            />
          </div>
          <div className="form-field">
            <label>Skill Level</label>
            <input
              type='number'
              value={skill}
              onChange={e => setSkill(Number(e.target.value))}
              min={1}
              max={6}
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label>Time (mm:ss)</label>
            <input
              type='text'
              value={time}
              onChange={e => setTime(e.target.value)}
              pattern='^\d{2}:\d{2}$'
              placeholder="00:00"
              style={{ fontSize: '16px' }}
            />
          </div>
          <div className="form-field">
            <label>Base Coin</label>
            <input
              type='number'
              value={coins}
              onChange={e => setCoins(Number(e.target.value))}
              placeholder="0"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>

        <div className="item-section">
          <div className="form-field">
            <label>Active Items</label>
            <div className="item-grid">
              <label className={`item-checkbox ${score ? 'checked' : ''}`}>
                <input type='checkbox' checked={score} onChange={e => setScore(e.target.checked)} />
                <span>+Score</span>
              </label>
              <label className={`item-checkbox ${coin ? 'checked' : ''}`}>
                <input type='checkbox' checked={coin} onChange={e => setCoin(e.target.checked)} />
                <span>+Coin</span>
              </label>
              <label className={`item-checkbox ${exp ? 'checked' : ''}`}>
                <input type='checkbox' checked={exp} onChange={e => setExp(e.target.checked)} />
                <span>+Exp</span>
              </label>
              <label className={`item-checkbox ${timeItem ? 'checked' : ''}`}>
                <input type='checkbox' checked={timeItem} onChange={e => setTimeItem(e.target.checked)} />
                <span>+Time</span>
              </label>
              <label className={`item-checkbox ${bomb ? 'checked' : ''}`}>
                <input type='checkbox' checked={bomb} onChange={e => setBomb(e.target.checked)} />
                <span>+Bomb</span>
              </label>
              <label className={`item-checkbox ${fivetofour ? 'checked' : ''}`}>
                <input type='checkbox' checked={fivetofour} onChange={e => setFivetofour(e.target.checked)} />
                <span>5→4</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 text-right">
          <button className="btn btn-primary w-full" onClick={handleCalcClick}>Calculate</button>
        </div>
      </div>

      {result !== null && (
        <div className="card">
          <div className="card-header">
            <h2>Result</h2>
            <button className="btn btn-outline" onClick={handleSave}>Save Record</button>
          </div>
          <div className="result-stats">
            <div className="result-stat">
              <div className="result-stat-label">Efficiency / Min</div>
              <div className="result-stat-value">{result.toFixed(2)}</div>
              <div className="result-stat-unit">coin/m</div>
            </div>
            <div className="result-stat">
              <div className="result-stat-label">Hourly Rate</div>
              <div className="result-stat-value">{(result * 60).toFixed(0)}</div>
              <div className="result-stat-unit">coin/h</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Ranking</h2>
          <span className="data-count">Total: {entries.length}</span>
        </div>

        {entries.length === 0 ? (
          <div className="text-secondary text-center py-4">No Data Recorded</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ranking-table">
              <thead>
                <tr>
                  <th className="text-left">RANK</th>
                  <th className="text-left">Character</th>
                  <th className="text-left">Skill</th>
                  <th className="text-left">Items</th>
                  <th className="text-right">Time</th>
                  <th className="text-right">Coins</th>
                  <th className="text-right">Coins/min</th>
                  <th className="text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.map((r, i) => (
                  <tr key={`${r.character}-${r.skill}-${itemsKey(r.items)}`} onClick={() => { setCharacter(r.character); setSkill(r.skill); setScore(!!r.items.score); setCoin(!!r.items.coin); setExp(!!r.items.exp); setTimeItem(!!r.items.timeItem); setBomb(!!r.items.bomb); setFivetofour(!!r.items.fivetofour); }} style={{ cursor: 'pointer' }}>
                    <td className="text-left"><span className={`rank-number ${i < 3 ? 'top' : ''}`}>{i + 1}</span></td>
                    <td className="text-left">{r.character}</td>
                    <td className="text-left">{r.skill}</td>
                    <td className="text-left">
                      <div className="item-tags">
                        {itemsLabel(r.items).map((name, idx) => (
                          <span key={idx} className="item-tag-text">{name}</span>
                        ))}
                      </div>
                    </td>
                    <td className="text-right text-mono">{`${Math.floor((r.avgTimeSec || 0) / 60)}:${String((r.avgTimeSec || 0) % 60).padStart(2, '0')}`}</td>
                    <td className="text-right text-mono">{Number(r.avgCoins || 0).toFixed(0)}</td>
                    <td className="text-right text-mono">{r.avg.toFixed(0)}</td>
                    <td className="text-right text-mono">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>History</h2>
          <button className="btn btn-ghost" onClick={() => setIsOpening(!isOpening)}>
            {isOpening ? 'Close' : 'View All'}
          </button>
        </div>
        {isOpening && (
          entries.length === 0 ? (
            <div className="text-center py-4 text-secondary">No Recods</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th>Character</th>
                    <th>Skill</th>
                    <th className="text-right">Eff.</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.ts}>
                      <td>{e.character}</td>
                      <td>{e.skill}</td>
                      <td className="text-right text-mono"><strong>{Number(e.cpm).toFixed(0)}</strong></td>
                      <td className="text-right">
                        <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: 'auto' }} onClick={(ev) => { ev.stopPropagation(); handleDeleteEntry(e.ts); }}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CpmMain />} />
      <Route path="usage" element={<Usage />} />
    </Routes>
  )
}


function Stopwatch({ onApply }: { onApply: (time: string) => void }) {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const accRef = useRef<number>(0);

  function handleStart() {
    if (isRunning) return;
    setIsRunning(true);
    startRef.current = performance.now();
    intervalRef.current = window.setInterval(() => {
      const now = performance.now();
      const elapsed = accRef.current + (startRef.current ? now - startRef.current : 0);
      setTime(Math.floor(elapsed));
    }, 30);
  }

  function handlePause() {
    if (!isRunning) return;
    const now = performance.now();
    if (startRef.current != null) {
      accRef.current += now - startRef.current;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startRef.current = null;
    setIsRunning(false);
  }

  function handleReset() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startRef.current = null;
    accRef.current = 0;
    setIsRunning(false);
    setTime(0);
  }

  const seconds = `0${Math.floor(time / 1000) % 60}`.slice(-2);
  const minutes = `0${Math.floor(time / 60000) % 60}`.slice(-2);

  return (
    <div className="stopwatch-container">
      <div className={`stopwatch-display ${isRunning ? 'running' : ''}`}>
        {minutes}:{seconds}
      </div>
      <div className="stopwatch-buttons">
        {isRunning ? (
          <button className="btn btn-outline" onClick={handlePause}>Pause</button>
        ) : (
          <button className="btn btn-primary" onClick={handleStart}>Start</button>
        )}
        <button className="btn btn-ghost" onClick={handleReset}>Reset</button>
        <button className="btn btn-outline" onClick={() => onApply(`${minutes}:${seconds}`)}>Apply</button>
      </div>
    </div>
  );
}

// single default export already provided above
