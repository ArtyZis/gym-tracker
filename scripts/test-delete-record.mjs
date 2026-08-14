// เทสต์ลบสถิติสูงสุดทีละอัน — แตะประวัติผู้ใช้โดยตรง ต้องแม่นทุกเคส
//
// สิ่งที่กลัวที่สุดคือลบเกิน (ประวัติดีๆ หายไปด้วย) กับลบไม่ครบ (เลขผีกลับมา
// ทาง historyArchive ตอนลบท่าแล้วเพิ่มใหม่) เทสต์นี้จับสองอย่างนั้นเป็นหลัก

import { deleteBestRecord, createDefault, normName, restoreHistory } from "../src/lib/store";
import { bestLifts, computeRank } from "../src/lib/rank";

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ✅ " + name); }
  else { fail++; console.log("  ❌ " + name + (extra ? " — " + extra : "")); }
};

const ex = (id, name, day = "mon") => ({ id, name, day, type: "weight", sets: 3, rmin: 5, rmax: 8, inc: 2.5, unit: "kg", order: 0 });
const set = (weight, reps) => ({ weight, reps });

function base() {
  const d = createDefault();
  d.exercises = [ex("e1", "Barbell Bench Press")];
  d.history = {
    e1: [
      { date: "2026-07-01", sets: [set(80, 8), set(80, 7), set(80, 6)] },
      { date: "2026-07-08", sets: [set(200, 8), set(85, 6), set(85, 5)] }, // 200 = พิมพ์ผิด
      { date: "2026-07-15", sets: [set(90, 6), set(90, 5), set(90, 5)] },
    ],
  };
  d.bodyweight = [{ date: "2026-07-15", kg: 70 }];
  return d;
}

console.log("\n═══ 1. ลบสถิติที่กรอกผิด ═══");
{
  const d = base();
  const before = bestLifts(d).find((b) => b.name === "Barbell Bench Press");
  ok("ก่อนลบ สถิติคือเลขที่พิมพ์ผิด 200", before.weight === 200, String(before?.weight));

  deleteBestRecord(d, "Barbell Bench Press", 200, "2026-07-08");
  const after = bestLifts(d).find((b) => b.name === "Barbell Bench Press");
  ok("ลบแล้วสถิติกลายเป็น 90 (ของจริงที่ดีที่สุด)", after.weight === 90, String(after?.weight));

  // ลบเกินคือหายนะ — เซตอื่นในวันเดียวกันต้องอยู่ครบ
  const jul8 = d.history.e1.find((s) => s.date === "2026-07-08");
  ok("วันเดียวกันเซต 85 ยังอยู่ครบ 2 เซต", jul8 && jul8.sets.filter(Boolean).length === 2, JSON.stringify(jul8?.sets));
  ok("วันอื่นไม่ถูกแตะ", d.history.e1.length === 3);
  ok("จำนวนเซตรวมหายไปแค่ 1", d.history.e1.reduce((a, s) => a + s.sets.filter(Boolean).length, 0) === 8);
}

console.log("\n═══ 2. ลบแล้วต้องไม่กลับมาทาง archive ═══");
{
  const d = base();
  // จำลองว่าเคยลบท่าแล้วประวัติถูกเก็บเข้า archive
  d.historyArchive = { [normName("Barbell Bench Press")]: structuredClone(d.history.e1) };

  deleteBestRecord(d, "Barbell Bench Press", 200, "2026-07-08");
  const arch = d.historyArchive[normName("Barbell Bench Press")];
  const hasGhost = arch.some((s) => s.sets.some((st) => st?.weight === 200));
  ok("archive ก็ถูกลบด้วย", !hasGhost);

  // เพิ่มท่าชื่อเดิมกลับมาแล้วกู้ประวัติ — เลขผีต้องไม่โผล่
  const fresh = { ...ex("e9", "Barbell Bench Press") };
  d.exercises = [fresh];
  d.history = {};
  restoreHistory(d, fresh);
  const back = bestLifts(d).find((b) => b.name === "Barbell Bench Press");
  ok("กู้ประวัติกลับมาแล้วสถิติยังเป็น 90", back?.weight === 90, String(back?.weight));
}

