// สถิติของท่า "นอกโปรแกรม" — ท่าที่เพิ่มชั่วคราวและท่าที่ใช้แทน
//
// เดิมหายไปทั้งหมด: bestLifts สร้าง lookup จาก data.exercises แล้วข้าม id ที่ไม่มีในนั้น
// ซึ่งท่าพวกนี้ใช้ id คนละชุด (x~... / origId~...) ผู้ใช้ยกจริงแต่ไม่เคยขึ้นสถิติเลย
//
// รัน: .\node_modules\.bin\esbuild.cmd scripts/test-outside.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { bestLifts } from "../src/lib/rank.ts";
import { addExtra, createDefault, createEmpty, extraIdFor, normalizeData, setSwap, swapIdFor } from "../src/lib/store.ts";

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}${extra ? "  << " + extra : ""}`); } };
const eq = (n, got, want) => ok(n, got === want, `ได้ ${JSON.stringify(got)} ต้องการ ${JSON.stringify(want)}`);

const _ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dk = (b) => { const d = new Date(); d.setDate(d.getDate() - b); return _ymd(d); };
const T = (name, over = {}) => ({ name, type: "weight", sets: 3, rmin: 8, rmax: 12, unit: "kg", inc: 2.5, ...over });

function base() {
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = [{ id: "bench", name: "Barbell Bench Press", day: "mon", type: "weight", sets: 3, rmin: 5, rmax: 8, unit: "kg", order: 0 }];
  d.history = { bench: [{ date: dk(3), sets: [{ weight: 80, reps: 5 }] }] };
  return d;
}

console.log("═══ 1. ท่าที่เพิ่มชั่วคราวต้องเข้าสถิติ ═══");
{
  const d = base();
  addExtra(d, T("Dumbbell Curl"));
  const xid = extraIdFor("Dumbbell Curl");
  d.history[xid] = [{ date: dk(3), sets: [{ weight: 30, reps: 10 }, { weight: 30, reps: 10 }] }];

  const best = bestLifts(d);
  eq("จับได้ทั้ง 2 ท่า", best.length, 2);
  const curl = best.find((b) => b.name === "Dumbbell Curl");
  ok("เจอชื่อจริงไม่ใช่ id", !!curl, best.map((b) => b.name).join(" | "));
  eq("น้ำหนักถูก", curl?.weight, 30);
  eq("นับเซตที่ทำน้ำหนักนั้นได้ถูก", curl?.sets, 2);
  eq("หน่วยถูก", curl?.unit, "kg");
}

console.log("\n═══ 2. ท่าที่ใช้แทนต้องเข้าสถิติ ═══");
{
  const d = base();
  setSwap(d, "bench", T("Push Up", { unit: "kg" }));
  const sid = swapIdFor("bench", "Push Up");
  d.history[sid] = [{ date: dk(3), sets: [{ weight: 60, reps: 12 }] }];

  const best = bestLifts(d);
  eq("จับได้ทั้ง 2 ท่า", best.length, 2);
  ok("เจอชื่อท่าที่ใช้แทน", best.some((b) => b.name === "Push Up"), best.map((b) => b.name).join(" | "));
}

console.log("\n═══ 3. ชื่อต้องรอดข้ามวัน (swaps ถูกล้างทุกวัน) ═══");
{
  const d = base();
  addExtra(d, T("Cable Lateral Raise"));
  const xid = extraIdFor("Cable Lateral Raise");
  d.history[xid] = [{ date: dk(3), sets: [{ weight: 7.5, reps: 15 }] }];
  // จำลองวันเปลี่ยน: swaps ของเมื่อวานจะถูกล้างใน normalizeData
  d.swaps.date = dk(1);
  const after = normalizeData(JSON.parse(JSON.stringify(d)));

  eq("swaps ถูกล้างแล้วจริง", after.swaps, undefined);
  ok("แต่ชื่อยังอยู่", !!after.exNames?.[xid], JSON.stringify(after.exNames));
  ok("สถิติยังเห็นท่านั้น", bestLifts(after).some((b) => b.name === "Cable Lateral Raise"), bestLifts(after).map((b) => b.name).join(" | "));
}

console.log("\n═══ 3.5 ท่าเดียวกันหลายวันต้องเหลือบรรทัดเดียว ═══");
{
  // ท่าที่อยู่ทั้งวันหนักและวันปริมาณใช้ id คนละตัว เคยกลายเป็น 2 แถวในสถิติ
  // ผู้ใช้เห็นท่าเดียวโผล่ซ้ำด้วยตัวเลขคนละชุดแล้วไม่รู้ว่าอันไหนคือสถิติจริง
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = [
    { id: "a", name: "Cable Lateral Raise", day: "mon", type: "weight", sets: 4, rmin: 12, rmax: 12, unit: "kg", order: 0 },
    { id: "b", name: "Cable Lateral Raise", day: "thu", type: "weight", sets: 4, rmin: 15, rmax: 15, unit: "kg", order: 1 },
  ];
  d.history = {
    a: [{ date: dk(20), sets: [{ weight: 7.5, reps: 12 }] }],
    b: [{ date: dk(10), sets: [{ weight: 5, reps: 15 }] }],
  };
  const best = bestLifts(d);
  eq("เหลือบรรทัดเดียว", best.length, 1);
  eq("เก็บอันที่ 1RM สูงกว่า", best[0]?.weight, 7.5);
}

console.log("\n═══ 4. ข้อมูลพังต้องไม่ทำสถิติเพี้ยน ═══");
{
  const d = base();
  const bad = normalizeData({
    ...d,
    exNames: {
      "x~ok": { name: "Good Lift", unit: "kg" },
      "x~noname": { unit: "kg" },
      "x~empty": { name: "   " },
      "x~notobj": "PWNED",
      __proto__: { name: "hacked" },
    },
  });
  eq("รายการที่ไม่มีชื่อถูกทิ้ง", bad.exNames?.["x~noname"], undefined);
  eq("ชื่อว่างถูกทิ้ง", bad.exNames?.["x~empty"], undefined);
  eq("ค่าที่ไม่ใช่ object ถูกทิ้ง", bad.exNames?.["x~notobj"], undefined);
  eq("รายการที่ถูกต้องรอด", bad.exNames?.["x~ok"]?.name, "Good Lift");
  ok("ไม่มี prototype pollution", Object.getPrototypeOf(bad.exNames ?? {}) === Object.prototype);
}
{
  // ท่าที่ถูกลบและไม่มีชื่อเก็บไว้ = ต้องไม่โผล่เป็นชื่อประหลาด
  const d = base();
  d.history["x~ghost"] = [{ date: dk(3), sets: [{ weight: 999, reps: 1 }] }];
  const best = bestLifts(d);
  ok("ท่าไร้ชื่อไม่โผล่ในสถิติ", !best.some((b) => b.weight === 999), best.map((b) => `${b.name} ${b.weight}`).join(" | "));
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
