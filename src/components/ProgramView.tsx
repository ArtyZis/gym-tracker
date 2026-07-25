import { useApp } from "../AppContext";
import { DAYS, DAY_TH, DAY_TH_SHORT, exercisesForDay, repTargetText } from "../lib/store";

export default function ProgramView() {
  const { data } = useApp();
  const activeDays = DAYS.filter((d) => exercisesForDay(data, d).length > 0);
  const restDays = DAYS.filter((d) => !exercisesForDay(data, d).length);

  if (!activeDays.length)
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
                  {DAY_TH_SHORT[d]}
                </span>
                <div className="min-w-0">
                  <div className="font-disp font-bold text-[15px] leading-none">{DAY_TH[d]}</div>
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
            วันพัก · <b style={{ color: "#dbe9f7" }}>{restDays.map((d) => DAY_TH[d]).join(" · ")}</b>
          </span>
        </div>
      )}
    </div>
  );
}
