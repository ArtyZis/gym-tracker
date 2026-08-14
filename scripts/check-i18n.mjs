// หาข้อความไทยที่ยัง "ไม่ได้แปล" — ตัวช่วยตอนแปล และเป็นเทสต์กันของหลุด
//
// วิธีคิด: เก็บข้อความไทยทุกก้อนที่ขึ้นจอได้ แล้วหักออกเฉพาะก้อนที่ "มีคู่อังกฤษต่อท้าย"
//   คือรูปแบบ t("ไทย", "English") หรือ plural(n, "ไทย", "English")
//
// ทำไมเขียน scanner เองไม่ใช้ regex ก้อนใหญ่: regex ที่มี (?:\\.|[\s\S])*? ครอบทั้งไฟล์
// backtrack จนค้างบน exerciseDB.ts (390 รายการ) — scanner เดินครั้งเดียวจบ O(n)
// และที่สำคัญกว่าคือมันแยก template literal ได้ถูก: `${t("ไทย","English")}` ต้องถูกอ่าน
// เป็นโค้ดข้างใน ไม่ใช่ข้อความก้อนเดียว ไม่งั้นจะฟ้องผิดว่าไม่ได้แปล
//
// รันเดี่ยวๆ: node scripts/check-i18n.mjs   (ไม่ต้อง bundle เพราะอ่านเป็นข้อความล้วน)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, "..", "src");
const hasThai = (s) => /[฀-๿]/.test(s);

// ไฟล์ข้อมูลอ้างอิง — ชื่อไทยในนี้เป็น "ข้อมูล" ที่ตัวค้นหาต้องใช้เสมอ ไม่ใช่ข้อความ UI
// (คนไทยที่สลับเป็นอังกฤษก็ยังพิมพ์ "อก" ค้นท่าอกได้) การแปลจัดการผ่าน accessor แทน
const DATA_FILES = new Set(["muscles.ts", "exerciseDB.ts"]);

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/**
 * เดินไฟล์ครั้งเดียว คืนข้อความทุกก้อนพร้อมตำแหน่ง
 *
 * stack เก็บว่าตอนนี้อยู่ในอะไร: "code" | "\"" | "'" | "`"
 * เจอ ${ ตอนอยู่ใน ` -> push "code" (กลับไปอ่านเป็นโค้ด)
 * เจอ } ตอนอยู่ใน code ที่ซ้อนอยู่ -> pop กลับไปอ่านเป็นข้อความต่อ
 */
