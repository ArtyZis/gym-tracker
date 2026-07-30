// ตารางแบบรอบ (loop) — หมุนเวียนเป็นรอบ ไม่ผูกกับวันในสัปดาห์
//
// ใครใช้: คนทำงานเป็นกะ นักเรียนที่ตารางไม่ซ้ำทุกสัปดาห์ หรือคนที่ใช้ PPL แบบ
// "ดัน-ดึง-ขา-พัก วนไป" ซึ่งวันจันทร์ของสัปดาห์นี้กับสัปดาห์หน้าเป็นคนละท่ากัน
//
// วิธีเก็บ — จงใจ **ไม่เพิ่มฟิลด์ลง Exercise เลย**:
// ใช้ช่อง DayKey ทั้ง 7 ที่มีอยู่แล้วเป็น "ช่องของรอบ" แทน
//   mon = วันที่ 1 · tue = วันที่ 2 · ... · sun = วันที่ 7
// เก็บเพิ่มแค่ความยาวรอบกับวันที่ที่เป็นวันที่ 1 เท่านั้น
//
// ทำไมถึงเลือกแบบนี้: ประวัติการฝึกผูกกับ exercise.id ไม่ใช่วัน และทุกอย่าง
// (ตัววิเคราะห์ · โครงตาราง · หน้าจอ) ทำงานบน DayKey อยู่แล้ว
// ถ้าเพิ่มฟิลด์ใหม่ลง Exercise ต้องเขียน migration และเสี่ยงข้อมูลเก่าพัง
// ส่วนรอบยาวเกิน 7 วันแทบไม่มีใครใช้จริง จึงยอมจำกัดที่ 7 เพื่อแลกกับความปลอดภัย

import type { Data, DayKey } from "./store";
import { DAYS, DAY_TH, todayStr } from "./store";

export const MIN_LOOP_LEN = 2;
export const MAX_LOOP_LEN = 7;

const MS_DAY = 86400000;

export const isLoop = (d: Data): boolean => !!d.loop && d.loop.len >= MIN_LOOP_LEN;

/** ความยาวรอบที่ใช้คำนวณระยะห่าง — โหมดปกติคือสัปดาห์ = 7 */
export const cycleLen = (d: Data): number => (isLoop(d) ? Math.min(MAX_LOOP_LEN, d.loop!.len) : 7);

/** ช่องวันที่ใช้งานจริง — โหมดรอบจะเหลือเท่าความยาวรอบ ที่เกินไม่แสดง */
export const activeDays = (d: Data): DayKey[] => (isLoop(d) ? DAYS.slice(0, cycleLen(d)) : DAYS);

/** วันนี้ตกที่ช่องไหนของรอบ */
export function todaySlot(d: Data): DayKey {
  if (!isLoop(d)) {
    const js: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    return js[new Date().getDay()];
  }
  return slotForDate(d, todayStr());
}

/** วันที่ (YYYY-MM-DD) ตกที่ช่องไหนของรอบ */
export function slotForDate(d: Data, date: string): DayKey {
  const len = cycleLen(d);
  const anchor = d.loop?.anchor;
  if (!anchor) return DAYS[0];
  const diff = Math.round((Date.parse(date) - Date.parse(anchor)) / MS_DAY);
  if (!Number.isFinite(diff)) return DAYS[0];
  return DAYS[(((diff % len) + len) % len)];
}

/** ชื่อช่องสำหรับแสดงผล — โหมดรอบใช้ "วันที่ N" แทนชื่อวันในสัปดาห์ */
export const slotName = (d: Data, day: DayKey): string =>
  isLoop(d) ? `วันที่ ${DAYS.indexOf(day) + 1}` : DAY_TH[day];

/** ชื่อย่อสำหรับปุ่มเลือกวัน (ที่แคบ) */
export const slotShort = (d: Data, day: DayKey): string =>
  isLoop(d) ? String(DAYS.indexOf(day) + 1) : ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"][DAYS.indexOf(day)];

/**
 * ตั้งว่า "วันนี้คือวันที่ N ของรอบ" แล้วคำนวณ anchor ย้อนกลับให้
 * เก็บ anchor เป็นวันที่จริงแทนที่จะเก็บ "ตอนนี้อยู่วันที่เท่าไหร่"
 * เพราะแบบหลังต้องมีอะไรมาคอยเลื่อนทุกวัน ถ้าผู้ใช้ไม่เปิดแอปข้ามวันจะเพี้ยนทันที
 * ส่วน anchor คำนวณจากวันที่ปัจจุบันเสมอ ไม่ต้องพึ่งการเปิดแอป
 */
export function anchorFor(slotIndex1Based: number, len: number, today = todayStr()): string {
  const back = ((slotIndex1Based - 1) % len + len) % len;
  return new Date(Date.parse(today) - back * MS_DAY).toISOString().slice(0, 10);
}

/** อีกกี่วันจะถึงช่องนี้อีกครั้ง (ใช้บอกว่า "วันขาอีก 2 วัน") */
export function daysUntilSlot(d: Data, day: DayKey): number {
  const len = cycleLen(d);
  const cur = DAYS.indexOf(todaySlot(d));
  const target = DAYS.indexOf(day);
  return (((target - cur) % len) + len) % len;
}
