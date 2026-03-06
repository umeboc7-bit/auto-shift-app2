import { Staff, FacilityRule, FacilitySettings } from './types';

export const INITIAL_STAFF: Staff[] = [
  { id: 's1', name: '服部', employmentType: 'その他', canDrive: false, isTarget: false, unavailableShifts: [], fixedDaysOff: [], specialRules: [] },
  { id: 's2', name: '山田', employmentType: 'その他', canDrive: false, isTarget: false, unavailableShifts: [], fixedDaysOff: [], specialRules: [] },
  { id: 's3', name: 'カレン', employmentType: '正社員', canDrive: false, isTarget: true, unavailableShifts: ['早'], fixedDaysOff: [], specialRules: ['遅番多め', '月曜休み'] },
  { id: 's4', name: 'グレナ', employmentType: '正社員', canDrive: false, isTarget: true, unavailableShifts: ['早'], fixedDaysOff: [], specialRules: ['遅番多め'] },
  { id: 's5', name: 'モー', employmentType: '正社員', canDrive: false, isTarget: true, unavailableShifts: ['早'], fixedDaysOff: [], specialRules: ['遅番多め'] },
  { id: 's6', name: '西脇', employmentType: 'パート', canDrive: true, isTarget: true, unavailableShifts: ['早', '遅', '夜', '明'], fixedDaysOff: [], specialRules: ['日勤のみ'] },
  { id: 's7', name: '早川', employmentType: 'パート', canDrive: true, isTarget: true, unavailableShifts: ['遅', '夜', '明'], fixedDaysOff: [], specialRules: ['早番含む日勤のみ'] },
  { id: 's8', name: '山口', employmentType: 'パート', canDrive: false, isTarget: true, unavailableShifts: ['早', '日', '遅'], fixedDaysOff: [], specialRules: ['金曜夜勤のみ', '夜明休セット'] },
  { id: 's9', name: '青地', employmentType: 'パート', canDrive: true, isTarget: true, unavailableShifts: ['早', '遅', '夜', '明'], fixedDaysOff: [], maxDaysPerWeek: 5, specialRules: ['日勤のみ', '9:00-17:00特例', '週5日以内'] },
  { id: 's10', name: '野下', employmentType: '正社員', canDrive: true, isTarget: true, unavailableShifts: [], fixedDaysOff: [], specialRules: [] },
  { id: 's11', name: '中野', employmentType: '正社員', canDrive: true, isTarget: true, unavailableShifts: [], fixedDaysOff: [], specialRules: [] },
  { id: 's12', name: '栗本', employmentType: '正社員', canDrive: true, isTarget: true, unavailableShifts: [], fixedDaysOff: [], specialRules: [] },
];

export const ALL_SHIFT_CODES = ['早', '日', '遅', '夜', '明', '-', '有', '9:00-17:00'];

export const ALL_RULES: FacilityRule[] = [
  { id: 'r1', priority: 1, name: '希望休・有給の固定', description: '各スタッフの希望（有給、休み、希望シフト）を最優先にシート絶対固定反映とする', isActive: true },
  { id: 'r2', priority: 2, name: '早川・西脇の希望条件優先', description: '早川、西脇の希望条件を優先配置し、その後に正社員の勤務配置とする', isActive: true },
  { id: 'r3', priority: 3, name: '山口の勤務配置', description: '山口のその後に正社員の勤務配置とする', isActive: true },
  { id: 'r4', priority: 5, name: '夜勤1名配置', description: '1日1人必要な夜勤勤務配置を踏まえる', isActive: true },
  { id: 'r5', priority: 6, name: '早番均等配置', description: '野下、中野、栗本、早川の4人で、1日1人必要な「早」を均等回数のランダム配置する', isActive: true },
  { id: 'r6', priority: 7, name: '遅番1名配置', description: '1日1人必要な「遅」務配置を踏まえる', isActive: true },
  { id: 'r7', priority: 8, name: '日勤2名以上配置', description: '1日2人以上必要な「日」勤務配置を踏まえる（内、1人は運転可能スタッフとする）', isActive: true },
  { id: 'r8', priority: 9, name: '夜・明・休セット配置', description: '上記配置済みを踏まえ、正社員＆山口の中で「夜」「明」「-」の3日間セット勤務配置を踏まえる', isActive: true },
  { id: 'r9', priority: 10, name: '正社員遅番配置', description: '上記配置済みを踏まえ、正社員の中で「遅」を最低1人配置', isActive: true },
  { id: 'r10', priority: 11, name: '正社員と早川の早番配置', description: '正社員と早川で「早」を配置', isActive: true },
  { id: 'r11', priority: 12, name: '西脇と青地の日勤優先', description: '「日」配置を西脇と青地を優先に配置（青地は月〜日曜日の内、5日間勤務を上限とする）', isActive: true },
  { id: 'r12', priority: 13, name: '2人目の日勤配置', description: '2人目の「日」勤務者を配置', isActive: true },
];

export const INITIAL_SETTINGS: FacilitySettings = {
  reqHaya: 1,
  reqNichi: 2,
  reqOso: 1,
  reqYoru: 1,
  reqDriverNichi: 1,
  nightFollowedByOff: true,
  notes: [],
  shiftCodes: ALL_SHIFT_CODES,
};
