import { useApp } from "../AppContext";
import { DAYS, DAY_TH, exercisesForDay, repTargetText } from "../lib/store";

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
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-disp font-semibold text-[15px]" style={{ color: "var(--cyan)" }}>
                {DAY_TH[d]}
                {data.dayLabels[d] ? <span style={{ color: "var(--mut)" }}> · {data.dayLabels[d]}</span> : null}
              </h3>
              <span className="font-mono2 text-[10px]" style={{ color: "var(--dim)" }}>
                {exs.length} ท่า · {sets} เซต
              </span>
            </div>
            {exs.map((e) => (
              <div key={e.id} className="flex items-baseline gap-2.5 py-2 hairline first:border-0">
                <span className="text-[13.5px]">{e.name}</span>
                <span
                  className="flex-1 border-b border-dotted"
                  style={{ borderColor: "rgba(140,205,255,.15)", transform: "translateY(-3px)" }}
                />
                <span className="font-mono2 text-[11px]" style={{ color: "var(--cyan)" }}>
                  {e.sets}×{repTargetText(e)}
                </span>
              </div>
            ))}
          </div>
        );
      })}
      {restDays.length > 0 && (
        <p className="text-center text-[12px] mt-1" style={{ color: "var(--dim)" }}>
          วันพัก: {restDays.map((d) => DAY_TH[d]).join(" · ")}
        </p>
      )}
    </div>
  );
}
