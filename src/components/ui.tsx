import type { ReactNode } from "react";

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
