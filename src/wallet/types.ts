// データ型定義

export type RecordMode = 'add' | 'premium' | 'other' | 'serebo' | 'pick';

export interface CoinRecord {
    id: string;
    date: string;        // YYYY-MM-DD
    timestamp: number;   // 登録順保証用
    coinAmount: number;  // 登録後のコイン量
    earned: number;      // 獲得コイン（追加モード時）
    premiumBox: number;  // プレボ使用量
    other: number;       // その他使用量
    serebo: number;      // セレボ使用量
    pick: number;        // ピック使用量
}

export interface AppData {
    initialCoinAmount: number;
    records: CoinRecord[];
    // ユーザー設定
    settings?: {
        dailyGoal?: number; // 1日あたりのコイン稼ぎ目標（互換性用: 単一値）
        dailyGoals?: number[]; // 曜日別目標（0=日,1=月,...6=土）
        showGoalLine?: boolean; // グラフに目標線を表示するか
        // OCR用のクロップ領域（割合、単位は％）。left/top/right/bottom の順で指定
        ocrCrop?: {
            left?: number;
            top?: number;
            right?: number;
            bottom?: number;
        };
    };
}

export interface DailyStats {
    date: string;
    earned: number;
    premiumBox: number;
    other: number;
    serebo: number;
    pick: number;
}

export interface PeriodStats {
    label: string;
    startDate: string;
    endDate: string;
    earned: number;
    premiumBox: number;
    other: number;
    serebo: number;
    pick: number;
}
