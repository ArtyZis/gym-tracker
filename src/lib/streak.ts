// Streak: นับวันฝึกต่อเนื่อง — วันพัก (weekday ที่ไม่มีท่าในโปรแกรม) ไม่ตัด streak

import type { Data, DayKey } from "./store";
import { JS_DAYS, exercisesForDay } from "./store";

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// จำนวนเซตที่ติ๊กแล้วต่อวัน (รวมทุกท่า)
export function setsPerDay(data: Data): Map<string, number> {
  const map = new Map<string, number>();
  for (const sessions of Object.values(data.history))
    for (const s of sessions) {
      const n = s.sets.filter(Boolean).length;
      if (n) map.set(s.date, (map.get(s.date) || 0) + n);
    }
  return map;
}

export interface StreakInfo {
  current: number;
  best: number;
  trainedThisWeek: number;
}

export function computeStreak(data: Data): StreakInfo {
  const trained = setsPerDay(data);
  const scheduled = (d: Date) => exercisesForDay(data, JS_DAYS[d.getDay()] as DayKey).length > 0;

  // current: เดินถอยหลังจากวันนี้ วันที่ฝึก → นับ, วันพัก → ข้าม,
  // วันที่มีตารางแต่ไม่ฝึก → หยุด (ยกเว้นวันนี้ที่ยังไม่จบวัน)
  let current = 0;
  const cursor = new Date();
  for (let i = 0; i < 730; i++) {
    const key = dateKey(cursor);
    const didTrain = (trained.get(key) || 0) > 0;
    if (didTrain) current++;
    else if (i > 0 && scheduled(cursor)) break;
    cursor.setDate(cursor.getDate() - 1);
  }

  // best: สแกนช่วงวันที่มีประวัติทั้งหมดด้วยกติกาเดียวกัน
  let best = current;
  const dates = [...trained.keys()].sort();
  if (dates.length) {
    let run = 0;
    const d = new Date(dates[0] + "T00:00:00");
    const end = new Date();
    while (d <= end) {
      const key = dateKey(d);
      const didTrain = (trained.get(key) || 0) > 0;
      if (didTrain) {
        run++;
        if (run > best) best = run;
      } else if (scheduled(d)) {
        run = 0;
      }
      d.setDate(d.getDate() + 1);
    }
  }

  // จำนวนวันฝึกในสัปดาห์นี้ (จันทร์-อาทิตย์)
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  let trainedThisWeek = 0;
  const w = new Date(monday);
  for (let i = 0; i < 7; i++) {
    if ((trained.get(dateKey(w)) || 0) > 0) trainedThisWeek++;
    w.setDate(w.getDate() + 1);
  }

  return { current, best, trainedThisWeek };
}

export interface HeatCell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  inFuture: boolean;
}

// ตาราง heatmap แบบ GitHub: คอลัมน์ = สัปดาห์ (จันทร์บนสุด), ย้อนหลัง `weeks` สัปดาห์
export function heatmapGrid(data: Data, weeks = 16): { grid: HeatCell[][]; monthLabels: { col: number; label: string }[] } {
  const trained = setsPerDay(data);
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const start = new Date(monday);
  start.setDate(start.getDate() - 7 * (weeks - 1));

  const level = (n: number): HeatCell["level"] => (n === 0 ? 0 : n <= 3 ? 1 : n <= 7 ? 2 : n <= 12 ? 3 : 4);
  const MONTH_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

  const grid: HeatCell[][] = [];
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let c = 0; c < weeks; c++) {
    const col: HeatCell[] = [];
    for (let r = 0; r < 7; r++) {
      const d = new Date(start);
      d.setDate(start.getDate() + c * 7 + r);
      const key = dateKey(d);
      const count = trained.get(key) || 0;
      col.push({ date: key, count, level: level(count), inFuture: d > now });
    }
    const firstOfCol = new Date(start);
    firstOfCol.setDate(start.getDate() + c * 7);
    if (firstOfCol.getMonth() !== lastMonth) {
      lastMonth = firstOfCol.getMonth();
      monthLabels.push({ col: c, label: MONTH_TH[lastMonth] });
    }
    grid.push(col);
  }
  return { grid, monthLabels };
}
