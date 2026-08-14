// รหัสรูปแบบใหม่ (มีเลขลูกค้าฝังอยู่) ต้องใช้กับแอปได้เหมือนเดิมทุกประการ
//
// เปลี่ยนโครงข้างในรหัสแล้วแอปไม่รับ = ขายไม่ได้เลย เทสต์นี้จึงออกรหัสจากสคริปต์จริง
// แล้วส่งให้ตัวตรวจของแอปตรวจทีละใบ — ไม่ใช่เดาว่าน่าจะผ่าน
//
// สิ่งที่ต้องจริง:
//   1. รหัสใหม่ผ่านการตรวจของแอป และอ่านวันหมดอายุได้ถูก
//   2. รหัสเก่า (ก่อนมีเลขลูกค้า) ยังใช้ได้ — ลูกค้าที่ซื้อไปแล้วห้ามพัง
//   3. เลขลูกค้าไม่ไปทับตำแหน่งเดือนหมดอายุ

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { isValidKey, licenseStatus, normalizeKey, checksumOf, encodeExpiry, REVOKED } from "../src/lib/license";

let pass = 0;
let fail = 0;
const ok = (n, c, extra = "") => {
  if (c) { pass++; console.log("  ✅ " + n); }
  else { fail++; console.log("  ❌ " + n + (extra ? " — " + extra : "")); }
};

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "scripts", "make-license.mjs");

// บัญชีชั่วคราวคนละไฟล์กับของลูกค้าจริง — ไม่ย้าย ไม่สำรอง ไม่ต้องกลัวลืมคืน
const LOG = path.join(ROOT, ".test-keylog.tsv");
try { fs.unlinkSync(LOG); } catch { /* ไม่มีก็ข้าม */ }

// จำสภาพบัญชีจริงไว้ก่อน เพื่อยืนยันตอนจบว่าไม่ถูกแตะ
{
  const real = path.join(ROOT, "licenses.log.tsv");
  globalThis.__realLogSnapshot = fs.existsSync(real) ? fs.readFileSync(real, "utf8") : null;
}

const run = (args) => execFileSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: "utf8", env: { ...process.env, RANKFORGE_LICENSE_LOG: LOG } });
const keysIn = (out, head) => [...out.matchAll(new RegExp(`${head}-[A-Z0-9-]+`, "g"))].map((m) => m[0]);

