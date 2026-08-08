// รหัสปลดล็อก — ตรรกะที่ผิดแล้วเสียเงินจริง (ปล่อยคนไม่จ่ายเข้า / ล็อกคนจ่ายแล้วออก)
//
// สิ่งที่ต้องจริงเสมอ:
//   รหัสเก่า COACH- = ตลอดชีพ ห้ามหมดอายุเด็ดขาด (ลูกค้ารุ่นจ่ายครั้งเดียว)
//   รหัสใหม่ RF-    = หมดสิ้นเดือนที่เข้ารหัสไว้ ไม่ก่อนไม่หลัง
//   รหัสมั่ว/แก้ตัวอักษร = ไม่ผ่าน
//
// รัน: .\node_modules\.bin\esbuild.cmd scripts/test-license.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { encodeExpiry, formatKey, isValidKey, licenseStatus, normalizeKey, PLANS } from "../src/lib/license.ts";

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}${extra ? "  << " + extra : ""}`); } };
const eq = (n, got, want) => ok(n, got === want, `ได้ ${JSON.stringify(got)} ต้องการ ${JSON.stringify(want)}`);

// ทำ checksum ชุดเดียวกับในไลบรารี เพื่อสร้างรหัสทดสอบเอง
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SALT = "artyz-coach-2026";
function fnv1a(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
const checksumOf = (b) => { let o = ""; for (let i = 0; i < 4; i++) o += ALPHABET[fnv1a(b + SALT + i) % ALPHABET.length]; return o; };

const lifeKey = () => { const b = "ABCDEFGH"; return "COACH" + b + checksumOf(b); };
const rfKey = (y, m) => { const b = encodeExpiry(y, m) + "PQRSTU"; return "RF" + b + checksumOf(b); };

const now = new Date();
const Y = now.getFullYear(), M = now.getMonth() + 1;
const shift = (n) => { const d = new Date(Y, M - 1 + n, 1); return [d.getFullYear(), d.getMonth() + 1]; };

console.log("═══ 1. รหัสตลอดชีพต้องไม่มีวันหมด ═══");
{
  const k = lifeKey();
  ok("รหัสเก่าผ่านการตรวจ", isValidKey(k));
  eq("สถานะเป็นตลอดชีพ", licenseStatus(k).kind, "lifetime");
  eq("จัดรูปแบบยังเป็น COACH-", formatKey(k).slice(0, 6), "COACH-");
}

console.log("\n═══ 2. รหัสมีอายุ ═══");
{
  const [y, m] = shift(2);
  const k = rfKey(y, m);
  const s = licenseStatus(k);
  ok("รหัสใหม่ผ่านการตรวจ", isValidKey(k));
  eq("ยังไม่หมด = active", s.kind, "active");
  eq("บอกเดือนที่หมดถูก", s.until, `${y}-${String(m).padStart(2, "0")}`);
  ok("เหลือวันมากกว่า 0", s.daysLeft > 0, `ได้ ${s.daysLeft}`);
  eq("จัดรูปแบบเป็น RF-", formatKey(k).slice(0, 3), "RF-");
  eq("ความยาวรหัสรวมขีด", formatKey(k).length, 17);
}
{
  // หมดไปแล้ว 2 เดือน
  const [y, m] = shift(-2);
  const s = licenseStatus(rfKey(y, m));
  eq("เดือนที่ผ่านมาแล้ว = expired", s.kind, "expired");
}
{
  // เดือนปัจจุบัน = ยังใช้ได้ถึงสิ้นเดือน (ห้ามหมดกลางเดือน)
  const s = licenseStatus(rfKey(Y, M));
  eq("เดือนนี้ยังใช้ได้อยู่", s.kind, "active");
}

console.log("\n═══ 3. รหัสมั่วต้องไม่ผ่าน ═══");
{
  ok("รหัสว่าง", !isValidKey(""));
  ok("รหัสสั้นเกิน", !isValidKey("RF-AAAA"));
  ok("prefix ไม่รู้จัก", !isValidKey("XX-AAAA-BBBB-CCCC"));
  ok("มีตัวอักษรนอกชุด (I/O/0/1)", !isValidKey("RF-IOO0-1111-AAAA"));
  const k = rfKey(...shift(2));
  // แก้ตัวอักษรหนึ่งตัวในส่วน body -> checksum ต้องไม่ตรง
  const broken = k.slice(0, 6) + (k[6] === "A" ? "B" : "A") + k.slice(7);
  ok("แก้ตัวอักษรกลางรหัสแล้วใช้ไม่ได้", !isValidKey(broken), broken);
  eq("รหัสมั่ว = สถานะ none", licenseStatus("RF-ZZZZ-ZZZZ-ZZZZ").kind, "none");
  eq("ไม่มีรหัส = none", licenseStatus(null).kind, "none");
}
{
  // เว้นวรรค/พิมพ์เล็ก/ไม่มีขีด ต้องยังใช้ได้ — ลูกค้าพิมพ์มาแบบไหนก็ได้
  const k = rfKey(...shift(2));
  const f = formatKey(k);
  ok("พิมพ์เล็กใช้ได้", isValidKey(f.toLowerCase()));
  ok("มีเว้นวรรคใช้ได้", isValidKey(f.replace(/-/g, " ")));
  ok("ไม่มีขีดใช้ได้", isValidKey(normalizeKey(f)));
}

console.log("\n═══ 4. แพ็กเกจราคา ═══");
{
  ok("มีอย่างน้อย 2 แพ็กเกจ", PLANS.length >= 2);
  ok("ทุกแพ็กเกจมีเดือนและราคาเป็นบวก", PLANS.every((p) => p.months > 0 && p.price > 0));
  const perMonth = PLANS.map((p) => p.price / p.months);
  ok("แพ็กเกจยาวกว่าต้องถูกกว่าต่อเดือน", perMonth[perMonth.length - 1] < perMonth[0], perMonth.map((x) => x.toFixed(0)).join(" vs "));
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
