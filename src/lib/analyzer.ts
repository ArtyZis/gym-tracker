// Engine วิเคราะห์ตารางฝึก — rule-based ล้วน ไม่ใช้ AI
//
// หลักการหลัก: **ตรวจข้อจำกัดก่อน แล้วค่อยหาช่องว่าง ไม่ใช่ทางกลับกัน**
// คำแนะนำทุกข้อต้องผ่านตัวกรอง 4 ด่าน (อุปกรณ์ · เพดานเซสชัน · เพดานกล้ามเนื้อ · ระยะห่างฟื้นตัว)
// ไม่ผ่านด่านใด = ตัดทิ้ง ไม่แสดง แล้วไปบอกใน blockedInsights แทนว่าทำไมทำไม่ได้และแก้ที่ต้นเหตุยังไง
//
// เหตุผล: ระบบที่เสนอ "เพิ่ม Barbell Hip Thrust วันศุกร์" ให้คนที่วันศุกร์เล่นอยู่บ้าน
// ไม่มีบาร์เบล = คำแนะนำที่ใช้ไม่ได้ และทำให้ผู้ใช้เลิกเชื่อระบบทั้งหมด

import type { Data, DayKey, Exercise } from "./store";
import { DAYS, archiveOne, exercisesForDay, normName, restoreHistory, uid } from "./store";
import type { EquipTag, FatigueCost, MuscleKey, Pattern } from "./muscles";
import { HEAVY_HIT_SETS, INDIRECT_MUSCLES, MAJOR_MUSCLES, MAX_SETS_PER_MUSCLE_PER_SESSION, MINUTES_PER_SET, MIN_RECOVERY_HOURS, MUSCLE_KEYS, MUSCLE_TH, PATTERN_TH, SMALL_MUSCLES, VOLUME_CEILING_MUL, muscleName } from "./muscles";
import type { ExTemplate } from "./exerciseDB";
import { EXERCISE_DB, TIER_RANK, findTemplate, incFor, isMachineEx, musclesOf, tierOf, tipOf, unitFor } from "./exerciseDB";
import { t } from "./i18n";
import type { DayType } from "./blueprint";
import {
  DAY_TYPE_SHORT,
  OFFERED_SPLITS,
  buildDayExercises,
  buildFullProgram,
  splitDays,
  splitSummary,
} from "./blueprint";
import { canDoWithEquip, getDayEquip, getDayTimeCap, getInjuries, getMaxSetsPerSession, getTimeCap, getVolumeTarget } from "./profile";
import { activeDays, cycleLen, slotName } from "./loop";
import { sleepSummary } from "./recovery";

export type { MuscleKey } from "./muscles";
export { MUSCLE_TH, MUSCLE_KEYS } from "./muscles";

export interface MuscleHit {
  m: MuscleKey;
  w: number;
}

// ── กล้ามเนื้อที่ท่าโดน (fractional: primary 1.0, secondary 0.5) ──
// ชื่อตรงกับคลัง = ใช้ข้อมูลคลัง (แม่นสุด) · ไม่ตรง = เดาจากคำในชื่อ (ท่าที่ผู้ใช้พิมพ์เอง)
export function muscleMap(name: string): MuscleHit[] {
  const tpl = findTemplate(name);
  if (tpl) return musclesOf(tpl);

  const t = name.toLowerCase();
  const hits: MuscleHit[] = [];
  const add = (m: MuscleKey, w: number) => {
    if (!hits.some((h) => h.m === m)) hits.push({ m, w });
  };

  if (/bench|chest|fly|pec|dip|push.?up|ดันอก|วิดพื้น|เบนช์/.test(t)) {
    add("chest", 1);
    add("triceps", 0.5);
    add("front_delts", 0.5);
  }
  if (/overhead press|shoulder press|ohp|military|pike|arnold|ดันไหล่|ดันบ่า/.test(t)) {
    add("front_delts", 1);
    add("triceps", 0.5);
  }
  if (/lateral raise|side raise|กางข้าง|ยกข้าง/.test(t)) add("side_delts", 1);
  if (/front raise|ยกหน้า/.test(t)) add("front_delts", 1);
  if (/upright row|อัพไรท์/.test(t)) {
    add("side_delts", 1);
    add("back", 0.5);
  }
  if (/face pull|rear delt|reverse fly|reverse pec|เฟซพูล|ไหล่หลัง|กางหลัง/.test(t)) {
    add("rear_delts", 1);
    add("back", 0.5);
  }
  if (/pull.?up|chin.?up|pulldown|row|pullover|โรว์|ดึงข้อ|พูลดาวน์|ดึงหลัง/.test(t)) {
    add("back", 1);
    add("biceps", 0.5);
    if (/row|โรว์/.test(t)) add("rear_delts", 0.5);
    if (/towel|ผ้า/.test(t)) add("forearms", 1);
  }
  if (/shrug|ยักไหล่|ชรัก/.test(t)) add("back", 1);
  if (/curl/.test(t) && !/wrist|leg|pronation|ข้อมือ|งอขา/.test(t)) {
    add("biceps", 1);
    if (/hammer|reverse|แฮมเมอร์|คว่ำมือ/.test(t)) add("forearms", 0.5);
  }
  if (/tricep|pushdown|skull|kickback|diamond|ไตรเซป|กดสาย/.test(t) && !/leg|back/.test(t)) add("triceps", 1);
  if (/extension/.test(t) && /tricep|overhead|เหยียดไตรเซป/.test(t)) add("triceps", 1);
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
  if (/plank|crunch|sit.?up|knee raise|leg raise|hollow|l.?sit|ab |core|dead bug|russian|twist|แพลงก์|ครันช์|ยกเข่า|ยกขา|ท้อง/.test(t))
    add("core", 1);
  if (/wrist|pronation|farmer|grip|hang|ข้อมือ|ห้อยบาร์|หิ้ว/.test(t)) add("forearms", 1);

  return hits;
}

// ── ข้อมูลของท่าที่ผู้ใช้มี (ดึงจากคลังถ้ามี ไม่มีก็เดา) ──
export function fatigueOf(ex: Exercise): FatigueCost {
  const tpl = findTemplate(ex.name);
  if (tpl) return tpl.fatigue;
  // เดาจากช่วงเรป: เรปต่ำ = ยกหนัก = ล้าเยอะ = ต้องพักนาน
  if (ex.type !== "weight") return "low";
  return ex.rmax <= 8 ? "high" : ex.rmax <= 12 ? "moderate" : "low";
}

export const patternOf = (ex: Exercise): Pattern | null => findTemplate(ex.name)?.pattern ?? null;

// นาทีโดยประมาณของทั้งวัน (รวมเวลาพัก) — ตามสเปค 4.2
export function estimateMinutes(exs: Exercise[]): number {
  return Math.round(exs.reduce((a, ex) => a + ex.sets * MINUTES_PER_SET[fatigueOf(ex)], 0));
}

// ── ระยะห่างระหว่างวันแบบวงกลม (สเปค 4.3) ──
// สัปดาห์วนกลับมา ไม่ใช่เส้นตรง: เสาร์ -> จันทร์ = 48 ชม. ไม่ใช่ 5 วัน
const DAY_IDX: Record<DayKey, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

// len = ความยาวรอบ: สัปดาห์ปกติ = 7 · ตารางแบบรอบ = ความยาวรอบนั้น
// สำคัญกับตารางแบบรอบมาก: รอบ 3 วัน (ดัน-ดึง-ขา) วันดันเวียนกลับมาทุก 72 ชม.
// ถ้ายังหารด้วย 7 จะคิดผิดเป็น 144 ชม. แล้วบอกว่าฟื้นตัวทันทั้งที่จริงอาจไม่ทัน
export function hoursBetween(a: DayKey, b: DayKey, len = 7): number {
  return ((((DAY_IDX[b] - DAY_IDX[a]) % len) + len) % len) * 24;
}

// ต้องดูทั้งสองทิศแล้วใช้ค่าน้อยกว่า — ระยะพักจริงคือช่องว่างที่สั้นที่สุด
export function minGapHours(a: DayKey, b: DayKey, len = 7): number {
  if (a === b) return 0;
  return Math.min(hoursBetween(a, b, len), hoursBetween(b, a, len));
}

export function trainingDays(data: Data): DayKey[] {
  return activeDays(data).filter((d) => exercisesForDay(data, d).length > 0);
}

export function maxConsecutiveDays(train: Set<DayKey>, len = 7): number {
  const arr = DAYS.slice(0, len).map((d) => train.has(d));
  if (arr.every(Boolean)) return len;
  if (!arr.some(Boolean)) return 0;
  let max = 0;
  let cur = 0;
  for (const t of [...arr, ...arr]) {
    if (t) {
      cur++;
      if (cur > max) max = cur;
    } else cur = 0;
  }
  return Math.min(len, max);
}

// ══════════ ผลวิเคราะห์ ══════════

export type MuscleStatus = "missing" | "low" | "good" | "high";

export interface MuscleStat {
  muscle: MuscleKey;
  sets: number;
  days: number; // ความถี่ต่อสัปดาห์
  target: [number, number];
  status: MuscleStatus;
  achievableDays: number; // ความถี่สูงสุดที่ตารางนี้อนุญาต
  blockedBy?: string; // ถ้าความถี่จริง < ที่ควรได้ เพราะอะไร
}

export interface DayLoad {
  day: DayKey;
  sets: number;
  exercises: number;
  minutes: number;
  overSets: boolean;
  overTime: boolean;
}

export interface RecoveryConflict {
  muscle: MuscleKey;
  a: DayKey;
  b: DayKey;
  gapHours: number;
}

export interface PatternStat {
  pattern: Pattern;
  sets: number;
}

// ปัญหาที่ระบบเห็นแต่แก้ด้วยตารางปัจจุบันไม่ได้ — แยกจากคำแนะนำที่ทำได้เลย
export interface BlockedInsight {
  issue: string;
  whyCannotFix: string;
  realSolution: string;
}

export interface ScoreBreakdown {
  volume: number; // 0-1
  patterns: number;
  recovery: number;
  sessionCap: number;
  order: number;
}

export interface Analysis {
  stats: MuscleStat[];
  score: number; // = execution (ชื่อเดิม ให้ UI เก่าใช้ได้)
  execution: number;
  ceiling: number; // เพดานสูงสุดที่ข้อจำกัดนี้อนุญาต
  headline: string;
  issues: string[];
  consecutive: number;
  dayLoads: DayLoad[];
  recovery: RecoveryConflict[];
  patterns: PatternStat[];
  blockedInsights: BlockedInsight[];
  breakdown: ScoreBreakdown;
}

// น้ำหนักคะแนนตามสเปค 6
const W = { volume: 0.4, patterns: 0.2, recovery: 0.2, sessionCap: 0.1, order: 0.1 };

export const MAX_SETS_PER_DAY = 22; // ใช้เป็นค่าอ้างอิงใน UI (ค่าจริงมาจาก constraints ของผู้ใช้)

