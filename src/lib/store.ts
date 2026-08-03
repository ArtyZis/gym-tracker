// Data model + localStorage persistence (key: gymtracker_v1)

import type { EquipTag, Experience, Goal, InjuryKey } from "./muscles";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type ExType = "weight" | "bodyweight" | "time";

export interface Exercise {
  id: string;
  name: string;
  day: DayKey;
  type: ExType;
  sets: number;
  rmin: number;
  rmax: number;
  inc?: number;
  unit?: string;
  amrap?: boolean;
  order?: number;
  restSec?: number; // เวลาพักที่ผู้ใช้ตั้งเองต่อท่า — ไม่มี = ใช้ค่าที่ระบบแนะนำ
  machine?: boolean; // ท่าเครื่อง (machine/cable) — น้ำหนักรวมทั้งเครื่อง ไม่ใช่ต่อข้าง
  // น้ำหนักบาร์เฉพาะท่านี้ — ไม่มี = ใช้ settings.barWeight
  // จำเป็นเพราะบาร์ไม่ได้หนักเท่ากันทุกอัน: EZ bar ~10 กก. · บาร์สั้น ~15 · Smith machine แล้วแต่เครื่อง
  barKg?: number;
  // เป้าเริ่มต้นที่ระบบประเมินให้ (ฟีเจอร์ตั้งน้ำหนักเริ่มต้น) — เป็น "ค่าประมาณ" ไม่ใช่ของจริง
  // เก็บแยกจาก history โดยตั้งใจ ถ้าเขียนปนกันกราฟความก้าวหน้าและ forecast จะเพี้ยน
  seededTarget?: number;
}

export interface SetLog {
  weight?: number;
  reps?: number;
  duration?: number;
  // เวลาที่ติ๊กเซตนี้ (epoch ms) — ใช้คำนวณว่าเล่นมานานแค่ไหนแล้วในเซสชันนี้
  // optional เพราะข้อมูลเก่าไม่มี: ไม่มี = นาฬิกาเซสชันจะไม่แสดงสำหรับเซสชันนั้น (ไม่พัง ไม่เดา)
  at?: number;
}

export interface SessionLog {
  date: string; // YYYY-MM-DD
  sets: (SetLog | null)[];
}

export interface BwEntry {
  date: string;
  kg: number;
}

// ผลสแกนร่างกาย (Inbody / Accuniq ฯลฯ) — เพิ่มภายหลัง, optional ทั้งหมดเพื่อไม่กระทบข้อมูลเก่า
export interface BodyScan {
  date: string;
  weightKg?: number;
  fatPct?: number;
  muscleKg?: number; // มวลกล้ามเนื้อลาย (SMM)
}

export interface Settings {
  autoRest: boolean;
  restDefault: number;
  barWeight: number;
  heightCm?: number;
  soundEnabled?: boolean; // เสียงตอนกดติ๊ก/ครบท่า/PR — undefined = เปิด (default)
  sessionClock?: boolean; // แถบนาฬิกาเซสชันในแท็บวันนี้ — undefined = เปิดถ้าตั้งช่องเวลาไว้
  tierSOnly?: boolean; // โหมดเสนอเฉพาะท่า tier S — undefined = ปิด (เห็นทุกท่าเหมือนเดิม)
  smartRest?: boolean; // ใช้เวลาพักที่ระบบแนะนำต่อท่า — undefined = เปิด (default)
  accent?: string; // สีธีม (accent) — undefined = cyan #4fd8ff (ค่าเดิมของแบรนด์)
  showCoachNotes?: boolean; // โน้ตโค้ชในการ์ดท่า — undefined = แสดง (default)
  // วันเริ่มใช้แอป (ISO) — ใช้นับช่วงทดลองรุ่น pro เท่านั้น
  // จงใจเก็บรวมในก้อนข้อมูลเดียวกับประวัติ: ใครล้างเพื่อรีเซ็ตช่วงทดลอง ประวัติฝึกจะหายไปด้วย
  startedAt?: string;
}

// โปรแกรมที่บันทึกไว้ (routine) — สลับ/ลบได้
export interface SavedProgram {
  id: string;
  name: string;
  savedAt: string;
  exercises: Exercise[];
  dayLabels: Record<DayKey, string>;
}

// ท่าที่ใช้แทนชั่วคราวเฉพาะวันนี้ (เช่น ปกติเล่นที่บ้าน วันนี้ไปยิม)
export interface SwapTarget {
  name: string;
  type: ExType;
  sets: number;
  rmin: number;
  rmax: number;
  unit?: string;
  inc?: number;
  machine?: boolean;
  amrap?: boolean;
}

export interface Swaps {
  date: string; // ใช้ได้เฉพาะวันนี้ — วันเปลี่ยนแล้วกลับไปท่าเดิมอัตโนมัติ
  map: Record<string, SwapTarget>; // key = id ท่าเดิม (สลับแทนท่านั้น)
  extras?: SwapTarget[]; // ท่าที่เพิ่มเข้ามาเล่นวันนี้เพิ่มเติม (ไม่ได้แทนท่าไหน)
}

