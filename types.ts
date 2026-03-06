export type ShiftCode = string;

export interface Staff {
  id: string;
  name: string;
  employmentType: '正社員' | 'パート' | 'その他';
  canDrive: boolean;
  isTarget: boolean; // シフト作成対象か (服部、山田はfalse)
  unavailableShifts: ShiftCode[]; // 配置NGシフト
  fixedDaysOff: number[]; // 固定休の曜日 (0:日, 1:月...)
  maxDaysPerWeek?: number; // 週の最大勤務日数
  specialRules: string[]; // 特殊ルールID (例: '遅番多め', '月木休み')
}

export interface FacilityRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: number; // 適用順位
}

export interface FacilitySettings {
  reqHaya: number; // 早番必要人数
  reqNichi: number; // 日勤必要人数
  reqOso: number; // 遅番必要人数
  reqYoru: number; // 夜勤必要人数
  reqDriverNichi: number; // 日勤のうち運転可能スタッフの必要人数
  nightFollowedByOff: boolean; // 夜勤明けの次の日は必ず休みとする
  notes: string[]; // 施設基本設定のメモ（箇条書き）
  shiftCodes: string[]; // シフトコードのリスト
}

export interface ShiftCell {
  date: string; // YYYY-MM-DD
  staffId: string;
  shift: ShiftCode | '';
  isFixed: boolean; // 希望休などで固定されているか
  isUserInput?: boolean; // ユーザーが手動で入力したか
}
