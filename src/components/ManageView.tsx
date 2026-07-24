import { useState } from "react";
import type { ReactNode } from "react";
import { useApp } from "../AppContext";
import type { DayKey, Exercise, ExType } from "../lib/store";
import { DAYS, DAY_TH, archiveOne, createEmpty, exercisesForDay, repTargetText, uid } from "../lib/store";
import { plateCalc } from "../lib/progression";
import ImportProgramCard from "./ImportProgramCard";
import SavedProgramsCard from "./SavedProgramsCard";

type ExerciseDraft = Omit<Exercise, "id" | "order"> & Partial<Pick<Exercise, "id" | "order">>;

export default function ManageView() {
  const { data, update, toast } = useApp();
  const [draft, setDraft] = useState<ExerciseDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [moveFrom, setMoveFrom] = useState<DayKey>("thu");
  const [moveTo, setMoveTo] = useState<DayKey>("fri");
  const [transferCode, setTransferCode] = useState("");
  const [barInput, setBarInput] = useState(String(data.settings.barWeight ?? 20));
  const [targetInput, setTargetInput] = useState("60");

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

  const bar = parseFloat(barInput) || 20;
  const target = parseFloat(targetInput) || 0;
  const plates = plateCalc(target, bar);
  const inputCls = "w-full px-3.5 py-2.5 text-[14px]";

  return (
    <div className="rise">
      <ImportProgramCard />

      <SavedProgramsCard />

      <TrainingSettingsCard />

      <div className="glass p-4 mb-3">
        <div className="font-mono2 text-[9px] uppercase tracking-[.2em] mb-2.5" style={{ color: "var(--cyan-dim)" }}>
          ปรับแต่งโปรแกรม
        </div>
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
            <FieldLabel>ชื่อท่า</FieldLabel>
            <input
              className={inputCls + " mb-2.5"}
              value={draft.name || ""}
              placeholder="เช่น Cable Fly"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <FieldLabel>ฝึกวันไหน</FieldLabel>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {DAYS.map((d) => (
                <Chip key={d} on={draft.day === d} onClick={() => setDraft({ ...draft, day: d })}>
                  {DAY_TH[d]}
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
        <div className="font-mono2 text-[9px] uppercase tracking-[.2em] mb-1.5" style={{ color: "var(--cyan-dim)" }}>
          ท่าทั้งหมด
        </div>
        {DAYS.map((d) => {
          const exs = exercisesForDay(data, d);
          if (!exs.length) return null;
          return (
            <div key={d}>
              <div className="font-disp text-[12.5px] mt-3 mb-1" style={{ color: "var(--cyan-dim)" }}>
                {DAY_TH[d]}
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
        <div className="font-mono2 text-[9px] uppercase tracking-[.2em] mb-2.5" style={{ color: "var(--cyan-dim)" }}>
          ย้ายท่าทั้งวัน
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2.5">
          <div>
            <FieldLabel>จากวัน</FieldLabel>
            <select className={inputCls} value={moveFrom} onChange={(e) => setMoveFrom(e.target.value as DayKey)}>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {DAY_TH[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>ไปวัน</FieldLabel>
            <select className={inputCls} value={moveTo} onChange={(e) => setMoveTo(e.target.value as DayKey)}>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {DAY_TH[d]}
                </option>
              ))}
            </select>
          </div>
        </div>
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
            toast(count ? `ย้าย ${count} ท่าไป${DAY_TH[moveTo]}แล้ว` : "วันนั้นไม่มีท่า");
          }}
        >
          ย้ายทั้งหมด
        </button>
        <div className="hairline mt-4 pt-3.5">
          <div className="font-mono2 text-[9px] uppercase tracking-[.2em] mb-2.5" style={{ color: "var(--cyan-dim)" }}>
            ชื่อวันฝึก
          </div>
          {DAYS.map((d) => (
            <div key={d} className="grid grid-cols-[54px_1fr] gap-2 items-center mb-1.5">
              <span className="font-mono2 text-[11px]" style={{ color: "var(--mut)" }}>
                {DAY_TH[d]}
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
        <div className="font-mono2 text-[9px] uppercase tracking-[.2em] mb-2.5" style={{ color: "var(--cyan-dim)" }}>
          คำนวณแผ่นน้ำหนัก · Plate Calc
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <FieldLabel>น้ำหนักเป้า (kg)</FieldLabel>
            <input type="number" className={inputCls} value={targetInput} onChange={(e) => setTargetInput(e.target.value)} />
          </div>
          <div>
            <FieldLabel>แกนบาร์ (kg)</FieldLabel>
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
        </div>
        {target > bar ? (
          <div>
            <div className="text-[12px] mb-2" style={{ color: "var(--mut)" }}>
              ใส่ต่อข้าง:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {plates.list.map((p, i) => (
                <span
                  key={i}
                  className="font-mono2 text-[13px] font-bold px-3 py-2 rounded-xl"
                  style={{ background: "rgba(79,216,255,.10)", border: "1px solid rgba(120,205,255,.3)", color: "var(--cyan)" }}
                >
                  {p}
                </span>
              ))}
              {plates.list.length === 0 && (
                <span className="text-[12px]" style={{ color: "var(--dim)" }}>
                  ไม่ต้องใส่แผ่น
                </span>
              )}
            </div>
            {plates.leftover > 0.01 && (
              <p className="text-[11px] mt-2" style={{ color: "var(--warn)" }}>
                เหลือเศษ {plates.leftover.toFixed(2)} kg/ข้าง ที่แผ่นมาตรฐานทำไม่ได้พอดี
              </p>
            )}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: "var(--dim)" }}>
            ใส่น้ำหนักเป้าที่มากกว่าแกนบาร์
          </p>
        )}
      </div>

      <div className="glass p-4 mb-3">
        <div className="font-mono2 text-[9px] uppercase tracking-[.2em] mb-2" style={{ color: "var(--cyan-dim)" }}>
          ย้ายข้อมูลข้ามเครื่อง
        </div>
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
            try {
              const restored = JSON.parse(decodeURIComponent(escape(atob(transferCode.trim()))));
              if (!restored.exercises) throw 0;
              update((d) => Object.assign(d, restored));
              toast("กู้คืนแล้ว");
            } catch {
              toast("โค้ดไม่ถูกต้อง");
            }
          }}
        >
          กู้คืนจากโค้ด
        </button>
      </div>

      <div className="glass p-4">
        <div className="font-mono2 text-[9px] uppercase tracking-[.2em] mb-2" style={{ color: "#FF8B8B" }}>
          เริ่มใหม่หมด
        </div>
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
    </div>
  );
}

function TrainingSettingsCard() {
  const { data, update, toast } = useApp();
  const soundOn = data.settings.soundEnabled !== false;
  const smartOn = data.settings.smartRest !== false;
  return (
    <div className="glass p-4 mb-3">
      <div className="font-mono2 text-[9px] uppercase tracking-[.2em] mb-1" style={{ color: "var(--cyan-dim)" }}>
        ตั้งค่าการฝึก
      </div>
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
        background: on ? "linear-gradient(180deg,#4FD8FF,#3D9BDC)" : "rgba(120,180,255,.12)",
        border: on ? "none" : "1px solid var(--edge)",
        boxShadow: on ? "0 0 12px rgba(79,216,255,.4)" : "none",
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
            background: "linear-gradient(180deg,#4FD8FF,#3D9BDC)",
            color: "#03131C",
            fontWeight: 700,
            boxShadow: "0 0 10px rgba(79,216,255,.35)",
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
