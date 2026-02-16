import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    format,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachWeekOfInterval,
    isWithinInterval,
    parseISO,
    eachDayOfInterval,
    subDays,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import type { AppData, CoinRecord, PeriodStats } from '../types';
import { loadData, exportData, importData, getLastCoinAmount, calculateDebt, getRecordDailyGoal } from '../storage';
import Calendar from '../components/Calendar';
import './StatsPage.css';
import { Line, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

// 全期間統計を計算
function calculateTotalStats(records: CoinRecord[]) {
    return records.reduce(
        (acc, record) => ({
            earned: acc.earned + record.earned,
            premiumBox: acc.premiumBox + record.premiumBox,
            other: acc.other + record.other,
            serebo: acc.serebo + (record.serebo ?? 0),
            pick: acc.pick + (record.pick ?? 0),
        }),
        { earned: 0, premiumBox: 0, other: 0, serebo: 0, pick: 0 }
    );
}

// 週ごとの統計を計算（月曜始まり）
function calculateWeeklyStats(records: CoinRecord[]): PeriodStats[] {
    if (records.length === 0) return [];

    const dates = records.map((r) => parseISO(r.date));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    const weeks = eachWeekOfInterval(
        { start: minDate, end: maxDate },
        { weekStartsOn: 1 }
    );

    return weeks.map((weekStart) => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekRecords = records.filter((r) => {
            const date = parseISO(r.date);
            return isWithinInterval(date, { start: weekStart, end: weekEnd });
        });

        const stats = calculateTotalStats(weekRecords);
        return {
            label: `${format(weekStart, 'M/d', { locale: ja })} - ${format(weekEnd, 'M/d', { locale: ja })}`,
            startDate: format(weekStart, 'yyyy-MM-dd'),
            endDate: format(weekEnd, 'yyyy-MM-dd'),
            ...stats,
        };
    }).filter((s) => s.earned > 0 || s.premiumBox > 0 || s.other > 0);
}

// 月ごとの統計を計算
function calculateMonthlyStats(records: CoinRecord[]): PeriodStats[] {
    if (records.length === 0) return [];

    const monthMap = new Map<string, PeriodStats>();

    for (const record of records) {
        const date = parseISO(record.date);
        const monthKey = format(date, 'yyyy-MM');

            if (!monthMap.has(monthKey)) {
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);
            monthMap.set(monthKey, {
                label: format(date, 'yyyy年 M月', { locale: ja }),
                startDate: format(monthStart, 'yyyy-MM-dd'),
                endDate: format(monthEnd, 'yyyy-MM-dd'),
                    earned: 0,
                    premiumBox: 0,
                    other: 0,
                    serebo: 0,
                    pick: 0,
            });
        }

        const stats = monthMap.get(monthKey)!;
        stats.earned += record.earned;
        stats.premiumBox += record.premiumBox;
        stats.other += record.other;
            stats.serebo += (record.serebo ?? 0);
            stats.pick += (record.pick ?? 0);
    }

    return Array.from(monthMap.values()).sort((a, b) =>
        b.startDate.localeCompare(a.startDate)
    );
}

// 数値フォーマット
function formatNumber(num: number): string {
    return num.toLocaleString();
}

