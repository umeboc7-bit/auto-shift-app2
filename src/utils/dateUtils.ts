export function generateDateRange(year: number, month: number): Date[] {
  // month is 1-12
  // Start on 20th of previous month
  const startDate = new Date(year, month - 1, 20);
  // End on 21st of current month
  const endDate = new Date(year, month, 21);
  
  const dates: Date[] = [];
  let current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];
