// ย้ายเครื่อง = ห้ามมีประวัติหาย ทั้งสองฝั่ง — กฎเหล็กข้อ 1
//
// บั๊กจริงที่ผู้ใช้เจอ (15 ส.ค. 2026): ของเดิมทำ Object.assign(d, restored)
// ซึ่งทับ history ทั้งก้อน ใครฝึกบนเครื่องใหม่ไปก่อนแล้วค่อยวางโค้ด
// ประวัติที่เพิ่งทำหายเกลี้ยง ไม่ถาม ไม่เตือน ไม่มีทางกู้
//
// ตอนนี้ applyTransfer รวมสองฝั่งเข้าด้วยกัน เทสต์นี้ยืนยันว่า:
//   1. เครื่องปลายทางว่าง -> ผลเท่ากับย้ายมาทั้งก้อน (เคสปกติต้องไม่เปลี่ยน)
//   2. เครื่องปลายทางมีของ -> ได้ครบทั้งสองฝั่ง ไม่มีใครหาย
//   3. วันเดียวกันชนกัน -> เก็บอันที่มีเซตมากกว่า ไม่ใช่ทิ้งอันหนึ่ง

import { applyTransfer, transferSummary, decodeTransfer, createDefault, normalizeData } from "../src/lib/store";
import { bestLifts } from "../src/lib/rank";

let pass = 0;
let fail = 0;
const ok = (n, c, extra = "") => {
  if (c) { pass++; console.log("  ✅ " + n); }
  else { fail++; console.log("  ❌ " + n + (extra ? " — " + extra : "")); }
};

const ex = (id, name, day = "mon") => ({ id, name, day, type: "weight", sets: 3, rmin: 5, rmax: 8, inc: 2.5, unit: "kg", order: 0 });
const sess = (date, sets) => ({ date, sets });
const st = (w, r) => ({ weight: w, reps: r });
const countSets = (d) => Object.values(d.history ?? {}).reduce((a, ss) => a + ss.reduce((b, s) => b + s.sets.filter(Boolean).length, 0), 0);

// เครื่องเก่า: ฝึกมา 3 วัน
function oldPhone() {
  const d = createDefault();
  d.exercises = [ex("a", "Barbell Bench Press"), ex("b", "Barbell Squat", "wed")];
  d.dayLabels = { ...d.dayLabels, mon: "อกเก่า" };
  d.history = {
    a: [sess("2026-06-01", [st(80, 8), st(80, 8)]), sess("2026-06-08", [st(82.5, 8), st(82.5, 7)])],
    b: [sess("2026-06-03", [st(120, 5), st(120, 5), st(120, 5)])],
  };
  d.bodyweight = [{ date: "2026-06-01", kg: 75 }];
  d.dayNotes = { "2026-06-01": "แรงดี" };
  return d;
}

// เครื่องใหม่: เผลอฝึกไปแล้ว 2 วันก่อนวางโค้ด
function newPhone() {
  const d = createDefault();
  d.exercises = [ex("z", "Deadlift", "fri")];
  d.dayLabels = { ...d.dayLabels, fri: "หลังใหม่" };
  d.history = { z: [sess("2026-08-10", [st(150, 5), st(150, 5)]), sess("2026-08-14", [st(155, 3)])] };
  d.bodyweight = [{ date: "2026-08-14", kg: 77 }];
  d.dayNotes = { "2026-08-14": "เครื่องใหม่" };
  return d;
}

console.log("═══ 1. เครื่องใหม่ว่างเปล่า (เคสปกติ) ═══");
{
  const target = createDefault();
  const incoming = oldPhone();
  const before = countSets(incoming);
  applyTransfer(target, structuredClone(incoming));
  ok("เซตครบเท่าต้นทาง", countSets(target) === before, `${countSets(target)} vs ${before}`);
  ok("ท่าครบ", target.exercises.length === 2);
  ok("ชื่อวันตามมา", target.dayLabels.mon === "อกเก่า");
  ok("น้ำหนักตัวตามมา", target.bodyweight.length === 1);
  ok("โน้ตตามมา", target.dayNotes?.["2026-06-01"] === "แรงดี");
}

console.log("\n═══ 2. เครื่องใหม่มีของอยู่แล้ว — ห้ามหาย (บั๊กที่ผู้ใช้เจอ) ═══");
{
  const target = newPhone();
  const incoming = oldPhone();
  const setsNew = countSets(target); // 3
  const setsOld = countSets(incoming); // 7

  applyTransfer(target, structuredClone(incoming));

  ok(`เซตรวมกันครบ ${setsOld}+${setsNew}=${setsOld + setsNew}`, countSets(target) === setsOld + setsNew, String(countSets(target)));
  ok("ประวัติเครื่องใหม่ยังอยู่", (target.history.z ?? []).length === 2, JSON.stringify(target.history.z?.length));
  ok("ประวัติเครื่องเก่ามาครบ", (target.history.a ?? []).length === 2 && (target.history.b ?? []).length === 1);
  ok("น้ำหนักตัวรวมสองฝั่ง", target.bodyweight.length === 2, JSON.stringify(target.bodyweight));
  ok("โน้ตรวมสองฝั่ง", !!target.dayNotes?.["2026-06-01"] && !!target.dayNotes?.["2026-08-14"]);

  // สถิติสูงสุดต้องเห็นท่าจากทั้งสองเครื่อง
  const names = bestLifts(target).map((l) => l.name);
  ok("สถิติมีท่าจากเครื่องเก่า", names.includes("Barbell Bench Press") && names.includes("Barbell Squat"), names.join(", "));

  // ตารางใช้ของที่วางมา (จุดประสงค์ของการย้าย)
  ok("ตารางท่าใช้ของจากโค้ด", target.exercises.length === 2 && target.exercises.every((e) => e.id !== "z"));
  ok("ชื่อวันใช้ของจากโค้ด", target.dayLabels.mon === "อกเก่า");

  // ⚠️ ท่า Deadlift ไม่อยู่ในตารางแล้ว แต่ประวัติต้องไม่ถูกลบ (กู้กลับได้ถ้าเพิ่มท่าชื่อเดิม)
  ok("ประวัติท่าที่หลุดจากตารางยังเก็บไว้", !!target.history.z);
}

