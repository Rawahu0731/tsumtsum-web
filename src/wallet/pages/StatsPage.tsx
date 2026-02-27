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
import { loadData, exportData, importData, getLastCoinAmount, calculateDebt, getRecordDailyGoal, getRecordSecondaryGoal, getSecondaryGoalForDate } from '../storage';
import Calendar from '../components/Calendar';
import TodayHero from '../components/TodayHero';
import './StatsPage.css';
import { Line, Pie } from 'react-chartjs-2';
import { Chart as ChartType } from 'chart.js';
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
        // 各日のゴール（primary/secondary）を決定
        const primaryGoals = keys.map((key) => {
            const dayRecords = records.filter(r => r.date === key);
            if (dayRecords.length > 0) {
                return getRecordDailyGoal(dayRecords[0], appData?.settings);
            }
            const date = new Date(key);
            // primary: 設定の primaryGoals/primaryGoal へフォールバック
            const pgArr = appData?.settings?.primaryGoals;
            if (Array.isArray(pgArr) && pgArr.length === 7) return pgArr[date.getDay()] ?? 0;
            if (typeof appData?.settings?.primaryGoal === 'number') return appData!.settings!.primaryGoal;
            // 旧フィールド fallback
            const dg = appData?.settings?.dailyGoals;
            if (Array.isArray(dg) && dg.length === 7) return dg[date.getDay()] ?? 0;
            return appData?.settings?.dailyGoal ?? 0;
        });

        const secondaryGoals = keys.map((key) => {
            const dayRecords = records.filter(r => r.date === key);
            if (dayRecords.length > 0) return getRecordSecondaryGoal(dayRecords[0], appData?.settings);
            // 日付がない場合は設定を参照
            const date = new Date(key);
            return getSecondaryGoalForDate(date, appData?.settings);
        });

        return { labels, data, keys, primaryGoals, secondaryGoals };
    }, [records, appData]);

    // 今日の獲得と目標までの残りを計算
    const todayStats = useMemo(() => {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const yesterdayKey = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        
        const todayEarned = records.reduce((acc, r) => acc + (r.date === todayKey ? r.earned : 0), 0);
        const yesterdayEarned = records.reduce((acc, r) => acc + (r.date === yesterdayKey ? r.earned : 0), 0);
        
        return { 
            key: todayKey, 
            earned: todayEarned,
            yesterdayEarned 
        };
    }, [records]);

    const getGoalForDate = useCallback((date: Date) => {
        const pg = appData?.settings?.primaryGoals;
        if (Array.isArray(pg) && pg.length === 7) return pg[date.getDay()] ?? 0;
        if (typeof appData?.settings?.primaryGoal === 'number') return appData!.settings!.primaryGoal;
        // fallback to legacy
        const dg = appData?.settings?.dailyGoals;
        if (Array.isArray(dg) && dg.length === 7) return dg[date.getDay()] ?? 0;
        return appData?.settings?.dailyGoal ?? 0;
    }, [appData]);

        const todayPrimary = getGoalForDate(new Date());
        const todaySecondary = getSecondaryGoalForDate(new Date(), appData?.settings) ?? 0;
        const remainingToPrimary = Math.max(0, todayPrimary - todayStats.earned);
        const remainingToSecondary = Math.max(0, todaySecondary - todayStats.earned);

    // 今月の合計を計算
    const thisMonthStats = useMemo(() => {
        const now = new Date();
        const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
        
        const monthRecords = records.filter(r => r.date >= monthStart && r.date <= monthEnd);
        return monthRecords.reduce((acc, r) => acc + r.earned, 0);
    }, [records]);

    // 負債を計算
    const currentDebt = useMemo(() => {
        if (!appData) return 0;
        return calculateDebt(appData.records, appData.settings);
    }, [appData]);

    const currentCoins = appData ? getLastCoinAmount(appData) : 0;
    const targetTotal = currentCoins + remainingToPrimary;

    const chartData = useMemo(() => {
        const labels = last7.labels;
        const data = last7.data;
        const pGoals = last7.primaryGoals;
        const sGoals = last7.secondaryGoals;

        // 色分け: dailyCoins < primary -> 赤, primary <= daily < secondary -> 緑, >= secondary -> 金色
        const pointColors = data.map((v, i) => {
            const primary = pGoals[i] ?? 0;
            const secondary = sGoals[i] ?? Infinity;
            if (v >= secondary) return '#D4AF37'; // 金色
            if (v >= primary) return '#16a34a'; // 緑
            return '#dc2626'; // 赤
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
            const hasAnyGoal = pGoals.some((v) => typeof v === 'number' && v > 0);
            if (hasAnyGoal) {
                ds.push({
                    label: '第一段階目標',
                    data: pGoals,
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    pointRadius: 0,
                    borderDash: [6, 4],
                    fill: false,
                    tension: 0,
                });
            }
            // 第二段階目標（破線・金色）
            const hasAnyS = sGoals.some((v) => typeof v === 'number' && v > 0);
            if (hasAnyS) {
                ds.push({
                    label: '第二段階目標',
                    data: sGoals,
                    borderColor: '#D4AF37',
                    borderWidth: 2,
                    pointRadius: 0,
                    borderDash: [6, 6],
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

    // 軽量 キラキラ描画プラグイン（secondary を達成したポイントに一度だけ簡易エフェクトを描画）
    const sparklePlugin = useMemo(() => ({
        id: 'sparklePlugin',
        afterDatasetDraw(chart: any) {
            try {
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                const data = chart.data.datasets[0].data || [];
                const sGoals = last7.secondaryGoals || [];

                ctx.save();
                for (let i = 0; i < meta.data.length; i++) {
                    const point = meta.data[i];
                    const x = point.x;
                    const y = point.y;
                    const val = data[i] || 0;
                    const s = sGoals[i] ?? Infinity;
                    if (val >= s) {
                        // 軽量な放射状グローを描画（小さな白い円を3つ）
                        ctx.globalCompositeOperation = 'lighter';
                        for (let j = 0; j < 3; j++) {
                            const r = 2 + j * 1.5;
                            ctx.beginPath();
                            ctx.fillStyle = `rgba(255,245,200,${0.12 - j*0.03})`;
                            ctx.arc(x + (j-1)*2.5, y - (j%2)*2.5, r, 0, Math.PI*2);
                            ctx.fill();
                        }
                    }
                }
                ctx.restore();
            } catch (e) {
                // ignore
            }
        }
    }), [last7]);

    // チャート参照とチャート上に表示する星の位置
    const chartRef = useRef<ChartType | null>(null);
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const [chartSparkles, setChartSparkles] = useState<Array<{left:number, top:number}>>([]);

    // チャート描画後に金色(secondary達成)のポイント位置を計算して星を表示
    useEffect(() => {
        const chart = chartRef.current;
        const container = chartContainerRef.current;
        if (!chart || !container) {
            setChartSparkles([]);
            return;
        }

        try {
            const meta = (chart as any).getDatasetMeta(0);
            const sGoals = last7.secondaryGoals || [];

            const positions: Array<{left:number, top:number}> = [];

            // datasets[].data の要素は number のほかオブジェクトの場合があるため数値へ正規化
            const rawData: any[] = chart.data?.datasets?.[0]?.data || [];
            const normData: number[] = rawData.map((v: any) => {
                if (v == null) return 0;
                if (typeof v === 'number') return v;
                if (typeof v === 'object' && typeof v.y === 'number') return v.y;
                if (Array.isArray(v) && typeof v[1] === 'number') return v[1];
                return 0;
            });

            for (let i = 0; i < meta.data.length; i++) {
                const point = meta.data[i];
                const val = normData[i] ?? 0;
                const s = sGoals[i] ?? Infinity;
                if (val >= s) {
                    const x = point.x;
                    const y = point.y;
                    // 相対位置（container の左上を基準）
                    positions.push({ left: x, top: y });
                }
            }

            setChartSparkles(positions);
        } catch (e) {
            setChartSparkles([]);
        }
    }, [chartData, last7, chartRef.current]);

    // 簡易キラキラコンポーネント（表示時にCSSでアニメ）
    const Sparkles: React.FC = () => {
        // 少なめの星型パーティクル（SVG）をレンダリング
        const count = 6;
        const starPath = "M12 .587l3.668 7.431L24 9.423l-6 5.845L19.335 24 12 19.771 4.665 24 6 15.268 0 9.423l8.332-1.405L12 .587z";
        return (
            <div className="sparkles" aria-hidden>
                {Array.from({ length: count }).map((_, i) => (
                    <svg
                        key={i}
                        className={`sparkle sparkle--${i + 1}`}
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden
                    >
                        <path d={starPath} fill="#FFD700" />
                    </svg>
                ))}
            </div>
        );
    };

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
                <div className="stats-page__empty">
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
            {/* ヒーロー領域：今日の獲得コイン */}
            <TodayHero 
                todayEarned={todayStats.earned} 
            />

            {message && (
                <div className={`stats-message stats-message--${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="stats-page__content">
                {/* 現在のコイン数 */}
                <section className="stats-section stats-section--compact">
                    <div className="stats-simple-card">
                        <div className="stats-simple-card__label">現在のコイン</div>
                        <div className="stats-simple-card__value">{formatNumber(currentCoins)}</div>
                    </div>
                </section>

                {/* 今月の合計 */}
                <section className="stats-section stats-section--compact">
                    <div className="stats-simple-card">
                        <div className="stats-simple-card__label">今月の合計</div>
                        <div className="stats-simple-card__value">+{formatNumber(thisMonthStats)}</div>
                    </div>
                </section>

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
                            <span className="total-stat__value">−{formatNumber(totalStats.premiumBox)}</span>
                        </div>
                        <div className="total-stat total-stat--serebo">
                            <span className="total-stat__label">セレボ</span>
                            <span className="total-stat__value">−{formatNumber(totalStats.serebo)}</span>
                        </div>
                        <div className="total-stat total-stat--pick">
                            <span className="total-stat__label">ピック</span>
                            <span className="total-stat__value">−{formatNumber(totalStats.pick)}</span>
                        </div>
                        <div className="total-stat total-stat--other">
                            <span className="total-stat__label">その他</span>
                            <span className="total-stat__value">−{formatNumber(totalStats.other)}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 直近7日間グラフ */}
            <section className="stats-section">
                <h3 className="stats-section__title">直近7日間の獲得</h3>
                    {/* 目標表示は専用セクションに移動しました */}
                <div className="stats-card">
                    <div className="chart-container" ref={chartContainerRef}>
                        <Line ref={chartRef as any} data={chartData} options={chartOptions} plugins={[sparklePlugin as any]} />

                        {/* チャート上の金色ポイントに表示する星（DOM） */}
                        <div className="chart-sparkles" aria-hidden>
                            {chartSparkles.map((p, i) => (
                                <svg
                                    key={i}
                                    className={`chart-sparkle sparkle sparkle--${(i % 6) + 1}`}
                                    viewBox="0 0 24 24"
                                    style={{ left: p.left, top: p.top }}
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path d="M12 .587l3.668 7.431L24 9.423l-6 5.845L19.335 24 12 19.771 4.665 24 6 15.268 0 9.423l8.332-1.405L12 .587z" fill="#FFD700" />
                                </svg>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

                {/* 目標（専用セクション） */}
                <section className="stats-section">
                    <h3 className="stats-section__title">目標</h3>
                    <div className="stats-card">
                                {(appData?.settings?.showGoalLine && (todayPrimary ?? 0) > 0) ? (
                                    <div className="stats-section__goal">
                                        <div>第一段階目標: {formatNumber(todayPrimary ?? 0)} コイン</div>

                                        {todayStats.earned < todayPrimary ? (
                                            <div className="stats-section__today">
                                                今日あと {formatNumber(remainingToPrimary)} コインで第一段階達成
                                            </div>
                                        ) : (todaySecondary > 0 && todayStats.earned < todaySecondary) ? (
                                            <div className="stats-section__today stats-section__today--done">
                                                第一段階クリア　第二段階目標まで {formatNumber(remainingToSecondary)} コイン
                                            </div>
                                        ) : (
                                            <div className="goal-with-sparkles">
                                                <div className="stats-section__today stats-section__today--done">今日の目標は達成済みです</div>
                                                <Sparkles />
                                            </div>
                                        )}

                                        <div className="stats-section__target">現在 {formatNumber(currentCoins)} → 合計 {formatNumber(targetTotal)} コイン</div>
                                    </div>
                                ) : (
                                    <div className="empty-state">目標が設定されていません。</div>
                                )}
                    </div>
                </section>

                {/* 負債（専用セクション） */}
                {(appData?.settings?.showDebt ?? true) && currentDebt > 0 && (
                    <section className="stats-section">
                        <h3 className="stats-section__title">昨日までの負債</h3>
                        <div className="stats-card">
                            <div className="stats-section__debt">
                                <div style={{ fontSize: '18px', color: '#dc2626', fontWeight: 'bold' }}>
                                    {formatNumber(currentDebt)} コイン
                                </div>
                                <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                                    ※今日の進捗は反映されません。昨日までの負債です。
                                </div>
                            </div>
                        </div>
                    </section>
                )}

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
        </div>
    );
}
