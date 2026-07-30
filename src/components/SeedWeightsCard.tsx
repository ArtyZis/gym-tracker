// ตั้งน้ำหนักเริ่มต้นให้ทั้งโปรแกรมจากท่าหลัก 4 ท่า
//
// ปัญหาที่แก้: สร้างโปรแกรมใหม่ 40 ท่า แล้วต้องเดาน้ำหนักเองทุกท่า
// เสียเวลาและเดาผิดบ่อย (ตั้งเบาไปก็เสียเวลาหลายสัปดาห์ ตั้งหนักไปก็ฟอร์มพัง)
//
// สำคัญ: ค่าที่ได้เป็น "ค่าประมาณ" จากสัดส่วนเฉลี่ยของประชากร ไม่ใช่ตัวเลขที่รู้แน่
// UI ต้องบอกชัดทุกจุด ไม่งั้นผู้ใช้จะเชื่อว่าเป็นเป้าจริงแล้วฝืนยกตาม

import { useState } from "react";
import { useApp } from "../AppContext";
import type { LiftKey, OneRMInput } from "../lib/progression";
import { LIFT_TH, epley1RM, estimate1RMs, seedTargets } from "../lib/progression";
import { Kicker } from "./ui";

const LIFTS: LiftKey[] = ["bench", "squat", "deadlift", "ohp"];

export default function SeedWeightsCard() {
  const { data, update, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [inputs, setInputs] = useState<Partial<Record<LiftKey, OneRMInput>>>({});

  // ท่าที่ยังไม่เคยเล่นจริงเลย — มีมากพอถึงจะคุ้มที่จะเสนอ
  const untouched = data.exercises.filter(
    (ex) => ex.type === "weight" && !(data.history[ex.id] ?? []).some((s) => s.sets.some(Boolean)),
  );
  if (untouched.length < 3) return null;

  const oneRM = estimate1RMs(inputs);
  const preview = Object.keys(oneRM).length ? seedTargets(data, oneRM) : [];

  const setField = (k: LiftKey, field: "weight" | "reps", v: number) =>
    setInputs((cur) => ({ ...cur, [k]: { weight: 0, reps: 0, ...cur[k], [field]: v } }));

  const numCls = "font-mono2 text-[13px] text-center";
  const numStyle = {
    background: "rgba(10,20,31,.6)",
    border: "1px solid var(--edge)",
    color: "var(--ink)",
    borderRadius: 9,
    padding: "6px 4px",
    width: 62,
  } as const;

  return (
    <div className="glass p-4 mb-3">
      <Kicker
        right={
          <span className="font-mono2 text-[9px]" style={{ color: "var(--dim)" }}>
            {untouched.length} ท่ายังไม่มีน้ำหนัก
          </span>
        }
      >
        ตั้งน้ำหนักเริ่มต้น
      </Kicker>
      <p className="text-[11.5px] -mt-1 mb-3 leading-relaxed" style={{ color: "var(--mut)" }}>
        กรอกท่าหลักที่ยกได้จริง 4 ท่า แล้วระบบจะประเมินจุดตั้งต้นให้ท่าอื่นๆ — ไม่ต้องเดาเองทีละท่า
      </p>

      {!open ? (
        <button className="btn-gh w-full !py-2.5 !text-[12px]" onClick={() => setOpen(true)}>
          เริ่มตั้งน้ำหนัก
        </button>
      ) : (
        <>
          <div className="mb-3">
            {LIFTS.map((k) => {
              const v = inputs[k];
              const est = v && v.weight > 0 && v.reps > 0 ? epley1RM(v.weight, v.reps) : 0;
              return (
                <div key={k} className="flex items-center gap-2 mb-2 last:mb-0">
                  <span className="text-[12px] flex-1 min-w-0 truncate" style={{ color: "var(--ink)" }}>
                    {LIFT_TH[k]}
                  </span>
                  <input
                    className={numCls}
                    style={numStyle}
                    type="number"
                    inputMode="decimal"
                    placeholder="กก."
                    onChange={(e) => setField(k, "weight", parseFloat(e.target.value) || 0)}
                  />
                  <span className="font-mono2 text-[10px]" style={{ color: "var(--dim)" }}>
                    ×
                  </span>
                  <input
                    className={numCls}
                    style={numStyle}
                    type="number"
                    inputMode="numeric"
                    placeholder="ครั้ง"
                    onChange={(e) => setField(k, "reps", parseInt(e.target.value, 10) || 0)}
                  />
                  <span className="font-mono2 text-[10px] w-[62px] text-right shrink-0" style={{ color: est ? "var(--acc)" : "var(--dim)" }}>
                    {est ? `~${Math.round(est)}` : "—"}
                  </span>
                </div>
              );
            })}
            <p className="font-mono2 text-[9.5px] mt-1.5" style={{ color: "var(--dim)" }}>
              ขวาสุด = 1RM ที่ประเมินได้ (สูตร Epley) กรอกเท่าที่รู้ ไม่ต้องครบทั้ง 4
            </p>
          </div>

          {preview.length > 0 && (
            <div className="glass-inset p-3 mb-3">
              <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-2" style={{ color: "var(--mut)" }}>
                จะตั้งให้ {preview.length} ท่า
              </div>
              <div style={{ maxHeight: 168, overflowY: "auto" }}>
                {preview.map((p) => (
                  <div key={p.exId} className="flex items-center gap-2 py-1 text-[12px]">
                    <span className="flex-1 min-w-0 truncate" style={{ color: "var(--ink)" }}>
                      {p.name}
                    </span>
                    <span className="font-mono2 text-[11px] shrink-0" style={{ color: "var(--acc)" }}>
                      ~{p.weight}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10.5px] mt-2 leading-relaxed" style={{ color: "var(--warn)" }}>
                ทั้งหมดนี้เป็น<strong>ค่าประมาณ</strong>จากสัดส่วนเฉลี่ย ไม่ใช่ตัวเลขที่รู้แน่ —
                สัปดาห์แรกให้ลองเซตแรกแล้วปรับตามจริง ระบบจะจำค่าจริงแทนทันทีที่คุณติ๊กเซต
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              className="btn-gh flex-1 !py-2.5 !text-[12px]"
              onClick={() => {
                setOpen(false);
                setInputs({});
              }}
            >
              ยกเลิก
            </button>
            <button
              className="btn flex-1 !py-2.5 !text-[12px]"
              disabled={!preview.length}
              style={!preview.length ? { opacity: 0.4 } : undefined}
              onClick={() => {
                // เขียนลง seededTarget ไม่ใช่ history — ไม่งั้นกราฟความก้าวหน้าและพยากรณ์ PR จะเพี้ยน
                update((d) => {
                  for (const p of preview) {
                    const ex = d.exercises.find((e) => e.id === p.exId);
                    if (ex) ex.seededTarget = p.weight;
                  }
                });
                toast(`ตั้งค่าประมาณให้ ${preview.length} ท่าแล้ว`, true);
                setOpen(false);
                setInputs({});
              }}
            >
              ตั้งให้ {preview.length} ท่า
            </button>
          </div>
        </>
      )}
    </div>
  );
}
