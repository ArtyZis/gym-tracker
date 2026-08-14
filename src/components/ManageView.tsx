import { useMemo, useState } from "react";
import { equipName, muscleName } from "../lib/muscles";
import type { ReactNode } from "react";
import { useApp } from "../AppContext";
import type { DayKey, Exercise, ExType } from "../lib/store";
import { DAYS, archiveOne, createEmpty, decodeTransfer, exercisesForDay, repTargetText, uid } from "../lib/store";
import { plateCalc } from "../lib/progression";
import ImportProgramCard from "./ImportProgramCard";
import SavedProgramsCard from "./SavedProgramsCard";
import SeedWeightsCard from "./SeedWeightsCard";
import LoopCard from "./LoopCard";
import { activeDays as slotsOf, slotName } from "../lib/loop";
import { Kicker } from "./ui";
import { ACCENTS, accentUnlocked, resolveAccent } from "../lib/accent";
import { computeStreak } from "../lib/streak";
import { isPro } from "../lib/edition";
import UpgradeCard from "./UpgradeCard";
import { EXERCISE_COUNT, findTemplate, incFor, isMachineEx, searchExercises, tipOf, unitFor } from "../lib/exerciseDB";
import { daysText, exText, isEN, setsText, t } from "../lib/i18n";

type ExerciseDraft = Omit<Exercise, "id" | "order"> & Partial<Pick<Exercise, "id" | "order">>;

