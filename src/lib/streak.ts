// Streak: นับ "วันฝึกที่ทำได้ตามตาราง ติดต่อกันโดยไม่พลาด"
//
// กติกา 3 ข้อ (ผู้ใช้กำหนดเอง):
//   1. วันฝึกตามตาราง + ฝึกแล้ว        -> +1
//   2. วันพัก (ไม่มีท่าในตารางวันนั้น)  -> ไม่นับเพิ่ม แต่ไม่ตัด (โปร่งใส ข้ามไปเฉยๆ)
//   3. วันฝึกตามตาราง + ไม่ได้ฝึก      -> ตัดสตรีค เว้นแต่ไปชดเชยครบทีหลัง
//
// ข้อ 2 เคยเป็น "วันพักนับเป็นวันต่อเนื่องด้วย" แล้วผู้ใช้เปลี่ยนใจ เพราะสตรีคที่เดินหน้า
// เองตอนนอนอยู่บ้านมันไม่ได้วัดอะไร — ตัวเลขต้องแปลว่า "ฝึกไปกี่วันโดยไม่พลาด"

import type { Data, DayKey } from "./store";
import { JS_DAYS, exercisesForDay, makeupSlots } from "./store";
import { isLoop, slotForDate } from "./loop";
import { isEN } from "./i18n";

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
      // ท่าต้องเป็นของวันนั้นจริง หรือเป็นวันที่ดึงมาชดเชยในวันนั้น — ไม่งั้นคือติ๊กข้ามวัน
      if (slotOf(new Date(t)) !== exDay && !makeupSlots(data, s.date).includes(exDay)) continue;
      map.set(s.date, (map.get(s.date) || 0) + n);
    }
  }
  return map;
}

// วันที่ชดเชย "ครบทุกท่า" ของช่องวันนั้น — ได้ 1 เครดิตไว้ลบล้างวันที่พลาดของช่องเดียวกัน
//
// ต้องครบทุกท่าจริงๆ ไม่ใช่แค่แตะไปบ้าง ไม่งั้นเล่นท่าเดียวก็ลบล้างวันที่ขาดทั้งวันได้
// เครดิตนึงลบล้างได้วันเดียว และต้องเกิดหลังวันที่พลาดเท่านั้น
function makeupCredits(data: Data): { slot: DayKey; date: string }[] {
  const out: { slot: DayKey; date: string }[] = [];
  for (const [date, slots] of Object.entries(data.makeup ?? {}))
    for (const slot of slots) {
      const exs = exercisesForDay(data, slot);
      if (!exs.length) continue;
      const full = exs.every((ex) => {
        const s = (data.history[ex.id] || []).find((h) => h.date === date);
        return s ? s.sets.filter(Boolean).length >= ex.sets : false;
      });
      if (full) out.push({ slot, date });
    }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ── หลักฐานการฝึก ──
//
// ตัวเลขที่ "ปลอมยาก" สำหรับใส่ในการ์ดแชร์แรงค์
// ใครก็พิมพ์น้ำหนัก 200 กก. ลงไปแล้วได้แรงค์ S ในนาทีเดียว แต่ปลอม "ฝึกมา 240 วัน
// ตลอด 14 เดือน" ไม่ได้ ต้องเปิดแอปบันทึกจริงทุกครั้ง — ตัวเลขนี้จึงเป็นตัวแยก
// ของจริงกับของปลอม และเป็นเหตุผลที่ต้องโชว์คู่กับแรงค์เสมอ
export interface TrainingProof {
  days: number; // จำนวนวันที่มีการบันทึกจริง
  sets: number; // เซตทั้งหมดที่เคยบันทึก
  firstDate: string | null; // วันแรกที่บันทึก
  months: number; // ระยะเวลาตั้งแต่วันแรกถึงวันนี้ (เดือน)
}

export function trainingProof(data: Data): TrainingProof {
  const perDay = setsPerDay(data);
  const dates = [...perDay.keys()].sort();
  const sets = [...perDay.values()].reduce((a, b) => a + b, 0);
  const first = dates[0] ?? null;
  const months = first ? Math.max(1, Math.round((Date.now() - Date.parse(first + "T00:00:00")) / 2_592_000_000)) : 0;
  return { days: perDay.size, sets, firstDate: first, months };
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

  const dates = [...trained.keys()].sort();
  const firstMs = dates.length ? Date.parse(dates[0] + "T00:00:00") : null;

  // ผลของแต่ละวัน: นับเพิ่ม / ข้ามไปเฉยๆ / ตัดสตรีค
  // credits ถูก "ใช้ไป" เมื่อลบล้างวันที่พลาดแล้ว จึงต้องส่ง array ที่แก้ได้เข้ามา
  const verdict = (cursor: Date, credits: { slot: DayKey; date: string }[]): "count" | "skip" | "break" => {
    const key = dateKey(cursor);
    if ((trained.get(key) || 0) > 0) return "count";
    if (!scheduled(cursor) && !makeupSlots(data, key).length) return "skip"; // วันพัก
    // วันฝึกแต่ไม่ได้ฝึก — รอดได้ถ้ามีวันชดเชยครบของช่องวันนี้ "หลังจาก" วันนี้
    const slot = slotOf(cursor);
    const idx = credits.findIndex((c) => c.slot === slot && c.date > key);
    if (idx >= 0) {
      credits.splice(idx, 1);
      return "skip";
    }
    return "break";
  };

  // สตรีคปัจจุบัน — เดินถอยหลังจากวันนี้
  // **ต้องหยุดที่วันฝึกครั้งแรกเสมอ** ไม่งั้นจะไล่ข้ามวันพักย้อนไปก่อนที่ผู้ใช้จะเคยฝึก
  let current = 0;
  if (firstMs != null) {
    const credits = makeupCredits(data);
    const cursor = new Date();
    for (let i = 0; i < 730; i++) {
      const day = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()).getTime();
      if (day < firstMs) break;
      const v = verdict(cursor, credits);
      if (v === "count") current++;
      else if (v === "break" && i > 0) break; // วันนี้ยังไม่จบวัน จึงยังไม่ถือว่าขาด
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // best: สแกนไปข้างหน้าตั้งแต่วันฝึกครั้งแรกด้วยกติกาเดียวกัน
  let best = current;
  if (dates.length) {
    const credits = makeupCredits(data);
    let run = 0;
    const d = new Date(dates[0] + "T00:00:00");
    const end = new Date();
    while (d <= end) {
      const v = verdict(d, credits);
      if (v === "count") {
        run++;
        if (run > best) best = run;
      } else if (v === "break") {
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
  const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTHS = isEN() ? MONTH_EN : MONTH_TH;

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
      monthLabels.push({ col: c, label: MONTHS[lastMonth] });
    }
    grid.push(col);
  }
  return { grid, monthLabels };
}
