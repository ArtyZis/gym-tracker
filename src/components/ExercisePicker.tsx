import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import type { EffectiveExercise, SwapTarget } from "../lib/store";
import { DAY_TH, addExtra, clearSwap, normName, removeExtra, setSwap } from "../lib/store";
import { MUSCLE_TH, SUGGESTION_BANK, muscleMap } from "../lib/analyzer";

interface Option extends SwapTarget {
  from: string; // มาจากไหน — วันในโปรแกรม หรือ "คลังท่า"
  muscles: string;
}

// เลือกท่า: ใช้ทั้งสลับแทนท่าเดิม (mode swap) และเพิ่มท่าเข้าวันนี้ (mode extra)
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

  const options = useMemo(() => {
    const out: Option[] = [];
    const seen = new Set<string>(ex ? [normName(ex.name)] : []);
    const musclesOf = (name: string) =>
      muscleMap(name)
        .map((h) => MUSCLE_TH[h.m])
        .slice(0, 2)
        .join("/") || "—";

    // ท่าทั้งหมดในโปรแกรม (ทุกวัน ทุกกลุ่มกล้ามเนื้อ)
    for (const o of data.exercises) {
      if (seen.has(normName(o.name))) continue;
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
    // ท่าจากคลังแนะนำ (ที่ยังไม่มีในโปรแกรม)
    for (const list of Object.values(SUGGESTION_BANK)) {
      for (const c of list) {
        if (seen.has(normName(c.name))) continue;
        seen.add(normName(c.name));
        out.push({
          name: c.name,
          type: c.type,
          sets: ex?.sets ?? c.sets,
          rmin: c.rmin,
          rmax: c.rmax,
          unit: c.type === "time" ? "วิ" : c.type === "weight" ? "kg" : undefined,
          inc: c.type === "weight" ? 2.5 : undefined,
          machine: /machine|cable|pulldown|leg press|leg extension|leg curl|pec deck/i.test(c.name) || undefined,
          from: "คลังท่า",
          muscles: MUSCLE_TH[c.muscle],
        });
      }
    }

    const query = q.trim().toLowerCase();
    const filtered = query
      ? out.filter((o) => o.name.toLowerCase().includes(query) || o.muscles.includes(query) || o.from.includes(query))
      : out;
    return filtered.slice(0, 40);
  }, [data.exercises, ex, q]);

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
          <>เลือกท่าจากวันอื่นหรือคลังท่ามาเล่นเพิ่มวันนี้ — พรุ่งนี้หายไปเอง</>
        )}
      </p>

      <input
        className="w-full px-3 py-2 text-[13px] mb-2"
        placeholder="ค้นหาท่า เช่น squat, ขา, พุธ"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="max-h-[240px] overflow-y-auto -mx-1 px-1">
        {options.map((o) => (
          <button
            key={o.name}
            onClick={() => pick(o)}
            className="w-full flex items-center gap-2 py-2 px-2 rounded-xl text-left active:scale-[.99] transition-transform hairline first:border-0"
          >
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] truncate">
                {o.name}
                {o.machine ? " ⚙" : ""}
              </span>
              <span className="block font-mono2 text-[9.5px] mt-0.5" style={{ color: "var(--dim)" }}>
                {o.from} · {o.muscles} · {o.sets}×{o.rmin}-{o.rmax}
              </span>
            </span>
            <span className="font-mono2 text-[10px] shrink-0" style={{ color: "var(--cyan)" }}>
              {mode === "swap" ? "ใช้แทน" : "+ เพิ่ม"}
            </span>
          </button>
        ))}
        {options.length === 0 && (
          <p className="text-[11.5px] py-2" style={{ color: "var(--dim)" }}>
            ไม่เจอท่าที่ค้นหา — พิมพ์ชื่อท่าเองด้านล่างได้
          </p>
        )}
      </div>

      <div className="flex gap-2 mt-2.5">
        <input
          className="flex-1 px-3 py-2 text-[13px]"
          placeholder="หรือพิมพ์ชื่อท่าเอง"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className="btn-cy !py-2 !px-3.5 !text-[12px] shrink-0"
          onClick={() => {
            const name = q.trim();
            if (name.length < 2) {
              toast("พิมพ์ชื่อท่าก่อน");
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
          ใช้ชื่อนี้
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
