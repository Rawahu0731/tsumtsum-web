import type { AppData, CoinRecord, RecordMode } from './types';

const STORAGE_KEY = 'tsumtsum-wallet-data';
const SESSION_KEY = 'tsumtsum-session-records';

function getSessionIds(): string[] {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((v) => String(v));
    } catch {
        return [];
    }
}

function pushSessionId(id: string): void {
    try {
        const ids = getSessionIds();
        ids.push(id);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(ids));
    } catch {
        // ignore
    }
}

function popSessionId(): string | null {
    try {
        const ids = getSessionIds();
        if (ids.length === 0) return null;
        const last = ids.pop() as string;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(ids));
        return last;
    } catch {
        return null;
    }
}

// セッション内に取り消し可能なIDがあるか
export function hasSessionUndo(): boolean {
    try {
        const ids = getSessionIds();
        return ids.length > 0;
    } catch {
        return false;
    }
}

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
            dailyGoals: [0, 0, 0, 0, 0, 0, 0],
            showGoalLine: true,
            ocrCrop: {
                left: 40,
                top: 17,
                right: 70,
                bottom: 22,
            },
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
    // セッション内で追加されたレコードとしてマーク（タブを閉じると消える）
    try {
        pushSessionId(record.id);
    } catch {
        // ignore
    }
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
                dailyGoals: Array.isArray(parsed.settings?.dailyGoals)
                    ? parsed.settings.dailyGoals.map((v: any) => (typeof v === 'number' ? v : 0))
                    : undefined,
                showGoalLine: typeof parsed.settings?.showGoalLine === 'boolean' ? parsed.settings.showGoalLine : true,
                ocrCrop: {
                    left: typeof parsed.settings?.ocrCrop?.left === 'number' ? parsed.settings.ocrCrop.left : 40,
                    top: typeof parsed.settings?.ocrCrop?.top === 'number' ? parsed.settings.ocrCrop.top : 17,
                    right: typeof parsed.settings?.ocrCrop?.right === 'number' ? parsed.settings.ocrCrop.right : 70,
                    bottom: typeof parsed.settings?.ocrCrop?.bottom === 'number' ? parsed.settings.ocrCrop.bottom : 22,
                },
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

// 最後に追加されたレコードを取り消す（undo）
export function undoLastRecord(data: AppData): { success: true; data: AppData } | { success: false; error: string } {
    if (!data || !Array.isArray(data.records) || data.records.length === 0) {
        return { success: false, error: '取り消す操作がありません。' };
    }

    // タイムスタンプで最新レコードを特定して削除
    const sorted = [...data.records].sort((a, b) => b.timestamp - a.timestamp);
    const latestId = sorted[0].id;

    const newRecords = data.records.filter((r) => r.id !== latestId);

    const newData: AppData = {
        ...data,
        records: newRecords,
    };

    saveData(newData);
    return { success: true, data: newData };
}

// セッション内で追加された直近レコードのみを取り消す
export function undoLastSessionRecord(data: AppData): { success: true; data: AppData } | { success: false; error: string } {
    try {
        const lastSessionId = popSessionId();
        if (!lastSessionId) {
            return { success: false, error: '取り消せる直近のセッションデータがありません。' };
        }

        if (!data || !Array.isArray(data.records) || data.records.length === 0) {
            return { success: false, error: 'データがありません。' };
        }

        if (!data.records.some((r) => r.id === lastSessionId)) {
            return { success: false, error: '該当するレコードが見つかりません。' };
        }

        const newRecords = data.records.filter((r) => r.id !== lastSessionId);
        const newData: AppData = { ...data, records: newRecords };
        saveData(newData);
        return { success: true, data: newData };
    } catch (e) {
        return { success: false, error: `取り消しに失敗しました: ${e instanceof Error ? e.message : String(e)}` };
    }
}
