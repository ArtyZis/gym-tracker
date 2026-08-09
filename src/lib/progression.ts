// คำนวณเป้าน้ำหนักวันนี้ + warm-up ramp จากประวัติครั้งล่าสุด

import type { Data, Exercise, SetLog } from "./store";
import { todayStr } from "./store";
import { muscleMap } from "./analyzer";
import { findTemplate } from "./exerciseDB";

export interface TargetSuggestion {
  weight: number | null;
  kind: "start" | "up" | "hold" | "push" | "settle";
  msg: string;
}

// ── นิสัยการขึ้นน้ำหนักต่างกันตามชนิดท่า ──
//
// ท่าเดี่ยว (isolation) โดยเฉพาะเคเบิล/ดัมเบลเล็ก ขึ้นน้ำหนักทีคือกระโดดเป็น % ที่เยอะมาก
// เทียบกับท่ารวม เช่น lateral raise 5→7.5 kg คือ +50% ซึ่งไม่มีทางทำเรปเท่าเดิมได้
// ท่าพวกนี้จึงต้อง "ดันเรปให้เต็มช่วงก่อน" แล้วค่อยขยับน้ำหนัก และคุมฟอร์มสำคัญกว่าตัวเลข
//
// คืนคำแนะนำเป็นข้อความสั้นๆ ต่อท้าย เพื่อให้ผู้ใช้รู้ว่าทำไมระบบถึงไม่รีบให้ขึ้นน้ำหนัก
export interface LiftStyle {
  /** ต้องทำเรปเต็มช่วงติดกันกี่ครั้งก่อนถึงจะแนะนำให้ขึ้นน้ำหนัก */
  holdRounds: number;
  /** ขยับน้ำหนักได้ทีละกี่เท่าของ inc */
  stepMul: number;
  note?: string;
}

export function liftStyle(ex: Exercise): LiftStyle {
  const t = findTemplate(ex.name);
  const isolation = t?.pattern === "isolation";
  const cable = t?.equip?.includes("cable");
  const machine = t?.equip?.includes("machine");
  const heavy = t?.fatigue === "high";

  if (isolation && cable)
    return {
      holdRounds: 2,
      stepMul: 1,
      note: "ท่าเดี่ยวแบบเคเบิล — คุมฟอร์มให้นิ่งแล้วดันเรปให้เต็มช่วงก่อน ยังไม่ต้องรีบเพิ่มน้ำหนัก",
    };
  if (isolation)
    return { holdRounds: 2, stepMul: 1, note: "ท่าเดี่ยว — เพิ่มเรปให้เต็มช่วงก่อน แล้วค่อยขยับน้ำหนักทีละสเต็ปเล็ก" };
  if (machine) return { holdRounds: 1, stepMul: 1, note: "เครื่อง — ขยับตามหมุดที่มี ถ้ากระโดดแล้วเรปตกเยอะให้กลับมาน้ำหนักเดิม" };
  if (heavy) return { holdRounds: 1, stepMul: 1, note: "ท่าหนัก — ขึ้นทีละน้อยและคงฟอร์มไว้สำคัญกว่าตัวเลข" };
  return { holdRounds: 1, stepMul: 1 };
}

/** เซตที่ทำได้จริง แยกตามน้ำหนัก — ใช้ดูว่ามีการลดน้ำหนักกลางท่าไหม */
interface SetGroup {
  weight: number;
  reps: number[];
}

function groupByWeight(done: SetLog[]): SetGroup[] {
  const map = new Map<number, number[]>();
  for (const s of done) {
    const w = s.weight ?? 0;
    if (!map.has(w)) map.set(w, []);
    map.get(w)!.push(s.reps || 0);
  }
  return [...map.entries()].map(([weight, reps]) => ({ weight, reps })).sort((a, b) => b.weight - a.weight);
}

/** ปัดน้ำหนักให้ลงหมุด/แผ่นที่มีจริง */
const roundToStep = (w: number, step: number): number => Math.max(step, +(Math.round(w / step) * step).toFixed(2));

