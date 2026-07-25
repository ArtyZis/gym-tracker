import type { ReactNode } from "react";
import { useApp } from "../AppContext";

// หัวข้อย่อยสไตล์ redesign — แถบ accent ตั้ง + label mono uppercase, มีช่องขวาสำหรับข้อมูลเสริม
// ใช้ซ้ำทุกสกรีน (Analyze/Progress/Manage) ให้หน้าตาสอดคล้องกัน
export function Kicker({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-[3px] h-3 rounded-sm shrink-0"
          style={{ background: "linear-gradient(var(--acc), var(--blue))", boxShadow: "0 0 8px var(--acc-40)" }}
        />
        <span className="font-mono2 text-[9px] uppercase tracking-[.2em]" style={{ color: "#4b8bb0" }}>
          {children}
        </span>
      </div>
      {right ?? null}
    </div>
  );
}

// ครอบเนื้อหาที่ต้องจ่ายเงิน — เบลอของจริงไว้ข้างหลังแทนที่จะซ่อน
// ให้เห็นว่ามีของอยู่จริง (คนตัดสินใจจ่ายจากการเห็นว่าขาดอะไร ไม่ใช่จากคำโฆษณา)
export function PremiumLock({ label, children }: { label: string; children: ReactNode }) {
  const { goTab } = useApp();
  return (
    <div className="relative">
      <div aria-hidden style={{ filter: "blur(5px)", opacity: 0.5, pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 gap-2">
        <span className="text-[20px]">🔒</span>
        <span className="text-[12.5px] leading-snug max-w-[240px]" style={{ color: "var(--ink)" }}>
          {label}
        </span>
        <button className="btn-cy !py-2 !px-4 !text-[12px] mt-0.5" onClick={() => goTab("manage")}>
          ดูวิธีปลดล็อก
        </button>
      </div>
    </div>
  );
}