try {
  console.log("═══ 1. รหัสรูปแบบใหม่ต้องใช้กับแอปได้ ═══");
  {
    const out = run(["3", "10", "ลูกค้าทดสอบ"]);
    const keys = keysIn(out, "RF");
    ok("ออกได้ 10 ใบ", keys.length === 10, String(keys.length));

    const bad = keys.filter((k) => !isValidKey(k));
    ok("แอปรับทุกใบ", bad.length === 0, bad.join(", "));

    const notActive = keys.filter((k) => licenseStatus(k).kind !== "active");
    ok("ทุกใบ active", notActive.length === 0, notActive.join(", "));

    // วันหมดอายุต้องตรงกับที่ประกาศไว้บนหัวข้อความ
    const m = /ถึงสิ้นเดือน (\d+)\/(\d+)/.exec(out);
    const want = `${m[2]}-${String(+m[1]).padStart(2, "0")}`;
    const wrong = keys.filter((k) => licenseStatus(k).until !== want);
    ok(`อ่านเดือนหมดอายุได้ถูก (${want})`, wrong.length === 0, wrong.map((k) => k + "=" + licenseStatus(k).until).join(", "));

    ok("ไม่มีใบซ้ำกัน", new Set(keys).size === keys.length);
  }

  console.log("\n═══ 2. เลขลูกค้าเดินหน้าเรื่อยๆ ไม่ชนกัน ═══");
  {
    run(["3", "3", "คนที่สอง"]);
    const rows = fs.readFileSync(LOG, "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    ok("บัญชีมี 13 แถว (10+3)", rows.length === 13, String(rows.length));

    const serials = rows.map((l) => +l.split("\t")[0]);
    ok("เลขที่ไม่ซ้ำ", new Set(serials).size === serials.length);
    ok("เลขที่เรียงต่อเนื่อง 1-13", serials.join(",") === Array.from({ length: 13 }, (_, i) => i + 1).join(","), serials.join(","));

    const names = rows.map((l) => l.split("\t")[5]);
    ok("ชื่อลูกค้าถูกบันทึกแยกกลุ่มถูก", names.filter((n) => n === "คนที่สอง").length === 3, names.slice(-4).join(" | "));
  }

  console.log("\n═══ 3. ค้นหาย้อนกลับได้ ═══");
  {
    const rows = fs.readFileSync(LOG, "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    const target = rows[5].split("\t")[1];
    const found = run(["find", target]);
    ok("ค้นด้วยรหัสเต็มเจอ", found.includes(target) && found.includes("ลูกค้าทดสอบ"), found.slice(0, 60));

    const noDash = run(["find", target.replace(/-/g, "").toLowerCase()]);
    ok("ค้นแบบไม่มีขีด/พิมพ์เล็กก็เจอ", noDash.includes(target));

    let missing = "";
    try { run(["find", "RF-ZZZZ-ZZZZ-ZZZZ"]); } catch (e) { missing = String(e.stdout ?? ""); }
    ok("รหัสที่ไม่ได้ออก = บอกว่าไม่พบ", /ไม่พบ/.test(missing), missing.slice(0, 60));
  }

  console.log("\n═══ 4. รหัสตลอดชีพรูปแบบใหม่ ═══");
  {
    const out = run(["life", "3", "ลูกค้าเก่า"]);
    const keys = keysIn(out, "COACH");
    ok("ออกได้ 3 ใบ", keys.length === 3, String(keys.length));
    ok("แอปรับทุกใบ", keys.every((k) => isValidKey(k)), keys.filter((k) => !isValidKey(k)).join(", "));
    ok("ทุกใบเป็นตลอดชีพ", keys.every((k) => licenseStatus(k).kind === "lifetime"));
  }

  console.log("\n═══ 5. รหัสเก่าที่ขายไปแล้วต้องไม่พัง ═══");
  {
    // รูปแบบเดิม: RF + เดือน(2) + สุ่ม(6) + checksum(4) — ไม่มีเลขลูกค้า
    const now = new Date();
    const oldBody = encodeExpiry(now.getFullYear() + 1, 3) + "QRSTUV";
    const oldKey = "RF" + oldBody + checksumOf(oldBody);
    ok("รหัสรูปแบบเดิมยังผ่าน", isValidKey(oldKey), oldKey);
    ok("รหัสรูปแบบเดิมยัง active", licenseStatus(oldKey).kind === "active");

    const oldLifeBody = "WXYZ2345";
    const oldLife = "COACH" + oldLifeBody + checksumOf(oldLifeBody);
    ok("COACH รูปแบบเดิมยังตลอดชีพ", licenseStatus(oldLife).kind === "lifetime");
  }

  console.log("\n═══ 6. ยกเลิกรหัสที่หลุด ═══");
  {
    // REVOKED ว่างอยู่ตอนนี้ — ยืนยันว่ากลไกทำงานและไม่ไปกระทบรหัสอื่น
    const out = run(["3", "2", "ทดสอบยกเลิก"]);
    const [a, b] = keysIn(out, "RF");
    ok("รหัสที่ยังไม่ถูกยกเลิก = active", licenseStatus(a).kind === "active" && licenseStatus(b).kind === "active");

    // ยกเลิกจริง แล้วดูว่าใช้ไม่ได้จริง
    REVOKED.add(normalizeKey(a));
    ok("รหัสที่ยกเลิกแล้ว = revoked", licenseStatus(a).kind === "revoked", licenseStatus(a).kind);
    ok("ยกเลิกใบเดียว ไม่กระทบใบอื่น", licenseStatus(b).kind === "active", licenseStatus(b).kind);

    // ต้องยกเลิกได้แม้พิมพ์มาแบบมีขีด/ตัวเล็ก (ผู้ใช้พิมพ์ยังไงก็ต้องโดน)
    ok("ยกเลิกแล้วพิมพ์แบบมีขีดก็ยังโดน", licenseStatus(a.toLowerCase()).kind === "revoked");

    // รหัสตลอดชีพก็ต้องยกเลิกได้ — ไม่งั้นใบที่หลุดจะคาตลอดกาล
    const lifeKey = keysIn(run(["life", "1", "ทดสอบยกเลิกตลอดชีพ"]), "COACH")[0];
    ok("ก่อนยกเลิก = lifetime", licenseStatus(lifeKey).kind === "lifetime");
    REVOKED.add(normalizeKey(lifeKey));
    ok("ยกเลิกรหัสตลอดชีพได้", licenseStatus(lifeKey).kind === "revoked", licenseStatus(lifeKey).kind);

    // เอาออกจากรายการแล้วต้องกลับมาใช้ได้ (เผื่อใส่ผิดใบ)
    REVOKED.delete(normalizeKey(a));
    ok("เอาออกจากรายการยกเลิกแล้วใช้ได้อีก", licenseStatus(a).kind === "active");
    REVOKED.delete(normalizeKey(lifeKey));

    const src = fs.readFileSync(path.join(ROOT, "src", "lib", "license.ts"), "utf8");
    ok("มีตัวอย่างพร้อมคอมเมนต์กำกับให้ลอกได้", /\/\/ "RF[A-Z0-9]+", \/\/ /.test(src));
    ok("รายการยกเลิกต้องว่างตอนส่งมอบ", REVOKED.size === 0, `เหลือ ${REVOKED.size} ใบ`);
  }

  console.log("\n═══ 7. เลขลูกค้าไม่ทับตำแหน่งเดือนหมดอายุ ═══");
  {
    // เลขลูกค้าสูงๆ ต้องไม่ทำให้อ่านเดือนผิด (เดือนอยู่ตำแหน่ง 2-4 เสมอ)
    const out = run(["6", "1", "เลขสูง"]);
    const k = keysIn(out, "RF")[0];
    const m = /ถึงสิ้นเดือน (\d+)\/(\d+)/.exec(out);
    ok("เดือนหมดอายุยังอ่านถูกแม้มีเลขลูกค้า", licenseStatus(k).until === `${m[2]}-${String(+m[1]).padStart(2, "0")}`, licenseStatus(k).until);
    ok("normalizeKey ยังได้ 14 ตัว", normalizeKey(k).length === 14, String(normalizeKey(k).length));
  }
} finally {
  try { fs.unlinkSync(LOG); } catch { /* ข้าม */ }
}

// ยืนยันว่าบัญชีลูกค้าจริงไม่ถูกแตะเลยตลอดการทดสอบ
{
  const real = path.join(ROOT, "licenses.log.tsv");
  const before = globalThis.__realLogSnapshot;
  ok("บัญชีลูกค้าจริงไม่ถูกแก้", before === undefined || before === (fs.existsSync(real) ? fs.readFileSync(real, "utf8") : null));
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
