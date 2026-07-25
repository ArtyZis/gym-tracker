// ทะเบียนลูกเทรน (รุ่น Coach เท่านั้น) — ลูกเทรนแต่ละคนมีข้อมูลก้อน Data ของตัวเองแยกกัน
//
// จงใจใช้ shape `Data` เดิมทุกอย่าง ทุกหน้าจอ/ตรรกะเดิม (progression, analyzer, streak,
// forecast) จึงทำงานกับลูกเทรนทุกคนได้ทันทีโดยไม่ต้องแก้อะไรเลย
//
// เก็บใน localStorage ล้วน ไม่ต้องมีเซิร์ฟเวอร์: เทรนเนอร์ใช้เครื่องตัวเองที่ยิม
// ได้ครบทุกฟีเจอร์แม้เน็ตไม่มี (ห้องเวทใต้ดินสัญญาณมักแย่) — ย้ายเครื่องใช้ปุ่ม
// "ย้ายข้อมูลข้ามเครื่อง" ในแท็บจัดการเหมือนเดิม

import type { Data } from "./store";
import { createDefault, normalizeData, uid } from "./store";

const ROSTER_KEY = "gymtracker_coach_roster_v1";
const DATA_PREFIX = "gymtracker_coach_data_";
const PERSONAL_KEY = "gymtracker_v1"; // ข้อมูลรุ่นส่วนตัว — ยกมาเป็นคนแรกให้ตอนเปิดครั้งแรก

export interface Profile {
  id: string;
  name: string;
  note?: string; // เป้าหมาย/โน้ตสั้นๆ เช่น "ลดไขมัน", "เตรียมแข่ง"
  createdAt: string;
}

export interface Roster {
  profiles: Profile[];
  activeId: string | null;
}

function readRoster(): Roster {
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (!raw) return { profiles: [], activeId: null };
    const r = JSON.parse(raw);
    if (!r || !Array.isArray(r.profiles)) return { profiles: [], activeId: null };
    return { profiles: r.profiles, activeId: r.activeId ?? null };
  } catch {
    return { profiles: [], activeId: null };
  }
}

function writeRoster(r: Roster): void {
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(r));
  } catch {
    /* พื้นที่เต็ม/โหมดส่วนตัว — แอปยังใช้ต่อได้ แค่ไม่บันทึก */
  }
}

export const getRoster = (): Roster => readRoster();

export function loadProfileData(id: string): Data {
  try {
    const raw = localStorage.getItem(DATA_PREFIX + id);
    if (raw) return normalizeData(JSON.parse(raw)) ?? createDefault();
  } catch {
    /* อ่านไม่ได้ = เริ่มใหม่ ดีกว่าแอปพัง */
  }
  return createDefault();
}

export function saveProfileData(id: string, data: Data): boolean {
  try {
    localStorage.setItem(DATA_PREFIX + id, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// เปิดแอปครั้งแรก: ยังไม่มีใครในทะเบียน → สร้างคนแรกให้
// ถ้าเครื่องนี้เคยใช้รุ่นส่วนตัวมาก่อน ยกข้อมูลเดิมมาเป็นคนแรกเลย (ไม่ทิ้งของเก่า
// และไม่แตะคีย์เดิม — คัดลอกอย่างเดียว รุ่นส่วนตัวยังเปิดใช้ได้ปกติ)
export function ensureActiveProfile(): string {
  const r = readRoster();
  if (r.activeId && r.profiles.some((p) => p.id === r.activeId)) return r.activeId;
  if (r.profiles.length) {
    const id = r.profiles[0].id;
    writeRoster({ ...r, activeId: id });
    return id;
  }

  const id = uid();
  const profile: Profile = { id, name: "ตัวฉันเอง", createdAt: new Date().toISOString() };
  try {
    const legacy = localStorage.getItem(PERSONAL_KEY);
    if (legacy) localStorage.setItem(DATA_PREFIX + id, legacy);
  } catch {
    /* ไม่มีของเก่าก็เริ่มเปล่า */
  }
  writeRoster({ profiles: [profile], activeId: id });
  return id;
}

export function addProfile(name: string, note?: string): Profile {
  const r = readRoster();
  const p: Profile = {
    id: uid(),
    name: name.trim() || "ลูกเทรนใหม่",
    note: note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  r.profiles.push(p);
  writeRoster(r);
  return p;
}

export function renameProfile(id: string, name: string, note?: string): void {
  const r = readRoster();
  const p = r.profiles.find((x) => x.id === id);
  if (!p) return;
  p.name = name.trim() || p.name;
  p.note = note?.trim() || undefined;
  writeRoster(r);
}

// ลบลูกเทรน — ลบประวัติของคนนั้นถาวรด้วย (หน้า UI ต้องถามยืนยันก่อนเสมอ)
export function deleteProfile(id: string): void {
  const r = readRoster();
  r.profiles = r.profiles.filter((p) => p.id !== id);
  if (r.activeId === id) r.activeId = r.profiles[0]?.id ?? null;
  writeRoster(r);
  try {
    localStorage.removeItem(DATA_PREFIX + id);
  } catch {
    /* ข้าม */
  }
}

export function setActiveProfileId(id: string): void {
  writeRoster({ ...readRoster(), activeId: id });
}

// วันฝึกล่าสุดของลูกเทรนคนนั้น — ใช้โชว์ในทะเบียนว่าใครหายไปนานแล้ว
export function lastTrainedOf(id: string): string | null {
  const d = loadProfileData(id);
  let latest: string | null = null;
  for (const sessions of Object.values(d.history))
    for (const s of sessions) if (s.sets.some(Boolean) && (!latest || s.date > latest)) latest = s.date;
  return latest;
}

// "3 วันก่อน" / "วันนี้" — อ่านง่ายกว่าวันที่ดิบตอนกวาดตาดูทะเบียน
export function daysAgoText(dateStr: string | null): string {
  if (!dateStr) return "ยังไม่เคยฝึก";
  const then = new Date(dateStr + "T00:00:00").getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - then) / 86400000);
  if (days <= 0) return "ฝึกวันนี้";
  if (days === 1) return "เมื่อวาน";
  if (days < 7) return `${days} วันก่อน`;
  if (days < 30) return `${Math.floor(days / 7)} สัปดาห์ก่อน`;
  return `${Math.floor(days / 30)} เดือนก่อน`;
}
