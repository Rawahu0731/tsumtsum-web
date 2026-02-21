import { useMemo, useState } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isToday,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import type { CoinRecord, DailyStats } from '../types';
import './Calendar.css';

interface CalendarProps {
    records: CoinRecord[];
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
}

// 日付ごとの統計を計算
function calculateDailyStats(records: CoinRecord[]): Map<string, DailyStats> {
    const statsMap = new Map<string, DailyStats>();

    for (const record of records) {
        const existing = statsMap.get(record.date);
        if (existing) {
            existing.earned += record.earned;
            existing.premiumBox += record.premiumBox;
            existing.other += record.other;
            existing.serebo += (record.serebo ?? 0);
            existing.pick += (record.pick ?? 0);
        } else {
            statsMap.set(record.date, {
                date: record.date,
                earned: record.earned,
                premiumBox: record.premiumBox,
                other: record.other,
                serebo: (record.serebo ?? 0),
                pick: (record.pick ?? 0),
            });
        }
    }

    return statsMap;
}

// 数値を短縮表示
function formatShortNumber(num: number): string {
    if (num >= 10000) {
        return `${(num / 10000).toFixed(1)}万`;
    }
    if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
}

export default function Calendar({
    records,
    currentMonth,
    onMonthChange,
}: CalendarProps) {
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);
    const dailyStats = useMemo(() => calculateDailyStats(records), [records]);

    // カレンダーの日付を生成（月曜始まり）
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

        return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }, [currentMonth]);

    const weekdays = ['月', '火', '水', '木', '金', '土', '日'];

    return (
        <div className="calendar">
            <div className="calendar__header">
                <button
                    className="calendar__nav-button"
                    onClick={() => onMonthChange(subMonths(currentMonth, 1))}
                    aria-label="前月"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <h3 className="calendar__title">
                    {format(currentMonth, 'yyyy年 M月', { locale: ja })}
                </h3>

                <button
                    className="calendar__nav-button"
                    onClick={() => onMonthChange(addMonths(currentMonth, 1))}
                    aria-label="次月"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            <div className="calendar__weekdays">
                {weekdays.map((day) => (
                    <div key={day} className="calendar__weekday">
                        {day}
                    </div>
                ))}
            </div>

            <div className="calendar__days">
                {calendarDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const stats = dailyStats.get(dateStr);
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    const hasData = stats && (stats.earned > 0 || stats.premiumBox > 0 || stats.other > 0 || stats.serebo > 0 || stats.pick > 0);

                    if (!isCurrentMonth) {
                        return <div key={dateStr} className="calendar__day calendar__day--empty" />;
                    }

                    return (
                        <div
                            key={dateStr}
                            className={`calendar__day ${isToday(day) ? 'calendar__day--today' : ''} ${hasData ? 'calendar__day--has-data' : ''}`}
                            onMouseEnter={() => hasData && setHoveredDate(dateStr)}
                            onMouseLeave={() => setHoveredDate(null)}
                        >
                            <span className="calendar__day-number">{format(day, 'd')}</span>
                            
                            {/* ホバー時のポップオーバー */}
                            {hasData && hoveredDate === dateStr && (
                                <div className="calendar__popover">
                                    <div className="calendar__popover-title">{format(day, 'M月d日', { locale: ja })}</div>
                                    {stats.earned > 0 && (
                                        <div className="calendar__popover-item calendar__popover-item--earned">
                                            <span className="calendar__popover-dot" />
                                            <span className="calendar__popover-label">獲得</span>
                                            <span className="calendar__popover-value">+{stats.earned.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {stats.premiumBox > 0 && (
                                        <div className="calendar__popover-item calendar__popover-item--premium">
                                            <span className="calendar__popover-dot" />
                                            <span className="calendar__popover-label">プレボ</span>
                                            <span className="calendar__popover-value">−{stats.premiumBox.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {stats.serebo > 0 && (
                                        <div className="calendar__popover-item calendar__popover-item--serebo">
                                            <span className="calendar__popover-dot" />
                                            <span className="calendar__popover-label">セレクト</span>
                                            <span className="calendar__popover-value">−{stats.serebo.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {stats.pick > 0 && (
                                        <div className="calendar__popover-item calendar__popover-item--pick">
                                            <span className="calendar__popover-dot" />
                                            <span className="calendar__popover-label">ピック</span>
                                            <span className="calendar__popover-value">−{stats.pick.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {stats.other > 0 && (
                                        <div className="calendar__popover-item calendar__popover-item--other">
                                            <span className="calendar__popover-dot" />
                                            <span className="calendar__popover-label">その他</span>
                                            <span className="calendar__popover-value">−{stats.other.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {hasData && (
                                <div className="calendar__day-stats">
                                    {stats.earned > 0 && (
                                        <div className="calendar__stat calendar__stat--earned">
                                            +{formatShortNumber(stats.earned)}
                                        </div>
                                    )}
                                    {(stats.premiumBox + stats.other + stats.serebo + stats.pick) > 0 && (
                                        <div className="calendar__stat calendar__stat--spent">
                                            -{formatShortNumber(stats.premiumBox + stats.other + stats.serebo + stats.pick)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
