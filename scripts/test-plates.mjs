// แผ่นน้ำหนักที่ยิมมีจริง — คำแนะนำต้องเป็นตัวเลขที่ใส่แผ่นได้ ไม่ใช่ตัวเลขสวยบนจอ
//
// สองเรื่องที่เคยผิดกับการเล่นจริง:
//   1. แนะนำให้ขึ้นทีละ 2.5 kg เสมอ ทั้งที่ยิมไม่มีแผ่น 1.25 (ใส่แผ่นทีละคู่ ขึ้นต่ำสุด 10)
//   2. คิดว่าน้ำหนักที่บันทึกรวมบาร์แล้ว ทั้งที่คนจำจาก "แผ่นที่ใส่" และเลกเพรสไม่รู้น้ำหนักเครื่อง
//
// รัน: .\node_modules\.bin\esbuild.cmd scripts/test-plates.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { barbellStep, plateText, stepFor, suggestTarget } from "../src/lib/progression.ts";
import { createDefault, createEmpty } from "../src/lib/store.ts";

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}${extra ? "  << " + extra : ""}`); } };
const eq = (n, got, want) => ok(n, got === want, `ได้ ${JSON.stringify(got)} ต้องการ ${JSON.stringify(want)}`);

const dk = (b) => { const d = new Date(); d.setDate(d.getDate() - b); return d.toISOString().slice(0, 10); };

function mk(exOver = {}, settings = {}, sets = null) {
  const d = Object.assign(createDefault(), createEmpty());
  const ex = { id: "e", name: "Barbell Squat", day: "mon", type: "weight", sets: 5, rmin: 5, rmax: 5, unit: "kg", inc: 2.5, order: 0, ...exOver };
  d.exercises = [ex];
  Object.assign(d.settings, settings);
  d.history = sets ? { e: [{ date: dk(7), sets }] } : {};
  return { d, ex };
}
const full = (w, reps, n) => Array.from({ length: n }, () => ({ weight: w, reps }));

console.log("═══ 1. สเต็ปต้องตามแผ่นที่ยิมมี ═══");
{
  const { d, ex } = mk();
  eq("ไม่ตั้งค่า = แผ่น 1.25 -> ขยับทีละ 2.5", stepFor(d, ex), 2.5);
}
{
  const { d, ex } = mk({}, { minPlateKg: 5 });
  eq("แผ่นเล็กสุด 5 -> ขยับทีละ 10", barbellStep(d), 10);
  eq("ท่าบาร์เบลใช้สเต็ป 10", stepFor(d, ex), 10);
}
{
  const { d, ex } = mk({ name: "Leg Press", machine: true, inc: 5 }, { minPlateKg: 5 });
  eq("ท่าเครื่องไม่โดนสเต็ปบาร์เบล", stepFor(d, ex), 5);
}
{
  const { d, ex } = mk({ name: "Incline DB Press", inc: 1 }, { minPlateKg: 5 });
  eq("ดัมเบลไม่โดนสเต็ปบาร์เบล", stepFor(d, ex), 1);
}

console.log("\n═══ 2. คำแนะนำต้องขึ้นเป็นสเต็ปที่ใส่แผ่นได้ ═══");
{
  // ทำครบทุกเซตที่ 40 -> ต้องขึ้นเป็น 50 ไม่ใช่ 42.5
  const { d, ex } = mk({}, { minPlateKg: 5 }, full(40, 5, 5));
  const t = suggestTarget(d, ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg`);
  eq("ขึ้นทีละ 10 ตามแผ่นที่มี", t.weight, 50);
  ok("ไม่เสนอครึ่งแผ่น", t.weight % 10 === 0, `${t.weight}`);
}
{
  // ยิมมีแผ่น 1.25 -> ขึ้น 2.5 ได้ตามปกติ
  const { d, ex } = mk({}, {}, full(40, 5, 5));
  eq("ยิมมีแผ่นเล็ก = ขึ้น 2.5 ได้", suggestTarget(d, ex).weight, 42.5);
}
{
  // ลดน้ำหนักก็ต้องลงสเต็ปที่ใส่ได้จริง
  const heavy = [{ weight: 60, reps: 3 }, { weight: 60, reps: 2 }, { weight: 60, reps: 2 }, { weight: 60, reps: 2 }, { weight: 60, reps: 1 }];
  const d = Object.assign(createDefault(), createEmpty());
  d.settings.minPlateKg = 5;
  const ex = { id: "e", name: "Barbell Squat", day: "mon", type: "weight", sets: 5, rmin: 5, rmax: 5, unit: "kg", inc: 2.5, order: 0 };
  d.exercises = [ex];
  d.history = { e: [{ date: dk(14), sets: heavy }, { date: dk(7), sets: heavy }] };
  const t = suggestTarget(d, ex);
  console.log(`   -> ${t.kind} · ${t.weight} kg`);
  eq("ลดลงเป็นสเต็ป 10", t.weight, 50);
}

console.log("\n═══ 3. ไม่นับน้ำหนักบาร์ (ค่าเริ่มต้น) ═══");
{
  const { d, ex } = mk();
  const txt = plateText(d, ex, 60);
  console.log(`   -> ${txt}`);
  ok("ไม่พูดถึงบาร์", !/บาร์/.test(txt ?? ""), txt);
  ok("บอกว่าใส่ข้างละเท่าไหร่", /ข้างละ/.test(txt ?? ""), txt);
  ok("หารสองจากตัวเลขที่กรอกตรงๆ (60 -> ข้างละ 30)", /25\+5/.test(txt ?? ""), txt);
}
{
  const { d, ex } = mk({}, { countBarWeight: true });
  const txt = plateText(d, ex, 60);
  console.log(`   -> ${txt}`);
  ok("เปิดโหมดนับบาร์แล้วกลับไปคิดแบบเดิม", /บาร์ 20/.test(txt ?? ""), txt);
}
{
  // ท่าเครื่องไม่ต้องมีข้อความแผ่นเลย
  const { d, ex } = mk({ name: "Leg Press", machine: true });
  eq("ท่าเครื่องไม่แสดงข้อความแผ่น", plateText(d, ex, 100), null);
}

console.log("\n═══ 4. ข้อมูลเก่าต้องไม่พัง ═══");
{
  const { d, ex } = mk({}, {}, full(40, 5, 5));
  ok("ไม่ตั้งค่าใหม่เลยก็ยังทำงานเหมือนเดิม", suggestTarget(d, ex).weight === 42.5);
  eq("countBarWeight ไม่ตั้ง = ไม่นับบาร์", d.settings.countBarWeight, undefined);
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