// ── โปรไฟล์และข้อจำกัดของผู้ใช้ (ทั้งหมด optional — ไม่กรอกก็ใช้แอปได้ปกติ) ──
// ใช้ตอนวิเคราะห์เพื่อให้คำแนะนำ "ทำได้จริง" ไม่ใช่แค่ถูกทฤษฎี
export interface Profile {
  experience?: Experience; // กำหนดช่วงเป้าหมายเซตต่อสัปดาห์
  goal?: Goal;
  injuries?: InjuryKey[]; // ใช้กรองท่าที่ไม่ควรทำ
  nutrition?: NutritionTarget; // เป้าแคลอรี/โปรตีนต่อวัน
  gainKgPerWeek?: number; // อัตราเพิ่มน้ำหนักเป้าหมาย (กก./สัปดาห์) — ไม่ตั้ง = 0.25-0.4 ตามค่าเริ่มต้น
}

export interface Constraints {
  sessionTimeCapMinutes?: number; // ห้ามเสนอเพิ่มท่าถ้าวันนั้นจะยาวเกินนี้ (ค่ากลาง ใช้เมื่อวันนั้นไม่ได้ตั้ง dayWindows)
  maxSetsPerSession?: number;
}

// ช่องเวลาที่เข้ายิมได้จริงของวันนั้น — "HH:MM" 24 ชม.
// bufferMin = เวลาที่ไม่ได้ใช้ยกจริง (เดินทางในยิม เปลี่ยนชุด รอเครื่อง) ไม่ใส่ = 10 นาที
// ต้องหักออก ไม่งั้นระบบคิดว่ามีเวลายกเต็มช่อง แล้วเสนอเพิ่มท่าจนทำจริงไม่ทัน
export interface DayWindow {
  start: string;
  end: string;
  bufferMin?: number;
}

// บันทึกการนอน — ตัวเลขเดียวต่อวัน ไม่ต้องกรอกเวลาเข้า/ออก ให้กรอกง่ายที่สุดเพื่อให้ทำจริงต่อเนื่อง
export interface SleepEntry {
  date: string; // YYYY-MM-DD
  hours: number;
}

// วันนี้กินถึงเป้าไหม — ติ๊กวันละครั้ง จงใจไม่ทำระบบบันทึกรายมื้อเพราะไม่มีใครทำต่อเนื่องได้จริง
export interface NutritionDay {
  date: string; // YYYY-MM-DD
  hit: boolean;
}

// เป้าโภชนาการ
export interface NutritionTarget {
  kcal: number;
  protein: number;
}

export interface Data {
  dayLabels: Record<DayKey, string>;
  exercises: Exercise[];
  history: Record<string, SessionLog[]>;
  bodyweight: BwEntry[];
  bodyScans: BodyScan[];
  settings: Settings;
  savedPrograms?: SavedProgram[]; // โปรแกรมที่ผู้ใช้บันทึกไว้
  historyArchive?: Record<string, SessionLog[]>; // ประวัติเก็บตามชื่อท่า — กู้กลับได้เมื่อท่าชื่อเดิมกลับมา
  swaps?: Swaps; // สลับท่าชั่วคราวเฉพาะวันนี้
  profile?: Profile;
  constraints?: Constraints;
  // อุปกรณ์ที่ใช้ได้ "แยกรายวัน" — ไม่ใช่ระดับโปรไฟล์
  // คนจำนวนมากเข้ายิมบางวันและเล่นที่บ้านบางวัน เก็บรวมเป็นค่าเดียวจะเสนอท่าที่ทำไม่ได้
  // ไม่ได้ตั้ง = ถือว่ามีครบทุกอย่าง (ไม่บล็อกอะไรเลย ปลอดภัยกว่าเดาว่าไม่มี)
  dayEquip?: Partial<Record<DayKey, EquipTag[]>>;
  // ช่องเวลาที่เข้ายิมได้จริงแยกรายวัน — เวลาว่างแต่ละวันไม่เท่ากันเพราะตารางงาน/เรียนต่างกัน
  // ใช้แทนเพดานเวลาค่ากลางจาก constraints เฉพาะวันที่ตั้งไว้ · ไม่ตั้ง = ใช้ค่ากลางเดิม
  dayWindows?: Partial<Record<DayKey, DayWindow>>;
  // บันทึกการนอน (ฟีเจอร์ 6) — คอขวดการฟื้นตัวที่สำคัญกว่าปริมาณการฝึก
  sleepLog?: SleepEntry[];
  // วันที่กินถึงเป้าหรือไม่ (ฟีเจอร์ 5) — ติ๊กวันละครั้ง ไม่ใช่บันทึกรายมื้อ
  nutritionLog?: NutritionDay[];
  // ภาระแรกของวัน ("HH:MM" เช่นเข้าเรียน 08:00) — ใช้คำนวณเวลาที่ควรเข้านอนคืนก่อนหน้า
  dayFirstCommitment?: Partial<Record<DayKey, string>>;
  // โน้ตประจำวัน — key = วันที่ (YYYY-MM-DD) ผูกกับวันจริงไม่ใช่ช่องวัน
  // จึงย้อนดูได้ถูกต้องทั้งโหมดสัปดาห์และโหมดรอบ และไม่เพี้ยนเวลาย้าย/สลับวัน
  dayNotes?: Record<string, string>;
  // ตารางแบบรอบ (loop) — หมุนเวียนเป็นรอบแทนที่จะผูกกับวันในสัปดาห์
  // len = ความยาวรอบ (2-7 วัน) · anchor = วันที่ (YYYY-MM-DD) ที่เป็น "วันที่ 1" ของรอบ
  // ไม่มี = โหมดสัปดาห์ปกติ (ค่าเดิมของระบบ) ดูรายละเอียดที่ lib/loop.ts
  loop?: { len: number; anchor: string };
}

