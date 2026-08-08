// การ์ดแชร์ — เลย์เอาต์ต้องไม่ล้นและตัวหนังสือต้องไม่ทับตรา
//
// ทำไมต้องเทสต์: การ์ดวาดด้วย canvas ไม่มี layout engine มาช่วย ทุกพิกัดคือตัวเลขที่เขียนเอง
// ถ้าคำนวณผิดจะเห็นก็ต่อเมื่อผู้ใช้แชร์รูปออกไปแล้ว — สายเกินแก้
// เคสจริงที่พลาดมาแล้ว: ชื่อแรงค์ทับดาวใต้ตรา และรายการท่าล้นออกนอกการ์ด
//
// รัน: .\node_modules\.bin\esbuild.cmd scripts/test-sharecard.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs

import { drawBestLiftsCard, drawRankCard } from "../src/lib/share.ts";
import { createDefault, createEmpty } from "../src/lib/store.ts";

let pass = 0, fail = 0;
const ok = (n, c, extra = "") => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n}${extra ? "  << " + extra : ""}`); } };

// ── stub canvas: ไม่ได้วาดจริง แค่จดว่าข้อความถูกวางที่ y เท่าไหร่ ──
const texts = [];
function makeCtx() {
  const grad = { addColorStop() {} };
  const noop = () => {};
  return {
    fillStyle: "", strokeStyle: "", font: "", textAlign: "", textBaseline: "",
    shadowColor: "", shadowBlur: 0, globalAlpha: 1, lineWidth: 1,
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    fillText: (t, x, y) => texts.push({ t, x, y }),
    fillRect: noop, strokeRect: noop, beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
    fill: noop, stroke: noop, save: noop, restore: noop, translate: noop, scale: noop,
    measureText: (t) => ({ width: t.length * 14 }),
  };
}
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: makeCtx }),
};

const dk = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return d.toISOString().slice(0, 10); };

// ท่าหลัก 4 ท่า (ครบทุก LIFT_STANDARDS) + ท่าเสริมอีก 7 = สถิติ 11 ท่า
const MAIN = ["Barbell Squat", "Barbell Bench Press", "Deadlift", "Overhead Press"];
const EXTRA = ["Barbell Row", "Pull Up", "Dumbbell Curl", "Leg Press", "Lat Pulldown", "Dips", "Leg Curl"];

function mk(names, bodyweight = 61.6) {
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = names.map((name, i) => ({
    id: `e${i}`, name, day: "mon", type: "weight", sets: 3, rmin: 5, rmax: 8, unit: "kg", order: i,
  }));
  d.history = {};
  names.forEach((_, i) => {
    d.history[`e${i}`] = [{ date: dk(3), sets: [{ weight: 100 - i * 5, reps: 5 }, { weight: 100 - i * 5, reps: 5 }] }];
  });
  d.bodyweight = bodyweight ? [{ date: dk(1), kg: bodyweight }] : [];
  return d;
}

// ขอบเขตจริงของตรา (ต้องตรงกับค่าใน drawRankCard: EMB_CY / EMB_R)
const EMB_BOTTOM = 320 + 118 + 118 * 0.36 + (118 / 44) * 6; // ดาวใต้ตรา + ระยะปลายดาว

// สัดส่วนที่โซเชียลไม่ครอปทิ้ง — การ์ดต้องเป็นหนึ่งในนี้เท่านั้น
const OK_RATIOS = [1.25, 1.3333]; // 4:5 · 3:4

function check(label, data) {
  texts.length = 0;
  const c = drawRankCard(data);
  const lowest = Math.max(...texts.map((t) => t.y));
  // ตัวอักษรแรงค์ (1 ตัว) วาดอยู่กลางตราโดยตั้งใจ ไม่ใช่ข้อความที่ทับ — ไม่เอามานับ
  const firstBelowEmblem = Math.min(...texts.filter((t) => t.y > 200 && t.t.length > 1).map((t) => t.y));
  console.log(`\n── ${label} · การ์ด ${c.width}×${c.height} · ข้อความล่างสุด y=${lowest} ──`);
  const ratio = c.height / c.width;
  ok(`${label}: ข้อความไม่ล้นการ์ด`, lowest <= c.height - 40, `y=${lowest} สูง=${c.height}`);
  ok(`${label}: ไม่มีข้อความทับตรา/ดาว`, firstBelowEmblem > EMB_BOTTOM, `ข้อความแรกใต้ตรา y=${firstBelowEmblem} ตราจบที่ ${EMB_BOTTOM.toFixed(1)}`);
  ok(`${label}: สัดส่วนเป็นค่ามาตรฐาน`, OK_RATIOS.some((r) => Math.abs(ratio - r) < 0.01), `ได้ ${ratio.toFixed(3)}`);
  return c.height;
}

console.log("═══ การ์ดแรงค์: เลย์เอาต์ตามปริมาณข้อมูล ═══");
const hFull = check("ข้อมูลครบ (ท่าหลัก 4 + สถิติ 11)", mk([...MAIN, ...EXTRA]));
const hMid = check("ข้อมูลปานกลาง (ท่าหลัก 2 + สถิติ 3)", mk([MAIN[0], MAIN[1], EXTRA[0]]));
const hThin = check("ข้อมูลน้อย (ไม่มีน้ำหนักตัว 2 ท่า)", mk([EXTRA[0], EXTRA[1]], 0));

console.log("\n═══ การ์ดแรงค์เป็น 4:5 เสมอ ไม่ว่าข้อมูลเยอะแค่ไหน ═══");
ok("ข้อมูลครบ -> 4:5", hFull === 1350, `${hFull}`);
ok("ข้อมูลปานกลาง -> 4:5", hMid === 1350, `${hMid}`);
ok("ข้อมูลน้อย -> 4:5", hThin === 1350, `${hThin}`);

console.log("\n═══ การ์ดแรงค์ต้องมีแค่แรงค์ + ท่าหลัก + หลักฐาน ═══");
{
  texts.length = 0;
  drawRankCard(mk([...MAIN, ...EXTRA]));
  const all = texts.map((t) => t.t);
  ok("ไม่มีบล็อกสถิติสูงสุดรายท่าแล้ว", !all.some((t) => t === "สถิติสูงสุดที่เคยทำ"), all.join(" | ").slice(0, 120));
  ok("ไม่มีชื่อท่าเสริมหลุดมา", !all.some((t) => t === "Leg Press" || t === "Dumbbell Curl"));
  ok("ยังมีท่าหลักครบ", ["สควอท", "เบนช์", "เดดลิฟต์", "ดันบ่า"].every((l) => all.includes(l)), all.join(" | "));
  ok("มีหัวข้อหลักฐานการฝึก", all.includes("หลักฐานการฝึก"));
  ok("มีป้ายจำนวนวันที่ฝึกจริง", all.includes("วันที่ฝึกจริง"));
  ok("มีป้ายจำนวนเซตที่บันทึก", all.includes("เซตที่บันทึก"));
  ok("บอกวันที่บันทึกครั้งแรก", all.some((t) => /^บันทึกครั้งแรก \d{4}-\d{2}-\d{2}$/.test(t)), all.join(" | ").slice(-100));
}

console.log("\n═══ กรอบหลักฐานต้องไม่ชนรายการท่าหลัก ═══");
{
  // ท่าหลัก 4 ท่า = เคสที่รายการยาวสุด ถ้าไม่ชนตรงนี้ก็ไม่ชนเคสอื่น
  texts.length = 0;
  drawRankCard(mk([...MAIN, ...EXTRA]));
  const PROOF_TOP = 1350 - 430; // ต้องตรงกับ proofTop ใน drawRankCard
  const mains = texts.filter((t) => ["สควอท", "เบนช์", "เดดลิฟต์", "ดันบ่า"].includes(t.t));
  const lastMain = Math.max(...mains.map((t) => t.y));
  const head = texts.find((t) => t.t === "หลักฐานการฝึก");
  ok("ท่าหลักแถวสุดท้ายอยู่เหนือกรอบ", lastMain < PROOF_TOP - 20, `แถวสุดท้าย y=${lastMain} กรอบเริ่ม ${PROOF_TOP}`);
  ok("หัวข้อหลักฐานอยู่ในกรอบ", head.y > PROOF_TOP && head.y < PROOF_TOP + 190, `y=${head.y}`);
  const firstDate = texts.find((t) => /^บันทึกครั้งแรก/.test(t.t));
  ok("บรรทัดวันแรกอยู่ใต้กรอบ ไม่ทับตัวเลข", firstDate.y > PROOF_TOP + 190, `y=${firstDate.y} กรอบจบ ${PROOF_TOP + 190}`);
}

console.log("\n═══ มงกุฎแรงค์ S ต้องไม่ชนหัวข้อบนสุด ═══");
{
  // แรงค์ S มีมงกุฎโผล่เหนือหกเหลี่ยม — ตราขยับขึ้นเมื่อไหร่ มงกุฎจะไปชนหัวข้อก่อนเพื่อน
  const beast = mk(MAIN, 61.6);
  Object.values(beast.history).forEach((h, i) => {
    h[0].sets = h[0].sets.map(() => ({ weight: [200, 150, 240, 90][i], reps: 5 }));
  });
  texts.length = 0;
  drawRankCard(beast);
  const head = texts.find((t) => t.t.includes("S T R E N G T H"));
  const CROWN_TOP = 320 - 118 - 27 * (118 / 44);
  ok("ได้แรงค์ S จริง", texts.some((t) => t.t === "S"), texts.map((t) => t.t).slice(0, 4).join(" | "));
  ok("มงกุฎไม่ชนหัวข้อบนสุด", CROWN_TOP - head.y >= 10, `หัวข้อ y=${head.y} มงกุฎเริ่ม ${CROWN_TOP.toFixed(1)}`);
}

console.log("\n═══ การ์ดสถิติสูงสุด (ใบแยก) ═══");
{
  // 11 ท่า — ต้องใส่ได้หมดในใบเดียวโดยไม่ล้น
  texts.length = 0;
  const c = drawBestLiftsCard(mk([...MAIN, ...EXTRA]));
  const all = texts.map((t) => t.t);
  const lowest = Math.max(...texts.map((t) => t.y));
  const ratio = c.height / c.width;
  console.log(`   การ์ด ${c.width}×${c.height} · ข้อความล่างสุด y=${lowest} · ${all.filter((t) => /kg ×/.test(t)).length} แถว`);
  ok("สัดส่วนเป็นค่ามาตรฐาน", OK_RATIOS.some((r) => Math.abs(ratio - r) < 0.01), `ได้ ${ratio.toFixed(3)}`);
  ok("ข้อความไม่ล้นการ์ด", lowest <= c.height - 40, `y=${lowest} สูง=${c.height}`);
  ok("มีหัวเรื่องของตัวเอง", all.includes("สถิติสูงสุดที่เคยทำ"));
  ok("ใส่ครบ 11 ท่าไม่ต้องตัด", all.filter((t) => /kg × \d+ · \d+ เซต/.test(t)).length === 11, `ได้ ${all.filter((t) => /kg ×/.test(t)).length}`);
  ok("ไม่มีบรรทัด 'และอีก' เพราะใส่ครบแล้ว", !all.some((t) => /^และอีก/.test(t)));
  ok("มีจำนวนวันที่ฝึกจริงกำกับ", all.some((t) => /^ฝึกจริง \d+ วัน · \d+ เซต$/.test(t)), all.join(" | ").slice(-90));
}
{
  // ท่าเยอะเกินใส่ใบเดียว -> ต้องตัดแล้วบอกจำนวนที่เหลือ ไม่ปล่อยล้น
  const many = Array.from({ length: 40 }, (_, i) => `Exercise ${i + 1}`);
  texts.length = 0;
  const c = drawBestLiftsCard(mk(many, 61.6));
  const all = texts.map((t) => t.t);
  const lowest = Math.max(...texts.map((t) => t.y));
  console.log(`   40 ท่า -> การ์ด ${c.width}×${c.height} · ข้อความล่างสุด y=${lowest}`);
  ok("ยังไม่ล้นการ์ด", lowest <= c.height - 40, `y=${lowest} สูง=${c.height}`);
  ok("สัดส่วนยังมาตรฐาน", OK_RATIOS.some((r) => Math.abs(c.height / c.width - r) < 0.01), `${(c.height / c.width).toFixed(3)}`);
  ok("บอกจำนวนท่าที่ตัดออก", all.some((t) => /^และอีก \d+ ท่า$/.test(t)), all.join(" | ").slice(-90));
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
