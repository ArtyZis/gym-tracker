import { t } from "./i18n";

// ช่องทางซื้อ — ใส่ไลน์ไอดี/เบอร์พร้อมเพย์ของคุณตรงนี้ ว่างไว้ = แสดงข้อความกลางๆ
export const BUY_CONTACT = "";

// ปลดล็อกด้วยรหัส — ตรวจในเครื่องล้วน ไม่ต้องต่อเซิร์ฟเวอร์
//
// พูดตรงๆ ว่านี่คือ "แรงเสียดทาน" ไม่ใช่ "ป้อมปราการ": รหัสที่ถูกต้องถูกส่งต่อกันได้
// เพราะการตรวจอยู่ฝั่งเครื่องผู้ใช้ทั้งหมด เลือกแบบนี้เพราะช่วงเริ่มต้นที่ลูกค้าไม่กี่สิบราย
// การมีเซิร์ฟเวอร์ + บัญชี + Stripe แลกมาด้วยงานหลายสัปดาห์ก่อนจะรู้ด้วยซ้ำว่ามีคนยอมจ่ายไหม
// ถ้าวันหนึ่งขายได้เยอะจนการแชร์รหัสกินรายได้จริง ค่อยย้ายไปตรวจฝั่งเซิร์ฟเวอร์
//
// รหัสมี 2 แบบ อยู่ร่วมกันได้:
//
//   COACH-AAAA-BBBB-CCCC   รหัสเก่า "ตลอดชีพ" — ยังใช้ได้ตลอดไป ห้ามทำให้พัง
//                          คนที่ซื้อตอนขายแบบจ่ายครั้งเดียวต้องไม่โดนตัดสิทธิ์ย้อนหลัง
//   RF-EEXX-XXXX-CCCC      รหัสใหม่แบบมีวันหมดอายุ (EE = เดือนที่หมด)
//
// แยกด้วย prefix แทนที่จะยัดวันหมดอายุลงในรูปแบบเดิม เพราะถ้าใช้รูปแบบเดียวกัน
// รหัสเก่าจะถูกอ่าน 2 ตัวแรกเป็นวันหมดอายุมั่ว แล้วลูกค้าเก่าโดนล็อกทันที
//
// สร้างรหัสด้วย: node scripts/make-license.mjs 3 5   (5 ใบ อายุ 3 เดือน)
//
// ข้อจำกัดที่รู้อยู่: ตรวจในเครื่องล้วน หมุนนาฬิกาเครื่องย้อนหลังก็ใช้ต่อได้
// และรหัสส่งต่อกันได้ — เป็น "แรงเสียดทาน" ไม่ใช่ป้อมปราการ ตามเหตุผลข้างบน

const KEY_STORE = "gymtracker_coach_license_v1";
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // ตัด I L O 0 1 ออก กันอ่าน/พิมพ์ผิด
const SALT = "artyz-coach-2026";

// เดือนฐานของการเข้ารหัสวันหมดอายุ — ห้ามเปลี่ยน ไม่งั้นรหัสที่ออกไปแล้วเลื่อนวันหมดหมด
const EPOCH_YEAR = 2026;
const EPOCH_MONTH = 1;

export interface Plan {
  months: number;
  price: number;
  /** ฟังก์ชันเพราะต้องอ่านภาษา ณ ตอนเรียก ไม่ใช่ตอนโหลดโมดูล */
  label: () => string;
  note?: () => string;
}

// แพ็กเกจขาย — แก้ตรงนี้ที่เดียว มีผลทุกที่ที่โชว์ราคา
//
// ขายเป็นก้อน 3/12 เดือนแทนรายเดือน เพราะระบบไม่มี backend ตัดบัตรอัตโนมัติ
// รายเดือนแปลว่าต้องส่งรหัสใหม่เองทุกเดือนต่อลูกค้าหนึ่งคน ซึ่งพังทันทีที่มีลูกค้าหลายสิบราย
export const PLANS: Plan[] = [
  { months: 3, price: 249, label: () => t("3 เดือน", "3 months"), note: () => t("83฿/เดือน", "฿83/month") },
  { months: 12, price: 690, label: () => t("1 ปี", "1 year"), note: () => t("58฿/เดือน · คุ้มสุด", "฿58/month · best value") },
];

export const PRICE_THB = PLANS[0].price; // ราคาต่ำสุดที่เริ่มต้น — ใช้โชว์ "เริ่มที่ N฿"

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

