import { useState } from "react";
import { useApp } from "../AppContext";
import { buildShareUrl, encodeProgram } from "../lib/programLink";
import { Kicker } from "./ui";

// ส่งโปรแกรมให้ลูกเทรน — สร้างลิงก์แล้วส่งทางไลน์ ลูกเทรนกดเปิดโปรแกรมเข้าแอปทันที
// ไม่ต้องมีบัญชี ไม่ต้องมีเซิร์ฟเวอร์: ทั้งโปรแกรมอยู่ในลิงก์
export default function ShareProgramCard() {
  const { data, toast } = useApp();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const count = data.exercises.length;
  // เดสก์ท็อปหลายตัวไม่มี Web Share API (TS ระบุว่ามีเสมอ ต้องเช็คตอนรันเอง)
  const canShare = typeof navigator.share === "function";

  function make(): string | null {
    if (!count) {
      toast("ยังไม่มีท่าให้ส่ง");
      return null;
    }
    const code = encodeProgram({
      title: "โปรแกรมจากโค้ช",
      exercises: data.exercises.map(({ id: _id, order: _order, ...rest }) => rest),
      dayLabels: data.dayLabels,
    });
    const link = buildShareUrl(code);
    setUrl(link);
    return link;
  }

  async function share() {
    const link = url || make();
    if (!link) return;
    setBusy(true);
    try {
      // มือถือ: เปิดแผงแชร์ให้เลือกไลน์ได้เลย · เดสก์ท็อป: คัดลอกไว้ให้วางเอง
      if (canShare) {
        await navigator.share({ title: "โปรแกรมฝึก", text: "โปรแกรมฝึกของคุณ — กดลิงก์เพื่อเปิดในแอป", url: link });
      } else {
        await navigator.clipboard.writeText(link);
        toast("คัดลอกลิงก์แล้ว");
      }
    } catch {
      /* ผู้ใช้กดยกเลิกแผงแชร์ — ไม่ใช่ error */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass p-4 mb-3">
      <Kicker right={<span className="font-mono2 text-[9.5px]" style={{ color: "var(--dim)" }}>{count} ท่า</span>}>
        ส่งโปรแกรมให้ลูกเทรน
      </Kicker>
      <p className="text-[12px] -mt-1 leading-relaxed" style={{ color: "var(--mut)" }}>
        สร้างลิงก์แล้วส่งทางไลน์ — ลูกเทรนกดเปิด โปรแกรมเข้าแอปเขาทันที ไม่ต้องสมัครอะไร
      </p>
      <div className="flex gap-2 mt-3">
        <button className="btn-cy flex-1 !py-2.5 !text-[12.5px]" disabled={busy} onClick={share}>
          {canShare ? "ส่งโปรแกรม" : "คัดลอกลิงก์"}
        </button>
        {url && (
          <button
            className="btn-gh !py-2.5 !px-3.5 !text-[12px] shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(url).then(
                () => toast("คัดลอกลิงก์แล้ว"),
                () => toast("คัดลอกไม่สำเร็จ"),
              );
            }}
          >
            คัดลอก
          </button>
        )}
      </div>
      {url && (
        <div
          className="glass-inset font-mono2 text-[10px] px-3 py-2.5 mt-2 break-all"
          style={{ color: "var(--mut)", maxHeight: 74, overflowY: "auto" }}
        >
          {url}
        </div>
      )}
    </div>
  );
}
