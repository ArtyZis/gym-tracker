// วิเคราะห์สมดุลกล้ามเนื้อแบบ rule-based (ไม่ใช้ AI)

import type { Data, DayKey, ExType } from "./store";
import { DAYS, DAY_TH, archiveOne, exercisesForDay, normName, restoreHistory, uid } from "./store";

export type MuscleKey =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "glutes_hams"
  | "calves"
  | "core"
  | "forearms";

export const MUSCLE_TH: Record<MuscleKey, string> = {
  chest: "อก",
  back: "หลัง",
  shoulders: "ไหล่",
  biceps: "ไบเซป",
  triceps: "ไตรเซป",
  quads: "ต้นขาหน้า",
  glutes_hams: "สะโพก/หลังขา",
  calves: "น่อง",
  core: "แกนกลาง",
  forearms: "ปลายแขน",
};

const MUSCLE_KEYS = Object.keys(MUSCLE_TH) as MuscleKey[];

export interface MuscleHit {
  m: MuscleKey;
  w: number;
}

// จับคู่ชื่อท่า (อังกฤษ) -> กล้ามเนื้อที่โดน; compound นับกล้ามรองครึ่งเซต
export function muscleMap(name: string): MuscleHit[] {
  const t = name.toLowerCase();
  const hits: MuscleHit[] = [];
  const add = (m: MuscleKey, w: number) => {
    if (!hits.some((h) => h.m === m)) hits.push({ m, w });
  };

  if (/bench|incline.*press|chest|fly|dip|push.?up/.test(t)) {
    add("chest", 1);
    add("triceps", 0.5);
    if (/incline|pike/.test(t)) add("shoulders", 0.5);
  }
  if (/pike.*push/.test(t)) add("shoulders", 1);
  if (/overhead press|shoulder press|ohp|military/.test(t)) {
    add("shoulders", 1);
    add("triceps", 0.5);
  }
  if (/lateral raise|side raise/.test(t)) add("shoulders", 1);
  if (/face pull|rear delt|reverse fly/.test(t)) {
    add("shoulders", 1);
    add("back", 0.5);
  }
  if (/pull.?up|chin.?up|pulldown|row|pullover/.test(t)) {
    add("back", 1);
    add("biceps", 0.5);
    if (/towel/.test(t)) add("forearms", 1);
  }
  if (/curl/.test(t) && !/wrist|leg|pronation/.test(t)) add("biceps", 1);
  if (/tricep|pushdown|extension|skull|diamond/.test(t) && !/leg|back/.test(t)) add("triceps", 1);
  if (/squat|leg press|lunge|split squat|step.?up/.test(t)) {
    add("quads", 1);
    add("glutes_hams", 0.5);
  }
  if (/hip thrust|glute|bridge|rdl|romanian|deadlift|hamstring|leg curl|good morning/.test(t)) add("glutes_hams", 1);
  if (/deadlift/.test(t)) {
    add("back", 0.5);
    add("forearms", 0.5);
  }
  if (/calf/.test(t)) add("calves", 1);
  if (/plank|crunch|sit.?up|knee raise|leg raise|hollow|l.?sit|ab |core|dead bug|russian/.test(t)) add("core", 1);
  if (/wrist|pronation|farmer|grip|hold/.test(t)) add("forearms", 1);

  return hits;
}

export interface SuggestionTemplate {
  name: string;
  muscle: MuscleKey;
  type: ExType;
  sets: number;
  rmin: number;
  rmax: number;
  reason: string;
  needsGym?: boolean;
}

