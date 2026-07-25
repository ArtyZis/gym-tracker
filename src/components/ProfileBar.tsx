import { useMemo, useState } from "react";
import { addProfile, daysAgoText, deleteProfile, getRoster, lastTrainedOf, renameProfile } from "../lib/profiles";
import { FREE_PROFILE_LIMIT, isUnlocked } from "../lib/license";

// แถบลูกเทรนที่กำลังเปิดอยู่ + แผงสลับ/เพิ่ม/แก้ไข (รุ่น Coach เท่านั้น)
// อยู่ใต้ header ตลอด เพราะกลางเซสชันเทรนเนอร์ต้องสลับคนให้ไวที่สุด
export default function ProfileBar({
  activeId,
  onSwitch,
  toast,
}: {
  activeId: string;
  onSwitch: (id: string) => void;
  toast: (msg: string, glow?: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rev, setRev] = useState(0); // นับรอบเพื่อให้อ่านทะเบียนใหม่หลังแก้ไข
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftNote, setDraftNote] = useState("");

  const roster = useMemo(() => getRoster(), [rev]);
  const rows = useMemo(
    () => roster.profiles.map((p) => ({ ...p, last: lastTrainedOf(p.id) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roster, rev],
  );
  const active = roster.profiles.find((p) => p.id === activeId);
  const unlocked = isUnlocked();
  const atLimit = !unlocked && roster.profiles.length >= FREE_PROFILE_LIMIT;

  function add() {
    if (atLimit) {
      toast("รุ่นทดลองเก็บได้ 1 คน — ใส่รหัสปลดล็อกในแท็บจัดการ");
      return;
    }
    const name = prompt("ชื่อลูกเทรน");
    if (name == null) return;
    const p = addProfile(name);
    setRev((v) => v + 1);
    onSwitch(p.id);
    setOpen(false);
    toast(`เพิ่ม "${p.name}" แล้ว`, true);
  }

  function saveEdit(id: string) {
    renameProfile(id, draftName, draftNote);
    setEditing(null);
    setRev((v) => v + 1);
    toast("บันทึกแล้ว");
  }

  function remove(id: string, name: string) {
    if (!confirm(`ลบ "${name}" และประวัติการฝึกทั้งหมดของคนนี้? (กู้กลับไม่ได้)`)) return;
    deleteProfile(id);
    const next = getRoster();
    setRev((v) => v + 1);
    if (id === activeId) {
      // ลบคนที่เปิดอยู่ — ต้องมีคนถัดไปเสมอ ไม่งั้นแอปไม่มีข้อมูลให้แสดง
      const fallback = next.profiles[0]?.id;
      if (fallback) onSwitch(fallback);
      else {
        const fresh = addProfile("ตัวฉันเอง");
        setRev((v) => v + 1);
        onSwitch(fresh.id);
      }
    }
    toast(`ลบ "${name}" แล้ว`);
  }

  return (
    <div className="px-4 mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full glass flex items-center gap-2.5 px-3.5 py-2.5 text-left"
        style={{ borderRadius: 15 }}
      >
        <span
          className="w-[30px] h-[30px] rounded-[10px] shrink-0 flex items-center justify-center font-disp font-bold text-[13px]"
          style={{
            color: "#031420",
            background: "linear-gradient(180deg, var(--acc), var(--acc-2))",
            boxShadow: "0 0 12px -3px var(--acc)",
          }}
        >
          {(active?.name || "?").trim().charAt(0)}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-disp font-semibold text-[14px] leading-tight truncate" style={{ color: "var(--ink)" }}>
            {active?.name ?? "—"}
          </span>
          <span className="block font-mono2 text-[9.5px] mt-[1px] truncate" style={{ color: "var(--dim)" }}>
            {active?.note || `ลูกเทรน ${roster.profiles.length} คน`}
          </span>
        </span>
        <span className="font-mono2 text-[10px] shrink-0" style={{ color: "var(--acc)" }}>
          {open ? "▴ ปิด" : "▾ เปลี่ยน"}
        </span>
      </button>

      {open && (
        <div className="glass mt-1.5 p-2 rise-up" style={{ borderRadius: 15 }}>
          {rows.map((p) => {
            const on = p.id === activeId;
            const isEditing = editing === p.id;
            return (
              <div
                key={p.id}
                className="rounded-xl mb-1 last:mb-0"
                style={on ? { background: "var(--acc-08)", border: "1px solid var(--acc-24)" } : { border: "1px solid transparent" }}
              >
                {isEditing ? (
                  <div className="p-2.5 flex flex-col gap-2">
                    <input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder="ชื่อ"
                      className="px-3 py-2 text-[14px]"
                    />
                    <input
                      value={draftNote}
                      onChange={(e) => setDraftNote(e.target.value)}
                      placeholder="โน้ต เช่น ลดไขมัน / เตรียมแข่ง"
                      className="px-3 py-2 text-[13px]"
                    />
                    <div className="flex gap-2">
                      <button className="btn-cy flex-1 !py-2 !text-[12px]" onClick={() => saveEdit(p.id)}>
                        บันทึก
                      </button>
                      <button className="btn-gh !py-2 !px-3 !text-[12px]" onClick={() => setEditing(null)}>
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 p-1.5">
                    <button
                      className="flex items-center gap-2.5 flex-1 min-w-0 text-left px-1.5 py-1"
                      onClick={() => {
                        onSwitch(p.id);
                        setOpen(false);
                      }}
                    >
                      <span
                        className="w-[26px] h-[26px] rounded-lg shrink-0 flex items-center justify-center font-disp font-bold text-[12px]"
                        style={
                          on
                            ? { color: "#031420", background: "linear-gradient(180deg, var(--acc), var(--acc-2))" }
                            : { color: "var(--mut)", background: "rgba(125,180,255,.08)", border: "1px solid var(--edge)" }
                        }
                      >
                        {p.name.trim().charAt(0)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13.5px] leading-tight truncate" style={{ color: "var(--ink)" }}>
                          {p.name}
                        </span>
                        <span className="block font-mono2 text-[9.5px] mt-[1px] truncate" style={{ color: "var(--dim)" }}>
                          {daysAgoText(p.last)}
                          {p.note ? ` · ${p.note}` : ""}
                        </span>
                      </span>
                    </button>
                    <button
                      className="w-7 h-7 rounded-lg shrink-0 text-[11px]"
                      style={{ background: "rgba(10,22,34,.9)", border: "1px solid var(--edge)", color: "var(--mut)" }}
                      aria-label="แก้ไข"
                      onClick={() => {
                        setEditing(p.id);
                        setDraftName(p.name);
                        setDraftNote(p.note ?? "");
                      }}
                    >
                      ✎
                    </button>
                    <button
                      className="w-7 h-7 rounded-lg shrink-0 text-[11px]"
                      style={{ background: "rgba(10,22,34,.9)", border: "1px solid var(--edge)", color: "var(--bad)" }}
                      aria-label="ลบ"
                      onClick={() => remove(p.id, p.name)}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <button className={`btn-gh w-full !py-2.5 !text-[12px] mt-1.5 ${atLimit ? "opacity-60" : ""}`} onClick={add}>
            {atLimit ? "🔒 เพิ่มลูกเทรน (ต้องปลดล็อก)" : "+ เพิ่มลูกเทรน"}
          </button>
        </div>
      )}
    </div>
  );
}
