// คำนวณเป้าน้ำหนักวันนี้ + warm-up ramp จากประวัติครั้งล่าสุด

import type { Data, Exercise, SetLog } from "./store";
import { todayStr } from "./store";
import { muscleMap } from "./analyzer";

export interface TargetSuggestion {
  weight: number | null;
  kind: "start" | "up" | "hold" | "push";
  msg: string;
}

export function suggestTarget(data: Data, ex: Exercise): TargetSuggestion {
  const sessions = (data.history[ex.id] || []).filter((s) => s.date !== todayStr());
  const last = sessions[sessions.length - 1];
  const done: SetLog[] = last ? (last.sets.filter(Boolean) as SetLog[]) : [];

  if (!done.length)
    return { weight: null, kind: "start", msg: "เซสชันแรก: เลือกน้ำหนักที่ทำได้ตามเป้าแบบเหลือแรง 1-2 ครั้ง" };

  if (ex.type === "weight") {
    const w = done[0].weight || 0;
    return done.every((s) => (s.reps || 0) >= ex.rmax)
      ? {
          weight: +(w + (ex.inc || 2.5)).toFixed(1),
          kind: "up",
          msg: `ครั้งก่อนครบทุกเซต — วันนี้ขึ้นเป็น ${(w + (ex.inc || 2.5)).toFixed(1)} ${ex.unit || "kg"}`,
        }
      : {
          weight: w,
          kind: "hold",
          msg: `คงน้ำหนัก ${w} ${ex.unit || "kg"} แล้วดันครั้งให้ถึง ${ex.rmax}`,
        };
  }

  if (ex.type === "time") {
    const best = Math.max(...done.map((s) => s.duration || 0));
    return best >= ex.rmax
      ? {
          weight: null,
          kind: "up",
          msg: `ค้างครบแล้ว — ลองยืดเป็น ${ex.rmin + 5}-${ex.rmax + 5} วิ`,
        }
      : {
          weight: null,
          kind: "push",
          msg: `ครั้งก่อนค้างได้ ${best} วิ — เป้าวันนี้ ${ex.rmax} วิ`,
        };
  }

  const best = Math.max(...done.map((s) => s.reps || 0));
  return ex.amrap
    ? {
        weight: null,
        kind: best > 20 ? "up" : "push",
        msg:
          best > 20
            ? `ได้ ${best} ครั้งแล้ว — เพิ่มความยาก (ถ่วงน้ำหนัก/ท่ายากขึ้น)`
            : `ครั้งก่อนได้ ${best} ครั้ง — วันนี้ลองเกินอีก 1-2`,
      }
    : {
        weight: null,
        kind: "push",
        msg: `ครั้งก่อนได้ ${best} ครั้ง — เป้าวันนี้ ${ex.rmax}`,
      };
}

export interface WarmupStep {
  pct: number;
  weight: number;
  reps: number;
}

export function warmupRamp(ex: Exercise, workingWeight: number | null): WarmupStep[] {
  if (ex.type !== "weight" || !workingWeight || workingWeight <= 0) return [];
  const inc = ex.inc || 2.5;
  const round = (w: number) => Math.max(inc, Math.round(w / inc) * inc);
  return workingWeight < 15
    ? [{ pct: 50, weight: round(0.5 * workingWeight), reps: 10 }]
    : workingWeight < 40
      ? [
          { pct: 50, weight: round(0.5 * workingWeight), reps: 8 },
          { pct: 75, weight: round(0.75 * workingWeight), reps: 3 },
        ]
      : [
          { pct: 40, weight: round(0.4 * workingWeight), reps: 8 },
          { pct: 60, weight: round(0.6 * workingWeight), reps: 5 },
          { pct: 80, weight: round(0.8 * workingWeight), reps: 2 },
        ];
}

// แผ่นน้ำหนักมาตรฐานต่อข้าง
export function plateCalc(target: number, bar: number): { list: number[]; leftover: number } {
  let perSide = (target - bar) / 2;
  const list: number[] = [];
  for (const p of [25, 20, 15, 10, 5, 2.5, 1.25]) {
    while (perSide >= p - 0.001) {
      list.push(p);
      perSide -= p;
    }
  }
  return { list, leftover: perSide };
}

// ท่า compound (โดนหลายกล้ามเนื้อ) ต้องพักนานกว่า เพราะใช้ระบบประสาท/พลังงานเยอะกว่า
function isCompound(ex: Exercise): boolean {
  const hits = muscleMap(ex.name);
  if (hits.length >= 2) return true; // โดนตั้งแต่ 2 กลุ่มขึ้นไป
  return hits.some((h) => h.w >= 1) && /squat|deadlift|press|row|pull.?up|chin.?up|lunge|thrust|dip/i.test(ex.name);
}

// เวลาพักที่แนะนำต่อท่า (วินาที) — อิงหลัก: ยิ่งหนัก/เรปต่ำ ยิ่งพักนาน, compound พักนานกว่า isolation
export function suggestRest(ex: Exercise): number {
  if (ex.restSec != null) return ex.restSec; // ผู้ใช้ตั้งเองมาก่อน

  if (ex.type === "time") return 60;

  const compound = isCompound(ex);
  const top = ex.amrap ? 12 : ex.rmax; // AMRAP ถือเป็นช่วงกลาง

  let base: number;
  if (top <= 5) base = 180; // แรงล้วน 1-5 ครั้ง
  else if (top <= 8) base = compound ? 165 : 135; // หนัก 6-8
  else if (top <= 12) base = compound ? 120 : 90; // สร้างกล้าม 8-12
  else if (top <= 15) base = compound ? 90 : 75; // 12-15
  else base = 60; // เรปสูง 15+

  if (!compound && base > 90) base -= 15; // isolation ที่เรปต่ำก็ไม่ต้องพักนานเท่า compound

  return base;
}

// จัดข้อความสั้นบอกเหตุผลเวลาพัก
export function restReason(ex: Exercise): string {
  if (ex.restSec != null) return "ตั้งเอง";
  if (ex.type === "time") return "ท่าจับเวลา";
  const compound = isCompound(ex);
  const top = ex.amrap ? 12 : ex.rmax;
  if (top <= 5) return "ยกหนักมาก ฟื้นแรงเต็มที่";
  if (top <= 8) return compound ? "compound หนัก" : "ยกหนัก";
  if (top <= 12) return compound ? "compound สร้างกล้าม" : "สร้างกล้าม";
  if (top <= 15) return "เรปสูง พักสั้น";
  return "เรปสูงมาก พักสั้น";
}
