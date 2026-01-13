import type { AppData, CoinRecord, RecordMode } from './types';

const STORAGE_KEY = 'tsumtsum-wallet-data';

// localStorageへの保存・読み込み
export function loadData(): AppData | null {
    try {
        const json = localStorage.getItem(STORAGE_KEY);
        if (!json) return null;
        return JSON.parse(json) as AppData;
    } catch {
        return null;
    }
}

export function saveData(data: AppData): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 初期データの作成
export function initializeData(initialCoinAmount: number): AppData {
    const data: AppData = {
        initialCoinAmount,
        records: [],
        settings: {
            dailyGoal: 0,
            showGoalLine: true,
        },
    };
    saveData(data);
    return data;
}

// 前回のコイン量を取得
export function getLastCoinAmount(data: AppData): number {
    if (data.records.length === 0) {
        return data.initialCoinAmount;
    }
    // タイムスタンプでソートして最新を取得
    const sorted = [...data.records].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0].coinAmount;
}

// 前回の登録日を取得
export function getLastRecordDate(data: AppData): string | null {
    if (data.records.length === 0) {
        return null;
    }
    const sorted = [...data.records].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0].date;
}

// ユニークID生成
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// 履歴追加
export function addRecord(
    data: AppData,
    date: string,
    currentCoinAmount: number,
    mode: RecordMode
): { success: true; data: AppData } | { success: false; error: string } {
    const lastCoin = getLastCoinAmount(data);
    const diff = currentCoinAmount - lastCoin;
    const lastDate = getLastRecordDate(data);

    // 日付バリデーション
    if (lastDate && date < lastDate) {
        return {
            success: false,
            error: `前回の登録日（${lastDate}）より過去の日付は指定できません。`,
        };
    }

    // モード別バリデーション
    if (mode === 'add' && diff <= 0) {
        return {
            success: false,
            error: '追加モードでは、コインが増加している必要があります。',
        };
    }

    // 減少を伴うモードのバリデーション
    if ((mode === 'premium' || mode === 'other' || mode === 'serebo' || mode === 'pick') && diff >= 0) {
        return {
            success: false,
            error: '使用モードでは、コインが減少している必要があります。',
        };
    }

    // レコード作成
    const record: CoinRecord = {
        id: generateId(),
        date,
        timestamp: Date.now(),
        coinAmount: currentCoinAmount,
        earned: mode === 'add' ? diff : 0,
        premiumBox: mode === 'premium' ? Math.abs(diff) : 0,
        other: mode === 'other' ? Math.abs(diff) : 0,
        serebo: mode === 'serebo' ? Math.abs(diff) : 0,
        pick: mode === 'pick' ? Math.abs(diff) : 0,
    };

    const newData: AppData = {
        ...data,
        records: [...data.records, record],
    };

    saveData(newData);
    return { success: true, data: newData };
}

// エクスポート
export function exportData(data: AppData): string {
    return JSON.stringify(data, null, 2);
}

// インポート
export function importData(json: string): { success: true; data: AppData } | { success: false; error: string } {
    try {
        const parsed = JSON.parse(json);

        // バリデーション
        if (typeof parsed.initialCoinAmount !== 'number') {
            throw new Error('initialCoinAmount is missing or invalid');
        }
        if (!Array.isArray(parsed.records)) {
            throw new Error('records is missing or not an array');
        }

        for (const record of parsed.records) {
            if (
                typeof record.id !== 'string' ||
                typeof record.date !== 'string' ||
                typeof record.timestamp !== 'number' ||
                typeof record.coinAmount !== 'number' ||
                typeof record.earned !== 'number' ||
                typeof record.premiumBox !== 'number' ||
                typeof record.other !== 'number'
            ) {
                throw new Error('Invalid record format');
            }
        }

        const data: AppData = {
            initialCoinAmount: parsed.initialCoinAmount,
            records: parsed.records,
            settings: {
                dailyGoal: typeof parsed.settings?.dailyGoal === 'number' ? parsed.settings.dailyGoal : 0,
                showGoalLine: typeof parsed.settings?.showGoalLine === 'boolean' ? parsed.settings.showGoalLine : true,
            },
        };

        saveData(data);
        return { success: true, data };
    } catch (e) {
        return {
            success: false,
            error: `JSONの形式が不正です: ${e instanceof Error ? e.message : String(e)}`,
        };
    }
}
