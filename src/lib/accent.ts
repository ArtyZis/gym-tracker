// สีธีม (accent) — ผู้ใช้เลือกได้ในแท็บจัดการ, undefined = cyan (ค่าเดิมของแบรนด์)
// เก็บเป็น hex string ใน settings.accent แล้ว set ลง CSS var --acc ที่ระดับ :root
// ทำไมเก็บเป็น hex ตรงๆ ไม่ใช่ id: กันข้อมูลเก่าพัง — undefined ก็ยัง = cyan เสมอ
// ธีม SYSTEM — ม่วง monarch เป็นค่าเริ่มต้น (เดิมเป็นฟ้า #4fd8ff ซึ่งยังเลือกได้อยู่)
export const DEFAULT_ACCENT = "#8b6bff";

export interface AccentOption {
  color: string;
  label: string;
}

// เรียงตามโทนที่เข้ากับพื้นดำอมน้ำเงินของธีม SYSTEM
export const ACCENTS: AccentOption[] = [
  { color: "#8b6bff", label: "ม่วง" },
  { color: "#3f8dff", label: "น้ำเงิน" },
  { color: "#4fd8ff", label: "ฟ้า" },
  { color: "#5fe6b0", label: "เขียว" },
  { color: "#ffb454", label: "อำพัน" },
  { color: "#ff5c7a", label: "แดง" },
];

// รับค่าที่ปลอดภัยเสมอ — ค่าแปลก/undefined = cyan
export function resolveAccent(a?: string): string {
  return a && /^#[0-9a-fA-F]{6}$/.test(a) ? a : DEFAULT_ACCENT;
}
