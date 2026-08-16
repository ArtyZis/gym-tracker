// โค้ดย้ายข้อมูลแบบบีบอัด — กันสองอย่างที่เสียหายคนละแบบ
//
//   ยาวเกิน   -> ส่งไลน์ไม่ได้ (ขีดจำกัด ~10,000 ตัวอักษร) -> ย้ายเครื่องไม่ได้เลย
//   อ่านเก่าไม่ได้ -> คนที่เก็บโค้ดเก่าไว้ในโน้ต/แชท กู้ข้อมูลไม่ได้ = ผิดกฎเหล็กข้อ 1
//
// เคสจริงที่ทำให้ต้องแก้: ผู้ใช้ฝึก 3 สัปดาห์ ได้โค้ด 28,446 ตัวอักษร เกินไลน์ไป 3 เท่า

import { decodeTransferCode, encodeTransferCode, isCompressedCode } from "../src/lib/transferCode";
import { createDefault, decodeTransfer } from "../src/lib/store";

let pass = 0;
let fail = 0;
const ok = (n, c, extra = "") => {
  if (c) { pass++; console.log("  ✅ " + n); }
  else { fail++; console.log("  ❌ " + n + (extra ? " — " + extra : "")); }
};

const LINE_LIMIT = 10_000;
const oldEncode = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));

/** ข้อมูลเสมือนคนฝึกจริง: n สัปดาห์ × 6 วัน × 6 ท่า × 4 เซต */
function fakeUser(weeks) {
  const d = createDefault();
  d.exercises = Array.from({ length: 36 }, (_, i) => ({
    id: `ex_abcdefgh${i}`, name: ["Barbell Bench Press", "Incline DB Press", "Seated Cable Row", "Barbell Back Squat", "Romanian Deadlift", "Cable Lateral Raise"][i % 6],
    day: ["mon", "tue", "wed", "thu", "sat", "sun"][i % 6], type: "weight", sets: 4, rmin: 8, rmax: 12, inc: 2.5, unit: "kg", order: i % 6,
  }));
  d.dayLabels = { mon: "Push  หนัก", tue: "Pull  หนัก", wed: "Legs  หนัก", thu: "Push  ปริมาณ", sat: "Pull  ปริมาณ", sun: "Legs  ปริมาณ" };
  d.history = {};
  let day = 0;
  for (let w = 0; w < weeks; w++)
    for (let s = 0; s < 6; s++) {
      day++;
      const date = new Date(Date.UTC(2026, 0, 1) + day * 86400000).toISOString().slice(0, 10);
      for (const ex of d.exercises.slice((s * 6) % 30, ((s * 6) % 30) + 6)) {
        (d.history[ex.id] ??= []).push({
          date,
          sets: Array.from({ length: 4 }, (_, k) => ({ weight: 20 + w * 2.5, reps: 8 + (k % 3), at: Date.now() + k * 180000 })),
        });
      }
    }
  return d;
}

console.log("═══ 1. ขนาดที่ย่อได้จริง ═══");
{
  for (const weeks of [3, 12, 26, 52]) {
    const u = fakeUser(weeks);
    const before = oldEncode(u).length;
    const after = (await encodeTransferCode(u)).length;
    const cut = ((1 - after / before) * 100).toFixed(0);
    const fits = after <= LINE_LIMIT;
    console.log(`     ${String(weeks).padStart(2)} สัปดาห์: ${String(before).padStart(7)} -> ${String(after).padStart(6)} ตัวอักษร  (ย่อ ${cut}%)  ${fits ? "ส่งไลน์ได้" : "⚠ ยังเกิน"}`);
    ok(`${weeks} สัปดาห์: เล็กลงอย่างน้อยครึ่งหนึ่ง`, after < before / 2, `${before} -> ${after}`);
  }
}
{
  // เคสจริงของผู้ใช้: ~28,000 ตัวอักษร ต้องลงมาต่ำกว่าขีดไลน์
  const u = fakeUser(3);
  const after = (await encodeTransferCode(u)).length;
  ok("ผู้ใช้ 3 สัปดาห์ส่งผ่านไลน์ได้ (<10,000)", after <= LINE_LIMIT, `${after} ตัวอักษร`);
}
{
  const after = (await encodeTransferCode(fakeUser(52))).length;
  ok("ฝึกครบปีก็ยังส่งไลน์ได้", after <= LINE_LIMIT, `${after} ตัวอักษร`);
}

