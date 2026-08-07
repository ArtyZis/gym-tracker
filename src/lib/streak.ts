// Streak: นับวันฝึกต่อเนื่อง — วันพัก (weekday ที่ไม่มีท่าในโปรแกรม) ไม่ตัด streak

import type { Data, DayKey } from "./store";
import { JS_DAYS, exercisesForDay } from "./store";
import { isLoop, slotForDate } from "./loop";

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// จำนวนเซตที่ติ๊กแล้วต่อวัน (รวมทุกท่า) — ใช้กับ heatmap ที่ต้องการเห็นทุกการเคลื่อนไหว
export function setsPerDay(data: Data): Map<string, number> {
  const map = new Map<string, number>();
  for (const sessions of Object.values(data.history))
    for (const s of sessions) {
      const n = s.sets.filter(Boolean).length;
      if (n) map.set(s.date, (map.get(s.date) || 0) + n);
    }
  return map;
}

// เซตที่ติ๊ก "ตรงกับวันของตัวเอง" ต่อวัน — ใช้กับสตรีคเท่านั้น
//
// ทำไมต้องแยกจาก setsPerDay: การกดติ๊กเซตจะบันทึกลงวันที่ปัจจุบันเสมอ
// ไม่ว่าจะกำลังเปิดดูตารางของวันไหนอยู่ ดังนั้นถ้าวันจันทร์เผลอไปเปิดดูตารางวันเสาร์
// แล้วกดติ๊กเล่น สตรีคจะเด้งขึ้นทั้งที่ยังไม่ได้ฝึกวันจันทร์จริง
// สตรีคจึงต้องนับเฉพาะเซตของท่าที่อยู่ในวันที่ตรงกับวันนั้นจริงๆ
function scheduledSetsPerDay(data: Data, slotOf: (d: Date) => DayKey): Map<string, number> {
  const dayOfEx = new Map(data.exercises.map((e) => [e.id, e.day]));
  const map = new Map<string, number>();
  for (const [exId, sessions] of Object.entries(data.history)) {
    const exDay = dayOfEx.get(exId);
    if (!exDay) continue; // ท่าถูกลบไปแล้ว — ไม่รู้ว่าเคยอยู่วันไหน ไม่เอามานับสตรีค
    for (const s of sessions) {
      const n = s.sets.filter(Boolean).length;
      if (!n) continue;
      const t = Date.parse(s.date + "T00:00:00");
      if (!Number.isFinite(t)) continue;
      if (slotOf(new Date(t)) !== exDay) continue; // ติ๊กข้ามวัน — ไม่นับ
      map.set(s.date, (map.get(s.date) || 0) + n);
    }
  }
  return map;
}

export interface StreakInfo {
  current: number;
  best: number;
  trainedThisWeek: number;
}

export function computeStreak(data: Data): StreakInfo {
  // ตารางแบบรอบไม่ผูกกับวันในสัปดาห์ ต้องหาว่าวันนั้นตกช่องไหนของรอบก่อน
  // ถ้ายังใช้ JS_DAYS จะได้ช่องผิด แล้ว "วันที่มีตารางแต่ไม่ฝึก" จะตัดสตรีคมั่ว
  const slotOf = (d: Date): DayKey =>
    isLoop(data) ? slotForDate(data, dateKey(d)) : (JS_DAYS[d.getDay()] as DayKey);
  const scheduled = (d: Date) => exercisesForDay(data, slotOf(d)).length > 0;
  const trained = scheduledSetsPerDay(data, slotOf);

  // กติกาการนับ (ต่อ 1 วัน):
  //   วันฝึกและฝึกแล้ว   -> นับ
  //   วันพักตามโปรแกรม   -> นับด้วย เพราะการพักคือส่วนหนึ่งของโปรแกรม
  //                        คนที่ทำตามโปรแกรมครบไม่ควรโดนหยุดนับเพราะโปรแกรมสั่งให้พัก
  //   วันฝึกแต่ยังไม่ฝึก -> ตัดสตรีค (ยกเว้นวันนี้ที่ยังไม่จบวัน — ข้ามไปเฉยๆ ไม่นับไม่ตัด)
  //
  // **ต้องหยุดที่วันฝึกครั้งแรกเสมอ** ไม่งั้นกฎ "วันพักนับด้วย" จะไล่นับวันพัก
  // ย้อนไปก่อนที่ผู้ใช้จะเคยฝึกครั้งแรกด้วย สตรีคพองเกินจริงหลายเท่า
  // (เคสจริง: ฝึกวันเดียวเมื่อ 2 วันก่อน ได้สตรีค 9 ทั้งที่ควรเป็น 3)
  const dates = [...trained.keys()].sort();
  const firstMs = dates.length ? Date.parse(dates[0] + "T00:00:00") : null;

  let current = 0;
  if (firstMs != null) {
    const cursor = new Date();
    for (let i = 0; i < 730; i++) {
      const day = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()).getTime();
      if (day < firstMs) break;
      const didTrain = (trained.get(dateKey(cursor)) || 0) > 0;
      if (didTrain || !scheduled(cursor)) current++;
      else if (i > 0) break; // วันฝึกที่ผ่านมาแล้วแต่ไม่ได้ฝึก = ขาด
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // best: สแกนตั้งแต่วันฝึกครั้งแรกถึงวันนี้ด้วยกติกาเดียวกัน
  let best = current;
  if (dates.length) {
    let run = 0;
    const d = new Date(dates[0] + "T00:00:00");
    const end = new Date();
    while (d <= end) {
      const didTrain = (trained.get(dateKey(d)) || 0) > 0;
      if (didTrain || !scheduled(d)) {
        run++;
        if (run > best) best = run;
      } else {
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