console.log("\n═══ 3. วันเดียวกันชนกัน — เก็บอันที่มีเซตมากกว่า ═══");
{
  const target = createDefault();
  target.exercises = [ex("a", "Barbell Bench Press")];
  target.history = { a: [sess("2026-06-01", [st(80, 8)])] }; // 1 เซต

  const incoming = createDefault();
  incoming.exercises = [ex("a", "Barbell Bench Press")];
  incoming.history = { a: [sess("2026-06-01", [st(80, 8), st(80, 8), st(80, 7)])] }; // 3 เซต

  applyTransfer(target, incoming);
  ok("เหลือวันเดียว ไม่ซ้ำ", target.history.a.length === 1);
  ok("เก็บอันที่มี 3 เซต", target.history.a[0].sets.filter(Boolean).length === 3, String(target.history.a[0].sets.filter(Boolean).length));
}
{
  // กลับด้าน — ของเดิมมากกว่า ต้องไม่ถูกของที่วางมาทับให้น้อยลง
  const target = createDefault();
  target.exercises = [ex("a", "Barbell Bench Press")];
  target.history = { a: [sess("2026-06-01", [st(80, 8), st(80, 8), st(80, 7), st(80, 6)])] }; // 4 เซต

  const incoming = createDefault();
  incoming.exercises = [ex("a", "Barbell Bench Press")];
  incoming.history = { a: [sess("2026-06-01", [st(80, 8)])] }; // 1 เซต

  applyTransfer(target, incoming);
  ok("ของเดิมมากกว่า = ไม่ถูกทับให้น้อยลง", target.history.a[0].sets.filter(Boolean).length === 4, String(target.history.a[0].sets.filter(Boolean).length));
}

console.log("\n═══ 4. ไป-กลับผ่านโค้ดจริง (encode -> decode -> apply) ═══");
{
  const source = oldPhone();
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(source))));
  const decoded = decodeTransfer(code);
  ok("ถอดรหัสได้", decoded !== null);

  const target = newPhone();
  const total = countSets(source) + countSets(target);
  applyTransfer(target, decoded);
  ok("ผ่านโค้ดจริงแล้วเซตยังครบ", countSets(target) === total, `${countSets(target)} vs ${total}`);
}

console.log("\n═══ 5. สรุปตัวเลขที่เอาไปโชว์ในกล่องยืนยัน ═══");
{
  const s = transferSummary(oldPhone());
  ok("นับท่าถูก", s.exercises === 2, String(s.exercises));
  ok("นับเซตถูก", s.sets === 7, String(s.sets));
  ok("นับวันที่ฝึกถูก (ไม่ซ้ำวัน)", s.days === 3, String(s.days));
  const empty = transferSummary(createDefault());
  ok("เครื่องว่างได้ 0 ทุกช่อง", empty.exercises === 0 && empty.sets === 0 && empty.days === 0);
}

console.log("\n═══ 6. โค้ดพัง/ปลอม ต้องไม่ทำข้อมูลเดิมหาย ═══");
{
  // ต้องเข้ารหัสแบบเดียวกับที่แอปใช้ — btoa เปล่าๆ รับตัวอักษรไทยไม่ได้
  const enc = (s) => btoa(unescape(encodeURIComponent(s)));
  for (const bad of ["", "ไม่ใช่โค้ด", "eyJ", enc("null"), enc('{"exercises":"พัง"}'), enc("[]"), enc("{}")]) {
    ok(`โค้ด "${bad.slice(0, 12)}" = ปฏิเสธ`, decodeTransfer(bad) === null);
  }
  // ปฏิเสธแล้ว UI จะ return ก่อนถึง applyTransfer — ข้อมูลเดิมไม่ถูกแตะ
  const target = newPhone();
  const snapshot = JSON.stringify(target);
  const bad = decodeTransfer("ขยะ");
  if (bad) applyTransfer(target, bad);
  ok("ข้อมูลเดิมไม่ถูกแตะเมื่อโค้ดพัง", JSON.stringify(target) === snapshot);
}

console.log("\n═══ 7. ข้อมูลปลอมที่จงใจทำร้าย ต้องไม่ทำให้ของเดิมหาย ═══");
{
  const target = newPhone();
  const setsBefore = countSets(target);
  // payload ที่ history เป็นขยะ — normalizeData ควรกรองทิ้ง แล้วของเดิมต้องยังอยู่
  const evil = normalizeData({ exercises: [], history: { z: "ไม่ใช่ array" }, settings: {} });
  if (evil) applyTransfer(target, evil);
  ok("ประวัติเดิมไม่หายเพราะ payload ขยะ", countSets(target) === setsBefore, `${countSets(target)} vs ${setsBefore}`);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
