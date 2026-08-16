// ปริมาณงานจริงต่อสัปดาห์ + จังหวะที่ควรแทรกสัปดาห์เบา
//
// ช่องโหว่ที่ปิด: ตัววิเคราะห์ให้คะแนน "ตารางที่วางไว้" (เซตตามที่ตั้งในท่า)
// แต่ไม่มีอะไรดูว่า "ทำจริงไปเท่าไหร่" ในแต่ละสัปดาห์ ผู้ใช้จึงไม่มีทางเห็นว่า
// ตัวเองไต่จาก 89 เป็น 128 เซตในสัปดาห์เดียว จนกว่าจะรู้สึกพังไปแล้ว
//
// ⚠️ ตัวนี้ **ไม่ได้มีไว้บอกให้ฝึกน้อยลง** — คนที่ตั้งใจดัน 128 เซตก็ควรดันต่อได้
// สิ่งที่มันบอกคือ "ไต่เร็วไปไหม" กับ "ถึงเวลาสัปดาห์เบาหรือยัง" ซึ่งเป็นวิธีที่ทำให้
// ดันปริมาณสูงได้ *นานๆ* ไม่ใช่พังใน 6 สัปดาห์แล้วเลิก
//
// เกณฑ์ที่ใช้ อธิบายได้ทั้งคู่ ไม่ได้ตั้งลอยๆ:
//   ไต่เร็วเกิน = สัปดาห์นี้มากกว่าสัปดาห์ก่อน 30%+ (แนวคิด acute:chronic workload)
//   ถึงเวลาเบา  = ไต่ขึ้น/คงที่ติดกัน 4 สัปดาห์โดยไม่มีสัปดาห์เบาเลย

import type { Data } from "./store";

export interface WeekLoad {
  /** วันจันทร์ของสัปดาห์นั้น รูปแบบ YYYY-MM-DD (เวลาท้องถิ่น) */
  start: string;
  sets: number;
  /** น้ำหนักรวมที่ยก (kg) — เซตที่ไม่มีน้ำหนักนับเป็น 0 */
  volume: number;
  days: number;
}

/** ไต่เร็วเกินเมื่อโตกว่าสัปดาห์ก่อนเกินเท่านี้ */
export const SPIKE_RATIO = 1.3;
/** ไต่ติดกันกี่สัปดาห์แล้วควรแทรกสัปดาห์เบา */
export const BUILD_WEEKS_BEFORE_DELOAD = 4;
/** สัปดาห์เบาควรอยู่ราวๆ กี่ส่วนของปกติ */
export const DELOAD_RATIO = 0.6;

// วันจันทร์ของสัปดาห์ที่วันนั้นอยู่ — คำนวณด้วยเวลาท้องถิ่นล้วน
// (ห้ามใช้ toISOString ที่นี่ มันเป็น UTC แล้วคนฝึกดึกจะถูกนับผิดสัปดาห์ · ดู test-localdate)
export function weekStart(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7)); // อาทิตย์(0) ต้องถอย 6 วัน ไม่ใช่ -1
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** วันจันทร์ของสัปดาห์ปัจจุบัน — ใช้แยกสัปดาห์ที่ยังฝึกไม่จบออกจากสัปดาห์ที่จบแล้ว */
export function currentWeekStart(today = new Date()): string {
  return weekStart(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
}

/**
 * งานจริงรายสัปดาห์ เรียงจากเก่าไปใหม่ — เอาเฉพาะสัปดาห์ที่มีการฝึกจริง
 *
 * สัปดาห์ที่ไม่ได้ฝึกเลยถูกข้าม ไม่ใช่นับเป็น 0 โดยตั้งใจ:
 * คนที่หยุดไปเที่ยว 2 สัปดาห์แล้วกลับมา ไม่ควรถูกมองว่า "ไต่จาก 0 เป็น 128"
 * แล้วโดนเตือนว่าไต่เร็วเกินทั้งที่แค่กลับมาที่เดิม
 */
export function weeklyLoad(data: Data, limit = 8): WeekLoad[] {
  const acc: Record<string, { sets: number; volume: number; days: Set<string> }> = {};
  for (const logs of Object.values(data.history ?? {}))
    for (const s of logs) {
      const done = s.sets.filter(Boolean);
      if (!done.length) continue;
      const w = weekStart(s.date);
      const bucket = (acc[w] ??= { sets: 0, volume: 0, days: new Set() });
      bucket.sets += done.length;
      bucket.days.add(s.date);
      for (const st of done) bucket.volume += (st?.weight ?? 0) * (st?.reps ?? 0);
    }
  return Object.entries(acc)
    .map(([start, v]) => ({ start, sets: v.sets, volume: Math.round(v.volume), days: v.days.size }))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(-limit);
}

export type LoadStatus =
  /** ยังไม่พอจะบอกอะไร (ต้องมีอย่างน้อย 2 สัปดาห์) */
  | { kind: "none" }
  /** ไต่ขึ้นเร็วกว่าที่ร่างกายตามทันโดยทั่วไป */
  | { kind: "spike"; sets: number; prev: number; pct: number }
  /** ดันติดกันหลายสัปดาห์แล้ว ควรแทรกสัปดาห์เบา */
  | { kind: "deloadDue"; weeks: number; sets: number; suggest: number }
  /** กำลังไต่ขึ้นในอัตราที่รับได้ */
  | { kind: "building"; sets: number; prev: number; pct: number }
  /** ทรงตัวหรือลดลง — ปกติดี */
  | { kind: "steady"; sets: number };

/**
 * ดูสถานะจากสัปดาห์ที่ฝึกจริงล่าสุด
 *
 * ไม่รวมสัปดาห์ปัจจุบันถ้ายังไม่จบสัปดาห์ — เพราะวันพุธจะเห็นแค่ครึ่งเดียวของงานทั้งสัปดาห์
 * แล้วสรุปว่า "ลดลง" ทั้งที่ยังฝึกไม่ครบ · ส่งวันนี้เข้ามาเพื่อให้เทสต์กำหนดวันได้
 */
export function loadStatus(data: Data, today = new Date()): LoadStatus {
  const all = weeklyLoad(data, 12);
  const thisWeek = currentWeekStart(today);
  const done = all.filter((w) => w.start < thisWeek); // เอาเฉพาะสัปดาห์ที่จบแล้ว
  if (done.length < 2) return { kind: "none" };

  const cur = done[done.length - 1];
  const prev = done[done.length - 2];
  const pct = prev.sets > 0 ? Math.round(((cur.sets - prev.sets) / prev.sets) * 100) : 0;

  if (prev.sets > 0 && cur.sets >= prev.sets * SPIKE_RATIO) return { kind: "spike", sets: cur.sets, prev: prev.sets, pct };

  // นับถอยหลังว่าดันติดกันกี่สัปดาห์โดยไม่มีสัปดาห์เบาคั่น
  // "สัปดาห์เบา" = ต่ำกว่าสัปดาห์ก่อนหน้าอย่างชัดเจน (< 85%) ไม่ใช่แค่ขยับลงนิดเดียว
  let building = 1;
  for (let i = done.length - 1; i > 0; i--) {
    if (done[i].sets < done[i - 1].sets * 0.85) break;
    building++;
  }
  if (building >= BUILD_WEEKS_BEFORE_DELOAD)
    return { kind: "deloadDue", weeks: building, sets: cur.sets, suggest: Math.round(cur.sets * DELOAD_RATIO) };

  if (pct > 5) return { kind: "building", sets: cur.sets, prev: prev.sets, pct };
  return { kind: "steady", sets: cur.sets };
}
