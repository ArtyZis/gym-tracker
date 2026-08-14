// วันชดเชย + กติกาสตรีคใหม่ — ตรรกะที่ผิดแล้วผู้ใช้ไม่มีทางรู้ว่าผิด
//
// กติกาที่ต้องเป็นจริงเสมอ:
//   วันฝึก + ฝึกแล้ว        -> +1
//   วันพัก                  -> ไม่บวก ไม่ตัด
//   วันฝึก + ไม่ได้ฝึก      -> ตัด เว้นแต่ชดเชยครบทีหลัง
//   ชดเชย 1 ครั้ง           -> ลบล้างได้ 1 วัน และต้องเกิด "หลัง" วันที่พลาด
//
// รัน: .\node_modules\.bin\esbuild.cmd scripts/test-makeup.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { computeStreak } from "../src/lib/streak.ts";
import {
  JS_DAYS,
  addMakeup,
  createDefault,
  createEmpty,
  effectiveExercisesForDay,
  makeupSlots,
  normalizeData,
  removeMakeup,
} from "../src/lib/store.ts";

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}${extra ? "  << " + extra : ""}`); } };
const eq = (n, got, want) => ok(n, got === want, `ได้ ${JSON.stringify(got)} ต้องการ ${JSON.stringify(want)}`);

const _ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dk = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return _ymd(d); };
const slotBack = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return JS_DAYS[d.getDay()]; };

const CHEST = slotBack(0); // ช่องของวันนี้
const LEG = slotBack(2); // ช่องของ 2 วันก่อน (และของ 9 วันก่อน — ห่างกัน 7 วันพอดี)

// โปรแกรม 2 วัน: อกวันนี้ · ขาอีกวัน · ที่เหลือเป็นวันพัก
function mk({ chestDates = [], legDates = [], makeup = {} } = {}) {
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = [
    { id: "chest", name: "Barbell Bench Press", day: CHEST, type: "weight", sets: 2, rmin: 5, rmax: 8, unit: "kg", order: 0 },
    { id: "leg", name: "Barbell Squat", day: LEG, type: "weight", sets: 2, rmin: 5, rmax: 8, unit: "kg", order: 1 },
  ];
  const full = (date) => ({ date, sets: [{ weight: 80, reps: 5 }, { weight: 80, reps: 5 }] });
  d.history = { chest: chestDates.map(full), leg: legDates.map(full) };
  d.makeup = Object.keys(makeup).length ? makeup : undefined;
  return d;
}

console.log("═══ 1. ท่าที่ดึงมาชดเชยต้องโผล่ในวันนี้ ═══");
{
  const d = mk();
  eq("ยังไม่ดึง = เห็นแค่ท่าของวันนี้", effectiveExercisesForDay(d, CHEST, true).length, 1);
  addMakeup(d, LEG);
  const list = effectiveExercisesForDay(d, CHEST, true);
  eq("ดึงวันขามาแล้ว = เห็น 2 ท่า", list.length, 2);
  eq("ท่าที่ชดเชยติดป้ายว่ามาจากวันไหน", list.find((e) => e.id === "leg")?.makeupOf, LEG);
  eq("ใช้ id จริงของท่า ไม่สร้างใหม่ (ประวัติ/สถิติจึงต่อเนื่อง)", list.find((e) => e.makeupOf)?.id, "leg");
  ok("วันอื่นที่ไม่ใช่วันนี้ไม่เห็นท่าชดเชย", effectiveExercisesForDay(d, LEG, false).every((e) => !e.makeupOf));
  removeMakeup(d, LEG);
  eq("เอาออกแล้วกลับไปเหลือท่าของวันนี้", effectiveExercisesForDay(d, CHEST, true).length, 1);
  eq("เอาออกแล้ว key ว่างต้องถูกลบทิ้ง ไม่เหลือ object เปล่า", d.makeup?.[dk(0)], undefined);
}

console.log("\n═══ 2. วันพักไม่บวก ไม่ตัด · พลาดวันฝึก = ตัด ═══");
{
  // ฝึกอกวันนี้ + อกเมื่อ 7 วันก่อน (ช่องเดียวกัน) · ขาเมื่อ 2 วันก่อนไม่ได้ฝึก
  const d = mk({ chestDates: [dk(7), dk(0)] });
  eq("พลาดวันขา = สตรีคขาด เหลือแค่วันนี้", computeStreak(d).current, 1);
}
{
  // ไม่มีวันไหนพลาดเลย: ฝึกอกวันนี้ · ขาเมื่อ 2 วันก่อน · อกเมื่อ 7 วันก่อน
  const d = mk({ chestDates: [dk(7), dk(0)], legDates: [dk(2)] });
  eq("ฝึกครบทุกวันฝึก = นับเฉพาะวันที่ฝึกจริง 3 วัน", computeStreak(d).current, 3);
}

console.log("\n═══ 3. ชดเชยครบแล้วสตรีคต้องต่อ ═══");
{
  // พลาดขาเมื่อ 2 วันก่อน แล้วมาเล่นชดเชยครบวันนี้
  const d = mk({ chestDates: [dk(7), dk(0)], legDates: [dk(0)], makeup: { [dk(0)]: [LEG] } });
  eq("ชดเชยครบ = วันที่พลาดถูกลบล้าง สตรีคต่อถึงวันอก", computeStreak(d).current, 2);
}
{
  // ชดเชยแต่ทำไม่ครบเซต -> ยังถือว่าพลาด
  const d = mk({ chestDates: [dk(7), dk(0)], makeup: { [dk(0)]: [LEG] } });
  d.history.leg = [{ date: dk(0), sets: [{ weight: 80, reps: 5 }] }]; // ครบ 1 จาก 2 เซต
  eq("ชดเชยไม่ครบเซต = ยังขาดอยู่", computeStreak(d).current, 1);
}

console.log("\n═══ 4. เครดิตชดเชยใช้ได้ครั้งเดียว และต้องเกิดหลังวันที่พลาด ═══");
{
  // พลาดขา 2 ครั้ง (2 วันก่อน และ 9 วันก่อน) แต่ชดเชยแค่ครั้งเดียว
  const d = mk({ chestDates: [dk(14), dk(7), dk(0)], legDates: [dk(0)], makeup: { [dk(0)]: [LEG] } });
  eq("ชดเชยครั้งเดียวลบล้างได้วันเดียว หยุดที่วันพลาดที่เก่ากว่า", computeStreak(d).current, 2);
}
{
  // ชดเชยไว้ "ก่อน" วันที่พลาด — ลบล้างย้อนหลังไม่ได้
  const d = mk({ chestDates: [dk(7), dk(0)], legDates: [dk(8)], makeup: { [dk(8)]: [LEG] } });
  eq("ชดเชยก่อนวันที่พลาด = ช่วยไม่ได้", computeStreak(d).current, 1);
}

console.log("\n═══ 5. ติ๊กเซตของท่าที่ชดเชยต้องนับเป็นการฝึกของวันนั้น ═══");
{
  // วันนี้เป็นวันพัก (ไม่มีท่า) แต่ดึงขามาเล่นชดเชยครบ -> วันนี้ต้องนับเป็นวันฝึก
  const REST = slotBack(0);
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = [{ id: "leg", name: "Barbell Squat", day: slotBack(3), type: "weight", sets: 2, rmin: 5, rmax: 8, unit: "kg", order: 0 }];
  d.history = { leg: [{ date: dk(0), sets: [{ weight: 80, reps: 5 }, { weight: 80, reps: 5 }] }] };
  d.makeup = { [dk(0)]: [slotBack(3)] };
  ok("วันพักที่เอามาชดเชย นับเป็นวันฝึก", computeStreak(d).current >= 1, `ได้ ${computeStreak(d).current}`);
  ok("ช่องวันนี้ไม่ใช่ช่องของท่าที่เล่น (เป็นการชดเชยจริง)", REST !== slotBack(3));
}

console.log("\n═══ 6. ข้อมูลชดเชยที่พังต้องไม่ทำสตรีคเพี้ยน ═══");
{
  const bad = normalizeData({
    ...mk({ chestDates: [dk(0)] }),
    makeup: {
      "ไม่ใช่วันที่": [LEG],
      [dk(0)]: ["PWNED", LEG, LEG],
      [dk(1)]: "ไม่ใช่ array",
      __proto__: [LEG],
    },
  });
  eq("คีย์ที่ไม่ใช่รูปแบบวันที่ถูกทิ้ง", bad.makeup?.["ไม่ใช่วันที่"], undefined);
  eq("ช่องวันที่ไม่รู้จักถูกกรองออก", bad.makeup?.[dk(0)]?.length, 1);
  eq("ค่าซ้ำถูกยุบเหลืออันเดียว", bad.makeup?.[dk(0)]?.[0], LEG);
  eq("ค่าที่ไม่ใช่ array ถูกทิ้ง", bad.makeup?.[dk(1)], undefined);
  ok("ไม่มี prototype pollution", Object.getPrototypeOf(bad.makeup ?? {}) === Object.prototype);
  ok("สตรีคยังคำนวณได้ไม่ crash", Number.isFinite(computeStreak(bad).current));
}
{
  const d = mk({ chestDates: [dk(0)] });
  d.makeup = { [dk(0)]: [LEG] }; // ดึงวันขามาแต่ไม่ได้เล่นสักเซต
  eq("ดึงมาแล้วไม่เล่น = ไม่ได้เครดิต", makeupSlots(d).length, 1);
  eq("และไม่ทำให้สตรีคพองขึ้น", computeStreak(d).current, 1);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
