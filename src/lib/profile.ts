// อ่านโปรไฟล์/ข้อจำกัดของผู้ใช้พร้อมค่า default — จุดเดียวที่ระบบทั้งหมดใช้
//
// ทำไมต้องรวมไว้ที่เดียว: ถ้าปล่อยให้แต่ละไฟล์เดา default เอง วันหนึ่งจะไม่ตรงกัน
// (เช่นหน้าตั้งค่าโชว์ 90 นาที แต่ตัววิเคราะห์ใช้ 60) แล้วหาสาเหตุยากมาก
//
// หลักการเลือก default: **ต้องไม่บล็อกอะไรโดยไม่จำเป็น**
// ผู้ใช้ที่ยังไม่ได้ตั้งค่าอุปกรณ์ ถือว่ามีครบทุกอย่าง ดีกว่าเดาว่าไม่มีแล้วซ่อนคำแนะนำที่เขาทำได้จริง

import type { Data, DayKey } from "./store";
import type { EquipTag, Experience, Goal, InjuryKey, VolumeTarget } from "./muscles";
import {
  DEFAULT_MAX_SETS_PER_SESSION,
  DEFAULT_SESSION_TIME_CAP_MINUTES,
  EQUIP_TH,
  EQUIP_PRESETS,
  VOLUME_TARGETS,
} from "./muscles";

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
  if (hit) return hit.label;
  if (equip.length === 0) return "ยังไม่ได้เลือก";
  return equip.slice(0, 3).map((e) => EQUIP_TH[e]).join(", ") + (equip.length > 3 ? "…" : "");
}
