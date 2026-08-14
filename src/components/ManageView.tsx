import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useApp } from "../AppContext";
import type { DayKey, Exercise, ExType } from "../lib/store";
import { DAYS, DAY_TH, archiveOne, createEmpty, decodeTransfer, exercisesForDay, repTargetText, uid } from "../lib/store";
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
import { EQUIP_TH, EXERCISE_COUNT, findTemplate, incFor, isMachineEx, searchExercises, unitFor } from "../lib/exerciseDB";
import { MUSCLE_TH } from "../lib/analyzer";

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
        <Kicker>เพิ่ม / แก้ท่า</Kicker>
        {!draft && (
          <button
            className="btn-cy w-full !text-[13px]"
            onClick={() => {
              setEditingId(null);
              setDraft({ name: "", day: "mon", type: "weight", sets: 3, rmin: 8, rmax: 12, inc: 2.5, unit: "kg", amrap: false });
            }}
          >
            + เพิ่มท่าใหม่
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

            <FieldLabel>ชื่อท่า</FieldLabel>
            <input
              className={inputCls + " mb-2.5"}
              value={draft.name || ""}
              placeholder="เช่น Cable Fly"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            {findTemplate(draft.name || "") && (
              <p className="text-[11.5px] -mt-1.5 mb-2.5 leading-relaxed" style={{ color: "var(--mut)" }}>
                💡 {findTemplate(draft.name || "")!.tip}
              </p>
            )}
            <FieldLabel>ฝึกวันไหน</FieldLabel>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {slotsOf(data).map((d) => (
                <Chip key={d} on={draft.day === d} onClick={() => setDraft({ ...draft, day: d })}>
                  {slotName(data, d)}
                </Chip>
              ))}
            </div>
            <FieldLabel>วัดผลด้วยอะไร</FieldLabel>
            <div className="flex gap-1.5 mb-2.5">
              {(
                [
                  ["weight", "น้ำหนัก"],
                  ["bodyweight", "น้ำหนักตัว"],
                  ["time", "จับเวลา"],
                ] as [ExType, string][]
              ).map(([t, label]) => (
                <Chip key={t} on={draft.type === t} onClick={() => setDraft({ ...draft, type: t })}>
                  {label}
                </Chip>
              ))}
            </div>
            {draft.type === "weight" && (
              <>
                <FieldLabel>ประเภทน้ำหนัก</FieldLabel>
                <div className="flex gap-1.5 mb-2.5">
                  <Chip on={!draft.machine} onClick={() => setDraft({ ...draft, machine: false })}>
                    ฟรีเวท (บาร์/ดัมเบล)
                  </Chip>
                  <Chip
                    on={!!draft.machine}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        machine: true,
                        unit: draft.unit?.includes("ข้าง") ? "kg" : draft.unit || "kg",
                        inc: draft.inc && draft.inc !== 2.5 ? draft.inc : 5,
                      })
                    }
                  >
                    เครื่อง (machine)
                  </Chip>
                </div>
                {draft.machine && (
                  <p className="text-[11px] mb-2.5 -mt-1" style={{ color: "var(--dim)" }}>
                    เครื่อง = ใส่น้ำหนักรวมทั้งเครื่อง (ไม่ใช่ต่อข้าง) ปรับทีละ 5 ตามหมุด
                  </p>
                )}
              </>
            )}
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div>
                <FieldLabel>เซต</FieldLabel>
                <input
                  type="number"
                  className={inputCls}
                  value={draft.sets ?? 3}
                  onChange={(e) => setDraft({ ...draft, sets: +e.target.value || 1 })}
                />
              </div>
              {draft.type === "weight" && (
                <div>
                  <FieldLabel>เพิ่มทีละ</FieldLabel>
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
                  <FieldLabel>{draft.type === "time" ? "วิ ต่ำสุด" : "ครั้งต่ำสุด"}</FieldLabel>
                  <input
                    type="number"
                    className={inputCls}
                    value={draft.rmin ?? 8}
                    onChange={(e) => setDraft({ ...draft, rmin: +e.target.value || 1 })}
                  />
                </div>
                <div>
                  <FieldLabel>{draft.type === "time" ? "วิ สูงสุด" : "ครั้งสูงสุด"}</FieldLabel>
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
                <FieldLabel>หน่วย</FieldLabel>
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
                ทำให้สุดแรง (ไม่กำหนดช่วงครั้ง)
              </label>
            )}
            <div className="mb-2.5">
              <FieldLabel>เวลาพัก (วิ) — เว้นว่าง = ให้ระบบแนะนำ</FieldLabel>
              <input
                type="number"
                className={inputCls}
                value={draft.restSec ?? ""}
                placeholder="อัตโนมัติ"
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
                    toast("ใส่ชื่อท่าก่อน");
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
                  toast(editingId ? "แก้ไขแล้ว" : "เพิ่มท่าแล้ว");
                  setDraft(null);
                  setEditingId(null);
                }}
              >
                {editingId ? "บันทึกการแก้ไข" : "เพิ่มท่านี้"}
              </button>
              <button
                className="btn-gh flex-1 !text-[13px]"
                onClick={() => {
                  setDraft(null);
                  setEditingId(null);
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="glass p-4 mb-3">
        <Kicker>ท่าทั้งหมด</Kicker>
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
                      {ex.sets} เซต · {repTargetText(ex)}
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
                      if (confirm(`ลบ "${ex.name}" ?`)) {
                        update((d2) => {
                          archiveOne(d2, ex); // เก็บประวัติไว้ กู้กลับได้ถ้าเพิ่มท่าชื่อเดิม
                          d2.exercises = d2.exercises.filter((e) => e.id !== ex.id);
                          delete d2.history[ex.id];
                        });
                        toast("ลบแล้ว (ประวัติเก็บไว้)");
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
        <Kicker>ย้ายท่าทั้งวัน</Kicker>
        <div className="grid grid-cols-2 gap-2 mb-2.5">
          <div>
            <FieldLabel>จากวัน</FieldLabel>
            <select className={inputCls} value={moveFrom} onChange={(e) => setMoveFrom(e.target.value as DayKey)}>
              {slotsOf(data).map((d) => (
                <option key={d} value={d}>
                  {slotName(data, d)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>ไปวัน</FieldLabel>
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
                toast("เลือกคนละวัน");
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
              toast(count ? `ย้าย ${count} ท่าไป${slotName(data, moveTo)}แล้ว` : "วันนั้นไม่มีท่า");
            }}
          >
            ย้ายไปทับ
          </button>
          {/* สลับสองวันเข้าหากัน — ใช้บ่อยกว่าย้ายทับ เพราะตารางจริงมักแค่ "วันนี้ไม่ว่าง
              ขอสลับกับอีกวัน" ถ้าใช้ย้ายทับต้องทำ 3 ขั้น (ย้ายไปวันว่าง -> ย้ายกลับ -> ย้ายอีกที)
              และเสี่ยงท่าสองวันไปกองรวมกันถ้าพลาดลำดับ */}
          <button
            className="btn-cy w-full !text-[12.5px]"
            onClick={() => {
              if (moveFrom === moveTo) {
                toast("เลือกคนละวัน");
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
              toast(a + b ? `สลับ${slotName(data, moveFrom)} ↔ ${slotName(data, moveTo)} แล้ว` : "ทั้งสองวันไม่มีท่า");
            }}
          >
            สลับกัน ⇄
          </button>
        </div>
        <div className="hairline mt-4 pt-3.5">
          <Kicker>ชื่อวันฝึก</Kicker>
          {slotsOf(data).map((d) => (
            <div key={d} className="grid grid-cols-[54px_1fr] gap-2 items-center mb-1.5">
              <span className="font-mono2 text-[11px]" style={{ color: "var(--mut)" }}>
                {slotName(data, d)}
              </span>
              <input
                className="px-3 py-2 text-[13px]"
                value={data.dayLabels[d]}
                placeholder="เช่น Push Day"
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
        <Kicker>แผ่นน้ำหนักที่ยิมคุณมี</Kicker>
        <p className="text-[11.5px] -mt-1 mb-3 leading-relaxed" style={{ color: "var(--mut)" }}>
          ใช้กำหนดว่าระบบจะแนะนำให้ขึ้นน้ำหนักทีละเท่าไหร่ — ต้องเป็นตัวเลขที่ใส่แผ่นได้จริง
        </p>
        <FieldLabel>แผ่นเล็กสุดที่มี (ต่อข้าง)</FieldLabel>
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
          ใส่แผ่นทีละคู่เสมอ — เลือก {data.settings.minPlateKg ?? 1.25} kg แปลว่าท่าบาร์เบลขยับได้ทีละ{" "}
          <b style={{ color: "var(--acc)" }}>{(data.settings.minPlateKg ?? 1.25) * 2} kg</b>
        </p>

        <ToggleRow
          label="นับน้ำหนักบาร์ด้วย"
          desc="ปิดไว้ = บันทึกแค่น้ำหนักแผ่นที่ใส่ (เลกเพรสก็ไม่ต้องรู้น้ำหนักเครื่อง)"
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
            <FieldLabel>น้ำหนักแกนบาร์ (kg)</FieldLabel>
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
        <Kicker>ย้ายข้อมูลข้ามเครื่อง</Kicker>
        <p className="text-[12px] mb-2.5" style={{ color: "var(--mut)" }}>
          ข้อมูลบันทึกในเครื่องนี้อัตโนมัติอยู่แล้ว — ใช้ส่วนนี้เมื่อต้องการย้ายไปเครื่องอื่น
        </p>
        <div className="flex gap-2 mb-2">
          <button
            className="btn-gh flex-1 !py-2.5 !text-[12px]"
            onClick={() => {
              setTransferCode(btoa(unescape(encodeURIComponent(JSON.stringify(data)))));
              toast("สร้างโค้ดแล้ว");
            }}
          >
            สร้างโค้ด
          </button>
          <button
            className="btn-gh flex-1 !py-2.5 !text-[12px]"
            onClick={() => {
              if (!transferCode) {
                toast("กดสร้างโค้ดก่อน");
                return;
              }
              navigator.clipboard
                .writeText(transferCode)
                .then(() => toast("คัดลอกแล้ว"))
                .catch(() => toast("คัดลอกไม่ได้"));
            }}
          >
            คัดลอก
          </button>
        </div>
        <textarea
          className="w-full px-3 py-2.5 text-[11px] min-h-[70px] mb-2"
          style={{ fontFamily: "JetBrains Mono" }}
          value={transferCode}
          onChange={(e) => setTransferCode(e.target.value)}
          placeholder="โค้ดจะขึ้นที่นี่ หรือวางโค้ดจากเครื่องอื่นเพื่อกู้คืน"
        />
        <button
          className="btn-cy w-full !text-[12.5px]"
          onClick={() => {
            // decodeTransfer ตรวจชนิดข้อมูลผ่าน normalizeData แล้ว — คืน null = โค้ดพัง/ปลอม
            const restored = decodeTransfer(transferCode);
            if (!restored) {
              toast("โค้ดไม่ถูกต้อง");
              return;
            }
            update((d) => Object.assign(d, restored));
            toast("กู้คืนแล้ว");
          }}
        >
          กู้คืนจากโค้ด
        </button>
      </div>

      <div className="glass p-4">
        <Kicker>เริ่มใหม่หมด</Kicker>
        <p className="text-[11.5px] mb-2.5" style={{ color: "var(--mut)" }}>
          ล้างท่า ประวัติ และข้อมูลทั้งหมดให้ว่างเปล่า (โปรแกรมที่บันทึกไว้ยังอยู่) — เริ่มสร้างโปรแกรมเองจากศูนย์
        </p>
        <button
          className="btn-danger w-full !text-[12.5px]"
          onClick={() => {
            if (confirm("ลบทุกอย่างให้ว่างเปล่า? ท่าและประวัติการฝึกทั้งหมดจะหาย (กู้ไม่ได้)")) {
              update((d) => Object.assign(d, createEmpty()));
              toast("ล้างข้อมูลหมดแล้ว");
            }
          }}
        >
          ลบทั้งหมดให้ว่างเปล่า
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
      <Kicker>ตั้งค่าการฝึก</Kicker>
      <ToggleRow
        label="เสียงตอนกด"
        desc="เสียงสั้นๆ ตอนติ๊กเซต ครบท่า และทำ PR"
        on={soundOn}
        onToggle={() => {
          update((d) => {
            d.settings.soundEnabled = !soundOn;
          });
          toast(soundOn ? "ปิดเสียงแล้ว" : "เปิดเสียงแล้ว");
        }}
      />
      <ToggleRow
        label="เวลาพักอัตโนมัติต่อท่า"
        desc="ให้ระบบเลือกเวลาพักที่เหมาะกับแต่ละท่า (ท่าหนักพักนาน เรปสูงพักสั้น)"
        on={smartOn}
        onToggle={() => {
          update((d) => {
            d.settings.smartRest = !smartOn;
          });
          toast(smartOn ? "ใช้เวลาพักค่าเดียวแล้ว" : "เปิดเวลาพักอัตโนมัติแล้ว");
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
              สตรีคสูงสุด {best} วัน
            </span>
          ) : undefined
        }
      >
        หน้าตา · ธีม
      </Kicker>
      <div className="text-[13.5px] mb-2.5">สีธีม (accent)</div>
      <div className="flex gap-2.5">
        {ACCENTS.map((a) => {
          const on = a.color.toLowerCase() === current;
          const open = accentUnlocked(a, best, isPro);
          return (
            <button
              key={a.color}
              onClick={() => {
                if (!open) {
                  toast(`ฝึกต่อเนื่องให้ได้ ${a.unlockStreak} วันเพื่อปลดล็อกสี${a.label} (ตอนนี้ ${best})`, false);
                  return;
                }
                update((d) => {
                  d.settings.accent = a.color;
                });
                toast(`เปลี่ยนธีมเป็นสี${a.label}`);
              }}
              className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all"
              style={{
                background: on ? `color-mix(in srgb, ${a.color} 14%, transparent)` : "rgba(120,180,255,.05)",
                border: on ? `1px solid ${a.color}` : "1px solid var(--edge)",
                boxShadow: on ? `0 0 14px -3px ${a.color}` : "none",
                opacity: open ? 1 : 0.5,
              }}
              aria-pressed={on}
              aria-label={open ? `สี${a.label}` : `สี${a.label} — ล็อกอยู่ ต้องสตรีค ${a.unlockStreak} วัน`}
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
                {open ? a.label : `${a.unlockStreak} วัน`}
              </span>
            </button>
          );
        })}
      </div>
      {nextLock && (
        <p className="text-[10.5px] mt-2 leading-relaxed" style={{ color: "var(--dim)" }}>
          อีก {nextLock.unlockStreak - best} วันต่อเนื่องจะปลดล็อกสี{nextLock.label} — นับจากสตรีคสูงสุดที่เคยทำได้
          ปลดแล้วอยู่ถาวร ขาดวันก็ไม่หาย
        </p>
      )}
      <div className="mt-1.5">
        <ToggleRow
          label="โน้ตโค้ชในการ์ดท่า"
          desc="คำแนะนำเป้าหมายต่อท่า (🎯) ในหน้าวันนี้"
          on={coachOn}
          onToggle={() => {
            update((d) => {
              d.settings.showCoachNotes = !coachOn;
            });
            toast(coachOn ? "ซ่อนโน้ตโค้ชแล้ว" : "แสดงโน้ตโค้ชแล้ว");
          }}
        />
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
      <FieldLabel>ค้นจากคลังท่า ({EXERCISE_COUNT} ท่า)</FieldLabel>
      <input
        className="w-full px-3.5 py-2.5 text-[14px]"
        placeholder="พิมพ์ไทยหรืออังกฤษ เช่น หลัง, อก, ทีบาร์, squat"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
      />
      {open && results.length > 0 && (
        <div className="glass-inset mt-1.5 max-h-[220px] overflow-y-auto">
          {results.map((t) => (
            <button
              key={t.name}
              className="w-full text-left px-3 py-2 hairline first:border-0 active:scale-[.99] transition-transform"
              onClick={() => {
                onPick({
                  name: t.name,
                  type: t.type,
                  sets: t.sets,
                  rmin: t.rmin,
                  rmax: t.rmax,
                  amrap: t.amrap ?? false,
                  unit: unitFor(t),
                  inc: incFor(t),
                  machine: isMachineEx(t),
                });
                setQ("");
                setOpen(false);
              }}
            >
              <span className="block text-[13px]">
                {t.name}
                {isMachineEx(t) ? " ⚙" : ""}
              </span>
              <span className="block text-[11.5px]" style={{ color: "var(--mut)" }}>
                {t.th}
              </span>
              <span className="block font-mono2 text-[9.5px] mt-0.5" style={{ color: "var(--dim)" }}>
                {t.pri.map((m) => MUSCLE_TH[m]).join("/")} ·{" "}
                {t.equip.map((e) => EQUIP_TH[e]).slice(0, 2).join("+")} · {t.sets}×
                {t.amrap ? "สุดแรง" : `${t.rmin}-${t.rmax}`}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && q.trim() && results.length === 0 && (
        <p className="text-[11.5px] mt-1.5" style={{ color: "var(--dim)" }}>
          ไม่เจอในคลัง — พิมพ์ชื่อเองในช่องด้านล่างได้
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
