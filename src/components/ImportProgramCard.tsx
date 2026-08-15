import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import type { DayKey } from "../lib/store";
import { applyProgram, dayName, exercisesForDay, repTargetText, restoreHistory, uid } from "../lib/store";
import { parseProgram } from "../lib/programParser";
import { slotName } from "../lib/loop";
import { daysText, exText, t } from "../lib/i18n";

// ตัวอย่างต้องใช้คำวันในภาษาที่ผู้ใช้เห็น ไม่งั้นกด "ลองใส่ตัวอย่าง" แล้วตัว parser
// อ่านหัวข้อวันไม่ออก (มันจับได้ทั้งสองภาษา แต่ตัวอย่างควรสอนรูปแบบที่ผู้ใช้จะพิมพ์จริง)
const example = () =>
  t(
    `จันทร์ - Push
Bench Press 4x6-8
Incline DB Press 3x8-10
Lateral Raise 3x15
Overhead Tricep Extension 3x12

พุธ - Legs
Squat 5x5
Bulgarian Split Squat 3x12
Calf Raise 4x20
Plank 3x45s

ศุกร์ - Pull
Pull-up 4xAMRAP
Barbell Row 4x8
Incline DB Curl 3x12`,
    `Monday - Push
Bench Press 4x6-8
Incline DB Press 3x8-10
Lateral Raise 3x15
Overhead Tricep Extension 3x12

Wednesday - Legs
Squat 5x5
Bulgarian Split Squat 3x12
Calf Raise 4x20
Plank 3x45s

Friday - Pull
Pull-up 4xAMRAP
Barbell Row 4x8
Incline DB Curl 3x12`,
  );