export const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_TH: Record<DayKey, string> = {
  mon: "จันทร์",
  tue: "อังคาร",
  wed: "พุธ",
  thu: "พฤหัส",
  fri: "ศุกร์",
  sat: "เสาร์",
  sun: "อาทิตย์",
};

export const DAY_TH_SHORT: Record<DayKey, string> = {
  mon: "จ",
  tue: "อ",
  wed: "พ",
  thu: "พฤ",
  fri: "ศ",
  sat: "ส",
  sun: "อา",
};

// getDay() ของ JS เริ่มที่อาทิตย์
export const JS_DAYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const uid = () => "ex_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const todayStr = () => new Date().toISOString().slice(0, 10);

const DEFAULT_DAY_LABELS: Record<DayKey, string> = {
  mon: "Gym Day",
  tue: "",
  wed: "Leg Day",
  thu: "Push Day",
  fri: "",
  sat: "Pull Day",
  sun: "",
};

const DEFAULT_EXERCISES: Omit<Exercise, "id" | "order">[] = [
  { name: "Barbell Squat", day: "mon", type: "weight", sets: 3, rmin: 6, rmax: 8, inc: 5, unit: "kg" },
  { name: "Incline DB Press", day: "mon", type: "weight", sets: 4, rmin: 6, rmax: 8, inc: 2.5, unit: "kg/ข้าง" },
  { name: "Overhead Press (DB)", day: "mon", type: "weight", sets: 3, rmin: 6, rmax: 8, inc: 2.5, unit: "kg/ข้าง" },
  { name: "Lat Pulldown", day: "mon", type: "weight", sets: 3, rmin: 8, rmax: 12, inc: 5, unit: "kg", machine: true },
  { name: "Seated Cable Row", day: "mon", type: "weight", sets: 3, rmin: 8, rmax: 12, inc: 5, unit: "kg", machine: true },
  { name: "Barbell Hip Thrust", day: "mon", type: "weight", sets: 3, rmin: 10, rmax: 12, inc: 5, unit: "kg" },
  { name: "Lateral Raise", day: "mon", type: "weight", sets: 3, rmin: 12, rmax: 15, inc: 1, unit: "kg/ข้าง" },
  { name: "Face Pull", day: "mon", type: "weight", sets: 2, rmin: 15, rmax: 20, inc: 2.5, unit: "kg" },
  { name: "Overhead Tricep Extension", day: "mon", type: "weight", sets: 3, rmin: 10, rmax: 12, inc: 1, unit: "kg" },
  { name: "Incline DB Curl", day: "mon", type: "weight", sets: 3, rmin: 10, rmax: 12, inc: 1, unit: "kg/ข้าง" },
  { name: "Wrist Curl (DB)", day: "mon", type: "weight", sets: 3, rmin: 15, rmax: 20, inc: 1, unit: "kg/ข้าง" },
  { name: "Reverse Wrist Curl (DB)", day: "mon", type: "weight", sets: 3, rmin: 15, rmax: 20, inc: 1, unit: "kg/ข้าง" },
  { name: "Pronation Curl", day: "mon", type: "weight", sets: 3, rmin: 10, rmax: 12, inc: 1, unit: "kg" },
  { name: "Bulgarian Split Squat", day: "wed", type: "bodyweight", sets: 3, rmin: 12, rmax: 15 },
  { name: "Glute Bridge", day: "wed", type: "bodyweight", sets: 3, rmin: 15, rmax: 20 },
  { name: "Calf Raise", day: "wed", type: "bodyweight", sets: 4, rmin: 15, rmax: 25 },
  { name: "Wide Push-up", day: "thu", type: "bodyweight", sets: 4, rmin: 1, rmax: 999, amrap: true },
  { name: "Decline Push-up", day: "thu", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true },
  { name: "Pike Push-up", day: "thu", type: "bodyweight", sets: 3, rmin: 10, rmax: 15 },
  { name: "Plank", day: "thu", type: "time", sets: 3, rmin: 30, rmax: 45, unit: "วิ" },
  { name: "Wide Grip Pull-up", day: "sat", type: "bodyweight", sets: 4, rmin: 1, rmax: 999, amrap: true },
  { name: "Chin-up", day: "sat", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true },
  { name: "Australian Row", day: "sat", type: "bodyweight", sets: 3, rmin: 12, rmax: 15 },
  { name: "Towel Pull-up", day: "sat", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true },
  { name: "Wrist Isometric Hold", day: "sat", type: "time", sets: 3, rmin: 20, rmax: 30, unit: "วิ" },
  { name: "Hanging Knee Raise", day: "sat", type: "bodyweight", sets: 3, rmin: 15, rmax: 15 },
];

