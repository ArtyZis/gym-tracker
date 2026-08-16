import type { CSSProperties, FocusEvent, ReactNode } from "react";
import { useState } from "react";
import { useApp } from "../AppContext";
import { t } from "../lib/i18n";

/**
 * แตะช่องตัวเลขแล้วเลือกทั้งหมดให้เลย — พิมพ์ทับได้ทันที ไม่ต้องกดลบทีละตัว
 *
 * ต้องรอเฟรมถัดไป เพราะ Safari บน iOS ย้าย caret หลัง focus จบ
 * ถ้า select() ทันทีจะถูกทับแล้วไม่มีอะไรถูกเลือก
 */
export function selectAllOnFocus(e: FocusEvent<HTMLInputElement>): void {
  const el = e.currentTarget;
  requestAnimationFrame(() => {
    try {
      el.select();
    } catch {
      /* เบราว์เซอร์บางตัวเลือกช่อง type=number ไม่ได้ — ไม่เป็นไร แค่ไม่ได้ความสะดวก */
    }
  });
}

/**
 * ช่องกรอกตัวเลขที่ "ลบให้ว่างได้จริง"
 *
 * ปัญหาเดิม: ช่องพวกนี้ผูกกับตัวเลขตรงๆ แล้วเขียนแบบ `+e.target.value || 3`
 * พอผู้ใช้ลบจนว่าง `+""` = 0 ซึ่งเป็น falsy -> ตกไปใช้ค่า default ทันที
 * (บางที่ใช้ `Number.isFinite(NaN)` = false แล้วไม่อัปเดต ค่าเดิมก็เด้งกลับ)
 * ผลคือ **ลบไม่ได้เลย** ต้องเอา caret ไปต่อท้ายแล้วกดลบทีละตัว ซึ่งบนมือถือทรมานมาก
 *
 * วิธีแก้: เก็บ "ข้อความที่กำลังพิมพ์" ไว้ในตัวเองระหว่างที่โฟกัสอยู่ ปล่อยให้ว่างได้
 * ส่งค่าออกเฉพาะตอนที่อ่านเป็นตัวเลขในช่วงที่ยอมรับได้ · ออกจากช่องแล้วค่อยบีบเข้าช่วง
 * ว่างทิ้งไว้แล้วออกจากช่อง = กลับไปใช้ค่าล่าสุดที่ถูกต้อง ไม่เคยกลายเป็น 0 หรือ NaN
 */
export function NumberField({
  value,
  onCommit,
  min,
  max,
  step,
  decimals = 0,
  className = "",
  style,
  placeholder,
  ariaLabel,
}: {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  /** > 0 = รับทศนิยม (เปลี่ยนแป้นพิมพ์มือถือให้มีจุด) */
  decimals?: number;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  ariaLabel?: string;
}) {
  // null = ไม่ได้พิมพ์อยู่ ให้แสดงค่าจริงจากข้างนอก
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number): number => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));

  return (
    <input
      type="number"
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      className={className}
      style={style}
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={draft ?? String(value)}
      onFocus={(e) => {
        setDraft(String(value));
        selectAllOnFocus(e);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw.trim() === "") return; // ว่างได้ระหว่างพิมพ์ ยังไม่ส่งค่าออก
        const n = Number(raw);
        // ส่งออกเฉพาะที่อยู่ในช่วงแล้ว — ไม่บีบระหว่างพิมพ์ ไม่งั้นพิมพ์ "1" ของ "150"
        // จะเด้งเป็นค่าต่ำสุดทันทีแล้วพิมพ์ต่อไม่ได้
        if (Number.isFinite(n) && n === clamp(n)) onCommit(n);
      }}
      onBlur={() => {
        const raw = (draft ?? "").trim();
        const n = Number(raw);
        // ออกจากช่องแล้วค่อยบีบเข้าช่วง · ว่างหรืออ่านไม่ได้ = คงค่าเดิมไว้
        if (raw !== "" && Number.isFinite(n) && n !== value) onCommit(clamp(n));
        setDraft(null);
      }}
    />
  );
}

// หัวข้อย่อยสไตล์หน้าต่างระบบ — label mono เว้นระยะ + เส้นเรืองแสงลากไปจนสุดแถว
// ใช้ซ้ำทุกสกรีน (Analyze/Progress/Manage/Today) ให้หน้าตาสอดคล้องกัน
// เส้นลากยาวทำหน้าที่แทนเส้นคั่น จึงไม่ต้องมี divider แยกอีกชั้น
// เรนเดอร์เป็น "แถบหัวหน้าต่าง" เต็มความกว้างการ์ด (ดันขอบออกด้วย margin ติดลบใน .panel-head)
// การ์ดที่ padding ไม่ใช่ 16px ต้องตั้ง --card-pad เองที่ตัวการ์ด ไม่งั้นแถบจะไม่ชนขอบพอดี
export function Kicker({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="panel-head">
      <span className="mark" />
      <span className="font-mono2 text-[8.5px] uppercase tracking-[.28em] shrink-0" style={{ color: "#c9d6ff" }}>
        {children}
      </span>
      <span className="flex-1 min-w-[6px]" />
      {right ?? null}
    </div>
  );
}

// ── ไอคอน SVG ──
// ห้ามใช้อักขระอย่าง ▶ ✕ ❚❚ เป็นปุ่ม — iOS เรนเดอร์เป็นอิโมจิสี ทำให้หลุดธีมทันที
// (บนวินโดวส์/แอนดรอยด์ออกมาเป็นตัวอักษรปกติ เลยไม่เห็นปัญหาตอนพัฒนา)
export function Icon({ name, size = 12 }: { name: "play" | "pause" | "close" | "trash"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 12 12", "aria-hidden": true } as const;
  if (name === "play")
    return (
      <svg {...common}>
        <path d="M2.5 1.5 10 6l-7.5 4.5z" fill="currentColor" />
      </svg>
    );
  if (name === "pause")
    return (
      <svg {...common}>
        <rect x="2.5" y="1.5" width="2.6" height="9" fill="currentColor" />
        <rect x="6.9" y="1.5" width="2.6" height="9" fill="currentColor" />
      </svg>
    );
  if (name === "trash")
    return (
      <svg {...common}>
        <path
          d="M2.5 3.2h7M5 3.2V2h2v1.2M3.4 3.2l.5 6.4h4.2l.5-6.4M5.2 5v3M6.8 5v3"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
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
          {t("ดูวิธีปลดล็อก", "How to unlock")}
        </button>
      </div>
    </div>
  );
}
