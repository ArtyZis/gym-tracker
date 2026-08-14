// การ์ดแชร์ในโหมดอังกฤษ — คำอังกฤษยาวกว่าไทยมาก ต้องไม่ล้นกรอบ
//
// การ์ดแชร์คือช่องทางโปรโมทหลัก (คนเห็นแอปครั้งแรกจากรูปที่เพื่อนโพสต์)
// ถ้าตัวหนังสือล้นออกนอกการ์ดหรือทับกัน คนเห็นก่อนเราเสมอ และแก้ไม่ทันแล้ว
//
// ไทย "สรุปสัปดาห์" = 12 ตัว · อังกฤษ "Weekly recap" = 12 ตัว
// แต่ "หลักฐานการฝึก" = 13 · "Training proof" = 14 และบางอันยาวกว่าเยอะ
// เช่น "แรงค์เป็นค่าประเมิน..." vs "Rank is an estimate from common strength standards"

import { setLang } from "../src/lib/i18n";
import { drawBestLiftsCard, drawRankCard, drawWeeklyCard, weeklyStats } from "../src/lib/share";
import { createDefault } from "../src/lib/store";

let pass = 0;
let fail = 0;
const ok = (n, c, extra = "") => {
  if (c) { pass++; console.log("  ✅ " + n); }
  else { fail++; console.log("  ❌ " + n + (extra ? " — " + extra : "")); }
};

// ── stub canvas: จดข้อความ + ความกว้างโดยประมาณ + การจัดวาง ──
let texts = [];
let curFont = "";
let curAlign = "left";
function makeCtx() {
  const grad = { addColorStop() {} };
  const noop = () => {};
  const ctx = {
    set font(v) { curFont = v; }, get font() { return curFont; },
    set textAlign(v) { curAlign = v; }, get textAlign() { return curAlign; },
    fillStyle: "", strokeStyle: "", textBaseline: "",
    shadowColor: "", shadowBlur: 0, globalAlpha: 1, lineWidth: 1,
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    fillText: (t, x, y) => {
      const size = parseInt((curFont.match(/(\d+)px/) || [])[1] || "20", 10);
      // ประมาณความกว้าง: อักษรละติน ~0.55 ของขนาดฟอนต์
      texts.push({ t: String(t), x, y, size, align: curAlign, w: String(t).length * size * 0.55 });
    },
    fillRect: noop, strokeRect: noop, beginPath: noop, moveTo: noop, lineTo: noop, closePath: noop,
    arc: noop, roundRect: noop, setLineDash: noop, clip: noop, rect: noop,
    fill: noop, stroke: noop, save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    measureText: (t) => ({ width: String(t).length * 14 }),
  };
  return ctx;
}
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: makeCtx }) };