// เดือนหมดอายุ <-> 2 ตัวอักษร (base31) — 961 เดือน = 80 ปี เหลือเฟือ
export function encodeExpiry(year: number, month: number): string {
  const n = (year - EPOCH_YEAR) * 12 + (month - EPOCH_MONTH);
  return ALPHABET[Math.floor(n / ALPHABET.length) % ALPHABET.length] + ALPHABET[n % ALPHABET.length];
}

function decodeExpiry(code: string): { year: number; month: number } | null {
  const a = ALPHABET.indexOf(code[0]);
  const b = ALPHABET.indexOf(code[1]);
  if (a < 0 || b < 0) return null;
  const n = a * ALPHABET.length + b;
  return { year: EPOCH_YEAR + Math.floor(n / 12), month: EPOCH_MONTH + (n % 12) };
}

const bodyOf = (k: string): string | null => {
  if (k.startsWith("COACH") && k.length === 17) return k.slice(5);
  if (k.startsWith("RF") && k.length === 14) return k.slice(2);
  return null;
};

export function isValidKey(raw: string): boolean {
  const k = normalizeKey(raw);
  const rest = bodyOf(k);
  if (!rest || rest.length !== 12) return false;
  if ([...rest].some((c) => !ALPHABET.includes(c))) return false;
  return checksumOf(rest.slice(0, 8)) === rest.slice(8);
}

/**
 * รหัสที่ถูกยกเลิก — ใส่รหัสตรงนี้แล้ว push ขึ้น main รหัสนั้นจะใช้ไม่ได้ภายใน ~2 นาที
 *
 * นี่คือสิ่งเดียวที่ "ตามรอยรหัสที่หลุด" แล้วทำอะไรต่อได้จริงโดยไม่ต้องมีเซิร์ฟเวอร์
 * ขั้นตอน: `make-license.mjs find <รหัส>` -> รู้ว่าใครปล่อย -> เอารหัสมาใส่ที่นี่ -> push
 *
 * เขียนแบบไม่มีขีด ตัวใหญ่ล้วน (รูปแบบเดียวกับ normalizeKey) และคอมเมนต์กำกับเสมอว่า
 * ยกเลิกเพราะอะไร ไม่งั้นอีกหกเดือนจะไม่มีใครกล้าลบออก
 *
 * ⚠️ ยกเลิกแล้วกระทบทุกคนที่ถือรหัสใบนั้น รวมทั้งลูกค้าตัวจริงที่จ่ายเงินมา
 * ถ้าเขาไม่ได้ตั้งใจปล่อย ให้ออกใบใหม่ให้เขาก่อนแล้วค่อยยกเลิกใบเก่า
 */
export const REVOKED = new Set<string>([
  // "RFAWAADWPSJ2K3", // เลขที่ 3 · ดิว · หลุดในกลุ่มไลน์ 15 ส.ค. 2026 · ออกใบใหม่ให้แล้ว
]);

export type LicenseStatus =
  | { kind: "none" }
  | { kind: "revoked" }
  | { kind: "lifetime" }
  | { kind: "active"; until: string; daysLeft: number }
  | { kind: "expired"; until: string };

/** วันสุดท้ายที่ใช้ได้ = วันสิ้นเดือนที่เข้ารหัสไว้ (ให้ใช้ครบเดือนนั้นเสมอ) */
function endOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

export function licenseStatus(raw = savedKey()): LicenseStatus {
  if (!raw || !isValidKey(raw)) return { kind: "none" };
  const k = normalizeKey(raw);
  // ต้องเช็คก่อนทุกกรณี — รหัสตลอดชีพที่หลุดก็ต้องยกเลิกได้
  if (REVOKED.has(k)) return { kind: "revoked" };
  if (k.startsWith("COACH")) return { kind: "lifetime" }; // รหัสรุ่นจ่ายครั้งเดียว

  const exp = decodeExpiry(k.slice(2, 4));
  if (!exp) return { kind: "none" };
  const end = endOfMonth(exp.year, exp.month);
  const until = `${exp.year}-${String(exp.month).padStart(2, "0")}`;
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86400000);
  return daysLeft > 0 ? { kind: "active", until, daysLeft } : { kind: "expired", until };
}

export function savedKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORE);
  } catch {
    return null;
  }
}

export function isUnlocked(): boolean {
  const s = licenseStatus();
  return s.kind === "lifetime" || s.kind === "active";
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

// COACHAAAABBBBCCCC -> COACH-AAAA-BBBB-CCCC  ·  RFAAAABBBBCCCC -> RF-AAAA-BBBB-CCCC
export function formatKey(raw: string): string {
  const n = normalizeKey(raw);
  const body = bodyOf(n);
  if (!body) return raw;
  const head = n.startsWith("COACH") ? "COACH" : "RF";
  return `${head}-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}