export function createDefault(): Data {
  return {
    dayLabels: { ...DEFAULT_DAY_LABELS },
    exercises: DEFAULT_EXERCISES.map((e, i) => ({ ...e, id: uid() + i, order: i })),
    history: {},
    bodyweight: [],
    bodyScans: [],
    settings: { autoRest: true, restDefault: 90, barWeight: 20 },
  };
}

// ล้างทุกอย่างให้ว่างเปล่าจริง (ไม่มีท่า ไม่มีประวัติ) — เก็บเฉพาะ savedPrograms + settings
// ใช้ Object.assign(d, createEmpty()) เพื่อไม่แตะ savedPrograms/settings
export function createEmpty(): Partial<Data> {
  return {
    dayLabels: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
    exercises: [],
    history: {},
    historyArchive: {},
    bodyweight: [],
    bodyScans: [],
  };
}

const STORAGE_KEY = "gymtracker_v1";

// plain object จริง ไม่ใช่ array/null (typeof null === "object" ต้องกันด้วย)
const isObj = (v: any): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);

// ══════════ ตัวตรวจรายการย่อย ══════════
//
// normalizeData เดิมตรวจแค่ "ก้อนใหญ่" (exercises เป็น array ไหม) แต่ไม่ตรวจของข้างใน
// ซึ่งเปิดช่องให้ payload ที่จงใจทำพังเล่นงานได้จริง — ทดสอบแล้วเจอ:
//   exercises: [null]        -> อ่าน .day ของ null แล้ว crash ทั้งแอป
//   swaps: "PWNED"           -> Object.entries(undefined) แล้ว crash
//   sets: 1e9                -> เรนเดอร์จุดบอกเซตพันล้านจุด เบราว์เซอร์ค้าง (DoS)
//   sets: "9"                -> บวกแบบสตริงได้ "09" ตัวเลขทั้งหน้าเพี้ยน
//   dayLabels.mon: {}        -> React โยน "Objects are not valid as a React child"
//
// ทางเข้าของข้อมูลนอกระบบมี 2 ทาง: localStorage (เสียเองหรือถูกแก้) และโค้ดย้ายข้อมูล
// ที่ผู้ใช้รับมาจากคนอื่น ทางหลังคือทางที่คนอื่นส่ง payload มาให้เราได้โดยตรง
//
// หลัก: ทิ้งเฉพาะ "รายการที่พัง" ไม่ทิ้งทั้งก้อน — ข้อมูลที่ถูกต้องต้องรอดเสมอ

const MAX_EXERCISES = 500; // มากกว่านี้ไม่ใช่การใช้งานจริง แต่ทำให้ทุกหน้าช้า
const MAX_NAME_LEN = 200;
const MAX_SETS = 50;
const MAX_REPS = 9999;

