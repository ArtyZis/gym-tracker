// ส่งโปรแกรมให้ลูกเทรนเป็น "ลิงก์" — โค้ชกดแชร์ทางไลน์ ลูกเทรนกดเปิดแล้วโปรแกรมเข้าแอปเลย
//
// ทำไมไม่ใช้เซิร์ฟเวอร์: โปรแกรมทั้งชุดเล็กมาก (ไม่มีน้ำหนัก/ประวัติอยู่ในนั้น — น้ำหนักเป้าหมาย
// คำนวณจากประวัติของลูกเทรนเอง) จึงยัดลง URL ได้หมด ไม่ต้องมีที่เก็บ ไม่ต้องมีบัญชี
// ลิงก์ไม่มีวันหมดอายุและไม่ต้องพึ่งใครให้บริการต่อ
//
// รูปแบบ (v1) — บรรทัดคั่นด้วย \n, ฟิลด์คั่นด้วย \t แล้ว base64url ทั้งก้อน:
//   บรรทัด 1: "1"                       เวอร์ชัน
//   บรรทัด 2: ชื่อโปรแกรม
//   บรรทัด 3: mon \t Gym Day \t wed \t Leg Day ...   (ชื่อวัน)
//   บรรทัด 4+: name \t day \t type \t sets \t rmin \t rmax \t inc \t unit \t flags \t restSec

import type { DayKey, ExType, Exercise } from "./store";
import { DAYS } from "./store";

export type SharedExercise = Omit<Exercise, "id" | "order">;

export interface SharedProgram {
  title: string;
  exercises: SharedExercise[];
  dayLabels: Partial<Record<DayKey, string>>;
}

const VERSION = "1";
const TYPES: ExType[] = ["weight", "bodyweight", "time"];

// btoa รับได้แค่ไบต์ latin1 — ชื่อท่าภาษาไทยต้องผ่าน UTF-8 ก่อน (แพตเทิร์นเดียวกับโค้ดย้ายข้อมูลเดิม)
const toB64Url = (s: string): string =>
  btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromB64Url = (s: string): string => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4))));
};

export function encodeProgram(p: SharedProgram): string {
  const lines: string[] = [VERSION, p.title.replace(/[\t\n]/g, " ")];

  const labelPairs: string[] = [];
  for (const d of DAYS) {
    const v = p.dayLabels[d];
    if (v) labelPairs.push(d, v.replace(/[\t\n]/g, " "));
  }
  lines.push(labelPairs.join("\t"));

  for (const ex of p.exercises) {
    // flags: a = AMRAP, m = ท่าเครื่อง
    const flags = `${ex.amrap ? "a" : ""}${ex.machine ? "m" : ""}`;
    lines.push(
      [
        ex.name.replace(/[\t\n]/g, " "),
        ex.day,
        String(TYPES.indexOf(ex.type)),
        String(ex.sets),
        String(ex.rmin),
        String(ex.rmax),
        ex.inc == null ? "" : String(ex.inc),
        ex.unit ?? "",
        flags,
        ex.restSec == null ? "" : String(ex.restSec),
      ].join("\t"),
    );
  }
  return toB64Url(lines.join("\n"));
}

export function decodeProgram(code: string): SharedProgram | null {
  try {
    const lines = fromB64Url(code.trim()).split("\n");
    if (lines[0] !== VERSION || lines.length < 4) return null;

    const title = lines[1] || "โปรแกรมจากโค้ช";

    const dayLabels: Partial<Record<DayKey, string>> = {};
    const pairs = lines[2] ? lines[2].split("\t") : [];
    for (let i = 0; i + 1 < pairs.length; i += 2) {
      const d = pairs[i] as DayKey;
      if (DAYS.includes(d) && pairs[i + 1]) dayLabels[d] = pairs[i + 1];
    }

    const exercises: SharedExercise[] = [];
    for (const line of lines.slice(3)) {
      if (!line.trim()) continue;
      const f = line.split("\t");
      const day = f[1] as DayKey;
      const type = TYPES[Number(f[2])];
      const sets = Number(f[3]);
      const rmin = Number(f[4]);
      const rmax = Number(f[5]);
      // ข้ามแถวที่พังแทนที่จะทิ้งทั้งโปรแกรม — ลิงก์ที่โดนตัดกลางทางยังใช้ได้บางส่วน
      if (!f[0] || !DAYS.includes(day) || !type || !Number.isFinite(sets)) continue;
      const flags = f[8] ?? "";
      exercises.push({
        name: f[0],
        day,
        type,
        sets: Math.max(1, Math.min(20, sets)),
        rmin: Number.isFinite(rmin) ? rmin : 8,
        rmax: Number.isFinite(rmax) ? rmax : 12,
        ...(f[6] ? { inc: Number(f[6]) } : {}),
        ...(f[7] ? { unit: f[7] } : {}),
        ...(flags.includes("a") ? { amrap: true } : {}),
        ...(flags.includes("m") ? { machine: true } : {}),
        ...(f[9] ? { restSec: Number(f[9]) } : {}),
      });
    }
    return exercises.length ? { title, exercises, dayLabels } : null;
  } catch {
    return null;
  }
}

export const PROGRAM_PARAM = "p";

export function buildShareUrl(code: string): string {
  const base = location.origin + location.pathname.replace(/index\.html$/, "");
  return `${base}?${PROGRAM_PARAM}=${code}`;
}

// อ่านโค้ดจาก URL ตอนเปิดแอป (รองรับทั้ง ?p= และ #p= เผื่อแอปแชทตัด query ทิ้ง)
export function readProgramFromUrl(): string | null {
  const q = new URLSearchParams(location.search).get(PROGRAM_PARAM);
  if (q) return q;
  const h = location.hash.startsWith("#") ? new URLSearchParams(location.hash.slice(1)).get(PROGRAM_PARAM) : null;
  return h || null;
}

// เอาโค้ดออกจาก URL หลังจัดการเสร็จ ไม่งั้นรีเฟรชแล้วเด้งถามซ้ำ
export function clearProgramFromUrl(): void {
  const url = new URL(location.href);
  url.searchParams.delete(PROGRAM_PARAM);
  if (url.hash.includes(PROGRAM_PARAM + "=")) url.hash = "";
  history.replaceState(null, "", url.pathname + url.search + url.hash);
}
