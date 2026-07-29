// Engine วิเคราะห์ตารางฝึก — rule-based ล้วน ไม่ใช้ AI
//
// หลักการหลัก: **ตรวจข้อจำกัดก่อน แล้วค่อยหาช่องว่าง ไม่ใช่ทางกลับกัน**
// คำแนะนำทุกข้อต้องผ่านตัวกรอง 4 ด่าน (อุปกรณ์ · เพดานเซสชัน · เพดานกล้ามเนื้อ · ระยะห่างฟื้นตัว)
// ไม่ผ่านด่านใด = ตัดทิ้ง ไม่แสดง แล้วไปบอกใน blockedInsights แทนว่าทำไมทำไม่ได้และแก้ที่ต้นเหตุยังไง
//
// เหตุผล: ระบบที่เสนอ "เพิ่ม Barbell Hip Thrust วันศุกร์" ให้คนที่วันศุกร์เล่นอยู่บ้าน
// ไม่มีบาร์เบล = คำแนะนำที่ใช้ไม่ได้ และทำให้ผู้ใช้เลิกเชื่อระบบทั้งหมด

import type { Data, DayKey, Exercise } from "./store";
import { DAYS, DAY_TH, archiveOne, exercisesForDay, normName, restoreHistory, uid } from "./store";
import type { EquipTag, FatigueCost, MuscleKey, Pattern } from "./muscles";
import {
  HEAVY_HIT_SETS,
  MAJOR_MUSCLES,
  MAX_SETS_PER_MUSCLE_PER_SESSION,
  MINUTES_PER_SET,
  MIN_RECOVERY_HOURS,
  MUSCLE_KEYS,
  MUSCLE_TH,
  PATTERN_TH,
  SMALL_MUSCLES,
} from "./muscles";
import type { ExTemplate } from "./exerciseDB";
import { EXERCISE_DB, TIER_RANK, findTemplate, incFor, isMachineEx, musclesOf, tierOf, unitFor } from "./exerciseDB";
import type { DayType } from "./blueprint";
import {
  DAY_TYPE_SHORT,
  MAX_TRAINING_DAYS,
  OFFERED_SPLITS,
  buildDayExercises,
  buildFullProgram,
  splitDays,
  splitSummary,
} from "./blueprint";
import { canDoWithEquip, getDayEquip, getInjuries, getMaxSetsPerSession, getTimeCap, getVolumeTarget } from "./profile";

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

export function hoursBetween(a: DayKey, b: DayKey): number {
  return (((DAY_IDX[b] - DAY_IDX[a]) % 7) + 7) % 7 * 24;
}

// ต้องดูทั้งสองทิศแล้วใช้ค่าน้อยกว่า — ระยะพักจริงคือช่องว่างที่สั้นที่สุด
export function minGapHours(a: DayKey, b: DayKey): number {
  if (a === b) return 0;
  return Math.min(hoursBetween(a, b), hoursBetween(b, a));
}

