// ช่องทางซื้อ — แปลงค่าเดียวใน BUY_CONTACT ให้เป็นปุ่มที่กดแล้วไปถึงคุณจริง
//
// เดิมมีแค่ประโยค "ทักมาที่ <ไอดี>" เป็นข้อความเฉยๆ ลูกค้าต้องจำไอดี → เปิดไลน์ →
// ค้นหา → พิมพ์เอง สี่ขั้นนี้คือที่ที่คนเลิกกลางทาง ทั้งที่ตัดสินใจจะซื้อแล้ว
// ปุ่มที่เปิดแชตให้เลยตัดเหลือขั้นเดียว
//
// รับได้หลายแบบเพราะยังไม่รู้ว่าจะใช้ช่องทางไหน และเปลี่ยนใจทีหลังได้โดยไม่ต้องแก้ UI:
//   "@rankforge"           -> บัญชีทางการไลน์
//   "artyz_z"              -> ไลน์ไอดีส่วนตัว
//   "https://..."          -> เพจ/ลิงก์อะไรก็ได้
//   "0812345678"           -> เบอร์โทร
// ว่างไว้ = ไม่มีปุ่ม แสดงข้อความกลางๆ แทน (ดีกว่าโชว์ปุ่มที่กดแล้วไม่ไปไหน)

import { BUY_CONTACT } from "./license";
import { t } from "./i18n";

export type BuyChannel =
  | { kind: "none" }
  | { kind: "line" | "url" | "phone"; href: string; display: string; action: string };

const digitsOnly = (s: string): boolean => /^0\d{8,9}$/.test(s);

export function buyChannel(raw: string = BUY_CONTACT): BuyChannel {
  const s = raw.trim();
  if (!s) return { kind: "none" };

  if (/^https?:\/\//i.test(s)) return { kind: "url", href: s, display: s.replace(/^https?:\/\/(www\.)?/i, ""), action: t("เปิดลิงก์สั่งซื้อ", "Open the buy page") };

  if (digitsOnly(s)) return { kind: "phone", href: `tel:${s}`, display: s, action: t("โทรหาเรา", "Call us") };

  // ไลน์: บัญชีทางการขึ้นต้นด้วย @ ใช้คนละ URL กับไอดีส่วนตัว — สลับกันแล้วลิงก์ตาย
  if (s.startsWith("@")) return { kind: "line", href: `https://line.me/R/ti/p/${encodeURIComponent(s)}`, display: s, action: t("ทักไลน์เพื่อขอรหัส", "Message us on LINE") };

  return { kind: "line", href: `https://line.me/ti/p/~${encodeURIComponent(s)}`, display: s, action: t("ทักไลน์เพื่อขอรหัส", "Message us on LINE") };
}

export const hasBuyChannel = (raw: string = BUY_CONTACT): boolean => buyChannel(raw).kind !== "none";