// นำเข้าโปรแกรมทีเดียว: วางข้อความ -> preview -> แทนที่/เพิ่ม
export default function ImportProgramCard() {
  const { data, update, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const parsed = useMemo(() => (text.trim() ? parseProgram(text) : null), [text]);

  // จัดกลุ่มตามวันสำหรับ preview
  const byDay = useMemo(() => {
    if (!parsed) return [];
    const groups = new Map<DayKey, typeof parsed.exercises>();
    for (const ex of parsed.exercises) {
      if (!groups.has(ex.day)) groups.set(ex.day, []);
      groups.get(ex.day)!.push(ex);
    }
    return [...groups.entries()];
  }, [parsed]);

  function apply(mode: "replace" | "append") {
    if (!parsed || !parsed.exercises.length) {
      toast(t("ยังไม่มีท่าที่อ่านได้", "Nothing readable yet"));
      return;
    }
    update((d) => {
      if (mode === "replace") {
        // แทนที่ทั้งหมด แต่เก็บประวัติไว้ตามชื่อท่า (ท่าชื่อเดิมกลับมา ประวัติตามมา)
        applyProgram(d, parsed.exercises, parsed.dayLabels);
      } else {
        for (const day of Object.keys(parsed.dayLabels) as DayKey[]) {
          const label = parsed.dayLabels[day];
          if (label) d.dayLabels[day] = label;
        }
        const orderStart: Partial<Record<DayKey, number>> = {};
        for (const ex of parsed.exercises) {
          if (orderStart[ex.day] == null) orderStart[ex.day] = exercisesForDay(d, ex.day).length;
          const newEx = { ...ex, id: uid() + d.exercises.length, order: orderStart[ex.day]! };
          orderStart[ex.day]!++;
          d.exercises.push(newEx);
          restoreHistory(d, newEx); // ถ้าเคยทำท่านี้มาก่อน ดึงประวัติกลับ
        }
      }
    });
    toast(
      mode === "replace"
        ? t(`แทนที่ด้วย ${parsed.exercises.length} ท่าแล้ว (เก็บประวัติไว้)`, `Replaced with ${exText(parsed.exercises.length)} — history kept`)
        : t(`เพิ่ม ${parsed.exercises.length} ท่าแล้ว`, `Added ${exText(parsed.exercises.length)}`),
    );
    setText("");
    setOpen(false);
  }

  return (
    <div className="glass p-4 mb-3">
      <button className="w-full flex items-center justify-between" onClick={() => setOpen((o) => !o)}>
        <div className="text-left">
          <div className="font-mono2 text-[9px] uppercase tracking-[.2em] mb-0.5" style={{ color: "var(--cyan-dim)" }}>
            {t("นำเข้าโปรแกรมทีเดียว", "Import a whole program")}
          </div>
          <div className="text-[12px]" style={{ color: "var(--mut)" }}>
            {t("วางโปรแกรมที่เขียนไว้ ระบบใส่ท่าให้หมด", "Paste a program you've written and it fills in every exercise")}
          </div>
        </div>
        <span className="text-[11px]" style={{ color: "var(--dim)", transform: open ? "rotate(180deg)" : "" }}>
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-3">
          <p className="text-[11.5px] leading-relaxed mb-2" style={{ color: "var(--mut)" }}>
            {t("พิมพ์วันเป็นหัวข้อ แล้วท่าบรรทัดละท่า เช่น", "Put the day as a heading, then one exercise per line — e.g.")}{" "}
            <b style={{ color: "var(--ink)" }}>Bench Press 4x8</b>, <b style={{ color: "var(--ink)" }}>Squat 5x5 100kg</b>,{" "}
            <b style={{ color: "var(--ink)" }}>Plank 3x45s</b>, <b style={{ color: "var(--ink)" }}>Pull-up 3xAMRAP</b>{" "}
            {t("— รองรับช่วงเรป (6-8), น้ำหนัก, วินาที และคำไทย", "— it handles rep ranges (6-8), weights, seconds, and Thai or English")}
          </p>
          <textarea
            className="w-full px-3 py-2.5 text-[12px] min-h-[130px] mb-2"
            style={{ fontFamily: "JetBrains Mono", lineHeight: 1.5 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={example()}
          />
          <button className="btn-gh w-full !py-2 !text-[11.5px] mb-3" onClick={() => setText(example())}>
            {t("ลองใส่ตัวอย่าง", "Fill in an example")}
          </button>

          {parsed && (
            <div className="glass-inset p-3 mb-3">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-mono2 text-[10px] uppercase tracking-[.15em]" style={{ color: "var(--cyan-dim)" }}>
                  {t("พรีวิว", "Preview")}
                </span>
                <span className="font-mono2 text-[10px]" style={{ color: "var(--cyan)" }}>
                  {exText(parsed.exercises.length)} · {daysText(byDay.length)}
                </span>
              </div>
              {parsed.exercises.length === 0 && (
                <p className="text-[12px]" style={{ color: "var(--dim)" }}>
                  {t('ยังอ่านท่าไม่ได้ — เช็กรูปแบบ เช่น "ชื่อท่า 3x10"', 'Can\'t read any exercises — check the format, e.g. "Exercise name 3x10"')}
                </p>
              )}
              {byDay.map(([day, exs]) => (
                <div key={day} className="mb-2">
                  <div className="font-disp text-[12px] mb-1" style={{ color: "var(--cyan-dim)" }}>
                    {slotName(data, day)}
                  </div>
                  {exs.map((ex, i) => (
                    <div key={i} className="flex items-baseline gap-2 py-0.5 text-[12px]">
                      <span className="flex-1 truncate">{ex.name}</span>
                      <span className="font-mono2 text-[10.5px]" style={{ color: "var(--cyan)" }}>
                        {ex.sets}×{repTargetText(ex as any)}
                        {ex.type === "weight" && ex.unit ? ` · ${ex.unit}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              {parsed.warnings.length > 0 && (
                <div className="mt-2 pt-2 hairline">
                  {parsed.warnings.slice(0, 4).map((w, i) => (
                    <div key={i} className="text-[11px]" style={{ color: "var(--warn)" }}>
                      ⚠ {w}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {parsed && parsed.exercises.length > 0 && (
            <div className="flex gap-2">
              <button className="btn-cy flex-1 !py-2.5 !text-[12.5px]" onClick={() => apply("append")}>
                {t("เพิ่มต่อของเดิม", "Add to existing")}
              </button>
              <button
                className="btn-gh flex-1 !py-2.5 !text-[12.5px]"
                style={{ color: "var(--warn)", borderColor: "rgba(255,193,94,.4)" }}
                onClick={() => {
                  if (
                    confirm(
                      t(
                        "แทนที่โปรแกรมทั้งหมดด้วยของใหม่? (ประวัติการฝึกยังเก็บไว้ตามชื่อท่า)",
                        "Replace the whole program with this one? Training history is kept, matched by exercise name.",
                      ),
                    )
                  )
                    apply("replace");
                }}
              >
                {t("แทนที่ทั้งหมด", "Replace all")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
