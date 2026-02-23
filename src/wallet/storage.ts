import type { AppData, CoinRecord, RecordMode } from './types';
import { format } from 'date-fns';

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
            // デフォルトで負債を表示する
            showDebt: true,
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

// 前回の登録タイムスタンプを取得（ミリ秒）
export function getLastRecordTimestamp(data: AppData): number | null {
    if (data.records.length === 0) {
        return null;
    }
    const sorted = [...data.records].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0].timestamp;
}

// ユニークID生成
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// その日の目標値を取得（フォールバック対応）
export function getDailyGoalForDate(date: Date, settings?: AppData['settings']): number {
    const dg = settings?.dailyGoals;
    if (Array.isArray(dg) && dg.length === 7) {
        return dg[date.getDay()] ?? 0;
    }
    return settings?.dailyGoal ?? 0;
}

// レコードの目標値を取得（フォールバック対応）
export function getRecordDailyGoal(record: CoinRecord, settings?: AppData['settings']): number {
    if (typeof record.dailyGoalAtThatDay === 'number') {
        return record.dailyGoalAtThatDay;
    }
    // フォールバック: 日付から曜日を取得して現在の設定を使う
    const date = new Date(record.date);
    return getDailyGoalForDate(date, settings);
}

// 負債計算（累積型）
export function calculateDebt(records: CoinRecord[], settings?: AppData['settings']): number {
    // 今日の日付（YYYY-MM-DD形式）
    const today = format(new Date(), 'yyyy-MM-dd');
    // リセット日が設定されている場合、その日付以降のみを計算対象とする
    const resetDate = settings?.debtResetDate; // YYYY-MM-DD 形式

    // dailyGoalAtThatDay を持ち、かつ今日より前のレコードのみを対象にする
    const targetRecords = records.filter(r => {
        if (r.dailyGoalAtThatDay == null) return false;
        if (r.date >= today) return false; // 今日以降は計算対象外
        if (resetDate) {
            // resetDate 以降のみを対象（リセット日を含む）
            return r.date >= resetDate;
        }
        return true;
    });
    
    // 日付でソート、同じ日付の場合は timestamp でソート
    const sortedRecords = [...targetRecords].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.timestamp - b.timestamp;
    });
    
    // 日ごとに集計
    const dailyMap = new Map<string, { earned: number; goal: number }>();
    for (const record of sortedRecords) {
        const existing = dailyMap.get(record.date);
        const goal = getRecordDailyGoal(record, settings);
        
        if (existing) {
            existing.earned += record.earned;
            existing.goal = goal;  // 常に上書き（後勝ち）
        } else {
            dailyMap.set(record.date, { earned: record.earned, goal });
        }
    }
    
    // 時系列で負債を計算
    let debt = 0;
    const sortedDays = Array.from(dailyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    for (const [, { earned, goal }] of sortedDays) {
        if (earned < goal) {
            // 不足分を負債に追加
            debt += (goal - earned);
        } else {
            // 余剰分で負債を返済
            const surplus = earned - goal;
            debt = Math.max(0, debt - surplus);
        }
    }
    
    return debt;
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
    const recordDate = new Date(date);
    const dailyGoalAtThatDay = getDailyGoalForDate(recordDate, data.settings);
    
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
        dailyGoalAtThatDay, // その日の目標を保存
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
