// ข้ามท่าเฉพาะวันนี้ — สำหรับวันที่ท่านั้นเสี่ยงเกินจะทำ (หลังตึงแล้วจะเดดลิฟต์)
//
// ต้องแยกให้ชัดจากสองอย่างที่คล้ายกันแต่คนละเรื่อง:
//   ลบท่าออกจากตาราง = เลิกเล่นท่านี้ถาวร (ประวัติต้องถูก archive)
//   ไม่ติ๊กเฉยๆ       = ทำไม่ครบ ควรถูกนับว่ายังไม่จบวัน
//   ข้ามวันนี้        = ตั้งใจไม่ทำเฉพาะวันนี้ ไม่ควรถูกนับว่าทำไม่ครบ และพรุ่งนี้กลับมาเอง

import { createDefault, normalizeData, skippedToday, todayStr, toggleSkip } from "../src/lib/store";

let pass = 0;
let fail = 0;
const ok = (n, c, extra = "") => {
  if (c) { pass++; console.log("  ✅ " + n); }
  else { fail++; console.log("  ❌ " + n + (extra ? " — " + extra : "")); }
};

const mk = () => {
  const d = createDefault();
  d.exercises = [
    { id: "dl", name: "Barbell Deadlift", day: "tue", type: "weight", sets: 4, rmin: 5, rmax: 5, inc: 2.5, unit: "kg", order: 0 },
    { id: "row", name: "T-bar Row", day: "tue", type: "weight", sets: 3, rmin: 8, rmax: 8, inc: 2.5, unit: "kg", order: 1 },
  ];
  return d;
};

console.log("═══ 1. กดข้ามแล้วจำได้ กดซ้ำแล้วกลับมา ═══");
{
  const d = mk();
  ok("เริ่มต้นไม่มีท่าไหนถูกข้าม", skippedToday(d).length === 0);

  toggleSkip(d, "dl");
  ok("กดข้ามแล้วอยู่ในรายการ", skippedToday(d).includes("dl"), JSON.stringify(skippedToday(d)));
  ok("ท่าอื่นไม่โดนด้วย", !skippedToday(d).includes("row"));

  toggleSkip(d, "dl");
  ok("กดซ้ำ = เอากลับมาเล่น", !skippedToday(d).includes("dl"));
  ok("ไม่เหลือขยะค้างใน swaps", d.swaps?.skipped === undefined, JSON.stringify(d.swaps));
}
{
  const d = mk();
  toggleSkip(d, "dl");
  toggleSkip(d, "row");
  ok("ข้ามหลายท่าพร้อมกันได้", skippedToday(d).length === 2);
  toggleSkip(d, "dl");
  ok("เอากลับมาทีละท่าได้", skippedToday(d).join() === "row", JSON.stringify(skippedToday(d)));
}

console.log("\n═══ 2. เป็นของวันนี้เท่านั้น — พรุ่งนี้ต้องกลับมาเอง ═══");
{
  const d = mk();
  toggleSkip(d, "dl");
  ok("วันนี้ข้ามอยู่", skippedToday(d).includes("dl"));

  // จำลองว่าข้ามไปวันถัดไป (swaps ค้างวันที่เก่า)
  d.swaps.date = "2020-01-01";
  ok("คนละวัน = ไม่นับว่าข้าม", skippedToday(d).length === 0, JSON.stringify(skippedToday(d)));
}
{
  // normalizeData ล้าง swaps ของวันเก่าทิ้งอยู่แล้ว — ต้องไม่ทำให้ท่าหายไปจากโปรแกรม
  const d = mk();
  toggleSkip(d, "dl");
  d.swaps.date = "2020-01-01";
  const n = normalizeData(JSON.parse(JSON.stringify(d)));
  ok("ข้ามวันแล้ว swaps ถูกล้าง", n.swaps === undefined);
  ok("ท่ายังอยู่ในโปรแกรมครบ ไม่ได้ถูกลบ", n.exercises.length === 2, String(n.exercises.length));
}