const num = (v: any, lo: number, hi: number, dflt: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt;

const str = (v: any, max = MAX_NAME_LEN): string => (typeof v === "string" ? v.slice(0, max) : "");

const VALID_TYPES: ExType[] = ["weight", "bodyweight", "time"];

// คืน null ถ้าซ่อมไม่ได้ (ผู้เรียกต้องกรองทิ้ง)
function cleanExercise(e: any): Exercise | null {
  if (!isObj(e)) return null;
  const id = str(e.id, 120);
  const name = str(e.name);
  if (!id || !name) return null; // ไม่มี id = จับคู่ประวัติไม่ได้ · ไม่มีชื่อ = แสดงผลไม่ได้
  if (!DAYS.includes(e.day)) return null;
  const out: Exercise = {
    id,
    name,
    day: e.day,
    type: VALID_TYPES.includes(e.type) ? e.type : "weight",
    sets: Math.round(num(e.sets, 1, MAX_SETS, 3)),
    rmin: Math.round(num(e.rmin, 0, MAX_REPS, 8)),
    rmax: Math.round(num(e.rmax, 0, MAX_REPS, 12)),
  };
  if (e.inc !== undefined) out.inc = num(e.inc, 0.01, 1000, 2.5);
  if (e.unit !== undefined) out.unit = str(e.unit, 20);
  if (e.amrap !== undefined) out.amrap = !!e.amrap;
  if (e.order !== undefined) out.order = num(e.order, -1e6, 1e6, 0);
  if (e.restSec !== undefined) out.restSec = Math.round(num(e.restSec, 0, 3600, 90));
  if (e.machine !== undefined) out.machine = !!e.machine;
  if (e.barKg !== undefined) out.barKg = num(e.barKg, 0, 500, 20);
  if (e.seededTarget !== undefined) out.seededTarget = num(e.seededTarget, 0, 100000, 0);
  return out;
}

const cleanExercises = (arr: any): Exercise[] =>
  (Array.isArray(arr) ? arr : []).slice(0, MAX_EXERCISES).map(cleanExercise).filter((x): x is Exercise => x !== null);

function cleanSetLog(s: any): SetLog | null {
  if (s === null || s === undefined) return null; // เซตที่ยังไม่ติ๊ก — ค่าปกติ ไม่ใช่ของพัง
  if (!isObj(s)) return null;
  const out: SetLog = {};
  if (s.weight !== undefined) out.weight = num(s.weight, 0, 100000, 0);
  if (s.reps !== undefined) out.reps = Math.round(num(s.reps, 0, MAX_REPS, 0));
  if (s.duration !== undefined) out.duration = Math.round(num(s.duration, 0, 86400, 0));
  if (s.at !== undefined) out.at = num(s.at, 0, 4e12, 0);
  return out;
}

const cleanSessions = (arr: any): SessionLog[] =>
  (Array.isArray(arr) ? arr : [])
    .filter((s: any) => isObj(s) && typeof s.date === "string" && Array.isArray(s.sets))
    .map((s: any) => ({ date: s.date.slice(0, 32), sets: s.sets.slice(0, MAX_SETS).map(cleanSetLog) }));

// ชื่อวันต้องเป็นสตริงเสมอ — ถ้าเป็น object แล้วเอาไปวางใน JSX React จะโยนทิ้งทั้งหน้า
function cleanDayLabels(m: any): Record<DayKey, string> {
  const out = { ...DEFAULT_DAY_LABELS };
  if (!isObj(m)) return out;
  for (const k of DAYS) if (typeof m[k] === "string") out[k] = m[k].slice(0, 60);
  return out;
}

function cleanHistoryMap(m: any): Record<string, SessionLog[]> {
  if (!isObj(m)) return {};
  const out: Record<string, SessionLog[]> = {};
  for (const k of Object.keys(m)) {
    // กัน prototype pollution ผ่านคีย์ที่ตั้งชื่อพิเศษ (JSON.parse ไม่ตั้ง proto ให้ แต่ Object.assign ทำได้)
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    const sessions = cleanSessions(m[k]);
    if (sessions.length) out[k] = sessions;
  }
  return out;
}

// เติมค่า default + ตรวจ "ชนิด" ของทุกฟิลด์ — จุดเดียวที่ข้อมูลนอกระบบ (localStorage + โค้ดกู้คืน) ผ่านเข้ามา
// ต้องแกร่งพอกัน payload ที่จงใจทำ shape พัง (เช่น exercises เป็น string) ไม่ให้แอป crash/ข้อมูลเสีย
// ห้ามทำให้ข้อมูลเดิมที่ถูกต้องหาย
export function normalizeData(d: any): Data | null {
  // exercises ต้องเป็น array จริง — "PWNED" (string) หรือค่าอื่น = ปฏิเสธทั้งก้อน
  if (!isObj(d) || !Array.isArray(d.exercises)) return null;
  if (!isObj(d.settings)) d.settings = { autoRest: true, restDefault: 90, barWeight: 20 };
  if (typeof d.settings.restDefault !== "number") d.settings.restDefault = 90;
  if (typeof d.settings.barWeight !== "number") d.settings.barWeight = 20;
  d.settings.restDefault = num(d.settings.restDefault, 5, 3600, 90);
  d.settings.barWeight = num(d.settings.barWeight, 0, 500, 20);
  if (d.settings.accent !== undefined && typeof d.settings.accent !== "string") d.settings.accent = undefined;

  // ตรวจ "ของข้างใน" ไม่ใช่แค่ชนิดของก้อน — ดูเหตุผลที่ cleanExercise
  d.exercises = cleanExercises(d.exercises);
  d.history = cleanHistoryMap(d.history);
  d.historyArchive = cleanHistoryMap(d.historyArchive);

  d.bodyweight = (Array.isArray(d.bodyweight) ? d.bodyweight : [])
    .filter((e: any) => isObj(e) && typeof e.date === "string" && typeof e.kg === "number" && Number.isFinite(e.kg))
    .map((e: any) => ({ date: e.date.slice(0, 32), kg: num(e.kg, 0, 1000, 0) }));

  d.bodyScans = (Array.isArray(d.bodyScans) ? d.bodyScans : [])
    .filter((e: any) => isObj(e) && typeof e.date === "string")
    .map((e: any) => {
      const o: BodyScan = { date: e.date.slice(0, 32) };
      if (typeof e.weightKg === "number") o.weightKg = num(e.weightKg, 0, 1000, 0);
      if (typeof e.fatPct === "number") o.fatPct = num(e.fatPct, 0, 100, 0);
      if (typeof e.muscleKg === "number") o.muscleKg = num(e.muscleKg, 0, 1000, 0);
      return o;
    });

  d.savedPrograms = (Array.isArray(d.savedPrograms) ? d.savedPrograms : [])
    .filter((p: any) => isObj(p) && typeof p.id === "string")
    .slice(0, 100)
    .map((p: any) => ({
      id: str(p.id, 120),
      name: str(p.name) || "โปรแกรม",
      savedAt: str(p.savedAt, 40),
      exercises: cleanExercises(p.exercises),
      dayLabels: cleanDayLabels(p.dayLabels),
    }));

  d.dayLabels = cleanDayLabels(d.dayLabels);

  // swaps ต้องเป็น object ที่มี map เป็น object จริง ไม่งั้น activeSwapMap จะพังตอนอ่าน
  if (d.swaps !== undefined) {
    if (!isObj(d.swaps) || typeof d.swaps.date !== "string" || !isObj(d.swaps.map)) d.swaps = undefined;
    else if (d.swaps.extras !== undefined && !Array.isArray(d.swaps.extras)) d.swaps.extras = undefined;
  }
  // ฟิลด์ใหม่ที่เพิ่มทีหลัง — ชนิดผิดให้ทิ้งไป ระบบจะกลับไปใช้ค่า default เอง
  if (d.profile !== undefined && !isObj(d.profile)) d.profile = undefined;
  if (d.profile && !Array.isArray(d.profile.injuries)) d.profile.injuries = undefined;
  if (d.constraints !== undefined && !isObj(d.constraints)) d.constraints = undefined;
  if (d.dayEquip !== undefined && !isObj(d.dayEquip)) d.dayEquip = undefined;
  else if (d.dayEquip)
    for (const k of Object.keys(d.dayEquip)) if (!Array.isArray(d.dayEquip[k])) delete d.dayEquip[k];
  // ช่องเวลารายวัน — ต้องมี start/end เป็นสตริง "HH:MM" ทั้งคู่ ไม่งั้นทิ้งวันนั้นไป (กลับไปใช้ค่ากลาง)
  if (d.dayWindows !== undefined && !isObj(d.dayWindows)) d.dayWindows = undefined;
  else if (d.dayWindows)
    for (const k of Object.keys(d.dayWindows)) {
      const w = d.dayWindows[k];
      if (!isObj(w) || typeof w.start !== "string" || typeof w.end !== "string") delete d.dayWindows[k];
    }
  // บันทึกการนอน / การกิน — ทิ้งแถวที่ shape ผิด ไม่ทิ้งทั้งก้อน (ข้อมูลที่ถูกต้องต้องรอด)
  if (!Array.isArray(d.sleepLog)) d.sleepLog = undefined;
  else d.sleepLog = d.sleepLog.filter((s: any) => isObj(s) && typeof s.date === "string" && typeof s.hours === "number");
  if (!Array.isArray(d.nutritionLog)) d.nutritionLog = undefined;
  else d.nutritionLog = d.nutritionLog.filter((n: any) => isObj(n) && typeof n.date === "string" && typeof n.hit === "boolean");
  if (d.dayFirstCommitment !== undefined && !isObj(d.dayFirstCommitment)) d.dayFirstCommitment = undefined;
  else if (d.dayFirstCommitment)
    for (const k of Object.keys(d.dayFirstCommitment)) if (typeof d.dayFirstCommitment[k] !== "string") delete d.dayFirstCommitment[k];
  // โน้ตรายวัน — คีย์ต้องเป็นวันที่ ค่าต้องเป็นสตริง (จำกัดความยาวกัน payload ยักษ์)
  if (!isObj(d.dayNotes)) d.dayNotes = undefined;
  else {
    const notes: Record<string, string> = {};
    for (const k of Object.keys(d.dayNotes)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      if (typeof d.dayNotes[k] === "string" && d.dayNotes[k].trim()) notes[k.slice(0, 32)] = d.dayNotes[k].slice(0, 2000);
    }
    d.dayNotes = Object.keys(notes).length ? notes : undefined;
  }
  // ตารางแบบรอบ — ค่าพัง/ช่วงผิดถือว่าไม่ได้เปิดใช้ กลับไปโหมดสัปดาห์ปกติ (ปลอดภัยกว่าเดา)
  if (d.loop !== undefined) {
    const ok =
      isObj(d.loop) &&
      typeof d.loop.len === "number" &&
      d.loop.len >= 2 &&
      d.loop.len <= 7 &&
      typeof d.loop.anchor === "string" &&
      Number.isFinite(Date.parse(d.loop.anchor));
    if (!ok) d.loop = undefined;
  }
  if (d.profile && !isObj(d.profile.nutrition)) d.profile.nutrition = undefined;
  if (d.profile?.nutrition && (typeof d.profile.nutrition.kcal !== "number" || typeof d.profile.nutrition.protein !== "number"))
    d.profile.nutrition = undefined;
  // วันเปลี่ยนแล้ว — เก็บบันทึกของท่าที่สลับไว้ แล้วกลับไปใช้ท่าตามโปรแกรมเดิม
  if (d.swaps && d.swaps.date !== todayStr()) {
    archiveSwapLogs(d as Data);
    d.swaps = undefined;
  }
  return d as Data;
}

// ถอดรหัส "โค้ดย้ายข้อมูล" ที่รับจากคนอื่น — ต้องผ่าน normalizeData เสมอ ไม่ assign ดิบ
// คืน null ถ้าถอดไม่ได้/ชนิดผิด (โค้ดเรียกต้องเช็ค null แล้วแจ้งผู้ใช้)
export function decodeTransfer(code: string): Data | null {
  try {
    const c = code.trim();
    if (!c || c.length > 5_000_000) return null; // กัน payload ยักษ์ที่หน่วงเบราว์เซอร์
    return normalizeData(JSON.parse(decodeURIComponent(escape(atob(c)))));
  } catch {
    return null;
  }
}

export const store = {
  save(data: Data): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
  load(): Data | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalizeData(JSON.parse(raw));
    } catch {
      return null;
    }
  },
  works(): boolean {
    try {
      const k = "__t" + Date.now();
      localStorage.setItem(k, "1");
      const ok = localStorage.getItem(k) === "1";
      localStorage.removeItem(k);
      return ok;
    } catch {
      return false;
    }
  },
};