export default function StatsPage() {
    const [appData, setAppData] = useState<AppData | null>(null);
    const [showAllMonthly, setShowAllMonthly] = useState(false);
    const [showAllWeekly, setShowAllWeekly] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // データ読み込み
    useEffect(() => {
        const data = loadData();
        setAppData(data);
        const onChange = () => setAppData(loadData());
        window.addEventListener('tsumtsum-data-changed', onChange);
        return () => window.removeEventListener('tsumtsum-data-changed', onChange);
    }, []);

    const records = appData?.records ?? [];
    const totalStats = useMemo(() => calculateTotalStats(records), [records]);
    const weeklyStats = useMemo(() => calculateWeeklyStats(records), [records]);
    const monthlyStats = useMemo(() => calculateMonthlyStats(records), [records]);

    // 直近7日間の獲得データを計算
    const last7 = useMemo(() => {
        const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
        const labels = days.map((d) => format(d, 'M/d', { locale: ja }));
        const keys = days.map((d) => format(d, 'yyyy-MM-dd'));
        
        // 各日の獲得合計とレコードを取得
        const data = keys.map((key) => {
            const dayRecords = records.filter(r => r.date === key);
            return dayRecords.reduce((acc, r) => acc + r.earned, 0);
        });
        
        // 各日のゴール（その日のレコードから取得、なければ現在の設定）
        const goals = keys.map((key) => {
            const dayRecords = records.filter(r => r.date === key);
            if (dayRecords.length > 0) {
                // その日のレコードがある場合、最初のレコードの目標を使う
                return getRecordDailyGoal(dayRecords[0], appData?.settings);
            }
            // レコードがない場合は現在の設定
            const date = new Date(key);
            const dg = appData?.settings?.dailyGoals;
            if (Array.isArray(dg) && dg.length === 7) {
                return dg[date.getDay()] ?? 0;
            }
            return appData?.settings?.dailyGoal ?? 0;
        });
        
        return { labels, data, keys, goals };
    }, [records, appData]);

    // 今日の獲得と目標までの残りを計算
    const todayStats = useMemo(() => {
        const key = format(new Date(), 'yyyy-MM-dd');
        const earned = records.reduce((acc, r) => acc + (r.date === key ? r.earned : 0), 0);
        return { key, earned };
    }, [records]);

    const getGoalForDate = useCallback((date: Date) => {
        const dg = appData?.settings?.dailyGoals;
        if (Array.isArray(dg) && dg.length === 7) {
            return dg[date.getDay()] ?? 0;
        }
        return appData?.settings?.dailyGoal ?? 0;
    }, [appData]);

    const todayGoal = getGoalForDate(new Date());
    const remainingToday = Math.max(0, todayGoal - todayStats.earned);

    // 負債を計算
    const currentDebt = useMemo(() => {
        if (!appData) return 0;
        return calculateDebt(appData.records, appData.settings);
    }, [appData]);

    const currentCoins = appData ? getLastCoinAmount(appData) : 0;
    const targetTotal = currentCoins + remainingToday;

    const chartData = useMemo(() => {
        const labels = last7.labels;
        const data = last7.data;
        const goalData = last7.goals;

        // ポイントの色付け: earned >= dailyGoalAtThatDay なら緑、未達なら赤
        const pointColors = data.map((v, i) => {
            const goal = goalData[i] ?? 0;
            if (typeof goal === 'number' && goal > 0) {
                return v >= goal ? '#16a34a' : '#dc2626';
            }
            return '#10b981';
        });

        const ds: any[] = [];
        ds.push({
            label: '獲得コイン',
            data,
            fill: false,
            borderColor: '#059669',
            backgroundColor: '#10b981',
            tension: 0.3,
            pointRadius: 6,
            pointBackgroundColor: pointColors,
            pointBorderColor: pointColors,
        });

        const showGoal = appData?.settings?.showGoalLine ?? true;
        if (showGoal) {
            const hasAnyGoal = goalData.some((v) => typeof v === 'number' && v > 0);
            if (hasAnyGoal) {
                ds.push({
                    label: '目標',
                    data: goalData,
                    borderColor: '#dc2626',
                    borderWidth: 2,
                    pointRadius: 0,
                    borderDash: [6, 4],
                    fill: false,
                    tension: 0,
                });
            }
        }

        return { labels, datasets: ds };
    }, [last7, appData]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
        },
        scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
        },
    }), []);

    // 使ったコインの割合（プレボ・セレボ・ピック・その他）
    const usageTotals = useMemo(() => {
        const premium = records.reduce((s, r) => s + (r.premiumBox ?? 0), 0);
        const serebo = records.reduce((s, r) => s + (r.serebo ?? 0), 0);
        const pick = records.reduce((s, r) => s + (r.pick ?? 0), 0);
        const other = records.reduce((s, r) => s + (r.other ?? 0), 0);
        const total = premium + serebo + pick + other;
        return { premium, serebo, pick, other, total };
    }, [records]);

    // 表示件数制御（最新5件）
    const displayedMonthly = showAllMonthly ? monthlyStats : monthlyStats.slice(0, 5);
    const reversedWeekly = weeklyStats.slice().reverse();
    const displayedWeekly = showAllWeekly ? reversedWeekly : reversedWeekly.slice(0, 5);

    const pieData = useMemo(() => ({
        labels: ['プレボ', 'セレボ', 'ピック', 'その他'],
        datasets: [
            {
                data: [usageTotals.premium, usageTotals.serebo, usageTotals.pick, usageTotals.other],
                backgroundColor: ['#7c3aed', '#0ea5b0', '#dc2626', '#d97706'],
                hoverOffset: 6,
            },
        ],
    }), [usageTotals]);

    const pieOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' as const },
        },
    }), []);

    // エクスポート処理
    const handleExport = useCallback(() => {
        if (!appData) return;

        const json = exportData(appData);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `tsumtsum-wallet-${format(new Date(), 'yyyyMMdd-HHmmss')}.json`;
        a.click();

        URL.revokeObjectURL(url);
        setMessage({ type: 'success', text: 'データをエクスポートしました。' });
        setTimeout(() => setMessage(null), 3000);
    }, [appData]);

    // インポート処理
    const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const json = event.target?.result as string;
            const result = importData(json);

            if (result.success) {
                setAppData(result.data);
                setMessage({ type: 'success', text: 'データをインポートしました。' });
            } else {
                setMessage({ type: 'error', text: result.error });
            }
            setTimeout(() => setMessage(null), 5000);
        };
        reader.readAsText(file);

        // inputをリセット
        e.target.value = '';
    }, []);

    // データがない場合
    if (!appData) {
        return (
            <div className="stats-page">
                <div className="stats-page__header">
                    <h2 className="stats-page__title">統計</h2>
                </div>
                <div className="stats-card">
                    <div className="empty-state">
                        <svg className="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <p className="empty-state__text">
                            まだデータがありません。<br />
                            登録ページでコインを記録してください。
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="stats-page">
            <div className="stats-page__header">
                <h2 className="stats-page__title">統計</h2>
                <p className="stats-page__subtitle">コインの獲得・使用状況を確認</p>
            </div>

            {message && (
                <div className={`stats-message stats-message--${message.type}`}>
                    {message.text}
                </div>
            )}

            {/* カレンダー */}
            <section className="stats-section">
                <Calendar
                    records={records}
                    currentMonth={currentMonth}
                    onMonthChange={setCurrentMonth}
                />
            </section>

            {/* 全期間統計 */}
            <section className="stats-section">
                <h3 className="stats-section__title">全期間合計</h3>
                <div className="stats-card">
                    <div className="total-stats">
                        <div className="total-stat total-stat--earned">
                            <span className="total-stat__label">獲得</span>
                            <span className="total-stat__value">+{formatNumber(totalStats.earned)}</span>
                        </div>
                        <div className="total-stat total-stat--premium">
                            <span className="total-stat__label">プレボ</span>
                            <span className="total-stat__value">-{formatNumber(totalStats.premiumBox)}</span>
                        </div>
                        <div className="total-stat total-stat--serebo">
                            <span className="total-stat__label">セレボ</span>
                            <span className="total-stat__value">-{formatNumber(totalStats.serebo)}</span>
                        </div>
                        <div className="total-stat total-stat--pick">
                            <span className="total-stat__label">ピック</span>
                            <span className="total-stat__value">-{formatNumber(totalStats.pick)}</span>
                        </div>
                        <div className="total-stat total-stat--other">
                            <span className="total-stat__label">その他</span>
                            <span className="total-stat__value">-{formatNumber(totalStats.other)}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 直近7日間グラフ */}
            <section className="stats-section">
                <h3 className="stats-section__title">直近7日間の獲得</h3>
                    {/* 目標表示は専用セクションに移動しました */}
                <div className="stats-card">
                    <div className="chart-container">
                        <Line data={chartData} options={chartOptions} />
                    </div>
                </div>
            </section>

                {/* 目標（専用セクション） */}
                <section className="stats-section">
                    <h3 className="stats-section__title">目標</h3>
                    <div className="stats-card">
                        {(appData?.settings?.showGoalLine && (todayGoal ?? 0) > 0) ? (
                            <div className="stats-section__goal">
                                <div>今日の目標: {formatNumber(todayGoal ?? 0)} コイン</div>
                                <div className={`stats-section__today ${remainingToday === 0 ? 'stats-section__today--done' : ''}`}>
                                    {remainingToday === 0 ? (
                                        <>今日の目標は達成済みです</>
                                    ) : (
                                        <>
                                            今日あと {formatNumber(remainingToday)} コインで目標達成
                                            <div className="stats-section__target">現在 {formatNumber(currentCoins)} → 合計 {formatNumber(targetTotal)} コイン</div>
                                        </>
                                    )}
                                </div>
                                {currentDebt > 0 && (
                                    <div className="stats-section__debt">
                                        <div style={{ marginTop: '12px', fontSize: '14px', color: '#dc2626' }}>
                                            <strong>現在の負債:</strong> {formatNumber(currentDebt)} コイン
                                        </div>
                                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                                            ※過去の未達成分の累積です（今日の目標には含まれません）
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="empty-state">目標が設定されていません。</div>
                        )}
                    </div>
                </section>

            {/* 月別統計 */}
            {monthlyStats.length > 0 && (
                <section className="stats-section">
                    <h3 className="stats-section__title">月別集計</h3>
                    <div className="stats-card">
                        <table className="period-stats-table">
                            <thead>
                                    <tr>
                                        <th>期間</th>
                                        <th>獲得</th>
                                        <th>プレボ</th>
                                        <th>セレボ</th>
                                        <th>ピック</th>
                                        <th>その他</th>
                                    </tr>
                            </thead>
                            <tbody>
                                {displayedMonthly.map((stats) => (
                                    <tr key={stats.startDate}>
                                        <td>{stats.label}</td>
                                        <td className="period-stats-table__earned">+{formatNumber(stats.earned)}</td>
                                        <td className="period-stats-table__premium">-{formatNumber(stats.premiumBox)}</td>
                                        <td className="period-stats-table__serebo">-{formatNumber(stats.serebo)}</td>
                                        <td className="period-stats-table__pick">-{formatNumber(stats.pick)}</td>
                                        <td className="period-stats-table__other">-{formatNumber(stats.other)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {monthlyStats.length > 5 && (
                        <div>
                            <button
                                className="stats-section__toggle stats-section__toggle--under"
                                onClick={() => setShowAllMonthly((s) => !s)}
                            >
                                {showAllMonthly ? '閉じる' : 'もっと見る'}
                            </button>
                        </div>
                    )}
                </section>
            )}

            {/* 週別統計 */}
            {weeklyStats.length > 0 && (
                <section className="stats-section">
                    <h3 className="stats-section__title">週別集計</h3>
                    <div className="stats-card">
                        <table className="period-stats-table">
                            <thead>
                                <tr>
                                    <th>期間</th>
                                    <th>獲得</th>
                                    <th>プレボ</th>
                                    <th>セレボ</th>
                                    <th>ピック</th>
                                    <th>その他</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedWeekly.map((stats) => (
                                    <tr key={stats.startDate}>
                                        <td>{stats.label}</td>
                                        <td className="period-stats-table__earned">+{formatNumber(stats.earned)}</td>
                                        <td className="period-stats-table__premium">-{formatNumber(stats.premiumBox)}</td>
                                        <td className="period-stats-table__serebo">-{formatNumber(stats.serebo)}</td>
                                        <td className="period-stats-table__pick">-{formatNumber(stats.pick)}</td>
                                        <td className="period-stats-table__other">-{formatNumber(stats.other)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {weeklyStats.length > 5 && (
                        <div>
                            <button
                                className="stats-section__toggle stats-section__toggle--under"
                                onClick={() => setShowAllWeekly((s) => !s)}
                            >
                                {showAllWeekly ? '閉じる' : 'もっと見る'}
                            </button>
                        </div>
                    )}
                </section>
            )}

            {/* 使い道割合（円グラフ） */}
            <section className="stats-section">
                <h3 className="stats-section__title">使い道の割合</h3>
                <div className="stats-card">
                    {usageTotals.total === 0 ? (
                        <div className="empty-state">使用が記録されていません。</div>
                    ) : (
                        <div className="pie-chart-container">
                            <Pie data={pieData} options={pieOptions} />
                        </div>
                    )}
                </div>
            </section>

            {/* データ管理 */}
            <section className="stats-section">
                <h3 className="stats-section__title">データ管理</h3>
                <div className="stats-card">
                        <div className="data-actions">
                        <button className="data-button data-button--export" onClick={handleExport}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            エクスポート
                        </button>
                        <button
                            className="data-button data-button--import"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            インポート
                        </button>
                        
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            className="hidden-input"
                            onChange={handleImport}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}