console.log("\n═══ 3. ข้ามไม่ใช่การลบ — ท่าและประวัติต้องอยู่ครบ ═══");
{
  const d = mk();
  d.history = { dl: [{ date: "2026-08-11", sets: [{ weight: 70, reps: 5 }] }] };
  toggleSkip(d, "dl");
  ok("ท่ายังอยู่ในโปรแกรม", d.exercises.some((e) => e.id === "dl"));
  ok("ประวัติเดิมไม่ถูกแตะ", d.history.dl[0].sets[0].weight === 70);
  ok("ไม่มีอะไรถูก archive", d.historyArchive === undefined || Object.keys(d.historyArchive).length === 0);
}

console.log("\n═══ 4. ความคืบหน้าของวัน — ท่าที่ข้ามต้องไม่ถูกนับ ═══");
{
  // ตรรกะเดียวกับที่ TodayView ใช้: กรองท่าที่ข้ามออกก่อนรวมเซต
  const d = mk();
  const doneCount = (id) => ((d.history[id] ?? []).find((s) => s.date === todayStr())?.sets.filter(Boolean).length ?? 0);
  const progress = () => {
    const sk = skippedToday(d);
    const counted = d.exercises.filter((e) => !sk.includes(e.id));
    const total = counted.reduce((a, e) => a + e.sets, 0);
    const done = counted.reduce((a, e) => a + Math.min(doneCount(e.id), e.sets), 0);
    return { total, done, allDone: total > 0 && done >= total };
  };

  ok("ยังไม่ข้าม: ต้องทำ 7 เซต", progress().total === 7, String(progress().total));

  toggleSkip(d, "dl");
  ok("ข้ามเดดลิฟต์แล้ว: เหลือ 3 เซต", progress().total === 3, String(progress().total));

  // ทำ T-bar Row ครบ 3 เซต -> วันนี้ควรจบ ทั้งที่ไม่ได้แตะเดดลิฟต์เลย
  d.history = { row: [{ date: todayStr(), sets: [{ weight: 15, reps: 8 }, { weight: 15, reps: 8 }, { weight: 15, reps: 8 }] }] };
  ok("ทำท่าที่เหลือครบ = วันนี้จบ (ขึ้น CLEAR)", progress().allDone, JSON.stringify(progress()));

  // เอาเดดลิฟต์กลับมา -> ต้องกลับไปไม่จบ
  toggleSkip(d, "dl");
  ok("เอากลับมาแล้ว = ยังไม่จบ", !progress().allDone && progress().total === 7, JSON.stringify(progress()));
}
{
  // ข้ามทุกท่า = ไม่มีอะไรให้ทำ ต้องไม่ขึ้น CLEAR (total 0) และต้องไม่หารศูนย์พัง
  const d = mk();
  toggleSkip(d, "dl");
  toggleSkip(d, "row");
  const sk = skippedToday(d);
  const counted = d.exercises.filter((e) => !sk.includes(e.id));
  const total = counted.reduce((a, e) => a + e.sets, 0);
  ok("ข้ามหมดทุกท่า = 0 เซต ไม่ขึ้น CLEAR", total === 0 && !(total > 0));
}

console.log("\n═══ 5. ข้อมูลพิกลต้องไม่ทำแอปล้ม ═══");
{
  const bad = [
    { date: todayStr(), map: {}, skipped: "ไม่ใช่ array" },
    { date: todayStr(), map: {}, skipped: [1, 2, 3] },
    { date: todayStr(), map: {}, skipped: [null] },
  ];
  for (const sw of bad) {
    const d = createDefault();
    d.swaps = sw;
    const n = normalizeData(JSON.parse(JSON.stringify(d)));
    ok(`skipped = ${JSON.stringify(sw.skipped).slice(0, 18)} -> ถูกทิ้ง ไม่ crash`, n.swaps?.skipped === undefined, JSON.stringify(n.swaps?.skipped));
  }
  const good = createDefault();
  good.swaps = { date: todayStr(), map: {}, skipped: ["dl"] };
  ok("ค่าที่ถูกต้องต้องรอด", normalizeData(JSON.parse(JSON.stringify(good))).swaps?.skipped?.[0] === "dl");
}

console.log("\n═══ 6. ไม่ย้ายข้ามเครื่อง (เป็นของชั่วคราวรายวัน เหมือน swaps) ═══");
{
  const d = mk();
  toggleSkip(d, "dl");
  ok("swaps ยังอยู่ในข้อมูลเครื่องนี้", d.swaps?.skipped?.length === 1);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
