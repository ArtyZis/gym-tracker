// อ่านโปรไฟล์/ข้อจำกัดของผู้ใช้พร้อมค่า default — จุดเดียวที่ระบบทั้งหมดใช้
//
// ทำไมต้องรวมไว้ที่เดียว: ถ้าปล่อยให้แต่ละไฟล์เดา default เอง วันหนึ่งจะไม่ตรงกัน
// (เช่นหน้าตั้งค่าโชว์ 90 นาที แต่ตัววิเคราะห์ใช้ 60) แล้วหาสาเหตุยากมาก
//
// หลักการเลือก default: **ต้องไม่บล็อกอะไรโดยไม่จำเป็น**
// ผู้ใช้ที่ยังไม่ได้ตั้งค่าอุปกรณ์ ถือว่ามีครบทุกอย่าง ดีกว่าเดาว่าไม่มีแล้วซ่อนคำแนะนำที่เขาทำได้จริง

import type { Data, DayKey } from "./store";
import type { EquipTag, Experience, Goal, InjuryKey, VolumeTarget } from "./muscles";
import { DEFAULT_MAX_SETS_PER_SESSION, DEFAULT_SESSION_TIME_CAP_MINUTES, EQUIP_PRESETS, VOLUME_TARGETS, equipName } from "./muscles";
import { t } from "./i18n";

// อุปกรณ์ครบทุกชนิด — ใช้เป็นค่าเริ่มต้นเมื่อผู้ใช้ยังไม่ได้ระบุ
export const ALL_EQUIP: EquipTag[] = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bench",
  "rack",
  "pullup_bar",
  "bodyweight",
  "band",
  "kettlebell",
  "other",
];

export const getExperience = (d: Data): Experience => d.profile?.experience ?? "intermediate";
export const getGoal = (d: Data): Goal => d.profile?.goal ?? "hypertrophy";
export const getInjuries = (d: Data): InjuryKey[] => d.profile?.injuries ?? [];

export const getTimeCap = (d: Data): number =>
  d.constraints?.sessionTimeCapMinutes ?? DEFAULT_SESSION_TIME_CAP_MINUTES;

const DEFAULT_WINDOW_BUFFER_MIN = 10;

// "HH:MM" -> นาทีนับจากเที่ยงคืน · คืน null ถ้ารูปแบบผิด
export function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = +m[1];
  const min = +m[2];
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// นาทีที่ยกได้จริงในช่องเวลาของวันนั้น (หัก buffer แล้ว) — คืน null ถ้าวันนั้นไม่ได้ตั้งช่องเวลา
export function windowMinutes(d: Data, day: DayKey): number | null {
  const w = d.dayWindows?.[day];
  if (!w) return null;
  const a = parseHHMM(w.start);
  const b = parseHHMM(w.end);
  if (a == null || b == null) return null;
  const span = b > a ? b - a : b + 24 * 60 - a; // ข้ามเที่ยงคืนได้ (เข้ายิมดึก)
  const usable = span - (w.bufferMin ?? DEFAULT_WINDOW_BUFFER_MIN);
  return usable > 0 ? usable : null;
}

// เพดานเวลาของวันนั้น — ใช้ช่องเวลาจริงถ้าตั้งไว้ ไม่ตั้ง = ค่ากลางเดิม (พฤติกรรมเดิมไม่เปลี่ยน)
//
// จำเป็นเพราะเวลาว่างแต่ละวันไม่เท่ากัน: บางวันมีชั่วโมงครึ่ง บางวันมีแค่ 75 นาที
// ถ้าใช้ค่ากลางค่าเดียว ระบบจะเสนอเพิ่มท่าในวันที่จริงๆ ทำไม่ทัน แล้วผู้ใช้ต้องตัดท่าท้ายทิ้งเอง
// ซึ่งท่าท้ายมักเป็นท่าที่ตั้งใจใส่ไว้เติมกล้ามเนื้อที่ยังขาด
export const getDayTimeCap = (d: Data, day: DayKey): number => windowMinutes(d, day) ?? getTimeCap(d);

// ตั้งช่องเวลาไว้บ้างหรือยัง
export const hasSetWindows = (d: Data): boolean => !!d.dayWindows && Object.keys(d.dayWindows).length > 0;

export const getMaxSetsPerSession = (d: Data): number =>
  d.constraints?.maxSetsPerSession ?? DEFAULT_MAX_SETS_PER_SESSION;

export const getVolumeTarget = (d: Data): VolumeTarget => VOLUME_TARGETS[getExperience(d)];

// อุปกรณ์ของวันนั้น — ยังไม่ตั้ง = มีครบ (ไม่บล็อกคำแนะนำใดๆ)
export const getDayEquip = (d: Data, day: DayKey): EquipTag[] => d.dayEquip?.[day] ?? ALL_EQUIP;

// ผู้ใช้ตั้งค่าอุปกรณ์รายวันไว้แล้วหรือยัง — ใช้ตัดสินว่าควรชวนให้ไปตั้งไหม
export const hasSetEquipment = (d: Data): boolean => !!d.dayEquip && Object.keys(d.dayEquip).length > 0;

// วันนั้นทำท่าที่ต้องใช้อุปกรณ์ชุดนี้ได้ไหม — ต้องมี "ครบทุกชิ้น" ถึงจะทำได้
// เช่น Barbell Bench Press ต้องมีทั้ง barbell + bench + rack
export const canDoWithEquip = (need: EquipTag[], have: EquipTag[]): boolean =>
  need.every((e) => have.includes(e));

// ชื่อชุดอุปกรณ์ที่ตรงกับที่ตั้งไว้ (ถ้าไม่ตรงชุดไหนเลย = กำหนดเอง)
export function equipPresetLabel(equip: EquipTag[]): string {
  const sorted = [...equip].sort().join(",");
  const hit = EQUIP_PRESETS.find((p) => [...p.equip].sort().join(",") === sorted);
  if (hit) return hit.label();
  if (equip.length === 0) return t("ยังไม่ได้เลือก", "Not set");
  return equip.slice(0, 3).map(equipName).join(", ") + (equip.length > 3 ? "…" : "");
}
