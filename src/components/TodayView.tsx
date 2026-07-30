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
  removeExtra,
  repTargetText,
  todayStr,
} from "../lib/store";
import ExercisePicker from "./ExercisePicker";
import { plateText, restReason, suggestRest, suggestTarget, warmupRamp } from "../lib/progression";
import { haptics } from "../lib/haptics";
import { playExerciseDone, playPR, playTick, unlockAudio } from "../lib/sound";
import { isPremium } from "../lib/premium";
import { findTemplate } from "../lib/exerciseDB";
import SessionClockBar from "./SessionClockBar";
import { sessionClock } from "../lib/session";

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

// จำนวนช่องของแถบพลัง — 10 ช่องอ่านเป็น % ในหัวได้ทันทีโดยไม่ต้องคิดเลข
const SEG_COUNT = 10;

// เซตxเรปแบบย่อสำหรับแถวท่าที่ยังไม่กาง — สั้นพอให้ชื่อท่าไม่ถูกบีบ
function setNotation(ex: Exercise): string {
  if (ex.amrap) return `${ex.sets}×AMRAP`;
  if (ex.type === "time") return `${ex.sets}×${ex.rmin}-${ex.rmax}วิ`;
  return `${ex.sets}×${ex.rmin === ex.rmax ? ex.rmin : `${ex.rmin}-${ex.rmax}`}`;
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
  const { data, update, toast, notice, rest, goTab } = useApp();
  const premium = isPremium(data);
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

  // นาฬิกาเซสชัน — ใช้โชว์เวลาที่มี/เวลาที่เหลือในหัวการ์ด
  const clock = useMemo(() => sessionClock(data, day), [data, day]);

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
        // บันทึกเวลาที่ติ๊กด้วย — นาฬิกาเซสชันคำนวณจาก timestamp ไม่ใช่ตัวนับถอยหลัง
        // เพราะ iOS Safari suspend JS ตอนสลับแอป ตัวนับจะเพี้ยนทันทีที่กลับมา
        const at = Date.now();
        session.sets[idx] =
          ex.type === "time"
            ? { duration: draft.reps, at }
            : ex.type === "bodyweight"
              ? { reps: draft.reps, at }
              : { weight: draft.weight, reps: draft.reps, at };
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
      // PR = เหตุการณ์ที่คนอยากแคปหน้าจอเก็บไว้ ใช้หน้าต่างระบบเต็มจอแทน toast ที่หายเร็วเกิน
      if (isPR)
        notice({
          kind: "pr",
          title: "NEW PR",
          lines: [
            { label: ex.name, value: `${draft.weight} ${ex.unit || "kg"}` },
            { label: "สถิติเดิม", value: `${best} ${ex.unit || "kg"}` },
            { label: "เพิ่มขึ้น", value: `+${+(draft.weight - best).toFixed(2)} ${ex.unit || "kg"}`, good: true },
            { label: "ทำได้", value: `${draft.reps} ครั้ง` },
          ],
        });
      // เล่นครบทุกเซตของวัน — จบเควสต์ของวันนั้น
      else if (lastSet && cntBefore + 1 >= ex.sets && doneSets + 1 >= totalSets)
        notice({
          kind: "complete",
          title: "COMPLETE",
          lines: [
            { label: "วัน", value: label || DAY_TH[day] },
            { label: "ท่าทั้งหมด", value: `${exs.length} ท่า` },
            { label: "เซตที่ทำ", value: `${totalSets} เซต`, good: true },
            ...(volume > 0 ? [{ label: "ยกรวม", value: `${volume.toLocaleString()} kg` }] : []),
          ],
          footer: "ครบทุกเซตตามตาราง — พักให้พอแล้วเจอกันวันฝึกถัดไป",
        });
      // พักอัตโนมัติด้วยเวลาที่เหมาะกับท่านั้น (ไม่พักถ้าเป็นเซตสุดท้ายของท่า)
      if (data.settings.autoRest && !lastSet) rest.current?.start(restForExercise(data, ex, restSec), ex.name);
    }
  }

  return (
    <div className="rise">
      <div className="glass p-4 mb-3 relative overflow-hidden">
        {/* glow blob มุมบนขวา */}
        <div
          className="absolute pointer-events-none"
          style={{ top: -40, right: -30, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, var(--acc-18), transparent 70%)" }}
        />
        {/* หัวเควสต์ของวัน — ชื่อวันเป็นพระเอก แถบแบ่งช่องอ่านค่าจากระยะไกลง่ายกว่าวงแหวน */}
        <div className="relative">
          <div className="sys-label mb-2">
            {exs.length ? "QUEST" : "REST DAY"} · {DAY_TH[day]}
            {isToday ? " · วันนี้" : ""}
          </div>
          <div className="flex items-center gap-2">
            <h2 className="font-disp font-bold text-[26px] leading-none tracking-wide text-glow">
              {exs.length ? label || DAY_TH[day] : "วันพัก"}
            </h2>
            {allDone && (
              <span
                className="font-mono2 text-[9px] px-2 py-[3px] shrink-0 cut-sm"
                style={{ background: "var(--acc-18)", color: "var(--acc)", border: "1px solid color-mix(in srgb, var(--acc) 45%, transparent)" }}
              >
                CLEAR ✓
              </span>
            )}
          </div>
          <p className="text-[12px] mt-1.5" style={{ color: "var(--mut)" }}>
            {exs.length
              ? `${exs.length} ท่า · ${totalSets} เซต${clock ? ` · เวลาที่มี ${clock.capMin} นาที` : ""}`
              : "พักฟื้นกล้ามเนื้อ"}
          </p>

          {exs.length > 0 && (
            <>
              <div className="seg-bar mt-3">
                {Array.from({ length: SEG_COUNT }, (_, i) => (
                  <i key={i} className={totalSets && i < Math.round((doneSets / totalSets) * SEG_COUNT) ? "on" : ""} />
                ))}
              </div>
              <div className="flex justify-between font-mono2 text-[10.5px] mt-1.5" style={{ color: "var(--mut)" }}>
                <span>
                  {doneSets} / {totalSets} เซต
                </span>
                <span style={{ color: volume > 0 ? "var(--acc)" : undefined }}>
                  {clock && clock.startedAt != null
                    ? clock.remainMin >= 0
                      ? `เหลือ ${clock.remainMin} นาที`
                      : `เลยมา ${-clock.remainMin} นาที`
                    : volume > 0
                      ? `ยกไปแล้ว ${volume.toLocaleString()} kg`
                      : ""}
                </span>
              </div>
            </>
          )}
        </div>
        {exs.length > 0 && (
          <div className="hairline mt-3.5 pt-3 flex items-center gap-2">
            <button
              className={`btn-gh !py-2.5 !text-[11px] font-mono2 shrink-0 ${data.settings.autoRest ? "" : "opacity-50"}`}
              style={{ flex: "0 0 76px" }}
              onClick={() => {
                update((d) => {
                  d.settings.autoRest = !d.settings.autoRest;
                });
                toast(data.settings.autoRest ? "ปิดจับเวลาอัตโนมัติ" : "เปิดจับเวลาอัตโนมัติ");
              }}
            >
              AUTO {data.settings.autoRest ? "ON" : "OFF"}
            </button>
            <div className="glass-inset flex items-center px-1 flex-1 justify-between">
              {[60, 90, 120, 180].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setRestSec(s);
                    update((d) => {
                      d.settings.restDefault = s;
                    });
                  }}
                  className="font-mono2 text-[10.5px] py-[7px] flex-1 cut-sm text-center transition-all"
                  style={
                    restSec === s
                      ? { color: "#031420", background: "linear-gradient(180deg, var(--acc), var(--acc-2))", fontWeight: 700, boxShadow: "0 0 12px -2px var(--acc-40)" }
                      : { color: "#5c7a9c" }
                  }
                >
                  {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
                </button>
              ))}
            </div>
            <button className="btn-cy !py-2.5 !px-3.5 !text-[11px] font-mono2 shrink-0" onClick={() => rest.current?.start(restSec)}>
              ▶
            </button>
          </div>
        )}
      </div>

      <SessionClockBar day={day} isToday={isToday} />

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
              className={`flex-1 flex flex-col items-center gap-1 py-2 glass-soft transition-all${selected ? " fill" : ""}`}
              style={
                selected
                  ? {
                      background: "linear-gradient(180deg, var(--acc), var(--acc-2))",
                      color: "#031420",
                      boxShadow: "0 6px 16px -4px color-mix(in srgb, var(--acc) 56%, transparent)",
                    }
                  : { color: has ? "var(--mut)" : "var(--dim)" }
              }
            >
              <span className="font-mono2 text-[10.5px] font-bold">{DAY_TH_SHORT[d]}</span>
              <span
                className="w-[5px] h-[5px] rounded-full"
                style={{
                  background: selected ? "#03131C" : complete ? "var(--acc)" : has ? "color-mix(in srgb, var(--acc) 45%, transparent)" : "var(--dim)",
                }}
              />
            </button>
          );
        })}
      </div>

      {exs.length === 0 && (
        <div className="glass text-center" style={{ padding: 26 }}>
          <div className="text-[34px] mb-2">🌙</div>
          <div className="font-disp font-semibold text-[16px]" style={{ color: "var(--ink)" }}>
            วันนี้พัก
          </div>
          <p className="text-[12.5px] mt-1.5 leading-relaxed" style={{ color: "var(--mut)" }}>
            ให้กล้ามเนื้อได้ฟื้นตัว — เลือกวันอื่นด้านบนเพื่อดูตาราง
          </p>
        </div>
      )}

      {exs.map((ex) => {
        const cnt = doneCount(ex.id);
        const complete = cnt >= ex.sets;
        const partial = cnt > 0 && !complete;
        const open = openId === ex.id;
        const target = suggestTarget(data, ex);
        const firstWeight = draftFor(ex, 0).weight;
        const warmup = premium && open && ex.type === "weight" ? warmupRamp(ex, firstWeight) : [];

        return (
          <div
            key={ex.id}
            className={`glass mb-2.5 overflow-hidden transition-all ${open ? "edge-glow" : ""}`}
            style={
              complete
                ? {
                    borderColor: "color-mix(in srgb, var(--acc) 38%, transparent)",
                    background: "linear-gradient(158deg, color-mix(in srgb, var(--acc) 10%, #0b1524), #070c18f2)",
                    boxShadow: "inset 3px 0 0 0 var(--acc), 0 12px 34px #000000a6",
                  }
                : undefined
            }
          >
            <div className="w-full flex items-center gap-2 px-4 py-3.5">
              <button
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                onClick={() => setOpenId(open ? null : ex.id)}
              >
                {/* เลขลำดับท่า / ✓ เมื่อครบ — เลขบอกว่าอยู่ท่าที่เท่าไหร่ของวันโดยไม่ต้องนับเอง */}
                <span
                  className="w-6 flex items-center justify-center text-[11px] font-mono2 font-bold shrink-0 transition-all"
                  style={{ color: complete ? "var(--acc)" : partial ? "var(--acc)" : "var(--dim)", textShadow: complete ? "0 0 8px color-mix(in srgb, var(--acc) 75%, transparent)" : undefined }}
                >
                  {complete ? "✓" : partial ? cnt : String(exs.indexOf(ex) + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 min-w-0">
                  <b
                    className="block text-[14.5px] font-semibold leading-snug"
                    style={complete ? { color: "var(--mut)" } : undefined}
                  >
                    {ex.name}
                  </b>
                  <span className="flex items-center flex-wrap gap-1.5 mt-[5px]">
                    <span className="font-mono2 text-[9.5px]" style={{ color: "var(--acc)" }}>
                      {setNotation(ex)}
                    </span>
                    {ex.machine && (
                      <span className="font-mono2 text-[9.5px]" style={{ color: "var(--cyan-dim)" }}>
                        เครื่อง
                      </span>
                    )}
                    {ex.swapped && (
                      <span className="font-mono2 text-[9.5px]" style={{ color: "var(--warn)" }}>
                        · แทน {data.exercises.find((e) => e.id === ex.origId)?.name ?? "ท่าเดิม"}
                      </span>
                    )}
                    {ex.extra && (
                      <span className="font-mono2 text-[9.5px]" style={{ color: "var(--acc-2)" }}>
                        · เพิ่มวันนี้
                      </span>
                    )}
                  </span>
                </span>
              </button>

              {/* ปุ่มเล็กเปลี่ยนท่า — เฉพาะวันนี้ */}
              {isToday && (
                <button
                  className="w-8 h-8 cut-sm shrink-0 flex items-center justify-center text-[12px] transition-all"
                  style={{
                    background: ex.swapped || ex.extra ? "var(--acc-18)" : "var(--acc-08)",
                    border: `1px solid ${ex.swapped || ex.extra ? "var(--edge-hi)" : "color-mix(in srgb, var(--acc) 24%, transparent)"}`,
                    color: "var(--acc)",
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

              {/* ท่าที่เพิ่งเพิ่มเข้าวันนี้ — เอาออกได้ในคลิกเดียว ไม่ต้องเข้าเมนูเปลี่ยนท่า */}
              {isToday && ex.extra && (
                <button
                  className="w-8 h-8 cut-sm shrink-0 flex items-center justify-center text-[12px]"
                  style={{ background: "rgba(255,107,107,.10)", border: "1px solid rgba(255,107,107,.3)", color: "var(--bad)" }}
                  aria-label="เอาท่านี้ออกจากวันนี้"
                  onClick={() => {
                    update((d) => removeExtra(d, ex.name));
                    toast(`เอา ${ex.name} ออกแล้ว`);
                  }}
                >
                  ✕
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
                {premium
                  ? data.settings.showCoachNotes !== false && (
                      <div
                        className="glass-inset px-3 py-2.5 mb-3 flex items-start gap-2.5"
                        style={{ borderColor: "color-mix(in srgb, var(--acc) 26%, transparent)", background: "var(--acc-08)" }}
                      >
                        <span className="text-[13px] mt-px">🎯</span>
                        <span className="text-[12.5px] leading-relaxed" style={{ color: "#dbe9f7" }}>
                          {target.msg}
                          {/* บอกวิธีใส่แผ่นเลย จะได้ไม่ต้องคิดเลขหน้าแร็ค */}
                          {(() => {
                            const pt = plateText(data, ex, target.weight ?? firstWeight ?? 0);
                            return pt ? (
                              <span className="block font-mono2 text-[11px] mt-1" style={{ color: "var(--acc)" }}>
                                {pt}
                              </span>
                            ) : null;
                          })()}
                        </span>
                      </div>
                    )
                  : /* หมดช่วงทดลอง — รวมเป้าหมายวันนี้ + warm-up ไว้แถวเดียว ไม่ให้การ์ดรกด้วยแถวล็อกหลายอัน */ (
                      <button
                        className="glass-inset w-full px-3 py-2.5 mb-3 flex items-center gap-2.5 text-left"
                        onClick={() => goTab("manage")}
                      >
                        <span className="text-[13px]">🔒</span>
                        <span className="text-[12px] flex-1 leading-snug" style={{ color: "var(--mut)" }}>
                          เป้าหมายน้ำหนักวันนี้ + warm-up
                        </span>
                        <span className="font-mono2 text-[10px] shrink-0" style={{ color: "var(--acc)" }}>
                          ปลดล็อก
                        </span>
                      </button>
                    )}

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

                {/* วิธีเล่นท่านี้ — ดึงจากคลังท่าตามชื่อ (ไม่เก็บซ้ำในข้อมูลผู้ใช้ อัปเดตคลังแล้วได้ของใหม่เลย)
                    ไม่ล็อกเพราะเป็นความรู้พื้นฐานที่ควรได้ฟรี ไม่ใช่ "สมองโค้ช" ที่คำนวณจากประวัติ */}
                {findTemplate(ex.name)?.tip && (
                  <div className="glass-inset px-3 py-2.5 mb-3 flex items-start gap-2.5">
                    <span className="text-[13px] mt-px">💡</span>
                    <span className="text-[12px] leading-relaxed" style={{ color: "var(--mut)" }}>
                      {findTemplate(ex.name)!.tip}
                    </span>
                  </div>
                )}

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
                          className="font-mono2 text-[11px] px-2.5 py-1 cut-sm"
                          style={{
                            background: "var(--acc-12)",
                            border: "1px solid color-mix(in srgb, var(--acc) 24%, transparent)",
                            color: "var(--acc)",
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
                        className="w-[40px] h-[38px] cut-sm shrink-0 text-[14px] transition-all"
                        style={
                          checked
                            ? { background: "linear-gradient(180deg, var(--acc), var(--acc-2))", color: "#050a18", border: "none", boxShadow: "0 4px 14px -4px color-mix(in srgb, var(--acc) 65%, transparent)" }
                            : { background: "rgba(10,22,34,.9)", border: "1px solid var(--edge)", color: "var(--dim)" }
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

function ProgressRing({ pct, done, total, allDone }: { pct: number; done: number; total: number; allDone: boolean }) {
  const box = 78,
    r = 31,
    sw = 6,
    c = box / 2,
    circ = 2 * Math.PI * r;
  return (
    <div className={`relative shrink-0 ${allDone ? "pulse-cy rounded-full" : ""}`} style={{ width: box, height: box }}>
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
        <defs>
          <linearGradient id="heroRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--acc)" }} />
            <stop offset="100%" style={{ stopColor: "var(--acc-2)" }} />
          </linearGradient>
        </defs>
        <g style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}>
          <circle cx={c} cy={c} r={r} stroke="rgba(125,180,255,.10)" strokeWidth={sw} fill="none" />
          <circle
            cx={c}
            cy={c}
            r={r}
            stroke="url(#heroRing)"
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            style={{
              transition: "stroke-dashoffset .6s cubic-bezier(.2,.7,.3,1)",
              filter: allDone
                ? "drop-shadow(0 0 7px color-mix(in srgb, var(--acc) 70%, transparent))"
                : "drop-shadow(0 0 6px color-mix(in srgb, var(--acc) 47%, transparent))",
            }}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-mono2 text-[18px] font-bold num-glow" style={{ color: allDone ? "var(--acc)" : "var(--ink)" }}>
          {total ? done : "—"}
        </span>
        {total > 0 && (
          <span className="font-mono2 text-[11px]" style={{ color: "var(--dim)" }}>
            /{total}
          </span>
        )}
      </div>
    </div>
  );
}

function Stepper({ val, unit, onDelta }: { val: number; unit: string; onDelta: (dir: number) => void }) {
  return (
    <div className="glass-inset flex items-center flex-1 min-w-0 overflow-hidden">
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
