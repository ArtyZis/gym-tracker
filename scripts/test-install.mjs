// ตัวชวนเพิ่มลงหน้าจอโฮม — กันบั๊กที่ทำให้ลูกค้าเสียข้อมูลหรือรำคาญจนเลิกใช้
//
// สองฝั่งพังคนละแบบ:
//   ขึ้นน้อยไป -> คนไม่ติดตั้ง -> iOS ลบ localStorage ทิ้งหลัง 7 วัน -> ประวัติหาย
//   ขึ้นบ่อยไป -> รำคาญ -> คนที่ติดตั้งแล้วยังโดนถาม = แอปดูโง่
//
// ⚠️ บรรทัด import ห้ามสลับลำดับ — _install-env ต้องมาก่อน install เสมอ (ดูเหตุผลในไฟล์นั้น)
import { env, fire, setEnv } from "./_install-env.mjs";
import { canInstallDirectly, clearSnooze, detectPlatform, isIOS, isInAppBrowser, isInstalled, onInstallReady, promptInstall, shouldPromptInstall, snooze } from "../src/lib/install";

let pass = 0;
let fail = 0;
const ok = (n, c, extra = "") => {
  if (c) { pass++; console.log("  ✅ " + n); }
  else { fail++; console.log("  ❌ " + n + (extra ? " — " + extra : "")); }
};

const SNOOZE_KEY = "gymtracker_install_snooze_v1";
const DAY = 86400000;

/** ล้าง deferred ที่ค้างจากเคสก่อน — appinstalled คือทางเดียวที่เคลียร์ได้จากนอกโมดูล */
const resetDeferred = () => fire("appinstalled");

const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
};

console.log("═══ 1. ติดตั้งแล้วต้องไม่ขึ้นอะไรอีก ═══");
{
  setEnv({ ua: UA.iphone, standalone: true });
  ok("iPhone เปิดจากหน้าจอโฮม = ถือว่าติดตั้งแล้ว", isInstalled());
  ok("ติดตั้งแล้ว + มีประวัติ ก็ยังไม่ขึ้น", shouldPromptInstall(true) === false);

  setEnv({ ua: UA.android, displayMode: true });
  ok("Android display-mode: standalone = ติดตั้งแล้ว", isInstalled());
  ok("ติดตั้งแล้วไม่ขึ้น", shouldPromptInstall(true) === false);

  setEnv({ ua: UA.iphone });
  ok("เปิดผ่าน Safari ธรรมดา = ยังไม่ติดตั้ง", isInstalled() === false);
}

console.log("\n═══ 2. จังหวะ: ยังไม่มีอะไรจะเสีย ห้ามขึ้น ═══");
{
  setEnv({ ua: UA.iphone });
  ok("เปิดครั้งแรกยังไม่ได้บันทึกอะไร = ไม่ขึ้น", shouldPromptInstall(false) === false);
  ok("บันทึกแล้ว = ขึ้น", shouldPromptInstall(true) === true);
}

