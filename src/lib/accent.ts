// สีธีม (accent) — ผู้ใช้เลือกได้ในแท็บจัดการ, undefined = cyan (ค่าเดิมของแบรนด์)
// เก็บเป็น hex string ใน settings.accent แล้ว set ลง CSS var --acc ที่ระดับ :root
// ทำไมเก็บเป็น hex ตรงๆ ไม่ใช่ id: กันข้อมูลเก่าพัง — undefined ก็ยัง = cyan เสมอ
export const DEFAULT_ACCENT = "#4fd8ff";

export interface AccentOption {
  color: string;
  label: string;
}

// ตัวเลือกจาก redesign — cyan (แบรนด์เดิม) เป็นค่าเริ่มต้น
export const ACCENTS: AccentOption[] = [
  { color: "#4fd8ff", label: "ฟ้า" },
  { color: "#7c8bff", label: "ม่วง" },
  { color: "#5fe6b0", label: "เขียว" },
  { color: "#ffb454", label: "อำพัน" },
];

// รับค่าที่ปลอดภัยเสมอ — ค่าแปลก/undefined = cyan
export function resolveAccent(a?: string): string {
  return a && /^#[0-9a-fA-F]{6}$/.test(a) ? a : DEFAULT_ACCENT;
}
