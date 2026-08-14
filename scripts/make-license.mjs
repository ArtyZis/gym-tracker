// สร้างรหัสปลดล็อก RANKFORGE PRO — รันเมื่อมีลูกค้าจ่ายเงินเข้ามา
//
//   node scripts/make-license.mjs 3 1 "สมชาย line:somchai"   -> 1 รหัส 3 เดือน บันทึกชื่อลูกค้า
//   node scripts/make-license.mjs 12 5                        -> 5 รหัส 1 ปี (ไม่ระบุชื่อ)
//   node scripts/make-license.mjs life 1 "ลูกค้าเก่า"          -> รหัสตลอดชีพ (รูปแบบเดิม COACH-)
//   node scripts/make-license.mjs find RF-AMW4-5C4E-9RAS      -> ค้นว่ารหัสนี้ออกให้ใคร
//   node scripts/make-license.mjs list                        -> ดูรหัสที่ออกไปแล้วทั้งหมด
//
// ── ทุกใบถูกบันทึกลง licenses.log.tsv อัตโนมัติ ──
// ไฟล์นี้ **ไม่เข้า git** (มีชื่อลูกค้า) แต่ห้ามลบ — เป็นบัญชีเดียวที่มี
// ไม่มีมันแปลว่าตอบลูกค้าไม่ได้ว่า "รหัสผมหมดเมื่อไหร่" และรู้ไม่ได้ว่ารหัสที่หลุดเป็นของใคร
//
// ── รหัสหมดอายุสิ้นเดือนเสมอ ──
// ลูกค้าได้ใช้ครบเดือนนั้นไม่ว่าจะซื้อวันไหน (ซื้อวันที่ 28 ก็ยังได้ทั้งเดือน)
//
// ── สิ่งที่รหัสนี้ทำไม่ได้ และอย่าหลอกตัวเอง ──
// SALT อยู่ในไฟล์ JS ที่ส่งให้ลูกค้าทุกคน ใครเปิด DevTools ก็ปั๊มรหัสที่ผ่านการตรวจได้เอง
// checksum จึงเป็นแค่ตัวจับพิมพ์ผิด ไม่ใช่ระบบป้องกัน · และ "ใช้ได้ครั้งเดียว" ทำไม่ได้เลย
// ถ้าไม่มีเซิร์ฟเวอร์ เพราะไม่มีใครจำได้ว่ารหัสถูกใช้ไปแล้ว (localStorage เป็นของเครื่องใครเครื่องมัน)
// เลขลูกค้าที่ฝังไว้จึงมีไว้ "ตามรอยคนที่ปล่อยรหัส" ไม่ใช่กันการปล่อย
//
// SALT/ALPHABET/EPOCH ต้องตรงกับ src/lib/license.ts เป๊ะ ไม่งั้นแอปจะไม่รับรหัสจากที่นี่

import { randomInt } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SALT = "artyz-coach-2026";
const EPOCH_YEAR = 2026;
const EPOCH_MONTH = 1;

const HERE = path.dirname(fileURLToPath(import.meta.url));

// เทสต์ตั้ง RANKFORGE_LICENSE_LOG ชี้ไปไฟล์ชั่วคราว — ห้ามให้เทสต์เขียนลงบัญชีลูกค้าจริง
// (เคยพลาดมาแล้ว: รันเทสต์ทีเดียวมีรหัสขยะโผล่ในบัญชี 8 ใบ ปนกับของลูกค้าจริง)
const LOG = process.env.RANKFORGE_LICENSE_LOG || path.join(HERE, "..", "licenses.log.tsv");

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

/** เลขลูกค้า -> 3 ตัวอักษร (base31) รองรับ 29,790 ราย */
const encodeSerial = (n) => {
  const A = ALPHABET.length;
  return ALPHABET[Math.floor(n / (A * A)) % A] + ALPHABET[Math.floor(n / A) % A] + ALPHABET[n % A];
};

const dash = (full, head) => `${head}-${full.slice(0, 4)}-${full.slice(4, 8)}-${full.slice(8, 12)}`;
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ── บัญชีรหัส ──
const readLog = () => {
  if (!fs.existsSync(LOG)) return [];
  return fs
    .readFileSync(LOG, "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const [serial, key, issued, expires, kind, customer] = l.split("\t");
      return { serial: +serial, key, issued, expires, kind, customer: customer ?? "" };
    });
};