export function analyzeProgram(data: Data): Analysis {
  const target = getVolumeTarget(data);
  const maxSets = getMaxSetsPerSession(data);
  const timeCap = getTimeCap(data);
  const train = trainingDays(data);
  const len = cycleLen(data);

  // ── ปริมาณต่อกล้ามเนื้อ (fractional) แยกรายวันด้วย ──
  const vol = Object.fromEntries(MUSCLE_KEYS.map((m) => [m, 0])) as Record<MuscleKey, number>;
  const volByDay = Object.fromEntries(
    DAYS.map((d) => [d, Object.fromEntries(MUSCLE_KEYS.map((m) => [m, 0]))]),
  ) as Record<DayKey, Record<MuscleKey, number>>;
  const daysHit = Object.fromEntries(MUSCLE_KEYS.map((m) => [m, new Set<DayKey>()])) as Record<MuscleKey, Set<DayKey>>;
  // เซตที่ "หนักจริง" ของมัดนั้นในวันนั้น — ใช้ตัดสินว่าฟื้นตัวชนกันไหม
  //
  // นับเฉพาะเซตที่เข้าเงื่อนไขทั้งสองข้อ:
  //   1. มัดนั้นเป็นกล้ามหลักของท่า — สควอท 5 เซตให้หลังขาเป็นกล้ามรอง (2.5 เซต)
  //      พอบวกเลกเคิร์ลกลายเป็น 5.5 ระบบก็ตีว่า "หลังขาโดนหนัก" ทั้งที่สควอท
  //      ไม่ได้ทำให้หลังขาล้าแบบ RDL หรือเลกเคิร์ล
  //   2. ท่านั้นล้าสูงจริง — ท่า 12-15 ครั้งสร้างความเสียหายกล้ามเนื้อและความล้าระบบประสาท
  //      น้อยกว่าท่า 5 ครั้งหนักอย่างมีนัยสำคัญ นับรวมกันแล้วบอกว่าหนักเท่ากันจึงไม่ตรงความจริง
  //
  // ผลคือตาราง PPL ปกติ (เดดลิฟต์วันดึง แล้ววันขามี RDL เบากว่า) ไม่ถูกแจ้งว่าชนกัน
  // แต่ตารางที่เอาท่าหนักมัดเดียวกันมาวางติดกันจริงๆ ยังถูกจับได้เหมือนเดิม
  const priByDay = Object.fromEntries(
    DAYS.map((d) => [d, Object.fromEntries(MUSCLE_KEYS.map((m) => [m, 0]))]),
  ) as Record<DayKey, Record<MuscleKey, number>>;
  const patternSets = new Map<Pattern, number>();

  for (const day of activeDays(data))
    for (const ex of exercisesForDay(data, day)) {
      const heavyLift = fatigueOf(ex) === "high";
      for (const { m, w } of muscleMap(ex.name)) {
        vol[m] += ex.sets * w;
        volByDay[day][m] += ex.sets * w;
        if (w >= 1 && heavyLift) priByDay[day][m] += ex.sets;
        daysHit[m].add(day);
      }
      const p = patternOf(ex);
      if (p) patternSets.set(p, (patternSets.get(p) ?? 0) + ex.sets);
    }

  // ── ความถี่สูงสุดที่ตารางนี้ทำได้ ──
  // ต้องเว้นอย่างน้อย 48 ชม. ระหว่างวันที่โดนกล้ามเดิมหนัก
  // เข้ายิม จ+ส (ห่าง 48/120) -> ใส่ได้ 2 วัน แต่ถ้า จ+อ (ห่าง 24) -> ได้แค่ 1
  const achievableFreq = maxIndependentDays(train, len);

  const issues: string[] = [];
  const blockedInsights: BlockedInsight[] = [];

  const stats: MuscleStat[] = MUSCLE_KEYS.map((m) => {
    const sets = Math.round(10 * vol[m]) / 10;
    const days = daysHit[m].size;
    const small = SMALL_MUSCLES.includes(m);
    // เพดานรายมัด — มัดใหญ่/กลุ่มหลายมัดรับปริมาณได้มากกว่า (ดู VOLUME_CEILING_MUL)
    const ceilHigh = target.warnHigh * (VOLUME_CEILING_MUL[m] ?? 1);
    // มัดที่ได้งานทางอ้อมพอแล้ว (ปลายแขน) ไม่เตือนว่าต่ำ — ขอแค่มีท่าที่ใช้มันอยู่บ้าง
    const indirect = INDIRECT_MUSCLES.includes(m);
    const status: MuscleStatus =
      sets === 0
        ? "missing"
        : !indirect && sets < target.warnLow
          ? "low"
          : !small && sets > ceilHigh
            ? "high"
            : "good";
    // ควรได้ 2 ครั้ง/สัปดาห์ แต่ตารางอาจไม่เอื้อ
    const wantDays = Math.min(2, achievableFreq);
    const blocked = status !== "missing" && days < wantDays && achievableFreq < 2;
    return {
      muscle: m,
      sets,
      days,
      target: [target.min, target.max] as [number, number],
      status,
      achievableDays: achievableFreq,
      blockedBy: blocked ? t("วันฝึกห่างกันไม่พอ", "training days are too close together") : undefined,
    };
  });

  // ── ภาระต่อวัน ──
  const dayLoads: DayLoad[] = train.map((day) => {
    const exs = exercisesForDay(data, day);
    const sets = exs.reduce((a, e) => a + e.sets, 0);
    const minutes = estimateMinutes(exs);
    // เทียบกับเวลาที่มีจริงของวันนั้น ไม่ใช่ค่ากลาง — วันที่ว่างแค่ 75 นาทีต้องรู้ว่าตัวเองเต็มแล้ว
    return { day, sets, exercises: exs.length, minutes, overSets: sets > maxSets, overTime: minutes > getDayTimeCap(data, day) };
  });

  // ── การฟื้นตัว: กล้ามเดิมโดนหนักในวันที่ห่างกัน < 48 ชม. ──
  const recovery: RecoveryConflict[] = [];
  for (let i = 0; i < train.length; i++)
    for (let j = i + 1; j < train.length; j++) {
      const a = train[i];
      const b = train[j];
      const gap = minGapHours(a, b, len);
      if (gap >= MIN_RECOVERY_HOURS) continue;
      for (const m of MUSCLE_KEYS)
        if (priByDay[a][m] >= HEAVY_HIT_SETS && priByDay[b][m] >= HEAVY_HIT_SETS)
          recovery.push({ muscle: m, a, b, gapHours: gap });
    }

  const patterns: PatternStat[] = [...patternSets.entries()].map(([pattern, sets]) => ({ pattern, sets }));
  const pat = (p: Pattern) => patternSets.get(p) ?? 0;

  // ══ คะแนน 5 หมวด — เก็บทั้ง "ทำได้จริง" และ "เพดานที่ข้อจำกัดอนุญาต" ══

  // 1) ปริมาณ (40%)
  let volHit = 0;
  let volCeil = 0;
  // มัดเล็กที่ "ไม่มีท่าเลย" ต้องถูกนับด้วย — เดิมกรองออกทั้งหมดถ้าได้ 0 เซต
  //
  // ผลของเดิมคือตารางที่ไม่มีท่าไหล่ข้างเลยสักท่ายังได้ 98 คะแนน เพราะมัดที่หายไป
  // ถูกลบออกจากตัวหารเสียเอง = ยิ่งขาดมาก ยิ่งไม่โดนหัก ซึ่งกลับหัวกลับหางกับความจริง
  // (ไหล่ข้างเป็นมัดที่คนเล่นเวทให้ความสำคัญสูงสุดมัดหนึ่ง ขาดแล้วไหล่ไม่กว้าง)
  //
  // ยกเว้นมัดที่ได้งานทางอ้อมพออยู่แล้ว (ปลายแขน) ซึ่งไม่ต้องมีท่าเจาะจงก็ได้
  const scored = stats.filter((s) => !INDIRECT_MUSCLES.includes(s.muscle));
  for (const s of scored) {
    // ต้องใช้เกณฑ์เดียวกับที่ตัดสิน status ไม่งั้นมัดที่ขึ้นว่า "good" ยังโดนหักคะแนนเงียบๆ
    // (เคสจริง: ทุกมัดขึ้น good หมดแต่หมวดปริมาณได้ 92% โดยไม่มีอะไรบอกว่าเพราะอะไร)
    const inRange = s.status === "good";
    volHit += inRange ? 1 : s.status === "missing" ? 0 : 0.5;
    volCeil += 1; // ปริมาณเพิ่มได้เสมอถ้ามีที่ว่างในตาราง
    if (s.status === "missing" && MAJOR_MUSCLES.includes(s.muscle))
      issues.push(t(`ไม่มีท่าโดน${muscleName(s.muscle)}เลย`, `Nothing hits ${muscleName(s.muscle).toLowerCase()} at all`));
    else if (s.status === "low")
      issues.push(
        t(`${muscleName(s.muscle)} ${s.sets} เซต/สัปดาห์ — ต่ำกว่าเป้า ${target.min}`, `${muscleName(s.muscle)} ${s.sets} sets/week — below the ${target.min} target`),
      );
    else if (s.status === "high")
      issues.push(t(`${muscleName(s.muscle)} ${s.sets} เซต/สัปดาห์ — เกินโซนคุ้มค่า`, `${muscleName(s.muscle)} ${s.sets} sets/week — past the useful zone`));
  }
  const volumeScore = scored.length ? volHit / scored.length : 1;

  // 2) สมดุลแพทเทิร์น (20%) — สเปค 4.4
  const hPush = pat("horizontal_push");
  const hPull = pat("horizontal_pull");
  // สมดุลดัน/ดึง — ผ่านได้ 2 ทาง เพราะไหล่ห่อมีตัวป้องกันมากกว่าแค่ท่าโรว์
  //
  // เดิมดูแค่ horizontal ล้วน ตาราง Pull ที่เน้นพูลอัพ/พูลดาวน์ (ซึ่งก็ดึงสะบักลงหลัง
  // และสร้างมวลหลังเหมือนกัน) จึงถูกตัดสินว่าไม่สมดุลทั้งที่ปริมาณดึงรวมมากกว่าดันด้วยซ้ำ
  // ทางที่สองจึงเทียบดึงรวมกับดันรวม โดยบังคับว่าต้องมีงานไหล่หลังจริงประกอบด้วย
  const allPull = hPull + pat("vertical_pull");
  const allPush = hPush + pat("vertical_push");
  const rearDeltSets = vol.rear_delts;
  const balanced = hPull >= hPush * 0.8 || (allPull >= allPush * 0.8 && rearDeltSets >= 8);
  const checks: { ok: boolean; msg: string }[] = [
    {
      ok: balanced,
      msg: t(
        `ท่าดึงเข้าหาตัว ${hPull} เซต น้อยกว่าท่าดันออกหน้า ${hPush} เซต — เสี่ยงไหล่ห่อ`,
        `Horizontal pulling (${hPull} sets) trails horizontal pushing (${hPush} sets) — rounded shoulders risk`,
      ),
    },
    { ok: pat("vertical_pull") >= 1, msg: t("ไม่มีท่าดึงลงล่างเลย (พูลอัพ/พูลดาวน์)", "No vertical pulling at all (pull-ups/pulldowns)") },
    { ok: hPull >= 1, msg: t("ไม่มีท่าดึงเข้าหาตัวเลย (โรว์)", "No horizontal pulling at all (rows)") },
    { ok: pat("hip_hinge") >= 3, msg: t("ท่าบานพับสะโพกน้อยเกิน (RDL/ฮิปทรัส) — หลังขาและก้นจะขาด", "Too little hip hinging (RDL/hip thrust) — hamstrings and glutes fall short") },
  ];
  for (const c of checks) if (!c.ok) issues.push(c.msg);
  const patternScore = checks.filter((c) => c.ok).length / checks.length;

  // 3) ความถี่/ฟื้นตัว (20%)
  const consecutive = maxConsecutiveDays(new Set(train), len);
  // หักคะแนนจาก "กล้ามเนื้อกลุ่มเดิมโดนหนักถี่เกินไป" เท่านั้น — ไม่หักจากจำนวนวันติดกันแบบเหมารวมอีกแล้ว
  //
  // เหตุผล: ตาราง PPL×2 ที่ฝึก 6 วันติดพัก 1 วัน เป็นตารางมาตรฐานที่คนใช้กันจริงและถูกหลัก
  // เพราะกล้ามเนื้อกลุ่มเดิมยังห่างกัน 48+ ชม. อยู่ กฎ "ติดกันเกิน 3 วัน = หัก" จึงหยาบเกินไป
  // และทำให้ตารางที่ดีอยู่แล้วได้คะแนนต่ำจนดูเหมือนตารางแย่ (เคสจริง: ฝึก 6 วันได้ 69 คะแนน)
  // ตัวที่จับปัญหาทางสรีรวิทยาจริงคือ recovery conflicts ด้านบนซึ่งตรวจแยกอยู่แล้ว
  // หักแบบอิ่มตัว ไม่ให้ conflict จำนวนมากลบคะแนนหมวดนี้เป็นศูนย์
  // ตารางที่ชนกันหลายจุด "แย่กว่า" ตารางที่ชนจุดเดียวก็จริง แต่ไม่ใช่ว่าไม่มีอะไรดีเลย
  // การให้ 0 ทำให้ผู้ใช้เห็นคะแนนต่ำผิดจริงจนคิดว่าตารางตัวเองใช้ไม่ได้
  let recPenalty = Math.min(0.75, recovery.length * 0.15);
  for (const r of recovery)
    issues.push(
      t(
        `${muscleName(r.muscle)}โดนหนักทั้ง${slotName(data, r.a)}และ${slotName(data, r.b)} ห่างแค่ ${r.gapHours} ชม. — ต้องการ ${MIN_RECOVERY_HOURS} ชม.`,
        `${muscleName(r.muscle)} gets hit hard on both ${slotName(data, r.a)} and ${slotName(data, r.b)}, only ${r.gapHours}h apart — needs ${MIN_RECOVERY_HOURS}h`,
      ),
    );
  if (consecutive > 3) issues.push(t(`ฝึกติดต่อกัน ${consecutive} วันไม่พัก`, `${consecutive} days in a row with no rest`));
  const recoveryScore = Math.max(0, 1 - recPenalty);
  // เพดาน: ถ้าตารางไม่เอื้อให้กระจาย 2 วัน ก็ไม่ควรหักคะแนนจนต่ำเกินจริง (สเปค 6)
  const recoveryCeil = 1;

  // 4) ไม่มีวันยาวเกินเพดาน (10%)
  const overDays = dayLoads.filter((d) => d.overSets || d.overTime);
  for (const d of overDays)
    issues.push(
      d.overTime
        ? t(
            `${slotName(data, d.day)}ใช้เวลาราว ${d.minutes} นาที เกินที่ตั้งไว้ ${timeCap} นาที`,
            `${slotName(data, d.day)} runs about ${d.minutes} min, over your ${timeCap} min limit`,
          )
        : t(`${slotName(data, d.day)}มี ${d.sets} เซต เกินเพดาน ${maxSets}`, `${slotName(data, d.day)} has ${d.sets} sets, over the ${maxSets} cap`),
    );
  const sessionScore = dayLoads.length ? 1 - overDays.length / dayLoads.length : 1;

  // 5) ลำดับท่า (10%) — ท่าล้าสูงควรมาก่อน, core/calves ปิดท้าย
  const orderScore = scoreOrder(data, train);
  if (orderScore < 1)
    issues.push(t("ลำดับท่าในบางวันยังไม่เหมาะ — ท่าหนักควรมาก่อนท่าเจาะจง", "Some days are ordered awkwardly — heavy lifts should come before isolation"));

  const breakdown: ScoreBreakdown = {
    volume: volumeScore,
    patterns: patternScore,
    recovery: recoveryScore,
    sessionCap: sessionScore,
    order: orderScore,
  };

  const execution = Math.round(
    100 *
      (W.volume * volumeScore +
        W.patterns * patternScore +
        W.recovery * recoveryScore +
        W.sessionCap * sessionScore +
        W.order * orderScore),
  );

  // เพดาน: หมวดที่ข้อจำกัดกดไว้จริงเท่านั้นที่ทำให้เพดานต่ำกว่า 100
  const volCeilScore = volCeil ? Math.min(1, capacityFor(data, train, maxSets, target.min, scored.length)) : 1;
  const ceiling = Math.round(
    100 * (W.volume * volCeilScore + W.patterns * 1 + W.recovery * recoveryCeil + W.sessionCap * 1 + W.order * 1),
  );

  // ── ปัญหาที่แก้ด้วยตารางนี้ไม่ได้ ──
  if (achievableFreq < 2 && train.length > 0) {
    const lowFreq = stats.filter((s) => s.status !== "missing" && s.days < 2 && MAJOR_MUSCLES.includes(s.muscle));
    if (lowFreq.length)
      blockedInsights.push({
        issue: t(
          `${lowFreq.map((s) => muscleName(s.muscle)).slice(0, 3).join(", ")}โดนแค่ 1 ครั้ง/สัปดาห์`,
          `${lowFreq.map((s) => muscleName(s.muscle)).slice(0, 3).join(", ")} only gets hit once a week`,
        ),
        whyCannotFix: t(
          `ฝึก ${train.map((d) => slotName(data, d)).join("+")} — วันที่มีห่างกันไม่ถึง ${MIN_RECOVERY_HOURS} ชม. จึงกระจายเป็น 2 วันไม่ได้`,
          `You train ${train.map((d) => slotName(data, d)).join("+")} — those days sit less than ${MIN_RECOVERY_HOURS}h apart, so it can't be split across two`,
        ),
        realSolution: t(
          "เพิ่มวันฝึกกลางสัปดาห์ หรือรับปริมาณรวมในวันเดียวไปก่อน (ยังได้ผลถ้าไม่เกินเพดานต่อวัน)",
          "Add a mid-week training day, or take the whole volume in one session for now (still works as long as you stay under the daily cap)",
        ),
      });
  }

  const headline =
    execution >= ceiling - 2
      ? ceiling >= 95
        ? t("ตารางสมดุลดีมาก", "Really well balanced")
        : t("ดีที่สุดเท่าที่ตารางนี้ทำได้แล้ว", "As good as this program can get")
      : execution >= 70
        ? t("โดยรวมดี มีจุดเสริมได้", "Solid overall, a few gaps to fill")
        : execution >= 50
          ? t("ใช้ได้ แต่มีช่องโหว่ควรอุด", "Workable, but there are holes worth closing")
          : t("ควรปรับหลายจุด", "Several things need fixing");

  return {
    stats,
    score: execution,
    execution,
    ceiling,
    headline,
    issues,
    consecutive,
    dayLoads,
    recovery,
    patterns,
    blockedInsights,
    breakdown,
  };
}