export const exercisesForDay = (data: Data, day: DayKey): Exercise[] =>
  data.exercises.filter((e) => e.day === day).sort((a, b) => (a.order || 0) - (b.order || 0));

export function repTargetText(ex: Exercise): string {
  return ex.type === "time"
    ? `${ex.rmin}-${ex.rmax} วิ`
    : ex.type === "bodyweight" && ex.amrap
      ? "ทำให้สุด"
      : `${ex.rmin}-${ex.rmax} ครั้ง`;
}

// ── ประวัติเก็บตามชื่อท่า (archive) — กู้กลับได้เมื่อท่าชื่อเดิมกลับมา ──

export const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

// รวม session สองชุด: session วันเดียวกันเก็บอันที่มีเซตครบกว่า
function mergeSessions(a: SessionLog[], b: SessionLog[]): SessionLog[] {
  const byDate = new Map<string, SessionLog>();
  for (const s of [...a, ...b]) {
    const prev = byDate.get(s.date);
    const cnt = (x: SessionLog) => x.sets.filter(Boolean).length;
    if (!prev || cnt(s) >= cnt(prev)) byDate.set(s.date, s);
  }
  return [...byDate.values()].sort((x, y) => x.date.localeCompare(y.date));
}

// เก็บประวัติของท่าปัจจุบันทั้งหมดเข้า archive (เรียกก่อนสลับ/แทนที่โปรแกรม)
export function archiveHistory(d: Data) {
  if (!d.historyArchive) d.historyArchive = {};
  for (const ex of d.exercises) {
    const logs = d.history[ex.id];
    if (logs?.length) {
      const key = normName(ex.name);
      d.historyArchive[key] = mergeSessions(d.historyArchive[key] || [], logs);
    }
  }
  archiveSwapLogs(d);
}