const appendLog = (rows) => {
  const header = "# เลขที่\tรหัส\tวันที่ออก\tหมดอายุ\tชนิด\tลูกค้า\n";
  if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, header, "utf8");
  const body = rows.map((r) => [r.serial, r.key, r.issued, r.expires, r.kind, r.customer].join("\t")).join("\n") + "\n";
  fs.appendFileSync(LOG, body, "utf8");
};

// ══════════ คำสั่ง ══════════
const cmd = (process.argv[2] || "3").toLowerCase();

// ── ค้นหาว่ารหัสนี้ออกให้ใคร ──
if (cmd === "find") {
  const q = (process.argv[3] || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!q) {
    console.log("ใส่รหัสที่จะค้นด้วย เช่น  node scripts/make-license.mjs find RF-AMW4-5C4E-9RAS");
    process.exit(1);
  }
  const hit = readLog().find((r) => r.key.replace(/[^A-Z0-9]/g, "") === q);
  if (!hit) {
    console.log(`ไม่พบรหัสนี้ในบัญชี — ไม่ใช่รหัสที่ออกจากเครื่องนี้ (หรือออกก่อนเริ่มทำบัญชี)`);
    process.exit(1);
  }
  console.log(`รหัส     ${hit.key}`);
  console.log(`เลขที่   ${hit.serial}`);
  console.log(`ออกเมื่อ ${hit.issued}`);
  console.log(`หมดอายุ  ${hit.expires}`);
  console.log(`ลูกค้า   ${hit.customer || "(ไม่ได้ระบุ)"}`);
  process.exit(0);
}

// ── ดูทั้งหมด ──
if (cmd === "list") {
  const rows = readLog();
  if (!rows.length) {
    console.log("ยังไม่เคยออกรหัสเลย");
    process.exit(0);
  }
  console.log(`— ออกไปแล้ว ${rows.length} ใบ —`);
  for (const r of rows) console.log(`${String(r.serial).padStart(4)}  ${r.key}  ${r.issued}  ถึง ${r.expires}  ${r.customer || "-"}`);
  process.exit(0);
}

// ── ออกรหัสใหม่ ──
const count = Math.max(1, parseInt(process.argv[3] || "1", 10) || 1);
const customer = (process.argv[4] || "").replace(/[\t\n]/g, " ").trim();
const today = ymd(new Date());
const log = readLog();
let serial = (log.length ? Math.max(...log.map((r) => r.serial)) : 0) + 1;

const made = [];

if (cmd === "life" || cmd === "lifetime") {
  console.log(`— รหัสตลอดชีพ ${count} ใบ —`);
  for (let n = 0; n < count; n++, serial++) {
    const body = encodeSerial(serial) + rand(5);
    const full = body + checksumOf(body);
    const key = dash(full, "COACH");
    console.log(key);
    made.push({ serial, key, issued: today, expires: "ตลอดชีพ", kind: "life", customer });
  }
} else {
  const months = Math.max(1, parseInt(cmd, 10) || 3);
  const now = new Date();
  // เดือนสุดท้ายที่ใช้ได้ = เดือนนี้ + months (นับเดือนนี้เป็นเดือนแรกที่ใช้)
  const end = new Date(now.getFullYear(), now.getMonth() + months, 1);
  const y = end.getFullYear();
  const m = end.getMonth() + 1;
  const until = `${y}-${String(m).padStart(2, "0")}`;

  console.log(`— รหัสอายุ ${months} เดือน ${count} ใบ · ใช้ได้ถึงสิ้นเดือน ${m}/${y} —`);
  for (let n = 0; n < count; n++, serial++) {
    // 2 ตัวแรกคือเดือนหมดอายุ (แอปอ่านตำแหน่งนี้) · 3 ตัวถัดมาคือเลขลูกค้า · ที่เหลือสุ่ม
    const body = encodeExpiry(y, m) + encodeSerial(serial) + rand(3);
    const full = body + checksumOf(body);
    const key = dash(full, "RF");
    console.log(key);
    made.push({ serial, key, issued: today, expires: until, kind: `${months}m`, customer });
  }
}

appendLog(made);
console.log(`\nบันทึกลง ${path.relative(process.cwd(), LOG)} แล้ว (เลขที่ ${made[0].serial}${made.length > 1 ? `-${made[made.length - 1].serial}` : ""})`);
if (!customer) console.log(`ครั้งหน้าใส่ชื่อลูกค้าต่อท้ายด้วยจะตามรอยได้: node scripts/make-license.mjs ${cmd} ${count} "ชื่อ line:xxx"`);