export default function ManageView() {
  const { data, update, toast } = useApp();
  const [draft, setDraft] = useState<ExerciseDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [moveFrom, setMoveFrom] = useState<DayKey>("thu");
  const [moveTo, setMoveTo] = useState<DayKey>("fri");
  const [transferCode, setTransferCode] = useState("");
  const [barInput, setBarInput] = useState(String(data.settings.barWeight ?? 20));

  function reorder(ex: Exercise, dir: number) {
    update((d) => {
      const dayExs = exercisesForDay(d, ex.day);
      const idx = dayExs.findIndex((e) => e.id === ex.id);
      const other = dayExs[idx + dir];
      if (!other) return;
      const a = d.exercises.find((e) => e.id === ex.id)!;
      const b = d.exercises.find((e) => e.id === other.id)!;
      const tmp = a.order;
      a.order = b.order;
      b.order = tmp;
    });
  }

  const inputCls = "w-full px-3.5 py-2.5 text-[14px]";

  return (
    <div className="rise">
      {isPro && <UpgradeCard />}

      {/* เรียงจาก "ใช้บ่อย" ไป "ตั้งครั้งเดียวแล้วลืม"
          เดิมของที่ตั้งครั้งเดียว (นำเข้าโปรแกรม ตารางแบบรอบ ประเมินน้ำหนัก) อยู่บนสุด
          คนที่แค่จะเพิ่มท่าต้องเลื่อนผ่าน 6 การ์ดทุกครั้ง */}
      <div className="glass p-4 mb-3">
        <Kicker>{t("เพิ่ม / แก้ท่า", "Add / edit exercises")}</Kicker>
        {!draft && (
          <button
            className="btn-cy w-full !text-[13px]"
            onClick={() => {
              setEditingId(null);
              setDraft({ name: "", day: "mon", type: "weight", sets: 3, rmin: 8, rmax: 12, inc: 2.5, unit: "kg", amrap: false });
            }}
          >
            {t("+ เพิ่มท่าใหม่", "+ New exercise")}
          </button>
        )}
        {draft && (
          <div className="glass-inset p-3.5 mt-1">
            {/* ค้นจากคลังท่าแล้วกรอกฟอร์มให้ทั้งชุด — ไม่ต้องมานั่งเดาว่าท่านี้ควรกี่เซตกี่เรป
                ตอนแก้ไขก็ใช้ได้เหมือนตอนเพิ่ม (เดิมซ่อนไว้) เพราะการ "เปลี่ยนเป็นท่าอื่น"
                เป็นสิ่งที่ทำบ่อยกว่าการแก้ตัวเลขของท่าเดิมเสียอีก
                แต่คงวันกับ id เดิมไว้ ไม่งั้นท่าเด้งไปวันอื่นและประวัติหลุด */}
            <ExerciseSearchField
              onPick={(patch) => setDraft({ ...draft, ...patch, day: draft.day, id: draft.id, order: draft.order })}
            />

            <FieldLabel>{t("ชื่อท่า", "Exercise name")}</FieldLabel>
            <input
              className={inputCls + " mb-2.5"}
              value={draft.name || ""}
              placeholder={t("เช่น Cable Fly", "e.g. Cable Fly")}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            {findTemplate(draft.name || "") && (
              <p className="text-[11.5px] -mt-1.5 mb-2.5 leading-relaxed" style={{ color: "var(--mut)" }}>
                💡 {tipOf(findTemplate(draft.name || "")!)}
              </p>
            )}
            <FieldLabel>{t("ฝึกวันไหน", "Which day")}</FieldLabel>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {slotsOf(data).map((d) => (
                <Chip key={d} on={draft.day === d} onClick={() => setDraft({ ...draft, day: d })}>
                  {slotName(data, d)}
                </Chip>
              ))}
            </div>
            <FieldLabel>{t("วัดผลด้วยอะไร", "Measured by")}</FieldLabel>
            <div className="flex gap-1.5 mb-2.5">
              {(
                [
                  ["weight", t("น้ำหนัก", "Weight")],
                  ["bodyweight", t("น้ำหนักตัว", "Bodyweight")],
                  ["time", t("จับเวลา", "Time")],
                ] as [ExType, string][]
              ).map(([kind, label]) => (
                <Chip key={kind} on={draft.type === kind} onClick={() => setDraft({ ...draft, type: kind })}>
                  {label}
                </Chip>
              ))}
            </div>
            {draft.type === "weight" && (
              <>
                <FieldLabel>{t("ประเภทน้ำหนัก", "Weight type")}</FieldLabel>
                <div className="flex gap-1.5 mb-2.5">
                  <Chip on={!draft.machine} onClick={() => setDraft({ ...draft, machine: false })}>
                    {t("ฟรีเวท (บาร์/ดัมเบล)", "Free weight (bar/dumbbell)")}
                  </Chip>
                  <Chip
                    on={!!draft.machine}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        machine: true,
                        // "kg/ข้าง" คือหน่วยที่ผู้ใช้เดิมเคยพิมพ์ไว้ — เทียบข้อมูลเก่า ไม่ใช่ข้อความบนจอ
                        unit: draft.unit?.includes("ข้าง") ? "kg" : draft.unit || "kg", // i18n-ok
                        inc: draft.inc && draft.inc !== 2.5 ? draft.inc : 5,
                      })
                    }
                  >
                    {t("เครื่อง (machine)", "Machine")}
                  </Chip>
                </div>
                {draft.machine && (
                  <p className="text-[11px] mb-2.5 -mt-1" style={{ color: "var(--dim)" }}>
                    {t(
                      "เครื่อง = ใส่น้ำหนักรวมทั้งเครื่อง (ไม่ใช่ต่อข้าง) ปรับทีละ 5 ตามหมุด",
                      "Machine = log the whole stack (not per side), moving 5 at a time like the pin does",
                    )}
                  </p>
                )}
              </>
            )}
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div>
                <FieldLabel>{t("เซต", "Sets")}</FieldLabel>
                <input
                  type="number"
                  className={inputCls}
                  value={draft.sets ?? 3}
                  onChange={(e) => setDraft({ ...draft, sets: +e.target.value || 1 })}
                />
              </div>
              {draft.type === "weight" && (
                <div>
                  <FieldLabel>{t("เพิ่มทีละ", "Increment")}</FieldLabel>
                  <input
                    type="number"
                    step="0.5"
                    className={inputCls}
                    value={draft.inc ?? 2.5}
                    onChange={(e) => setDraft({ ...draft, inc: +e.target.value || 2.5 })}
                  />
                </div>
              )}
            </div>
            {!(draft.type === "bodyweight" && draft.amrap) && (
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <div>
                  <FieldLabel>{draft.type === "time" ? t("วิ ต่ำสุด", "Min seconds") : t("ครั้งต่ำสุด", "Min reps")}</FieldLabel>
                  <input
                    type="number"
                    className={inputCls}
                    value={draft.rmin ?? 8}
                    onChange={(e) => setDraft({ ...draft, rmin: +e.target.value || 1 })}
                  />
                </div>
                <div>
                  <FieldLabel>{draft.type === "time" ? t("วิ สูงสุด", "Max seconds") : t("ครั้งสูงสุด", "Max reps")}</FieldLabel>
                  <input
                    type="number"
                    className={inputCls}
                    value={draft.rmax ?? 12}
                    onChange={(e) => setDraft({ ...draft, rmax: +e.target.value || 1 })}
                  />
                </div>
              </div>
            )}
            {draft.type === "weight" && (
              <div className="mb-2.5">
                <FieldLabel>{t("หน่วย", "Unit")}</FieldLabel>
                <input className={inputCls} value={draft.unit || "kg"} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
              </div>
            )}
            {draft.type === "bodyweight" && (
              <label className="flex items-center gap-2.5 mb-3 text-[13px]">
                <input
                  type="checkbox"
                  checked={!!draft.amrap}
                  onChange={(e) => setDraft({ ...draft, amrap: e.target.checked })}
                  style={{ width: "auto" }}
                />
                {t("ทำให้สุดแรง (ไม่กำหนดช่วงครั้ง)", "Go to failure (no rep range)")}
              </label>
            )}
            <div className="mb-2.5">
              <FieldLabel>{t("เวลาพัก (วิ) — เว้นว่าง = ให้ระบบแนะนำ", "Rest (sec) — leave blank to use the suggestion")}</FieldLabel>
              <input
                type="number"
                className={inputCls}
                value={draft.restSec ?? ""}
                placeholder={t("อัตโนมัติ", "Auto")}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setDraft({ ...draft, restSec: v ? Math.max(10, +v) : undefined });
                }}
              />
            </div>
            <div className="flex gap-2">
              <button
                className="btn-cy flex-1 !text-[13px]"
                onClick={() => {
                  if (!draft?.name?.trim()) {
                    toast(t("ใส่ชื่อท่าก่อน", "Give it a name first"));
                    return;
                  }
                  update((d) => {
                    if (editingId) {
                      const ex = d.exercises.find((e) => e.id === editingId);
                      if (ex) Object.assign(ex, draft, { id: editingId });
                    } else {
                      d.exercises.push({ ...(draft as Exercise), id: uid(), order: exercisesForDay(d, draft.day).length });
                    }
                  });
                  toast(editingId ? t("แก้ไขแล้ว", "Saved") : t("เพิ่มท่าแล้ว", "Exercise added"));
                  setDraft(null);
                  setEditingId(null);
                }}
              >
                {editingId ? t("บันทึกการแก้ไข", "Save changes") : t("เพิ่มท่านี้", "Add exercise")}
              </button>
              <button
                className="btn-gh flex-1 !text-[13px]"
                onClick={() => {
                  setDraft(null);
                  setEditingId(null);
                }}
              >
                {t("ยกเลิก", "Cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="glass p-4 mb-3">
        <Kicker>{t("ท่าทั้งหมด", "All exercises")}</Kicker>
        {slotsOf(data).map((d) => {
          const exs = exercisesForDay(data, d);
          if (!exs.length) return null;
          return (
            <div key={d}>
              <div className="font-disp text-[12.5px] mt-3 mb-1" style={{ color: "var(--cyan-dim)" }}>
                {slotName(data, d)}
                {data.dayLabels[d] ? ` · ${data.dayLabels[d]}` : ""}
              </div>
              {exs.map((ex, i) => (
                <div key={ex.id} className="flex items-center gap-2 py-2 hairline first:border-0">
                  <div className="flex-1 min-w-0">
                    <span className="block text-[13.5px] leading-snug">{ex.name}</span>
                    <span className="font-mono2 text-[9.5px]" style={{ color: "var(--dim)" }}>
                      {setsText(ex.sets)} · {repTargetText(ex)}
                    </span>
                  </div>
                  <IconBtn dis={i === 0} onClick={() => reorder(ex, -1)}>
                    ↑
                  </IconBtn>
                  <IconBtn dis={i === exs.length - 1} onClick={() => reorder(ex, 1)}>
                    ↓
                  </IconBtn>
                  <IconBtn
                    onClick={() => {
                      setEditingId(ex.id);
                      setDraft({ ...ex });
                    }}
                  >
                    ✎
                  </IconBtn>
                  <IconBtn
                    danger
                    onClick={() => {
                      if (confirm(t(`ลบ "${ex.name}" ?`, `Delete "${ex.name}"?`))) {
                        update((d2) => {
                          archiveOne(d2, ex); // เก็บประวัติไว้ กู้กลับได้ถ้าเพิ่มท่าชื่อเดิม
                          d2.exercises = d2.exercises.filter((e) => e.id !== ex.id);
                          delete d2.history[ex.id];
                        });
                        toast(t("ลบแล้ว (ประวัติเก็บไว้)", "Deleted — history kept"));
                      }
                    }}
                  >
                    ✕
                  </IconBtn>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="glass p-4 mb-3">
        <Kicker>{t("ย้ายท่าทั้งวัน", "Move a whole day")}</Kicker>
        <div className="grid grid-cols-2 gap-2 mb-2.5">
          <div>
            <FieldLabel>{t("จากวัน", "From")}</FieldLabel>
            <select className={inputCls} value={moveFrom} onChange={(e) => setMoveFrom(e.target.value as DayKey)}>
              {slotsOf(data).map((d) => (
                <option key={d} value={d}>
                  {slotName(data, d)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>{t("ไปวัน", "To")}</FieldLabel>
            <select className={inputCls} value={moveTo} onChange={(e) => setMoveTo(e.target.value as DayKey)}>
              {slotsOf(data).map((d) => (
                <option key={d} value={d}>
                  {slotName(data, d)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn-gh w-full !text-[12.5px]"
            onClick={() => {
              if (moveFrom === moveTo) {
                toast(t("เลือกคนละวัน", "Pick two different days"));
                return;
              }
              let count = 0;
              update((d) => {
                d.exercises.forEach((e) => {
                  if (e.day === moveFrom) {
                    e.day = moveTo;
                    count++;
                  }
                });
              });
              toast(
                count
                  ? t(`ย้าย ${count} ท่าไป${slotName(data, moveTo)}แล้ว`, `Moved ${exText(count)} to ${slotName(data, moveTo)}`)
                  : t("วันนั้นไม่มีท่า", "That day has no exercises"),
              );
            }}
          >
            {t("ย้ายไปทับ", "Move over")}
          </button>
          {/* สลับสองวันเข้าหากัน — ใช้บ่อยกว่าย้ายทับ เพราะตารางจริงมักแค่ "วันนี้ไม่ว่าง
              ขอสลับกับอีกวัน" ถ้าใช้ย้ายทับต้องทำ 3 ขั้น (ย้ายไปวันว่าง -> ย้ายกลับ -> ย้ายอีกที)
              และเสี่ยงท่าสองวันไปกองรวมกันถ้าพลาดลำดับ */}
          <button
            className="btn-cy w-full !text-[12.5px]"
            onClick={() => {
              if (moveFrom === moveTo) {
                toast(t("เลือกคนละวัน", "Pick two different days"));
                return;
              }
              let a = 0;
              let b = 0;
              update((d) => {
                d.exercises.forEach((e) => {
                  if (e.day === moveFrom) {
                    e.day = moveTo;
                    a++;
                  } else if (e.day === moveTo) {
                    e.day = moveFrom;
                    b++;
                  }
                });
                // ชื่อวันต้องสลับตามด้วย ไม่งั้นวันที่เป็น Push จะยังเขียนว่า Pull
                const la = d.dayLabels[moveFrom] ?? "";
                d.dayLabels[moveFrom] = d.dayLabels[moveTo] ?? "";
                d.dayLabels[moveTo] = la;
              });
              toast(
                a + b
                  ? t(
                      `สลับ${slotName(data, moveFrom)} ↔ ${slotName(data, moveTo)} แล้ว`,
                      `Swapped ${slotName(data, moveFrom)} ↔ ${slotName(data, moveTo)}`,
                    )
                  : t("ทั้งสองวันไม่มีท่า", "Neither day has exercises"),
              );
            }}
          >
            {t("สลับกัน ⇄", "Swap ⇄")}
          </button>
        </div>
        <div className="hairline mt-4 pt-3.5">
          <Kicker>{t("ชื่อวันฝึก", "Day names")}</Kicker>
          {slotsOf(data).map((d) => (
            <div key={d} className="grid grid-cols-[54px_1fr] gap-2 items-center mb-1.5">
              <span className="font-mono2 text-[11px]" style={{ color: "var(--mut)" }}>
                {slotName(data, d)}
              </span>
              <input
                className="px-3 py-2 text-[13px]"
                value={data.dayLabels[d]}
                placeholder={t("เช่น Push Day", "e.g. Push Day")}
                onChange={(e) =>
                  update((d2) => {
                    d2.dayLabels[d] = e.target.value;
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-4 mb-3">
        <Kicker>{t("แผ่นน้ำหนักที่ยิมคุณมี", "Plates your gym has")}</Kicker>
        <p className="text-[11.5px] -mt-1 mb-3 leading-relaxed" style={{ color: "var(--mut)" }}>
          {t(
            "ใช้กำหนดว่าระบบจะแนะนำให้ขึ้นน้ำหนักทีละเท่าไหร่ — ต้องเป็นตัวเลขที่ใส่แผ่นได้จริง",
            "Sets how big a jump we suggest — it has to be a number you can actually load",
          )}
        </p>
        <FieldLabel>{t("แผ่นเล็กสุดที่มี (ต่อข้าง)", "Smallest plate (per side)")}</FieldLabel>
        <div className="flex gap-1.5 mb-2">
          {[1.25, 2.5, 5].map((p) => {
            const on = (data.settings.minPlateKg ?? 1.25) === p;
            return (
              <button
                key={p}
                className="flex-1 font-mono2 text-[11.5px] py-2"
                style={{
                  color: on ? "#050a18" : "var(--mut)",
                  background: on ? "linear-gradient(180deg, var(--acc), var(--acc-2))" : "rgba(10,20,31,.5)",
                  border: on ? "none" : "1px solid var(--edge)",
                  clipPath: "var(--cut-path-sm)",
                }}
                onClick={() =>
                  update((d) => {
                    d.settings.minPlateKg = p;
                  })
                }
              >
                {p} kg
              </button>
            );
          })}
        </div>
        <p className="text-[10.5px] mb-3 leading-relaxed" style={{ color: "var(--dim)" }}>
          {t(
            `ใส่แผ่นทีละคู่เสมอ — เลือก ${data.settings.minPlateKg ?? 1.25} kg แปลว่าท่าบาร์เบลขยับได้ทีละ`,
            `Plates always go on in pairs — picking ${data.settings.minPlateKg ?? 1.25} kg means barbell lifts move in steps of`,
          )}{" "}
          <b style={{ color: "var(--acc)" }}>{(data.settings.minPlateKg ?? 1.25) * 2} kg</b>
        </p>

        <ToggleRow
          label={t("นับน้ำหนักบาร์ด้วย", "Count the bar's weight")}
          desc={t(
            "ปิดไว้ = บันทึกแค่น้ำหนักแผ่นที่ใส่ (เลกเพรสก็ไม่ต้องรู้น้ำหนักเครื่อง)",
            "Off = log only the plates you loaded (so leg press doesn't need the machine's own weight)",
          )}
          on={data.settings.countBarWeight === true}
          onToggle={() =>
            update((d) => {
              d.settings.countBarWeight = d.settings.countBarWeight === true ? undefined : true;
            })
          }
        />

        {/* เครื่องคิดแผ่นย้ายไปหน้าวันนี้แล้ว — ที่นี่เหลือแค่ "ตั้งค่าว่ายิมมีแผ่นอะไร"
            ซึ่งเป็นของที่ตั้งครั้งเดียว ไม่ใช่ของที่หยิบใช้ระหว่างเล่น */}
        {data.settings.countBarWeight === true && (
          <div className="mt-2">
            <FieldLabel>{t("น้ำหนักแกนบาร์ (kg)", "Bar weight (kg)")}</FieldLabel>
            <input
              type="number"
              className={inputCls}
              value={barInput}
              onChange={(e) => {
                setBarInput(e.target.value);
                update((d) => {
                  d.settings.barWeight = parseFloat(e.target.value) || 20;
                });
              }}
            />
          </div>
        )}
      </div>

      <TrainingSettingsCard />

      <AppearanceCard />

      <LoopCard />

      <SeedWeightsCard />

      <ImportProgramCard />

      <SavedProgramsCard />

      <div className="glass p-4 mb-3">
        <Kicker>{t("ย้ายข้อมูลข้ามเครื่อง", "Move data to another device")}</Kicker>
        <p className="text-[12px] mb-2.5" style={{ color: "var(--mut)" }}>
          {t(
            "ข้อมูลบันทึกในเครื่องนี้อัตโนมัติอยู่แล้ว — ใช้ส่วนนี้เมื่อต้องการย้ายไปเครื่องอื่น",
            "Everything already saves on this device automatically — this is only for moving it somewhere else",
          )}
        </p>
        <div className="flex gap-2 mb-2">
          <button
            className="btn-gh flex-1 !py-2.5 !text-[12px]"
            onClick={() => {
              setTransferCode(btoa(unescape(encodeURIComponent(JSON.stringify(data)))));
              toast(t("สร้างโค้ดแล้ว", "Code generated"));
            }}
          >
            {t("สร้างโค้ด", "Generate code")}
          </button>
          <button
            className="btn-gh flex-1 !py-2.5 !text-[12px]"
            onClick={() => {
              if (!transferCode) {
                toast(t("กดสร้างโค้ดก่อน", "Generate a code first"));
                return;
              }
              navigator.clipboard
                .writeText(transferCode)
                .then(() => toast(t("คัดลอกแล้ว", "Copied")))
                .catch(() => toast(t("คัดลอกไม่ได้", "Couldn't copy")));
            }}
          >
            {t("คัดลอก", "Copy")}
          </button>
        </div>
        <textarea
          className="w-full px-3 py-2.5 text-[11px] min-h-[70px] mb-2"
          style={{ fontFamily: "JetBrains Mono" }}
          value={transferCode}
          onChange={(e) => setTransferCode(e.target.value)}
          placeholder={t("โค้ดจะขึ้นที่นี่ หรือวางโค้ดจากเครื่องอื่นเพื่อกู้คืน", "Your code appears here — or paste one from another device to restore")}
        />
        <button
          className="btn-cy w-full !text-[12.5px]"
          onClick={() => {
            // decodeTransfer ตรวจชนิดข้อมูลผ่าน normalizeData แล้ว — คืน null = โค้ดพัง/ปลอม
            const restored = decodeTransfer(transferCode);
            if (!restored) {
              toast(t("โค้ดไม่ถูกต้อง", "That code isn't valid"));
              return;
            }
            update((d) => Object.assign(d, restored));
            toast(t("กู้คืนแล้ว", "Restored"));
          }}
        >
          {t("กู้คืนจากโค้ด", "Restore from code")}
        </button>
      </div>

      <div className="glass p-4">
        <Kicker>{t("เริ่มใหม่หมด", "Start over")}</Kicker>
        <p className="text-[11.5px] mb-2.5" style={{ color: "var(--mut)" }}>
          {t(
            "ล้างท่า ประวัติ และข้อมูลทั้งหมดให้ว่างเปล่า (โปรแกรมที่บันทึกไว้ยังอยู่) — เริ่มสร้างโปรแกรมเองจากศูนย์",
            "Wipes every exercise, log, and setting back to empty (saved programs stay) — build your own from scratch",
          )}
        </p>
        <button
          className="btn-danger w-full !text-[12.5px]"
          onClick={() => {
            if (
              confirm(
                t(
                  "ลบทุกอย่างให้ว่างเปล่า? ท่าและประวัติการฝึกทั้งหมดจะหาย (กู้ไม่ได้)",
                  "Wipe everything? Every exercise and all training history will be gone — this cannot be undone.",
                ),
              )
            ) {
              update((d) => Object.assign(d, createEmpty()));
              toast(t("ล้างข้อมูลหมดแล้ว", "Everything cleared"));
            }
          }}
        >
          {t("ลบทั้งหมดให้ว่างเปล่า", "Wipe everything")}
        </button>
      </div>

      {/* เวอร์ชันที่กำลังใช้อยู่ — PWA อาจค้างเวอร์ชันเก่าไว้โดยผู้ใช้ไม่รู้ตัว
          มีตัวเลขให้ดูจะได้ตรวจได้ว่าที่เห็นตรงกับที่เพิ่ง deploy ไปไหม */}
      <p className="text-center font-mono2 text-[9px] mt-4 mb-1" style={{ color: "var(--dim)" }}>
        RANKFORGE v{__APP_VERSION__} · build {__BUILD_DATE__}
      </p>
    </div>
  );
}

function TrainingSettingsCard() {
  const { data, update, toast } = useApp();
  const soundOn = data.settings.soundEnabled !== false;
  const smartOn = data.settings.smartRest !== false;
  return (
    <div className="glass p-4 mb-3">
      <Kicker>{t("ตั้งค่าการฝึก", "Training settings")}</Kicker>
      <ToggleRow
        label={t("เสียงตอนกด", "Tap sounds")}
        desc={t("เสียงสั้นๆ ตอนติ๊กเซต ครบท่า และทำ PR", "A short blip when you tick a set, finish an exercise, or hit a PR")}
        on={soundOn}
        onToggle={() => {
          update((d) => {
            d.settings.soundEnabled = !soundOn;
          });
          toast(soundOn ? t("ปิดเสียงแล้ว", "Sounds off") : t("เปิดเสียงแล้ว", "Sounds on"));
        }}
      />
      <ToggleRow
        label={t("เวลาพักอัตโนมัติต่อท่า", "Smart rest per exercise")}
        desc={t(
          "ให้ระบบเลือกเวลาพักที่เหมาะกับแต่ละท่า (ท่าหนักพักนาน เรปสูงพักสั้น)",
          "Let the app pick the rest each exercise needs (heavy lifts rest longer, high reps shorter)",
        )}
        on={smartOn}
        onToggle={() => {
          update((d) => {
            d.settings.smartRest = !smartOn;
          });
          toast(smartOn ? t("ใช้เวลาพักค่าเดียวแล้ว", "Using one fixed rest time") : t("เปิดเวลาพักอัตโนมัติแล้ว", "Smart rest on"));
        }}
      />
    </div>
  );
}

// การ์ดหน้าตา/ธีม — เลือกสี accent + เปิดปิดโน้ตโค้ช (ทั้งคู่เป็น optional settings, undefined=ค่าเดิม)
function AppearanceCard() {
  const { data, update, toast } = useApp();
  const current = resolveAccent(data.settings.accent).toLowerCase();
  const coachOn = data.settings.showCoachNotes !== false;
  // สีล็อกเฉพาะรุ่นที่ขาย — รุ่นส่วนตัวเปิดหมดเหมือนเดิม
  const best = useMemo(() => computeStreak(data).best, [data]);
  const nextLock = ACCENTS.find((a) => isPro && a.unlockStreak > best);

  return (
    <div className="glass p-4 mb-3">
      <Kicker
        right={
          isPro ? (
            <span className="font-mono2 text-[9px]" style={{ color: "var(--acc)" }}>
              {t(`สตรีคสูงสุด ${best} วัน`, `Best streak ${daysText(best)}`)}
            </span>
          ) : undefined
        }
      >
        {t("หน้าตา · ธีม", "Look · theme")}
      </Kicker>

      <LanguageRow />

      <div className="text-[13.5px] mb-2.5">{t("สีธีม (accent)", "Accent colour")}</div>
      <div className="flex gap-2.5">
        {ACCENTS.map((a) => {
          const on = a.color.toLowerCase() === current;
          const open = accentUnlocked(a, best, isPro);
          return (
            <button
              key={a.color}
              onClick={() => {
                if (!open) {
                  toast(
                    t(
                      `ฝึกต่อเนื่องให้ได้ ${a.unlockStreak} วันเพื่อปลดล็อกสี${a.label()} (ตอนนี้ ${best})`,
                      `Hit a ${a.unlockStreak}-day streak to unlock ${a.label()} (you're at ${best})`,
                    ),
                    false,
                  );
                  return;
                }
                update((d) => {
                  d.settings.accent = a.color;
                });
                toast(t(`เปลี่ยนธีมเป็นสี${a.label()}`, `Theme set to ${a.label()}`));
              }}
              className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all"
              style={{
                background: on ? `color-mix(in srgb, ${a.color} 14%, transparent)` : "rgba(120,180,255,.05)",
                border: on ? `1px solid ${a.color}` : "1px solid var(--edge)",
                boxShadow: on ? `0 0 14px -3px ${a.color}` : "none",
                opacity: open ? 1 : 0.5,
              }}
              aria-pressed={on}
              aria-label={
                open
                  ? t(`สี${a.label()}`, `${a.label()} theme`)
                  : t(`สี${a.label()} — ล็อกอยู่ ต้องสตรีค ${a.unlockStreak} วัน`, `${a.label()} — locked, needs a ${a.unlockStreak}-day streak`)
              }
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px]"
                style={{
                  background: open
                    ? `linear-gradient(180deg, ${a.color}, color-mix(in srgb, ${a.color} 70%, #06121f))`
                    : "rgba(10,20,31,.8)",
                  border: open ? "none" : `1px dashed color-mix(in srgb, ${a.color} 45%, transparent)`,
                  boxShadow: on ? `0 0 10px ${a.color}` : "none",
                }}
              >
                {open ? "" : "🔒"}
              </span>
              <span className="font-mono2 text-[9px]" style={{ color: on ? a.color : "var(--mut)" }}>
                {open ? a.label() : daysText(a.unlockStreak)}
              </span>
            </button>
          );
        })}
      </div>
      {nextLock && (
        <p className="text-[10.5px] mt-2 leading-relaxed" style={{ color: "var(--dim)" }}>
          {t(
            `อีก ${nextLock.unlockStreak - best} วันต่อเนื่องจะปลดล็อกสี${nextLock.label()} — นับจากสตรีคสูงสุดที่เคยทำได้ ปลดแล้วอยู่ถาวร ขาดวันก็ไม่หาย`,
            `${nextLock.unlockStreak - best} more days unlocks ${nextLock.label()} — counted from your best-ever streak. Once unlocked it's yours for good, even if you miss a day.`,
          )}
        </p>
      )}
      <div className="mt-1.5">
        <ToggleRow
          label={t("โน้ตโค้ชในการ์ดท่า", "Coach notes on exercise cards")}
          desc={t("คำแนะนำเป้าหมายต่อท่า (🎯) ในหน้าวันนี้", "The 🎯 target line for each exercise on the Today tab")}
          on={coachOn}
          onToggle={() => {
            update((d) => {
              d.settings.showCoachNotes = !coachOn;
            });
            toast(coachOn ? t("ซ่อนโน้ตโค้ชแล้ว", "Coach notes hidden") : t("แสดงโน้ตโค้ชแล้ว", "Coach notes shown"));
          }}
        />
      </div>
    </div>
  );
}

// ภาษา — มีที่นี่ด้วยทั้งที่ปุ่มหลักอยู่บนหัวแอป
// คนที่หาปุ่มบนหัวไม่เจอจะมาหาในหน้าตั้งค่าเป็นที่ที่สอง เจอทั้งสองที่ดีกว่าเจอที่เดียว
function LanguageRow() {
  const { data, update } = useApp();
  const cur = data.settings.lang ?? "th";
  return (
    <div className="flex items-center gap-3 py-2.5 mb-1 hairline first:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px]">{t("ภาษา", "Language")}</div>
        <div className="text-[11px] leading-snug mt-0.5" style={{ color: "var(--dim)" }}>
          {t("สลับได้จากปุ่มบนหัวแอปเหมือนกัน", "Also switchable from the button in the header")}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        {(["th", "en"] as const).map((l) => {
          const on = cur === l;
          return (
            <button
              key={l}
              onClick={() =>
                update((d) => {
                  d.settings.lang = l;
                })
              }
              className="font-mono2 text-[11px] px-3 py-1.5"
              style={{
                color: on ? "#050a18" : "var(--mut)",
                background: on ? "linear-gradient(180deg, var(--acc), var(--acc-2))" : "rgba(10,20,31,.5)",
                border: on ? "none" : "1px solid var(--edge)",
                clipPath: "var(--cut-path-sm)",
              }}
              aria-pressed={on}
            >
              {l === "th" ? "ไทย" : "EN"} {/* i18n-ok — ปุ่มเลือกภาษาต้องเขียนด้วยภาษาของตัวเองเสมอ */}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const ToggleRow = ({ label, desc, on, onToggle }: { label: string; desc: string; on: boolean; onToggle: () => void }) => (
  <div className="flex items-center gap-3 py-2.5 hairline first:border-0">
    <div className="flex-1 min-w-0">
      <div className="text-[13.5px]">{label}</div>
      <div className="text-[11px] leading-snug mt-0.5" style={{ color: "var(--dim)" }}>
        {desc}
      </div>
    </div>
    <button
      onClick={onToggle}
      className="w-[46px] h-[27px] rounded-full shrink-0 relative transition-all"
      style={{
        background: on ? "linear-gradient(180deg, var(--acc), var(--acc-2))" : "rgba(120,180,255,.12)",
        border: on ? "none" : "1px solid var(--edge)",
        boxShadow: on ? "0 0 12px var(--acc-40)" : "none",
      }}
      aria-pressed={on}
    >
      <span
        className="absolute top-[3px] w-[21px] h-[21px] rounded-full transition-all"
        style={{ left: on ? "22px" : "3px", background: on ? "#03131C" : "var(--mut)" }}
      />
    </button>
  </div>
);

// ช่องค้นหาท่าจากคลัง — เลือกแล้วกรอกฟอร์มให้ทั้งชุด (ชื่อ ชนิด เซต เรป หน่วย ระยะขยับ)
function ExerciseSearchField({ onPick }: { onPick: (patch: Partial<ExerciseDraft>) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => (q.trim() ? searchExercises(q, 8) : []), [q]);

  return (
    <div className="mb-3">
      <FieldLabel>{t(`ค้นจากคลังท่า (${EXERCISE_COUNT} ท่า)`, `Search the library (${EXERCISE_COUNT} exercises)`)}</FieldLabel>
      <input
        className="w-full px-3.5 py-2.5 text-[14px]"
        /* ค้นภาษาไทยได้เสมอแม้ตั้ง UI เป็นอังกฤษ — คนไทยที่สลับภาษายังพิมพ์ "อก" ค้นอยู่
           ฝั่งอังกฤษจึงจงใจมีตัวอย่างไทยติดไว้ ให้รู้ว่ายังพิมพ์ไทยได้ */
        placeholder={t("พิมพ์ไทยหรืออังกฤษ เช่น หลัง, อก, ทีบาร์, squat", "Type in English or Thai — e.g. squat, bench, หลัง, อก")} // i18n-ok
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
      />
      {open && results.length > 0 && (
        <div className="glass-inset mt-1.5 max-h-[220px] overflow-y-auto">
          {results.map((tpl) => (
            <button
              key={tpl.name}
              className="w-full text-left px-3 py-2 hairline first:border-0 active:scale-[.99] transition-transform"
              onClick={() => {
                onPick({
                  name: tpl.name,
                  type: tpl.type,
                  sets: tpl.sets,
                  rmin: tpl.rmin,
                  rmax: tpl.rmax,
                  amrap: tpl.amrap ?? false,
                  unit: unitFor(tpl),
                  inc: incFor(tpl),
                  machine: isMachineEx(tpl),
                });
                setQ("");
                setOpen(false);
              }}
            >
              <span className="block text-[13px]">
                {tpl.name}
                {isMachineEx(tpl) ? " ⚙" : ""}
              </span>
              {/* ชื่อไทยมีไว้ให้คนไทยรู้ว่าท่านี้คือท่าอะไร — โหมดอังกฤษไม่ต้องแสดง
                  เพราะชื่ออังกฤษด้านบนคือชื่อจริงอยู่แล้ว บรรทัดนี้จะกลายเป็นขยะ */}
              {!isEN() && (
                <span className="block text-[11.5px]" style={{ color: "var(--mut)" }}>
                  {tpl.th}
                </span>
              )}
              <span className="block font-mono2 text-[9.5px] mt-0.5" style={{ color: "var(--dim)" }}>
                {tpl.pri.map((m) => muscleName(m)).join("/")} ·{" "}
                {tpl.equip.map((e) => equipName(e)).slice(0, 2).join("+")} · {tpl.sets}×
                {tpl.amrap ? t("สุดแรง", "AMRAP") : `${tpl.rmin}-${tpl.rmax}`}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && q.trim() && results.length === 0 && (
        <p className="text-[11.5px] mt-1.5" style={{ color: "var(--dim)" }}>
          {t("ไม่เจอในคลัง — พิมพ์ชื่อเองในช่องด้านล่างได้", "Not in the library — just type your own name below")}
        </p>
      )}
    </div>
  );
}

const FieldLabel = ({ children }: { children: ReactNode }) => (
  <label className="block font-mono2 text-[9.5px] uppercase tracking-[.1em] mb-1" style={{ color: "var(--mut)" }}>
    {children}
  </label>
);

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    onClick={onClick}
    className="font-mono2 text-[11px] px-3 py-2 rounded-full transition-all"
    style={
      on
        ? {
            background: "linear-gradient(180deg, var(--acc), var(--acc-2))",
            color: "#03131C",
            fontWeight: 700,
            boxShadow: "0 0 10px var(--acc-40)",
          }
        : { background: "rgba(120,180,255,.05)", border: "1px solid var(--edge)", color: "var(--mut)" }
    }
  >
    {children}
  </button>
);

const IconBtn = ({
  onClick,
  children,
  dis,
  danger,
}: {
  onClick: () => void;
  children: ReactNode;
  dis?: boolean;
  danger?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={dis}
    className="w-8 h-8 rounded-lg shrink-0 text-[12.5px] flex items-center justify-center"
    style={{
      background: "rgba(6,12,22,.55)",
      border: "1px solid var(--edge)",
      color: danger ? "var(--bad)" : "var(--mut)",
      opacity: dis ? 0.25 : 1,
    }}
  >
    {children}
  </button>
);
