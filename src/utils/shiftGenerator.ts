import { Staff, ShiftCell, ShiftCode, FacilitySettings } from '../types';
import { formatDate } from './dateUtils';

export function generateShifts(
  dates: Date[],
  staffList: Staff[],
  initialShifts: ShiftCell[],
  prevMonthShifts: Record<string, ShiftCode>,
  publicHolidays: number,
  settings: FacilitySettings
): { shifts: ShiftCell[], errors: string[] } {
  const shifts: ShiftCell[] = [...initialShifts];
  const errors: string[] = [];
  
  const targetStaff = staffList.filter(s => s.isTarget);
  const dateStrs = dates.map(d => formatDate(d));
  
  // Helper to get shift
  const getShift = (staffId: string, date: string): ShiftCode | '' => {
    const s = shifts.find(s => s.staffId === staffId && s.date === date);
    return s ? s.shift : '';
  };
    
  // Helper to set shift
  const setShift = (staffId: string, date: string, shift: ShiftCode, isFixed = false) => {
    const existingIndex = shifts.findIndex(s => s.staffId === staffId && s.date === date);
    if (existingIndex >= 0) {
      if (!shifts[existingIndex].isFixed) {
        shifts[existingIndex].shift = shift;
        if (isFixed) shifts[existingIndex].isFixed = true;
      }
    } else {
      shifts.push({ staffId, date, shift, isFixed });
    }
  };

  // 0. Apply Previous Month Rules to the 20th (first day)
  const firstDateStr = dateStrs[0];
  targetStaff.forEach(staff => {
    const prevShift = prevMonthShifts[staff.id];
    if (prevShift === '夜') {
      setShift(staff.id, firstDateStr, '明', true);
      if (dates.length > 1) {
        setShift(staff.id, dateStrs[1], '-', true); // 絶対に休み
      }
    } else if (prevShift === '明') {
      setShift(staff.id, firstDateStr, '-', true); // 絶対に休み
    }
  });

  // 1. Staff Fixed Conditions
  targetStaff.forEach(staff => {
    dates.forEach(date => {
      const dateStr = formatDate(date);
      const dayOfWeek = date.getDay();
      
      // Fixed days off (if any) or special rules for days off
      if (staff.fixedDaysOff && staff.fixedDaysOff.includes(dayOfWeek)) {
        if (getShift(staff.id, dateStr) !== '有') setShift(staff.id, dateStr, '-', true);
      }
      if (staff.specialRules.includes('月曜休み') && dayOfWeek === 1 && getShift(staff.id, dateStr) !== '有') setShift(staff.id, dateStr, '-', true);
      if (staff.specialRules.includes('火曜休み') && dayOfWeek === 2 && getShift(staff.id, dateStr) !== '有') setShift(staff.id, dateStr, '-', true);
      if (staff.specialRules.includes('水曜休み') && dayOfWeek === 3 && getShift(staff.id, dateStr) !== '有') setShift(staff.id, dateStr, '-', true);
      if (staff.specialRules.includes('木曜休み') && dayOfWeek === 4 && getShift(staff.id, dateStr) !== '有') setShift(staff.id, dateStr, '-', true);
      if (staff.specialRules.includes('金曜休み') && dayOfWeek === 5 && getShift(staff.id, dateStr) !== '有') setShift(staff.id, dateStr, '-', true);
      if (staff.specialRules.includes('土曜休み') && dayOfWeek === 6 && getShift(staff.id, dateStr) !== '有') setShift(staff.id, dateStr, '-', true);
      if (staff.specialRules.includes('日曜休み') && dayOfWeek === 0 && getShift(staff.id, dateStr) !== '有') setShift(staff.id, dateStr, '-', true);
      
      // Mon-Thu blank, Fri Night
      if (staff.specialRules.includes('金曜夜勤のみ')) {
        if (dayOfWeek >= 1 && dayOfWeek <= 4) {
          if (getShift(staff.id, dateStr) !== '有') setShift(staff.id, dateStr, '-', true);
        }
        if (dayOfWeek === 5) {
          const current = getShift(staff.id, dateStr);
          if (current !== '有') {
            setShift(staff.id, dateStr, '夜', true);
            // Sat 明, Sun -
            const sat = new Date(date); sat.setDate(sat.getDate() + 1);
            const sun = new Date(date); sun.setDate(sun.getDate() + 2);
            if (sat <= dates[dates.length-1] && getShift(staff.id, formatDate(sat)) !== '有') setShift(staff.id, formatDate(sat), '明', true);
            if (sun <= dates[dates.length-1] && getShift(staff.id, formatDate(sun)) !== '有') setShift(staff.id, formatDate(sun), '-', true);
          }
        }
      }
    });
  });

  // 2. Night Shifts
  const nightCandidates = targetStaff.filter(s => s.employmentType.includes('正社員') || s.specialRules.includes('金曜夜勤のみ'));
  const nightCounts: Record<string, number> = {};
  nightCandidates.forEach(s => nightCounts[s.id] = 0);

  dates.forEach(date => {
    const dateStr = formatDate(date);
    // 全スタッフから夜勤の人数をカウントする（固定シフトや山口さんの分を含めるため）
    let currentNightCount = targetStaff.filter(s => getShift(s.id, dateStr) === '夜').length;
    
    while (currentNightCount < settings.reqYoru) {
      const available = nightCandidates.filter(s => {
        if (s.unavailableShifts.includes('夜')) return false;
        if (getShift(s.id, dateStr)) return false;
        
        // 金曜夜勤のみのスタッフは金曜日以外は夜勤不可
        if (s.specialRules.includes('金曜夜勤のみ') && date.getDay() !== 5) return false;
        
        const prev = new Date(date); prev.setDate(prev.getDate() - 1);
        if (prev >= dates[0]) {
          if (getShift(s.id, formatDate(prev)) === '夜') return false;
        } else {
          if (prevMonthShifts[s.id] === '夜') return false;
        }
        
        const next1 = new Date(date); next1.setDate(next1.getDate() + 1);
        const next2 = new Date(date); next2.setDate(next2.getDate() + 2);
        if (next1 <= dates[dates.length-1] && getShift(s.id, formatDate(next1))) return false;
        if (next2 <= dates[dates.length-1] && getShift(s.id, formatDate(next2))) return false;
        return true;
      });

      if (available.length > 0) {
        available.sort((a, b) => nightCounts[a.id] - nightCounts[b.id]);
        const chosen = available[0];
        setShift(chosen.id, dateStr, '夜', true); // 夜勤は固定扱いにする
        nightCounts[chosen.id]++;
        
        const next1 = new Date(date); next1.setDate(next1.getDate() + 1);
        const next2 = new Date(date); next2.setDate(next2.getDate() + 2);
        if (next1 <= dates[dates.length-1]) setShift(chosen.id, formatDate(next1), '明', true); // 絶対に明
        if (next2 <= dates[dates.length-1]) setShift(chosen.id, formatDate(next2), '-', true); // 絶対に休み
        currentNightCount++;
      } else {
        errors.push(`${dateStr}の夜勤を${settings.reqYoru}名確保できません`);
        break;
      }
    }
  });

  // 3. Early Shifts
  const earlyCandidates = targetStaff.filter(s => !s.unavailableShifts.includes('早'));
  const earlyCounts: Record<string, number> = {};
  earlyCandidates.forEach(s => earlyCounts[s.id] = 0);

  dates.forEach(date => {
    const dateStr = formatDate(date);
    let currentHayaCount = targetStaff.filter(s => getShift(s.id, dateStr) === '早').length;
    
    while (currentHayaCount < settings.reqHaya) {
      let available = earlyCandidates.filter(s => {
        if (s.unavailableShifts.includes('早')) return false;
        if (getShift(s.id, dateStr)) return false;
        
        const prev = new Date(date); prev.setDate(prev.getDate() - 1);
        if (prev >= dates[0]) {
          if (getShift(s.id, formatDate(prev)) === '早') return false;
          if (getShift(s.id, formatDate(prev)) === '遅') return false;
        } else {
          if (prevMonthShifts[s.id] === '早') return false;
          if (prevMonthShifts[s.id] === '遅') return false;
        }
        return true;
      });

      // フォールバック: 早番の必要人数に満たない場合、前日のシフト制限を解除して再度探す
      if (available.length === 0 && currentHayaCount < settings.reqHaya) {
        available = earlyCandidates.filter(s => {
          if (s.unavailableShifts.includes('早')) return false;
          if (getShift(s.id, dateStr)) return false;
          return true;
        });
      }

      if (available.length > 0) {
        available.sort((a, b) => {
          // 早番中心のスタッフを優先
          const aPriority = a.specialRules.includes('早番含む日勤のみ') ? -20 : (a.employmentType.includes('パート') ? -10 : 0);
          const bPriority = b.specialRules.includes('早番含む日勤のみ') ? -20 : (b.employmentType.includes('パート') ? -10 : 0);
          if (aPriority !== bPriority) return aPriority - bPriority;
          return earlyCounts[a.id] - earlyCounts[b.id];
        });
        const chosen = available[0];
        setShift(chosen.id, dateStr, '早');
        earlyCounts[chosen.id]++;
        currentHayaCount++;
      } else {
        errors.push(`${dateStr}の早番を${settings.reqHaya}名確保できません`);
        break;
      }
    }
  });

  // 4. Late Shifts
  const lateCandidates = targetStaff.filter(s => !s.unavailableShifts.includes('遅'));
  const lateCounts: Record<string, number> = {};
  lateCandidates.forEach(s => lateCounts[s.id] = 0);

  dates.forEach(date => {
    const dateStr = formatDate(date);
    let currentOsoCount = targetStaff.filter(s => getShift(s.id, dateStr) === '遅').length;
    
    while (currentOsoCount < settings.reqOso) {
      const available = lateCandidates.filter(s => {
        if (s.unavailableShifts.includes('遅')) return false;
        if (getShift(s.id, dateStr)) return false;
        return true;
      });

      if (available.length > 0) {
        available.sort((a, b) => {
          // 遅番多めのスタッフを最優先、次に正社員
          const getPriority = (staff: any) => {
            if (staff.specialRules.includes('遅番多め')) return -20;
            if (staff.employmentType.includes('正社員')) return -10;
            return 0;
          };
          const aPriority = getPriority(a);
          const bPriority = getPriority(b);
          if (aPriority !== bPriority) return aPriority - bPriority;
          // バランスを取る
          return lateCounts[a.id] - lateCounts[b.id];
        });
        const chosen = available[0];
        setShift(chosen.id, dateStr, '遅');
        lateCounts[chosen.id]++;
        currentOsoCount++;
      } else {
        errors.push(`${dateStr}の遅番を${settings.reqOso}名確保できません`);
        break;
      }
    }
  });

  // 5. Day Shifts
  const dayCounts: Record<string, number> = {};
  targetStaff.forEach(s => {
    dayCounts[s.id] = shifts.filter(sh => sh.staffId === s.id && (sh.shift === '日' || sh.shift === '9:00-17:00') && dateStrs.includes(sh.date)).length;
  });

  dates.forEach(date => {
    const dateStr = formatDate(date);
    const dayOfWeek = date.getDay();
    // Use reqNichi from settings
    const requiredDay = settings.reqNichi;
    
    let currentDayCount = targetStaff.filter(s => {
      const shift = getShift(s.id, dateStr);
      return shift === '日' || shift === '9:00-17:00';
    }).length;

    let currentDrivers = targetStaff.filter(s => {
      const shift = getShift(s.id, dateStr);
      return (shift === '日' || shift === '9:00-17:00') && s.canDrive;
    }).length;

    const dayCandidates = targetStaff.filter(s => {
      if (s.unavailableShifts.includes('日')) return false;
      if (s.specialRules.includes('金曜夜勤のみ')) return false; // 金曜夜勤のみのスタッフは絶対に日勤に入れない
      if (getShift(s.id, dateStr)) return false;
      return true;
    });

    dayCandidates.sort((a, b) => {
      // 日勤のみのスタッフの日勤優先度を上げる
      const aPriority = a.specialRules.includes('日勤のみ') ? -20 : 0;
      const bPriority = b.specialRules.includes('日勤のみ') ? -20 : 0;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return dayCounts[a.id] - dayCounts[b.id];
    });

    // Assign drivers first if needed
    for (const candidate of dayCandidates) {
      if (currentDayCount >= requiredDay) break;
      if (currentDrivers >= settings.reqDriverNichi) break;
      
      if (candidate.canDrive && !getShift(candidate.id, dateStr)) {
        const shiftCode = candidate.specialRules.includes('9:00-17:00特例') ? '9:00-17:00' : '日';
        setShift(candidate.id, dateStr, shiftCode);
        dayCounts[candidate.id]++;
        currentDayCount++;
        currentDrivers++;
      }
    }

    // Fill remaining Nichi slots
    for (const candidate of dayCandidates) {
      if (currentDayCount >= requiredDay) break;
      if (!getShift(candidate.id, dateStr)) {
        const shiftCode = candidate.specialRules.includes('9:00-17:00特例') ? '9:00-17:00' : '日';
        setShift(candidate.id, dateStr, shiftCode);
        dayCounts[candidate.id]++;
        currentDayCount++;
      }
    }

    if (currentDayCount < requiredDay) {
      errors.push(`${dateStr}の日勤が足りません（現在${currentDayCount}名/必要${requiredDay}名）`);
    }
    if (currentDrivers < settings.reqDriverNichi) {
      errors.push(`${dateStr}の日勤に運転可能スタッフが足りません（現在${currentDrivers}名/必要${settings.reqDriverNichi}名）`);
    }
  });

  // 6. Fill remaining working days for full-time staff to meet publicHolidays requirement
  // Full-time staff need to work (dates.length - publicHolidays) days in total.
  
  const getConsecutiveWorkingDays = (staffId: string, dateIndex: number): number => {
    let count = 1;
    for (let i = dateIndex - 1; i >= 0; i--) {
      const s = getShift(staffId, dateStrs[i]);
      if (s && s !== '-') count++;
      else break;
    }
    for (let i = dateIndex + 1; i < dateStrs.length; i++) {
      const s = getShift(staffId, dateStrs[i]);
      if (s && s !== '-') count++;
      else break;
    }
    return count;
  };

  targetStaff.forEach(staff => {
    const isFullTime = staff.employmentType.includes('正社員') || 
                       staff.specialRules.includes('遅番多め');
                       
    const isYamaguchi = staff.specialRules.includes('金曜夜勤のみ');
    
    if (isFullTime && !isYamaguchi) { 
      const targetWorkingDays = dates.length - publicHolidays;
      let currentWorkingDays = shifts.filter(s => s.staffId === staff.id && s.shift !== '-' && s.shift !== '' && dateStrs.includes(s.date)).length;
      
      let emptyDates = dates.map(d => formatDate(d)).filter(d => !getShift(staff.id, d));
      let neededWorkingDays = targetWorkingDays - currentWorkingDays;
      
      // Assign '日' one by one to the best available empty date
      while (neededWorkingDays > 0 && emptyDates.length > 0) {
        // Sort empty dates to find the best day to work
        emptyDates.sort((dateA, dateB) => {
          // 1. Prefer days with fewer total working staff
          const workingA = targetStaff.filter(s => {
            const shift = getShift(s.id, dateA);
            return shift && shift !== '-' && shift !== '有';
          }).length;
          const workingB = targetStaff.filter(s => {
            const shift = getShift(s.id, dateB);
            return shift && shift !== '-' && shift !== '有';
          }).length;
          
          if (workingA !== workingB) return workingA - workingB;
          
          // 2. Prefer days that don't create long consecutive working streaks
          const indexA = dateStrs.indexOf(dateA);
          const indexB = dateStrs.indexOf(dateB);
          const consecA = getConsecutiveWorkingDays(staff.id, indexA);
          const consecB = getConsecutiveWorkingDays(staff.id, indexB);
          
          return consecA - consecB;
        });

        const chosenDate = emptyDates[0];
        let shiftCode = '日';
        
        const currentHaya = targetStaff.filter(s => getShift(s.id, chosenDate) === '早').length;
        const currentOso = targetStaff.filter(s => getShift(s.id, chosenDate) === '遅').length;
        const currentNichi = targetStaff.filter(s => {
          const shift = getShift(s.id, chosenDate);
          return shift === '日' || shift === '9:00-17:00';
        }).length;

        if (staff.specialRules.includes('9:00-17:00特例')) {
          shiftCode = '9:00-17:00';
        } else if (staff.specialRules.includes('早番含む日勤のみ')) {
          const prev = new Date(chosenDate); prev.setDate(prev.getDate() - 1);
          const prevShift = prev >= dates[0] ? getShift(staff.id, formatDate(prev)) : prevMonthShifts[staff.id];
          if (currentHaya < settings.reqHaya && prevShift !== '早' && prevShift !== '遅') {
            shiftCode = '早';
          } else {
            shiftCode = '日';
          }
        } else {
          // 外国人正社員（遅番多め）は運転免許がなく早番ができないため、
          // 結果として日本人正社員よりも遅番が多くなる。
          // そのため、ここでは不足しているシフト（日勤・遅番）をバランスよく割り当てる。
          const prev = new Date(chosenDate); prev.setDate(prev.getDate() - 1);
          const prevShift = prev >= dates[0] ? getShift(staff.id, formatDate(prev)) : prevMonthShifts[staff.id];
          
          // 不足しているシフトを優先的に割り当てる
          if (currentHaya < settings.reqHaya && !staff.unavailableShifts.includes('早') && prevShift !== '早' && prevShift !== '遅') {
            shiftCode = '早';
          } else if (currentOso < settings.reqOso && !staff.unavailableShifts.includes('遅')) {
            shiftCode = '遅';
          } else if (currentNichi < settings.reqNichi && !staff.unavailableShifts.includes('日')) {
            shiftCode = '日';
          } else {
            // 不足がない場合は、日勤か遅番をバランスよく（早番は負担が大きいので避ける）
            if (!staff.unavailableShifts.includes('遅') && currentOso <= currentNichi) {
              shiftCode = '遅';
            } else if (!staff.unavailableShifts.includes('日')) {
              shiftCode = '日';
            } else if (!staff.unavailableShifts.includes('早') && prevShift !== '早' && prevShift !== '遅') {
              shiftCode = '早';
            }
          }
        }
        
        setShift(staff.id, chosenDate, shiftCode);
        
        // Update state for next iteration
        emptyDates = emptyDates.filter(d => d !== chosenDate);
        neededWorkingDays--;
      }
    }
  });

  // 7. Any remaining empty slots become days off ('-')
  targetStaff.forEach(staff => {
    dates.forEach(date => {
      const dateStr = formatDate(date);
      if (!getShift(staff.id, dateStr)) {
        setShift(staff.id, dateStr, '-');
      }
    });
    
    // Check if public holidays are met for full-time staff
    const isFullTime = staff.employmentType.includes('正社員') || 
                       staff.specialRules.includes('遅番多め');
                       
    const isYamaguchi = staff.specialRules.includes('金曜夜勤のみ');
    
    if (isFullTime || isYamaguchi) { 
      const currentOffs = shifts.filter(s => s.staffId === staff.id && s.shift === '-' && dateStrs.includes(s.date)).length;
      if (currentOffs < publicHolidays) {
        errors.push(`${staff.name}の休日が公休日数（${publicHolidays}日）を満たしていません（現在${currentOffs}日）。`);
      }
    }
  });

  // 8. Ensure minimum 1 person per core shift (絶対条件: 毎日最低1人は各シフトに割り当てる)
  // 対象シフト: 早, 日(9:00-17:00含む), 遅, 休(-)
  // ※夜・明はStep2でセットされるため、ここでは早、日、遅、休の最終調整を行う
  // 優先順位: 早番が0人の場合、日勤が2人以上いれば日勤から早番へ変更する
  const coreShifts = ['早', '日', '遅'];
  
  dates.forEach(date => {
    const dateStr = formatDate(date);
    const shiftsOnDate = shifts.filter(s => s.date === dateStr);
    
    const getCount = (code: string) => {
      if (code === '日') {
        return shiftsOnDate.filter(s => s.shift === '日' || s.shift === '9:00-17:00').length;
      }
      return shiftsOnDate.filter(s => s.shift === code).length;
    };

    // 早番の特別処理: 早番が0人で、日勤が2人以上いる場合は日勤から早番へ
    if (getCount('早') === 0 && getCount('日') >= 2) {
      const dayCandidates = shiftsOnDate.filter(s => !s.isFixed && (s.shift === '日' || s.shift === '9:00-17:00'));
      const validForEarly = dayCandidates.filter(c => {
        const staff = targetStaff.find(st => st.id === c.staffId);
        return staff && !staff.unavailableShifts.includes('早');
      });

      if (validForEarly.length > 0) {
        // 早番含む日勤のみのスタッフを優先的に早番に回す
        validForEarly.sort((a, b) => {
          const staffA = targetStaff.find(st => st.id === a.staffId);
          const staffB = targetStaff.find(st => st.id === b.staffId);
          const aPriority = staffA?.specialRules.includes('早番含む日勤のみ') ? -1 : 0;
          const bPriority = staffB?.specialRules.includes('早番含む日勤のみ') ? -1 : 0;
          return aPriority - bPriority;
        });
        // 早番に入れる人を1人選んで変更
        setShift(validForEarly[0].staffId, dateStr, '早');
      }
    }

    // その他のシフトの最低人数確保
    coreShifts.forEach(targetShift => {
      // 最新のカウントを取得
      const currentShiftsOnDate = shifts.filter(s => s.date === dateStr);
      const currentGetCount = (code: string) => {
        if (code === '日') {
          return currentShiftsOnDate.filter(s => s.shift === '日' || s.shift === '9:00-17:00').length;
        }
        return currentShiftsOnDate.filter(s => s.shift === code).length;
      };

      if (currentGetCount(targetShift) === 0) {
        // 2人以上いるシフトから1人削って割り当てる
        const abundantShifts = coreShifts.filter(code => currentGetCount(code) >= 2);
        
        // 日勤が余っている場合は日勤から削るのを優先する
        abundantShifts.sort((a, b) => {
          if (a === '日') return -1;
          if (b === '日') return 1;
          return currentGetCount(b) - currentGetCount(a);
        });
        
        for (const abundantShift of abundantShifts) {
          const candidates = currentShiftsOnDate.filter(s => {
            if (s.isFixed) return false;
            if (abundantShift === '日') {
              return s.shift === '日' || s.shift === '9:00-17:00';
            }
            return s.shift === abundantShift;
          });

          const validCandidates = candidates.filter(c => {
            const staff = targetStaff.find(st => st.id === c.staffId);
            if (!staff) return false;
            
            if (targetShift === '早' && staff.unavailableShifts.includes('早')) return false;
            if (targetShift === '遅' && staff.unavailableShifts.includes('遅')) return false;
            if (targetShift === '日' && staff.unavailableShifts.includes('日')) return false;
            
            return true;
          });

          if (validCandidates.length > 0) {
            // 早川さんを優先的に早番に回す（遅番はNGなので早番のみ）
            validCandidates.sort((a, b) => {
              const staffA = targetStaff.find(st => st.id === a.staffId);
              const staffB = targetStaff.find(st => st.id === b.staffId);
              const aPriority = (targetShift === '早' && staffA?.name.includes('早川')) ? -1 : 0;
              const bPriority = (targetShift === '早' && staffB?.name.includes('早川')) ? -1 : 0;
              return aPriority - bPriority;
            });
            const staffId = validCandidates[0].staffId;
            const staff = targetStaff.find(st => st.id === staffId);
            let newShiftCode = targetShift;
            if (targetShift === '日' && staff?.specialRules.includes('9:00-17:00特例')) {
              newShiftCode = '9:00-17:00';
            }
            setShift(staffId, dateStr, newShiftCode);
            break; // 補充完了
          }
        }
      }
    });
  });

  return { shifts, errors };
}
