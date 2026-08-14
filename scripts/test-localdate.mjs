// วันที่ต้องเป็น "วันตามนาฬิกาผู้ใช้" เสมอ ไม่ใช่ UTC
//
// บั๊กที่เจอจริง (15 ส.ค. 2026): todayStr() ใช้ toISOString() ซึ่งเป็น UTC
// ไทยอยู่ UTC+7 แปลว่าตั้งแต่เที่ยงคืนถึง 7 โมงเช้า แอปคิดว่ายังเป็นเมื่อวาน
// คนที่ไปยิมเช้าตี 5 เลยถูกบันทึกลงวันก่อนหน้า แล้วสตรีคขาดทั้งที่ไปฝึกจริง
//
// เทสต์นี้จำลองเวลาหลายช่วงของวัน โดยเฉพาะช่วงที่ UTC กับท้องถิ่นคนละวัน

import { todayStr } from "../src/lib/store";

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.log("  ❌ " + name + (extra ? " — " + extra : "")); }
};

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

console.log("═══ 1. todayStr ตรงกับปฏิทินท้องถิ่น ═══");
{
  const now = new Date();
  ok("วันนี้ตรงกับนาฬิกาเครื่อง", todayStr() === ymd(now), `ได้ ${todayStr()} ควรเป็น ${ymd(now)}`);
  ok("ไม่ใช่วันที่แบบ UTC ถ้าสองอย่างต่างกัน", todayStr() === ymd(now));
}

console.log("\n═══ 2. ทุกชั่วโมงของวันต้องได้วันที่เดียวกับปฏิทิน ═══");
{
  // ไล่ทุกชั่วโมงของวันนี้ — ชั่วโมงที่ UTC เป็นคนละวันคือจุดที่ของเดิมพัง
  let bad = [];
  let crossed = 0;
  for (let h = 0; h < 24; h++) {
    const d = new Date();
    d.setHours(h, 30, 0, 0);
    if (d.toISOString().slice(0, 10) !== ymd(d)) crossed++;
    if (todayStr(d) !== ymd(d)) bad.push(`${h}:30 -> ${todayStr(d)} ควรเป็น ${ymd(d)}`);
  }
  ok("ทุกชั่วโมงได้วันที่ถูก", bad.length === 0, bad.slice(0, 3).join(" · "));
  // เครื่องที่ไทม์โซนไม่ใช่ UTC จะมีช่วงที่ UTC เป็นคนละวันเสมอ — ยืนยันว่าเทสต์นี้ได้ทดสอบจริง
  console.log(`     (ชั่วโมงที่ UTC เป็นคนละวันกับท้องถิ่น: ${crossed} จาก 24 — ของเดิมพังทุกชั่วโมงในกลุ่มนี้)`);
}

console.log("\n═══ 3. วันสิ้นเดือน/สิ้นปี ต้องไม่ข้ามผิด ═══");
{
  const cases = [
    [2026, 0, 1, "2026-01-01"],
    [2026, 11, 31, "2026-12-31"],
    [2026, 1, 28, "2026-02-28"],
    [2028, 1, 29, "2028-02-29"], // ปีอธิกสุรทิน
    [2026, 9, 5, "2026-10-05"],
  ];
  for (const [y, m, day, want] of cases) {
    const d = new Date(y, m, day, 0, 30, 0);
    ok(`${want} ตอนตี 0:30`, todayStr(d) === want, `ได้ ${todayStr(d)}`);
  }
  for (const [y, m, day, want] of cases) {
    const d = new Date(y, m, day, 23, 30, 0);
    ok(`${want} ตอน 23:30`, todayStr(d) === want, `ได้ ${todayStr(d)}`);
  }
}

console.log("\n═══ 4. รูปแบบต้องเทียบสตริงกันได้ (ใช้ localeCompare เรียงวันทั่วระบบ) ═══");
{
  ok("เป็น YYYY-MM-DD เสมอ", /^\d{4}-\d{2}-\d{2}$/.test(todayStr()), todayStr());
  const a = todayStr(new Date(2026, 8, 9));
  const b = todayStr(new Date(2026, 8, 10));
  ok("เดือน/วันเลขเดียวมี 0 นำหน้า", a === "2026-09-09" && b === "2026-09-10", `${a} / ${b}`);
  ok("เรียงสตริงแล้วได้ลำดับเวลาถูก", a < b);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
