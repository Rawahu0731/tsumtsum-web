// ブラウザのコンソールで直前のレコードを確認するためのユーティリティ
// 使い方:
// 1) ファイルをビルドするか、以下のワンライナーをコンソールに貼り付けて実行してください。
//    (function(){ ... })();

export function printLastRecordFromLocalStorage(): any | null {
    try {
        const key = 'tsumtsum-wallet-data';
        const json = localStorage.getItem(key);
        if (!json) {
            console.warn('No tsumtsum wallet data found in localStorage.');
            return null;
        }

        const data = JSON.parse(json as string);
        const records = Array.isArray(data.records) ? data.records : [];
        if (records.length === 0) {
            console.info('No records found.');
            return null;
        }

        const sorted = records.slice().sort((a: any, b: any) => b.timestamp - a.timestamp);
        const last = sorted[0];
        console.group('TsumTsum Last Record');
        console.log('id:', last.id);
        console.log('date:', last.date);
        console.log('timestamp:', new Date(last.timestamp).toISOString(), `(${last.timestamp})`);
        console.log('coinAmount:', last.coinAmount);
        console.log('earned:', last.earned);
        console.log('premiumBox:', last.premiumBox);
        console.log('serebo:', last.serebo);
        console.log('pick:', last.pick);
        console.log('other:', last.other);
        console.log('full record object:', last);
        console.groupEnd();
        return last;
    } catch (e) {
        console.error('Failed to read/parse tsumtsum wallet data:', e);
        return null;
    }
}

// ブラウザのコンソールで手早く使えるワンライナーとしてwindowに登録
try {
    // @ts-ignore
    window.printTsumLastRecord = printLastRecordFromLocalStorage;
} catch (e) {
    // ignore (非ブラウザ環境など)
}

// 直接実行したい場合は以下を使う（コンソールに貼って実行）:
// (function(){ const fn = window.printTsumLastRecord || (window as any).printTsumLastRecord; if(fn) fn(); else console.warn('関数が見つかりません'); })();
