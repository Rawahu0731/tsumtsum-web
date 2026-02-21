import { useMemo } from 'react';
import { useCountUp } from '../hooks/useCountUp';
import './TodayHero.css';

interface TodayHeroProps {
    /** 今日の獲得コイン */
    todayEarned: number;
    /** 昨日の獲得コイン */
    yesterdayEarned: number;
}

function formatNumber(num: number): string {
    return num.toLocaleString();
}

export default function TodayHero({ todayEarned, yesterdayEarned }: TodayHeroProps) {
    const animatedValue = useCountUp(todayEarned, 900);

    const diff = todayEarned - yesterdayEarned;
    const diffText = useMemo(() => {
        if (diff === 0) return null;
        const sign = diff > 0 ? '+' : '';
        return `${sign}${formatNumber(diff)}`;
    }, [diff]);

    const showDiff = diff !== 0 && yesterdayEarned > 0;

    return (
        <div className="today-hero" role="region" aria-label="今日の獲得コイン">
            <div className="today-hero__label">TODAY</div>
            <div 
                className="today-hero__value" 
                aria-live="polite" 
                aria-atomic="true"
            >
                {formatNumber(animatedValue)}
            </div>
            {showDiff && (
                <div 
                    className={`today-hero__diff ${diff > 0 ? 'today-hero__diff--positive' : 'today-hero__diff--negative'}`}
                    aria-label={`昨日より${diffText}コイン`}
                >
                    昨日より {diffText}
                </div>
            )}
        </div>
    );
}
