// หน้าต่างระบบเต็มจอ — ใช้กับเหตุการณ์ที่ "ควรหยุดผู้ใช้" ไม่ใช่แค่บอกผ่าน
//
// ทำไมไม่ใช้ toast เดิม: toast หายไปใน 2.6 วินาที ซึ่งเร็วกว่าเวลาที่คนหยิบมือถือ
// ขึ้นมาแคปหน้าจอด้วยซ้ำ การทำ PR คือเหตุการณ์ที่คนอยากเก็บไว้อวด ต้องให้เวลาพอ
//
// ใช้กับ 2 เหตุการณ์เท่านั้น (ถ้าใช้พร่ำเพรื่อจะกลายเป็นตัวขวางทาง):
//   PR       — ทำสถิติน้ำหนักใหม่
//   COMPLETE — เล่นครบทุกเซตของวัน

import { useEffect, useState } from "react";

export interface SystemNoticeData {
  kind: "pr" | "complete";
  title: string;
  lines: { label: string; value: string; good?: boolean }[];
  footer?: string;
}

const AUTO_CLOSE_MS = 6000; // นานพอให้แคปหน้าจอทัน แต่ไม่ขวางจนรำคาญ

export default function SystemNotice({ notice, onClose }: { notice: SystemNoticeData | null; onClose: () => void }) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!notice) return;
    setClosing(false);
    const t = window.setTimeout(() => setClosing(true), AUTO_CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(onClose, 220);
    return () => window.clearTimeout(t);
  }, [closing, onClose]);

  if (!notice) return null;

  const tag = notice.kind === "pr" ? "RECORD BROKEN" : "QUEST COMPLETE";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
      style={{
        background: "radial-gradient(70% 50% at 50% 45%, #0a0f2acc, #01030acc 70%)",
        backdropFilter: "blur(3px)",
        opacity: closing ? 0 : 1,
        transition: "opacity .2s",
      }}
      onClick={() => setClosing(true)}
      role="dialog"
      aria-live="polite"
    >
      {/* แสงวาบตอนหน้าต่างเด้งขึ้น */}
      <div
        className="sys-flash absolute pointer-events-none"
        style={{
          width: 620,
          height: 620,
          borderRadius: "50%",
          background: "radial-gradient(circle, color-mix(in srgb, var(--acc) 55%, transparent), transparent 62%)",
        }}
      />
      {/* ลำแสงกระจายด้านหลัง — ภาษาภาพของ "ปลดล็อกอะไรบางอย่าง" */}
      <div
        className="sys-rays absolute pointer-events-none"
        style={{
          width: 560,
          height: 560,
          background:
            "repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--acc) 34%, transparent) 0deg 4deg, transparent 4deg 18deg)",
          maskImage: "radial-gradient(circle, transparent 28%, #000 45%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 28%, #000 45%, transparent 72%)",
        }}
      />

      <div
        className="sys-win relative w-full"
        style={{ maxWidth: 380 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ขอบเรืองแสงหนากว่าแผงปกติ — นี่คือหน้าต่างสำคัญ */}
        <div
          className="relative"
          style={{
            padding: 1.5,
            clipPath: "var(--cut-path)",
            background: "linear-gradient(150deg, var(--acc), var(--acc-2) 55%, var(--acc))",
            boxShadow: "0 0 44px color-mix(in srgb, var(--acc) 45%, transparent), 0 0 100px color-mix(in srgb, var(--acc-2) 22%, transparent)",
          }}
        >
          <div
            className="relative overflow-hidden px-5 pt-5 pb-5 text-center"
            style={{ clipPath: "var(--cut-path)", background: "linear-gradient(168deg, #0b1130fa, #04061198)" }}
          >
            <div className="sys-sweep" />

            <div className="font-mono2 text-[9.5px] tracking-[.36em]" style={{ color: "var(--acc)" }}>
              {tag}
            </div>

            <h2
              className="font-disp font-bold leading-none mt-2 mb-1"
              style={{
                fontSize: notice.title.length > 10 ? 30 : 40,
                letterSpacing: ".1em",
                color: "#fff",
                textShadow: "0 0 20px color-mix(in srgb, var(--acc) 90%, transparent), 0 0 50px color-mix(in srgb, var(--acc) 55%, transparent)",
              }}
            >
              {notice.title}
            </h2>

            <div
              style={{
                height: 1,
                margin: "12px 0 10px",
                background: "linear-gradient(90deg, transparent, var(--acc), transparent)",
              }}
            />

            <div className="sys-stagger">
              {notice.lines.map((l, i) => (
                <div
                  key={i}
                  className="flex items-baseline justify-between gap-3 py-[5px] text-[13px]"
                  style={i ? { borderTop: "1px solid color-mix(in srgb, var(--acc) 13%, transparent)" } : undefined}
                >
                  <span style={{ color: "var(--mut)" }}>{l.label}</span>
                  <span className="font-mono2 text-[13px]" style={{ color: l.good ? "var(--good)" : "var(--ink)" }}>
                    {l.value}
                  </span>
                </div>
              ))}
            </div>

            {notice.footer && (
              <p className="text-[11px] mt-3 leading-relaxed" style={{ color: "var(--dim)" }}>
                {notice.footer}
              </p>
            )}

            <button
              className="font-mono2 text-[9.5px] tracking-[.24em] mt-3.5 px-4 py-2"
              style={{
                color: "var(--acc)",
                background: "transparent",
                border: "1px solid color-mix(in srgb, var(--acc) 38%, transparent)",
                clipPath: "var(--cut-path-sm)",
              }}
              onClick={() => setClosing(true)}
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
