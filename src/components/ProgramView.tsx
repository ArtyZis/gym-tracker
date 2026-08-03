import { useApp } from "../AppContext";
import { DAYS, DAY_TH_SHORT, exercisesForDay, repTargetText } from "../lib/store";
import { activeDays as slotsOf, cycleLen, slotName, slotShort } from "../lib/loop";
import { Kicker } from "./ui";

export default function ProgramView() {
  const { data } = useApp();
  const activeDays = slotsOf(data).filter((d) => exercisesForDay(data, d).length > 0);
  const restDays = slotsOf(data).filter((d) => !exercisesForDay(data, d).length);
  // ช่องที่อยู่นอกรอบแต่ยังมีท่าค้างอยู่ — ต้องให้เห็น ไม่งั้นผู้ใช้นึกว่าท่าโดนลบ
  const inCycle = new Set(slotsOf(data));
  const outsideDays = DAYS.filter((d) => !inCycle.has(d) && exercisesForDay(data, d).length > 0);

  if (!activeDays.length && !outsideDays.length)
    return (
      <div className="glass p-7 text-center text-[13px] rise" style={{ color: "var(--dim)" }}>
        ยังไม่มีท่าฝึก — เพิ่มท่าแรกได้ที่แท็บจัดการ
      </div>
    );

  return (
    <div className="rise">
      {activeDays.map((d) => {
        const exs = exercisesForDay(data, d);
        const sets = exs.reduce((a, e) => a + e.sets, 0);
        return (
          <div key={d} className="glass p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="font-mono2 text-[11px] font-bold shrink-0 rounded-lg px-2.5 py-[5px]"
                  style={{ color: "#031420", background: "linear-gradient(180deg, var(--acc), var(--acc-2))", boxShadow: "0 0 12px -3px var(--acc)" }}
                >
                  {slotShort(data, d)}
                </span>
                <div className="min-w-0">
                  <div className="font-disp font-bold text-[15px] leading-none">{slotName(data, d)}</div>
                  {data.dayLabels[d] && (
                    <div className="text-[11px] mt-[2px]" style={{ color: "#7fb0d0" }}>
                      {data.dayLabels[d]}
                    </div>
                  )}
                </div>
              </div>
              <span className="font-mono2 text-[9.5px] text-right shrink-0 leading-snug" style={{ color: "var(--cyan-dim)" }}>
                {exs.length} ท่า
                <br />
                {sets} เซต
              </span>
            </div>
            <div className="flex flex-col">
              {exs.map((e, i) => (
                <div
                  key={e.id}
                  className="flex items-baseline gap-2.5 py-2"
                  style={i ? { borderTop: "1px dashed var(--edge)" } : undefined}
                >
                  <span className="text-[13.5px]" style={{ color: "#dbe9f7" }}>
                    {e.name}
                  </span>
                  <span className="flex-1 border-b border-dotted" style={{ borderColor: "var(--edge)", transform: "translateY(-3px)" }} />
                  <span className="font-mono2 text-[11px] shrink-0" style={{ color: "var(--acc)" }}>
                    {e.sets}×{repTargetText(e)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {restDays.length > 0 && (
        <div className="glass-inset flex items-center justify-center gap-2" style={{ padding: "12px 14px" }}>
          <span className="text-[13px]">🌙</span>
          <span className="text-[12px]" style={{ color: "var(--mut)" }}>
            วันพัก · <b style={{ color: "#dbe9f7" }}>{restDays.map((d) => slotName(data, d)).join(" · ")}</b>
          </span>
        </div>
      )}

      {/* ── ท่าที่อยู่นอกรอบ ──
          โหมดรอบใช้แค่ N ช่องแรก ท่าที่ค้างอยู่ช่องที่เกินจะไม่ถูกนับและไม่โผล่ที่ไหนเลย
          ซึ่งน่ากลัวเพราะผู้ใช้เห็นท่าหายไปเฉยๆ แล้วนึกว่าโดนลบ
          แสดงไว้ตรงนี้ให้รู้ว่ายังอยู่ พร้อมบอกวิธีเอากลับมาใช้ */}
      {outsideDays.length > 0 && (
        <div className="glass p-4 mt-3" style={{ borderColor: "rgba(255,193,94,.32)" }}>
          <Kicker right={<span className="font-mono2 text-[9px]" style={{ color: "var(--warn)" }}>ไม่ถูกนับ</span>}>
            ท่าที่อยู่นอกรอบ
          </Kicker>
          <p className="text-[11.5px] -mt-1 mb-2.5 leading-relaxed" style={{ color: "var(--mut)" }}>
            รอบตอนนี้ยาว {cycleLen(data)} วัน — ท่าเหล่านี้อยู่ช่องที่เกินรอบ ยังไม่หายไปไหน
            แต่จะไม่ถูกนับในคะแนนและไม่ขึ้นในแท็บวันนี้ · ขยายรอบหรือย้ายท่าได้ที่แท็บจัดการ
          </p>
          {outsideDays.map((d) => (
            <div key={d} className="mb-2 last:mb-0">
              <div className="font-mono2 text-[10px] mb-1" style={{ color: "var(--warn)" }}>
                วันที่ {DAYS.indexOf(d) + 1}
              </div>
              {exercisesForDay(data, d).map((ex) => (
                <div key={ex.id} className="flex items-baseline justify-between gap-2 py-[3px] text-[12px]">
                  <span className="truncate" style={{ color: "var(--mut)" }}>
                    {ex.name}
                  </span>
                  <span className="font-mono2 text-[10px] shrink-0" style={{ color: "var(--dim)" }}>
                    {repTargetText(ex)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