console.log("\n═══ 2. ไป-กลับต้องได้ของเดิมเป๊ะ ═══");
{
  const u = fakeUser(4);
  const back = JSON.parse(await decodeTransferCode(await encodeTransferCode(u)));
  ok("JSON เหมือนเดิมทุกไบต์", JSON.stringify(back) === JSON.stringify(u));
}
{
  // ภาษาไทย + อีโมจิ + อักขระที่ทำ btoa พังถ้าไม่ผ่าน UTF-8
  const u = createDefault();
  u.dayLabels = { mon: "อกไหล่ไตรเซ็ป 💪", tue: "หลัง—ไบเซ็ป", wed: "ขา · น่อง" };
  u.dayNotes = { "2026-08-01": "พักเป็นหวัด ไม่ได้ไป 🤒", "2026-08-02": "Deadlift หลังแอ่น" };
  const back = JSON.parse(await decodeTransferCode(await encodeTransferCode(u)));
  ok("ภาษาไทยไม่เพี้ยน", back.dayLabels.mon === "อกไหล่ไตรเซ็ป 💪" && back.dayNotes["2026-08-01"] === "พักเป็นหวัด ไม่ได้ไป 🤒");
}
{
  const u = createDefault();
  ok("ข้อมูลว่างเปล่าก็ทำงาน", JSON.stringify(JSON.parse(await decodeTransferCode(await encodeTransferCode(u)))) === JSON.stringify(u));
}

console.log("\n═══ 3. โค้ดเก่าต้องกู้ได้ตลอดไป (กฎเหล็กข้อ 1) ═══");
{
  const u = fakeUser(2);
  const old = oldEncode(u);
  ok("โค้ดเก่าไม่มีหัว = ยังถอดได้", JSON.stringify(JSON.parse(await decodeTransferCode(old))) === JSON.stringify(u));

  const viaStore = await decodeTransfer(old);
  ok("decodeTransfer รับโค้ดเก่าได้", viaStore !== null && viaStore.exercises.length === u.exercises.length);

  const viaStoreNew = await decodeTransfer(await encodeTransferCode(u));
  ok("decodeTransfer รับโค้ดใหม่ได้", viaStoreNew !== null && viaStoreNew.exercises.length === u.exercises.length);

  // ของจริงจากผู้ใช้: โค้ดเก่าที่มีภาษาไทย
  const th = createDefault();
  th.dayLabels = { mon: "อก" };
  ok("โค้ดเก่าที่มีไทย = ถอดได้", JSON.parse(await decodeTransferCode(oldEncode(th))).dayLabels.mon === "อก");
}

console.log("\n═══ 4. แยกสองรูปแบบออกจากกันได้ ═══");
{
  const u = fakeUser(1);
  ok("โค้ดใหม่ขึ้นต้นด้วยหัว RFZ1:", isCompressedCode(await encodeTransferCode(u)));
  ok("โค้ดเก่าไม่มีหัว", !isCompressedCode(oldEncode(u)));
  // JSON เริ่มด้วย "{" -> base64 เริ่มด้วย "ey" เสมอ ชนกับ "RFZ1" ไม่ได้
  ok("base64 ของ JSON ไม่มีวันขึ้นต้นเหมือนหัวใหม่", oldEncode(u).startsWith("ey"));
}

console.log("\n═══ 5. โค้ดพังต้องคืน null ไม่ใช่ทำแอปล้ม ═══");
{
  const bads = ["", "   ", "ไม่ใช่โค้ด", "RFZ1:", "RFZ1:ไม่ใช่base64", "RFZ1:aGVsbG8=", "A".repeat(6_000_000)];
  for (const b of bads) {
    let threw = false, out;
    try { out = await decodeTransferCode(b); } catch { threw = true; }
    ok(`"${b.slice(0, 14)}" -> null ไม่ throw`, !threw && out === null, threw ? "throw" : String(out).slice(0, 20));
  }
}
{
  // แบ่งหน้าที่กันชัดๆ: decodeTransferCode เป็นตัวถอดรหัสเฉยๆ ไม่ตรวจว่าเนื้อในเป็น Data ที่ใช้ได้
  // "eyJ" เป็น base64 ที่ถูกต้อง ถอดได้เป็น '{"' — ต้องคืนสตริงนั้น ไม่ใช่ null
  // คนที่ตัดสินว่าใช้ได้จริงไหมคือ decodeTransfer ซึ่งต้องปฏิเสธ
  ok('"eyJ" ถอดรหัสได้เป็นสตริง (ยังไม่ตัดสินว่าใช้ได้)', (await decodeTransferCode("eyJ")) === '{"');
  ok('"eyJ" ผ่าน decodeTransfer แล้วถูกปฏิเสธ', (await decodeTransfer("eyJ")) === null);
  // โค้ดที่ถอดได้เป็น JSON ถูกต้องแต่ไม่ใช่ Data ก็ต้องไม่ผ่าน
  ok("JSON ที่ไม่ใช่ Data ถูกปฏิเสธ", (await decodeTransfer(oldEncode([1, 2, 3]))) === null);
}
{
  // gzip ที่ถูกต้องแต่ข้างในไม่ใช่ JSON — ต้องไม่หลุดไปถึง applyTransfer
  const junkGz = await encodeTransferCode("ไม่ใช่อ็อบเจกต์");
  ok("gzip ถูกแต่เนื้อในไม่ใช่ Data = decodeTransfer ปฏิเสธ", (await decodeTransfer(junkGz)) === null);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