export function suggestTarget(data: Data, ex: Exercise): TargetSuggestion {
  const sessions = (data.history[ex.id] || []).filter((s) => s.date !== todayStr());
  const last = sessions[sessions.length - 1];
  const done: SetLog[] = last ? (last.sets.filter(Boolean) as SetLog[]) : [];

  if (!done.length) {
    // ยังไม่เคยเล่นท่านี้ — ถ้าเคยประเมินไว้จากท่าหลัก ใช้เป็นจุดตั้งต้น
    // ต้องบอกชัดว่าเป็น "ค่าประมาณ" ไม่ใช่ตัวเลขที่รู้แน่ ผู้ใช้จะได้ปรับตามจริงตั้งแต่เซตแรก
    if (ex.seededTarget && ex.type === "weight")
      return {
        weight: ex.seededTarget,
        kind: "start",
        msg: `ค่าประมาณจากท่าหลัก ~${ex.seededTarget} ${ex.unit || "kg"} — ลองเซตแรกแล้วปรับตามจริงได้เลย`,
      };
    return { weight: null, kind: "start", msg: "เซสชันแรก: เลือกน้ำหนักที่ทำได้ตามเป้าแบบเหลือแรง 1-2 ครั้ง" };
  }

  if (ex.type === "weight") {
    const unit = ex.unit || "kg";
    const inc = ex.inc || 2.5;
    const style = liftStyle(ex);
    const groups = groupByWeight(done);
    const rir = done.map((s) => s.rir).filter((v): v is number => typeof v === "number").pop();
    const tail = style.note ? ` · ${style.note}` : "";

    // ── เคสที่เดิมพลาด: น้ำหนักไม่เท่ากันในแต่ละเซต ──
    //
    // เซตแรกหนักเกินจนทำไม่ถึงเป้า แล้วต้องลดลงมาเซตหลัง = ยังหา "น้ำหนักที่ใช่" ไม่เจอ
    // ของเดิมอ่านแค่เซตแรกแล้วสั่งให้คงน้ำหนักนั้นและดันเรปให้ถึง ซึ่งเป็นเป้าที่เพิ่ง
    // พิสูจน์ไปเองแล้วว่าทำไม่ได้ · ที่ถูกคือเสนอน้ำหนักกลางที่น่าจะทำครบได้ทั้งชุด
    if (groups.length > 1) {
      const top = groups[0]; // หนักสุด
      const bottom = groups[groups.length - 1]; // เบาสุด
      const topOk = top.reps.every((r) => r >= ex.rmax);
      if (!topOk) {
        const mid = roundToStep((top.weight + bottom.weight) / 2, inc);
        // ค่ากลางต้องอยู่ระหว่างสองฝั่งจริง ไม่งั้นเสนอเท่าเดิมก็ไม่มีประโยชน์
        const target = mid >= top.weight ? roundToStep(top.weight - inc, inc) : mid <= bottom.weight ? roundToStep(bottom.weight + inc, inc) : mid;
        return {
          weight: target,
          kind: "settle",
          msg: `ครั้งก่อนลดจาก ${top.weight} เหลือ ${bottom.weight} ${unit} กลางท่า — ลอง ${target} ${unit} ให้ครบ ${ex.rmax} ครั้งทั้ง ${ex.sets} เซต${tail}`,
        };
      }
    }

    const w = groups[0].weight;
    const allHit = done.every((s) => (s.reps || 0) >= ex.rmax);

    if (allHit) {
      // ครบเป้าทุกเซตแล้ว แต่ยังเหลือแรงเยอะ = ขึ้นได้เลยไม่ต้องรอ
      // เหลือแรงน้อย = ท่าเดี่ยวควรย้ำอีกรอบก่อน (กระโดดทีเป็น % เยอะ)
      const easy = rir !== undefined && rir >= 3;
      if (!easy && style.holdRounds > 1 && rir !== undefined && rir <= 1)
        return {
          weight: w,
          kind: "hold",
          msg: `ครบ ${ex.rmax} ครั้งแล้วแต่เหลือแรงแค่ ${rir} — ย้ำ ${w} ${unit} อีกรอบให้สบายขึ้นก่อนค่อยเพิ่ม${tail}`,
        };
      const next = roundToStep(w + inc * style.stepMul, inc);
      return {
        weight: next,
        kind: "up",
        msg: `ครั้งก่อนครบทุกเซต${easy ? ` และยังเหลือแรง ${rir}` : ""} — วันนี้ขึ้นเป็น ${next} ${unit}${tail}`,
      };
    }

    // ยังไม่ถึงเป้า — คงน้ำหนักแล้วดันเรป ยกเว้นหนักเกินจนหลุดช่วงล่าง
    const worst = Math.min(...done.map((s) => s.reps || 0));
    if (worst < ex.rmin) {
      const down = roundToStep(w - inc, inc);
      return {
        weight: down,
        kind: "settle",
        msg: `ครั้งก่อนได้แค่ ${worst} ครั้ง ต่ำกว่าช่วงเป้า ${ex.rmin}-${ex.rmax} — ลดเป็น ${down} ${unit} แล้วทำให้ครบก่อน${tail}`,
      };
    }
    return {
      weight: w,
      kind: "hold",
      msg: `คงน้ำหนัก ${w} ${unit} แล้วดันครั้งให้ถึง ${ex.rmax}${rir !== undefined ? ` (ครั้งก่อนเหลือแรง ${rir})` : ""}${tail}`,
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
// barOnly = เป้าน้อยกว่าหรือเท่าน้ำหนักบาร์ -> ยกบาร์เปล่า (เดิมคืน leftover ติดลบซึ่งแสดงผลแล้วงง)
export function plateCalc(target: number, bar: number): { list: number[]; leftover: number; barOnly: boolean } {
  if (target <= bar) return { list: [], leftover: 0, barOnly: true };
  let perSide = (target - bar) / 2;
  const list: number[] = [];
  for (const p of [25, 20, 15, 10, 5, 2.5, 1.25]) {
    while (perSide >= p - 0.001) {
      list.push(p);
      perSide -= p;
    }
  }
  return { list, leftover: perSide, barOnly: false };
}

// น้ำหนักบาร์ที่ใช้กับท่านี้ — ตั้งรายท่าได้ ไม่ตั้งใช้ค่ากลาง
export const barKgFor = (data: Data, ex: Exercise): number => ex.barKg ?? data.settings.barWeight ?? 20;

// ท่านี้ต้องคิดเรื่องแผ่นน้ำหนักไหม — ท่าเครื่อง/เคเบิลใส่น้ำหนักรวม ไม่มีแผ่นให้ใส่
export function usesPlates(data: Data, ex: Exercise): boolean {
  if (ex.type !== "weight" || ex.machine) return false;
  const tpl = findTemplate(ex.name);
  if (!tpl) return true; // ท่าที่ผู้ใช้พิมพ์เอง — สมมติว่าใช้บาร์ (แสดงข้อมูลเพิ่มดีกว่าซ่อน)
  return tpl.equip.includes("barbell");
}

// ข้อความสั้นบอกว่าต้องใส่แผ่นอะไรข้างละกี่แผ่น เช่น "บาร์ 20 + (15+7.5)×2"
export function plateText(data: Data, ex: Exercise, target: number): string | null {
  if (!usesPlates(data, ex) || !target) return null;
  const bar = barKgFor(data, ex);
  const { list, leftover, barOnly } = plateCalc(target, bar);
  if (barOnly) return `บาร์เปล่า (${bar} ${ex.unit || "kg"})`;
  if (!list.length) return null;
  const txt = `บาร์ ${bar} + (${list.join("+")})×2`;
  return leftover > 0.01 ? `${txt} · ขาดอีก ${(leftover * 2).toFixed(1)}` : txt;
}

// ══════════ ประเมินน้ำหนักเริ่มต้นจากท่าหลัก ══════════
//
// ปัญหา: สร้างโปรแกรมใหม่ 40 ท่า แล้วต้องเดาน้ำหนักเองทุกท่า เสียเวลาและเดาผิดบ่อย
// วิธี: กรอกท่าหลัก 4 ท่า -> ประเมิน 1RM -> เทียบสัดส่วนไปท่าอื่น
//
// **ค่าที่ได้เป็นค่าประมาณเท่านั้น** สัดส่วนพวกนี้เป็นค่าเฉลี่ยประชากร ของจริงต่างกันมาก
// ตามสัดส่วนร่างกาย ช่วงการเคลื่อนไหว และประสบการณ์ของแต่ละท่า
// สัปดาห์แรกต้องปรับตามจริง — UI ต้องบอกชัดว่าเป็นค่าประมาณ ห้ามทำเหมือนรู้แน่

export type LiftKey = "bench" | "squat" | "deadlift" | "ohp";

export const LIFT_TH: Record<LiftKey, string> = {
  bench: "เบนช์เพรส",
  squat: "สควอท",
  deadlift: "เดดลิฟต์",
  ohp: "ดันบ่าเหนือหัว",
};

// ชื่อท่าในคลังที่ตรงกับท่าหลักแต่ละตัว (ใช้ prefill ถ้ามีประวัติอยู่แล้ว)
export const LIFT_EXERCISE: Record<LiftKey, string> = {
  bench: "Barbell Bench Press",
  squat: "Barbell Squat",
  deadlift: "Deadlift",
  ohp: "Overhead Press",
};

// สูตร Epley — แม่นพอในช่วง 1-10 เรป เกินกว่านั้นเริ่มประเมินสูงเกินจริง
export const epley1RM = (weight: number, reps: number): number =>
  reps <= 1 ? weight : weight * (1 + reps / 30);

// น้ำหนักที่ควรใช้สำหรับเรปเป้าหมาย (ผกผันของ Epley)
export const weightForReps = (oneRM: number, reps: number): number =>
  reps <= 1 ? oneRM : oneRM / (1 + reps / 30);

// สัดส่วนของแต่ละท่าเทียบ 1RM ของท่าหลัก
// ที่มา: ค่าเฉลี่ยที่ใช้กันทั่วไปในวงการฝึกความแข็งแรง ไม่ใช่ค่าที่วัดจากผู้ใช้คนนี้
// ใส่เฉพาะท่าที่เทียบกันได้ตรงๆ — ท่าที่ไม่มีในตารางนี้จะไม่ประเมินให้ (ปล่อยให้ผู้ใช้กรอกเอง
// ดีกว่าเดามั่วแล้วเขาเชื่อ)
const LIFT_RATIO: { name: string; base: LiftKey; ratio: number }[] = [
  // ดัน — ฐานเบนช์
  { name: "Barbell Bench Press", base: "bench", ratio: 1.0 },
  { name: "Incline Barbell Press", base: "bench", ratio: 0.8 },
  { name: "Close Grip Bench Press", base: "bench", ratio: 0.85 },
  { name: "Dumbbell Bench Press", base: "bench", ratio: 0.4 }, // ต่อข้าง
  { name: "Incline DB Press", base: "bench", ratio: 0.35 }, // ต่อข้าง
  // ดันเหนือหัว — ฐาน OHP
  { name: "Overhead Press", base: "ohp", ratio: 1.0 },
  { name: "Overhead Press (DB)", base: "ohp", ratio: 0.4 }, // ต่อข้าง
  { name: "Push Press", base: "ohp", ratio: 1.2 },
  { name: "Arnold Press", base: "ohp", ratio: 0.35 },
  // สควอท
  { name: "Barbell Squat", base: "squat", ratio: 1.0 },
  { name: "Front Squat", base: "squat", ratio: 0.8 },
  { name: "Hack Squat", base: "squat", ratio: 0.9 },
  { name: "Leg Press", base: "squat", ratio: 1.8 },
  { name: "Bulgarian Split Squat", base: "squat", ratio: 0.25 }, // ต่อข้าง
  { name: "Goblet Squat", base: "squat", ratio: 0.35 },
  // บานพับสะโพก — ฐานเดดลิฟต์
  { name: "Deadlift", base: "deadlift", ratio: 1.0 },
  { name: "Romanian Deadlift", base: "deadlift", ratio: 0.75 },
  { name: "Stiff Leg Deadlift", base: "deadlift", ratio: 0.7 },
  { name: "Sumo Deadlift", base: "deadlift", ratio: 1.0 },
  { name: "Barbell Hip Thrust", base: "deadlift", ratio: 0.9 },
  // ดึง — ฐานเดดลิฟต์ (หลังแข็งแรงตามกัน)
  { name: "Barbell Row", base: "deadlift", ratio: 0.5 },
  { name: "Chest Supported Row", base: "deadlift", ratio: 0.4 },
  { name: "Lat Pulldown", base: "deadlift", ratio: 0.45 },
  { name: "Seated Cable Row", base: "deadlift", ratio: 0.5 },
  { name: "Dumbbell Row", base: "deadlift", ratio: 0.22 }, // ต่อข้าง
  // แขน — ฐาน OHP (ไตรเซป) / เบนช์ (ไบเซปเทียบหยาบๆ)
  { name: "Barbell Curl", base: "ohp", ratio: 0.55 },
  { name: "Dumbbell Curl", base: "ohp", ratio: 0.22 },
  { name: "Tricep Pushdown", base: "ohp", ratio: 0.6 },
];

export interface OneRMInput {
  weight: number;
  reps: number;
}

export type OneRMMap = Partial<Record<LiftKey, number>>; // 1RM ที่ประเมินได้

export function estimate1RMs(inputs: Partial<Record<LiftKey, OneRMInput>>): OneRMMap {
  const out: OneRMMap = {};
  for (const k of Object.keys(inputs) as LiftKey[]) {
    const v = inputs[k];
    if (!v || !(v.weight > 0) || !(v.reps > 0)) continue;
    out[k] = Math.round(epley1RM(v.weight, v.reps) * 10) / 10;
  }
  return out;
}

export interface SeedResult {
  exId: string;
  name: string;
  weight: number;
}

// ประเมินเป้าเริ่มต้นของทุกท่าในโปรแกรมที่เทียบสัดส่วนได้
// ข้ามท่าที่มีประวัติจริงแล้ว — ของจริงย่อมดีกว่าค่าประมาณเสมอ
export function seedTargets(data: Data, oneRM: OneRMMap): SeedResult[] {
  const out: SeedResult[] = [];
  for (const ex of data.exercises) {
    if (ex.type !== "weight") continue;
    if ((data.history[ex.id] ?? []).some((s) => s.sets.some(Boolean))) continue; // เคยเล่นจริงแล้ว
    const tpl = findTemplate(ex.name);
    const canon = tpl?.name ?? ex.name;
    const row = LIFT_RATIO.find((r) => r.name === canon);
    if (!row) continue;
    const base = oneRM[row.base];
    if (!base) continue;
    // เป้าคือน้ำหนักที่ทำได้ตามจำนวนเรปของท่านั้น ไม่ใช่ 1RM
    const reps = ex.amrap ? 10 : Math.round((ex.rmin + ex.rmax) / 2);
    const raw = weightForReps(base * row.ratio, Math.max(1, Math.min(15, reps)));
    const inc = ex.inc || 2.5;
    const weight = Math.max(inc, Math.round(raw / inc) * inc);
    out.push({ exId: ex.id, name: ex.name, weight });
  }
  return out;
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
