import { useMemo } from "react";
import { useApp } from "../AppContext";
import type { DayKey } from "../lib/store";
import { DAYS, applyProgram, dayName, repTargetText } from "../lib/store";
import { clearProgramFromUrl, decodeProgram } from "../lib/programLink";

// ลูกเทรนกดลิงก์จากโค้ช -> เด้งหน้านี้ให้ดูก่อนว่าได้อะไรบ้าง แล้วค่อยกดรับ
// การรับ = แทนที่โปรแกรมเดิมทั้งหมด จึงต้องเห็นของจริงก่อนเสมอ ไม่รับให้อัตโนมัติ
export default function IncomingProgram({ code, onClose }: { code: string; onClose: () => void }) {
  const { data, update, toast } = useApp();
  const program = useMemo(() => decodeProgram(code), [code]);

  const byDay = useMemo(() => {
    if (!program) return [];
    const groups = new Map<DayKey, typeof program.exercises>();
    for (const ex of program.exercises) {
      if (!groups.has(ex.day)) groups.set(ex.day, []);
      groups.get(ex.day)!.push(ex);
    }
    return DAYS.filter((d) => groups.has(d)).map((d) => [d, groups.get(d)!] as const);
  }, [program]);

  function dismiss() {
    clearProgramFromUrl();
    onClose();
  }

  function accept() {
    if (!program) return;
    update((d) => applyProgram(d, program.exercises, program.dayLabels));
    clearProgramFromUrl();
    onClose();
    toast("รับโปรแกรมแล้ว เริ่มฝึกได้เลย 💪", true);
  }

  const hadProgram = data.exercises.length > 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ background: "rgba(2,5,12,.72)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-full max-w-[520px] glass rise-up flex flex-col"
        style={{
          borderRadius: "22px 22px 0 0",
          maxHeight: "88dvh",
          paddingBottom: "max(14px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="px-5 pt-5 pb-3">
          <div className="font-mono2 text-[9px] uppercase tracking-[.2em] mb-1.5" style={{ color: "var(--acc)" }}>
            โปรแกรมจากโค้ช
          </div>
          {program ? (
            <>
              <h2 className="font-disp font-bold text-[19px] leading-tight">{program.title}</h2>
              <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: "var(--mut)" }}>
                {program.exercises.length} ท่า · {byDay.length} วันฝึก/สัปดาห์
              </p>
            </>
          ) : (
            <h2 className="font-disp font-bold text-[17px] leading-snug" style={{ color: "var(--warn)" }}>
              ลิงก์นี้อ่านไม่ออก
            </h2>
          )}
        </div>

        {program ? (
          <div className="px-5 overflow-y-auto scroll-x flex-1" style={{ minHeight: 0 }}>
            {byDay.map(([day, exs]) => (
              <div key={day} className="glass-inset p-3 mb-2">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="font-disp font-semibold text-[13.5px]" style={{ color: "var(--acc)" }}>
                    {dayName(day)}
                    {program.dayLabels[day] ? (
                      <span style={{ color: "var(--mut)" }}> · {program.dayLabels[day]}</span>
                    ) : null}
                  </span>
                  <span className="font-mono2 text-[9.5px]" style={{ color: "var(--dim)" }}>
                    {exs.length} ท่า
                  </span>
                </div>
                {exs.map((ex, i) => (
                  <div key={i} className="flex items-baseline gap-2 py-[3px]">
                    <span className="text-[12.5px]" style={{ color: "#dbe9f7" }}>
                      {ex.name}
                    </span>
                    <span className="flex-1 border-b border-dotted" style={{ borderColor: "var(--edge)", transform: "translateY(-3px)" }} />
                    <span className="font-mono2 text-[10.5px] shrink-0" style={{ color: "var(--mut)" }}>
                      {ex.sets}×{repTargetText({ ...ex, id: "", order: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            ))}

            {hadProgram && (
              <p className="text-[11.5px] leading-relaxed mb-2 px-1" style={{ color: "var(--warn)" }}>
                ⚠️ รับแล้วโปรแกรมเดิมของคุณจะถูกแทนที่ — ประวัติการฝึกเก่ายังอยู่ ถ้าท่าชื่อเดิมกลับมาในโปรแกรมใหม่
              </p>
            )}
          </div>
        ) : (
          <p className="px-5 text-[12.5px] leading-relaxed" style={{ color: "var(--mut)" }}>
            ลิงก์อาจถูกตัดตอนส่ง ลองให้โค้ชส่งใหม่อีกครั้ง แล้วกดเปิดจากลิงก์เต็มๆ
          </p>
        )}

        <div className="px-5 pt-3 flex gap-2">
          <button className="btn-gh !py-3 !px-4 !text-[12.5px] shrink-0" onClick={dismiss}>
            ไม่รับ
          </button>
          {program && (
            <button className="btn-cy flex-1 !py-3 !text-[13px]" onClick={accept}>
              รับโปรแกรมนี้
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
