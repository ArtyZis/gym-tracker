// นาฬิกาเซสชัน — รู้ว่าเล่นมานานแค่ไหนแล้ว และเวลาที่เหลือพอเล่นให้จบไหม
//
// ทำไมต้องมี: คนที่ตารางแน่น (แทรกยิมระหว่างคาบเรียน/หลังเลิกงาน) พลาดเวลาไปเรียน/ไปทำงาน
// เพราะไม่รู้ตัวว่าเล่นมานานแล้ว พอรู้ตัวก็ต้องรีบตัดท่าท้ายทิ้งแบบไม่ได้คิด
//
// คำนวณจาก timestamp ของเซตที่ติ๊ก **ไม่ใช่ setInterval นับถอยหลัง**
// เพราะ iOS Safari suspend JS ทันทีที่สลับแอป/ล็อกจอ ตัวนับจะหยุดแล้วเพี้ยนตอนกลับมา
// (ข้อจำกัดแพลตฟอร์มที่แก้ไม่ได้ — จับเวลาพักก็ใช้วิธีเดียวกันนี้)

import type { Data, DayKey, Exercise } from "./store";
import { effectiveExercisesForDay, todayStr } from "./store";
import { fatigueOf } from "./analyzer";
import { MINUTES_PER_SET } from "./muscles";
import { suggestRest } from "./progression";
import { getDayTimeCap } from "./profile";
import { tierOf } from "./exerciseDB";

export interface SessionClock {
  startedAt: number | null; // เวลาที่ติ๊กเซตแรกของวันนี้
  elapsedMin: number; // เล่นมาแล้วกี่นาที
  capMin: number; // เวลาที่มีทั้งหมดของวันนี้
  remainMin: number; // เหลือกี่นาที (ติดลบได้ = เลยเวลาแล้ว)
  neededMin: number; // ต้องใช้อีกกี่นาทีถึงจะจบตามตาราง
  setsLeft: number;
  exercisesLeft: number;
  tight: boolean; // เวลาไม่พอเล่นให้ครบ
}

// เวลาที่ติ๊กเซตแรกของวันนี้ — null ถ้ายังไม่เริ่ม หรือเป็นข้อมูลเก่าที่ไม่มี timestamp
export function sessionStart(data: Data, day: DayKey): number | null {
  let first: number | null = null;
  for (const ex of effectiveExercisesForDay(data, day)) {
    const s = (data.history[ex.id] || []).find((x) => x.date === todayStr());
    if (!s) continue;
    for (const set of s.sets) {
      if (!set?.at) continue;
      if (first == null || set.at < first) first = set.at;
    }
  }
  return first;
}

// เวลาที่ต้องใช้อีกเพื่อเล่นให้จบ = เวลายกของเซตที่เหลือ + เวลาพักระหว่างเซต
function remainingMinutes(data: Data, exs: Exercise[]): { min: number; sets: number; exercises: number } {
  let min = 0;
  let sets = 0;
  let exercises = 0;
  for (const ex of exs) {
    const s = (data.history[ex.id] || []).find((x) => x.date === todayStr());
    const done = s ? s.sets.filter(Boolean).length : 0;
    const left = Math.max(0, ex.sets - done);
    if (!left) continue;
    exercises++;
    sets += left;
    // เวลาต่อเซตรวมพักอยู่แล้วใน MINUTES_PER_SET แต่ท่าที่ผู้ใช้ตั้งเวลาพักเองต้องใช้ค่าจริง
    const restMin = suggestRest(ex) / 60;
    min += left * Math.max(MINUTES_PER_SET[fatigueOf(ex)], restMin + 0.75);
  }
  return { min: Math.round(min), sets, exercises };
}

export function sessionClock(data: Data, day: DayKey): SessionClock | null {
  const exs = effectiveExercisesForDay(data, day);
  if (!exs.length) return null;

  const startedAt = sessionStart(data, day);
  const capMin = getDayTimeCap(data, day);
  const { min: neededMin, sets: setsLeft, exercises: exercisesLeft } = remainingMinutes(data, exs);

  const elapsedMin = startedAt == null ? 0 : Math.max(0, Math.round((Date.now() - startedAt) / 60000));
  const remainMin = capMin - elapsedMin;

  return {
    startedAt,
    elapsedMin,
    capMin,
    remainMin,
    neededMin,
    setsLeft,
    exercisesLeft,
    tight: neededMin > remainMin,
  };
}

// ท่าที่ควรตัดก่อนถ้าเวลาไม่พอ — เรียงจาก "ตัดแล้วเสียหายน้อยสุด"
//
// กฎ: ห้ามเสนอตัดท่าแรกของวัน (ท่าหลักที่หนักที่สุด ตัดแล้วเสียแก่นของวันนั้นไป)
// เรียงตาม tier ก่อน (B ตัดก่อน A ก่อน S) แล้วค่อยดูความล้า — ท่าเบาตัดแล้วเสียน้อยกว่า
export interface CutCandidate {
  ex: Exercise;
  setsLeft: number;
  savesMin: number;
  tier: string;
}

export function suggestCuts(data: Data, day: DayKey, needMin: number): CutCandidate[] {
  const exs = effectiveExercisesForDay(data, day);
  const rank: Record<string, number> = { B: 0, A: 1, S: 2 };

  const cands: CutCandidate[] = [];
  for (let i = 1; i < exs.length; i++) {
    // ข้าม i = 0 โดยตั้งใจ: ท่าแรกของวันคือท่าหลัก ไม่เสนอตัด
    const ex = exs[i];
    const s = (data.history[ex.id] || []).find((x) => x.date === todayStr());
    const done = s ? s.sets.filter(Boolean).length : 0;
    const left = Math.max(0, ex.sets - done);
    if (!left) continue; // ทำครบแล้ว ตัดไปก็ไม่ประหยัดเวลา
    const restMin = suggestRest(ex) / 60;
    cands.push({
      ex,
      setsLeft: left,
      savesMin: Math.round(left * Math.max(MINUTES_PER_SET[fatigueOf(ex)], restMin + 0.75)),
      tier: tierOf(ex.name),
    });
  }

  cands.sort((a, b) => rank[a.tier] - rank[b.tier] || b.savesMin - a.savesMin);

  // คืนเฉพาะจำนวนที่พอประหยัดเวลาได้ตามต้องการ ไม่เสนอตัดเกินจำเป็น
  const out: CutCandidate[] = [];
  let saved = 0;
  for (const c of cands) {
    if (saved >= needMin) break;
    out.push(c);
    saved += c.savesMin;
  }
  return out;
}
