// วิเคราะห์สมดุลกล้ามเนื้อแบบ rule-based (ไม่ใช้ AI)
//
// อนุกรมวิธานกล้ามเนื้อ/แพทเทิร์น/อุปกรณ์ ย้ายไปอยู่ที่ muscles.ts แล้ว
// ไฟล์นี้ re-export ไว้เพื่อไม่ให้โค้ดเดิมที่ import จากที่นี่พัง

import type { Data, DayKey } from "./store";
import { DAYS, DAY_TH, archiveOne, exercisesForDay, normName, restoreHistory, uid } from "./store";
import type { MuscleKey } from "./muscles";
import { MAJOR_MUSCLES, MUSCLE_KEYS, MUSCLE_TH } from "./muscles";
import type { ExTemplate } from "./exerciseDB";
import { EXERCISE_DB, findTemplate, incFor, isMachineEx, musclesOf, unitFor } from "./exerciseDB";

export type { MuscleKey } from "./muscles";
export { MUSCLE_TH, MUSCLE_KEYS } from "./muscles";

export interface MuscleHit {
  m: MuscleKey;
  w: number;
}

// กล้ามเนื้อที่ท่านี้โดน — นับแบบ fractional (primary 1.0, secondary 0.5)
//
// ลำดับการตัดสิน:
//   1) ถ้าชื่อตรงกับคลังท่า ใช้ข้อมูลจากคลัง (แม่นสุด — คนจัดเองทีละท่า)
//   2) ถ้าไม่ตรง (ผู้ใช้พิมพ์ชื่อเอง) ค่อยเดาจากคำในชื่อ
// เดิมใช้วิธี (2) กับทุกท่ารวมท่าในคลังด้วย ซึ่งเดาพลาดได้ เช่นแยกไหล่ 3 มัดไม่ออก
export function muscleMap(name: string): MuscleHit[] {
  const tpl = findTemplate(name);
  if (tpl) return musclesOf(tpl);

  const t = name.toLowerCase();
  const hits: MuscleHit[] = [];
  const add = (m: MuscleKey, w: number) => {
    if (!hits.some((h) => h.m === m)) hits.push({ m, w });
  };

  // ── ดัน ──
  if (/bench|chest|fly|pec|dip|push.?up|ดันอก|วิดพื้น|เบนช์/.test(t)) {
    add("chest", 1);
    add("triceps", 0.5);
    add("front_delts", 0.5);
  }
  if (/overhead press|shoulder press|ohp|military|pike|arnold|ดันไหล่|ดันบ่า/.test(t)) {
    add("front_delts", 1);
    add("triceps", 0.5);
  }
  // ไหล่ข้างโดนเฉพาะท่ากางออกข้าง — แยกจากไหล่หน้าเพราะเป็นจุดที่มักขาดโดยไม่รู้ตัว
  if (/lateral raise|side raise|กางข้าง|ยกข้าง/.test(t)) add("side_delts", 1);
  if (/front raise|ยกหน้า/.test(t)) add("front_delts", 1);
  if (/upright row|อัพไรท์/.test(t)) {
    add("side_delts", 1);
    add("back", 0.5);
  }
  // ── ไหล่หลัง ──
  if (/face pull|rear delt|reverse fly|reverse pec|เฟซพูล|ไหล่หลัง|กางหลัง/.test(t)) {
    add("rear_delts", 1);
    add("back", 0.5);
  }
  // ── ดึง ──
  if (/pull.?up|chin.?up|pulldown|row|pullover|โรว์|ดึงข้อ|พูลดาวน์|ดึงหลัง/.test(t)) {
    add("back", 1);
    add("biceps", 0.5);
    if (/row|โรว์/.test(t)) add("rear_delts", 0.5);
    if (/towel|ผ้า/.test(t)) add("forearms", 1);
  }
  if (/shrug|ยักไหล่|ชรัก/.test(t)) add("back", 1);
  // ── แขน ──
  if (/curl/.test(t) && !/wrist|leg|pronation|ข้อมือ|งอขา/.test(t)) {
    add("biceps", 1);
    if (/hammer|reverse|แฮมเมอร์|คว่ำมือ/.test(t)) add("forearms", 0.5);
  }
  if (/tricep|pushdown|skull|kickback|diamond|ไตรเซป|กดสาย/.test(t) && !/leg|back/.test(t)) add("triceps", 1);
  if (/extension/.test(t) && /tricep|overhead|เหยียดไตรเซป/.test(t)) add("triceps", 1);
  // ── ขา ──
  if (/squat|leg press|hack|lunge|step.?up|สควอท|ย่อขา|ลันจ์|ดันขา/.test(t)) {
    add("quads", 1);
    add("glutes", 0.5);
  }
  if (/leg extension|เหยียดขา|sissy|wall sit/.test(t)) add("quads", 1);
  if (/rdl|romanian|stiff leg|good morning|leg curl|nordic|hamstring|หลังขา|งอขา|กู้ดมอร์นิ่ง/.test(t)) {
    add("hamstrings", 1);
    if (/rdl|romanian|good morning|อาร์ดีแอล/.test(t)) add("glutes", 0.5);
  }
  if (/hip thrust|glute|bridge|kickback|abduction|สะพานก้น|ดันสะโพก|เตะก้น|ก้น/.test(t)) add("glutes", 1);
  if (/deadlift|เดดลิฟต์|ดึงพื้น/.test(t)) {
    add("back", 1);
    add("glutes", 1);
    add("hamstrings", 1);
    add("forearms", 0.5);
  }
  if (/back extension|hyperextension|แบ็กเอ็กซ์เทน/.test(t)) {
    add("glutes", 1);
    add("hamstrings", 0.5);
  }
  if (/calf|น่อง|เขย่ง/.test(t)) add("calves", 1);
  // ── แกนกลาง / ปลายแขน ──
  if (/plank|crunch|sit.?up|knee raise|leg raise|hollow|l.?sit|ab |core|dead bug|russian|twist|แพลงก์|ครันช์|ยกเข่า|ยกขา|ท้อง/.test(t))
    add("core", 1);
  if (/wrist|pronation|farmer|grip|hang|ข้อมือ|ห้อยบาร์|หิ้ว/.test(t)) add("forearms", 1);

  return hits;
}