function mkData() {
  const d = createDefault();
  d.exercises = [
    { id: "a", name: "Barbell Bench Press", day: "mon", type: "weight", sets: 4, rmin: 5, rmax: 8, inc: 2.5, unit: "kg", order: 0 },
    { id: "b", name: "Barbell Squat", day: "wed", type: "weight", sets: 4, rmin: 5, rmax: 8, inc: 5, unit: "kg", order: 0 },
    { id: "c", name: "Deadlift", day: "fri", type: "weight", sets: 3, rmin: 3, rmax: 5, inc: 5, unit: "kg", order: 0 },
    { id: "e", name: "Overhead Press", day: "mon", type: "weight", sets: 3, rmin: 6, rmax: 10, inc: 2.5, unit: "kg", order: 1 },
    { id: "f", name: "Romanian Deadlift With A Very Long Name", day: "wed", type: "weight", sets: 3, rmin: 8, rmax: 12, inc: 2.5, unit: "kg", order: 1 },
  ];
  const today = new Date();
  const ds = (n) => { const x = new Date(today); x.setDate(x.getDate() - n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
  d.history = {
    a: [{ date: ds(2), sets: [{ weight: 100, reps: 8 }, { weight: 100, reps: 7 }] }],
    b: [{ date: ds(4), sets: [{ weight: 140, reps: 5 }, { weight: 140, reps: 5 }] }],
    c: [{ date: ds(6), sets: [{ weight: 180, reps: 3 }] }],
    e: [{ date: ds(2), sets: [{ weight: 60, reps: 8 }] }],
    f: [{ date: ds(4), sets: [{ weight: 90, reps: 10 }] }],
  };
  d.bodyweight = [{ date: ds(1), kg: 78 }];
  return d;
}

const CARD_W = 1080;
const MARGIN = 40; // เผื่อขอบขั้นต่ำ

function checkCard(label, draw) {
  texts = [];
  draw();
  ok(`${label}: วาดแล้วมีข้อความออกมา`, texts.length > 0, `ได้ ${texts.length}`);

  // 1. ไม่ล้นซ้าย/ขวา
  const over = texts.filter((t) => {
    if (!t.t.trim()) return false;
    const left = t.align === "center" ? t.x - t.w / 2 : t.align === "right" ? t.x - t.w : t.x;
    const right = left + t.w;
    return left < MARGIN - 20 || right > CARD_W - MARGIN + 20;
  });
  ok(`${label}: ไม่มีข้อความล้นกรอบ`, over.length === 0,
    over.slice(0, 2).map((t) => `"${t.t.slice(0, 40)}" @${Math.round(t.x)} กว้าง~${Math.round(t.w)}`).join(" | "));

  // 2. ไม่มีข้อความว่าง/undefined หลุดลงการ์ด
  const junk = texts.filter((t) => /undefined|null|NaN/.test(t.t));
  ok(`${label}: ไม่มี undefined/NaN โผล่`, junk.length === 0, junk.slice(0, 3).map((t) => t.t).join(" | "));

  // 3. ไม่มีไทยหลุดในโหมดอังกฤษ
  const thai = texts.filter((t) => /[฀-฾เ-๿]/.test(t.t));
  ok(`${label}: ไม่มีภาษาไทยหลุด`, thai.length === 0, thai.slice(0, 3).map((t) => t.t).join(" | "));

  return texts.length;
}

console.log("═══ การ์ดแชร์ภาษาอังกฤษ ═══");
setLang("en");
const data = mkData();
{
  checkCard("การ์ดแรงค์", () => drawRankCard(data));
  checkCard("การ์ดสถิติสูงสุด", () => drawBestLiftsCard(data));
  checkCard("การ์ดสรุปสัปดาห์", () => drawWeeklyCard(weeklyStats(data), "#8b6bff"));
}

console.log("\n═══ การ์ดแชร์ภาษาไทย (กันของเดิมพัง) ═══");
setLang("th");
{
  texts = [];
  drawRankCard(data);
  const over = texts.filter((t) => t.t.trim() && (t.align === "center" ? t.x - t.w / 2 : t.x) < MARGIN - 20);
  ok("การ์ดแรงค์ไทย: ไม่ล้นซ้าย", over.length === 0, over.slice(0, 2).map((t) => t.t).join(" | "));
  ok("การ์ดแรงค์ไทย: ยังมีข้อความไทย", texts.some((t) => /[฀-฾เ-๿]/.test(t.t)));
}

console.log("\n═══ เคสสุดขั้ว: ไม่มีข้อมูลเลย ═══");
{
  setLang("en");
  const empty = createDefault();
  for (const [name, fn] of [
    ["การ์ดแรงค์", () => drawRankCard(empty)],
    ["การ์ดสถิติ", () => drawBestLiftsCard(empty)],
    ["การ์ดสัปดาห์", () => drawWeeklyCard(weeklyStats(empty), "#8b6bff")],
  ]) {
    let threw = null;
    try { texts = []; fn(); } catch (e) { threw = e.message; }
    ok(`${name} ตอนไม่มีข้อมูล ไม่ crash`, threw === null, threw);
    ok(`${name} ตอนไม่มีข้อมูล ไม่มี undefined/NaN`, !texts.some((t) => /undefined|NaN/.test(t.t)),
      texts.filter((t) => /undefined|NaN/.test(t.t)).slice(0, 2).map((t) => t.t).join(" | "));
  }
}

setLang("th");
console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
