// สร้างรหัสปลดล็อก RANKFORGE PRO — รันเมื่อมีลูกค้าจ่ายเงินเข้ามา
//
//   node scripts/make-license.mjs 3        -> 1 รหัส อายุ 3 เดือน
//   node scripts/make-license.mjs 12 5     -> 5 รหัส อายุ 1 ปี
//   node scripts/make-license.mjs life 2   -> 2 รหัสตลอดชีพ (รูปแบบเก่า COACH-)
//
// รหัสหมดอายุ "สิ้นเดือน" ที่คำนวณได้เสมอ ลูกค้าจึงได้ใช้ครบเดือนนั้นไม่ว่าจะซื้อวันไหน
// (ซื้อวันที่ 28 ก็ยังได้ทั้งเดือน — เสียเปรียบนิดหน่อยแต่ไม่มีใครมาเถียงเรื่องเศษวัน)
//
// SALT/ALPHABET/EPOCH ต้องตรงกับ src/lib/license.ts เป๊ะ ไม่งั้นแอปจะไม่รับรหัสจากที่นี่

import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SALT = "artyz-coach-2026";
const EPOCH_YEAR = 2026;
const EPOCH_MONTH = 1;

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const checksumOf = (body) => {
  let out = "";
  for (let i = 0; i < 4; i++) out += ALPHABET[fnv1a(body + SALT + i) % ALPHABET.length];
  return out;
};

const encodeExpiry = (year, month) => {
  const n = (year - EPOCH_YEAR) * 12 + (month - EPOCH_MONTH);
  return ALPHABET[Math.floor(n / ALPHABET.length) % ALPHABET.length] + ALPHABET[n % ALPHABET.length];
};

const rand = (n) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

const arg = (process.argv[2] || "3").toLowerCase();
const count = Math.max(1, parseInt(process.argv[3] || "1", 10) || 1);

if (arg === "life" || arg === "lifetime") {
  console.log(`— รหัสตลอดชีพ ${count} ใบ —`);
  for (let n = 0; n < count; n++) {
    const body = rand(8);
    const full = body + checksumOf(body);
    console.log(`COACH-${full.slice(0, 4)}-${full.slice(4, 8)}-${full.slice(8, 12)}`);
  }
} else {
  const months = Math.max(1, parseInt(arg, 10) || 3);
  const now = new Date();
  // เดือนสุดท้ายที่ใช้ได้ = เดือนนี้ + months (นับเดือนนี้เป็นเดือนแรกที่ใช้)
  const end = new Date(now.getFullYear(), now.getMonth() + months, 1);
  const y = end.getFullYear();
  const m = end.getMonth() + 1;

  console.log(`— รหัสอายุ ${months} เดือน ${count} ใบ · ใช้ได้ถึงสิ้นเดือน ${m}/${y} —`);
  for (let n = 0; n < count; n++) {
    const body = encodeExpiry(y, m) + rand(6);
    const full = body + checksumOf(body);
    console.log(`RF-${full.slice(0, 4)}-${full.slice(4, 8)}-${full.slice(8, 12)}`);
  }
}
