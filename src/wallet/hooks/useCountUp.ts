import { useEffect, useRef, useState } from 'react';

/**
 * カウントアップアニメーションフック
 * 
 * @param target - 最終的な目標値
 * @param duration - アニメーション時間（ミリ秒）デフォルト900ms
 * @returns 現在表示中の値
 */
export function useCountUp(target: number, duration: number = 900): number {
    const [current, setCurrent] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        // targetが0の場合は即座に0を表示
        if (target === 0) {
            setCurrent(0);
            return;
        }

        // アニメーション開始
        startTimeRef.current = null;
        setCurrent(0);

        const animate = (timestamp: number) => {
            if (startTimeRef.current === null) {
                startTimeRef.current = timestamp;
            }

            const elapsed = timestamp - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            // easeOutCubic: 最後がゆっくり止まる
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = Math.floor(target * eased);

            setCurrent(value);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            } else {
                // 最終値を確実にセット
                setCurrent(target);
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [target, duration]);

    return current;
}
