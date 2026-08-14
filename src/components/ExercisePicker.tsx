import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import type { EffectiveExercise, SwapTarget } from "../lib/store";
import { DAY_TH, addExtra, clearSwap, normName, removeExtra, setSwap } from "../lib/store";
import { MUSCLE_TH, muscleMap } from "../lib/analyzer";
import { EQUIP_TH, incFor, isMachineEx, searchExercises, tierOf, unitFor } from "../lib/exerciseDB";

interface Option extends SwapTarget {
  from: string; // มาจากไหน — วันในโปรแกรม หรืออุปกรณ์ที่ใช้ (ท่าจากคลัง)
  muscles: string;
  th?: string; // ชื่อไทย — ให้รู้ว่าท่านั้นคือท่าอะไร (ชื่ออังกฤษอย่างเดียวคนไทยเดาไม่ออก)
  tip?: string; // คำแนะนำวิธีเล่น (มีเฉพาะท่าจากคลัง)
}

// เลือกท่า: ใช้ทั้งสลับแทนท่าเดิม (mode swap) และเพิ่มท่าเข้าวันนี้ (mode extra)
// ค้นได้จากคลังท่าหลักทั้งหมด (exerciseDB) ไม่ใช่แค่ท่าที่มีในโปรแกรม
export default function ExercisePicker({
  mode,
  ex,
  onClose,
}: {
  mode: "swap" | "extra";
  ex?: EffectiveExercise;
  onClose: () => void;
}) {
  const { data, update, toast } = useApp();
  const [q, setQ] = useState("");
  const [openTip, setOpenTip] = useState<string | null>(null);

  const options = useMemo(() => {
    const out: Option[] = [];
    const seen = new Set<string>(ex ? [normName(ex.name)] : []);
    const query = q.trim().toLowerCase();
    const musclesOf = (name: string) =>
      muscleMap(name)
        .map((h) => MUSCLE_TH[h.m])
        .slice(0, 2)
        .join("/") || "—";

    // 1) ท่าที่มีในโปรแกรมอยู่แล้ว — ขึ้นก่อนเพราะผู้ใช้คุ้นและมีประวัติสะสมไว้
    for (const o of data.exercises) {
      if (seen.has(normName(o.name))) continue;
      if (query && !o.name.toLowerCase().includes(query) && !DAY_TH[o.day].includes(query)) continue;
      seen.add(normName(o.name));
      out.push({
        name: o.name,
        type: o.type,
        sets: o.sets,
        rmin: o.rmin,
        rmax: o.rmax,
        unit: o.unit,
        inc: o.inc,
        machine: o.machine,
        amrap: o.amrap,
        from: DAY_TH[o.day],
        muscles: musclesOf(o.name),
      });
    }

    // 2) คลังท่าหลักทั้งหมด — ค้นได้ทั้งชื่อไทยและอังกฤษ
    for (const t of searchExercises(q, 80)) {
      if (seen.has(normName(t.name))) continue;
      seen.add(normName(t.name));
      out.push({
        name: t.name,
        type: t.type,
        sets: ex && mode === "swap" ? ex.sets : t.sets,
        rmin: t.rmin,
        rmax: t.rmax,
        unit: unitFor(t),
        inc: incFor(t),
        machine: isMachineEx(t) || undefined,
        amrap: t.amrap,
        from: t.equip.map((e) => EQUIP_TH[e]).slice(0, 2).join("+"),
        muscles: t.pri.map((m) => MUSCLE_TH[m]).slice(0, 2).join("/"),
        th: t.th,
        tip: t.tip,
      });
    }

    return out.slice(0, 60);
  }, [data.exercises, ex, mode, q]);

  function pick(t: SwapTarget) {
    const target: SwapTarget = { ...t, sets: ex && mode === "swap" ? ex.sets : t.sets };
    update((d) => (mode === "swap" && ex ? setSwap(d, ex.origId, target) : addExtra(d, target)));
    toast(mode === "swap" ? `วันนี้เปลี่ยนเป็น ${t.name}` : `เพิ่ม ${t.name} เข้าวันนี้แล้ว`);
    onClose();
  }

  return (
    <div className="glass-inset p-3 mb-3 rise">
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono2 text-[9px] uppercase tracking-[.18em]" style={{ color: "var(--cyan-dim)" }}>
          {mode === "swap" ? "เปลี่ยนท่าเฉพาะวันนี้" : "เพิ่มท่าเข้าวันนี้"}
        </div>
        <button className="font-mono2 text-[10px]" style={{ color: "var(--dim)" }} onClick={onClose}>
          ปิด ✕
        </button>
      </div>
      <p className="text-[11px] mb-2" style={{ color: "var(--mut)" }}>
        {mode === "swap" ? (
          <>
            แทน <b style={{ color: "var(--ink)" }}>{ex?.name}</b> เฉพาะวันนี้ — พรุ่งนี้กลับไปใช้ท่าเดิมเอง
          </>
        ) : (
          <>เลือกจากคลังท่าหรือท่าในโปรแกรม — เพิ่มเฉพาะวันนี้ พรุ่งนี้หายไปเอง</>
        )}
      </p>

      <input
        className="w-full px-3 py-2 text-[13px] mb-2"
        placeholder="ค้นหาท่า — พิมพ์ไทยหรืออังกฤษ เช่น สควอท, อก, bench, ดัมเบล"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="max-h-[300px] overflow-y-auto -mx-1 px-1">
        {options.map((o) => (
          <div key={o.name} className="hairline first:border-0">
            <div className="flex items-center gap-1.5 py-2 px-1">
              <button onClick={() => pick(o)} className="flex-1 min-w-0 text-left active:scale-[.99] transition-transform">
                <span className="block text-[13px] truncate">
                  {o.name}
                  {o.machine ? " ⚙" : ""}
                </span>
                {o.th && (
                  <span className="block text-[11.5px] truncate" style={{ color: "var(--mut)" }}>
                    {o.th}
                  </span>
                )}
                <span className="block font-mono2 text-[9.5px] mt-0.5" style={{ color: "var(--dim)" }}>
                  {o.from} · {o.muscles} · {o.sets}×{o.amrap ? "สุดแรง" : `${o.rmin}-${o.rmax}`}
                </span>
              </button>
              {o.tip && (
                <button
                  className="w-6 h-6 rounded-lg shrink-0 text-[10px] font-mono2"
                  style={{
                    background: openTip === o.name ? "var(--acc-18)" : "transparent",
                    border: "1px solid var(--edge)",
                    color: openTip === o.name ? "var(--acc)" : "var(--dim)",
                  }}
                  aria-label="วิธีเล่น"
                  onClick={() => setOpenTip(openTip === o.name ? null : o.name)}
                >
                  ?
                </button>
              )}
              <button
                className="font-mono2 text-[10px] shrink-0 px-1"
                style={{ color: "var(--acc)" }}
                onClick={() => pick(o)}
              >
                {mode === "swap" ? "ใช้แทน" : "+ เพิ่ม"}
              </button>
            </div>
            {openTip === o.name && o.tip && (
              <p
                className="text-[11.5px] leading-relaxed px-2 pb-2.5 -mt-0.5"
                style={{ color: "#cfe0f0" }}
              >
                💡 {o.tip}
              </p>
            )}
          </div>
        ))}
        {options.length === 0 && (
          <p className="text-[11.5px] py-2" style={{ color: "var(--dim)" }}>
            ไม่เจอท่านี้ในคลัง — กด "ใช้ชื่อนี้" ด้านล่างเพื่อเพิ่มเองได้
          </p>
        )}
      </div>

      <div className="flex gap-2 mt-2.5">
        <button
          className="btn-cy w-full !py-2 !text-[12px]"
          onClick={() => {
            const name = q.trim();
            if (name.length < 2) {
              toast("พิมพ์ชื่อท่าในช่องค้นหาก่อน");
              return;
            }
            pick({
              name,
              type: ex?.type ?? "weight",
              sets: ex?.sets ?? 3,
              rmin: ex?.rmin ?? 8,
              rmax: ex?.rmax ?? 12,
              unit: ex?.unit ?? "kg",
              inc: ex?.inc ?? 2.5,
              machine: ex?.machine,
              amrap: ex?.amrap,
            });
          }}
        >
          ใช้ชื่อ "{q.trim() || "…"}" เป็นท่าใหม่
        </button>
      </div>

      {mode === "swap" && ex?.swapped && (
        <button
          className="btn-gh w-full !py-2 !text-[11.5px] mt-2.5"
          onClick={() => {
            update((d) => clearSwap(d, ex.origId));
            toast("กลับไปใช้ท่าเดิมแล้ว");
            onClose();
          }}
        >
          ↩ คืนท่าเดิมตามโปรแกรม
        </button>
      )}
      {mode === "swap" && ex?.extra && (
        <button
          className="btn-gh w-full !py-2 !text-[11.5px] mt-2.5"
          style={{ color: "var(--bad)", borderColor: "rgba(255,107,107,.35)" }}
          onClick={() => {
            update((d) => removeExtra(d, ex.name));
            toast("เอาท่าออกจากวันนี้แล้ว");
            onClose();
          }}
        >
          ✕ เอาท่านี้ออกจากวันนี้
        </button>
      )}
    </div>
  );
}
