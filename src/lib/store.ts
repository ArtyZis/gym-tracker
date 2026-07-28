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
}

export interface SetLog {
  weight?: number;
  reps?: number;
  duration?: number;
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
}

export interface Constraints {
  sessionTimeCapMinutes?: number; // ห้ามเสนอเพิ่มท่าถ้าวันนั้นจะยาวเกินนี้
  maxSetsPerSession?: number;
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

// เติมค่า default + ตรวจ "ชนิด" ของทุกฟิลด์ — จุดเดียวที่ข้อมูลนอกระบบ (localStorage + โค้ดกู้คืน) ผ่านเข้ามา
// ต้องแกร่งพอกัน payload ที่จงใจทำ shape พัง (เช่น exercises เป็น string) ไม่ให้แอป crash/ข้อมูลเสีย
// ห้ามทำให้ข้อมูลเดิมที่ถูกต้องหาย
export function normalizeData(d: any): Data | null {
  // exercises ต้องเป็น array จริง — "PWNED" (string) หรือค่าอื่น = ปฏิเสธทั้งก้อน
  if (!isObj(d) || !Array.isArray(d.exercises)) return null;
  if (!isObj(d.settings)) d.settings = { autoRest: true, restDefault: 90, barWeight: 20 };
  if (typeof d.settings.restDefault !== "number") d.settings.restDefault = 90;
  if (typeof d.settings.barWeight !== "number") d.settings.barWeight = 20;
  // containers ต้องตรงชนิด ไม่งั้น .filter/.map/Object.values จะพังตอน render
  if (!isObj(d.history)) d.history = {};
  else for (const k of Object.keys(d.history)) if (!Array.isArray(d.history[k])) delete d.history[k];
  if (!Array.isArray(d.bodyweight)) d.bodyweight = [];
  if (!Array.isArray(d.bodyScans)) d.bodyScans = [];
  if (!Array.isArray(d.savedPrograms)) d.savedPrograms = [];
  if (!isObj(d.historyArchive)) d.historyArchive = {};
  if (!isObj(d.dayLabels)) d.dayLabels = { ...DEFAULT_DAY_LABELS };
  // ฟิลด์ใหม่ที่เพิ่มทีหลัง — ชนิดผิดให้ทิ้งไป ระบบจะกลับไปใช้ค่า default เอง
  if (d.profile !== undefined && !isObj(d.profile)) d.profile = undefined;
  if (d.profile && !Array.isArray(d.profile.injuries)) d.profile.injuries = undefined;
  if (d.constraints !== undefined && !isObj(d.constraints)) d.constraints = undefined;
  if (d.dayEquip !== undefined && !isObj(d.dayEquip)) d.dayEquip = undefined;
  else if (d.dayEquip)
    for (const k of Object.keys(d.dayEquip)) if (!Array.isArray(d.dayEquip[k])) delete d.dayEquip[k];
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