// จำนวนวันฝึกมากสุดที่เว้นห่างกันได้ >= 48 ชม. (= ความถี่สูงสุดต่อกล้ามเนื้อหนึ่งมัด)
function maxIndependentDays(train: DayKey[], len = 7): number {
  if (train.length <= 1) return train.length;
  let best = 1;
  // ลองทุกชุดย่อย (วันฝึกมีไม่เกิน 7 คำนวณตรงๆ ได้)
  const n = train.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const pick: DayKey[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) pick.push(train[i]);
    let ok = true;
    for (let i = 0; i < pick.length && ok; i++)
      for (let j = i + 1; j < pick.length; j++)
        if (minGapHours(pick[i], pick[j], len) < MIN_RECOVERY_HOURS) {
          ok = false;
          break;
        }
    if (ok && pick.length > best) best = pick.length;
  }
  return best;
}

// ตารางนี้มีที่ว่างพอให้ทุกกล้ามเนื้อถึงเป้าขั้นต่ำไหม (0-1)
function capacityFor(data: Data, train: DayKey[], maxSets: number, minTarget: number, muscleCount: number): number {
  if (!train.length) return 0;
  // ความจุจริงของแต่ละวัน = น้อยกว่าระหว่างเพดานเซตกับเวลาที่วันนั้นมีจริง
  // ใช้เวลารายวัน ไม่ใช่ค่ากลาง — คนที่ว่างวันละ 60 นาทีมีเพดานคะแนนต่ำกว่าคนที่ว่าง 120 นาทีจริงๆ
  const capacity = train.reduce((a, d) => {
    const byTime = Math.floor(getDayTimeCap(data, d) / MINUTES_PER_SET.moderate);
    return a + Math.min(maxSets, byTime);
  }, 0);
  const needed = minTarget * muscleCount * 0.6; // นับ fractional แล้วท่า compound ครอบหลายมัด
  return needed ? Math.min(1, capacity / needed) : 1;
}

// ให้คะแนนลำดับท่า — ท่าล้าสูงควรมาก่อน core/calves ปิดท้าย (สเปค 7)
function scoreOrder(data: Data, train: DayKey[]): number {
  const rank: Record<FatigueCost, number> = { high: 0, moderate: 1, low: 2 };
  // "ท่าปิดท้าย" ต้องดูกล้ามเนื้อ **หลัก** เท่านั้น
  // ถ้านับกล้ามรองด้วย Barbell Squat (มี core เป็นกล้ามรอง) จะถูกนับเป็นท่าปิดท้าย
  // แล้วโดนหักคะแนนทั้งที่วางไว้ต้นวันถูกต้องแล้ว
  const isFinisher = (ex: Exercise) => muscleMap(ex.name).some((h) => h.w >= 1 && (h.m === "core" || h.m === "calves"));
  let pairs = 0;
  let good = 0;
  for (const day of train) {
    const exs = exercisesForDay(data, day);
    // ยอมให้สลับได้ 1 คู่ต่อวันโดยไม่หัก
    //
    // การเอาท่าเดี่ยวแทรกก่อนท่ารวม (pre-exhaust) เช่น เคเบิลฟลายก่อนดิป เป็นเทคนิคที่ใช้จริง
    // ไม่ใช่ความผิดพลาด · เกณฑ์เดิมเทียบทุกคู่ติดกันแบบไม่มีข้อยกเว้น ตารางที่จัดมาดีแล้ว
    // จึงเสียคะแนนจากการสลับจุดเดียว ทั้งที่ท่าหนักสุดยังอยู่ต้นวันถูกต้อง
    // ส่วนตารางที่ลำดับมั่วจริง (ยกน่องก่อนสควอท) จะผิดหลายคู่ ยังถูกจับได้เหมือนเดิม
    let slack = 1;
    for (let i = 0; i + 1 < exs.length; i++) {
      pairs++;
      const a = exs[i];
      const b = exs[i + 1];
      // ท่าปิดท้ายต้องอยู่หลังท่าปกติ — ถ้าท่าแรกเป็นท่าปิดท้ายแต่ท่าหลังไม่ใช่ = ผิดลำดับ
      if (isFinisher(a) && !isFinisher(b)) continue;
      if (isFinisher(b) && !isFinisher(a)) {
        good++; // ท่าปกติแล้วตามด้วยท่าปิดท้าย = ถูกต้อง
        continue;
      }
      if (rank[fatigueOf(a)] <= rank[fatigueOf(b)]) good++;
      else if (slack > 0) {
        slack--;
        good++;
      }
    }
  }
  return pairs ? good / pairs : 1;
}

// ══════════ ตัวกรองบังคับ 4 ด่าน (สเปค 5) ══════════

export interface FilterVerdict {
  ok: boolean;
  reason?: string;
  fix?: string;
}

// ท่านี้เพิ่มเข้าวันนั้นได้จริงไหม — ไม่ผ่านด่านใดด่านหนึ่ง = ห้ามเสนอ
export function checkFilters(data: Data, tpl: ExTemplate | undefined, day: DayKey, addSets: number): FilterVerdict {
  const exs = exercisesForDay(data, day);

  // ด่าน 0: อาการบาดเจ็บ
  if (tpl?.avoid) {
    const hit = tpl.avoid.filter((a) => getInjuries(data).includes(a));
    if (hit.length)
      return {
        ok: false,
        reason: t("ท่านี้ไม่เหมาะกับอาการที่แจ้งไว้", "This lift isn't a good fit for the injuries you listed"),
        fix: t("ปรึกษาแพทย์/นักกายภาพก่อนกลับมาฝึกท่านี้", "Check with a doctor or physio before training this again"),
      };
  }

  // ด่าน 1: อุปกรณ์ — ต้องมีครบทุกชิ้นในวันนั้น
  if (tpl && !canDoWithEquip(tpl.equip, getDayEquip(data, day))) {
    return {
      ok: false,
      reason: t(`${slotName(data, day)}ไม่มีอุปกรณ์ที่ท่านี้ต้องใช้`, `${slotName(data, day)} doesn't have the equipment this needs`),
      fix: t(
        "เลือกท่าที่ใช้อุปกรณ์ที่มี หรือแก้อุปกรณ์ของวันนั้นในแท็บจัดการ",
        "Pick a lift that uses what you have, or update that day's equipment on the Manage tab",
      ),
    };
  }

  // ด่าน 2: เพดานเซสชัน (ทั้งจำนวนเซตและเวลา)
  const curSets = exs.reduce((a, e) => a + e.sets, 0);
  if (curSets + addSets > getMaxSetsPerSession(data))
    return {
      ok: false,
      reason: t(`${slotName(data, day)}จะเกินเพดาน ${getMaxSetsPerSession(data)} เซต`, `${slotName(data, day)} would pass the ${getMaxSetsPerSession(data)}-set cap`),
      fix: t("ย้ายบางท่าไปวันอื่นก่อน", "Move something to another day first"),
    };

  const addMin = tpl ? addSets * MINUTES_PER_SET[tpl.fatigue] : addSets * MINUTES_PER_SET.moderate;
  if (estimateMinutes(exs) + addMin > getDayTimeCap(data, day))
    return {
      ok: false,
      reason: t(`${slotName(data, day)}มีเวลาแค่ ${getDayTimeCap(data, day)} นาที เต็มแล้ว`, `${slotName(data, day)} only has ${getDayTimeCap(data, day)} min and it's full`),
      fix: t("เพิ่มเวลาของวันนั้น หรือใส่ท่านี้ในวันที่ยังมีเวลาเหลือ", "Give that day more time, or put this on a day with room left"),
    };

  // ด่าน 3: เพดานกล้ามเนื้อในวันนั้น
  const primary = tpl?.pri[0];
  if (primary) {
    let cur = 0;
    for (const ex of exs) for (const h of muscleMap(ex.name)) if (h.m === primary) cur += ex.sets * h.w;
    if (cur + addSets > MAX_SETS_PER_MUSCLE_PER_SESSION)
      return {
        ok: false,
        reason: t(
          `${muscleName(primary)}ใน${slotName(data, day)}จะเกิน ${MAX_SETS_PER_MUSCLE_PER_SESSION} เซต`,
          `${muscleName(primary)} on ${slotName(data, day)} would pass ${MAX_SETS_PER_MUSCLE_PER_SESSION} sets`,
        ),
        fix: t("กระจายไปวันอื่นแทนการอัดเพิ่มวันเดียว", "Spread it across days instead of stacking one"),
      };
  }

  // ด่าน 4: ระยะห่างการฟื้นตัว (ตรวจสองทิศ)
  if (primary) {
    for (const other of trainingDays(data)) {
      if (other === day) continue;
      let load = 0;
      for (const ex of exercisesForDay(data, other)) for (const h of muscleMap(ex.name)) if (h.m === primary) load += ex.sets * h.w;
      if (load < HEAVY_HIT_SETS) continue;
      const gap = minGapHours(other, day, cycleLen(data));
      if (gap < MIN_RECOVERY_HOURS)
        return {
          ok: false,
          reason: t(
            `${muscleName(primary)}โดนหนักอยู่แล้วใน${slotName(data, other)} ห่างกันแค่ ${gap} ชม.`,
            `${muscleName(primary)} already gets hit hard on ${slotName(data, other)}, only ${gap}h apart`,
          ),
          fix: t(`เว้นอย่างน้อย ${MIN_RECOVERY_HOURS} ชม. — ใส่วันอื่นหรือเพิ่มวันฝึก`, `Leave at least ${MIN_RECOVERY_HOURS}h — use another day or add one`),
        };
    }
  }

  return { ok: true };
}

