// สร้างรหัสปลดล็อกรุ่น Coach — รันเมื่อมีลูกค้าจ่ายเงินเข้ามา
//   node scripts/make-license.mjs        -> 1 รหัส
//   node scripts/make-license.mjs 5      -> 5 รหัส
//
// SALT/ALPHABET ต้องตรงกับ src/lib/license.ts เป๊ะ ไม่งั้นแอปจะไม่รับรหัสที่สร้างจากที่นี่

import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SALT = "artyz-coach-2026";

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

const count = Math.max(1, parseInt(process.argv[2] || "1", 10) || 1);

for (let n = 0; n < count; n++) {
  let body = "";
  for (let i = 0; i < 8; i++) body += ALPHABET[randomInt(ALPHABET.length)];
  const full = body + checksumOf(body);
  console.log(`COACH-${full.slice(0, 4)}-${full.slice(4, 8)}-${full.slice(8, 12)}`);
}
