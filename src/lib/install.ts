// ชวนติดตั้งลงหน้าจอโฮม — ไม่ใช่เรื่องความสวย แต่เป็นเรื่องข้อมูลหาย
//
// iOS Safari ลบ localStorage ทิ้งเมื่อไม่ได้เปิดเว็บนั้นเกิน 7 วัน (นโยบาย ITP)
// **ยกเว้นเว็บที่ถูกเพิ่มลงหน้าจอโฮมแล้ว** — ข้อยกเว้นนี้คือทางรอดเดียวที่มี
// ลูกค้าที่จ่ายเงินแล้วไปเที่ยว 10 วัน กลับมาเจอประวัติหายหมด = ขอเงินคืน + รีวิวแย่
//
// สองระบบทำคนละเรื่องกันสิ้นเชิง:
//   Android มี beforeinstallprompt -> กดปุ่มเดียวติดตั้งได้จริง
//   iOS ไม่มี API เลย -> ทำได้แค่สอนว่ากดตรงไหน
//   เบราว์เซอร์ในแอป (ไลน์/เฟซ) เพิ่มลงหน้าจอไม่ได้เลย -> ต้องบอกให้ไปเปิด Safari ก่อน
// จุดสุดท้ายสำคัญที่สุดสำหรับตลาดไทย เพราะลิงก์ส่งกันทางไลน์

export type Platform = "ios" | "android" | "desktop" | "in-app";

const SNOOZE_KEY = "gymtracker_install_snooze_v1";
const SNOOZE_DAYS = 7;

// เก็บแยกจาก Data โดยตั้งใจ — "ติดตั้งแล้วหรือยัง" เป็นเรื่องของเครื่องนี้เครื่องเดียว
// ถ้าเก็บใน settings มันจะติดไปกับโค้ดย้ายเครื่อง แล้วเครื่องใหม่จะไม่ถูกเตือนทั้งที่ยังไม่ได้ติดตั้ง
const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string): void => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* โหมดส่วนตัวเขียนไม่ได้ — ไม่เป็นไร แค่จะถามซ้ำ */
  }
};

/** เปิดจากหน้าจอโฮมอยู่แล้วไหม — ถ้าใช่ ห้ามขึ้นอะไรทั้งนั้น */
export function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  // iOS ใช้ navigator.standalone (ไม่มีใน type มาตรฐาน) · ที่เหลือใช้ media query
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

const ua = (): string => (typeof navigator === "undefined" ? "" : navigator.userAgent);

/** เบราว์เซอร์ที่ฝังอยู่ในแอปอื่น — เพิ่มลงหน้าจอโฮมไม่ได้ */
export function isInAppBrowser(): boolean {
  // Line · Facebook · Instagram · Messenger — สี่ตัวที่คนไทยส่งลิงก์กันมากที่สุด
  return /\bLine\/|FBAN|FBAV|FB_IAB|Instagram|Messenger/i.test(ua());
}

/**
 * เป็นเครื่อง iOS ไหม — แยกจาก detectPlatform() โดยตั้งใจ
 *
 * คนเปิดผ่านไลน์บน iPhone ได้ platform เป็น "in-app" แต่ก็ยังโดนกฎ 7 วันของ iOS อยู่ดี
 * ถ้าใช้ตัวเดียวกันตัดสินทั้งสองเรื่อง เขาจะไม่ได้รับคำเตือนว่าข้อมูลจะหาย
 * — "ต้องกดตรงไหน" กับ "เสี่ยงข้อมูลหายไหม" เป็นคนละคำถาม
 */
export function isIOS(): boolean {
  const s = ua();
  // iPad รุ่นใหม่รายงานตัวเป็น Macintosh — แยกด้วยจำนวนจุดสัมผัส
  const iPadOS = /Macintosh/.test(s) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(s) || iPadOS;
}

export function detectPlatform(): Platform {
  if (isInAppBrowser()) return "in-app";
  if (isIOS()) return "ios";
  if (/Android/.test(ua())) return "android";
  return "desktop";
}

// ── ปุ่มติดตั้งจริงของ Android/Chrome ──
// เบราว์เซอร์ยิง event นี้ครั้งเดียวตอนโหลด ต้องรับไว้ก่อนถึงจะเรียกใช้ทีหลังได้
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // กันแถบของเบราว์เซอร์เด้งเอง เราจะเลือกจังหวะเอง
    deferred = e as InstallPromptEvent;
    listeners.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    clearSnooze();
    listeners.forEach((f) => f());
  });
}

/** ให้ React รู้เมื่อปุ่มติดตั้งพร้อมใช้ (event มาช้ากว่า render แรกเสมอ) */
export function onInstallReady(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const canInstallDirectly = (): boolean => deferred !== null;

/** กดติดตั้งจริง — คืน true ถ้าผู้ใช้ตกลง */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  try {
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    return outcome === "accepted";
  } catch {
    return false;
  }
}

// ── เลื่อนไว้ทีหลัง ──
export function snooze(): void {
  write(SNOOZE_KEY, String(Date.now()));
}

export function clearSnooze(): void {
  try {
    localStorage.removeItem(SNOOZE_KEY);
  } catch {
    /* ข้าม */
  }
}

function snoozed(): boolean {
  const at = Number(read(SNOOZE_KEY));
  if (!Number.isFinite(at) || at <= 0) return false;
  const age = Date.now() - at;
  // ค่าที่เป็นอนาคต (ข้อมูลเพี้ยน หรือผู้ใช้เคยตั้งนาฬิกาเดินหน้าแล้วปรับกลับ)
  // ต้องนับเป็น "ไม่เคยกด" ไม่ใช่ "เงียบตลอดกาล" — เงียบถาวรแปลว่าคนไม่ติดตั้งแล้วข้อมูลหาย
  return age >= 0 && age < SNOOZE_DAYS * 86400000;
}

/**
 * ควรขึ้นคำชวนติดตั้งไหม
 *
 * จังหวะสำคัญพอๆ กับตัวข้อความ — ขึ้นตอนเปิดครั้งแรกคือตอนที่เขายังไม่รู้ว่าจะใช้ไหม
 * กดปิดทิ้งแน่นอน · รอให้ติ๊กเซตแรกเสร็จก่อน ตอนนั้นเขาเพิ่งเห็นว่าแอปมีประโยชน์
 * และมีของที่จะเสียแล้วจริงๆ
 */
export function shouldPromptInstall(hasLoggedAnySet: boolean): boolean {
  if (isInstalled()) return false;
  if (!hasLoggedAnySet) return false;
  return !snoozed();
}
