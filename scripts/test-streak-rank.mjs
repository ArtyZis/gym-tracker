// สตรีคและแรงค์ — ตรรกะที่ผิดแล้วผู้ใช้ไม่มีทางรู้ว่าผิด
//
// รัน: .\node_modules\.bin\esbuild.cmd scripts/test-streak-rank.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { computeStreak } from "../src/lib/streak.ts";
import { computeRank, bestLifts } from "../src/lib/rank.ts";
import { createDefault, createEmpty, JS_DAYS } from "../src/lib/store.ts";

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}${extra ? "  << " + extra : ""}`); } };
const eq = (n, got, want) => ok(n, got === want, `ได้ ${JSON.stringify(got)} ต้องการ ${JSON.stringify(want)}`);

const dk = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return d.toISOString().slice(0, 10); };
const slotBack = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return JS_DAYS[d.getDay()]; };

function mk(exercises, historyByEx = {}) {
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = exercises.map((e, i) => ({ id: e.id, name: e.name, day: e.day, type: "weight", sets: e.sets ?? 3, rmin: 5, rmax: 8, unit: "kg", order: i }));
  d.history = historyByEx;
  d.bodyweight = [];
  return d;
}
const sess = (date, sets) => ({ date, sets });
const st = (w, r) => ({ weight: w, reps: r });

console.log("═══ 1. ติ๊กข้ามวันต้องไม่นับสตรีค ═══");
{
  // ท่าอยู่วันของ "เมื่อวาน" แต่ไปติ๊กเอาวันนี้ -> ไม่ควรนับเป็นวันฝึกของวันนี้
  const otherDay = slotBack(1);
  const d = mk([{ id: "a", name: "Barbell Squat", day: otherDay }], { a: [sess(dk(0), [st(100, 5)])] });
  eq("ติ๊กท่าของวันอื่นในวันนี้ = สตรีคไม่ขึ้น", computeStreak(d).current, 0);
}
{
  // ท่าอยู่วันของวันนี้ และติ๊กวันนี้ -> นับ
  const d = mk([{ id: "a", name: "Barbell Squat", day: slotBack(0) }], { a: [sess(dk(0), [st(100, 5)])] });
  ok("ติ๊กท่าของวันนี้ = สตรีคขึ้น", computeStreak(d).current >= 1, `ได้ ${computeStreak(d).current}`);
}

console.log("\n═══ 2. วันพักตามโปรแกรมต้องนับต่อเนื่อง ═══");
{
  // โปรแกรมมีท่าเฉพาะวันของ 2 วันก่อน · เมื่อวานกับวันนี้เป็นวันพัก
  const d = mk([{ id: "a", name: "Barbell Squat", day: slotBack(2) }], { a: [sess(dk(2), [st(100, 5)])] });
  const s = computeStreak(d);
  // วันฝึกเมื่อ 2 วันก่อน (นับ 1) + วันพัก 2 วัน (นับ 2) = 3
  eq("ฝึกแล้วตามด้วยวันพัก 2 วัน = สตรีค 3", s.current, 3);
}
{
  // วันนี้เป็นวันฝึกแต่ยังไม่ได้ฝึก -> ยังไม่ตัด แต่ยังไม่นับวันนี้
  const d = mk(
    [{ id: "a", name: "Barbell Squat", day: slotBack(0) }, { id: "b", name: "Deadlift", day: slotBack(1) }],
    { b: [sess(dk(1), [st(120, 5)])] },
  );
  eq("วันนี้เป็นวันฝึกแต่ยังไม่ฝึก = ยังไม่ตัดสตรีค แต่ไม่นับวันนี้", computeStreak(d).current, 1);
}

console.log("\n═══ 3. สถิติสูงสุดต่อท่า ═══");
{
  const d = mk([{ id: "a", name: "Barbell Bench Press", day: "mon" }], {
    a: [sess("2026-07-01", [st(60, 8), st(60, 6)]), sess("2026-07-08", [st(70, 5), st(70, 5), st(70, 4)])],
  });
  const [b] = bestLifts(d);
  eq("จับน้ำหนักสูงสุดได้ถูก", b.weight, 70);
  eq("จับจำนวนครั้งที่น้ำหนักนั้นได้ถูก", b.reps, 5);
  eq("นับเซตที่ทำน้ำหนักสูงสุดในวันนั้น", b.sets, 3);
  ok("ประเมิน 1RM มากกว่าน้ำหนักที่ยก", b.oneRM > 70, `ได้ ${b.oneRM}`);
}
{
  // น้ำหนักเท่ากันแต่ทำได้มากครั้งกว่า = สถิติที่ดีกว่า
  const d = mk([{ id: "a", name: "Barbell Bench Press", day: "mon" }], {
    a: [sess("2026-07-01", [st(70, 5)]), sess("2026-07-08", [st(70, 9)])],
  });
  eq("น้ำหนักเท่ากันแต่เรปมากกว่า = ถือเป็นสถิติใหม่", bestLifts(d)[0].reps, 9);
}

console.log("\n═══ 4. แรงค์ ═══");
{
  const d = mk([{ id: "a", name: "Barbell Squat", day: "mon" }], { a: [sess("2026-07-01", [st(100, 5)])] });
  d.bodyweight = [{ date: "2026-07-01", kg: 60 }];
  eq("ท่าหลักท่าเดียวยังให้แรงค์ไม่ได้", computeRank(d).rank, null);
}
{
  const d = mk(
    [{ id: "a", name: "Barbell Squat", day: "mon" }, { id: "b", name: "Barbell Bench Press", day: "tue" }],
    { a: [sess("2026-07-01", [st(60, 5)])], b: [sess("2026-07-01", [st(40, 5)])] },
  );
  d.bodyweight = [{ date: "2026-07-01", kg: 80 }];
  const r = computeRank(d);
  ok("ยกเบาเทียบน้ำหนักตัว = แรงค์ต่ำ", r.rank === "E" || r.rank === "D", `ได้ ${r.rank}`);
}
{
  const d = mk(
    [{ id: "a", name: "Barbell Squat", day: "mon" }, { id: "b", name: "Barbell Bench Press", day: "tue" }, { id: "c", name: "Deadlift", day: "wed" }],
    { a: [sess("2026-07-01", [st(150, 3)])], b: [sess("2026-07-01", [st(110, 3)])], c: [sess("2026-07-01", [st(190, 3)])] },
  );
  d.bodyweight = [{ date: "2026-07-01", kg: 70 }];
  const r = computeRank(d);
  ok("ยกหนักมากเทียบน้ำหนักตัว = แรงค์สูง", ["A", "S"].includes(r.rank), `ได้ ${r.rank} (${r.lifts.map(l => l.label + " " + l.ratio + "x " + l.rank).join(", ")})`);
  eq("คิดครบทั้ง 3 ท่าหลัก", r.lifts.length, 3);
}
{
  const d = mk([{ id: "a", name: "Barbell Squat", day: "mon" }, { id: "b", name: "Barbell Bench Press", day: "tue" }],
    { a: [sess("2026-07-01", [st(100, 5)])], b: [sess("2026-07-01", [st(70, 5)])] });
  d.bodyweight = [];
  eq("ไม่มีน้ำหนักตัว = ประเมินแรงค์ไม่ได้ ไม่ใช่เดา", computeRank(d).rank, null);
}

console.log(`\n═══ สรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail} ═══`);
process.exit(fail ? 1 : 0);
