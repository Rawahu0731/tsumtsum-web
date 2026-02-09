import { useEffect, useState } from 'react';
import './SettingsPanel.css';
import { loadData, saveData } from '../storage';

export default function SettingsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [dailyGoal, setDailyGoal] = useState<number>(0);
    const [dailyGoals, setDailyGoals] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
    const [showGoalLine, setShowGoalLine] = useState<boolean>(true);
    const [ocrLeft, setOcrLeft] = useState<number>(50);
    const [ocrTop, setOcrTop] = useState<number>(17);
    const [ocrRight, setOcrRight] = useState<number>(67);
    const [ocrBottom, setOcrBottom] = useState<number>(20);

    useEffect(() => {
        const data = loadData();
        if (data?.settings) {
            setDailyGoal(data.settings.dailyGoal ?? 0);
            setShowGoalLine(data.settings.showGoalLine ?? true);
            if (Array.isArray(data.settings.dailyGoals) && data.settings.dailyGoals.length === 7) {
                setDailyGoals(data.settings.dailyGoals);
            } else {
                // 互換性: 単一目標がある場合は全曜日に適用
                setDailyGoals(Array(7).fill(data.settings.dailyGoal ?? 0));
            }
            const crop = data.settings.ocrCrop;
            setOcrLeft(crop?.left ?? 50);
            setOcrTop(crop?.top ?? 17);
            setOcrRight(crop?.right ?? 67);
            setOcrBottom(crop?.bottom ?? 20);
        }
    }, [isOpen]);

    function handleSave() {
        const data = loadData() || { initialCoinAmount: 0, records: [], settings: {} };
        data.settings = {
            dailyGoal: Number(dailyGoal) || dailyGoals[new Date().getDay()] || 0,
            dailyGoals: dailyGoals.map((v) => Number(v) || 0),
            showGoalLine: !!showGoalLine,
            ocrCrop: {
                left: Number(ocrLeft) || 50,
                top: Number(ocrTop) || 17,
                right: Number(ocrRight) || 67,
                bottom: Number(ocrBottom) || 20,
            },
        };
        saveData(data);
        // notify other parts of app
        window.dispatchEvent(new CustomEvent('tsumtsum-data-changed'));
        onClose();
    }

    return (
        <aside className={`settings-panel ${isOpen ? 'settings-panel--open' : ''}`}>
            <div className="settings-panel__header">
                <h3>設定</h3>
                <button className="settings-panel__close" onClick={onClose} aria-label="閉じる">✕</button>
            </div>

            <div className="settings-panel__body">
                <div className="settings-row">
                    <div className="settings-row__label">曜日別のコイン目標</div>
                    <div className="weekday-goals">
                        {['日','月','火','水','木','金','土'].map((label, idx) => (
                            <label key={label} className="weekday-goals__item">
                                <div className="weekday-goals__label">{label}</div>
                                <input
                                    type="number"
                                    min={0}
                                    value={dailyGoals[idx]}
                                    onChange={(e) => {
                                        const next = [...dailyGoals];
                                        next[idx] = Number(e.target.value) || 0;
                                        setDailyGoals(next);
                                    }}
                                />
                            </label>
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