// ══════════ ท่าที่เสนอได้ ══════════

export interface SuggestionTemplate {
  name: string;
  muscle: MuscleKey;
  type: ExTemplate["type"];
  sets: number;
  rmin: number;
  rmax: number;
  reason: string;
  tpl?: ExTemplate;
}

// ความสม่ำเสมอจริง 3 สัปดาห์ล่าสุด — ทำได้กี่ % ของที่วางไว้
//
// ใช้บอกความจริงที่ผู้ใช้มักไม่ยอมรับเอง: ตั้งตาราง 6 วันแต่ทำได้จริง 4 วันมาตลอด
// ตารางที่ทำได้จริง 100% ดีกว่าตารางสวยๆ ที่ทำได้ 60% เสมอ
export interface Adherence {
  planned: number;
  done: number;
  pct: number;
  weeks: number;
  low: boolean; // ต่ำกว่า 75% ติดกัน 3 สัปดาห์
}

const ADHERENCE_WEEKS = 3;
const ADHERENCE_LOW_PCT = 75;

export function adherence(data: Data): Adherence {
  const perWeek = trainingDays(data).length;
  const weeks = ADHERENCE_WEEKS;
  const planned = perWeek * weeks;
  if (!planned) return { planned: 0, done: 0, pct: 100, weeks, low: false };

  // นับ "วันที่มีการติ๊กเซตจริง" ไม่ใช่จำนวนเซต — ไปยิมแล้วเล่นน้อยก็ยังนับว่าไป
  const cutoff = Date.now() - weeks * 7 * 86400000;
  const daysWithLogs = new Set<string>();
  for (const sessions of Object.values(data.history))
    for (const s of sessions) {
      const t = Date.parse(s.date);
      if (Number.isFinite(t) && t >= cutoff && s.sets.some(Boolean)) daysWithLogs.add(s.date);
    }

  const done = daysWithLogs.size;
  const pct = Math.round((100 * done) / planned);
  return { planned, done, pct, weeks, low: pct < ADHERENCE_LOW_PCT };
}

// เรียง tier S ก่อนเสมอ — ท่าคุ้มค่าที่สุดควรถูกเสนอก่อนท่าเสริม
//
// เคยมีโหมด "เสนอเฉพาะท่า tier S" แต่ถอดออกแล้ว: กล้ามเนื้อหลายมัด (ไหล่ข้าง ไหล่หลัง
// น่อง ปลายแขน) ไม่มีท่า tier S เลยเพราะต้องใช้ท่า isolation โหมดนั้นจึงต้องมีข้อยกเว้น
// เต็มไปหมดจนสับสนว่าตกลงเสนออะไรให้ — การเรียง S ขึ้นก่อนตลอดให้ผลดีกว่าและเข้าใจง่ายกว่า
export function candidatesFor(muscle: MuscleKey): SuggestionTemplate[] {
  return EXERCISE_DB.filter((t) => t.pri.includes(muscle))
    .sort(
      (a, b) =>
        TIER_RANK[tierOf(a.name)] - TIER_RANK[tierOf(b.name)] ||
        a.pri.length + (a.sec?.length ?? 0) - (b.pri.length + (b.sec?.length ?? 0)),
    )
    .map((t) => ({
      name: t.name,
      muscle,
      type: t.type,
      sets: t.sets,
      rmin: t.rmin,
      rmax: t.rmax,
      reason: tipOf(t),
      tpl: t,
    }));
}

