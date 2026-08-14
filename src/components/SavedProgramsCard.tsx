import { useApp } from "../AppContext";
import type { SavedProgram } from "../lib/store";
import { applyProgram, uid } from "../lib/store";
import { locale, t } from "../lib/i18n";

// โปรแกรมที่บันทึกไว้ — บันทึกโปรแกรมปัจจุบันเป็นชุด, สลับ/ลบได้ (ประวัติเก็บตามชื่อท่า)
export default function SavedProgramsCard() {
  const { data, update, toast } = useApp();
  const saved = data.savedPrograms || [];

  function saveCurrent() {
    if (!data.exercises.length) {
      toast("ยังไม่มีท่าให้บันทึก");
      return;
    }
    const name = prompt("ตั้งชื่อโปรแกรมที่จะบันทึก", `โปรแกรม ${saved.length + 1}`);
    if (name == null) return;
    update((d) => {
      if (!d.savedPrograms) d.savedPrograms = [];
      d.savedPrograms.push({
        id: uid(),
        name: name.trim() || `โปรแกรม ${d.savedPrograms.length + 1}`,
        savedAt: new Date().toISOString(),
        exercises: structuredClone(d.exercises),
        dayLabels: structuredClone(d.dayLabels),
      });
    });
    toast("บันทึกโปรแกรมแล้ว");
  }

  function load(p: SavedProgram) {
    if (!confirm(`ใช้โปรแกรม "${p.name}"? โปรแกรมปัจจุบันจะถูกแทนที่ (ประวัติการฝึกเก็บไว้ตามชื่อท่า)`)) return;
    update((d) => applyProgram(d, p.exercises, p.dayLabels));
    toast(`ใช้โปรแกรม "${p.name}" แล้ว`);
  }

  function remove(p: SavedProgram) {
    if (!confirm(`ลบโปรแกรม "${p.name}" ออกจากที่บันทึก?`)) return;
    update((d) => {
      d.savedPrograms = (d.savedPrograms || []).filter((x) => x.id !== p.id);
    });
    toast("ลบโปรแกรมที่บันทึกแล้ว");
  }

  return (
    <div className="glass p-4 mb-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="font-mono2 text-[9px] uppercase tracking-[.2em]" style={{ color: "var(--cyan-dim)" }}>
          โปรแกรมที่บันทึก
        </div>
        <span className="font-mono2 text-[10px]" style={{ color: "var(--dim)" }}>
          {saved.length} ชุด
        </span>
      </div>

      <button className="btn-cy w-full !py-2.5 !text-[12.5px] mb-3" onClick={saveCurrent}>
        + บันทึกโปรแกรมปัจจุบัน
      </button>

      {saved.length === 0 ? (
        <p className="text-[11.5px]" style={{ color: "var(--dim)" }}>
          บันทึกโปรแกรมที่ใช้อยู่ไว้เป็นชุด แล้วสลับไปมาได้ — เปลี่ยนโปรแกรมกี่ครั้งประวัติการฝึกก็ไม่หาย
        </p>
      ) : (
        saved
          .slice()
          .reverse()
          .map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 py-2.5 hairline first:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold truncate">{p.name}</div>
                <div className="font-mono2 text-[9.5px] mt-0.5" style={{ color: "var(--dim)" }}>
                  {p.exercises.length} ท่า ·{" "}
                  {new Date(p.savedAt).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "2-digit" })}
                </div>
              </div>
              <button className="btn-gh !py-2 !px-3 !text-[11.5px] shrink-0" onClick={() => load(p)}>
                ใช้
              </button>
              <button
                className="w-8 h-8 rounded-lg shrink-0 text-[12.5px] flex items-center justify-center"
                style={{ background: "rgba(6,12,22,.55)", border: "1px solid var(--edge)", color: "var(--bad)" }}
                onClick={() => remove(p)}
              >
                ✕
              </button>
            </div>
          ))
      )}
    </div>
  );
}
