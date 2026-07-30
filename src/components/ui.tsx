import type { ReactNode } from "react";
import { useApp } from "../AppContext";

// หัวข้อย่อยสไตล์หน้าต่างระบบ — label mono เว้นระยะ + เส้นเรืองแสงลากไปจนสุดแถว
// ใช้ซ้ำทุกสกรีน (Analyze/Progress/Manage/Today) ให้หน้าตาสอดคล้องกัน
// เส้นลากยาวทำหน้าที่แทนเส้นคั่น จึงไม่ต้องมี divider แยกอีกชั้น
export function Kicker({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3 min-w-0">
      <span className="font-mono2 text-[9px] uppercase tracking-[.24em] shrink-0" style={{ color: "var(--acc)" }}>
        {children}
      </span>
      <span
        className="flex-1 min-w-[10px]"
        style={{ height: 1, background: "linear-gradient(90deg, color-mix(in srgb, var(--acc) 50%, transparent), transparent)" }}
      />
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
