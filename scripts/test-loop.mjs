// ตารางแบบรอบ (loop) — ตรวจคณิตของรอบ ซึ่งเป็นจุดที่พลาดแล้วเงียบที่สุด
// (ระยะห่างฟื้นตัวคิดผิด = แอปบอกว่าฟื้นทันทั้งที่จริงไม่ทัน ผู้ใช้ไม่มีทางรู้)
//
// รัน: .\node_modules\.bin\esbuild.cmd scripts/test-loop.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { analyzeProgram, hoursBetween, maxConsecutiveDays, minGapHours } from "../src/lib/analyzer.ts";
import { activeDays, anchorFor, cycleLen, isLoop, slotForDate, slotName, todaySlot } from "../src/lib/loop.ts";
import { createDefault, createEmpty, normalizeData, DAYS, uid } from "../src/lib/store.ts";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? "  << " + extra : ""}`); }
};
const eq = (name, got, want) => ok(name, got === want, `ได้ ${JSON.stringify(got)} ต้องการ ${JSON.stringify(want)}`);

function mkEx(name, day, sets, order) {
  return { id: uid() + Math.random(), name, day, type: "weight", sets, rmin: 6, rmax: 10, inc: 2.5, unit: "kg", order };
}
const base = () => Object.assign(createDefault(), createEmpty(), { exercises: [] });

console.log("═══ 1. ระยะห่างต้องคิดตามความยาวรอบ ไม่ใช่ 7 วันตายตัว ═══");
{
  // รอบ 3 วัน: ดัน(1) ดึง(2) ขา(3) แล้ววนกลับ -> วันดันห่างจากตัวเองครบรอบ = 72 ชม.
  eq("รอบ 3: วันที่1 -> วันที่2 = 24 ชม.", hoursBetween("mon", "tue", 3), 24);
  eq("รอบ 3: วันที่1 -> วันที่3 = 48 ชม.", hoursBetween("mon", "wed", 3), 48);
  eq("รอบ 3: วันที่3 -> วันที่1 = 24 ชม. (วนกลับ)", hoursBetween("wed", "mon", 3), 24);
  eq("รอบ 3: ระยะสั้นสุดระหว่างวันที่1กับวันที่3 = 24", minGapHours("mon", "wed", 3), 24);
  // ถ้าใช้ 7 วันจะได้ 48/96 ซึ่งผิดสำหรับรอบ 3
  ok("ถ้าคิดแบบสัปดาห์จะได้คนละค่า (ยืนยันว่าจำเป็นต้องส่ง len)", minGapHours("mon", "wed", 7) !== minGapHours("mon", "wed", 3));
}

console.log("\n═══ 2. ฝึกติดกันต้องนับวนในรอบ ═══");
{
  eq("รอบ 3 ฝึกครบ 3 วัน = ติดกัน 3", maxConsecutiveDays(new Set(["mon", "tue", "wed"]), 3), 3);
  eq("รอบ 4 ฝึก 1-2-3 พัก 4 = ติดกัน 3", maxConsecutiveDays(new Set(["mon", "tue", "wed"]), 4), 3);
  // วนกลับ: รอบ 4 ฝึกวันที่ 4 กับ 1-2 ต่อกัน = 3 วันติด
  eq("รอบ 4 ฝึกวันที่ 4,1,2 = ติดกัน 3 (วนข้ามรอบ)", maxConsecutiveDays(new Set(["thu", "mon", "tue"]), 4), 3);
}

console.log("\n═══ 3. หาว่าวันนี้อยู่ช่องไหนของรอบ ═══");
{
  const d = base();
  d.loop = { len: 4, anchor: "2026-07-01" }; // 1 ก.ค. = วันที่ 1
  eq("วันเริ่ม = วันที่ 1", slotForDate(d, "2026-07-01"), "mon");
  eq("ถัดมา 1 วัน = วันที่ 2", slotForDate(d, "2026-07-02"), "tue");
  eq("ถัดมา 3 วัน = วันที่ 4", slotForDate(d, "2026-07-04"), "thu");
  eq("ครบรอบ (4 วัน) วนกลับวันที่ 1", slotForDate(d, "2026-07-05"), "mon");
  eq("ผ่านไป 2 รอบเต็มก็ยังวันที่ 1", slotForDate(d, "2026-07-09"), "mon");
  eq("ย้อนก่อนวันเริ่ม 1 วัน = วันที่ 4", slotForDate(d, "2026-06-30"), "thu");
}

console.log("\n═══ 4. ตั้ง 'วันนี้คือวันที่ N' แล้วต้องได้ N จริง ═══");
{
  for (const len of [3, 4, 5, 6]) {
    for (let n = 1; n <= len; n++) {
      const d = base();
      d.loop = { len, anchor: anchorFor(n, len) };
      const got = DAYS.indexOf(todaySlot(d)) + 1;
      if (got !== n) { fail++; console.log(`  ❌ รอบ ${len} ตั้งวันที่ ${n} แต่ได้ ${got}`); }
    }
  }
  pass++;
  console.log("  ✅ ตั้งวันที่ 1..N ได้ตรงทุกค่าในรอบ 3/4/5/6");
}

console.log("\n═══ 5. ช่องที่ใช้งานและการแสดงผล ═══");
{
  const d = base();
  d.loop = { len: 4, anchor: "2026-07-01" };
  eq("รอบ 4 ใช้ 4 ช่อง", activeDays(d).length, 4);
  eq("ชื่อช่องเป็น 'วันที่ N'", slotName(d, "wed"), "วันที่ 3");
  const w = base();
  eq("โหมดสัปดาห์ใช้ 7 ช่อง", activeDays(w).length, 7);
  eq("โหมดสัปดาห์ใช้ชื่อวันไทย", slotName(w, "wed"), "พุธ");
  eq("โหมดสัปดาห์ cycleLen = 7", cycleLen(w), 7);
  eq("โหมดรอบ cycleLen = ความยาวรอบ", cycleLen(d), 4);
}

console.log("\n═══ 6. ตัววิเคราะห์ต้องเห็นเฉพาะช่องในรอบ ═══");
{
  const d = base();
  d.loop = { len: 3, anchor: "2026-07-01" };
  d.exercises = [
    mkEx("Barbell Bench Press", "mon", 4, 0),
    mkEx("Barbell Row", "tue", 4, 0),
    mkEx("Barbell Squat", "wed", 4, 0),
    // ท่าที่ตกค้างอยู่นอกรอบ (ช่องวันที่ 5) ต้องไม่ถูกนับ
    mkEx("Lat Pulldown", "fri", 4, 0),
  ];
  const a = analyzeProgram(d);
  eq("นับวันฝึกเฉพาะที่อยู่ในรอบ", a.dayLoads.length, 3);
  // หลังต้องมาจาก Barbell Row (4 เซต) เท่านั้น — Lat Pulldown อยู่ช่องวันที่ 5 ซึ่งนอกรอบ 3 วัน
  // ถ้าถูกนับด้วยจะเป็น 8 เซต
  eq("ท่านอกรอบไม่ถูกนับปริมาณ", a.stats.find((s) => s.muscle === "back").sets, 4);
}

console.log("\n═══ 7. ข้อมูลพัง/ช่วงผิด ต้องกลับไปโหมดสัปดาห์ ไม่ใช่ crash ═══");
{
  const mk = (loop) => normalizeData({ ...createDefault(), loop });
  ok("len เกินช่วง -> ปิดโหมดรอบ", !isLoop(mk({ len: 9, anchor: "2026-07-01" })));
  ok("len ต่ำเกิน -> ปิดโหมดรอบ", !isLoop(mk({ len: 1, anchor: "2026-07-01" })));
  ok("anchor ไม่ใช่วันที่ -> ปิดโหมดรอบ", !isLoop(mk({ len: 4, anchor: "อะไรก็ไม่รู้" })));
  ok("loop เป็นค่าอื่น -> ปิดโหมดรอบ", !isLoop(mk("พัง")));
  ok("ค่าถูกต้อง -> เปิดใช้ได้", isLoop(mk({ len: 4, anchor: "2026-07-01" })));
  ok("ไม่มี loop เลย -> โหมดสัปดาห์ปกติ", !isLoop(normalizeData(createDefault())));
}

console.log("\n═══ 8. ข้อมูลเดิมต้องไม่กระทบ (ไม่มี loop = เหมือนเดิมทุกอย่าง) ═══");
{
  const d = base();
  d.exercises = [mkEx("Barbell Bench Press", "mon", 4, 0), mkEx("Barbell Squat", "thu", 4, 0)];
  const a = analyzeProgram(d);
  eq("ยังคิดระยะห่างแบบสัปดาห์", minGapHours("mon", "thu"), 72);
  eq("วันฝึก 2 วันตามเดิม", a.dayLoads.length, 2);
  ok("ไม่มีฟิลด์ loop โผล่มาเอง", d.loop === undefined);
}

console.log(`\n═══ สรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail} ═══`);
process.exit(fail ? 1 : 0);