// ── คลังท่าที่ใช้เสนอเพิ่ม ──
// ดึงจาก EXERCISE_DB โดยตรง (เดิมมี SUGGESTION_BANK แยกอีกชุด ซึ่งไม่มีข้อมูลอุปกรณ์
// จึงกรองตามอุปกรณ์ที่ผู้ใช้มีในวันนั้นไม่ได้ — เป็นสาเหตุที่ระบบเสนอท่าที่ทำจริงไม่ได้)

export interface SuggestionTemplate {
  name: string;
  muscle: MuscleKey;
  type: ExTemplate["type"];
  sets: number;
  rmin: number;
  rmax: number;
  reason: string;
  // ท่าต้นฉบับจากคลัง — ให้ตัวกรองอ่านอุปกรณ์/pattern/ความล้าได้
  // ไม่มี = เป็นท่าที่ผู้ใช้มีในโปรแกรมอยู่แล้ว (เช่นเสนอให้ทำซ้ำอีกวัน)
  // กรณีนี้ไม่ต้องตรวจอุปกรณ์ เพราะเขาทำท่านี้อยู่แล้วจึงมีของแน่นอน
  tpl?: ExTemplate;
}

// ท่าจากคลังที่โดนกล้ามเนื้อมัดนั้นเป็นหลัก เรียงท่าที่โดนกล้ามน้อยมัดก่อน
// (โดนน้อยมัด = เจาะจงกว่า = เติมช่องว่างได้ตรงจุดโดยไม่ไปเพิ่มภาระมัดอื่น)
export function candidatesFor(muscle: MuscleKey): SuggestionTemplate[] {
  return EXERCISE_DB.filter((t) => t.pri.includes(muscle))
    .sort((a, b) => a.pri.length + (a.sec?.length ?? 0) - (b.pri.length + (b.sec?.length ?? 0)))
    .map((t) => ({
      name: t.name,
      muscle,
      type: t.type,
      sets: t.sets,
      rmin: t.rmin,
      rmax: t.rmax,
      reason: t.tip,
      tpl: t,
    }));
}

// สร้าง Exercise จริงจากท่าในคลัง — ใช้ค่าที่เหมาะกับอุปกรณ์นั้นให้เลย
export function exerciseFromTemplate(t: ExTemplate, day: DayKey, order: number, id: string) {
  return {
    id,
    name: t.name,
    day,
    type: t.type,
    sets: t.sets,
    rmin: t.rmin,
    rmax: t.rmax,
    inc: incFor(t),
    unit: unitFor(t),
    amrap: t.amrap ?? false,
    machine: isMachineEx(t) || undefined,
    order,
  };
}

const MAJOR = MAJOR_MUSCLES;


export type MuscleStatus = "missing" | "low" | "good" | "high";

