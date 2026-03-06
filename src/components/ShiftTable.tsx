import React, { useMemo, useState } from 'react';
import { Staff, ShiftCell, ShiftCode } from '../types';
import { generateDateRange, formatDate, DAY_NAMES } from '../utils/dateUtils';

interface ShiftTableProps {
  year: number;
  month: number;
  staffList: Staff[];
  shifts: ShiftCell[];
  prevMonthShifts: Record<string, ShiftCode>;
  onShiftChange: (staffId: string, date: string, shift: ShiftCode) => void;
  onPrevMonthShiftChange: (staffId: string, shift: ShiftCode) => void;
  publicHolidays: number;
  shiftCodes: string[];
}

export default function ShiftTable({ year, month, staffList, shifts, prevMonthShifts, onShiftChange, onPrevMonthShiftChange, publicHolidays, shiftCodes }: ShiftTableProps) {
  const dates = useMemo(() => generateDateRange(year, month), [year, month]);
  const targetStaff = staffList.filter(s => s.isTarget);
  
  const [copiedShift, setCopiedShift] = useState<ShiftCode | null>(null);

  const getShift = (staffId: string, date: string): ShiftCell | undefined => {
    return shifts.find(s => s.staffId === staffId && s.date === date);
  };

  const getShiftCount = (staffId: string, shiftCode: ShiftCode) => {
    return shifts.filter(s => s.staffId === staffId && s.shift === shiftCode).length;
  };

  const getMissingShifts = (date: string) => {
    const dayShifts = shifts.filter(s => s.date === date).map(s => s.shift);
    const required = ['早', '日', '遅', '夜', '明'];
    const missing: string[] = [];
    required.forEach(req => {
      if (req === '日') {
        if (!dayShifts.includes('日') && !dayShifts.includes('9:00-17:00')) {
          missing.push('日');
        }
      } else {
        if (!dayShifts.includes(req as ShiftCode)) {
          missing.push(req);
        }
      }
    });
    return missing;
  };

  const handleDropdownChange = (staffId: string, dateStr: string, value: ShiftCode) => {
    onShiftChange(staffId, dateStr, value);
    setCopiedShift(value);
  };

  const handleRightClickPaste = (e: React.MouseEvent, staffId: string, dateStr: string) => {
    e.preventDefault();
    if (copiedShift !== null) {
      onShiftChange(staffId, dateStr, copiedShift);
    }
  };

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[75vh] bg-white rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:overflow-visible print:max-h-none">
      <table className="min-w-max w-full border-collapse text-sm print:text-xs">
        <thead className="sticky top-0 z-40 shadow-[0_1px_0_0_#e2e8f0] print:static print:shadow-none">
          <tr>
            <th className="sticky top-0 left-0 z-50 bg-slate-100 border-b border-r border-slate-200 p-1 min-w-[100px] shadow-[1px_0_0_0_#e2e8f0] print:static print:shadow-none">
              スタッフ
            </th>
            <th className="sticky top-0 z-40 bg-slate-200 border-b border-r border-slate-300 p-1 min-w-[40px] text-center text-slate-700">
              <div className="text-[10px]">前月</div>
              <div className="text-[10px] font-normal">19日</div>
            </th>
            {dates.map(date => {
              const dayOfWeek = date.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              return (
                <th 
                  key={formatDate(date)} 
                  className={`sticky top-0 z-40 border-b border-r border-slate-200 p-1 min-w-[36px] text-center ${isWeekend ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'}`}
                >
                  <div className="text-xs">{date.getDate()}</div>
                  <div className="text-[10px] font-normal">{DAY_NAMES[dayOfWeek]}</div>
                </th>
              );
            })}
            <th className="sticky top-0 right-0 z-50 bg-slate-100 border-b border-slate-200 p-1 text-center shadow-[-1px_0_0_0_#e2e8f0] print:static print:shadow-none" colSpan={6}>
              合計
            </th>
          </tr>
          <tr>
            <th className="sticky top-0 left-0 z-50 bg-slate-100 border-b border-r border-slate-200 p-1 shadow-[1px_0_0_0_#e2e8f0] print:static print:shadow-none"></th>
            <th className="sticky top-0 z-40 bg-slate-200 border-b border-r border-slate-300 p-1"></th>
            {dates.map(date => <th key={`empty-${formatDate(date)}`} className="sticky top-0 z-40 bg-slate-50 border-b border-r border-slate-200 p-1"></th>)}
            <th className="sticky top-0 right-[160px] z-50 bg-slate-50 border-b border-r border-slate-200 p-1 text-[10px] w-8 min-w-[32px] max-w-[32px] box-border shadow-[-1px_0_0_0_#e2e8f0] print:static print:shadow-none">早</th>
            <th className="sticky top-0 right-[128px] z-50 bg-slate-50 border-b border-r border-slate-200 p-1 text-[10px] w-8 min-w-[32px] max-w-[32px] box-border print:static">日</th>
            <th className="sticky top-0 right-[96px] z-50 bg-slate-50 border-b border-r border-slate-200 p-1 text-[10px] w-8 min-w-[32px] max-w-[32px] box-border print:static">遅</th>
            <th className="sticky top-0 right-[64px] z-50 bg-slate-50 border-b border-r border-slate-200 p-1 text-[10px] w-8 min-w-[32px] max-w-[32px] box-border print:static">夜</th>
            <th className="sticky top-0 right-[32px] z-50 bg-slate-50 border-b border-r border-slate-200 p-1 text-[10px] w-8 min-w-[32px] max-w-[32px] box-border print:static">明</th>
            <th className="sticky top-0 right-0 z-50 bg-slate-50 border-b border-slate-200 p-1 text-[10px] w-8 min-w-[32px] max-w-[32px] box-border print:static">休</th>
          </tr>
        </thead>
        <tbody>
          {targetStaff.map((staff) => {
            const offCount = getShiftCount(staff.id, '-');
            const isFullTime = staff.employmentType.includes('正社員') || staff.specialRules.includes('遅番多め');
            const isYamaguchi = staff.specialRules.includes('金曜夜勤のみ');
            const isOffCountMismatch = (isFullTime && !isYamaguchi) && offCount !== publicHolidays;
            
            return (
              <tr key={staff.id} className="hover:bg-slate-50">
                <td className="sticky left-0 z-20 bg-white border-b border-r border-slate-200 p-1 px-2 font-medium text-slate-900 shadow-[1px_0_0_0_#e2e8f0] print:static print:shadow-none">
                  {staff.name}
                </td>
                <td className="border-b border-r border-slate-300 p-0 text-center relative group bg-slate-100">
                  <select
                    value={prevMonthShifts[staff.id] || ''}
                    onChange={(e) => onPrevMonthShiftChange(staff.id, e.target.value as ShiftCode)}
                    className="w-full h-full min-h-[36px] text-center appearance-none bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600 print:appearance-none"
                  >
                    <option value=""></option>
                    {shiftCodes.map((code, index) => (
                      <option key={index} value={code}>{code}</option>
                    ))}
                  </select>
                </td>
                {dates.map((date) => {
                  const dateStr = formatDate(date);
                  const cell = getShift(staff.id, dateStr);
                  const shiftValue = cell?.shift || '';
                  
                  return (
                    <td 
                      key={dateStr} 
                      className="border-b border-r border-slate-200 p-0 text-center relative group print:p-1 bg-white"
                      onContextMenu={(e) => handleRightClickPaste(e, staff.id, dateStr)}
                    >
                      <select
                        value={shiftValue}
                        onChange={(e) => handleDropdownChange(staff.id, dateStr, e.target.value as ShiftCode)}
                        className={`w-full h-full min-h-[36px] text-center appearance-none bg-transparent cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-indigo-50 print:appearance-none print:min-h-0
                          ${cell?.isUserInput ? 'font-bold text-indigo-700 bg-indigo-50/50 print:text-black print:bg-transparent' : 'text-slate-700 print:text-black'}
                        `}
                        title={copiedShift ? `右クリックで「${copiedShift}」を貼り付け` : ''}
                      >
                        <option value=""></option>
                        {shiftCodes.map((code, index) => (
                          <option key={index} value={code}>{code}</option>
                        ))}
                      </select>
                    </td>
                  );
                })}
                <td className="sticky right-[160px] z-20 border-b border-r border-slate-200 p-1 text-center text-xs text-slate-600 bg-slate-50 w-8 min-w-[32px] max-w-[32px] box-border shadow-[-1px_0_0_0_#e2e8f0] print:static print:shadow-none">{getShiftCount(staff.id, '早')}</td>
                <td className="sticky right-[128px] z-20 border-b border-r border-slate-200 p-1 text-center text-xs text-slate-600 bg-slate-50 w-8 min-w-[32px] max-w-[32px] box-border print:static">{getShiftCount(staff.id, '日') + getShiftCount(staff.id, '9:00-17:00')}</td>
                <td className="sticky right-[96px] z-20 border-b border-r border-slate-200 p-1 text-center text-xs text-slate-600 bg-slate-50 w-8 min-w-[32px] max-w-[32px] box-border print:static">{getShiftCount(staff.id, '遅')}</td>
                <td className="sticky right-[64px] z-20 border-b border-r border-slate-200 p-1 text-center text-xs text-slate-600 bg-slate-50 w-8 min-w-[32px] max-w-[32px] box-border print:static">{getShiftCount(staff.id, '夜')}</td>
                <td className="sticky right-[32px] z-20 border-b border-r border-slate-200 p-1 text-center text-xs text-slate-600 bg-slate-50 w-8 min-w-[32px] max-w-[32px] box-border print:static">{getShiftCount(staff.id, '明')}</td>
                <td className={`sticky right-0 z-20 border-b border-slate-200 p-1 text-center text-xs font-bold w-8 min-w-[32px] max-w-[32px] box-border print:static ${isOffCountMismatch ? 'text-red-600 bg-red-50' : 'text-slate-600 bg-slate-50'}`}>
                  {offCount}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="sticky bottom-0 z-40 bg-slate-100 shadow-[0_-1px_0_0_#e2e8f0] print:static print:shadow-none">
          <tr>
            <td className="sticky bottom-0 left-0 z-50 bg-slate-100 border-t-2 border-r border-slate-300 p-1 px-2 font-medium text-slate-700 shadow-[1px_0_0_0_#cbd5e1] print:static print:shadow-none">
              配置完了判定
            </td>
            <td className="sticky bottom-0 z-40 bg-slate-200 border-t-2 border-r border-slate-300 p-1"></td>
            {dates.map(date => {
              const dateStr = formatDate(date);
              const missing = getMissingShifts(dateStr);
              const isComplete = missing.length === 0;
              return (
                <td key={`footer-${dateStr}`} className={`sticky bottom-0 z-40 border-t-2 border-r border-slate-300 p-1 text-center font-bold text-[10px] ${isComplete ? 'text-emerald-600 bg-emerald-50 print:text-black print:bg-transparent' : 'text-red-500 bg-red-50 print:text-black print:bg-transparent'}`}>
                  {isComplete ? '⚪︎' : missing.join(',')}
                </td>
              );
            })}
            <td colSpan={6} className="sticky bottom-0 right-0 z-50 bg-slate-100 border-t-2 border-slate-300 shadow-[-1px_0_0_0_#e2e8f0] print:static print:shadow-none"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
