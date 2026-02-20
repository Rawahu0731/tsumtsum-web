import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import type { AppData, RecordMode } from '../types';
import {
    loadData,
    initializeData,
    getLastCoinAmount,
    getLastRecordTimestamp,
    addRecord,
    undoLastSessionRecord,
    hasSessionUndo,
} from '../storage';
import './RegisterPage.css';
import PasteCoin from '../components/PasteCoin';

export default function RegisterPage() {
    const [appData, setAppData] = useState<AppData | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [initialCoin, setInitialCoin] = useState('');

    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [mode, setMode] = useState<RecordMode>('add');
    const [coinAmount, setCoinAmount] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // データ読み込み
    useEffect(() => {
        const data = loadData();
        setAppData(data);
        if (!data) {
            setIsInitializing(true);
        }
    }, []);

    // 初期設定処理
    const handleInitialize = useCallback(() => {
        const amount = parseInt(initialCoin, 10);
        if (isNaN(amount) || amount < 0) {
            setError('正しいコイン枚数を入力してください。');
            return;
        }
        const data = initializeData(amount);
        setAppData(data);
        setIsInitializing(false);
        setError('');
    }, [initialCoin]);

    // 登録処理
    const handleSubmit = useCallback(() => {
        if (!appData) return;
        setError('');
        setSuccess('');

        const amount = parseInt(coinAmount, 10);
        if (isNaN(amount) || amount < 0) {
            setError('正しいコイン枚数を入力してください。');
            return;
        }

        const result = addRecord(appData, date, amount, mode);
        if (result.success) {
            setAppData(result.data);
            setCoinAmount('');
            setSuccess('登録しました！');
            setTimeout(() => setSuccess(''), 3000);
        } else {
            setError(result.error);
        }
    }, [appData, date, mode, coinAmount]);

    const handleUndo = useCallback(() => {
        if (!appData) {
            setError('データが存在しません。');
            return;
        }
        if (!confirm('直前の操作を取り消します。よろしいですか？')) return;

        const result = undoLastSessionRecord(appData);
        if (result.success) {
            setAppData(result.data);
            setSuccess('直前の操作を取り消しました。');
            setError('');
            window.dispatchEvent(new CustomEvent('tsumtsum-data-changed'));
            setTimeout(() => setSuccess(''), 3000);
            setHasSessionUndoState(hasSessionUndo());
        } else {
            setError(result.error);
        }
    }, [appData]);

    const [hasSessionUndoState, setHasSessionUndoState] = useState<boolean>(false);

    useEffect(() => {
        setHasSessionUndoState(hasSessionUndo());
    }, [appData]);

    // 差分計算
    const lastCoin = appData ? getLastCoinAmount(appData) : 0;
    const lastRecordTimestamp = appData ? getLastRecordTimestamp(appData) : null;
    const lastRecordDateTime = lastRecordTimestamp ? format(new Date(lastRecordTimestamp), 'yyyy-MM-dd HH:mm:ss') : null;
    const currentCoin = parseInt(coinAmount, 10);
    const diff = !isNaN(currentCoin) ? currentCoin - lastCoin : null;

    // 初期設定画面
    if (isInitializing) {
        return (
            <div className="register-page">
                <div className="register-page__header">
                    <h2 className="register-page__title">初期設定</h2>
                    <p className="register-page__subtitle">
                        現在お持ちのコイン枚数を入力してください
                    </p>
                </div>

                <div className="register-card">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label className="form-label">現在のコイン枚数</label>
                        <input
                            type="number"
                            className="form-input form-input--large"
                            placeholder="0"
                            value={initialCoin}
                            onChange={(e) => setInitialCoin(e.target.value)}
                            min="0"
                        />
                    </div>

                    <button className="submit-button" onClick={handleInitialize}>
                        設定を完了
                    </button>
                </div>
            </div>
        );
    }

    // 通常画面
    return (
        <div className="register-page">
            <div className="register-page__header">
                <h2 className="register-page__title">コイン登録</h2>
                <p className="register-page__subtitle">
                    コインの増減を記録しましょう
                </p>
            </div>

            {lastRecordDateTime && (
                <div className="last-record-date last-record-date--outside">前回登録：{lastRecordDateTime}</div>
            )}

            <div className="register-card">
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                {/* 前回コイン情報 */}
                <div className="last-coin-info">
                    <span className="last-coin-info__label">現在のコイン</span>
                    <span className="last-coin-info__value">
                        <div className="last-coin-info__value-main">{lastCoin.toLocaleString()}</div>
                    </span>
                </div>

                {/* 日付入力 */}
                <div className="form-group">
                    <label className="form-label">日付</label>
                    <input
                        type="date"
                        className="form-input"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>

                {/* モード選択 */}
                <div className="form-group">
                    <label className="form-label">モード</label>
                    <div className="mode-selector">
                        <button
                            type="button"
                            className={`mode-button mode-button--add ${mode === 'add' ? 'mode-button--active' : ''}`}
                            onClick={() => setMode('add')}
                        >
                            追加
                        </button>
                        <button
                            type="button"
                            className={`mode-button mode-button--premium ${mode === 'premium' ? 'mode-button--active' : ''}`}
                            onClick={() => setMode('premium')}
                        >
                            プレボ
                        </button>
                        <button
                            type="button"
                            className={`mode-button mode-button--serebo ${mode === 'serebo' ? 'mode-button--active' : ''}`}
                            onClick={() => setMode('serebo')}
                        >
                            セレボ
                        </button>
                        <button
                            type="button"
                            className={`mode-button mode-button--pick ${mode === 'pick' ? 'mode-button--active' : ''}`}
                            onClick={() => setMode('pick')}
                        >
                            ピック
                        </button>
                        <button
                            type="button"
                            className={`mode-button mode-button--other ${mode === 'other' ? 'mode-button--active' : ''}`}
                            onClick={() => setMode('other')}
                        >
                            その他
                        </button>
                        
                    </div>
                </div>

                {/* 現在のコイン量入力 */}
                <div className="form-group">
                    <label className="form-label">現在のコイン枚数</label>
                    <input
                        type="number"
                        className="form-input form-input--large"
                        placeholder="0"
                        value={coinAmount}
                        onChange={(e) => setCoinAmount(e.target.value)}
                        min="0"
                    />
                    <PasteCoin onApply={(amount: number) => setCoinAmount(String(amount))} />
                </div>

                {/* 差分プレビュー */}
                {diff !== null && (
                    <div className="diff-preview">
                        <span
                            className={`diff-preview__value ${diff >= 0 ? 'diff-preview__value--positive' : 'diff-preview__value--negative'}`}
                        >
                            {diff >= 0 ? '+' : ''}{diff.toLocaleString()}
                        </span>
                        <span className="diff-preview__label">枚</span>
                    </div>
                )}

                {/* 登録ボタン */}
                <button
                    className="submit-button"
                    onClick={handleSubmit}
                    disabled={!coinAmount}
                >
                    登録する
                </button>
                {hasSessionUndoState && (
                    <button
                        type="button"
                        className="submit-button submit-button--undo"
                        onClick={handleUndo}
                        aria-label="直前の登録を取り消す"
                        style={{ marginTop: 8 }}
                    >
                        取り消す
                    </button>
                )}
            </div>
        </div>
    );
}