// เก็บประวัติของท่าเดียวเข้า archive (เรียกก่อนลบท่า — log กู้กลับได้)
export function archiveOne(d: Data, ex: Exercise) {
  const logs = d.history[ex.id];
  if (!logs?.length) return;
  if (!d.historyArchive) d.historyArchive = {};
  const key = normName(ex.name);
  d.historyArchive[key] = mergeSessions(d.historyArchive[key] || [], logs);
}

// ดึงประวัติจาก archive มาผูกกับท่า (ถ้าท่ายังไม่มีประวัติในรอบนี้)
export function restoreHistory(d: Data, ex: Exercise) {
  const arch = d.historyArchive?.[normName(ex.name)];
  if (arch?.length && !d.history[ex.id]?.length) d.history[ex.id] = structuredClone(arch);
}

// ── สลับท่าชั่วคราวเฉพาะวันนี้ ──

// id ของท่าที่สลับ — แยกจากท่าเดิม เพื่อให้บันทึกไม่ปนกัน (เช่น Push-up กับ Bench Press)
export const swapIdFor = (origId: string, name: string) => origId + "~" + normName(name).replace(/\s+/g, "_");

export function activeSwapMap(data: Data): Record<string, SwapTarget> {
  return data.swaps && data.swaps.date === todayStr() ? data.swaps.map : {};
}

export type EffectiveExercise = Exercise & { origId: string; swapped: boolean; extra?: boolean };

