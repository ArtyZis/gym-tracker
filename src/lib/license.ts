// ปลดล็อกรุ่น Coach ด้วยรหัส — ตรวจในเครื่องล้วน ไม่ต้องต่อเซิร์ฟเวอร์
//
// พูดตรงๆ ว่านี่คือ "แรงเสียดทาน" ไม่ใช่ "ป้อมปราการ": รหัสที่ถูกต้องถูกส่งต่อกันได้
// เพราะการตรวจอยู่ฝั่งเครื่องผู้ใช้ทั้งหมด เลือกแบบนี้เพราะช่วงเริ่มต้นที่ลูกค้าไม่กี่สิบราย
// การมีเซิร์ฟเวอร์ + บัญชี + Stripe แลกมาด้วยงานหลายสัปดาห์ก่อนจะรู้ด้วยซ้ำว่ามีคนยอมจ่ายไหม
// ถ้าวันหนึ่งขายได้เยอะจนการแชร์รหัสกินรายได้จริง ค่อยย้ายไปตรวจฝั่งเซิร์ฟเวอร์
//
// รูปแบบ: COACH-AAAA-BBBB-CCCC   (CCCC = checksum ของ AAAABBBB + SALT)
// สร้างรหัสด้วย: node scripts/make-license.mjs [จำนวน]

const KEY_STORE = "gymtracker_coach_license_v1";
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // ตัด I L O 0 1 ออก กันอ่าน/พิมพ์ผิด
const SALT = "artyz-coach-2026";

// รุ่นยังไม่ปลดล็อก: เก็บลูกเทรนได้ 1 คน (พอให้ลองใช้จริงกับตัวเองหรือลูกค้าคนแรก)
export const FREE_PROFILE_LIMIT = 1;

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function checksumOf(body: string): string {
  let out = "";
  for (let i = 0; i < 4; i++) out += ALPHABET[fnv1a(body + SALT + i) % ALPHABET.length];
  return out;
}

export const normalizeKey = (raw: string): string => raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function isValidKey(raw: string): boolean {
  const k = normalizeKey(raw);
  if (!k.startsWith("COACH")) return false;
  const rest = k.slice(5);
  if (rest.length !== 12) return false;
  if ([...rest].some((c) => !ALPHABET.includes(c))) return false;
  return checksumOf(rest.slice(0, 8)) === rest.slice(8);
}

export function savedKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORE);
  } catch {
    return null;
  }
}

export function isUnlocked(): boolean {
  const k = savedKey();
  return !!k && isValidKey(k);
}

export function saveKey(raw: string): boolean {
  if (!isValidKey(raw)) return false;
  try {
    localStorage.setItem(KEY_STORE, normalizeKey(raw));
    return true;
  } catch {
    return false;
  }
}

export function clearKey(): void {
  try {
    localStorage.removeItem(KEY_STORE);
  } catch {
    /* ข้าม */
  }
}

// COACHAAAABBBBCCCC -> COACH-AAAA-BBBB-CCCC
export function formatKey(raw: string): string {
  const n = normalizeKey(raw);
  if (!n.startsWith("COACH") || n.length !== 17) return raw;
  const r = n.slice(5);
  return `COACH-${r.slice(0, 4)}-${r.slice(4, 8)}-${r.slice(8, 12)}`;
}
