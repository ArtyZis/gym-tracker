import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import type { Data, DayKey, EffectiveExercise, Exercise } from "../lib/store";
import { DAYS, JS_DAYS, addMakeup, dayName, effectiveExercisesForDay, exercisesForDay, makeupSlots, removeExtra, removeMakeup, repTargetText, todayStr } from "../lib/store";
import ExercisePicker from "./ExercisePicker";
import { Icon } from "./ui";
import DayNote from "./DayNote";
import PlateCard from "./PlateCard";
import { plateText, restReason, suggestRest, suggestTarget, warmupRamp } from "../lib/progression";
import { haptics } from "../lib/haptics";
import { playExerciseDone, playPR, playTick, unlockAudio } from "../lib/sound";
import { isPremium } from "../lib/premium";
import { findTemplate } from "../lib/exerciseDB";
import { activeDays, isLoop, slotName, slotShort, todaySlot } from "../lib/loop";
import { exText, repsText, secText, setsText, t } from "../lib/i18n";
import InstallPrompt from "./InstallPrompt";
import { shouldPromptInstall } from "../lib/install";

// เวลาพักที่จะใช้จริง: ถ้าเปิด smart rest ใช้ค่าที่แนะนำต่อท่า, ถ้าปิดใช้ค่ากลาง
function restForExercise(data: Data, ex: Exercise, fallback: number): number {
  if (data.settings.smartRest === false) return ex.restSec ?? fallback;
  return suggestRest(ex);
}

