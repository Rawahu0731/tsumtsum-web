import { useEffect, useState } from 'react';
import './SettingsPanel.css';
import { loadData, saveData } from '../storage';

export default function SettingsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [dailyGoal, setDailyGoal] = useState<number>(0);
    const [showGoalLine, setShowGoalLine] = useState<boolean>(true);

    useEffect(() => {
        const data = loadData();
        if (data?.settings) {
            setDailyGoal(data.settings.dailyGoal ?? 0);
            setShowGoalLine(data.settings.showGoalLine ?? true);
        }
    }, [isOpen]);

    function handleSave() {
        const data = loadData() || { initialCoinAmount: 0, records: [], settings: {} };
        data.settings = {
            dailyGoal: Number(dailyGoal) || 0,
            showGoalLine: !!showGoalLine,
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
                <label className="settings-row">
                    <div className="settings-row__label">一日あたりのコイン目標</div>
                    <input
                        type="number"
                        min={0}
                        value={dailyGoal}
                        onChange={(e) => setDailyGoal(Number(e.target.value))}
                    />
                </label>

                <label className="settings-row">
                    <div className="settings-row__label">グラフに目標線を表示</div>
                    <input
                        type="checkbox"
                        checked={showGoalLine}
                        onChange={(e) => setShowGoalLine(e.target.checked)}
                    />
                </label>
            </div>

            <div className="settings-panel__footer">
                <button className="btn btn--ghost" onClick={onClose}>キャンセル</button>
                <button className="btn btn--primary" onClick={handleSave}>保存</button>
            </div>
        </aside>
    );
}