export function trainingDays(data: Data): DayKey[] {
  return DAYS.filter((d) => exercisesForDay(data, d).length > 0);
}

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

  // ── ปริมาณต่อกล้ามเนื้อ (fractional) แยกรายวันด้วย ──
  const vol = Object.fromEntries(MUSCLE_KEYS.map((m) => [m, 0])) as Record<MuscleKey, number>;
  const volByDay = Object.fromEntries(
    DAYS.map((d) => [d, Object.fromEntries(MUSCLE_KEYS.map((m) => [m, 0]))]),
  ) as Record<DayKey, Record<MuscleKey, number>>;
  const daysHit = Object.fromEntries(MUSCLE_KEYS.map((m) => [m, new Set<DayKey>()])) as Record<MuscleKey, Set<DayKey>>;
  const patternSets = new Map<Pattern, number>();

  for (const day of DAYS)
    for (const ex of exercisesForDay(data, day)) {
      for (const { m, w } of muscleMap(ex.name)) {
        vol[m] += ex.sets * w;
        volByDay[day][m] += ex.sets * w;
        daysHit[m].add(day);
      }
      const p = patternOf(ex);
      if (p) patternSets.set(p, (patternSets.get(p) ?? 0) + ex.sets);
    }

  // ── ความถี่สูงสุดที่ตารางนี้ทำได้ ──
  // ต้องเว้นอย่างน้อย 48 ชม. ระหว่างวันที่โดนกล้ามเดิมหนัก
  // เข้ายิม จ+ส (ห่าง 48/120) -> ใส่ได้ 2 วัน แต่ถ้า จ+อ (ห่าง 24) -> ได้แค่ 1
  const achievableFreq = maxIndependentDays(train);

  const issues: string[] = [];
  const blockedInsights: BlockedInsight[] = [];

  const stats: MuscleStat[] = MUSCLE_KEYS.map((m) => {
    const sets = Math.round(10 * vol[m]) / 10;
    const days = daysHit[m].size;
    const small = SMALL_MUSCLES.includes(m);
    const status: MuscleStatus =
      sets === 0 ? "missing" : sets < target.warnLow ? "low" : !small && sets > target.warnHigh ? "high" : "good";
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
      blockedBy: blocked ? "วันฝึกห่างกันไม่พอ" : undefined,
    };
  });

  // ── ภาระต่อวัน ──
  const dayLoads: DayLoad[] = train.map((day) => {
    const exs = exercisesForDay(data, day);
    const sets = exs.reduce((a, e) => a + e.sets, 0);
    const minutes = estimateMinutes(exs);
    return { day, sets, exercises: exs.length, minutes, overSets: sets > maxSets, overTime: minutes > timeCap };
  });

  // ── การฟื้นตัว: กล้ามเดิมโดนหนักในวันที่ห่างกัน < 48 ชม. ──
  const recovery: RecoveryConflict[] = [];
  for (let i = 0; i < train.length; i++)
    for (let j = i + 1; j < train.length; j++) {
      const a = train[i];
      const b = train[j];
      const gap = minGapHours(a, b);
      if (gap >= MIN_RECOVERY_HOURS) continue;
      for (const m of MUSCLE_KEYS)
        if (volByDay[a][m] >= HEAVY_HIT_SETS && volByDay[b][m] >= HEAVY_HIT_SETS)
          recovery.push({ muscle: m, a, b, gapHours: gap });
    }

  const patterns: PatternStat[] = [...patternSets.entries()].map(([pattern, sets]) => ({ pattern, sets }));
  const pat = (p: Pattern) => patternSets.get(p) ?? 0;

  // ══ คะแนน 5 หมวด — เก็บทั้ง "ทำได้จริง" และ "เพดานที่ข้อจำกัดอนุญาต" ══

  // 1) ปริมาณ (40%)
  let volHit = 0;
  let volCeil = 0;
  const scored = stats.filter((s) => !SMALL_MUSCLES.includes(s.muscle) || s.sets > 0);
  for (const s of scored) {
    const inRange = s.sets >= target.warnLow && (SMALL_MUSCLES.includes(s.muscle) || s.sets <= target.warnHigh);
    volHit += inRange ? 1 : s.status === "missing" ? 0 : 0.5;
    volCeil += 1; // ปริมาณเพิ่มได้เสมอถ้ามีที่ว่างในตาราง
    if (s.status === "missing" && MAJOR_MUSCLES.includes(s.muscle)) issues.push(`ไม่มีท่าโดน${MUSCLE_TH[s.muscle]}เลย`);
    else if (s.status === "low") issues.push(`${MUSCLE_TH[s.muscle]} ${s.sets} เซต/สัปดาห์ — ต่ำกว่าเป้า ${target.min}`);
    else if (s.status === "high") issues.push(`${MUSCLE_TH[s.muscle]} ${s.sets} เซต/สัปดาห์ — เกินโซนคุ้มค่า`);
  }
  const volumeScore = scored.length ? volHit / scored.length : 1;

  // 2) สมดุลแพทเทิร์น (20%) — สเปค 4.4
  const hPush = pat("horizontal_push");
  const hPull = pat("horizontal_pull");
  const checks: { ok: boolean; msg: string }[] = [
    { ok: hPull >= hPush * 0.8, msg: `ท่าดึงเข้าหาตัว ${hPull} เซต น้อยกว่าท่าดันออกหน้า ${hPush} เซต — เสี่ยงไหล่ห่อ` },
    { ok: pat("vertical_pull") >= 1, msg: "ไม่มีท่าดึงลงล่างเลย (พูลอัพ/พูลดาวน์)" },
    { ok: hPull >= 1, msg: "ไม่มีท่าดึงเข้าหาตัวเลย (โรว์)" },
    { ok: pat("hip_hinge") >= 3, msg: "ท่าบานพับสะโพกน้อยเกิน (RDL/ฮิปทรัส) — หลังขาและก้นจะขาด" },
  ];
  for (const c of checks) if (!c.ok) issues.push(c.msg);
  const patternScore = checks.filter((c) => c.ok).length / checks.length;

  // 3) ความถี่/ฟื้นตัว (20%)
  const consecutive = maxConsecutiveDays(new Set(train));
  let recPenalty = recovery.length * 0.25 + Math.max(0, consecutive - 3) * 0.2;
  for (const r of recovery)
    issues.push(`${MUSCLE_TH[r.muscle]}โดนหนักทั้ง${DAY_TH[r.a]}และ${DAY_TH[r.b]} ห่างแค่ ${r.gapHours} ชม. — ต้องการ ${MIN_RECOVERY_HOURS} ชม.`);
  if (consecutive > 3) issues.push(`ฝึกติดต่อกัน ${consecutive} วันไม่พัก`);
  const recoveryScore = Math.max(0, 1 - recPenalty);
  // เพดาน: ถ้าตารางไม่เอื้อให้กระจาย 2 วัน ก็ไม่ควรหักคะแนนจนต่ำเกินจริง (สเปค 6)
  const recoveryCeil = 1;

  // 4) ไม่มีวันยาวเกินเพดาน (10%)
  const overDays = dayLoads.filter((d) => d.overSets || d.overTime);
  for (const d of overDays)
    issues.push(
      d.overTime
        ? `${DAY_TH[d.day]}ใช้เวลาราว ${d.minutes} นาที เกินที่ตั้งไว้ ${timeCap} นาที`
        : `${DAY_TH[d.day]}มี ${d.sets} เซต เกินเพดาน ${maxSets}`,
    );
  const sessionScore = dayLoads.length ? 1 - overDays.length / dayLoads.length : 1;

  // 5) ลำดับท่า (10%) — ท่าล้าสูงควรมาก่อน, core/calves ปิดท้าย
  const orderScore = scoreOrder(data, train);
  if (orderScore < 1) issues.push("ลำดับท่าในบางวันยังไม่เหมาะ — ท่าหนักควรมาก่อนท่าเจาะจง");

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
        issue: `${lowFreq.map((s) => MUSCLE_TH[s.muscle]).slice(0, 3).join(", ")}โดนแค่ 1 ครั้ง/สัปดาห์`,
        whyCannotFix: `ฝึก ${train.map((d) => DAY_TH[d]).join("+")} — วันที่มีห่างกันไม่ถึง ${MIN_RECOVERY_HOURS} ชม. จึงกระจายเป็น 2 วันไม่ได้`,
        realSolution: "เพิ่มวันฝึกกลางสัปดาห์ หรือรับปริมาณรวมในวันเดียวไปก่อน (ยังได้ผลถ้าไม่เกินเพดานต่อวัน)",
      });
  }

  const headline =
    execution >= ceiling - 2
      ? ceiling >= 95
        ? "ตารางสมดุลดีมาก"
        : "ดีที่สุดเท่าที่ตารางนี้ทำได้แล้ว"
      : execution >= 70
        ? "โดยรวมดี มีจุดเสริมได้"
        : execution >= 50
          ? "ใช้ได้ แต่มีช่องโหว่ควรอุด"
          : "ควรปรับหลายจุด";

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
function maxIndependentDays(train: DayKey[]): number {
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
        if (minGapHours(pick[i], pick[j]) < MIN_RECOVERY_HOURS) {
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
  const timeCap = getTimeCap(data);
  // ความจุจริงของแต่ละวัน = น้อยกว่าระหว่างเพดานเซตกับเพดานเวลา
  const capacity = train.reduce((a, d) => {
    const byTime = Math.floor(timeCap / MINUTES_PER_SET.moderate);
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
      return { ok: false, reason: `ท่านี้ไม่เหมาะกับอาการที่แจ้งไว้`, fix: "ปรึกษาแพทย์/นักกายภาพก่อนกลับมาฝึกท่านี้" };
  }

  // ด่าน 1: อุปกรณ์ — ต้องมีครบทุกชิ้นในวันนั้น
  if (tpl && !canDoWithEquip(tpl.equip, getDayEquip(data, day))) {
    return {
      ok: false,
      reason: `${DAY_TH[day]}ไม่มีอุปกรณ์ที่ท่านี้ต้องใช้`,
      fix: "เลือกท่าที่ใช้อุปกรณ์ที่มี หรือแก้อุปกรณ์ของวันนั้นในแท็บจัดการ",
    };
  }

  // ด่าน 2: เพดานเซสชัน (ทั้งจำนวนเซตและเวลา)
  const curSets = exs.reduce((a, e) => a + e.sets, 0);
  if (curSets + addSets > getMaxSetsPerSession(data))
    return { ok: false, reason: `${DAY_TH[day]}จะเกินเพดาน ${getMaxSetsPerSession(data)} เซต`, fix: "ย้ายบางท่าไปวันอื่นก่อน" };

  const addMin = tpl ? addSets * MINUTES_PER_SET[tpl.fatigue] : addSets * MINUTES_PER_SET.moderate;
  if (estimateMinutes(exs) + addMin > getTimeCap(data))
    return { ok: false, reason: `${DAY_TH[day]}จะใช้เวลาเกิน ${getTimeCap(data)} นาที`, fix: "เพิ่มเวลาต่อครั้ง หรือย้ายบางท่าไปวันอื่น" };

  // ด่าน 3: เพดานกล้ามเนื้อในวันนั้น
  const primary = tpl?.pri[0];
  if (primary) {
    let cur = 0;
    for (const ex of exs) for (const h of muscleMap(ex.name)) if (h.m === primary) cur += ex.sets * h.w;
    if (cur + addSets > MAX_SETS_PER_MUSCLE_PER_SESSION)
      return {
        ok: false,
        reason: `${MUSCLE_TH[primary]}ใน${DAY_TH[day]}จะเกิน ${MAX_SETS_PER_MUSCLE_PER_SESSION} เซต`,
        fix: "กระจายไปวันอื่นแทนการอัดเพิ่มวันเดียว",
      };
  }

  // ด่าน 4: ระยะห่างการฟื้นตัว (ตรวจสองทิศ)
  if (primary) {
    for (const other of trainingDays(data)) {
      if (other === day) continue;
      let load = 0;
      for (const ex of exercisesForDay(data, other)) for (const h of muscleMap(ex.name)) if (h.m === primary) load += ex.sets * h.w;
      if (load < HEAVY_HIT_SETS) continue;
      const gap = minGapHours(other, day);
      if (gap < MIN_RECOVERY_HOURS)
        return {
          ok: false,
          reason: `${MUSCLE_TH[primary]}โดนหนักอยู่แล้วใน${DAY_TH[other]} ห่างกันแค่ ${gap} ชม.`,
          fix: `เว้นอย่างน้อย ${MIN_RECOVERY_HOURS} ชม. — ใส่วันอื่นหรือเพิ่มวันฝึก`,
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

// เรียง tier S ก่อนเสมอ — ท่าคุ้มค่าที่สุดควรถูกเสนอก่อนท่าเสริม
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
      reason: t.tip,
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
  fromDay?: DayKey;
  toDay?: DayKey;
}

function bestEmptyDay(data: Data): DayKey | null {
  const train = new Set(trainingDays(data));
  // ห้ามดันให้ฝึกเกินเพดาน — ตารางที่ไม่มีวันพักพอ ฟื้นตัวไม่ทันและทำจริงไม่ไหว
  if (train.size >= MAX_TRAINING_DAYS) return null;
  const empty = DAYS.filter((d) => !train.has(d));
  if (!empty.length) return null;
  let best = empty[0];
  let bestC = 99;
  for (const d of empty) {
    const next = new Set(train);
    next.add(d);
    const c = maxConsecutiveDays(next);
    if (c < bestC) {
      bestC = c;
      best = d;
    }
  }
  return best;
}

// วันที่เหมาะจะใส่ท่าของกล้ามเนื้อนี้ที่สุด (ผ่านตัวกรองแล้วเท่านั้น)
function findValidDay(data: Data, tpl: ExTemplate, sets: number): { day: DayKey; verdict: FilterVerdict } | null {
  const days = trainingDays(data);
  const primary = tpl.pri[0];

  // วันนั้นฝึกกล้ามเนื้อกลุ่มนี้อยู่แล้วไหม — ใช้ตัดสินว่าท่านี้ "เข้าพวก" กับวันนั้นไหม
  const trainsMuscle = (day: DayKey) =>
    exercisesForDay(data, day).some((ex) => muscleMap(ex.name).some((h) => h.m === primary && h.w >= 1));

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
        title: `สร้างโปรแกรม ${dayCount} วัน/สัปดาห์`,
        detail: `${splitSummary(dayCount)} — ${built.exercises.length} ท่า ${sets} เซต · พัก${restDays.map((d) => DAY_TH[d]).join(" ")}`,
        reason: `ฝึก${days.map((d) => DAY_TH[d]).join(" ")} · กล้ามเนื้อกลุ่มเดิมห่างกันอย่างน้อย 48 ชม. — คาดว่าจะได้ ${predicted} คะแนน`,
        gain: predicted,
        priority: "high",
      });
    }
    return recs.sort((a, b) => b.gain - a.gain).slice(0, 3);
  }

  // 1) วันที่อัดเกิน — แยกไปวันว่าง (แก้ได้ทันทีและกระทบคุณภาพทุกเซตในวันนั้น)
  for (const dl of analysis.dayLoads.filter((d) => d.overSets || d.overTime)) {
    const to = bestEmptyDay(data);
    if (!to) continue;
    recs.push({
      id: mkId(),
      kind: "splitDay",
      fromDay: dl.day,
      toDay: to,
      title: `แยก${DAY_TH[dl.day]}ไปเพิ่มวันฝึก${DAY_TH[to]}`,
      detail: `ย้ายท่าท้ายๆ ไป${DAY_TH[to]} แต่ละเซตจะได้แรงเต็มกว่า`,
      reason: dl.overTime ? `${DAY_TH[dl.day]}ใช้เวลาราว ${dl.minutes} นาที (เพดาน ${getTimeCap(data)})` : `${DAY_TH[dl.day]}มี ${dl.sets} เซต (เพดาน ${getMaxSetsPerSession(data)})`,
      gain: 10,
      priority: "high",
    });
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
    let placed = false;
    const blockedReasons: FilterVerdict[] = [];

    for (const c of cands) {
      if (!c.tpl) continue;
      const spot = findValidDay(data, c.tpl, MIN_SETS_PER_EX);
      if (!spot) {
        const v = checkFilters(data, c.tpl, trainingDays(data)[0] ?? "mon", MIN_SETS_PER_EX);
        blockedReasons.push(v);
        continue;
      }
      recs.push({
        id: mkId(),
        kind: "add",
        template: c,
        day: spot.day,
        title: `เพิ่ม ${c.name}`,
        detail: `ใส่เข้า${DAY_TH[spot.day]} ${MIN_SETS_PER_EX} เซต — ${c.reason}`,
        reason: `${MUSCLE_TH[s.muscle]}ได้ ${s.sets} เซต/สัปดาห์ ต่ำกว่าเป้า ${target.min}`,
        gain: MAJOR_MUSCLES.includes(s.muscle) ? 12 : 5,
        priority: s.status === "missing" && MAJOR_MUSCLES.includes(s.muscle) ? "high" : "medium",
      });
      placed = true;
      break;
    }

    // ไม่มีท่าไหนผ่านตัวกรองเลย — ห้ามผ่อนกฎเพื่อให้มีอะไรแสดง ให้บอกต้นเหตุแทน
    if (!placed && blockedReasons.length) {
      const top = blockedReasons[0];
      const already = analysis.blockedInsights.some((b) => b.issue.includes(MUSCLE_TH[s.muscle]));
      if (!already)
        analysis.blockedInsights.push({
          issue: `${MUSCLE_TH[s.muscle]}ได้ ${s.sets} เซต/สัปดาห์ (เป้า ${target.min}-${target.max})`,
          whyCannotFix: top.reason ?? "ตารางปัจจุบันไม่มีที่ว่างที่เหมาะ",
          realSolution: top.fix ?? "เพิ่มวันฝึก หรือปรับข้อจำกัดในโปรไฟล์",
        });
    }
  }

  // 3) กล้ามเนื้อที่เกินโซนคุ้มค่า — ลดเซตท่าที่ซ้ำซ้อน
  for (const s of analysis.stats.filter((s) => s.status === "high")) {
    if (recs.length >= MAX_RECOMMENDATIONS) break;
    const contributors = data.exercises
      .filter((ex) => muscleMap(ex.name).some((h) => h.m === s.muscle))
      .sort((a, b) => b.sets - a.sets);
    const cut = contributors.find((ex) => ex.sets > MIN_SETS_PER_EX);
    if (!cut) continue;
    recs.push({
      id: mkId(),
      kind: "reduceSets",
      exerciseId: cut.id,
      title: `ลดเซต ${cut.name}`,
      detail: `ลดเหลือ ${cut.sets - 1} เซต — เอาเวลาไปเติมกล้ามเนื้อที่ยังขาดคุ้มกว่า`,
      reason: `${MUSCLE_TH[s.muscle]}ได้ ${s.sets} เซต/สัปดาห์ เกินขอบบน ${target.warnHigh}`,
      gain: 4,
      priority: "low",
    });
  }

  return recs.sort((a, b) => b.gain - a.gain).slice(0, MAX_RECOMMENDATIONS);
}

// จัดลำดับท่าในวันหนึ่งให้ถูกหลัก: compound หนัก -> ปานกลาง -> เจาะจง -> core/น่องปิดท้าย
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
    const newEx = exerciseFromTemplate(rec.template.tpl, rec.day, 0, uid() + d.exercises.length);
    newEx.sets = MIN_SETS_PER_EX;
    d.exercises.push(newEx);
    restoreHistory(d, newEx);
    // จัดลำดับใหม่ทั้งวันตามความล้า (หนักก่อน เจาะจงทีหลัง core/น่องปิดท้าย)
    // ถ้าต่อท้ายเสมอ ท่า compound ที่เพิ่มทีหลังจะไปอยู่หลังท่าเจาะจง ซึ่งเล่นจริงแล้วผิด
    reorderDay(d, rec.day);
  } else if (rec.kind === "increaseSets" && rec.exerciseId) {
    const ex = d.exercises.find((e) => e.id === rec.exerciseId);
    if (ex && ex.sets < MAX_SETS_PER_EX) ex.sets += 1;
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
    const exs = exercisesForDay(d, rec.fromDay);
    const cap = getMaxSetsPerSession(d);
    let sets = exs.reduce((a, e) => a + e.sets, 0);
    for (let i = exs.length - 1; i >= 1 && sets > cap; i--) {
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

export { PATTERN_TH };
