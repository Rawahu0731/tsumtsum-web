import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, provider, signInWithPopup, signOut } from '../firebase';
import './SyncPage.css';

const SYNC_LIMIT = 10;
const SYNC_COUNT_KEY = 'syncCount';
const SYNC_DATE_KEY = 'syncDate';
const WALLET_KEY = 'tsumtsum-wallet-data';
const CPM_KEY = 'cpm_entries';
const TSUMCOUNT_KEY = 'tsum-count-state-v1';

type SyncState = {
  user: User | null;
  status: string;
  error: string;
  remaining: number;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function refreshCounter(): number {
  const currentDate = today();
  const storedDate = localStorage.getItem(SYNC_DATE_KEY);
  if (storedDate !== currentDate) {
    localStorage.setItem(SYNC_DATE_KEY, currentDate);
    localStorage.setItem(SYNC_COUNT_KEY, '0');
    return 0;
  }
  const raw = Number(localStorage.getItem(SYNC_COUNT_KEY) || '0');
  return Number.isFinite(raw) && raw >= 0 ? raw : 0;
}

function incrementCounter(): number {
  const current = refreshCounter();
  const next = current + 1;
  localStorage.setItem(SYNC_COUNT_KEY, String(next));
  return next;
}

function updateRemaining(setter: (value: number) => void): number {
  const count = refreshCounter();
  const remaining = Math.max(0, SYNC_LIMIT - count);
  setter(remaining);
  return remaining;
}

export default function SyncPage() {
  const [state, setState] = useState<SyncState>({ user: null, status: '', error: '', remaining: SYNC_LIMIT });
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser: User | null) => {
      setState((prev) => ({ ...prev, user: nextUser ?? null }));
    });
    updateRemaining((value) => setState((prev) => ({ ...prev, remaining: value })));
    return () => {
      unsub();
    };
  }, []);

  const setError = (message: string) => setState((prev) => ({ ...prev, error: message, status: '' }));
  const setStatus = (message: string) => setState((prev) => ({ ...prev, status: message, error: '' }));

  const handleSignIn = async () => {
    try {
      setError('');
      await signInWithPopup(auth, provider);
      setStatus('ログインしました。');
    } catch (err) {
      setError(`ログインに失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setStatus('ログアウトしました。');
    } catch (err) {
      setError(`ログアウトに失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const ensureUser = (): User | null => {
    if (!state.user) {
      setError('ログインが必要です。');
      return null;
    }
    return state.user;
  };

  const ensureSaveQuota = (): number | null => {
    const nextRemaining = updateRemaining((value) => setState((prev) => ({ ...prev, remaining: value })));
    if (nextRemaining <= 0) {
      setError('本日の上限（10回）に達しました。');
      return null;
    }
    return nextRemaining;
  };

  const handleSave = async () => {
    const user = ensureUser();
    if (!user) return;
    const hasQuota = ensureSaveQuota();
    if (hasQuota === null) return;

    const walletRaw = localStorage.getItem(WALLET_KEY);
    const cpmRaw = localStorage.getItem(CPM_KEY);
    const tsumCountRaw = localStorage.getItem(TSUMCOUNT_KEY);
    const walletData = walletRaw ? JSON.parse(walletRaw) : {};
    const cpmData = cpmRaw ? JSON.parse(cpmRaw) : [];
    const tsumCountData = tsumCountRaw ? JSON.parse(tsumCountRaw) : {};

    console.log('wallet:', walletData);
    console.log('cpm:', cpmData);
    console.log('tsumCount:', tsumCountData);

    setIsSaving(true);
    setStatus('クラウドに保存中…');
    try {
      const ref = doc(db, 'users', user.uid);
      await setDoc(ref, { wallet: walletData, cpm: cpmData, tsumCount: tsumCountData, updatedAt: serverTimestamp() });
      const nextCount = incrementCounter();
      setState((prev) => ({ ...prev, remaining: Math.max(0, SYNC_LIMIT - nextCount) }));
      setStatus('クラウドに保存しました。');
    } catch (err) {
      setError(`クラウドへの保存に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async () => {
    const user = ensureUser();
    if (!user) return;

    setIsRestoring(true);
    setStatus('クラウドから読み込み中…');
    try {
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setError('クラウドデータが見つかりません。');
        return;
      }
      const data = snap.data();
      localStorage.setItem(WALLET_KEY, JSON.stringify(data.wallet ?? {}));
      localStorage.setItem(CPM_KEY, JSON.stringify(data.cpm ?? []));
      localStorage.setItem(TSUMCOUNT_KEY, JSON.stringify(data.tsumCount ?? {}));
      setStatus('クラウドから復元しました。');
    } catch (err) {
      setError(`クラウドからの復元に失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="sync-page">
      <div className="sync-card">
        <h1 className="sync-title">クラウド同期</h1>

        {!state.user && (
          <div className="sync-actions">
            <button className="btn-primary" type="button" onClick={handleSignIn}>
              Googleでログイン
            </button>
          </div>
        )}

        {state.user && (
          <div className="sync-status">
            <div className="sync-user">ログイン中: {state.user.email || 'No email'}</div>
            <div className="sync-actions">
              <button
                className="btn-primary"
                type="button"
                onClick={handleSave}
                disabled={isSaving || isRestoring || state.remaining <= 0}
              >
                クラウドに保存（残り{state.remaining}回）
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={handleRestore}
                disabled={isSaving || isRestoring}
              >
                クラウドから復元
              </button>
              <button className="btn-ghost" type="button" onClick={handleSignOut} disabled={isSaving || isRestoring}>
                ログアウト
              </button>
            </div>
          </div>
        )}

        <div className="sync-remaining">残り回数: {state.remaining} / {SYNC_LIMIT}</div>

        {state.status && <div className="sync-message sync-message--ok">{state.status}</div>}
        {state.error && <div className="sync-message sync-message--error">{state.error}</div>}
      </div>
    </div>
  );
}