export interface MuscleStat {
  muscle: MuscleKey;
  sets: number;
  days: number;
  status: MuscleStatus;
}

// ภาระของแต่ละวันฝึก — ยัดเซตเยอะเกินในวันเดียวคุณภาพตก (เซตท้ายๆ แรงหมด กระตุ้นได้น้อย)
export interface DayLoad {
  day: DayKey;
  sets: number;
  exercises: number;
  overloaded: boolean;
}

// กล้ามเนื้อที่โดนซ้ำในวันติดกัน — กล้ามเนื้อต้องการ ~48 ชม. ซ่อมตัว
export interface RecoveryConflict {
  muscle: MuscleKey;
  a: DayKey;
  b: DayKey;
}

export interface Analysis {
  stats: MuscleStat[];
  score: number;
  headline: string;
  issues: string[];
  consecutive: number; // จำนวนวันฝึกติดต่อกันมากสุด (วนสัปดาห์)
  dayLoads: DayLoad[]; // ภาระรายวัน (เฉพาะวันที่มีท่า)
  recovery: RecoveryConflict[]; // จุดที่ฟื้นตัวไม่ทัน
}

// เซตรวมต่อวันที่ยังคุมคุณภาพได้ — เกินกว่านี้เซตท้ายๆ แทบไม่ได้ผล ควรแยกไปอีกวันแทน
export const MAX_SETS_PER_DAY = 22;
// เซตต่อกล้ามเนื้อเดียวในวันเดียว — เกิน 10 ผลตอบแทนต่อเซตลดชัด
const MAX_SETS_PER_MUSCLE_PER_DAY = 10;
// ถือว่า "โดนจริงจัง" เมื่อได้ตั้งแต่เท่านี้ขึ้นไป (กันการเตือนจากท่า compound ที่โดนกล้ามรองนิดเดียว)
const MEANINGFUL_SETS = 4;

export function trainingDays(data: Data): DayKey[] {
  return DAYS.filter((d) => exercisesForDay(data, d).length > 0);
}

// จำนวนวันฝึกติดต่อกันมากสุด นับแบบวนสัปดาห์ (อาทิตย์ต่อจันทร์)
export function maxConsecutiveDays(train: Set<DayKey>): number {
  const arr = DAYS.map((d) => train.has(d));
  if (arr.every(Boolean)) return 7;
  if (!arr.some(Boolean)) return 0;
  let max = 0;
  let cur = 0;
  for (const t of [...arr, ...arr]) {
    if (t) {
      cur++;
      if (cur > max) max = cur;
    } else cur = 0;
  }
  return Math.min(7, max);
}