console.log("\n═══ 3. ท่าเดียวกันหลาย id (อยู่หลายวัน / ท่านอกโปรแกรม) ═══");
{
  const d = createDefault();
  d.exercises = [ex("e1", "Cable Lateral Raise", "mon"), ex("e2", "Cable Lateral Raise", "thu")];
  d.history = {
    e1: [{ date: "2026-07-01", sets: [set(12, 12)] }],
    e2: [{ date: "2026-07-04", sets: [set(99, 12)] }], // ผิดอยู่คนละ id
  };
  const before = bestLifts(d).filter((b) => normName(b.name) === normName("Cable Lateral Raise"));
  ok("รวมเป็นบรรทัดเดียว", before.length === 1);
  ok("สถิติมาจาก id ที่สอง", before[0].weight === 99);

  deleteBestRecord(d, "Cable Lateral Raise", 99, "2026-07-04");
  const after = bestLifts(d).filter((b) => normName(b.name) === normName("Cable Lateral Raise"));
  ok("ลบข้าม id ได้", after.length === 1 && after[0].weight === 12, JSON.stringify(after));
  ok("id ที่ว่างเปล่าถูกเอาออก", d.history.e2 === undefined);
  ok("id ที่ยังมีของอยู่ครบ", d.history.e1.length === 1);
}

console.log("\n═══ 4. ท่านอกโปรแกรม (รู้ชื่อจาก exNames) ═══");
{
  const d = createDefault();
  d.exercises = [];
  d.exNames = { "x~dip": { name: "Dip", unit: "kg" } };
  d.history = { "x~dip": [{ date: "2026-07-02", sets: [set(40, 6), set(20, 10)] }] };

  ok("ก่อนลบเห็นสถิติ 40", bestLifts(d)[0]?.weight === 40);
  deleteBestRecord(d, "Dip", 40, "2026-07-02");
  ok("ลบท่านอกโปรแกรมได้", bestLifts(d)[0]?.weight === 20, JSON.stringify(bestLifts(d)));
}

console.log("\n═══ 5. ลบจนหมดแล้วต้องหลุดจากรายการ ═══");
{
  const d = createDefault();
  d.exercises = [ex("e1", "Deadlift")];
  d.history = { e1: [{ date: "2026-07-02", sets: [set(100, 5)] }] };

  deleteBestRecord(d, "Deadlift", 100, "2026-07-02");
  ok("ไม่เหลือในรายการสถิติ", bestLifts(d).length === 0);
  ok("เซสชันเปล่าไม่ค้างอยู่", d.history.e1 === undefined);
}

console.log("\n═══ 6. ลบแล้วแรงค์ต้องคิดใหม่ ═══");
{
  const d = base();
  const rankBefore = computeRank(d);
  deleteBestRecord(d, "Barbell Bench Press", 200, "2026-07-08");
  const rankAfter = computeRank(d);
  ok(
    "1RM เบนช์ลดลงหลังลบเลขผิด",
    (rankAfter.lifts.find((l) => l.key === "bench")?.oneRM ?? 0) < (rankBefore.lifts.find((l) => l.key === "bench")?.oneRM ?? 0),
  );
}

console.log("\n═══ 7. เรียกด้วยค่าที่ไม่ตรงต้องไม่ทำอะไรพัง ═══");
{
  const d = base();
  const snapshot = JSON.stringify(d.history);
  deleteBestRecord(d, "Barbell Bench Press", 123, "2026-07-08"); // น้ำหนักไม่มีจริง
  ok("น้ำหนักไม่ตรง = ไม่แตะอะไร", JSON.stringify(d.history) === snapshot);
  deleteBestRecord(d, "Barbell Bench Press", 200, "2099-01-01"); // วันไม่มีจริง
  ok("วันไม่ตรง = ไม่แตะอะไร", JSON.stringify(d.history) === snapshot);
  deleteBestRecord(d, "ท่าที่ไม่มีอยู่จริง", 200, "2026-07-08");
  ok("ชื่อท่าไม่มีจริง = ไม่แตะอะไร", JSON.stringify(d.history) === snapshot);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
