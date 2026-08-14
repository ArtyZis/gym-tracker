// รันเทสต์ทุกไฟล์ในทีเดียว — ตัวเดียวที่ต้องจำก่อน commit
//
//   node scripts/run-tests.mjs
//
// ทำไมต้องมี: เทสต์แต่ละไฟล์ต้อง bundle ด้วย esbuild ก่อน (Node ESM ไม่ resolve
// import แบบไม่มีนามสกุล) และบางไฟล์ต้องการ --define ที่ PowerShell กัดเครื่องหมาย
// คำพูดพังประจำ — เรียกผ่าน node ส่ง argv เป็น array ตรงๆ จึงไม่ต้องสู้กับ quoting

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const ESBUILD = path.join(ROOT, "node_modules", "esbuild", "bin", "esbuild");
const TMP = path.join(ROOT, ".test-bundle.mjs");

// ไฟล์ที่ต้องการ flag พิเศษ
const EXTRA = {
  // ต้อง build เป็นรุ่นที่ขายจริง ไม่งั้น isPro=false แล้วเทสต์สิทธิ์ไม่มีความหมาย
  "test-prelaunch.mjs": ['--define:import.meta.env={"VITE_EDITION":"pro"}'],
};

const files = fs.readdirSync(path.join(ROOT, "scripts")).filter((f) => /^test-.*\.mjs$/.test(f)).sort();

let totalPass = 0;
let totalFail = 0;
const failed = [];

for (const f of files) {
  const src = path.join(ROOT, "scripts", f);
  try {
    execFileSync(process.execPath, [ESBUILD, src, "--bundle", "--platform=node", "--format=esm", `--outfile=${TMP}`, "--log-level=error", ...(EXTRA[f] ?? [])], {
      cwd: ROOT,
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (e) {
    console.log(`❌ ${f} — bundle ไม่ผ่าน\n${String(e.stderr ?? e.message).slice(0, 400)}`);
    totalFail++;
    failed.push(f);
    continue;
  }

  let out = "";
  let crashed = false;
  try {
    out = execFileSync(process.execPath, [TMP], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    out = String(e.stdout ?? "") + String(e.stderr ?? "");
    crashed = true;
  }

  const m = /ผ่าน (\d+) · ไม่ผ่าน (\d+)/.exec(out);
  if (m) {
    const p = +m[1];
    const fl = +m[2];
    totalPass += p;
    totalFail += fl;
    console.log(`${fl === 0 ? "✅" : "❌"} ${f.padEnd(26)} ผ่าน ${String(p).padStart(3)} · ไม่ผ่าน ${fl}`);
    if (fl > 0) {
      failed.push(f);
      out.split("\n").filter((l) => l.includes("❌")).forEach((l) => console.log("     " + l.trim()));
    }
  } else if (/ALL LOGIC TESTS PASS/.test(out)) {
    console.log(`✅ ${f.padEnd(26)} ผ่านหมด`);
  } else {
    console.log(`❌ ${f.padEnd(26)} ${crashed ? "crash" : "ไม่เจอผลสรุป"}`);
    console.log("     " + out.split("\n").slice(-6).join("\n     ").slice(0, 500));
    totalFail++;
    failed.push(f);
  }
}

try { fs.unlinkSync(TMP); } catch { /* ไม่มีก็ไม่เป็นไร */ }

console.log("─".repeat(52));
console.log(`${totalFail === 0 ? "✅" : "❌"} รวม ${files.length} ไฟล์ · ผ่าน ${totalPass} · ไม่ผ่าน ${totalFail}`);
if (failed.length) console.log("   ไฟล์ที่มีปัญหา: " + [...new Set(failed)].join(", "));
process.exit(totalFail === 0 ? 0 : 1);