// id ของท่าที่เพิ่มเข้ามาเล่นวันนี้ (แยกบันทึกจากท่าในโปรแกรม)
export const extraIdFor = (name: string) => "x~" + normName(name).replace(/\s+/g, "_");

export function activeExtras(data: Data): SwapTarget[] {
  return data.swaps && data.swaps.date === todayStr() ? (data.swaps.extras ?? []) : [];
}

// ท่าที่ใช้จริงในวันนั้น — วันนี้จะผ่านการสลับ/เพิ่มชั่วคราว, วันอื่นเป็นท่าตามโปรแกรม
export function effectiveExercisesForDay(data: Data, day: DayKey): EffectiveExercise[] {
  const isToday = day === JS_DAYS[new Date().getDay()];
  const map = isToday ? activeSwapMap(data) : {};
  const list: EffectiveExercise[] = exercisesForDay(data, day).map((ex) => {
    const t = map[ex.id];
    return t
      ? ({ ...ex, ...t, id: swapIdFor(ex.id, t.name), origId: ex.id, swapped: true } as EffectiveExercise)
      : ({ ...ex, origId: ex.id, swapped: false } as EffectiveExercise);
  });

  if (isToday) {
    activeExtras(data).forEach((t, i) => {
      const id = extraIdFor(t.name);
      list.push({
        id,
        name: t.name,
        day,
        type: t.type,
        sets: t.sets,
        rmin: t.rmin,
        rmax: t.rmax,
        unit: t.unit,
        inc: t.inc,
        machine: t.machine,
        amrap: t.amrap,
        order: 1000 + i,
        origId: id,
        swapped: false,
        extra: true,
      });
    });
  }
  return list;
}

// เพิ่มท่าเข้ามาเล่นวันนี้ (เช่น ดึงท่าขาจากวันขามาทำเพิ่ม)
export function addExtra(d: Data, target: SwapTarget) {
  if (!d.swaps || d.swaps.date !== todayStr()) d.swaps = { date: todayStr(), map: {}, extras: [] };
  if (!d.swaps.extras) d.swaps.extras = [];
  if (d.swaps.extras.some((t) => normName(t.name) === normName(target.name))) return;
  d.swaps.extras.push(target);
  const id = extraIdFor(target.name);
  const arch = d.historyArchive?.[normName(target.name)];
  if (arch?.length && !d.history[id]?.length) d.history[id] = structuredClone(arch);
}

export function removeExtra(d: Data, name: string) {
  if (d.swaps?.date === todayStr() && d.swaps.extras)
    d.swaps.extras = d.swaps.extras.filter((t) => normName(t.name) !== normName(name));
}

// ตั้งท่าแทนสำหรับวันนี้ (ดึงประวัติของท่านั้นกลับมาถ้าเคยทำ)
export function setSwap(d: Data, origId: string, target: SwapTarget) {
  if (!d.swaps || d.swaps.date !== todayStr()) d.swaps = { date: todayStr(), map: {} };
  d.swaps.map[origId] = target;
  const sid = swapIdFor(origId, target.name);
  const arch = d.historyArchive?.[normName(target.name)];
  if (arch?.length && !d.history[sid]?.length) d.history[sid] = structuredClone(arch);
}

export function clearSwap(d: Data, origId: string) {
  if (d.swaps?.date === todayStr()) delete d.swaps.map[origId];
}

// เก็บบันทึกของท่าที่สลับเข้า archive ตามชื่อท่าจริง (เรียกตอนวันเปลี่ยน/สลับโปรแกรม)
export function archiveSwapLogs(d: Data) {
  if (!d.swaps) return;
  if (!d.historyArchive) d.historyArchive = {};
  const keep = (name: string, logs?: SessionLog[]) => {
    if (!logs?.length) return;
    const key = normName(name);
    d.historyArchive![key] = mergeSessions(d.historyArchive![key] || [], logs);
  };
  for (const [origId, t] of Object.entries(d.swaps.map)) keep(t.name, d.history[swapIdFor(origId, t.name)]);
  for (const t of d.swaps.extras ?? []) keep(t.name, d.history[extraIdFor(t.name)]);
}

// แทนที่โปรแกรมทั้งหมดโดยเก็บประวัติไว้ (archive แล้ว restore ตามชื่อ)
export function applyProgram(d: Data, exercises: Omit<Exercise, "id" | "order">[], labels?: Partial<Record<DayKey, string>>) {
  archiveHistory(d);
  d.history = {};
  d.exercises = [];
  const orderByDay: Partial<Record<DayKey, number>> = {};
  exercises.forEach((ex, i) => {
    orderByDay[ex.day] ??= 0;
    const newEx: Exercise = { ...ex, id: uid() + i, order: orderByDay[ex.day]! };
    orderByDay[ex.day]!++;
    d.exercises.push(newEx);
    restoreHistory(d, newEx);
  });
  if (labels) for (const day of Object.keys(labels) as DayKey[]) if (labels[day]) d.dayLabels[day] = labels[day]!;
}