function scan(src) {
  const out = []; // { kind, value, line, start, end }
  const bare = []; // สำเนาที่คอมเมนต์+ข้อความถูกกลบ — ใช้หา JSX text
  const n = src.length;
  let i = 0;
  let line = 1;

  // template literal ต้องออกมาเป็น "ก้อนเดียว" ไม่ใช่ชิ้นๆ ตามที่ ${} ตัด
  // เพราะการจับคู่ t(th, en) ดูว่าข้อความสองก้อนติดกันไหม — ถ้า `ยกไป ${v} kg`
  // ถูกแตกเป็น "ยกไป " กับ " kg" ก้อนแรกจะไปคู่กับ string ที่อยู่ใน ${} แทน
  const stack = [{ mode: "code", braces: 0 }];
  let cur = null; // เฟรมข้อความที่กำลังสะสม (ข้ามผ่าน ${} ได้)

  // nested = ก้อนนี้อยู่ข้างใน ${...} ของเทมเพลตอีกชั้น
  //
  // ต้องรู้เพราะการจับคู่ t(th, en) ดูว่า "สองก้อนติดกันไหม" — แต่ join(", ") ที่ฝังอยู่ใน
  // ${...} ก็เป็นก้อนหนึ่งเหมือนกัน ถ้านับด้วยจะไปคั่นระหว่างไทยกับอังกฤษจนจับคู่ไม่ติด
  const nestedDepth = () => stack.filter((f) => f.pausedFrame).length;

  const openStr = (q) => {
    const nested = nestedDepth() > 0;
    // root = ก้อนนอกสุดที่ครอบอยู่ — ใช้ตัดสินว่าก้อนในถูกแปลไปพร้อมกับก้อนนอกแล้วหรือยัง
    // เช่น t(`ครบทุกเซต${easy ? ` และยังเหลือแรง ${rir}` : ""}`, `...`) ก้อน " และยังเหลือแรง "
    // ไม่ได้ลืมแปล มันถูกแปลไปกับ template ก้อนนอกซึ่งมีคู่อังกฤษของตัวเองอยู่แล้ว
    // เฟรมที่ถูกพักไว้ตัวนอกสุดคือก้อนนอกสุดจริง (cur เป็น null อยู่ระหว่างอ่าน ${...})
    const outermost = stack.find((f) => f.pausedFrame)?.pausedFrame;
    cur = { quote: q, value: "", line, start: i, outer: cur, nested, root: nested ? (outermost?.root ?? outermost?.start ?? i) : i };
    stack.push({ mode: q, braces: 0 });
  };
  const closeStr = () => {
    if (cur) out.push({ kind: "str", value: cur.value, line: cur.line, start: cur.start, end: i + 1, nested: cur.nested, root: cur.root });
    cur = cur?.outer ?? null;
    stack.pop();
  };

  while (i < n) {
    const top = stack[stack.length - 1];
    const c = src[i];

    if (c === "\n") line++;

    if (top.mode === "code") {
      // คอมเมนต์ — กลบด้วยช่องว่างเพื่อให้ตำแหน่งใน bare ยังตรงกับ src
      if (c === "/" && src[i + 1] === "/") {
        while (i < n && src[i] !== "\n") {
          bare.push(" ");
          i++;
        }
        continue;
      }
      if (c === "/" && src[i + 1] === "*") {
        while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
          if (src[i] === "\n") {
            line++;
            bare.push("\n");
          } else bare.push(" ");
          i++;
        }
        bare.push("  ");
        i += 2;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        bare.push(" ");
        openStr(c);
        i++;
        continue;
      }
      // ปิด ${...} แล้วกลับไปสะสมข้อความของ template เดิมต่อ (เฟรมเดิม ไม่สร้างใหม่)
      if (c === "}" && stack.length > 1 && top.braces === 0) {
        bare.push(" ");
        stack.pop();
        cur = top.pausedFrame;
        i++;
        continue;
      }
      if (c === "{") top.braces++;
      else if (c === "}") top.braces--;
      bare.push(c);
      i++;
      continue;
    }

    // อยู่ในข้อความ
    if (c === "\\") {
      cur.value += src[i + 1];
      bare.push("  ");
      i += 2;
      continue;
    }
    if (top.mode === "`" && c === "$" && src[i + 1] === "{") {
      // พักเฟรมข้อความไว้ (ยังไม่ push ออก) แล้วเข้าโหมดโค้ดเพื่ออ่าน t() ที่ฝังอยู่
      stack.push({ mode: "code", braces: 0, pausedFrame: cur });
      cur = null;
      bare.push("  ");
      i += 2;
      continue;
    }
    if (c === top.mode) {
      bare.push(" ");
      closeStr();
      i++;
      continue;
    }
    cur.value += c;
    bare.push(c === "\n" ? "\n" : " ");
    i++;
  }

  // ข้อความ JSX: >ข้อความ<  (ไม่มี < > { } คั่น)
  const bareSrc = bare.join("");
  for (const m of bareSrc.matchAll(/>([^<>{}]*[฀-๿][^<>{}]*)</g)) {
    out.push({ kind: "jsx", value: m[1].trim(), line: bareSrc.slice(0, m.index).split("\n").length, start: m.index, end: m.index });
  }
  return out;
}

