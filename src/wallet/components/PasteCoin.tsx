import { useState } from 'react';
import ConfirmModal from './ConfirmModal';
import { loadData } from '../storage';

type Props = {
    onApply: (amount: number) => void;
};

export default function PasteCoin({ onApply }: Props) {
    const [status, setStatus] = useState<string>('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [recognized, setRecognized] = useState<number | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingAmount, setPendingAmount] = useState<number | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    async function handlePasteImage() {
        setStatus('クリップボードを読み取り中...');
        setRecognized(null);
        setPreviewUrl(null);
        setErrorMsg(null);

        try {
            // Clipboard API
            // @ts-ignore
            if (!navigator.clipboard || !navigator.clipboard.read) {
                setStatus('クリップボード読み取りが非対応です');
                setErrorMsg('このブラウザはクリップボードから画像を読み取れません。手動で画像をコピーしてから再試行してください。');
                return;
            }

            // Read clipboard items and find image
            // @ts-ignore
            const items: any[] = await navigator.clipboard.read();
            let imageBlob: Blob | null = null;
            for (const item of items) {
                for (const type of item.types) {
                    if (type.startsWith('image/')) {
                        imageBlob = await item.getType(type);
                        break;
                    }
                }
                if (imageBlob) break;
            }

            if (!imageBlob) {
                setStatus('クリップボードに画像が見つかりません');
                setErrorMsg('クリップボードに画像が見つかりませんでした。ツムツムのスクリーンショットをコピーしてから再試行してください。');
                return;
            }

            const originalUrl = URL.createObjectURL(imageBlob);
            setStatus('画像取得完了。OCR実行中...');
            setErrorMsg(null);

            // Load image, crop by percentage bounds, and use the cropped image for both表示 and OCR
            const img = new Image();
            img.src = originalUrl;
            await img.decode();

            // Release original URL (we will not display the full original image)
            try { URL.revokeObjectURL(originalUrl); } catch (e) { /* ignore */ }

            const w = img.naturalWidth;
            const h = img.naturalHeight;

            // Percentage bounds — read from saved settings (単位: %)
            const data = loadData();
            const crop = data?.settings?.ocrCrop ?? { left: 40, top: 17, right: 70, bottom: 22 };
            const leftPct = Math.max(0, Math.min(100, Number(crop.left ?? 40)));
            const topPct = Math.max(0, Math.min(100, Number(crop.top ?? 17)));
            const rightPct = Math.max(0, Math.min(100, Number(crop.right ?? 70)));
            const bottomPct = Math.max(0, Math.min(100, Number(crop.bottom ?? 22)));

            // convert to pixel coordinates
            const sx = Math.floor(w * (leftPct / 100));
            const sy = Math.floor(h * (topPct / 100));
            const sw = Math.floor(w * ((rightPct - leftPct) / 100));
            const sh = Math.floor(h * ((bottomPct - topPct) / 100));

            const canvas = document.createElement('canvas');
            canvas.width = sw;
            canvas.height = sh;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context not available');

            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

            const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
            if (!blob) {
                setStatus('画像処理に失敗しました');
                setErrorMsg('画像の処理に失敗しました。別の画像で再度お試しください。');
                return;
            }

            // Create a preview URL from the cropped blob and show only the cropped image
            // Revoke previous preview URL if any
            setPreviewUrl((prev) => {
                try {
                    if (prev) URL.revokeObjectURL(prev);
                } catch (e) {}
                return URL.createObjectURL(blob);
            });

            const tesseractMod: any = await import('tesseract.js');
            const createWorkerFn = tesseractMod.createWorker || tesseractMod.default?.createWorker || tesseractMod;
            if (typeof createWorkerFn !== 'function') {
                setStatus('OCRライブラリの初期化に失敗しました');
                setErrorMsg('tesseract.js の createWorker を見つけられませんでした。');
                return;
            }

            // createWorker may return a worker or a Promise resolving to a worker
            let worker: any = createWorkerFn({
                logger: (m: any) => setStatus(`OCR: ${m.status} ${(m.progress ? Math.round(m.progress * 100) : '')}%`),
            });
            if (worker && typeof worker.then === 'function') {
                worker = await worker;
            }

            let text = '';
            if (worker && typeof worker.load === 'function') {
                await worker.load();
                await worker.loadLanguage('eng');
                await worker.initialize('eng');
                const { data } = await worker.recognize(blob);
                text = data?.text ?? '';
                if (typeof worker.terminate === 'function') await worker.terminate();
            } else if (worker && typeof worker.recognize === 'function') {
                // some builds expose a simple API
                const res = await worker.recognize(blob);
                text = res?.data?.text ?? res?.text ?? '';
                if (typeof worker.terminate === 'function') await worker.terminate();
            } else {
                setStatus('OCRの実行に失敗しました');
                setErrorMsg('worker が適切な OCR インターフェースを提供していません。');
                return;
            }
            const m = text.match(/[0-9,]+/);
            if (!m) {
                setStatus('数字を検出できませんでした');
                setErrorMsg(`画像から数字を検出できませんでした。OCR結果: "${text.trim()}"`);
                return;
            }

            const numStr = m[0].replace(/,/g, '');
            const amount = parseInt(numStr, 10);
            if (isNaN(amount)) {
                setStatus('認識文字列を数値に変換できませんでした');
                setErrorMsg(`認識した文字列 (${m[0]}) を数値に変換できませんでした。`);
                return;
            }

            setRecognized(amount);
            setStatus('認識完了: ' + amount.toLocaleString());

            // 確認モーダルを開く（ここで入力に反映するか決定。他に即時登録はしない）
            setPendingAmount(amount);
            setConfirmOpen(true);

        } catch (err: any) {
            console.error(err);
            setStatus('エラーが発生しました');
            setErrorMsg(err?.message ? String(err.message) : '予期せぬエラーが発生しました。コンソールを確認してください。');
        }
    }

    return (
        <div style={{ marginTop: 8 }}>
            <button type="button" className="submit-button submit-button--muted" onClick={handlePasteImage}>
                画像から読み取る（クリップボード）
            </button>

            {previewUrl && (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <img
                        src={previewUrl}
                        alt="preview"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '40vh',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            borderRadius: 6,
                            display: 'block',
                            margin: '0 auto'
                        }}
                    />
                </div>
            )}

            {status && <div style={{ marginTop: 6 }}>{status}</div>}

            {errorMsg && (
                <div style={{ marginTop: 8 }}>
                    <div className="error-message" style={{ position: 'relative' }}>
                        <div style={{ marginRight: 28 }}>{errorMsg}</div>
                        <button onClick={() => setErrorMsg(null)} style={{ position: 'absolute', right: 8, top: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', fontWeight: 700 }}>×</button>
                    </div>
                </div>
            )}

            {recognized !== null && (
                <div style={{ marginTop: 8, color: '#374151' }}>
                    認識: <span style={{ color: 'red', fontWeight: 700 }}>{recognized.toLocaleString()}</span> 枚
                </div>
            )}

            <ConfirmModal
                open={confirmOpen}
                title="コイン枚数の確認"
                message={
                    pendingAmount !== null ? (
                        <span>
                            <span style={{ color: 'red', fontWeight: 700 }}>{pendingAmount.toLocaleString()}</span> 枚を入力します。よろしいですか？
                        </span>
                    ) : undefined
                }
                previewUrl={previewUrl}
                onConfirm={() => {
                    if (pendingAmount !== null) onApply(pendingAmount);
                    setConfirmOpen(false);
                    setPendingAmount(null);
                }}
                onCancel={() => {
                    setConfirmOpen(false);
                    setPendingAmount(null);
                }}
            />
        </div>
    );
}
