import { useCountUp } from '../hooks/useCountUp';
import './TodayHero.css';

interface TodayHeroProps {
    /** 今日の獲得コイン */
    todayEarned: number;
}

function formatNumber(num: number): string {
    return num.toLocaleString();
}

export default function TodayHero({ todayEarned }: TodayHeroProps) {
    const animatedValue = useCountUp(todayEarned, 900);

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
        </div>
    );
}