const findings = [];
for (const f of walk(SRC)) {
  if (DATA_FILES.has(path.basename(f))) continue;
  const src = fs.readFileSync(f, "utf8");
  const items = scan(src);

  // ก้อนไทยตัวไหนตามด้วย , "อังกฤษ" ทันที = แปลแล้ว
  //
  // จับคู่แยกตามชั้น: อาร์กิวเมนต์สองตัวของ t() อยู่ชั้นเดียวกันเสมอ ถ้าเอาก้อนทุกชั้น
  // มาเรียงรวมกัน ก้อนที่ฝังใน ${...} จะไปคั่นกลางจนคู่ที่ควรเจอกันคลาดกัน
  // (และ `${t("วิ","s")}` ที่ฝังในเทมเพลตก็ต้องนับว่าแปลแล้วเหมือนกัน)
  const byLevel = new Map();
  for (const x of items) {
    if (x.kind !== "str") continue;
    const key = x.nested ? `n${x.root}` : "top";
    if (!byLevel.has(key)) byLevel.set(key, []);
    byLevel.get(key).push(x);
  }

  const translated = new Set();
  for (const group of byLevel.values()) {
    group.sort((a, b) => a.start - b.start);
    for (let k = 0; k < group.length; k++) {
      if (!hasThai(group[k].value)) continue;
      const next = group[k + 1];
      if (!next || hasThai(next.value)) continue;
      if (/^\s*,\s*$/.test(src.slice(group[k].end, next.start))) translated.add(group[k]);
    }
  }

  // บรรทัดที่ทำสองภาษาด้วยมือ (เช่น ternary จาก isEN()) ปิดเสียงด้วย // i18n-ok
  // ต้องเป็นการยกเว้นทีละบรรทัดเสมอ ไม่มีแบบปิดทั้งไฟล์ — ไม่งั้นของใหม่จะแอบหลุดเข้าไป
  const lines = src.split("\n");
  // รับทั้ง // i18n-ok และ {/* i18n-ok */} (ใน JSX เขียน // ไม่ได้)
  const ok = (ln) => /(?:\/\/|\/\*)\s*i18n-ok/.test(lines[ln - 1] ?? "");

  // ตาราง *_TH คือ "ข้อมูลฝั่งไทย" ของคู่ *_TH/*_EN — เป็นไทยโดยตั้งใจ
  // แต่ต้องมีคู่ *_EN จริงในไฟล์เดียวกัน ไม่งั้นแปลว่ายังไม่ได้ทำคู่ให้ ต้องฟ้อง
  const skipRanges = [];
  lines.forEach((line, i) => {
    const m = /^\s*(?:export\s+)?const\s+(\w+)_TH(\w*)\s*(?::[^=]*)?=\s*([{[])/.exec(line);
    if (!m) return;
    if (!new RegExp(`\\b${m[1]}_EN${m[2]}\\b`).test(src)) return;
    const close = m[3] === "{" ? /^\};?$/ : /^\];?$/;
    // ตารางบรรทัดเดียว (const MONTH_TH = [...];) จบในบรรทัดตัวเอง
    if (line.trimEnd().endsWith(";")) {
      skipRanges.push([i + 1, i + 1]);
      return;
    }
    for (let j = i; j < lines.length; j++) {
      if (close.test(lines[j].trim())) {
        skipRanges.push([i + 1, j + 1]);
        break;
      }
    }
  });
  const inTable = (ln) => skipRanges.some(([a, b]) => ln >= a && ln <= b);

  // ก้อนในของเทมเพลตที่ก้อนนอกแปลแล้ว = แปลแล้วเหมือนกัน
  const translatedRoots = new Set([...translated].map((x) => x.start));

  for (const x of items) {
    if (!hasThai(x.value) || translated.has(x) || ok(x.line) || inTable(x.line)) continue;
    if (x.nested && translatedRoots.has(x.root)) continue;
    findings.push({ file: path.relative(SRC, f).replace(/\\/g, "/"), line: x.line, text: x.value.trim().slice(0, 90) });
  }
}

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

let last = "";
for (const x of findings) {
  if (x.file !== last) {
    console.log(`\n── ${x.file}`);
    last = x.file;
  }
  console.log(`  ${String(x.line).padStart(4)}  ${x.text}`);
}

if (findings.length === 0) {
  console.log("✅ ไม่มีข้อความไทยที่ยังไม่ได้แปล");
  process.exit(0);
}
console.log(`\n❌ ยังไม่ได้แปล ${findings.length} จุด`);
process.exit(1);