console.log("\n═══ 3. กด 'ไว้ทีหลัง' ต้องเงียบจริง แล้วกลับมาที่ 7 วัน ═══");
{
  setEnv({ ua: UA.iphone });
  ok("ยังไม่เคยกด = ขึ้น", shouldPromptInstall(true) === true);
  snooze();
  ok("กดแล้วเงียบทันที", shouldPromptInstall(true) === false);
  ok("จำลง localStorage (ปิดแอปเปิดใหม่ยังเงียบ)", typeof env.store[SNOOZE_KEY] === "string");

  setEnv({ ua: UA.iphone, store: { [SNOOZE_KEY]: String(Date.now() - 6 * DAY) } });
  ok("ผ่านไป 6 วัน ยังเงียบ", shouldPromptInstall(true) === false);

  setEnv({ ua: UA.iphone, store: { [SNOOZE_KEY]: String(Date.now() - 8 * DAY) } });
  ok("ผ่านไป 8 วัน กลับมาถามใหม่", shouldPromptInstall(true) === true);

  // ค่าขยะต้องไม่ทำให้เงียบตลอดกาล — ข้อมูลหายเงียบๆ แย่กว่าถูกถามซ้ำ
  // ตัวสุดท้ายคือเวลาในอนาคต: เกิดได้จริงถ้าเคยตั้งนาฬิกาเครื่องเดินหน้าแล้วปรับกลับ
  const junks = ["", "abc", "0", "-1", "NaN", "Infinity", String(Date.now() + 400 * DAY)];
  for (const junk of junks) {
    setEnv({ ua: UA.iphone, store: { [SNOOZE_KEY]: junk } });
    ok(`ค่าเพี้ยน "${junk.slice(0, 14)}" ไม่ทำให้เงียบถาวร`, shouldPromptInstall(true) === true);
  }

  setEnv({ ua: UA.iphone, store: { [SNOOZE_KEY]: String(Date.now()) } });
  clearSnooze();
  ok("clearSnooze() ล้างได้จริง", shouldPromptInstall(true) === true);
}

console.log("\n═══ 4. แยกเครื่องให้ถูก — บอกผิดคือให้เขาหาปุ่มที่ไม่มีอยู่ ═══");
{
  const cases = [
    [UA.iphone, 0, "ios", "iPhone Safari"],
    ["Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1", 0, "ios", "iPad รุ่นเก่า"],
    [UA.android, 0, "android", "Android Chrome"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36", 0, "desktop", "Windows"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17 Safari/605.1.15", 0, "desktop", "Mac ธรรมดา"],
    // iPad รุ่นใหม่โกหกว่าเป็น Mac — ถ้าแยกไม่ออก คนใช้ iPad จะได้วิธีของ Chrome ซึ่งทำตามไม่ได้
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17 Safari/605.1.15", 5, "ios", "iPadOS ที่รายงานตัวเป็น Mac"],
  ];
  for (const [ua, touch, want, name] of cases) {
    setEnv({ ua, touch });
    ok(`${name} -> ${want}`, detectPlatform() === want, detectPlatform());
  }
}

