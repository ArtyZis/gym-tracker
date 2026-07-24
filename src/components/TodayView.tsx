import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import type { Data, EffectiveExercise, Exercise } from "../lib/store";
import {
  DAYS,
  DAY_TH,
  DAY_TH_SHORT,
  JS_DAYS,
  effectiveExercisesForDay,
  exercisesForDay,
  repTargetText,
  todayStr,
} from "../lib/store";
import ExercisePicker from "./ExercisePicker";
import { restReason, suggestRest, suggestTarget, warmupRamp } from "../lib/progression";
import { haptics } from "../lib/haptics";
import { playExerciseDone, playPR, playTick, unlockAudio } from "../lib/sound";

// เวลาพักที่จะใช้จริง: ถ้าเปิด smart rest ใช้ค่าที่แนะนำต่อท่า, ถ้าปิดใช้ค่ากลาง
function restForExercise(data: Data, ex: Exercise, fallback: number): number {
  if (data.settings.smartRest === false) return ex.restSec ?? fallback;
  return suggestRest(ex);
}

function formatRest(sec: number): string {
  return sec < 60 ? `${sec} วิ` : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

interface Draft {
  weight: number;
  reps: number;
}

function todayVolume(data: Data, exIds: string[]): number {
  let vol = 0;
  for (const id of exIds) {
    const session = (data.history[id] || []).find((s) => s.date === todayStr());
    if (session) for (const st of session.sets) if (st?.weight && st.reps) vol += st.weight * st.reps;
  }
  return Math.round(vol);
}

export default function TodayView() {
  const { data, update, toast, rest } = useApp();
  const [day, setDay] = useState(() => {
    const today = JS_DAYS[new Date().getDay()];
    return exercisesForDay(data, today).length ? today : (DAYS.find((d) => exercisesForDay(data, d).length) ?? today);
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [restSec, setRestSec] = useState(data.settings.restDefault ?? 90);
  const [swapFor, setSwapFor] = useState<string | null>(null); // id ท่าที่กำลังเลือกเปลี่ยน
  const [addingExtra, setAddingExtra] = useState(false); // กำลังเพิ่มท่าเข้าวันนี้

  // วันนี้ใช้ท่าที่ผ่านการสลับชั่วคราวแล้ว (วันอื่นเป็นท่าตามโปรแกรม)
  const exs = effectiveExercisesForDay(data, day);
  const label = data.dayLabels[day];
  const isToday = day === JS_DAYS[new Date().getDay()];

  const todaySession = (exId: string) => (data.history[exId] || []).find((s) => s.date === todayStr());
  const doneCount = (exId: string) => {
    const s = todaySession(exId);
    return s ? s.sets.filter(Boolean).length : 0;
  };
  const isDone = (ex: Exercise) => doneCount(ex.id) >= ex.sets;

  const totalSets = exs.reduce((a, e) => a + e.sets, 0);
  const doneSets = exs.reduce((a, e) => a + Math.min(doneCount(e.id), e.sets), 0);
  const allDone = totalSets > 0 && doneSets >= totalSets;

  const volume = useMemo(
    () =>
      todayVolume(
        data,
        exs.map((e) => e.id),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, day],
  );

  function draftFor(ex: Exercise, idx: number): Draft {
    const key = ex.id + "_" + idx;
    if (drafts[key]) return drafts[key];
    const session = todaySession(ex.id);
    if (session?.sets[idx]) {
      const st = session.sets[idx]!;
      return { weight: st.weight ?? 0, reps: st.reps ?? st.duration ?? 0 };
    }
    const prev = idx > 0 ? drafts[ex.id + "_" + (idx - 1)] : undefined;
    const target = suggestTarget(data, ex);
    return {
      weight: prev ? prev.weight : (target.weight ?? (ex.type === "weight" ? 4 * (ex.inc || 2.5) : 0)),
      reps: prev ? prev.reps : ex.type === "time" ? ex.rmax : ex.rmax > 100 ? 8 : ex.rmax,
    };
  }

  function bump(ex: Exercise, idx: number, field: "weight" | "reps", dir: number) {
    const key = ex.id + "_" + idx;
    const cur = draftFor(ex, idx);
    const next =
      field === "weight"
        ? Math.max(0, +(cur.weight + dir * (ex.inc || 2.5)).toFixed(2))
        : Math.max(0, cur.reps + dir * (ex.type === "time" ? 5 : 1));
    setDrafts((d) => ({ ...d, [key]: { ...cur, [field]: next } }));
  }

  function bestPriorWeight(exId: string): number {
    const sessions = (data.history[exId] || []).filter((s) => s.date !== todayStr());
    let best = 0;
    for (const s of sessions) for (const st of s.sets) if (st?.weight && st.weight > best) best = st.weight;
    return best;
  }

  function toggleSet(ex: Exercise, idx: number, override?: Draft) {
    const draft = override ?? draftFor(ex, idx);
    const already = !!todaySession(ex.id)?.sets[idx];
    const cntBefore = doneCount(ex.id);
    const best = bestPriorWeight(ex.id);
    const isPR = !already && ex.type === "weight" && draft.weight > best && best > 0;

    update((d) => {
      if (!d.history[ex.id]) d.history[ex.id] = [];
      let session = d.history[ex.id].find((s) => s.date === todayStr());
      if (!session) {
        session = { date: todayStr(), sets: [] };
        d.history[ex.id].push(session);
        d.history[ex.id].sort((a, b) => a.date.localeCompare(b.date));
      }
      if (session.sets[idx]) {
        session.sets[idx] = null;
      } else {
        session.sets[idx] =
          ex.type === "time"
            ? { duration: draft.reps }
            : ex.type === "bodyweight"
              ? { reps: draft.reps }
              : { weight: draft.weight, reps: draft.reps };
      }
      if (session.sets.every((s) => !s)) d.history[ex.id] = d.history[ex.id].filter((s) => s !== session);
    });

    if (!already) {
      const lastSet = cntBefore + 1 >= ex.sets;
      // เสียง + สั่น ต่างกันตามเหตุการณ์: PR > ครบท่า > ติ๊กปกติ
      if (isPR) {
        haptics.pr();
        playPR();
      } else if (lastSet) {
        haptics.exerciseDone();
        playExerciseDone();
      } else {
        haptics.tick();
        playTick();
      }
      if (isPR) toast(`⚡ NEW PR — ${ex.name} ${draft.weight} ${ex.unit || "kg"}!`, true);
      // พักอัตโนมัติด้วยเวลาที่เหมาะกับท่านั้น (ไม่พักถ้าเป็นเซตสุดท้ายของท่า)
      if (data.settings.autoRest && !lastSet) rest.current?.start(restForExercise(data, ex, restSec), ex.name);
    }
  }

  return (
    <div className="rise">
      <div className="glass p-4 mb-3">
        <div className="flex items-center gap-4">
          <ProgressRing pct={totalSets ? doneSets / totalSets : 0} label={totalSets ? `${doneSets}/${totalSets}` : "—"} big={allDone} />
          <div className="flex-1 min-w-0">
            <h2 className="font-disp font-bold text-[20px] leading-tight">
              {exs.length ? label || DAY_TH[day] : "วันพัก"}
            </h2>
            <p className="text-[12.5px] mt-0.5" style={{ color: "var(--mut)" }}>
              {exs.length
                ? `${DAY_TH[day]}${isToday ? " · วันนี้" : ""} · ${exs.length} ท่า${allDone ? " · ครบแล้ว 🎉" : ` · เหลือ ${totalSets - doneSets} เซต`}`
                : `${DAY_TH[day]}${isToday ? " · วันนี้" : ""} · ไม่มีท่าฝึก`}
            </p>
            {volume > 0 && (
              <p className="font-mono2 text-[11px] mt-1" style={{ color: "var(--cyan)" }}>
                ยกไปแล้ว {volume.toLocaleString()} kg วันนี้
              </p>
            )}
          </div>
        </div>
        <div className="hairline mt-3.5 pt-3 flex items-center gap-2">
          <button
            className={`flex-1 btn-gh !py-2.5 !text-[11px] font-mono2 ${data.settings.autoRest ? "" : "opacity-50"}`}
            onClick={() => {
              update((d) => {
                d.settings.autoRest = !d.settings.autoRest;
              });
              toast(data.settings.autoRest ? "ปิดจับเวลาอัตโนมัติ" : "เปิดจับเวลาอัตโนมัติ");
            }}
          >
            AUTO {data.settings.autoRest ? "ON" : "OFF"}
          </button>
          <div className="glass-inset flex items-center px-1">
            {[60, 90, 120, 180].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setRestSec(s);
                  update((d) => {
                    d.settings.restDefault = s;
                  });
                }}
                className="font-mono2 text-[10.5px] px-2 py-2 rounded-lg"
                style={restSec === s ? { color: "var(--cyan)", background: "rgba(79,216,255,.12)" } : { color: "var(--dim)" }}
              >
                {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
              </button>
            ))}
          </div>
          <button className="btn-gh !py-2.5 !px-3 !text-[11px] font-mono2" onClick={() => rest.current?.start(restSec)}>
            ▶ START
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 mb-3">
        {DAYS.map((d) => {
          const dayExs = exercisesForDay(data, d);
          const has = dayExs.length > 0;
          const complete = has && dayExs.every(isDone);
          const selected = d === day;
          return (
            <button
              key={d}
              onClick={() => {
                setDay(d);
                setOpenId(null);
              }}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl glass-soft transition-all"
              style={
                selected
                  ? {
                      background: "linear-gradient(180deg, rgba(79,216,255,.9), rgba(61,150,220,.9))",
                      border: "1px solid transparent",
                      color: "#03131C",
                      boxShadow: "0 0 14px rgba(79,216,255,.35)",
                    }
                  : { color: has ? "var(--mut)" : "var(--dim)" }
              }
            >
              <span className="font-mono2 text-[10.5px] font-bold">{DAY_TH_SHORT[d]}</span>
              <span
                className="w-[5px] h-[5px] rounded-full"
                style={{
                  background: selected ? "#03131C" : complete ? "var(--good)" : has ? "var(--cyan-dim)" : "var(--dim)",
                }}
              />
            </button>
          );
        })}
      </div>

      {exs.length === 0 && (
        <div className="glass p-7 text-center text-[13px]" style={{ color: "var(--dim)" }}>
          ไม่มีท่าฝึกในวันนี้
          <br />
          เลือกวันอื่น หรือเพิ่มท่าที่แท็บจัดการ
        </div>
      )}

      {exs.map((ex) => {
        const cnt = doneCount(ex.id);
        const complete = cnt >= ex.sets;
        const partial = cnt > 0 && !complete;
        const open = openId === ex.id;
        const target = suggestTarget(data, ex);
        const firstWeight = draftFor(ex, 0).weight;
        const warmup = open && ex.type === "weight" ? warmupRamp(ex, firstWeight) : [];

        return (
          <div
            key={ex.id}
            className={`glass mb-2.5 overflow-hidden transition-all ${open ? "edge-glow" : ""}`}
            style={complete ? { borderColor: "rgba(74,222,156,.4)" } : undefined}
          >
            <div className="w-full flex items-center gap-2 px-4 py-3.5">
              <button
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                onClick={() => setOpenId(open ? null : ex.id)}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono2 font-bold shrink-0 transition-all"
                  style={
                    complete
                      ? { background: "var(--good)", color: "#04140C", boxShadow: "0 0 10px rgba(74,222,156,.5)" }
                      : partial
                        ? { border: "1.5px solid var(--cyan)", color: "var(--cyan)" }
                        : { border: "1.5px solid var(--edge-hi)", color: "transparent" }
                  }
                >
                  {complete ? "✓" : partial ? cnt : ""}
                </span>
                <span className="flex-1 min-w-0">
                  <b className="block text-[14.5px] font-semibold leading-snug">{ex.name}</b>
                  <span className="block font-mono2 text-[10.5px] mt-0.5" style={{ color: "var(--mut)" }}>
                    {ex.sets} เซต · {repTargetText(ex)}
                    {ex.machine && <span style={{ color: "var(--cyan-dim)" }}> · เครื่อง</span>}
                    {ex.swapped && (
                      <span style={{ color: "var(--warn)" }}>
                        {" "}
                        · แทน {data.exercises.find((e) => e.id === ex.origId)?.name ?? "ท่าเดิม"}
                      </span>
                    )}
                    {ex.extra && <span style={{ color: "var(--good)" }}> · เพิ่มวันนี้</span>}
                  </span>
                </span>
              </button>

              {/* ปุ่มเล็กเปลี่ยนท่า — เฉพาะวันนี้ */}
              {isToday && (
                <button
                  className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[12px] transition-all"
                  style={{
                    background: ex.swapped || ex.extra ? "rgba(79,216,255,.18)" : "rgba(79,216,255,.08)",
                    border: `1px solid ${ex.swapped || ex.extra ? "var(--edge-hi)" : "rgba(120,205,255,.24)"}`,
                    color: "var(--cyan)",
                  }}
                  aria-label="เปลี่ยนท่าวันนี้"
                  onClick={() => {
                    setOpenId(ex.id);
                    setSwapFor(swapFor === ex.id ? null : ex.id);
                    setAddingExtra(false);
                  }}
                >
                  ⇄
                </button>
              )}

              <button
                className="shrink-0 text-[11px] px-1 transition-transform"
                style={{ color: "var(--dim)", transform: open ? "rotate(180deg)" : "" }}
                onClick={() => setOpenId(open ? null : ex.id)}
                aria-label="ขยาย"
              >
                ▾
              </button>
            </div>

            {open && (
              <div className="px-4 pb-4">
                <div className="glass-inset px-3 py-2.5 mb-3 flex items-start gap-2.5">
                  <span className="text-[13px] mt-px">🎯</span>
                  <span className="text-[12.5px] leading-relaxed" style={{ color: "var(--ink)" }}>
                    {target.msg}
                  </span>
                </div>

                {/* เวลาพักที่แนะนำสำหรับท่านี้ — กดเพื่อเริ่มจับเวลาด้วยเวลานี้ทันที */}
                <button
                  className="glass-inset w-full px-3 py-2 mb-3 flex items-center justify-between gap-2 active:scale-[.98] transition-transform"
                  onClick={() => {
                    unlockAudio();
                    rest.current?.start(suggestRest(ex), ex.name);
                  }}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-[13px]">⏱️</span>
                    <span className="text-[12px] truncate" style={{ color: "var(--mut)" }}>
                      พัก <b style={{ color: "var(--cyan)" }}>{formatRest(suggestRest(ex))}</b> · {restReason(ex)}
                    </span>
                  </span>
                  <span className="font-mono2 text-[10px] shrink-0" style={{ color: "var(--cyan-dim)" }}>
                    ▶ เริ่มพัก
                  </span>
                </button>

                {/* เปลี่ยนท่าเฉพาะวันนี้ — เปิดจากปุ่ม ⇄ ข้างชื่อท่า */}
                {isToday && swapFor === ex.id && (
                  <ExercisePicker mode="swap" ex={ex} onClose={() => setSwapFor(null)} />
                )}

                {warmup.length > 0 && (
                  <div className="glass-inset px-3 py-2.5 mb-3">
                    <div
                      className="font-mono2 text-[9px] uppercase tracking-[.18em] mb-1.5"
                      style={{ color: "var(--cyan-dim)" }}
                    >
                      Warm-up ก่อนเซตจริง
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {warmup.map((w, i) => (
                        <span
                          key={i}
                          className="font-mono2 text-[11px] px-2.5 py-1 rounded-lg"
                          style={{
                            background: "rgba(79,216,255,.08)",
                            border: "1px solid rgba(120,205,255,.18)",
                            color: "var(--cyan)",
                          }}
                        >
                          {w.weight} × {w.reps} <span style={{ color: "var(--dim)" }}>({w.pct}%)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Array.from({ length: ex.sets }).map((_, idx) => {
                  const draft = draftFor(ex, idx);
                  const checked = !!todaySession(ex.id)?.sets[idx];
                  return (
                    <div key={idx} className={`flex items-center gap-2 py-1.5 ${checked ? "opacity-60" : ""}`}>
                      <span className="font-mono2 text-[10px] w-4 shrink-0" style={{ color: "var(--dim)" }}>
                        {idx + 1}
                      </span>
                      {ex.type === "weight" && (
                        <Stepper val={draft.weight} unit={ex.unit || "kg"} onDelta={(d) => bump(ex, idx, "weight", d)} />
                      )}
                      <Stepper
                        val={draft.reps}
                        unit={ex.type === "time" ? "วิ" : "ครั้ง"}
                        onDelta={(d) => bump(ex, idx, "reps", d)}
                      />
                      <button
                        onClick={() => toggleSet(ex, idx)}
                        className="w-[40px] h-[38px] rounded-xl shrink-0 text-[14px] transition-all"
                        style={
                          checked
                            ? { background: "var(--good)", color: "#04140C", boxShadow: "0 0 10px rgba(74,222,156,.4)" }
                            : { background: "rgba(6,12,22,.6)", border: "1px solid var(--edge)", color: "var(--dim)" }
                        }
                      >
                        ✓
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* เพิ่มท่าเข้าวันนี้ชั่วคราว — เช่น ดึงท่าขาจากวันขามาเล่นเพิ่ม */}
      {isToday &&
        (addingExtra ? (
          <ExercisePicker mode="extra" onClose={() => setAddingExtra(false)} />
        ) : (
          <button
            className="btn-gh w-full !py-2.5 !text-[12px] mt-1"
            onClick={() => {
              setAddingExtra(true);
              setSwapFor(null);
            }}
          >
            + เพิ่มท่าเข้าวันนี้ (ชั่วคราว)
          </button>
        ))}
    </div>
  );
}

function ProgressRing({ pct, label, big }: { pct: number; label: string; big: boolean }) {
  const circ = 2 * Math.PI * 25;
  return (
    <div className={`relative w-[62px] h-[62px] shrink-0 ${big ? "pulse-cy rounded-full" : ""}`}>
      <svg width="62" height="62" viewBox="0 0 62 62" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="31" cy="31" r={25} stroke="rgba(120,180,255,.14)" strokeWidth="5" fill="none" />
        <circle
          cx="31"
          cy="31"
          r={25}
          stroke="var(--cyan)"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: "stroke-dashoffset .5s ease", filter: "drop-shadow(0 0 6px rgba(79,216,255,.55))" }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-mono2 text-[12.5px] font-bold"
        style={{ color: "var(--cyan)" }}
      >
        {label}
      </span>
    </div>
  );
}

function Stepper({ val, unit, onDelta }: { val: number; unit: string; onDelta: (dir: number) => void }) {
  return (
    <div className="glass-inset flex items-center flex-1 min-w-0 overflow-hidden" style={{ borderRadius: 12 }}>
      <button
        className="w-[30px] h-[38px] shrink-0 text-[17px] font-semibold"
        style={{ color: "var(--cyan)" }}
        onClick={() => onDelta(-1)}
      >
        −
      </button>
      <span className="flex-1 text-center font-mono2 text-[13.5px] font-bold min-w-0 truncate">{val}</span>
      <span className="font-mono2 text-[8.5px] pr-1.5 shrink-0" style={{ color: "var(--dim)" }}>
        {unit}
      </span>
      <button
        className="w-[30px] h-[38px] shrink-0 text-[17px] font-semibold"
        style={{ color: "var(--cyan)" }}
        onClick={() => onDelta(1)}
      >
        +
      </button>
    </div>
  );
}