export function analyzeProgram(data: Data): Analysis {
  const vol: Record<MuscleKey, number> = Object.fromEntries(MUSCLE_KEYS.map((m) => [m, 0])) as Record<
    MuscleKey,
    number
  >;
  const daySets: Record<MuscleKey, Set<DayKey>> = Object.fromEntries(
    MUSCLE_KEYS.map((m) => [m, new Set<DayKey>()]),
  ) as Record<MuscleKey, Set<DayKey>>;
  // เซตของกล้ามเนื้อแต่ละมัด แยกรายวัน — ใช้ตรวจภาระต่อวันและการฟื้นตัว
  const volByDay: Record<DayKey, Record<MuscleKey, number>> = Object.fromEntries(
    DAYS.map((d) => [d, Object.fromEntries(MUSCLE_KEYS.map((m) => [m, 0]))]),
  ) as Record<DayKey, Record<MuscleKey, number>>;

  for (const day of DAYS)
    for (const ex of exercisesForDay(data, day))
      for (const { m, w } of muscleMap(ex.name)) {
        vol[m] += ex.sets * w;
        daySets[m].add(day);
        volByDay[day][m] += ex.sets * w;
      }

  const stats: MuscleStat[] = MUSCLE_KEYS.map((m) => {
    const sets = Math.round(10 * vol[m]) / 10;
    return {
      muscle: m,
      sets,
      days: daySets[m].size,
      // 8-26 เซต/สัปดาห์ = โซนที่งานวิจัยรองรับกว้างๆ (เกิน 26 ผลตอบแทนเริ่มลด แต่ไม่ใช่ผิด)
      status: sets === 0 ? "missing" : sets < 8 ? "low" : sets <= 26 ? "good" : "high",
    };
  });

  let score = 100;
  const issues: string[] = [];
  for (const s of stats) {
    const major = MAJOR.includes(s.muscle);
    if (s.status === "missing") {
      score -= major ? 14 : 6;
      issues.push(`ไม่มีท่าโดน${MUSCLE_TH[s.muscle]}เลย`);
    } else if (s.status === "low") {
      score -= major ? 7 : 3;
      issues.push(`${MUSCLE_TH[s.muscle]}ยังน้อย (${s.sets} เซต/สัปดาห์)`);
    } else if (s.status === "high") {
      score -= 3;
      issues.push(`${MUSCLE_TH[s.muscle]} ${s.sets} เซต/สัปดาห์ — เกินโซนคุ้มค่า ผลตอบแทนเริ่มลด (ถ้าฟื้นตัวไหวก็ทำได้)`);
    }
    if (major && s.days === 1 && s.status !== "missing") {
      score -= 3;
      issues.push(`${MUSCLE_TH[s.muscle]}โดนแค่ 1 วัน/สัปดาห์ — 2 วันดีกว่า`);
    }
  }

  // ฝึกติดต่อกันเกิน 3 วันไม่พัก — ฟื้นตัวไม่ทัน
  const consecutive = maxConsecutiveDays(new Set(trainingDays(data)));
  if (consecutive > 3) {
    score -= (consecutive - 3) * 5;
    issues.push(`ฝึกติดต่อกัน ${consecutive} วันไม่พัก — ควรแทรกวันพัก`);
  }

  // ── ภาระต่อวัน: ยัดเซตเยอะเกินในวันเดียว เซตท้ายๆ แรงหมดแล้ว กระตุ้นกล้ามได้น้อยลง ──
  const dayLoads: DayLoad[] = trainingDays(data).map((day) => {
    const exs = exercisesForDay(data, day);
    const sets = exs.reduce((a, e) => a + e.sets, 0);
    return { day, sets, exercises: exs.length, overloaded: sets > MAX_SETS_PER_DAY };
  });

  for (const dl of dayLoads.filter((d) => d.overloaded)) {
    score -= 5;
    issues.push(
      `${DAY_TH[dl.day]}อัดไป ${dl.sets} เซตในวันเดียว (เกิน ${MAX_SETS_PER_DAY}) — แยกบางท่าไปวันอื่นหรือเพิ่มวันฝึก`,
    );
  }

  // กล้ามเนื้อเดียวโดนหนักเกินในวันเดียว — เพิ่มเซตต่อไปได้ผลน้อยกว่าไปเพิ่มอีกวัน
  for (const day of trainingDays(data))
    for (const m of MUSCLE_KEYS) {
      const s = Math.round(volByDay[day][m]);
      if (s > MAX_SETS_PER_MUSCLE_PER_DAY) {
        score -= 3;
        issues.push(
          `${MUSCLE_TH[m]}โดน ${s} เซตรวดใน${DAY_TH[day]} — เกิน ${MAX_SETS_PER_MUSCLE_PER_DAY} เซตต่อวันผลตอบแทนลด กระจายไปอีกวันดีกว่า`,
        );
      }
    }

  // ── ฟื้นตัว: กล้ามเนื้อมัดเดิมโดนหนักในวันติดกัน (ต้องการ ~48 ชม.ซ่อมตัว) ──
  const recovery: RecoveryConflict[] = [];
  for (let i = 0; i < 7; i++) {
    const a = DAYS[i];
    const b = DAYS[(i + 1) % 7]; // วนสัปดาห์: อาทิตย์ต่อจันทร์
    for (const m of MUSCLE_KEYS)
      if (volByDay[a][m] >= MEANINGFUL_SETS && volByDay[b][m] >= MEANINGFUL_SETS) recovery.push({ muscle: m, a, b });
  }

  for (const r of recovery) {
    score -= 4;
    issues.push(
      `${MUSCLE_TH[r.muscle]}โดนหนักทั้ง${DAY_TH[r.a]}และ${DAY_TH[r.b]}ติดกัน — กล้ามเนื้อต้องการ ~48 ชม. ซ่อมตัว ควรเว้นวัน`,
    );
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const headline =
    score >= 100
      ? "โปรแกรมสมดุลเต็ม 100 🎉"
      : score >= 85
        ? "โปรแกรมสมดุลดีมาก"
        : score >= 70
          ? "โดยรวมดี มีจุดเสริมได้"
          : score >= 50
            ? "ใช้ได้ แต่มีช่องโหว่ควรอุด"
            : "ควรปรับหลายจุด";

  return { stats, score, headline, issues, consecutive, dayLoads, recovery };
}

// เลือกวันที่เหมาะกับกล้ามเนื้อนั้นที่สุด: มีท่ากลุ่มเดียวกันอยู่แล้ว และวันยังไม่แน่น
function bestDayFor(data: Data, muscle: MuscleKey): DayKey {
  const activeDays = DAYS.filter((d) => exercisesForDay(data, d).length > 0);
  if (!activeDays.length) return "mon";
  let best: DayKey = activeDays[0];
  let bestScore = -1;
  for (const d of activeDays) {
    const exs = exercisesForDay(data, d);
    let same = 0;
    for (const ex of exs) if (muscleMap(ex.name).some((h) => h.m === muscle)) same++;
    const s = 100 * same - exs.reduce((a, e) => a + e.sets, 0);
    if (s > bestScore) {
      bestScore = s;
      best = d;
    }
  }
  return best;
}

// เลือกวันฝึกอื่น (ไม่ใช่วันที่กล้ามนั้นโดนอยู่) เพื่อกระจายเป็น 2 วัน
function pickOtherDay(data: Data, exclude?: DayKey): DayKey {
  const active = trainingDays(data).filter((d) => d !== exclude);
  if (active.length) return active.sort((a, b) => exercisesForDay(data, a).length - exercisesForDay(data, b).length)[0];
  return DAYS.find((d) => d !== exclude && exercisesForDay(data, d).length === 0) || "wed";
}

// หา move ย้ายท่าทั้งวันจากวันฝึก → วันพัก ที่ลดจำนวนวันติดต่อกันได้มากสุด
function findRestDayMove(data: Data): { from: DayKey; to: DayKey } | null {
  const train = new Set(trainingDays(data));
  const base = maxConsecutiveDays(train);
  let best: { from: DayKey; to: DayKey; result: number } | null = null;
  for (const from of DAYS) {
    if (!train.has(from)) continue;
    for (const to of DAYS) {
      if (train.has(to) || to === from) continue;
      const next = new Set(train);
      next.delete(from);
      next.add(to);
      const r = maxConsecutiveDays(next);
      if (r < base && (!best || r < best.result)) best = { from, to, result: r };
    }
  }
  return best ? { from: best.from, to: best.to } : null;
}

export type RecKind =
  | "add"
  | "increaseSets"
  | "reduceSets"
  | "addDay"
  | "moveExercise"
  | "removeExercise"
  | "restDay"
  | "splitDay"; // วันที่อัดเกิน -> ย้ายท่าท้ายๆ ไปวันว่าง (เพิ่มวันฝึก)

// วันว่างที่เพิ่มเข้าไปแล้วทำให้ต้องฝึกติดกันน้อยที่สุด
function bestEmptyDay(data: Data): DayKey | null {
  const train = new Set(trainingDays(data));
  const empty = DAYS.filter((d) => !train.has(d));
  if (!empty.length) return null;
  let best = empty[0];
  let bestConsecutive = 99;
  for (const d of empty) {
    const next = new Set(train);
    next.add(d);
    const c = maxConsecutiveDays(next);
    if (c < bestConsecutive) {
      bestConsecutive = c;
      best = d;
    }
  }
  return best;
}

// เซตต่อท่าที่สมเหตุสมผล — ท่าละ 3-5 เซต (เกินกว่านี้ควรเพิ่มท่าหรือแยกวันแทน)
export const MIN_SETS_PER_EX = 3;
export const MAX_SETS_PER_EX = 5;

// ท่าที่โดนกล้ามเป้าหมาย เรียง isolation ก่อน (โดนกล้ามน้อย = กระทบกล้ามอื่นน้อย)
function contributorsFor(data: Data, muscle: MuscleKey) {
  return data.exercises
    .filter((ex) => muscleMap(ex.name).some((h) => h.m === muscle))
    .sort((a, b) => {
      const iso = muscleMap(a.name).length - muscleMap(b.name).length;
      if (iso) return iso;
      const wa = muscleMap(a.name).find((h) => h.m === muscle)?.w ?? 0;
      const wb = muscleMap(b.name).find((h) => h.m === muscle)?.w ?? 0;
      return wb - wa;
    });
}

export interface Recommendation {
  id: string;
  kind: RecKind;
  title: string;
  detail: string;
  gain: number; // คะแนนที่คาดว่าจะได้เพิ่ม (เรียงมากไปน้อย)
  template?: SuggestionTemplate; // add / addDay
  day?: DayKey; // วันปลายทางของ add / addDay
  exerciseId?: string; // reduceSets
  fromDay?: DayKey; // restDay
  toDay?: DayKey; // restDay
}

// สร้างคำแนะนำครบทุกมิติ — ทำตามจนหมดแล้วคะแนนจะเต็ม 100
export function buildRecommendations(data: Data, analysis: Analysis): Recommendation[] {
  const recs: Recommendation[] = [];
  const existing = new Set(data.exercises.map((e) => normName(e.name)));
  let n = 0;
  const mkId = () => "rec" + n++;

  // 0) วันที่อัดเซตเกิน — แยกไปอีกวันดีกว่ายัดวันเดียว (เซตท้ายๆ แรงหมด กระตุ้นได้น้อย)
  //    ให้ลำดับสูงเพราะกระทบคุณภาพทุกเซตในวันนั้น ไม่ใช่แค่กล้ามมัดเดียว
  for (const dl of analysis.dayLoads.filter((d) => d.overloaded)) {
    const to = bestEmptyDay(data);
    if (!to) continue;
    recs.push({
      id: mkId(),
      kind: "splitDay",
      fromDay: dl.day,
      toDay: to,
      title: `แยก${DAY_TH[dl.day]}ไปเพิ่มวันฝึก${DAY_TH[to]}`,
      detail: `${DAY_TH[dl.day]}อัด ${dl.sets} เซตในวันเดียว (เกิน ${MAX_SETS_PER_DAY}) — ย้ายท่าท้ายๆ ไป${DAY_TH[to]} แต่ละเซตจะได้แรงเต็มกว่า`,
      gain: 8,
    });
  }

  // 1) กล้ามที่ไม่มี — เพิ่มท่าใหม่จากคลัง
  for (const s of analysis.stats.filter((s) => s.status === "missing")) {
    const cand = candidatesFor(s.muscle).filter((c) => !existing.has(normName(c.name)));
    if (!cand.length) continue;
    const day = bestDayFor(data, s.muscle);
    recs.push({
      id: mkId(),
      kind: "add",
      template: cand[0],
      day,
      title: `เพิ่ม ${cand[0].name}`,
      detail: `${MUSCLE_TH[s.muscle]}ยังไม่มีท่าเลย — เพิ่มเข้า${DAY_TH[day]}`,
      gain: MAJOR.includes(s.muscle) ? 14 : 6,
    });
  }

  // 2) กล้ามที่ยังน้อย — เพิ่มท่าใหม่ก่อน (กระจายภาระ), เพิ่มเซตได้ถึงท่าละ 5 เซตเท่านั้น
  for (const s of analysis.stats.filter((s) => s.status === "low")) {
    const major = MAJOR.includes(s.muscle);
    const gain = major ? 7 : 3;
    const isoRoom = contributorsFor(data, s.muscle).find(
      (ex) => muscleMap(ex.name).length === 1 && ex.sets < MAX_SETS_PER_EX,
    );
    const cand = candidatesFor(s.muscle).filter((c) => !existing.has(normName(c.name)));
    if (isoRoom) {
      recs.push({
        id: mkId(),
        kind: "increaseSets",
        exerciseId: isoRoom.id,
        title: `เพิ่มเซต ${isoRoom.name}`,
        detail: `${MUSCLE_TH[s.muscle]}ยังน้อย (${s.sets} เซต) — เพิ่ม ${isoRoom.name} เป็น ${isoRoom.sets + 1} เซต`,
        gain,
      });
    } else if (cand.length) {
      const day = bestDayFor(data, s.muscle);
      recs.push({
        id: mkId(),
        kind: "add",
        template: cand[0],
        day,
        title: `เพิ่ม ${cand[0].name}`,
        detail: `${MUSCLE_TH[s.muscle]}ยังน้อย — เพิ่มท่าใหม่เข้า${DAY_TH[day]} (ดีกว่าอัดเซตท่าเดิม)`,
        gain,
      });
    } else {
      // คลังหมดแล้ว — เพิ่มเซตท่าที่ยังไม่ถึงเพดาน 5 เซต
      const room = contributorsFor(data, s.muscle).find((ex) => ex.sets < MAX_SETS_PER_EX);
      if (room) {
        recs.push({
          id: mkId(),
          kind: "increaseSets",
          exerciseId: room.id,
          title: `เพิ่มเซต ${room.name}`,
          detail: `${MUSCLE_TH[s.muscle]}ยังน้อย (${s.sets} เซต) — เพิ่ม ${room.name} เป็น ${room.sets + 1} เซต`,
          gain,
        });
      } else {
        // ทุกท่าเต็มเพดานแล้ว — กระจายไปทำอีกวันแทนการอัดเซตวันเดียว
        const capped = contributorsFor(data, s.muscle)[0];
        if (capped) {
          const otherDay = pickOtherDay(data, capped.day);
          recs.push({
            id: mkId(),
            kind: "add",
            template: {
              name: capped.name,
              muscle: s.muscle,
              type: capped.type,
              sets: MIN_SETS_PER_EX,
              rmin: capped.rmin,
              rmax: capped.rmax,
              reason: "",
            },
            day: otherDay,
            title: `ทำ ${capped.name} เพิ่มอีกวัน`,
            detail: `${MUSCLE_TH[s.muscle]}ยังน้อย และท่าเต็ม ${MAX_SETS_PER_EX} เซตแล้ว — แยกไปทำวัน${DAY_TH[otherDay]} อีก ${MIN_SETS_PER_EX} เซต`,
            gain,
          });
        }
      }
    }
  }

  // 3) กล้ามที่เยอะเกิน — ลดเซตได้ถึงท่าละ 3 เซต, ถ้าทุกท่าเหลือ 3 แล้วให้ลบท่าหรือย้ายไปวันอื่น
  for (const s of analysis.stats.filter((s) => s.status === "high")) {
    const safeToReduce = (ex: (typeof data.exercises)[number]) =>
      muscleMap(ex.name).every((h) => {
        if (h.m === s.muscle) return true;
        const st = analysis.stats.find((x) => x.muscle === h.m);
        if (!st) return true;
        return st.status === "high" || st.status === "missing" || st.sets - h.w >= 8;
      });
    const reducible = contributorsFor(data, s.muscle).filter((ex) => ex.sets > MIN_SETS_PER_EX);
    const contributor = reducible.find(safeToReduce) ?? reducible[0];
    if (contributor) {
      recs.push({
        id: mkId(),
        kind: "reduceSets",
        exerciseId: contributor.id,
        title: `ลดเซต ${contributor.name}`,
        detail: `${MUSCLE_TH[s.muscle]} ${s.sets} เซต/สัปดาห์ — ลด ${contributor.name} เหลือ ${contributor.sets - 1} เซต`,
        gain: 3,
      });
    } else {
      // ทุกท่าเหลือ 3 เซตแล้ว — ตัดท่าที่ซ้ำซ้อนออก 1 ท่า (เลือก isolation ที่โดนกล้ามนี้อย่างเดียว)
      const cands = contributorsFor(data, s.muscle);
      const target = cands.find((ex) => muscleMap(ex.name).length === 1) ?? cands[cands.length - 1];
      if (target && cands.length > 1) {
        recs.push({
          id: mkId(),
          kind: "removeExercise",
          exerciseId: target.id,
          title: `ตัด ${target.name} ออก`,
          detail: `${MUSCLE_TH[s.muscle]} ${s.sets} เซต/สัปดาห์ และทุกท่าเหลือ ${MIN_SETS_PER_EX} เซตแล้ว — ตัดท่าที่ซ้ำซ้อนออก 1 ท่า (ประวัติเก็บไว้)`,
          gain: 3,
        });
      }
    }
  }

  // 4) เพิ่มวัน — กล้ามหลักที่โดนแค่วันเดียว (เพิ่มท่าใหม่ในอีกวัน หรือย้ายท่าที่มีไปกระจาย)
  for (const s of analysis.stats.filter((s) => MAJOR.includes(s.muscle) && s.days === 1 && s.status !== "missing")) {
    const curDay = DAYS.find((d) => exercisesForDay(data, d).some((ex) => muscleMap(ex.name).some((h) => h.m === s.muscle)));
    const day = pickOtherDay(data, curDay);
    const cand = candidatesFor(s.muscle).filter((c) => !existing.has(normName(c.name)));
    if (cand.length) {
      recs.push({
        id: mkId(),
        kind: "addDay",
        template: cand[0],
        day,
        title: `กระจาย${MUSCLE_TH[s.muscle]}เป็น 2 วัน`,
        detail: `${MUSCLE_TH[s.muscle]}โดนแค่วันเดียว — เพิ่ม ${cand[0].name} วัน${DAY_TH[day]}`,
        gain: 3,
      });
    } else if (curDay) {
      // คลังท่าหมด — ย้ายท่าของกล้ามนี้ 1 ตัวไปอีกวัน (ต้องมี ≥2 ท่าในวันเดียว)
      const sameDay = exercisesForDay(data, curDay).filter((ex) => muscleMap(ex.name).some((h) => h.m === s.muscle));
      if (sameDay.length >= 2) {
        const target = sameDay[sameDay.length - 1];
        recs.push({
          id: mkId(),
          kind: "moveExercise",
          exerciseId: target.id,
          day,
          title: `ย้าย ${target.name} ไป${DAY_TH[day]}`,
          detail: `${MUSCLE_TH[s.muscle]}โดนแค่วันเดียว — ย้าย ${target.name} ไป${DAY_TH[day]} ให้กระจาย 2 วัน`,
          gain: 3,
        });
      }
    }
  }

  // 4) แทรกวันพัก — ฝึกติดต่อกันเกิน 3 วัน
  if (analysis.consecutive > 3) {
    const move = findRestDayMove(data);
    if (move) {
      recs.push({
        id: mkId(),
        kind: "restDay",
        fromDay: move.from,
        toDay: move.to,
        title: "แทรกวันพัก",
        detail: `ฝึกติดกัน ${analysis.consecutive} วัน — ย้ายท่าวัน${DAY_TH[move.from]}ไป${DAY_TH[move.to]} ให้มีวันพักคั่น`,
        gain: (analysis.consecutive - 3) * 5,
      });
    }
  }

  return recs.sort((a, b) => b.gain - a.gain);
}

// ทำตามคำแนะนำ 1 ข้อ (แก้ draft ตรงๆ — ใช้ทั้งใน UI และเทสต์)
export function applyRecommendation(d: Data, rec: Recommendation) {
  if ((rec.kind === "add" || rec.kind === "addDay") && rec.template && rec.day) {
    const t = rec.template;
    const newEx = {
      id: uid() + d.exercises.length,
      name: t.name,
      day: rec.day,
      type: t.type,
      sets: t.sets,
      rmin: t.rmin,
      rmax: t.rmax,
      inc: t.type === "weight" ? 2.5 : undefined,
      unit: t.type === "time" ? "วิ" : t.type === "weight" ? "kg" : undefined,
      amrap: false,
      machine: /machine|cable|pulldown|pec deck|leg press|leg extension|leg curl/i.test(t.name) || undefined,
      order: exercisesForDay(d, rec.day).length,
    };
    d.exercises.push(newEx);
    restoreHistory(d, newEx);
  } else if (rec.kind === "increaseSets" && rec.exerciseId) {
    const ex = d.exercises.find((e) => e.id === rec.exerciseId);
    if (ex && ex.sets < MAX_SETS_PER_EX) ex.sets += 1;
  } else if (rec.kind === "reduceSets" && rec.exerciseId) {
    const ex = d.exercises.find((e) => e.id === rec.exerciseId);
    if (ex && ex.sets > MIN_SETS_PER_EX) ex.sets -= 1;
  } else if (rec.kind === "removeExercise" && rec.exerciseId) {
    const ex = d.exercises.find((e) => e.id === rec.exerciseId);
    if (ex) {
      archiveOne(d, ex); // เก็บประวัติไว้ก่อนตัดออก
      d.exercises = d.exercises.filter((e) => e.id !== ex.id);
      delete d.history[ex.id];
    }
  } else if (rec.kind === "moveExercise" && rec.exerciseId && rec.day) {
    const ex = d.exercises.find((e) => e.id === rec.exerciseId);
    if (ex) {
      ex.day = rec.day;
      ex.order = exercisesForDay(d, rec.day).length;
    }
  } else if (rec.kind === "splitDay" && rec.fromDay && rec.toDay) {
    // ย้ายจากท่าท้ายวัน (มักเป็นท่าเสริม) ไปก่อน จนวันเดิมไม่เกินลิมิต — เหลือไว้อย่างน้อย 1 ท่า
    const exs = exercisesForDay(d, rec.fromDay);
    let sets = exs.reduce((a, e) => a + e.sets, 0);
    for (let i = exs.length - 1; i >= 1 && sets > MAX_SETS_PER_DAY; i--) {
      const ex = d.exercises.find((e) => e.id === exs[i].id);
      if (!ex) continue;
      ex.day = rec.toDay;
      ex.order = exercisesForDay(d, rec.toDay).length;
      sets -= ex.sets;
    }
  } else if (rec.kind === "restDay" && rec.fromDay && rec.toDay) {
    for (const ex of d.exercises) if (ex.day === rec.fromDay) ex.day = rec.toDay;
    if (d.dayLabels[rec.fromDay] && !d.dayLabels[rec.toDay]) {
      d.dayLabels[rec.toDay] = d.dayLabels[rec.fromDay];
      d.dayLabels[rec.fromDay] = "";
    }
  }
}