console.log("\n═══ 5. เบราว์เซอร์ในแอป — จุดที่พังบ่อยที่สุด เพราะลิงก์ส่งกันทางไลน์ ═══");
{
  const inApp = [
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Line/14.2.0", "LINE บน iPhone"],
    ["Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 Line/14.2.0/IAB", "LINE บน Android"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/440.0]", "Facebook"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Instagram 300.0.0", "Instagram"],
    ["Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 [FB_IAB/Orca-Android;FBAV/440.0]", "Messenger"],
  ];
  for (const [ua, name] of inApp) {
    setEnv({ ua });
    ok(`${name} -> in-app (สอนให้ไปเปิดเบราว์เซอร์จริงก่อน)`, detectPlatform() === "in-app", detectPlatform());
  }

  // เบราว์เซอร์จริงต้องไม่ถูกจับผิด ไม่งั้นคนที่ติดตั้งได้จะโดนไล่ไปเปิด Safari ซ้ำซาก
  setEnv({ ua: UA.iphone });
  ok("Safari แท้ไม่ถูกจับเป็น in-app", isInAppBrowser() === false);
  setEnv({ ua: UA.android });
  ok("Chrome Android ไม่ถูกจับเป็น in-app (มีคำว่า Safari เหมือนกัน)", isInAppBrowser() === false);

  // คำเตือน "ข้อมูลจะหาย" ต้องผูกกับ iOS ไม่ใช่กับ platform
  // เปิดผ่านไลน์บน iPhone = platform in-app แต่ยังโดนกฎ 7 วันเต็มๆ ถ้าไม่เตือนคือปล่อยให้ข้อมูลหาย
  setEnv({ ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Line/14.2.0" });
  ok("ไลน์บน iPhone: platform = in-app", detectPlatform() === "in-app");
  ok("ไลน์บน iPhone: ยังนับเป็น iOS (ต้องได้คำเตือนข้อมูลหาย)", isIOS() === true);

  setEnv({ ua: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 Line/14.2.0/IAB" });
  ok("ไลน์บน Android: ไม่ใช่ iOS (ไม่ต้องขู่เรื่องข้อมูลหาย)", isIOS() === false);
}

console.log("\n═══ 6. ปุ่มติดตั้งจริงของ Android ═══");
{
  setEnv({ ua: UA.android });
  resetDeferred();
  ok("ก่อน event มา = ยังไม่มีปุ่ม (ต้องขึ้นวิธีทำมือแทน)", canInstallDirectly() === false);

  let notified = 0;
  const off = onInstallReady(() => notified++);
  let prevented = false;
  fire("beforeinstallprompt", {
    preventDefault: () => { prevented = true; },
    prompt: async () => {},
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });
  ok("กันแถบของเบราว์เซอร์เด้งเอง (เราเลือกจังหวะเอง)", prevented);
  ok("event มาแล้วมีปุ่มติดตั้ง", canInstallDirectly() === true);
  ok("แจ้ง React ให้ re-render ไม่งั้นปุ่มไม่มีวันโผล่", notified === 1, String(notified));

  ok("ผู้ใช้ตกลง = true", (await promptInstall()) === true);
  ok("ใช้ได้ครั้งเดียว กดซ้ำไม่ค้าง", (await promptInstall()) === false);
  off();

  // ยกเลิกจากกล่องของระบบ
  resetDeferred();
  fire("beforeinstallprompt", { prompt: async () => {}, userChoice: Promise.resolve({ outcome: "dismissed" }) });
  ok("ผู้ใช้ปฏิเสธ = false", (await promptInstall()) === false);

  // เบราว์เซอร์บางตัวโยน error ตอน prompt() — ห้ามทำแอปล้ม
  resetDeferred();
  fire("beforeinstallprompt", { prompt: async () => { throw new Error("nope"); }, userChoice: Promise.resolve({ outcome: "accepted" }) });
  ok("prompt() พังแล้วไม่ทำแอปล้ม", (await promptInstall()) === false);

  resetDeferred();
  ok("ไม่มี event เลย กดติดตั้งก็ไม่ล้ม", (await promptInstall()) === false);
}

console.log("\n═══ 7. ติดตั้งสำเร็จ = ล้างสถานะเงียบทิ้ง ═══");
{
  // ถ้าไม่ล้าง วันหนึ่งเขาลบไอคอนออก จะไม่ถูกเตือนอีกเลยจนกว่าจะครบ 7 วัน
  setEnv({ ua: UA.android, store: { [SNOOZE_KEY]: String(Date.now()) } });
  ok("ก่อนติดตั้ง: ยังเงียบอยู่", shouldPromptInstall(true) === false);
  fire("beforeinstallprompt", { prompt: async () => {}, userChoice: Promise.resolve({ outcome: "accepted" }) });
  fire("appinstalled");
  ok("ติดตั้งเสร็จ = ลบสถานะเงียบ", env.store[SNOOZE_KEY] === undefined);
  ok("ปุ่มติดตั้งหายไปหลังติดตั้งแล้ว", canInstallDirectly() === false);
}

console.log("\n═══ 8. localStorage ใช้ไม่ได้ (โหมดส่วนตัว) ต้องไม่ทำแอปล้ม ═══");
{
  setEnv({ ua: UA.iphone, throws: true });
  let crashed = false;
  let shown = null;
  try {
    snooze();
    clearSnooze();
    shown = shouldPromptInstall(true);
  } catch {
    crashed = true;
  }
  ok("อ่าน/เขียนไม่ได้ก็ไม่ล้ม", crashed === false);
  ok("เขียนไม่ได้ = ยังขึ้นคำชวนตามปกติ", shown === true, String(shown));
}

console.log(`\n${fail === 0 ? "✅" : "❌"} ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