export const SUGGESTION_BANK: Record<MuscleKey, SuggestionTemplate[]> = {
  chest: [
    {
      name: "Cable Fly",
      muscle: "chest",
      type: "weight",
      sets: 3,
      rmin: 12,
      rmax: 15,
      reason: "ยืดอกสุดช่วง เก็บส่วนที่ press ไปไม่ถึง",
      needsGym: true,
    },
    {
      name: "Deficit Push-up",
      muscle: "chest",
      type: "bodyweight",
      sets: 3,
      rmin: 8,
      rmax: 15,
      reason: "เพิ่มช่วงยืดให้ push-up เดิม",
    },
  ],
  back: [
    {
      name: "Chest Supported Row",
      muscle: "back",
      type: "weight",
      sets: 3,
      rmin: 10,
      rmax: 12,
      reason: "สร้างความหนาหลังกลางโดยไม่ล้าหลังล่าง",
      needsGym: true,
    },
    {
      name: "Australian Row",
      muscle: "back",
      type: "bodyweight",
      sets: 3,
      rmin: 12,
      rmax: 15,
      reason: "horizontal pull ที่บ้าน คู่กับ pull-up",
    },
  ],
  shoulders: [
    {
      name: "Lateral Raise",
      muscle: "shoulders",
      type: "weight",
      sets: 3,
      rmin: 12,
      rmax: 15,
      reason: "ไหล่ข้าง = ความกว้าง V-taper",
      needsGym: true,
    },
    {
      name: "Pike Push-up",
      muscle: "shoulders",
      type: "bodyweight",
      sets: 3,
      rmin: 10,
      rmax: 15,
      reason: "ท่าไหล่ bodyweight ที่ดีที่สุด",
    },
  ],
  biceps: [
    {
      name: "Incline DB Curl",
      muscle: "biceps",
      type: "weight",
      sets: 3,
      rmin: 10,
      rmax: 12,
      reason: "stretch-mediated hypertrophy ยืด long head สุด",
      needsGym: true,
    },
    {
      name: "Chin-up",
      muscle: "biceps",
      type: "bodyweight",
      sets: 3,
      rmin: 5,
      rmax: 12,
      reason: "compound ที่โดนไบเซปหนักที่สุด",
    },
  ],
  triceps: [
    {
      name: "Overhead Cable Extension",
      muscle: "triceps",
      type: "weight",
      sets: 3,
      rmin: 10,
      rmax: 12,
      reason: "ยืด long head เหนือหัว โตกว่าท่า pushdown",
      needsGym: true,
    },
    {
      name: "Diamond Push-up",
      muscle: "triceps",
      type: "bodyweight",
      sets: 3,
      rmin: 8,
      rmax: 15,
      reason: "โฟกัสไตรเซปด้วยน้ำหนักตัว",
    },
  ],
  quads: [
    {
      name: "Barbell Squat",
      muscle: "quads",
      type: "weight",
      sets: 3,
      rmin: 6,
      rmax: 8,
      reason: "compound ขาที่คุ้มที่สุดต่อเซต",
      needsGym: true,
    },
    {
      name: "Bulgarian Split Squat",
      muscle: "quads",
      type: "bodyweight",
      sets: 3,
      rmin: 12,
      rmax: 15,
      reason: "ขาเดียวโหลดหนักพอโดยไม่ต้องมีบาร์",
    },
  ],
  glutes_hams: [
    {
      name: "Barbell Hip Thrust",
      muscle: "glutes_hams",
      type: "weight",
      sets: 3,
      rmin: 10,
      rmax: 12,
      reason: "EMG สะโพกสูงสุด โหลดตอนเหยียดตรง",
      needsGym: true,
    },
    {
      name: "Glute Bridge",
      muscle: "glutes_hams",
      type: "bodyweight",
      sets: 3,
      rmin: 15,
      rmax: 20,
      reason: "เวอร์ชันบ้านของ hip thrust",
    },
  ],
  calves: [
    {
      name: "Calf Raise",
      muscle: "calves",
      type: "bodyweight",
      sets: 4,
      rmin: 15,
      rmax: 25,
      reason: "น่องต้องการปริมาณและทำได้ทุกที่",
    },
  ],
  core: [
    {
      name: "Hanging Knee Raise",
      muscle: "core",
      type: "bodyweight",
      sets: 3,
      rmin: 12,
      rmax: 15,
      reason: "core ที่ใช้บาร์ดึงข้อที่มีอยู่",
    },
    {
      name: "Plank",
      muscle: "core",
      type: "time",
      sets: 3,
      rmin: 30,
      rmax: 45,
      reason: "anti-extension พื้นฐานที่ควรมี",
    },
  ],
  forearms: [
    {
      name: "Wrist Curl (DB)",
      muscle: "forearms",
      type: "weight",
      sets: 3,
      rmin: 15,
      rmax: 20,
      reason: "ปลายแขน/กริปที่โปรแกรมมักข้าม",
      needsGym: true,
    },
    {
      name: "Dead Hang",
      muscle: "forearms",
      type: "time",
      sets: 3,
      rmin: 20,
      rmax: 40,
      reason: "กริปด้วยบาร์ดึงข้อ ง่ายและได้ผล",
    },
  ],
};

export type MuscleStatus = "missing" | "low" | "good" | "high";

export interface MuscleStat {
  muscle: MuscleKey;
  sets: number;
  days: number;
  status: MuscleStatus;
}

export interface Analysis {
  stats: MuscleStat[];
  score: number;
  headline: string;
  issues: string[];
  consecutive: number; // จำนวนวันฝึกติดต่อกันมากสุด (วนสัปดาห์)
}

const MAJOR: MuscleKey[] = ["chest", "back", "shoulders", "quads", "glutes_hams"];

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

  for (const day of DAYS)
    for (const ex of exercisesForDay(data, day))
      for (const { m, w } of muscleMap(ex.name)) {
        vol[m] += ex.sets * w;
        daySets[m].add(day);
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

  return { stats, score, headline, issues, consecutive };
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

export type RecKind = "add" | "increaseSets" | "reduceSets" | "addDay" | "moveExercise" | "removeExercise" | "restDay";

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

  // 1) กล้ามที่ไม่มี — เพิ่มท่าใหม่จากคลัง
  for (const s of analysis.stats.filter((s) => s.status === "missing")) {
    const cand = SUGGESTION_BANK[s.muscle].filter((c) => !existing.has(normName(c.name)));
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
    const cand = SUGGESTION_BANK[s.muscle].filter((c) => !existing.has(normName(c.name)));
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
    const cand = SUGGESTION_BANK[s.muscle].filter((c) => !existing.has(normName(c.name)));
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
  } else if (rec.kind === "restDay" && rec.fromDay && rec.toDay) {
    for (const ex of d.exercises) if (ex.day === rec.fromDay) ex.day = rec.toDay;
    if (d.dayLabels[rec.fromDay] && !d.dayLabels[rec.toDay]) {
      d.dayLabels[rec.toDay] = d.dayLabels[rec.fromDay];
      d.dayLabels[rec.fromDay] = "";
    }
  }
}
