import type { CSSProperties } from 'react';
import './CompleteAnimation.css';

type CompleteAnimationProps = {
	isFirstCelebration: boolean;
};

type ConfettiStyle = CSSProperties & {
	'--confetti-left': string;
	'--confetti-delay': string;
	'--confetti-duration': string;
	'--confetti-rotate': string;
};

const CONFETTI_COUNT = 28;

export default function CompleteAnimation({ isFirstCelebration }: CompleteAnimationProps) {
	return (
		<div
			className={`complete-animation ${isFirstCelebration ? 'complete-animation-celebrate' : 'complete-animation-steady'}`}
			role="status"
			aria-live="polite"
		>
			{isFirstCelebration && (
				<div className="complete-confetti-layer" aria-hidden>
					{Array.from({ length: CONFETTI_COUNT }, (_, idx) => {
						const style: ConfettiStyle = {
							'--confetti-left': `${(idx * 17) % 100}%`,
							'--confetti-delay': `${(idx % 7) * 80}ms`,
							'--confetti-duration': `${2400 + (idx % 5) * 280}ms`,
							'--confetti-rotate': `${(idx % 9) * 18}deg`,
						};

						return <span key={idx} className={`confetti-piece confetti-tone-${idx % 6}`} style={style} />;
					})}
				</div>
			)}
			<div className="complete-content">
				<p className="complete-kicker">PREMIUM BOX GOAL</p>
				<h3>{isFirstCelebration ? '完売達成！' : '完売達成済み'}</h3>
				<p className="complete-message">
					{isFirstCelebration
						? '積み上げたコインでついに目標到達。ここまでの継続、最高です。'
						: 'プレミアムボックスの必要コインは0です。新ツム追加までこの状態をキープできます。'}
				</p>
			</div>
		</div>
	);
}
