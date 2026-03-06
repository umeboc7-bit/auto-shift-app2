import { useState, useEffect } from 'react';
import { Calendar, Users, Settings, Play, AlertCircle, Save, Undo, Copy, Printer, Eye, Plus, Trash2, Edit2, Building } from 'lucide-react';
import { INITIAL_STAFF, ALL_RULES, INITIAL_SETTINGS, ALL_SHIFT_CODES } from './constants';
import { ShiftCell, ShiftCode, Staff, FacilityRule, FacilitySettings } from './types';
import ShiftTable from './components/ShiftTable';
import { generateShifts } from './utils/shiftGenerator';
import { generateDateRange, formatDate } from './utils/dateUtils';

export default function App() {
  const [activeTab, setActiveTab] = useState<'shift' | 'staff' | 'rules' | 'settings'>('shift');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [publicHolidays, setPublicHolidays] = useState(9);
  
  // State for Staff and Rules
  const [staffList, setStaffList] = useState<Staff[]>(INITIAL_STAFF);
  const [rules, setRules] = useState<FacilityRule[]>(ALL_RULES);
  const [facilitySettings, setFacilitySettings] = useState<FacilitySettings>(INITIAL_SETTINGS);

  const [shifts, setShifts] = useState<ShiftCell[]>([]);
  const [prevMonthShifts, setPrevMonthShifts] = useState<Record<string, ShiftCode>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Custom UI states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // History for Undo
  const [history, setHistory] = useState<ShiftCell[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Desired Shifts State
  const [desiredShifts, setDesiredShifts] = useState<ShiftCell[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ message, onConfirm });
  };

  // Load from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('shiftData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.year) setYear(parsed.year);
        if (parsed.month) setMonth(parsed.month);
        if (parsed.publicHolidays) setPublicHolidays(parsed.publicHolidays);
        if (parsed.staffList) setStaffList(parsed.staffList);
        if (parsed.rules) setRules(parsed.rules);
        if (parsed.facilitySettings) setFacilitySettings({ ...INITIAL_SETTINGS, ...parsed.facilitySettings, notes: parsed.facilitySettings.notes || [], shiftCodes: parsed.facilitySettings.shiftCodes || INITIAL_SETTINGS.shiftCodes });
        if (parsed.shifts) {
          setShifts(parsed.shifts);
          setHistory([[], parsed.shifts]);
          setHistoryIndex(1);
        }
        if (parsed.desiredShifts) setDesiredShifts(parsed.desiredShifts);
        if (parsed.prevMonthShifts) setPrevMonthShifts(parsed.prevMonthShifts);
      } catch (e) {
        console.error('Failed to load saved data', e);
      }
    }
  }, []);

  const pushToHistory = (newShifts: ShiftCell[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newShifts);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleShiftChange = (staffId: string, date: string, shift: ShiftCode) => {
    setShifts(prev => {
      const existingIndex = prev.findIndex(s => s.staffId === staffId && s.date === date);
      let newShifts = [...prev];
      if (existingIndex >= 0) {
        if (shift === '') {
          newShifts.splice(existingIndex, 1);
        } else {
          newShifts[existingIndex] = { ...newShifts[existingIndex], shift, isFixed: true, isUserInput: true };
        }
      } else {
        if (shift !== '') {
          newShifts.push({ staffId, date, shift, isFixed: true, isUserInput: true });
        }
      }
      pushToHistory(newShifts);
      return newShifts;
    });
  };

  const handlePrevMonthShiftChange = (staffId: string, shift: ShiftCode) => {
    setPrevMonthShifts(prev => ({
      ...prev,
      [staffId]: shift
    }));
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setErrors([]);
    
    setTimeout(() => {
      const dates = generateDateRange(year, month);
      const dateStrs = dates.map(d => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      });
      const fixedShifts = shifts.filter(s => s.isFixed && dateStrs.includes(s.date));
      
      const result = generateShifts(dates, staffList, fixedShifts, prevMonthShifts, publicHolidays, facilitySettings);
      
      setShifts(result.shifts);
      pushToHistory(result.shifts);
      setErrors(result.errors);
      setIsGenerating(false);
    }, 100);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setShifts(history[newIndex]);
    }
  };

  const handleSave = () => {
    // 空のシフトコードを削除
    const cleanedSettings = {
      ...facilitySettings,
      shiftCodes: (facilitySettings.shiftCodes || ALL_SHIFT_CODES).filter(code => code.trim() !== '')
    };
    setFacilitySettings(cleanedSettings);

    const dataToSave = {
      year,
      month,
      publicHolidays,
      staffList,
      rules,
      facilitySettings: cleanedSettings,
      shifts,
      desiredShifts,
      prevMonthShifts
    };
    localStorage.setItem('shiftData', JSON.stringify(dataToSave));
    showToast('現在の状態をブラウザに保存しました。');
  };

  const handleSaveDesiredShifts = () => {
    // 空のシフトコードを削除
    const cleanedSettings = {
      ...facilitySettings,
      shiftCodes: (facilitySettings.shiftCodes || ALL_SHIFT_CODES).filter(code => code.trim() !== '')
    };
    setFacilitySettings(cleanedSettings);

    setDesiredShifts(shifts);
    const dataToSave = {
      year,
      month,
      publicHolidays,
      staffList,
      rules,
      facilitySettings: cleanedSettings,
      shifts,
      desiredShifts: shifts,
      prevMonthShifts
    };
    localStorage.setItem('shiftData', JSON.stringify(dataToSave));
    showToast('希望シフトの状態を保存しました。');
  };

  const handleLoadDesiredShifts = () => {
    if (desiredShifts.length === 0) {
      showToast('保存された希望シフトがありません。', 'error');
      return;
    }
    showConfirm('保存された希望シフトの状態に戻しますか？現在の編集内容は失われます。', () => {
      setShifts(desiredShifts);
      pushToHistory(desiredShifts);
      showToast('希望シフトの状態を復元しました。');
    });
  };

  const handleCopyExcel = () => {
    const dates = generateDateRange(year, month);
    let tsv = 'スタッフ\t前月19日\t' + dates.map(d => `${d.getDate()}日`).join('\t') + '\t早\t日\t遅\t夜\t明\t休\n';
    
    staffList.filter(s => s.isTarget).forEach(staff => {
      let row = `${staff.name}\t${prevMonthShifts[staff.id] || ''}\t`;
      row += dates.map(d => {
        const s = shifts.find(sh => sh.staffId === staff.id && sh.date === formatDate(d));
        return s ? s.shift : '';
      }).join('\t');
      
      const getCount = (code: ShiftCode) => shifts.filter(s => s.staffId === staff.id && s.shift === code).length;
      const dayCount = getCount('日') + getCount('9:00-17:00' as ShiftCode);
      row += `\t${getCount('早')}\t${dayCount}\t${getCount('遅')}\t${getCount('夜')}\t${getCount('明')}\t${getCount('-')}\n`;
      tsv += row;
    });
    
    navigator.clipboard.writeText(tsv).then(() => {
      showToast('Excel用にコピーしました。Excelシートに貼り付けてください。');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      showToast('コピーに失敗しました。', 'error');
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Staff Management
  const addStaff = () => {
    const newStaff: Staff = {
      id: `s${Date.now()}`,
      name: '新規スタッフ',
      employmentType: '正社員',
      canDrive: false,
      isTarget: true,
      unavailableShifts: [],
      fixedDaysOff: [],
      specialRules: []
    };
    setStaffList([...staffList, newStaff]);
  };

  const updateStaff = (id: string, field: keyof Staff, value: any) => {
    setStaffList(staffList.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const deleteStaff = (id: string) => {
    showConfirm('このスタッフを削除してもよろしいですか？', () => {
      setStaffList(staffList.filter(s => s.id !== id));
    });
  };

  // Rule Management
  const addRule = () => {
    const newRule: FacilityRule = {
      id: `r${Date.now()}`,
      name: '新規ルール',
      description: '',
      isActive: true,
      priority: rules.length > 0 ? Math.max(...rules.map(r => r.priority)) + 1 : 1
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (id: string, field: keyof FacilityRule, value: any) => {
    setRules(rules.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const deleteRule = (id: string) => {
    showConfirm('このルールを削除してもよろしいですか？', () => {
      setRules(rules.filter(r => r.id !== id));
    });
  };

  if (isPreviewMode) {
    return (
      <div className="min-h-screen bg-white text-black font-sans p-8">
        <div className="mb-8 flex justify-between items-center print:hidden">
          <h2 className="text-2xl font-bold text-slate-800">印刷プレビュー</h2>
          <div className="flex gap-4">
            <button 
              onClick={() => setIsPreviewMode(false)}
              className="px-4 py-2 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              編集に戻る
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              印刷する
            </button>
          </div>
        </div>
        <div className="mb-4 text-center">
          <h2 className="text-2xl font-bold">{year}年{month}月 シフト表</h2>
        </div>
        <ShiftTable 
          year={year} 
          month={month} 
          staffList={staffList} 
          shifts={shifts} 
          prevMonthShifts={prevMonthShifts}
          onShiftChange={handleShiftChange}
          onPrevMonthShiftChange={handlePrevMonthShiftChange}
          publicHolidays={publicHolidays}
          shiftCodes={facilitySettings.shiftCodes || ALL_SHIFT_CODES}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans print:bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold tracking-tight text-slate-800">
                介護事業所シフト自動生成ツール
              </h1>
            </div>
            
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveTab('shift')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'shift' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  シフト表
                </div>
              </button>
              <button
                onClick={() => setActiveTab('staff')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'staff' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  スタッフ設定
                </div>
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'rules' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  ルール優先順位設定
                </div>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  施設基本設定
                </div>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:p-0 print:max-w-none">
        {activeTab === 'shift' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
              <div className="flex items-center gap-4 flex-wrap">
                <h2 className="text-2xl font-semibold text-slate-800">月間シフト表</h2>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                  <select 
                    value={year} 
                    onChange={e => setYear(Number(e.target.value))}
                    className="bg-transparent font-medium text-slate-700 focus:outline-none"
                  >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}年</option>)}
                  </select>
                  <span className="text-slate-400">/</span>
                  <select 
                    value={month} 
                    onChange={e => setMonth(Number(e.target.value))}
                    className="bg-transparent font-medium text-slate-700 focus:outline-none"
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
                  </select>
                </div>
                
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                  <label className="text-sm font-medium text-slate-600">公休日数:</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="15" 
                    value={publicHolidays}
                    onChange={e => setPublicHolidays(Number(e.target.value))}
                    className="w-16 bg-transparent font-medium text-slate-700 focus:outline-none"
                  />
                  <span className="text-sm text-slate-600">日</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <button 
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-600 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Undo className="w-4 h-4" />
                  元に戻す
                </button>
                <div className="h-6 w-px bg-slate-300 mx-1"></div>
                <button 
                  onClick={handleSaveDesiredShifts}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-blue-700 bg-blue-50 border border-blue-200 shadow-sm hover:bg-blue-100 transition-colors"
                  title="現在のシフトを希望シフトとして保存します"
                >
                  <Save className="w-4 h-4" />
                  希望シフト保存
                </button>
                <button 
                  onClick={handleLoadDesiredShifts}
                  disabled={desiredShifts.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-blue-700 bg-white border border-blue-200 shadow-sm hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="保存した希望シフトの状態に戻します"
                >
                  <Undo className="w-4 h-4" />
                  希望シフト読込
                </button>
                <div className="h-6 w-px bg-slate-300 mx-1"></div>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-600 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
                <button 
                  onClick={handleCopyExcel}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 shadow-sm hover:bg-emerald-100 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Excelコピー
                </button>
                <button 
                  onClick={() => setIsPreviewMode(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-100 border border-slate-300 shadow-sm hover:bg-slate-200 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  プレビュー
                </button>
                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors ${
                    isGenerating 
                      ? 'bg-indigo-400 text-white cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  {isGenerating ? '生成中...' : '自動生成を実行'}
                </button>
              </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-4 text-center">
              <h2 className="text-2xl font-bold text-black">{year}年{month}月 シフト表</h2>
            </div>

            {errors.length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm print:hidden">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-amber-800">自動生成で以下の制約を満たせませんでした（手動で調整してください）</h3>
                    <ul className="mt-2 text-sm text-amber-700 list-disc list-inside space-y-1">
                      {errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            <ShiftTable 
              year={year} 
              month={month} 
              staffList={staffList} 
              shifts={shifts} 
              prevMonthShifts={prevMonthShifts}
              onShiftChange={handleShiftChange}
              onPrevMonthShiftChange={handlePrevMonthShiftChange}
              publicHolidays={publicHolidays}
              shiftCodes={facilitySettings.shiftCodes || ALL_SHIFT_CODES}
            />
            
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm text-sm text-slate-600 print:hidden">
              <p className="font-medium text-slate-800 mb-2">使い方</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>前月19日</strong>の列に、前月の最終シフトを入力してください（「夜」なら20日が「明」に、「明」なら20日が「-」になります）。</li>
                <li><strong>公休日数</strong>を設定してから「自動生成を実行」を押すと、正社員の休日（-）の数がその日数に一致するように自動調整されます。</li>
                <li>「Excelコピー」ボタンを押すと、クリップボードにコピーされます。そのままExcelのA1セルに貼り付けてください。</li>
                <li>「プレビュー」ボタンで、不要なUIを隠してシフト表だけを綺麗に確認・印刷できます。</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="space-y-6 print:hidden">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-slate-800">スタッフ設定</h2>
              <button 
                onClick={addStaff}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                スタッフ追加
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/6">名前</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/6">雇用形態</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/12">運転</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/6">対象</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/6">NGシフト (カンマ区切り)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/6">個人ルール (カンマ区切り)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input 
                          type="text" 
                          value={staff.name} 
                          onChange={e => updateStaff(staff.id, 'name', e.target.value)}
                          className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1 border"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select 
                          value={staff.employmentType}
                          onChange={e => updateStaff(staff.id, 'employmentType', e.target.value)}
                          className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1 border"
                        >
                          <option value="正社員">正社員</option>
                          <option value="パート">パート</option>
                          <option value="その他">その他</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input 
                          type="checkbox" 
                          checked={staff.canDrive}
                          onChange={e => updateStaff(staff.id, 'canDrive', e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input 
                          type="checkbox" 
                          checked={staff.isTarget}
                          onChange={e => updateStaff(staff.id, 'isTarget', e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input 
                          type="text" 
                          value={staff.unavailableShifts.join(',')} 
                          onChange={e => updateStaff(staff.id, 'unavailableShifts', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                          placeholder="早,遅"
                          className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1 border"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input 
                          type="text" 
                          value={staff.specialRules.join(',')} 
                          onChange={e => updateStaff(staff.id, 'specialRules', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                          placeholder="遅番多め,日勤のみ"
                          className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1 border"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => deleteStaff(staff.id)} className="text-red-600 hover:text-red-900">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4" /> 設定を保存
              </button>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6 print:hidden">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-slate-800">施設ルール設定（優先順位・内容の追加修正）</h2>
              <button 
                onClick={addRule}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                ルール追加
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <ul className="divide-y divide-slate-200">
                {rules.sort((a, b) => a.priority - b.priority).map((rule) => (
                  <li key={rule.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-16">
                        <label className="block text-xs text-slate-500 mb-1">優先順位</label>
                        <input 
                          type="number" 
                          value={rule.priority}
                          onChange={e => updateRule(rule.id, 'priority', Number(e.target.value))}
                          className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1 border text-center"
                        />
                      </div>
                      <div className="flex-grow">
                        <input 
                          type="text" 
                          value={rule.name}
                          onChange={e => updateRule(rule.id, 'name', e.target.value)}
                          placeholder="ルール名"
                          className="w-full font-medium text-slate-900 border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-1 border mb-2"
                        />
                        <textarea 
                          value={rule.description}
                          onChange={e => updateRule(rule.id, 'description', e.target.value)}
                          placeholder="ルールの詳細説明"
                          rows={2}
                          className="w-full text-sm text-slate-500 border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-1 border"
                        />
                      </div>
                      <div className="flex-shrink-0 pt-6">
                        <button onClick={() => deleteRule(rule.id)} className="text-red-600 hover:text-red-900">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4" /> 設定を保存
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 print:hidden">
            <h2 className="text-2xl font-semibold text-slate-800">施設基本設定（各シフトの必要人数など）</h2>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">早番の必要人数（1日あたり）</label>
                  <input 
                    type="number" 
                    min="0"
                    value={facilitySettings.reqHaya}
                    onChange={e => setFacilitySettings({...facilitySettings, reqHaya: Number(e.target.value)})}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">日勤の必要人数（1日あたり）</label>
                  <input 
                    type="number" 
                    min="0"
                    value={facilitySettings.reqNichi}
                    onChange={e => setFacilitySettings({...facilitySettings, reqNichi: Number(e.target.value)})}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">遅番の必要人数（1日あたり）</label>
                  <input 
                    type="number" 
                    min="0"
                    value={facilitySettings.reqOso}
                    onChange={e => setFacilitySettings({...facilitySettings, reqOso: Number(e.target.value)})}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">夜勤の必要人数（1日あたり）</label>
                  <input 
                    type="number" 
                    min="0"
                    value={facilitySettings.reqYoru}
                    onChange={e => setFacilitySettings({...facilitySettings, reqYoru: Number(e.target.value)})}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">日勤のうち運転可能スタッフの必要人数</label>
                  <input 
                    type="number" 
                    min="0"
                    value={facilitySettings.reqDriverNichi}
                    onChange={e => setFacilitySettings({...facilitySettings, reqDriverNichi: Number(e.target.value)})}
                    className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <input 
                    type="checkbox" 
                    id="nightFollowedByOff"
                    checked={facilitySettings.nightFollowedByOff}
                    onChange={e => setFacilitySettings({...facilitySettings, nightFollowedByOff: e.target.checked})}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="nightFollowedByOff" className="ml-2 block text-sm font-medium text-slate-700">
                    夜勤明けの次の日は必ず休みとする（夜・明・休セット）
                  </label>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-slate-800">シフトコード設定</h3>
                  <button
                    onClick={() => setFacilitySettings({...facilitySettings, shiftCodes: [...(facilitySettings.shiftCodes || ALL_SHIFT_CODES), '']})}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
                  >
                    <Plus className="w-4 h-4" /> シフトコードを追加
                  </button>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-slate-500 mb-2">シフト表で選択できるシフトのリストです。※「早」「日」「遅」「夜」「明」「-」などの基本シフトは自動生成ロジックで使用されるため、変更・削除にはご注意ください。</p>
                  <div className="flex flex-wrap gap-2">
                    {(facilitySettings.shiftCodes || ALL_SHIFT_CODES).map((code, index) => (
                      <div key={index} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                        <input
                          type="text"
                          value={code}
                          onChange={(e) => {
                            const newCodes = [...(facilitySettings.shiftCodes || ALL_SHIFT_CODES)];
                            newCodes[index] = e.target.value;
                            setFacilitySettings({...facilitySettings, shiftCodes: newCodes});
                          }}
                          className="w-20 bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-slate-700"
                        />
                        <button
                          onClick={() => {
                            const newCodes = [...(facilitySettings.shiftCodes || ALL_SHIFT_CODES)];
                            newCodes.splice(index, 1);
                            setFacilitySettings({...facilitySettings, shiftCodes: newCodes});
                          }}
                          className="text-slate-400 hover:text-red-500"
                          title="削除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-slate-800">施設基本設定のメモ（箇条書き）</h3>
                  <button
                    onClick={() => setFacilitySettings({...facilitySettings, notes: [...(facilitySettings.notes || []), '']})}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
                  >
                    <Plus className="w-4 h-4" /> メモを追加
                  </button>
                </div>
                <div className="space-y-3">
                  {(facilitySettings.notes || []).map((note, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <span className="mt-2 text-slate-400">•</span>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => {
                          const newNotes = [...(facilitySettings.notes || [])];
                          newNotes[index] = e.target.value;
                          setFacilitySettings({...facilitySettings, notes: newNotes});
                        }}
                        placeholder="メモを入力..."
                        className="flex-1 border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      />
                      <button
                        onClick={() => {
                          const newNotes = [...(facilitySettings.notes || [])];
                          newNotes.splice(index, 1);
                          setFacilitySettings({...facilitySettings, notes: newNotes});
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!facilitySettings.notes || facilitySettings.notes.length === 0) && (
                    <p className="text-sm text-slate-500 italic">メモはまだありません。「メモを追加」ボタンから追加してください。</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4" /> 設定を保存
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium z-50 transition-all print:hidden ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{confirmDialog.message}</h3>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                キャンセル
              </button>
              <button 
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700"
              >
                実行する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
