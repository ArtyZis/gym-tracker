// สลับภาษา ไทย/อังกฤษ — ทำเองไม่ใช้ไลบรารี
//
// ทำไมไม่ใช้ react-i18next: แอปนี้คุม bundle ไว้ที่ ~282 KB และ runtime dep มีแค่
// react + react-dom (ดู CLAUDE.md) การเพิ่มไลบรารี i18n เต็มรูปแบบกินพื้นที่มากกว่า
// สิ่งที่ได้กลับมา เพราะแอปมีสองภาษาตายตัว ไม่ต้องโหลดไฟล์ภาษาแยก ไม่ต้อง plural rules
// แบบสลาฟ ไม่ต้อง lazy-load
//
// ทำไมเป็น t("ไทย","English") ไม่ใช่ t("key.path"):
//   - ไม่มีคีย์ให้หลุด — ลืมแปลคือเห็นตอนอ่านโค้ด ไม่ใช่เห็นเป็น "manage.card.title" บนจอ
//   - ข้อความไทยยังอยู่ในโค้ดตรงจุดที่ใช้ อ่านโค้ดแล้วรู้เลยว่าหน้าตาออกมาเป็นยังไง
//   - ลบข้อความทิ้งแล้วคำแปลหายตามอัตโนมัติ ไม่มีไฟล์ภาษาบวมด้วยคีย์ที่ไม่มีใครใช้
//
// ทำไมเป็นตัวแปรระดับโมดูล ไม่ใช่ React context:
// ข้อความจำนวนมากมาจาก lib/*.ts (ตัววิเคราะห์ ตัวคิดน้ำหนักครั้งหน้า สตรีค) ซึ่งเป็น
// ฟังก์ชันธรรมดา เรียก hook ไม่ได้ ถ้าใช้ context ต้องส่ง lang ผ่านทุกฟังก์ชันในสายเรียก
// การ re-render ยังถูกต้องอยู่เพราะ state ทั้งแอปอยู่ที่ App.tsx ตัวเดียว — เปลี่ยนภาษา
// = data เปลี่ยน = App render ใหม่ = syncLang() ทำงานก่อนลูกทุกตัว render

export type Lang = "th" | "en";

let current: Lang = "th";

/** ตั้งภาษาปัจจุบัน — เรียกจาก App.tsx ตอน render ตาม settings.lang */
export function setLang(l: Lang): void {
  current = l;
}

export function getLang(): Lang {
  return current;
}

export function isEN(): boolean {
  return current === "en";
}

/** เลือกข้อความตามภาษาปัจจุบัน */
export function t(th: string, en: string): string {
  return current === "en" ? en : th;
}

/** เลือกจากตารางคำแปลคู่ — ใช้กับ Record<Key,string> อย่าง MUSCLE_TH/MUSCLE_EN */
export function pick<K extends string>(th: Record<K, string>, en: Record<K, string>, k: K): string {
  return current === "en" ? en[k] : th[k];
}

// ── รูปแบบตัวเลข/วันที่ ──
// ไทยใช้ พ.ศ. และเดือนย่อแบบไทย อังกฤษใช้ ค.ศ. — ให้ toLocaleDateString จัดการเอง
export function locale(): string {
  return current === "en" ? "en-GB" : "th-TH";
}

/**
 * เติม s ให้คำนามอังกฤษเมื่อไม่ใช่ 1 — ภาษาไทยไม่มีพหูพจน์จึงคืนคำเดิม
 *
 * รับ th กับ en แยกกันเพราะบางคำไทยไม่ได้แปลตรงตัว เช่น "ครั้ง" -> "rep"/"reps"
 */
export function plural(n: number, th: string, en: string, enPlural?: string): string {
  if (current !== "en") return th;
  return n === 1 ? en : (enPlural ?? en + "s");
}

// ── หน่วยนับที่โผล่ซ้ำทั้งแอป ──
// รวมไว้ที่เดียวเพราะเป็นคำที่ใช้บ่อยที่สุดและต้องสะกดเหมือนกันทุกหน้า
// ถ้าปล่อยให้แต่ละไฟล์เขียน t("เซต","sets") เอง วันหนึ่งจะมีที่เขียน "set" เอกพจน์ปนอยู่
export const setsText = (n: number) => `${n} ${plural(n, "เซต", "set")}`;
export const repsText = (n: number) => `${n} ${plural(n, "ครั้ง", "rep")}`;
export const exText = (n: number) => `${n} ${plural(n, "ท่า", "exercise")}`;
export const daysText = (n: number) => `${n} ${plural(n, "วัน", "day")}`;
export const weeksText = (n: number) => `${n} ${plural(n, "สัปดาห์", "week")}`;
export const timesText = (n: number) => `${n} ${plural(n, "ครั้ง", "time")}`;

/** วินาที — อังกฤษใช้ "45s" ติดกันเพราะขึ้นในที่แคบอย่างปุ่มและป้ายเซต */
export const secText = (n: number) => (current === "en" ? `${n}s` : `${n} วิ`); // i18n-ok
export const minText = (n: number) => (current === "en" ? `${n} min` : `${n} นาที`); // i18n-ok
export const hoursText = (n: number) => (current === "en" ? `${n}h` : `${n} ชม.`); // i18n-ok
