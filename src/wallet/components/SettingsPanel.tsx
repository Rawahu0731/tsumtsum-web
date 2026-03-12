import { useEffect, useState } from 'react';
import './SettingsPanel.css';
import { loadData, saveData } from '../storage';

export default function SettingsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [primaryGoal, setPrimaryGoal] = useState<number>(0);
    const [primaryGoals, setPrimaryGoals] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
    const [secondaryGoal, setSecondaryGoal] = useState<number>(100);
    const [secondaryGoals, setSecondaryGoals] = useState<number[]>([100, 100, 100, 100, 100, 100, 100]);
    const [showGoalLine, setShowGoalLine] = useState<boolean>(true);
    const [weeklyPrimaryGoal, setWeeklyPrimaryGoal] = useState<number>(0);
    const [weeklySecondaryGoal, setWeeklySecondaryGoal] = useState<number>(0);
    const [ocrLeft, setOcrLeft] = useState<number>(50);
    const [ocrTop, setOcrTop] = useState<number>(17);
    const [ocrRight, setOcrRight] = useState<number>(67);
    const [ocrBottom, setOcrBottom] = useState<number>(20);

    useEffect(() => {
        const data = loadData();
        if (data?.settings) {
            setShowGoalLine(data.settings.showGoalLine ?? true);
            setWeeklyPrimaryGoal(typeof data.settings.weeklyPrimaryGoal === 'number' ? data.settings.weeklyPrimaryGoal : 0);
            setWeeklySecondaryGoal(typeof data.settings.weeklySecondaryGoal === 'number'
                ? data.settings.weeklySecondaryGoal
                : (typeof data.settings.weeklyPrimaryGoal === 'number' ? data.settings.weeklyPrimaryGoal + 100 : 0)
            );
            // primary
            if (Array.isArray(data.settings.primaryGoals) && data.settings.primaryGoals.length === 7) {
                setPrimaryGoals(data.settings.primaryGoals);
                setPrimaryGoal(data.settings.primaryGoals[new Date().getDay()] ?? 0);
            } else if (typeof data.settings.primaryGoal === 'number') {
                setPrimaryGoal(data.settings.primaryGoal);
                setPrimaryGoals(Array(7).fill(data.settings.primaryGoal));
            } else if (Array.isArray(data.settings.dailyGoals) && data.settings.dailyGoals.length === 7) {
                // 旧仕様を primary として扱う
                setPrimaryGoals(data.settings.dailyGoals);
                setPrimaryGoal(data.settings.dailyGoals[new Date().getDay()] ?? 0);
            } else {
                setPrimaryGoal(data.settings.dailyGoal ?? 0);
                setPrimaryGoals(Array(7).fill(data.settings.dailyGoal ?? 0));
            }
            // secondary
            if (Array.isArray(data.settings.secondaryGoals) && data.settings.secondaryGoals.length === 7) {
                setSecondaryGoals(data.settings.secondaryGoals);
                setSecondaryGoal(data.settings.secondaryGoals[new Date().getDay()] ?? 0);
            } else if (typeof data.settings.secondaryGoal === 'number') {
                setSecondaryGoal(data.settings.secondaryGoal);
                setSecondaryGoals(Array(7).fill(data.settings.secondaryGoal));
            } else {
                // 初期化: primary + 固定差分(100)
                const base = (typeof data.settings.primaryGoal === 'number') ? data.settings.primaryGoal : (data.settings.dailyGoal ?? 0);
                setSecondaryGoal(base + 100);
                setSecondaryGoals(Array(7).fill(base + 100));
            }
            const crop = data.settings.ocrCrop;
            setOcrLeft(crop?.left ?? 50);
            setOcrTop(crop?.top ?? 17);
            setOcrRight(crop?.right ?? 67);
            setOcrBottom(crop?.bottom ?? 20);
        }
    }, [isOpen]);

    // (週目標は保存時にまとめて保存します)

    function handleSave() {
        // バリデーション
        if ((Number(primaryGoal) || 0) <= 0) {
            alert('第一段階目標は0より大きい値を入力してください。');
            return;
        }
        if ((Number(secondaryGoal) || 0) <= Number(primaryGoal)) {
            alert('第二段階目標は第一段階目標より大きい値を入力してください。');
            return;
        }
        if ((Number(weeklyPrimaryGoal) || 0) <= 0) {
            alert('週目標（第一段階）は0より大きい値を入力してください。');
            return;
        }
        if ((Number(weeklySecondaryGoal) || 0) <= Number(weeklyPrimaryGoal)) {
            alert('週目標（第二段階）は第一段階より大きい値を入力してください。');
            return;
        }

        const data = loadData() || { initialCoinAmount: 0, records: [], settings: {} };
        data.settings = {
            // primary / secondary を保存
            primaryGoal: Number(primaryGoal) || primaryGoals[new Date().getDay()] || 0,
            primaryGoals: primaryGoals.map((v) => Number(v) || 0),
            secondaryGoal: Number(secondaryGoal) || secondaryGoals[new Date().getDay()] || 0,
            secondaryGoals: secondaryGoals.map((v) => Number(v) || 0),
            showGoalLine: !!showGoalLine,
            weeklyPrimaryGoal: Number(weeklyPrimaryGoal) || 0,
            weeklySecondaryGoal: Number(weeklySecondaryGoal) || 0,
            ocrCrop: {
                left: Number(ocrLeft) || 50,
                top: Number(ocrTop) || 17,
                right: Number(ocrRight) || 67,
                bottom: Number(ocrBottom) || 20,
            },
            // 互換性のため旧フィールドに primary を入れておく
            dailyGoal: Number(primaryGoal) || primaryGoals[new Date().getDay()] || 0,
            dailyGoals: primaryGoals.map((v) => Number(v) || 0),
        };
        saveData(data);
        // notify other parts of app
        window.dispatchEvent(new CustomEvent('tsumtsum-data-changed'));
        onClose();
    }

    // debt-related functions removed

    return (
        <aside className={`settings-panel ${isOpen ? 'settings-panel--open' : ''}`}>
            <div className="settings-panel__header">
                <h3>設定</h3>
                <button className="settings-panel__close" onClick={onClose} aria-label="閉じる">✕</button>
            </div>

            <div className="settings-panel__body">
                <div className="settings-row">
                    <div className="settings-row__label">曜日別の目標（第一 / 第二）</div>
                    <div className="weekday-goals">
                        <div className="weekday-goals__header">
                            <div className="weekday-goals__label">曜日</div>
                            <div className="weekday-goals__col-header">第一段階</div>
                            <div className="weekday-goals__col-header">第二段階</div>
                        </div>
                        {['日','月','火','水','木','金','土'].map((label, idx) => (
                            <div key={label} className="weekday-goals__item">
                                <div className="weekday-goals__label">{label}</div>
                                <div className="weekday-goals__cell">
                                    <div className="weekday-goals__hint">第一</div>
                                    <input
                                        className="weekday-goals__input"
                                        type="number"
                                        min={0}
                                        value={primaryGoals[idx]}
                                        onChange={(e) => {
                                            const next = [...primaryGoals];
                                            next[idx] = Number(e.target.value) || 0;
                                            setPrimaryGoals(next);
                                            setPrimaryGoal(next[new Date().getDay()]);
                                        }}
                                    />
                                </div>
                                <div className="weekday-goals__cell">
                                    <div className="weekday-goals__hint">第二</div>
                                    <input
                                        className="weekday-goals__input"
                                        type="number"
                                        min={0}
                                        value={secondaryGoals[idx]}
                                        onChange={(e) => {
                                            const next = [...secondaryGoals];
                                            next[idx] = Number(e.target.value) || 0;
                                            setSecondaryGoals(next);
                                            setSecondaryGoal(next[new Date().getDay()]);
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <label className="settings-row">
                    <div className="settings-row__label">グラフに目標線を表示</div>
                    <input
                        type="checkbox"
                        checked={showGoalLine}
                        onChange={(e) => setShowGoalLine(e.target.checked)}
                    />
                </label>

                <label className="settings-row">
                    <div className="settings-row__label">週目標</div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 12 }}>Weekly Goal – 第一段階</div>
                            <input type="number" min={0} value={weeklyPrimaryGoal} onChange={(e) => setWeeklyPrimaryGoal(Number(e.target.value) || 0)} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 12 }}>Weekly Goal – 第二段階</div>
                            <input type="number" min={0} value={weeklySecondaryGoal} onChange={(e) => setWeeklySecondaryGoal(Number(e.target.value) || 0)} />
                        </div>
                    </div>
                </label>

                <div className="settings-row">
                    <div className="settings-row__label">画像OCRの切り取り（単位: %）</div>
                    <div className="ocr-controls">
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 12 }}>Left</div>
                            <input type="number" min={0} max={100} value={ocrLeft} onChange={(e) => setOcrLeft(Number(e.target.value) || 0)} />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 12 }}>Top</div>
                            <input type="number" min={0} max={100} value={ocrTop} onChange={(e) => setOcrTop(Number(e.target.value) || 0)} />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 12 }}>Right</div>
                            <input type="number" min={0} max={100} value={ocrRight} onChange={(e) => setOcrRight(Number(e.target.value) || 0)} />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 12 }}>Bottom</div>
                            <input type="number" min={0} max={100} value={ocrBottom} onChange={(e) => setOcrBottom(Number(e.target.value) || 0)} />
                        </label>
                        <div className="ocr-note">コイン枚数部分のみが含まれるように設定してください。コインマークなどが含まれると正しく認識できない場合があります。</div>
                    </div>
                </div>
            </div>

            <div className="settings-panel__footer">
                <button className="btn btn--ghost" onClick={onClose}>キャンセル</button>
                <button className="btn btn--primary" onClick={handleSave}>保存</button>
            </div>
        </aside>
    );
}