function formatRest(sec: number): string {
  return sec < 60 ? secText(sec) : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
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
  if (ex.type === "time") return `${ex.sets}×${ex.rmin}-${ex.rmax}${t("วิ", "s")}`;
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
  // เปิดมาต้องอยู่ที่ "วันนี้" เสมอ แม้เป็นวันพัก
  //
  // เดิมวันพักจะเด้งไปวันฝึกวันแรกที่เจอ ซึ่งหลอกตา (ดูเหมือนตารางของวันนี้แต่ไม่ใช่)
  // และทำให้ปุ่มชดเชยหายไปด้วย เพราะปุ่มนั้นขึ้นเฉพาะตอนดูวันนี้ —
  // วันว่างคือวันที่คนอยากชดเชยที่สุด การเด้งออกไปจึงปิดทางที่ต้องใช้จริง
  const [day, setDay] = useState(() => todaySlot(data));
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [restSec, setRestSec] = useState(data.settings.restDefault ?? 90);
  const [swapFor, setSwapFor] = useState<string | null>(null); // id ท่าที่กำลังเลือกเปลี่ยน
  const [addingExtra, setAddingExtra] = useState(false); // กำลังเพิ่มท่าเข้าวันนี้
  const [pickMakeup, setPickMakeup] = useState(false); // กำลังเลือกวันที่จะดึงมาชดเชย

  // ชวนเพิ่มลงหน้าจอโฮม — คิดครั้งเดียวตอน mount โดยตั้งใจ
  //
  // ถ้าคิดใหม่ทุก render การ์ดจะโผล่ขึ้นกลางหน้าทันทีที่ติ๊กเซตแรกเสร็จ ดันของทั้งหน้าลง
  // ระหว่างที่เขากำลังจดอยู่ · แบบนี้จะไปโผล่รอบหน้าที่เข้าแท็บนี้แทน ซึ่งเป็นจังหวะที่
  // เขามีข้อมูลจะเสียแล้วจริง และไม่ขัดจังหวะการฝึก
  const [showInstall, setShowInstall] = useState(() =>
    shouldPromptInstall(Object.values(data.history).some((logs) => logs.length > 0)),
  );

  // วันนี้ใช้ท่าที่ผ่านการสลับชั่วคราวแล้ว (วันอื่นเป็นท่าตามโปรแกรม)
  const isToday = day === todaySlot(data);
  const exs = effectiveExercisesForDay(data, day, isToday);
  const label = data.dayLabels[day];

  const todaySession = (exId: string) => (data.history[exId] || []).find((s) => s.date === todayStr());
  const doneCount = (exId: string) => {
    const s = todaySession(exId);
    return s ? s.sets.filter(Boolean).length : 0;
  };
  const isDone = (ex: Exercise) => doneCount(ex.id) >= ex.sets;

  // วันที่ดึงมาชดเชยวันนี้ · วันที่ยังดึงมาได้ (ทุกวันที่มีท่า ยกเว้นวันของตัวเองและที่ดึงมาแล้ว)
  const mkSlots = makeupSlots(data);
  const makeupCandidates = DAYS.filter(
    (s) => s !== todaySlot(data) && exercisesForDay(data, s).length > 0 && !mkSlots.includes(s),
  );
  // ชดเชย "ครบ" = ทำครบทุกท่าของวันนั้น — ตรงกับเงื่อนไขที่สตรีคใช้กู้วันที่ขาด
  const mkDone = (s: DayKey) => {
    const list = exercisesForDay(data, s);
    return list.length > 0 && list.every(isDone);
  };
  // คนจำวันเป็น "วันขา" ไม่ใช่ "พฤหัส" — ถ้าตั้งชื่อวันไว้ให้ใช้ชื่อนั้นก่อน
  const dayTitle = (s: DayKey) => data.dayLabels[s]?.trim() || slotName(data, s);

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

  // น้ำหนักสูงสุดที่ทำได้วันนี้ของท่านี้ (รวมเซตที่กำลังจะติ๊ก)
  function todayBestWeight(exId: string, incoming: number): number {
    let best = incoming;
    const s = todaySession(exId);
    if (s) for (const st of s.sets) if (st?.weight && st.weight > best) best = st.weight;
    return best;
  }

  // RIR ผูกกับ "เซตสุดท้ายที่ติ๊กจริง" ไม่ใช่ ex.sets-1
  // เพราะผู้ใช้อาจติ๊กไม่ครบตามแผน (หมดแรงก่อน) แล้วค่าจะไปเกาะเซตที่ยังว่างอยู่
  const lastRir = (exId: string): number | undefined => {
    const s = todaySession(exId);
    if (!s) return undefined;
    for (let i = s.sets.length - 1; i >= 0; i--) if (s.sets[i]) return s.sets[i]!.rir;
    return undefined;
  };

  function setRir(ex: Exercise, value: number) {
    update((d) => {
      const s = (d.history[ex.id] || []).find((x) => x.date === todayStr());
      if (!s) return;
      for (let i = s.sets.length - 1; i >= 0; i--) {
        if (s.sets[i]) {
          // กดซ้ำค่าเดิม = ยกเลิก (เผื่อกดพลาด ไม่ต้องมีปุ่มลบแยก)
          s.sets[i]!.rir = s.sets[i]!.rir === value ? undefined : value;
          return;
        }
      }
    });
  }

  function toggleSet(ex: Exercise, idx: number, override?: Draft) {
    const draft = override ?? draftFor(ex, idx);
    const already = !!todaySession(ex.id)?.sets[idx];
    const cntBefore = doneCount(ex.id);
    const best = bestPriorWeight(ex.id);
    // PR ขึ้นครั้งเดียวต่อท่า และเฉพาะตอน "ทำครบทุกเซตแล้ว" เท่านั้น
    //
    // เดิมเช็คแค่ว่าน้ำหนักเซตนี้ชนะสถิติเดิมไหม ซึ่ง bestPriorWeight ไม่นับของวันนี้
    // เซตที่ 2, 3, 4 ที่น้ำหนักเท่ากันจึงชนะสถิติเดิมอยู่ดี -> หน้าต่าง PR เด้งซ้ำทุกเซต
    // และเด้งตั้งแต่เซตแรกทั้งที่ยังไม่รู้ว่าจะทำครบไหม
    // ยกหนักขึ้นได้เซตเดียวแล้วหมดแรงไม่ควรนับเป็นสถิติใหม่
    const lastSetOfEx = !already && cntBefore + 1 >= ex.sets;
    const isPR = lastSetOfEx && ex.type === "weight" && best > 0 && todayBestWeight(ex.id, draft.weight) > best;

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
      if (isPR) {
        const top = todayBestWeight(ex.id, draft.weight);
        notice({
          kind: "pr",
          title: "NEW PR",
          lines: [
            { label: ex.name, value: `${top} ${ex.unit || "kg"}` },
            { label: t("สถิติเดิม", "Old best"), value: `${best} ${ex.unit || "kg"}` },
            { label: t("เพิ่มขึ้น", "Gain"), value: `+${+(top - best).toFixed(2)} ${ex.unit || "kg"}`, good: true },
            { label: t("ทำครบ", "Completed"), value: setsText(ex.sets), good: true },
          ],
        });
      }
      // เล่นครบทุกเซตของวัน — จบเควสต์ของวันนั้น
      else if (lastSet && cntBefore + 1 >= ex.sets && doneSets + 1 >= totalSets)
        notice({
          kind: "complete",
          title: "COMPLETE",
          lines: [
            { label: t("วัน", "Day"), value: label || slotName(data, day) },
            { label: t("ท่าทั้งหมด", "Exercises"), value: exText(exs.length) },
            { label: t("เซตที่ทำ", "Sets done"), value: setsText(totalSets), good: true },
            ...(volume > 0 ? [{ label: t("ยกรวม", "Total volume"), value: `${volume.toLocaleString()} kg` }] : []),
          ],
          footer: t(
            "ครบทุกเซตตามตาราง — พักให้พอแล้วเจอกันวันฝึกถัดไป",
            "Every set on the board. Rest up — see you next session.",
          ),
        });
      // พักอัตโนมัติด้วยเวลาที่เหมาะกับท่านั้น (ไม่พักถ้าเป็นเซตสุดท้ายของท่า)
      if (data.settings.autoRest && !lastSet) rest.current?.start(restForExercise(data, ex, restSec), ex.name);
    }
  }

  return (
    <div className="rise">
      {showInstall && <InstallPrompt onDone={() => setShowInstall(false)} />}
      <div className="glass p-4 mb-3 relative overflow-hidden">
        {/* glow blob มุมบนขวา */}
        <div
          className="absolute pointer-events-none"
          style={{ top: -40, right: -30, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, var(--acc-18), transparent 70%)" }}
        />
        {/* หัวเควสต์ของวัน — ชื่อวันเป็นพระเอก แถบแบ่งช่องอ่านค่าจากระยะไกลง่ายกว่าวงแหวน */}
        <div className="relative">
          <div className="sys-label mb-2">
            {exs.length ? "QUEST" : "REST DAY"} · {slotName(data, day)}
            {isToday ? t(" · วันนี้", " · TODAY") : ""}
          </div>
          <div className="flex items-center gap-2">
            <h2 className="font-disp font-bold text-[26px] leading-none tracking-wide text-glow">
              {exs.length ? label || slotName(data, day) : t("วันพัก", "Rest day")}
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
            {exs.length ? `${exText(exs.length)} · ${setsText(totalSets)}` : t("พักฟื้นกล้ามเนื้อ", "Muscle recovery")}
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
                  {doneSets} / {setsText(totalSets)}
                </span>
                <span style={{ color: volume > 0 ? "var(--acc)" : undefined }}>
                  {volume > 0 ? t(`ยกไปแล้ว ${volume.toLocaleString()} kg`, `${volume.toLocaleString()} kg lifted`) : ""}
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
                toast(data.settings.autoRest ? t("ปิดจับเวลาอัตโนมัติ", "Auto rest timer off") : t("เปิดจับเวลาอัตโนมัติ", "Auto rest timer on"));
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
            <button
              className="btn-cy !py-2.5 !px-4 shrink-0 flex items-center justify-center"
              onClick={() => rest.current?.start(restSec)}
              aria-label={t("เริ่มจับเวลาพัก", "Start rest timer")}
            >
              <Icon name="play" size={11} />
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 mb-3">
        {activeDays(data).map((d) => {
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
              <span className="font-mono2 text-[10.5px] font-bold">{slotShort(data, d)}</span>
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

      {/* วันพัก = โหมดสแตนด์บาย — กรอบประให้ดูเป็นสถานะที่ตั้งใจ
          ไม่ใช่การ์ดเปล่าที่ดูเหมือนโหลดไม่ขึ้น */}
      {exs.length === 0 && (
        <div
          className="text-center"
          style={{
            padding: "26px 18px",
            border: "1px dashed color-mix(in srgb, var(--acc) 26%, transparent)",
            background: "#070b1899",
          }}
        >
          <div className="font-mono2 text-[9px] tracking-[.3em]" style={{ color: "var(--acc)" }}>
            STANDBY
          </div>
          <div className="font-disp font-bold text-[19px] mt-2 tracking-wide" style={{ color: "var(--ink)" }}>
            {slotName(data, day)} — {t("พัก", "Rest")}
          </div>
          <p className="text-[11.5px] mt-2 leading-relaxed" style={{ color: "var(--mut)" }}>
            {t("ฟื้นตัว · กินให้ถึงเป้า · นอนให้พอ", "Recover · Eat enough · Sleep enough")}
          </p>
          <p className="text-[10.5px] mt-1 leading-relaxed" style={{ color: "var(--dim)" }}>
            {t(
              "เลือกวันอื่นด้านบนเพื่อดูตาราง · ข้ามวันไหนไปก็ดึงมาชดเชยวันนี้ได้ด้านล่าง",
              "Tap another day above to see its plan · missed a day? Pull it in below to make it up",
            )}
          </p>
        </div>
      )}

      {isToday && exs.length > 0 && <DayNote />}

      {/* ท่าที่กำลังเล่น = ท่าแรกที่ยังทำไม่ครบ — เน้นไว้ให้รู้ทันทีว่าอยู่ตรงไหน ไม่ต้องไล่หา */}
      {exs.map((ex) => {
        const cnt = doneCount(ex.id);
        const isCurrent = !allDone && exs.find((e) => doneCount(e.id) < e.sets)?.id === ex.id;
        const complete = cnt >= ex.sets;
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
                    borderColor: "color-mix(in srgb, var(--good) 30%, transparent)",
                    background: "linear-gradient(158deg, color-mix(in srgb, var(--good) 7%, #0b1524), #070c18f2)",
                    boxShadow: "inset 3px 0 0 0 var(--good), 0 12px 34px #000000a6",
                  }
                : isCurrent
                  ? {
                      borderColor: "color-mix(in srgb, var(--acc) 45%, transparent)",
                      background: "linear-gradient(100deg, color-mix(in srgb, var(--acc) 13%, #0b1633), #070c18f2 62%)",
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
                  style={{
                    color: complete ? "var(--good)" : isCurrent ? "var(--acc)" : "var(--dim)",
                    textShadow: complete
                      ? "0 0 8px color-mix(in srgb, var(--good) 75%, transparent)"
                      : isCurrent
                        ? "0 0 8px color-mix(in srgb, var(--acc) 70%, transparent)"
                        : undefined,
                  }}
                >
                  {complete ? "✓" : String(exs.indexOf(ex) + 1).padStart(2, "0")}
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
                    {/* จุดบอกเซต — เห็นว่าทำไปกี่เซตโดยไม่ต้องกางการ์ด ข้อมูลที่อยากรู้ที่สุดตอนอยู่ในยิม */}
                    <span className="flex gap-[3px] items-center">
                      {Array.from({ length: ex.sets }, (_, i) => (
                        <span
                          key={i}
                          style={{
                            width: 6,
                            height: 6,
                            transform: "rotate(45deg)",
                            background: i < cnt ? "var(--good)" : "#ffffff1f",
                            boxShadow: i < cnt ? "0 0 6px color-mix(in srgb, var(--good) 80%, transparent)" : undefined,
                            transition: "background .2s",
                          }}
                        />
                      ))}
                    </span>
                    {ex.machine && (
                      <span className="font-mono2 text-[9.5px]" style={{ color: "var(--cyan-dim)" }}>
                        {t("เครื่อง", "Machine")}
                      </span>
                    )}
                    {ex.swapped && (
                      <span className="font-mono2 text-[9.5px]" style={{ color: "var(--warn)" }}>
                        · {t("แทน", "swapped for")} {data.exercises.find((e) => e.id === ex.origId)?.name ?? t("ท่าเดิม", "original")}
                      </span>
                    )}
                    {ex.extra && (
                      <span className="font-mono2 text-[9.5px]" style={{ color: "var(--acc-2)" }}>
                        · {t("เพิ่มวันนี้", "added today")}
                      </span>
                    )}
                    {ex.makeupOf && (
                      <span className="font-mono2 text-[9.5px]" style={{ color: "var(--warn)" }}>
                        · {t("ชดเชย", "make-up")} {dayTitle(ex.makeupOf)}
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
                  aria-label={t("เปลี่ยนท่าวันนี้", "Swap this exercise for today")}
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
                  aria-label={t("เอาท่านี้ออกจากวันนี้", "Remove this exercise from today")}
                  onClick={() => {
                    update((d) => removeExtra(d, ex.name));
                    toast(t(`เอา ${ex.name} ออกแล้ว`, `Removed ${ex.name}`));
                  }}
                >
                  ✕
                </button>
              )}

              <button
                className="shrink-0 text-[11px] px-1 transition-transform"
                style={{ color: "var(--dim)", transform: open ? "rotate(180deg)" : "" }}
                onClick={() => setOpenId(open ? null : ex.id)}
                aria-label={t("ขยาย", "Expand")}
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
                          {t("เป้าหมายน้ำหนักวันนี้ + warm-up", "Today's target weight + warm-up")}
                        </span>
                        <span className="font-mono2 text-[10px] shrink-0" style={{ color: "var(--acc)" }}>
                          {t("ปลดล็อก", "Unlock")}
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
                      {t("พัก", "Rest")} <b style={{ color: "var(--cyan)" }}>{formatRest(suggestRest(ex))}</b> · {restReason(ex)}
                    </span>
                  </span>
                  <span className="font-mono2 text-[10px] shrink-0" style={{ color: "var(--cyan-dim)" }}>
                    ▶ {t("เริ่มพัก", "Start")}
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
                      {t("Warm-up ก่อนเซตจริง", "Warm-up before working sets")}
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
                        unit={ex.type === "time" ? t("วิ", "sec") : t("ครั้ง", "reps")}
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

                {/* RIR ของเซตสุดท้าย — ถามครั้งเดียวตอนจบท่า ไม่ถามทุกเซต
                    เพราะการกรอกทุกเซตคือแรงเสียดทานที่คนเลิกทำภายในสัปดาห์เดียว
                    ค่านี้ทำให้ระบบรู้ว่า "ครบเป้าแบบสบาย" ต่างจาก "ครบเป้าแบบหมดแรง" */}
                {complete && (
                  <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--edge)" }}>
                    <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-1.5" style={{ color: "var(--mut)" }}>
                      {t("เซตสุดท้ายเหลือแรงอีกกี่ครั้ง", "Reps left in the tank on that last set")}
                    </div>
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4].map((v) => {
                        const on = lastRir(ex.id) === v;
                        return (
                          <button
                            key={v}
                            className="flex-1 font-mono2 text-[11px] py-1.5"
                            style={{
                              color: on ? "#050a18" : "var(--mut)",
                              background: on ? "linear-gradient(180deg, var(--acc), var(--acc-2))" : "rgba(10,22,34,.9)",
                              border: on ? "none" : "1px solid var(--edge)",
                              clipPath: "var(--cut-path-sm)",
                            }}
                            onClick={() => setRir(ex, v)}
                            aria-pressed={on}
                          >
                            {v === 4 ? "4+" : v}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: "var(--dim)" }}>
                      {t(
                        "0 = หมดแรงจริง · 1-2 = กำลังดี · 3+ = เบาไป ครั้งหน้าขึ้นน้ำหนักได้",
                        "0 = true failure · 1-2 = the sweet spot · 3+ = too light, go heavier next time",
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* เครื่องคิดแผ่น — ต้องอยู่หน้านี้เพราะใช้ตอนยืนหน้าแร็ค ไม่ใช่ตอนนั่งตั้งค่า */}
      {isToday && exs.length > 0 && <PlateCard />}

      {/* ชดเชยวันที่ข้าม — ดึง "ทั้งตาราง" ของวันอื่นมาเล่นวันนี้
          ต่างจากการเพิ่มท่าทีละท่าตรงที่ระบบรู้ว่ากำลังชดเชยวันไหนอยู่
          พอเล่นครบทุกท่าของวันนั้น สตรีคที่ขาดเพราะข้ามวันนั้นจะกลับมาต่อ */}
      {isToday && (
        <div className="mb-2.5">
          {mkSlots.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {mkSlots.map((s) => {
                const done = mkDone(s);
                return (
                  <button
                    key={s}
                    className="font-mono2 text-[10.5px] px-2.5 py-1.5 flex items-center gap-1.5"
                    style={{
                      color: done ? "var(--good)" : "var(--warn)",
                      background: done ? "color-mix(in srgb, var(--good) 12%, transparent)" : "rgba(255,176,64,.10)",
                      border: `1px solid ${done ? "color-mix(in srgb, var(--good) 38%, transparent)" : "rgba(255,176,64,.3)"}`,
                      clipPath: "var(--cut-path-sm)",
                    }}
                    onClick={() => {
                      update((d) => removeMakeup(d, s));
                      toast(t(`เอาการชดเชย${dayTitle(s)}ออกแล้ว`, `Removed the ${dayTitle(s)} make-up`));
                    }}
                    aria-label={t(`เอาการชดเชย${dayTitle(s)}ออก`, `Remove the ${dayTitle(s)} make-up`)}
                  >
                    {t("ชดเชย", "Make-up:")} {dayTitle(s)} {done ? t("· ครบแล้ว", "· done") : ""}
                    <Icon name="close" size={9} />
                  </button>
                );
              })}
            </div>
          )}

          {pickMakeup ? (
            <div className="glass-inset p-2.5">
              <div className="font-mono2 text-[9px] uppercase tracking-[.16em] mb-2" style={{ color: "var(--mut)" }}>
                {t("ดึงตารางวันไหนมาเล่น", "Which day do you want to pull in?")}
              </div>
              {makeupCandidates.length === 0 ? (
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--dim)" }}>
                  {t("ไม่มีวันอื่นให้ดึงมาแล้ว", "No other days left to pull in")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {makeupCandidates.map((s) => (
                    <button
                      key={s}
                      className="font-mono2 text-[11px] px-2.5 py-1.5"
                      style={{
                        color: "var(--acc)",
                        background: "var(--acc-08)",
                        border: "1px solid color-mix(in srgb, var(--acc) 28%, transparent)",
                        clipPath: "var(--cut-path-sm)",
                      }}
                      onClick={() => {
                        update((d) => addMakeup(d, s));
                        setPickMakeup(false);
                        setDay(todaySlot(data)); // ท่าที่ชดเชยโผล่ในวันนี้ ไม่ใช่วันที่กำลังดูอยู่
                        toast(t(`ดึงตาราง${dayTitle(s)}มาชดเชยแล้ว`, `Pulled in ${dayTitle(s)} as a make-up`));
                      }}
                    >
                      {dayTitle(s)} · {exText(exercisesForDay(data, s).length)}
                    </button>
                  ))}
                </div>
              )}
              <button className="btn-gh w-full !py-1.5 !text-[11px] mt-2" onClick={() => setPickMakeup(false)}>
                {t("ปิด", "Close")}
              </button>
            </div>
          ) : (
            <button
              className="btn-gh w-full !py-2.5 !text-[12px]"
              onClick={() => {
                setPickMakeup(true);
                setAddingExtra(false);
                setSwapFor(null);
              }}
            >
              {t("+ ชดเชยวันที่ข้าม (ดึงตารางวันอื่นมา)", "+ Make up a missed day (pull in another day)")}
            </button>
          )}
        </div>
      )}

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
            {t("+ เพิ่มท่าเข้าวันนี้ (ชั่วคราว)", "+ Add an exercise to today (temporary)")}
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