export function exerciseFromTemplate(t: ExTemplate, day: DayKey, order: number, id: string): Exercise {
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

// ══════════ คำแนะนำ ══════════

export type RecKind =
  | "add"
  | "buildProgram" // สร้างทั้งโปรแกรมจากโครงมาตรฐาน (ใช้ตอนเริ่มจากศูนย์)
  | "addDay" // เพิ่มวันฝึกทั้งวันตามโครงมาตรฐาน
  | "increaseSets"
  | "reduceSets"
  | "moveExercise"
  | "removeExercise"
  | "reorder" // จัดลำดับท่าในวันเดิมใหม่ ไม่เพิ่ม/ลดท่า
  | "restDay"
  | "splitDay";

export const MIN_SETS_PER_EX = 3;
export const MAX_SETS_PER_EX = 5;
const MAX_RECOMMENDATIONS = 3; // สเปค: ห้ามเสนอเกิน 3 ข้อต่อครั้ง

export interface Recommendation {
  id: string;
  kind: RecKind;
  title: string;
  detail: string;
  reason: string; // ตัวเลขปัจจุบันเทียบเป้าหมาย
  gain: number;
  priority: "high" | "medium" | "low";
  template?: SuggestionTemplate;
  day?: DayKey;
  dayType?: DayType; // addDay
  splitDays?: number; // buildProgram
  exerciseId?: string;
  /** increaseSets: เพิ่มกี่เซต — คิดจากจำนวนที่ทำให้พ้นเกณฑ์จริง ไม่ใช่ 1 เสมอ */
  addSets?: number;
  fromDay?: DayKey;
  toDay?: DayKey;
}

// กล้ามเนื้อแต่ละมัดควรไปอยู่วันประเภทไหน — ใช้ตัดสินว่าท่า "เข้าพวก" กับวันนั้นไหม
// core/calves ตั้งใจไม่ใส่ไว้: สองมัดนี้เป็นท่าปิดท้ายที่ใส่ได้แทบทุกประเภทวัน (push/pull/legs/full)
// ถ้า map ไว้ว่าเป็น "legs" แล้วมีท่า core/calves โผล่ในวัน Pull วันนั้นจะถูกนับว่า "เข้าพวกวันขา" ไปด้วย
// ทำให้ท่าขา (เช่น Bulgarian Split Squat) แอบเข้าไปอยู่วัน Pull ได้ ทั้งที่ไม่เกี่ยวกันเลย
const MUSCLE_TO_TYPE: Partial<Record<MuscleKey, DayType>> = {
  chest: "push",
  front_delts: "push",
  side_delts: "push",
  triceps: "push",
  back: "pull",
  rear_delts: "pull",
  biceps: "pull",
  forearms: "pull",
  quads: "legs",
  hamstrings: "legs",
  glutes: "legs",
};

// เพิ่มเซตท่าที่มีอยู่แล้วอีก 1 เซตได้ไหมโดยไม่ชนเพดานวัน/กล้ามเนื้อ
function canIncreaseSets(data: Data, ex: Exercise): boolean {
  if (ex.sets >= MAX_SETS_PER_EX) return false;
  const exs = exercisesForDay(data, ex.day);
  const curSets = exs.reduce((a, e) => a + e.sets, 0);
  if (curSets + 1 > getMaxSetsPerSession(data)) return false;
  if (estimateMinutes(exs) + MINUTES_PER_SET[fatigueOf(ex)] > getDayTimeCap(data, ex.day)) return false;
  const primary = muscleMap(ex.name).find((h) => h.w >= 1)?.m;
  if (primary) {
    let cur = 0;
    for (const e of exs) for (const h of muscleMap(e.name)) if (h.m === primary) cur += e.sets * h.w;
    if (cur + 1 > MAX_SETS_PER_MUSCLE_PER_SESSION) return false;
  }
  return true;
}

// คะแนนจริงถ้ากดคำแนะนำนี้ — รันผ่าน applyRecommendation ตัวเดียวกับตอนกดจริงบนสำเนา
// ไม่เดาด้วยตัวเลขคงที่ (เช่น gain: 12) เพราะผลกระทบจริงขึ้นกับตารางที่เหลือทั้งหมด
// (ท่าที่เพิ่มอาจไปกระทบสมดุลแพทเทิร์นหรือลำดับท่า ทำให้คะแนนรวมไม่ขึ้นหรือลดลงก็ได้)
function predictedScore(data: Data, rec: Recommendation): number {
  return predictedAnalysis(data, rec).execution;
}

// เพิ่มข้อสังเกตแบบไม่ซ้ำ — ใช้กับปัญหาที่ระบบเห็นแต่ "ไม่ควรลงมือแก้ให้เอง"
// (เรื่องที่ต้องรื้อตาราง: ย้ายวัน แยกวัน สลับลำดับ — ระบบไม่รู้ตารางชีวิตจริงของผู้ใช้)
function blockedInsight(analysis: Analysis, insight: BlockedInsight): void {
  if (analysis.blockedInsights.some((b) => b.issue === insight.issue)) return;
  analysis.blockedInsights.push(insight);
}

// เหมือน predictedScore แต่คืน ceiling มาด้วย — ใช้ตอนต้องเทียบ "เติมวันเดิม" กับ "เปิดวันใหม่"
// เพราะบางทีเติมวันเดิมได้คะแนนเท่ากันในตานี้ แต่เปิดวันใหม่ปลดล็อกเพดานที่สูงกว่าในระยะยาว
// ถ้าเทียบแค่คะแนนตานี้ตาเดียว ระบบจะติดกับดักอัดท่าลงวันเดิมไปเรื่อยๆ จนวันฝึกไม่พอจริงและคะแนนไปได้ไม่ถึง 100
function predictedAnalysis(data: Data, rec: Recommendation): { execution: number; ceiling: number; breakdown: ScoreBreakdown } {
  const clone: Data = structuredClone(data);
  applyRecommendation(clone, rec);
  const a = analyzeProgram(clone);
  return { execution: a.execution, ceiling: a.ceiling, breakdown: a.breakdown };
}

// วันนั้นฝึกกลุ่มกล้ามเนื้อแบบไหนอยู่บ้าง (push/pull/legs) — ดูจากท่าที่มีอยู่จริง ไม่ใช่จากป้าย dayType
function dayCategories(data: Data, day: DayKey): Set<DayType> {
  const cats = new Set<DayType>();
  for (const ex of exercisesForDay(data, day))
    for (const h of muscleMap(ex.name)) {
      if (h.w < 1) continue;
      const t = MUSCLE_TO_TYPE[h.m];
      if (t) cats.add(t);
    }
  return cats;
}

// วันที่เหมาะจะใส่ท่าของกล้ามเนื้อนี้ที่สุด (ผ่านตัวกรองแล้วเท่านั้น)
function findValidDay(data: Data, tpl: ExTemplate, sets: number): { day: DayKey; verdict: FilterVerdict } | null {
  const days = trainingDays(data);
  const primary = tpl.pri[0];
  const targetType = MUSCLE_TO_TYPE[primary];

  // วันนั้น "เข้าพวก" กับกล้ามเนื้อนี้ไหม — ไม่ต้องเคยฝึกกล้ามเนื้อมัดนี้ตรงๆ มาก่อน
  // แค่เป็นวันประเภทเดียวกัน (เช่น มีท่าอกอยู่แล้ว = วันดัน ก็ใส่ไหล่ข้าง/ไตรเซปเพิ่มได้)
  // ถ้าเข้มงวดว่าต้องเคยโดนกล้ามเนื้อมัดนี้มาก่อนเป๊ะๆ ท่าที่ยังไม่เคยมีเลย (เช่น ไหล่ข้าง)
  // จะไม่มีทางถูกเสนอผ่านวันเดิมได้เลย ทั้งที่วันนั้นเป็นวันดันอยู่แล้วและใส่ได้จริง
  // มีวันไหนที่ "เข้าพวก" กับกล้ามเนื้อนี้บ้างไหม
  const anyMatchingDay = days.some((day: DayKey) => {
    const cats = dayCategories(data, day);
    return cats.size > 0 && (!targetType || cats.has(targetType));
  });
  // วันนั้นมีท่าที่ "ทำหน้าที่เดียวกัน" อยู่แล้วไหม — แพทเทิร์นเดียวกันและกล้ามหลักตัวเดียวกัน
  //
  // กันชื่อซ้ำอย่างเดียวไม่พอ: "Romanian Deadlift" กับ "Dumbbell RDL" คนละชื่อแต่เป็นท่าเดียวกัน
  // ระบบเคยเสนอทั้งคู่ลงวันเดียวกัน ได้ตารางที่มีท่าซ้ำซ้อนโดยไม่ได้อะไรเพิ่ม
  const hasSameRole = (day: DayKey) =>
    exercisesForDay(data, day).some((ex) => {
      const t = findTemplate(ex.name);
      return !!t && t.pattern === tpl.pattern && t.pri[0] === tpl.pri[0];
    });

  const trainsMuscle = (day: DayKey) => {
    if (hasSameRole(day)) return false;
    const cats = dayCategories(data, day);
    if (!cats.size) return false; // วันว่างเปล่า ไม่นับว่าเข้าพวกอะไร
    if (targetType && cats.has(targetType)) return true;
    // ไม่มีวันไหนเข้าพวกเลย (เช่นตารางมีแต่วันดัน แล้วต้องเติมหลัง) ก็ต้องลงที่ไหนสักที่
    // ไม่งั้นกล้ามเนื้อที่ขาดจะไม่มีวันถูกเติมได้เลย และคะแนนค้างอยู่แบบนั้นตลอดไป
    return !anyMatchingDay;
  };

  const load = (day: DayKey) => exercisesForDay(data, day).reduce((x, e) => x + e.sets, 0);

  // สำคัญ: ต้องเลือกวันที่ "เข้าพวก" ก่อนวันที่ว่างสุด
  // ไม่งั้นจะได้ Leg Press ไปโผล่วัน Pull หรือ Hammer Curl ไปวันขา ซึ่งเล่นจริงแล้วมั่ว
  const sorted = [...days].sort((a, b) => {
    const fit = (trainsMuscle(a) ? 0 : 1) - (trainsMuscle(b) ? 0 : 1);
    return fit || load(a) - load(b);
  });

  for (const day of sorted) {
    // วันที่ไม่เข้าพวกเลย ให้ข้ามไปก่อน — ยอมไม่เสนอ ดีกว่าเสนอของที่เล่นจริงแล้วงง
    if (!trainsMuscle(day)) continue;
    const v = checkFilters(data, tpl, day, sets);
    if (v.ok) return { day, verdict: v };
  }
  return null;
}

export function buildRecommendations(data: Data, analysis: Analysis): Recommendation[] {
  const recs: Recommendation[] = [];
  const existing = new Set(data.exercises.map((e) => normName(e.name)));
  const target = getVolumeTarget(data);
  let n = 0;
  const mkId = () => "rec" + n++;

  // -1) นอนไม่พอติดกันหลายวัน — คอขวดอยู่ที่การฟื้นตัว ไม่ใช่ปริมาณการฝึก
  //
  // การเพิ่มปริมาณตอนที่ฟื้นตัวไม่ทันไม่ได้ทำให้โตขึ้น แต่ทำให้ล้าสะสมและเสี่ยงบาดเจ็บ
  // ตัดคำแนะนำที่ "เพิ่มของ" ออกทั้งหมด เหลือแต่คำแนะนำที่ลด/ปรับ แล้วบอกต้นเหตุจริง
  // -2) ทำตามตารางไม่ค่อยได้ — บอกความจริงแต่ไม่ลดวันให้เอง
  //
  // สเปคเดิมอยากให้ระบบรวมวันให้อัตโนมัติ แต่ขัดกับหลัก "ไม่รื้อตารางที่ผู้ใช้จัดเอง"
  // ระบบไม่รู้ว่าสัปดาห์ที่ขาดเพราะป่วย สอบ หรือตารางไม่ไหวจริง — ผู้ใช้ตัดสินใจเองถูกกว่า
  const adh = adherence(data);
  if (adh.low && adh.planned > 0) {
    const realistic = Math.max(1, Math.round(adh.done / adh.weeks));
    blockedInsight(analysis, {
      issue: t(
        `${adh.weeks} สัปดาห์ล่าสุดทำได้ ${adh.done}/${adh.planned} ครั้ง (${adh.pct}%)`,
        `Over the last ${adh.weeks} weeks you hit ${adh.done}/${adh.planned} sessions (${adh.pct}%)`,
      ),
      whyCannotFix: t(
        `ตั้งไว้ ${trainingDays(data).length} วัน/สัปดาห์ แต่ทำได้จริงราว ${realistic} วัน`,
        `The plan says ${trainingDays(data).length} days/week but you actually manage about ${realistic}`,
      ),
      realSolution: t(
        `ตารางที่ทำได้ครบ ${realistic} วันให้ผลดีกว่าตาราง ${trainingDays(data).length} วันที่ขาดประจำ — ลองย้ายท่าสำคัญของวันที่ขาดบ่อยไปวันที่ไปได้แน่`,
        `A ${realistic}-day plan you finish beats a ${trainingDays(data).length}-day plan you keep missing — move the important lifts off the days you skip onto the ones you always make`,
      ),
    });
  }

  const sleep = sleepSummary(data);
  if (sleep.underRecovered) {
    blockedInsight(analysis, {
      issue: t(`นอนเฉลี่ย ${sleep.avg7 ?? "<6.5"} ชม./คืน ติดกันหลายวัน`, `Averaging ${sleep.avg7 ?? "<6.5"}h of sleep a night for several days`),
      whyCannotFix: t(
        "ฟื้นตัวไม่ทัน — เพิ่มปริมาณตอนนี้ไม่ทำให้โตขึ้น แต่ล้าสะสมและเสี่ยงบาดเจ็บ",
        "You're not recovering — adding volume now won't build anything, it just piles on fatigue and injury risk",
      ),
      realSolution: t(
        "คอขวดอยู่ที่การนอน ไม่ใช่ตาราง — นอนให้ถึง 7 ชม. สัก 1 สัปดาห์ก่อนค่อยเพิ่มปริมาณ",
        "Sleep is the bottleneck, not the program — get to 7h for a week before adding volume",
      ),
    });
  }

  // 0) ตารางว่างเปล่า — เสนอสร้างทั้งโปรแกรมทีเดียว ให้เลือกว่าฝึกได้กี่วัน
  //
  //    ทำไมไม่เสนอทีละท่า/ทีละวัน: การเพิ่มทีละวันแล้วเลือกโครงใหม่ทุกครั้ง
  //    ทำให้ได้วันที่ไม่เข้าชุดกัน (Full Body จันทร์ + Lower อังคาร = ขาโดนติดกัน 24 ชม.)
  //    โครงทั้งชุดออกแบบให้วันพักและระยะห่างลงตัวตั้งแต่แรก กดครั้งเดียวเล่นได้เลย
  if (data.exercises.length === 0) {
    for (const dayCount of OFFERED_SPLITS) {
      const built = buildFullProgram(data, dayCount);
      if (!built.exercises.length) continue;
      const sets = built.exercises.reduce((a, e) => a + e.sets, 0);
      const days = splitDays(dayCount);
      const restDays = DAYS.filter((d) => !days.includes(d));

      // ลองสร้างจริงในสำเนาแล้ววัดคะแนน — เสนอโดยรู้ผลลัพธ์ ไม่ใช่เดา
      const probe: Data = { ...data, exercises: built.exercises, dayLabels: { ...data.dayLabels, ...built.labels } };
      const predicted = analyzeProgram(probe).execution;

      recs.push({
        id: mkId(),
        kind: "buildProgram",
        splitDays: dayCount,
        title: t(`สร้างโปรแกรม ${dayCount} วัน/สัปดาห์`, `Build a ${dayCount}-day program`),
        detail: t(
          `${splitSummary(dayCount)} — ${built.exercises.length} ท่า ${sets} เซต · พัก${restDays.map((d) => slotName(data, d)).join(" ")}`,
          `${splitSummary(dayCount)} — ${built.exercises.length} exercises, ${sets} sets · rest ${restDays.map((d) => slotName(data, d)).join(" ")}`,
        ),
        reason: t(
          `ฝึก${days.map((d) => slotName(data, d)).join(" ")} · กล้ามเนื้อกลุ่มเดิมห่างกันอย่างน้อย 48 ชม. — คาดว่าจะได้ ${predicted} คะแนน`,
          `Train ${days.map((d) => slotName(data, d)).join(" ")} · same muscle group always 48h+ apart — should score ${predicted}`,
        ),
        gain: predicted,
        priority: "high",
      });
    }
    return recs.sort((a, b) => b.gain - a.gain).slice(0, 3);
  }

  // 1) วันที่อัดเกินเพดาน — บอกให้รู้ แต่ไม่ย้ายท่าให้เอง
  //
  // เดิมเสนอเป็นปุ่ม "แยกวันไปวันว่าง" กดแล้วย้ายท่าทันที — เลิกทำแล้ว
  // เพราะระบบไม่รู้ว่าผู้ใช้ว่างจริงวันไหน (วันว่างในตารางอาจเป็นวันที่เขาไปยิมไม่ได้เลย)
  // การรื้อตารางให้โดยไม่รู้ข้อจำกัดชีวิตจริง ทำให้ตารางแย่กว่าเดิม ผู้ใช้ตัดสินใจเองดีกว่า
  for (const dl of analysis.dayLoads.filter((d) => d.overSets || d.overTime)) {
    blockedInsight(analysis, {
      issue: dl.overTime
        ? t(
            `${slotName(data, dl.day)}ใช้เวลาราว ${dl.minutes} นาที (มีเวลา ${getDayTimeCap(data, dl.day)})`,
            `${slotName(data, dl.day)} runs about ${dl.minutes} min (you have ${getDayTimeCap(data, dl.day)})`,
          )
        : t(
            `${slotName(data, dl.day)}มี ${dl.sets} เซต (เพดาน ${getMaxSetsPerSession(data)})`,
            `${slotName(data, dl.day)} has ${dl.sets} sets (cap is ${getMaxSetsPerSession(data)})`,
          ),
      whyCannotFix: t("วันนี้แน่นเกินเพดานที่ตั้งไว้ — เซตท้ายๆ จะได้แรงไม่เต็ม", "That day is over your own limit — the last sets won't get your full effort"),
      realSolution: t("ย้ายท่าท้ายไปวันที่คุณว่างจริง หรือลดเซตท่าที่ซ้ำซ้อนลง", "Move the tail end to a day you're genuinely free, or trim sets from the redundant lifts"),
    });
  }

  // 1.6) กล้ามเนื้อกลุ่มเดิมโดนหนักสองวันห่างกันไม่ถึง 48 ชม. — บอกให้รู้ ไม่ย้ายวันให้เอง
  //
  // เดิมเสนอเป็นปุ่ม "ย้ายวันฝึกจากศุกร์ไปพฤหัส" กดแล้วย้ายท่าทั้งวันทันที — เลิกทำแล้ว
  // เพราะระบบไม่รู้ตารางงาน/เรียนของผู้ใช้ ย้ายไปวันที่เขาไปยิมไม่ได้ = ตารางใช้ไม่ได้เลย
  // แย่กว่าปล่อยไว้เฉยๆ ตามเดิมเสียอีก
  for (const r of analysis.recovery.slice(0, 2)) {
    blockedInsight(analysis, {
      issue: t(
        `${muscleName(r.muscle)}โดนหนักทั้ง${slotName(data, r.a)}และ${slotName(data, r.b)} ห่างกันแค่ ${r.gapHours} ชม.`,
        `${muscleName(r.muscle)} gets hit hard on both ${slotName(data, r.a)} and ${slotName(data, r.b)}, only ${r.gapHours}h apart`,
      ),
      whyCannotFix: t(`กล้ามเนื้อต้องการ ${MIN_RECOVERY_HOURS} ชม. ก่อนโดนหนักซ้ำ`, `Muscle needs ${MIN_RECOVERY_HOURS}h before taking another hard session`),
      realSolution: t(
        `ถ้าสองวันนี้เลี่ยงไม่ได้ ให้ลดเซต${muscleName(r.muscle)}ในวันหนึ่งลง หรือสลับเป็นท่าเบากว่า`,
        `If those two days are fixed, cut ${muscleName(r.muscle).toLowerCase()} sets on one of them or swap in something lighter`,
      ),
    });
  }

  // 1.65) ลำดับท่ายังไม่เหมาะ — บอกเฉยๆ ไม่จัดใหม่ให้
  // ผู้ใช้อาจเรียงตามลำดับที่เขาชอบเล่นจริงหรือตามคิวเครื่องในยิม ระบบไม่ควรไปสลับให้เอง
  if (analysis.breakdown.order < 0.85) {
    blockedInsight(analysis, {
      issue: t("ลำดับท่าในบางวันยังไม่เหมาะ", "Some days aren't in a great order"),
      whyCannotFix: t("มีท่าหนักอยู่หลังท่าเจาะจง ทำให้ท่าหนักได้แรงไม่เต็ม", "A heavy lift sits after isolation work, so it doesn't get your full strength"),
      realSolution: t(
        "เรียงท่าหนัก/compound ไว้ต้นวัน แล้วเก็บท่าเจาะจง ท้อง น่อง ไว้ปิดท้าย",
        "Put the heavy compounds first and save isolation, abs, and calves for the end",
      ),
    });
  }

  // 1.5) สมดุลแพทเทิร์น — กล้ามเนื้ออาจได้เซตรวมครบเป้าแล้ว แต่ "ชนิดท่า" เอียงไปทางเดียว
  // (เช่น back ได้เซตครบจาก Lat Pulldown ล้วน แต่ไม่มีท่าโรว์เลย = ดึงลงเยอะ ดึงเข้าน้อย เสี่ยงไหล่ห่อ)
  // ต้องแก้แยกจากช่องว่างปริมาณด้านล่าง เพราะการนับกล้ามเนื้อรวมไม่เห็นปัญหานี้เลย
  const patSets = new Map(analysis.patterns.map((p) => [p.pattern, p.sets]));
  const patVal = (p: Pattern) => patSets.get(p) ?? 0;
  const hPush2 = patVal("horizontal_push");
  const hPull2 = patVal("horizontal_pull");
  const patternNeeds: { pattern: Pattern; muscle: MuscleKey; why: string }[] = [];
  if (hPull2 < hPush2 * 0.8 || hPull2 < 1)
    patternNeeds.push({
      pattern: "horizontal_pull",
      muscle: "back",
      why: t("ท่าดึงเข้าหาตัวน้อยกว่าท่าดันออกหน้า — เสี่ยงไหล่ห่อ", "Less horizontal pulling than pushing — rounded shoulders risk"),
    });
  if (patVal("vertical_pull") < 1)
    patternNeeds.push({ pattern: "vertical_pull", muscle: "back", why: t("ไม่มีท่าดึงลงล่างเลย", "No vertical pulling at all") });
  if (patVal("hip_hinge") < 3)
    patternNeeds.push({
      pattern: "hip_hinge",
      muscle: "hamstrings",
      why: t("ท่าบานพับสะโพกน้อยเกิน — หลังขาและก้นจะขาด", "Too little hip hinging — hamstrings and glutes fall short"),
    });

  for (const need of patternNeeds) {
    if (recs.length >= MAX_RECOMMENDATIONS) break;
    const cands = candidatesFor(need.muscle).filter((c) => !existing.has(normName(c.name)) && c.tpl?.pattern === need.pattern);
    let bestPat: { rec: Recommendation; predicted: number } | null = null;
    for (const c of cands) {
      if (!c.tpl) continue;
      const spot = findValidDay(data, c.tpl, MIN_SETS_PER_EX);
      if (!spot) continue;
      const candidateRec: Recommendation = {
        id: mkId(),
        kind: "add",
        template: c,
        day: spot.day,
        title: t(`เพิ่ม ${c.name}`, `Add ${c.name}`),
        detail: t(
          `ใส่เข้า${slotName(data, spot.day)} ${MIN_SETS_PER_EX} เซต — ${c.reason}`,
          `${MIN_SETS_PER_EX} sets on ${slotName(data, spot.day)} — ${c.reason}`,
        ),
        reason: need.why,
        gain: 0,
        priority: "high",
      };
      const predicted = predictedScore(data, candidateRec);
      if (!bestPat || predicted > bestPat.predicted) bestPat = { rec: candidateRec, predicted };
      if (bestPat.predicted >= 100) break;
    }
    if (bestPat && bestPat.predicted >= analysis.execution) {
      bestPat.rec.gain = bestPat.predicted - analysis.execution;
      recs.push(bestPat.rec);
    }
  }

  // 2) กล้ามเนื้อที่ขาด/น้อย — เสนอท่าใหม่ที่ "ผ่านตัวกรองแล้วเท่านั้น"
  const gaps = analysis.stats
    .filter((s) => s.status === "missing" || s.status === "low")
    .sort((a, b) => {
      const majA = MAJOR_MUSCLES.includes(a.muscle) ? 1 : 0;
      const majB = MAJOR_MUSCLES.includes(b.muscle) ? 1 : 0;
      return majB - majA || a.sets - b.sets;
    });

  for (const s of gaps) {
    if (recs.length >= MAX_RECOMMENDATIONS) break;
    const cands = candidatesFor(s.muscle).filter((c) => !existing.has(normName(c.name)));
    const blockedReasons: FilterVerdict[] = [];

    // สามทางเลือก: (1) เพิ่มท่าใหม่ในวันเดิม (2) เพิ่มเซตท่าที่มีอยู่ (3) เปิดวันใหม่
    // ต้องเทียบทั้ง 3 ทางด้วยเกณฑ์เดียวกัน (เพดานก่อน คะแนนจริงรองลงมา) ไม่ใช่ไล่ลองทีละทางตามลำดับ
    // เพราะถ้าใช้ "เติมวันเดิมได้คะแนนเท่าเดิม" เป็นคำตอบสุดท้ายเสมอ (ลองทางแรกที่ไม่แย่ลงแล้วหยุด)
    // ระบบจะติดกับดักอัดท่าลงวันเดิมไปเรื่อยๆ จนวันฝึกไม่พอจริง แล้วคะแนนไปได้ไม่ถึง 100 เลย
    // ทั้งที่เปิดวันใหม่จะปลดล็อกเพดานที่สูงกว่าในระยะยาว
    let bestOption: { rec: Recommendation; predicted: number; ceiling: number } | null = null;
    const consider = (rec: Recommendation, predicted: number, ceiling: number) => {
      if (predicted < analysis.execution) return; // ห้ามแย่ลง เสมอตัวยังยอมได้
      if (!bestOption || ceiling > bestOption.ceiling || (ceiling === bestOption.ceiling && predicted > bestOption.predicted))
        bestOption = { rec, predicted, ceiling };
    };

    // (1) เพิ่มท่าใหม่ในวันเดิม
    for (const c of cands) {
      if (!c.tpl) continue;
      const spot = findValidDay(data, c.tpl, MIN_SETS_PER_EX);
      if (!spot) {
        const v = checkFilters(data, c.tpl, trainingDays(data)[0] ?? "mon", MIN_SETS_PER_EX);
        blockedReasons.push(v);
        continue;
      }
      const candidateRec: Recommendation = {
        id: mkId(),
        kind: "add",
        template: c,
        day: spot.day,
        title: t(`เพิ่ม ${c.name}`, `Add ${c.name}`),
        detail: t(
          `ใส่เข้า${slotName(data, spot.day)} ${MIN_SETS_PER_EX} เซต — ${c.reason}`,
          `${MIN_SETS_PER_EX} sets on ${slotName(data, spot.day)} — ${c.reason}`,
        ),
        reason: t(
          `${muscleName(s.muscle)}ได้ ${s.sets} เซต/สัปดาห์ ต่ำกว่าเป้า ${target.min}`,
          `${muscleName(s.muscle)} gets ${s.sets} sets/week, below the ${target.min} target`,
        ),
        gain: 0,
        priority: s.status === "missing" && MAJOR_MUSCLES.includes(s.muscle) ? "high" : "medium",
      };
      const { execution: predicted, ceiling } = predictedAnalysis(data, candidateRec);
      consider(candidateRec, predicted, ceiling);
    }

    // (2) เพิ่มเซตท่าที่มีอยู่แล้ว
    const bumpable = data.exercises.filter(
      (ex) => canIncreaseSets(data, ex) && muscleMap(ex.name).some((h) => h.m === s.muscle && h.w >= 1),
    );
    for (const bump of bumpable) {
      // เสนอ "จำนวนเซตที่พอจะพ้นเกณฑ์จริง" ไม่ใช่ +1 เสมอ
      //
      // เดิมเสนอ +1 ทุกครั้ง ถ้าเพิ่มแล้วยังไม่พ้นเกณฑ์ = คะแนนไม่ขยับสักคะแนน
      // ผู้ใช้กดตามแล้วเห็นเลขเดิม เลยสรุปว่าแอปโกหก (เจอจริงกับเคสน่อง 8 เซต)
      // ตัวหารคือน้ำหนักของท่านั้นต่อมัด — ท่าที่มัดนี้เป็นกล้ามรองได้ครึ่งเดียวต่อเซต
      const w = muscleMap(bump.name).find((h) => h.m === s.muscle)?.w ?? 1;
      const need = Math.max(1, Math.ceil((target.warnLow - s.sets) / w));
      const addSets = Math.min(need, MAX_SETS_PER_EX - bump.sets);
      const candidateRec: Recommendation = {
        id: mkId(),
        kind: "increaseSets",
        exerciseId: bump.id,
        addSets,
        title: t(`เพิ่มเซต ${bump.name}`, `Add sets to ${bump.name}`),
        detail: t(
          `เพิ่มจาก ${bump.sets} เป็น ${bump.sets + addSets} เซต — ท่านี้มีอยู่แล้ว ยังไม่ถึงเพดานต่อท่า`,
          `${bump.sets} → ${bump.sets + addSets} sets — it's already in the program and under the per-exercise cap`,
        ),
        reason: t(
          `${muscleName(s.muscle)}ได้ ${s.sets} เซต/สัปดาห์ ต่ำกว่าเป้า ${target.min}`,
          `${muscleName(s.muscle)} gets ${s.sets} sets/week, below the ${target.min} target`,
        ),
        gain: 0,
        priority: "medium",
      };
      const { execution: predicted, ceiling } = predictedAnalysis(data, candidateRec);
      consider(candidateRec, predicted, ceiling);
    }

    // ไม่มีตัวเลือก (3) "เปิดวันใหม่" อีกแล้ว — เดิมเสนอเป็นปุ่มกดสร้างวันฝึกใหม่ทั้งวัน
    // แต่ระบบไม่รู้ว่าผู้ใช้ว่างไปยิมวันไหนจริง เพิ่มวันให้เองเสี่ยงได้ตารางที่ทำตามไม่ได้
    // ถ้าตารางเดิมไม่มีที่ลง ให้บอกเป็นข้อสังเกตด้านล่างแทน ผู้ใช้เลือกเองว่าจะเพิ่มวันไหม

    let placed = false;
    if (bestOption) {
      const chosen = bestOption as { rec: Recommendation; predicted: number; ceiling: number };
      chosen.rec.gain = chosen.predicted - analysis.execution;
      // ทำตามแล้วคะแนนไม่ขยับ และไม่ได้ปลดเพดานให้ก้าวต่อไปด้วย = ไม่ควรโชว์เป็นปุ่มให้กด
      //
      // เคสจริง: น่อง 8 เซตของผู้ใช้ระดับขั้นสูง (เกณฑ์ 10) ท่าน่องทั้งสองตัวเพิ่มได้อีกตัวละ 1 เซต
      // เท่านั้น (เพดานต่อท่า 5) เพิ่มตัวเดียวได้ 9 ยังไม่พ้นเกณฑ์ คะแนนเลยเท่าเดิม
      // ผู้ใช้กดแล้วเห็น 98 เหมือนเดิม -> สรุปว่าแอปโกหก
      // บอกตรงๆ ว่าต้องเพิ่มอีกเท่าไหร่และทำไมกดปุ่มเดียวไม่พอ ดีกว่าให้ปุ่มที่ไม่มีผล
      // (ตรงกับหลักเดิมของไฟล์นี้: ห้ามผ่อนกฎเพื่อให้มีอะไรแสดง ให้บอกต้นเหตุแทน)
      if (chosen.rec.gain > 0 || chosen.ceiling > analysis.ceiling) {
        recs.push(chosen.rec);
        placed = true;
      } else {
        const short = Math.max(0, +(target.warnLow - s.sets).toFixed(1));
        blockedInsight(analysis, {
          issue: t(
            `${muscleName(s.muscle)}ได้ ${s.sets} เซต/สัปดาห์ (เกณฑ์ขั้นต่ำ ${target.warnLow})`,
            `${muscleName(s.muscle)} gets ${s.sets} sets/week (minimum is ${target.warnLow})`,
          ),
          whyCannotFix: t(
            `ต้องเพิ่มอีก ${short} เซตถึงจะพ้นเกณฑ์ แต่ท่าที่มีอยู่เพิ่มได้ไม่ถึง (เพดานต่อท่า ${MAX_SETS_PER_EX} เซต) เพิ่มท่าเดียวจึงยังไม่ทำให้คะแนนขยับ`,
            `It needs ${short} more sets to clear the bar, but no single lift can add that much (cap is ${MAX_SETS_PER_EX} sets each), so bumping just one won't move the score`,
          ),
          realSolution: t(
            `เพิ่มเซตในท่า${muscleName(s.muscle)}หลายท่าพร้อมกัน หรือเพิ่มท่าใหม่ให้กลุ่มนี้ — และถ้าคุณพอใจกับปริมาณเท่านี้อยู่แล้ว ปล่อยไว้ก็ได้ ไม่ใช่ความผิดพลาดของตาราง`,
            `Add sets across several ${muscleName(s.muscle).toLowerCase()} lifts at once, or add another one — and if you're happy with the current amount, leaving it is fine, it isn't a flaw in the program`,
          ),
        });
        placed = true; // บอกไปแล้วว่าติดตรงไหน ไม่ต้องซ้ำด้วยข้อความ "ไม่มีที่ลง" ด้านล่าง
      }
    }

    // ไม่มีท่าไหนลงในตารางเดิมได้เลย — ห้ามผ่อนกฎเพื่อให้มีอะไรแสดง ให้บอกต้นเหตุแทน
    if (!placed) {
      const top = blockedReasons[0];
      const already = analysis.blockedInsights.some((b) => b.issue.includes(muscleName(s.muscle)));
      if (!already)
        blockedInsight(analysis, {
          issue: t(
            `${muscleName(s.muscle)}ได้ ${s.sets} เซต/สัปดาห์ (เป้า ${target.min}-${target.max})`,
            `${muscleName(s.muscle)} gets ${s.sets} sets/week (target ${target.min}-${target.max})`,
          ),
          whyCannotFix:
            top?.reason ?? t("วันฝึกที่มีอยู่ไม่มีที่ว่างที่เหมาะกับกล้ามเนื้อกลุ่มนี้", "None of your current days have room that suits this muscle group"),
          realSolution:
            top?.fix ??
            t(
              `เพิ่มเซต${muscleName(s.muscle)}ในวันที่คุณว่าง หรือแทนท่าที่ซ้ำซ้อนด้วยท่าของกลุ่มนี้`,
              `Add ${muscleName(s.muscle).toLowerCase()} sets on a day you're free, or swap a redundant lift for one that hits it`,
            ),
        });
    }
  }

  // 3) กล้ามเนื้อที่เกินโซนคุ้มค่า — ลดเซตท่าที่ซ้ำซ้อน
  for (const s of analysis.stats.filter((s) => s.status === "high")) {
    if (recs.length >= MAX_RECOMMENDATIONS) break;
    // เรียงท่าที่มัดนี้เป็น "กล้ามหลัก" ไว้ก่อน — ลด 1 เซตแล้วได้ผลเต็ม 1 เซต
    // ถ้าไปลดท่าที่มันเป็นกล้ามรอง จะลดได้แค่ 0.5 ซึ่งมักไม่พอพ้นเกณฑ์
    // แล้วระบบก็จะวนเสนอลดท่าอื่นไปเรื่อยๆ โดยไม่มีทางแก้ปัญหาได้จริง
    const weightOf = (ex: Exercise) => muscleMap(ex.name).find((h) => h.m === s.muscle)?.w ?? 0;
    const contributors = data.exercises
      .filter((ex) => weightOf(ex) > 0)
      .sort((a, b) => weightOf(b) - weightOf(a) || b.sets - a.sets);
    const cut = contributors.find((ex) => ex.sets > MIN_SETS_PER_EX);
    if (!cut) continue;
    const candidateRec: Recommendation = {
      id: mkId(),
      kind: "reduceSets",
      exerciseId: cut.id,
      title: t(`ลดเซต ${cut.name}`, `Cut a set from ${cut.name}`),
      detail: t(
        `ลดเหลือ ${cut.sets - 1} เซต — เอาเวลาไปเติมกล้ามเนื้อที่ยังขาดคุ้มกว่า`,
        `Down to ${cut.sets - 1} sets — that time is worth more on a muscle that's short`,
      ),
      reason: t(
        `${muscleName(s.muscle)}ได้ ${s.sets} เซต/สัปดาห์ เกินขอบบน ${target.warnHigh}`,
        `${muscleName(s.muscle)} gets ${s.sets} sets/week, past the ${target.warnHigh} ceiling`,
      ),
      gain: 4,
      priority: "low",
    };
    const predicted = predictedScore(data, candidateRec);
    // ยอมรับได้ 2 กรณี: คะแนนขึ้นจริง หรือ "เข้าใกล้เป้ามากขึ้น" แม้คะแนนยังไม่ขยับ
    //
    // เดิมบังคับว่าคะแนนต้องขึ้นทันที ซึ่งบล็อกการแก้ที่ต้องทำหลายขั้น:
    // อก 27 เซตต้องลดถึง 22 ถึงจะพ้นเกณฑ์ แต่ลดครั้งแรกเหลือ 26 คะแนนยังเท่าเดิม
    // ระบบจึงไม่เสนอเลยแม้แต่ครั้งเดียว แล้วผู้ใช้ก็ติดอยู่ที่คะแนนนั้นตลอดไป
    // (เงื่อนไข "ต้องยังเกินเพดานอยู่" กันไม่ให้ไล่ลดเซตต่อหลังเข้าเป้าแล้ว)
    const stillOver = s.sets - 1 > target.warnHigh * (VOLUME_CEILING_MUL[s.muscle] ?? 1);
    if (predicted <= analysis.execution && !stillOver) continue;
    candidateRec.gain = Math.max(1, predicted - analysis.execution);
    recs.push(candidateRec);
  }

  // 3.5) วันฝึกที่มีอยู่เต็มหมดแล้วแต่ยังมีมัดที่ขาด — เปิดวันใหม่
  //
  // ทางเลือกสุดท้ายเมื่อ add ลงวันเดิมไม่ได้อีกแล้ว (ทุกวันชนเพดานเซตหรือเวลา)
  // ถ้าไม่มีข้อนี้ ตารางที่ฝึกน้อยวันจะติดเพดานคะแนนถาวรโดยไม่มีอะไรให้กดต่อ
  //
  // เงื่อนไขที่กันไม่ให้กลายเป็นการยัดวันมั่ว:
  //   - ต้องมีมัดใหญ่ที่ขาดจริง (ไม่ใช่แค่อยากได้คะแนน)
  //   - ต้องเหลือวันพักอย่างน้อย 1 วันหลังเพิ่ม
  //   - ประเภทวันต้องตรงกับมัดที่ขาด
  {
    // ใช้เมื่อ "ไม่มีคำแนะนำอื่นเหลือแล้ว" เท่านั้น — recs ว่าง = ทุกทางในวันเดิมตันหมด
    // ถ้าไม่จำกัดแบบนี้ ระบบจะชอบเปิดวันใหม่มากกว่าเติมของในวันที่มีอยู่ ซึ่งไม่ใช่ทางที่ดีกว่า
    const lacking = analysis.stats
      .filter((s) => s.status === "low" || s.status === "missing")
      .sort((a, b) => (MAJOR_MUSCLES.includes(b.muscle) ? 1 : 0) - (MAJOR_MUSCLES.includes(a.muscle) ? 1 : 0));
    const freeDays = activeDays(data).filter((day) => exercisesForDay(data, day).length === 0);
    if (lacking.length && freeDays.length >= 2 && recs.length === 0) {
      const dayType = MUSCLE_TO_TYPE[lacking[0].muscle] ?? "full";
      if (dayType) {
        const day = freeDays[0];
        const candidateRec: Recommendation = {
          id: mkId(),
          kind: "addDay",
          day,
          dayType,
          title: t(`เปิดวัน${DAY_TYPE_SHORT[dayType]}เพิ่มที่${slotName(data, day)}`, `Open a ${DAY_TYPE_SHORT[dayType]} day on ${slotName(data, day)}`),
          detail: t(
            `วันฝึกที่มีอยู่เต็มแล้ว — เปิดวันใหม่เพื่อใส่ท่า${muscleName(lacking[0].muscle)}ที่ยังขาด`,
            `Your current days are full — a new one makes room for the ${muscleName(lacking[0].muscle).toLowerCase()} work you're missing`,
          ),
          reason: t(
            `${muscleName(lacking[0].muscle)}ได้ ${lacking[0].sets} เซต/สัปดาห์ (เป้า ${target.min}-${target.max}) และวันเดิมไม่มีที่ว่างแล้ว`,
            `${muscleName(lacking[0].muscle)} gets ${lacking[0].sets} sets/week (target ${target.min}-${target.max}) and there's no room left`,
          ),
          gain: 6,
          priority: "medium",
        };
        const predicted = predictedScore(data, candidateRec);
        if (predicted > analysis.execution) {
          candidateRec.gain = predicted - analysis.execution;
          recs.push(candidateRec);
        }
      }
    }
  }

  // 4) ลำดับท่าในวันยังไม่ถูกหลัก — จัดใหม่ในวันเดิม ไม่เพิ่ม/ลด/ย้ายท่าไปไหน
  //
  // ระบบรองรับ reorder ใน applyRecommendation มาตั้งแต่แรกแต่ไม่เคยมีใครสร้างคำแนะนำนี้
  // ผลคือหมวดลำดับท่าไม่มีทางเต็มได้เลยไม่ว่าจะกดกี่ครั้ง — คำแนะนำหมดทั้งที่ปัญหายังอยู่
  if (analysis.breakdown.order < 1)
    for (const day of trainingDays(data)) {
      if (recs.length >= MAX_RECOMMENDATIONS) break;
      const candidateRec: Recommendation = {
        id: mkId(),
        kind: "reorder",
        day,
        title: t(`จัดลำดับท่าวัน${slotName(data, day)}ใหม่`, `Reorder ${slotName(data, day)}`),
        detail: t(
          "เรียงท่าหนักไว้ต้นวัน ท่าเจาะจงและหน้าท้อง/น่องไว้ท้าย — ไม่เพิ่มหรือลดท่าใดๆ",
          "Heavy lifts first, isolation and abs/calves last — nothing added or removed",
        ),
        reason: t("ท่าที่ล้าสูงควรทำตอนแรงยังเต็ม ไม่ใช่ตอนหมดแรงแล้ว", "The most fatiguing lifts deserve your fresh energy, not your leftovers"),
        gain: 3,
        priority: "low",
      };
      // ต้องทำให้หมวดลำดับท่าดีขึ้นจริง ไม่ใช่แค่ลำดับเปลี่ยนไป
      //
      // เช็คด้วยคะแนนรวมอย่างเดียวไม่พอ: การปัดเศษทำให้บางครั้งขยับจาก 97% เป็น 100%
      // แล้วคะแนนรวมเท่าเดิม ระบบก็จะเสนอ "จัดลำดับใหม่" ค้างไว้ทุกวันตลอดไป
      // ทั้งที่ตารางเรียงดีอยู่แล้ว (เคสจริง: ตาราง 99 คะแนนโดนเสนอจัดลำดับ 2 วันรวด)
      if (sameOrderAfterSort(data, day)) continue;
      const after = predictedAnalysis(data, candidateRec);
      if (after.breakdown.order <= analysis.breakdown.order) continue;
      candidateRec.gain = Math.max(1, after.execution - analysis.execution);
      recs.push(candidateRec);
    }

  // 5) วันที่ยาวเกินเพดาน — ย้ายท่าท้ายวันไปวันพักที่ติดกัน
  //
  // เดิมมีแต่ blockedInsight บอกว่า "วันนี้ยาวเกิน" แล้วจบ ผู้ใช้ต้องไปแก้เอง
  // ทั้งที่ splitDay ทำงานได้อยู่แล้ว · เสนอเฉพาะเมื่อมีวันว่างจริงเท่านั้น
  // ไม่งั้นจะกลายเป็นการยัดท่าเข้าไปในวันที่ผู้ใช้ฝึกอยู่แล้วจนยาวขึ้นอีก
  for (const d of analysis.dayLoads.filter((x) => x.overSets || x.overTime)) {
    if (recs.length >= MAX_RECOMMENDATIONS) break;
    // แบ่งได้ก็ต่อเมื่อทั้งสองฝั่งเหลืออย่างน้อย 2 ท่า — วันที่มีท่าเดียวโดดๆ ไม่ใช่ตารางที่ใช้ได้
    const canSplit = exercisesForDay(data, d.day).length >= 4;
    const freeDays = canSplit ? activeDays(data).filter((day) => exercisesForDay(data, day).length === 0) : [];
    // ต้องเหลือวันพักไว้อย่างน้อย 1 วันเสมอ — ตารางที่ฝึกครบ 7 วันไม่พักเลยไม่ใช่ตารางที่ดีขึ้น
    // (เคสจริง: ระบบไล่แบ่งวันจนกินวันพักหมด แล้วเสนอตารางฝึกติดกัน 7 วัน)
    //
    // แบ่งวันไม่ได้ก็ยังต้องมีทางออก ไม่งั้นวันที่ยาวเกินจะค้างอยู่แบบนั้นตลอดไป
    // ทางออกที่ไม่ต้องกินวันพัก: ตัดเซตท้ายวันของท่าที่มีเซตเยอะสุดในวันนั้น
    if (freeDays.length <= 1) {
      const inDay = exercisesForDay(data, d.day)
        .filter((ex) => ex.sets > MIN_SETS_PER_EX)
        .sort((a, b) => b.sets - a.sets)[0];
      if (!inDay) continue;
      const trim: Recommendation = {
        id: mkId(),
        kind: "reduceSets",
        exerciseId: inDay.id,
        title: t(`ลดเซต ${inDay.name}`, `Cut a set from ${inDay.name}`),
        detail: t(
          `ลดเหลือ ${inDay.sets - 1} เซต — วัน${slotName(data, d.day)}จะจบในเวลาที่ตั้งไว้`,
          `Down to ${inDay.sets - 1} sets — ${slotName(data, d.day)} then fits the time you have`,
        ),
        reason: d.overTime
          ? t(`วัน${slotName(data, d.day)}ใช้เวลาราว ${d.minutes} นาที เกินที่ตั้งไว้`, `${slotName(data, d.day)} runs about ${d.minutes} min, over your limit`)
          : t(`วัน${slotName(data, d.day)}มี ${d.sets} เซต เกินเพดาน`, `${slotName(data, d.day)} has ${d.sets} sets, over the cap`),
        gain: 4,
        priority: "medium",
      };
      // เหมือนกรณีลดปริมาณ: วันที่ยาวเกินมากต้องตัดหลายเซตกว่าจะพ้นเพดาน
      // ถ้าบังคับว่าคะแนนต้องขึ้นตั้งแต่ครั้งแรก จะไม่มีคำแนะนำโผล่มาเลยสักครั้ง
      const p = predictedScore(data, trim);
      if (p > analysis.execution || d.overTime || d.overSets) {
        trim.gain = Math.max(1, p - analysis.execution);
        recs.push(trim);
      }
      continue;
    }
    const free = freeDays[0];
    const candidateRec: Recommendation = {
      id: mkId(),
      kind: "splitDay",
      fromDay: d.day,
      toDay: free,
      title: t(`แบ่งวัน${slotName(data, d.day)}ไป${slotName(data, free)}`, `Split ${slotName(data, d.day)} into ${slotName(data, free)}`),
      detail: t(
        `ย้ายท่าท้ายๆ ของวัน${slotName(data, d.day)}ไปวัน${slotName(data, free)}ที่ยังว่าง`,
        `Move the tail end of ${slotName(data, d.day)} onto ${slotName(data, free)}, which is free`,
      ),
      reason: d.overTime
        ? t(`วัน${slotName(data, d.day)}ใช้เวลาราว ${d.minutes} นาที เกินที่ตั้งไว้`, `${slotName(data, d.day)} runs about ${d.minutes} min, over your limit`)
        : t(`วัน${slotName(data, d.day)}มี ${d.sets} เซต เกินเพดาน`, `${slotName(data, d.day)} has ${d.sets} sets, over the cap`),
      gain: 5,
      priority: "medium",
    };
    const predicted = predictedScore(data, candidateRec);
    if (predicted <= analysis.execution) continue;
    candidateRec.gain = predicted - analysis.execution;
    recs.push(candidateRec);
  }

  // นอนไม่พอ -> ตัดคำแนะนำที่เพิ่มภาระออกทั้งหมด (เหตุผลอยู่ใน blockedInsights แล้ว)
  const out = sleep.underRecovered ? recs.filter((r) => r.kind !== "add" && r.kind !== "increaseSets") : recs;
  return out.sort((a, b) => b.gain - a.gain).slice(0, MAX_RECOMMENDATIONS);
}

// จัดลำดับท่าในวันหนึ่งให้ถูกหลัก: compound หนัก -> ปานกลาง -> เจาะจง -> core/น่องปิดท้าย
/** วันนี้เรียงถูกตามหลักอยู่แล้วไหม — ใช้กันไม่ให้เสนอ "จัดลำดับใหม่" ทั้งที่จัดไว้ดีแล้ว */
function sameOrderAfterSort(d: Data, day: DayKey): boolean {
  const before = exercisesForDay(d, day).map((e) => e.id);
  const copy = structuredClone(d);
  reorderDay(copy, day);
  const after = exercisesForDay(copy, day).map((e) => e.id);
  return before.join(",") === after.join(",");
}

export function reorderDay(d: Data, day: DayKey) {
  const rank: Record<FatigueCost, number> = { high: 0, moderate: 1, low: 2 };
  const isFinisher = (ex: Exercise) => muscleMap(ex.name).some((h) => h.m === "core" || h.m === "calves");
  const exs = exercisesForDay(d, day);
  exs
    .sort((a, b) => {
      const fin = (isFinisher(a) ? 1 : 0) - (isFinisher(b) ? 1 : 0);
      return fin || rank[fatigueOf(a)] - rank[fatigueOf(b)];
    })
    .forEach((ex, i) => {
      const target = d.exercises.find((e) => e.id === ex.id);
      if (target) target.order = i;
    });
}

export function applyRecommendation(d: Data, rec: Recommendation) {
  if (rec.kind === "buildProgram" && rec.splitDays) {
    const built = buildFullProgram(d, rec.splitDays);
    for (const ex of built.exercises) {
      d.exercises.push(ex);
      restoreHistory(d, ex); // เคยเล่นท่านี้มาก่อน ประวัติกลับมาด้วย
    }
    for (const [day, label] of Object.entries(built.labels)) d.dayLabels[day as DayKey] = label;
  } else if (rec.kind === "addDay" && rec.day && rec.dayType) {
    const exs = buildDayExercises(d, rec.day, rec.dayType);
    for (const ex of exs) {
      d.exercises.push(ex);
      restoreHistory(d, ex); // ถ้าเคยเล่นท่านี้มาก่อน ประวัติกลับมาด้วย
    }
    if (!d.dayLabels[rec.day]) d.dayLabels[rec.day] = DAY_TYPE_SHORT[rec.dayType];
  } else if (rec.kind === "add" && rec.template?.tpl && rec.day) {
    // ท่าใหม่ต้องต่อท้ายวัน ไม่ใช่แทรกหน้าสุด
    //
    // ให้ order 0 แล้วหวังพึ่ง reorderDay ไม่พอ: เมื่อความล้าเท่ากัน การเรียงเป็นแบบ stable
    // ท่าใหม่จึงค้างอยู่หน้าและดันท่าเดิมถอยไปทีละขั้นทุกครั้งที่เพิ่ม
    // (เคสจริง: เพิ่มท่าขาไป 4 ท่า แล้วสควอทซึ่งหนักสุดไปจบท้ายวัน)
    const tail = exercisesForDay(d, rec.day).length;
    const newEx = exerciseFromTemplate(rec.template.tpl, rec.day, tail, uid() + d.exercises.length);
    newEx.sets = MIN_SETS_PER_EX;
    d.exercises.push(newEx);
    restoreHistory(d, newEx);
    // จัดลำดับใหม่ทั้งวันตามความล้า (หนักก่อน เจาะจงทีหลัง core/น่องปิดท้าย)
    // ถ้าต่อท้ายเสมอ ท่า compound ที่เพิ่มทีหลังจะไปอยู่หลังท่าเจาะจง ซึ่งเล่นจริงแล้วผิด
    reorderDay(d, rec.day);
  } else if (rec.kind === "increaseSets" && rec.exerciseId) {
    const ex = d.exercises.find((e) => e.id === rec.exerciseId);
    // ต้องเพิ่มให้ครบตามจำนวนที่การ์ดเขียนไว้ ไม่งั้นสิ่งที่บอกกับสิ่งที่ทำไม่ตรงกัน
    if (ex && ex.sets < MAX_SETS_PER_EX) ex.sets = Math.min(MAX_SETS_PER_EX, ex.sets + (rec.addSets ?? 1));
  } else if (rec.kind === "reduceSets" && rec.exerciseId) {
    const ex = d.exercises.find((e) => e.id === rec.exerciseId);
    if (ex && ex.sets > MIN_SETS_PER_EX) ex.sets -= 1;
  } else if (rec.kind === "removeExercise" && rec.exerciseId) {
    const ex = d.exercises.find((e) => e.id === rec.exerciseId);
    if (ex) {
      archiveOne(d, ex);
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
    // แบ่งครึ่งวันจริงๆ ไม่ใช่ย้ายทีละท่าจนพ้นเพดานเซต
    //
    // ของเดิมวนย้ายจนกว่า sets <= cap เท่านั้น ซึ่งไม่แก้กรณีที่วันนั้น "ยาวเกินเวลา"
    // ทั้งที่เซตยังไม่เกิน (25 เซตแต่ใช้ 95 นาที) — ลูปไม่ทำงานเลยสักรอบ
    // และเวลาย้ายได้ก็มักได้วันใหม่ที่มีท่าเดียว ซึ่งไม่ใช่ตารางที่ใช้ได้จริง
    const exs = exercisesForDay(d, rec.fromDay);
    if (exs.length >= 2) {
      const half = Math.floor(exs.length / 2);
      for (let i = exs.length - half; i < exs.length; i++) {
        const ex = d.exercises.find((e) => e.id === exs[i].id);
        if (!ex) continue;
        ex.day = rec.toDay;
        ex.order = exercisesForDay(d, rec.toDay).length;
      }
    }
  } else if (rec.kind === "restDay" && rec.fromDay && rec.toDay) {
    for (const ex of d.exercises) if (ex.day === rec.fromDay) ex.day = rec.toDay;
    if (d.dayLabels[rec.fromDay] && !d.dayLabels[rec.toDay]) {
      d.dayLabels[rec.toDay] = d.dayLabels[rec.fromDay];
      d.dayLabels[rec.fromDay] = "";
    }
  } else if (rec.kind === "reorder" && rec.day) {
    reorderDay(d, rec.day);
  }
}

export { PATTERN_TH };
