import { useApp } from "../AppContext";
import type { SavedProgram } from "../lib/store";
import { applyProgram, uid } from "../lib/store";
import { exText, locale, t } from "../lib/i18n";

// โปรแกรมที่บันทึกไว้ — บันทึกโปรแกรมปัจจุบันเป็นชุด, สลับ/ลบได้ (ประวัติเก็บตามชื่อท่า)
export default function SavedProgramsCard() {
  const { data, update, toast } = useApp();
  const saved = data.savedPrograms || [];

  function saveCurrent() {
    if (!data.exercises.length) {
      toast(t("ยังไม่มีท่าให้บันทึก", "Nothing to save yet"));
      return;
    }
    const fallback = t(`โปรแกรม ${saved.length + 1}`, `Program ${saved.length + 1}`);
    const name = prompt(t("ตั้งชื่อโปรแกรมที่จะบันทึก", "Name this program"), fallback);
    if (name == null) return;
    update((d) => {
      if (!d.savedPrograms) d.savedPrograms = [];
      d.savedPrograms.push({
        id: uid(),
        name: name.trim() || fallback,
        savedAt: new Date().toISOString(),
        exercises: structuredClone(d.exercises),
        dayLabels: structuredClone(d.dayLabels),
      });
    });
    toast(t("บันทึกโปรแกรมแล้ว", "Program saved"));
  }

  function load(p: SavedProgram) {
    if (
      !confirm(
        t(
          `ใช้โปรแกรม "${p.name}"? โปรแกรมปัจจุบันจะถูกแทนที่ (ประวัติการฝึกเก็บไว้ตามชื่อท่า)`,
          `Switch to "${p.name}"? Your current program is replaced — training history is kept, matched by exercise name.`,
        ),
      )
    )
      return;
    update((d) => applyProgram(d, p.exercises, p.dayLabels));
    toast(t(`ใช้โปรแกรม "${p.name}" แล้ว`, `Now using "${p.name}"`));
  }

  function remove(p: SavedProgram) {
    if (!confirm(t(`ลบโปรแกรม "${p.name}" ออกจากที่บันทึก?`, `Delete "${p.name}" from your saved programs?`))) return;
    update((d) => {
      d.savedPrograms = (d.savedPrograms || []).filter((x) => x.id !== p.id);
    });
    toast(t("ลบโปรแกรมที่บันทึกแล้ว", "Saved program deleted"));
  }

  return (
    <div className="glass p-4 mb-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="font-mono2 text-[9px] uppercase tracking-[.2em]" style={{ color: "var(--cyan-dim)" }}>
          {t("โปรแกรมที่บันทึก", "Saved programs")}
        </div>
        <span className="font-mono2 text-[10px]" style={{ color: "var(--dim)" }}>
          {t(`${saved.length} ชุด`, `${saved.length} saved`)}
        </span>
      </div>

      <button className="btn-cy w-full !py-2.5 !text-[12.5px] mb-3" onClick={saveCurrent}>
        {t("+ บันทึกโปรแกรมปัจจุบัน", "+ Save current program")}
      </button>

      {saved.length === 0 ? (
        <p className="text-[11.5px]" style={{ color: "var(--dim)" }}>
          {t(
            "บันทึกโปรแกรมที่ใช้อยู่ไว้เป็นชุด แล้วสลับไปมาได้ — เปลี่ยนโปรแกรมกี่ครั้งประวัติการฝึกก็ไม่หาย",
            "Save the program you're on and switch between them freely — swapping never loses your training history",
          )}
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
                  {exText(p.exercises.length)} ·{" "}
                  {new Date(p.savedAt).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "2-digit" })}
                </div>
              </div>
              <button className="btn-gh !py-2 !px-3 !text-[11.5px] shrink-0" onClick={() => load(p)}>
                {t("ใช้", "Use")}
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
