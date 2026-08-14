// โน้ตประจำวัน — บันทึกสั้นๆ ว่าวันนั้นเป็นยังไง
//
// ทำไมผูกกับ "วันที่จริง" ไม่ใช่ช่องวัน: ช่องวันเป็นตัวโปรแกรม ซึ่งย้าย/สลับ/เปลี่ยนรอบได้
// ถ้าโน้ตผูกกับช่องวัน พอสลับวันจันทร์กับเสาร์ โน้ตจะตามไปผิดวันทันที
// ผูกกับวันที่จึงย้อนดูได้ตรงเสมอ และใช้ได้ทั้งโหมดสัปดาห์และโหมดรอบ

import { useEffect, useRef, useState } from "react";
import { useApp } from "../AppContext";
import { todayStr } from "../lib/store";
import { t } from "../lib/i18n";
import { Icon } from "./ui";

const SAVE_DELAY_MS = 400;

export default function DayNote({ date = todayStr() }: { date?: string }) {
  const { data, update } = useApp();
  const saved = data.dayNotes?.[date] ?? "";
  const [text, setText] = useState(saved);
  const [open, setOpen] = useState(!!saved);
  const timer = useRef<number | undefined>(undefined);

  // เปลี่ยนวันแล้วต้องดึงโน้ตของวันนั้นมาแสดง ไม่ใช่ค้างของวันเดิม
  useEffect(() => {
    setText(saved);
    setOpen(!!saved);
  }, [date, saved]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const write = (raw: string) => {
    const body = raw.trim().slice(0, 2000);
    update((d) => {
      const notes = { ...(d.dayNotes ?? {}) };
      if (body) notes[date] = body;
      else delete notes[date];
      d.dayNotes = Object.keys(notes).length ? notes : undefined;
    });
  };

  // บันทึกระหว่างพิมพ์ (หน่วงสั้นๆ) ไม่ใช่รอตอนกดออกจากช่อง
  //
  // เหตุผล: บนมือถือ onBlur ไม่รับประกันว่าจะเกิด — ผู้ใช้พิมพ์เสร็จแล้วสลับแอป
  // ปิดแท็บ หรือระบบ kill แอปทิ้ง ช่องยังโฟกัสอยู่ blur ก็ไม่เคยยิง โน้ตหายทั้งก้อน
  // หน่วง 400 มิลลิวินาทีเพื่อไม่ให้เขียน localStorage ทุกตัวอักษร (ทั้งก้อนข้อมูลใหญ่)
  const onChange = (v: string) => {
    setText(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => write(v), SAVE_DELAY_MS);
  };

  const commit = () => {
    window.clearTimeout(timer.current);
    if (text.trim().slice(0, 2000) !== saved) write(text);
  };

  const remove = () => {
    window.clearTimeout(timer.current);
    setText("");
    setOpen(false);
    if (saved) write("");
  };

  // ปิดช่องแล้วโน้ตยังอยู่ — ปุ่มจะเปลี่ยนเป็น "ดู/แก้โน้ต" ให้รู้ว่ามีของอยู่
  if (!open)
    return (
      <button className="btn-gh w-full !py-2.5 !text-[12px] mb-2.5" onClick={() => setOpen(true)}>
        {saved ? t("ดู / แก้โน้ตของวันนี้", "View / edit today's note") : t("+ เพิ่มโน้ตของวันนี้", "+ Add a note for today")}
      </button>
    );

  return (
    <div className="glass p-4 mb-2.5">
      <div className="panel-head">
        <span className="mark" />
        <span className="font-mono2 text-[8.5px] uppercase tracking-[.28em] shrink-0" style={{ color: "#c9d6ff" }}>
          {t("โน้ตของวัน", "Session note")}
        </span>
        <span className="flex-1 min-w-[6px]" />
        <span className="font-mono2 text-[8.5px]" style={{ color: "var(--dim)" }}>
          {text.length}/2000
        </span>
        {/* ลบโน้ตของวันนี้ทิ้ง — ถามยืนยันก่อนเพราะกู้กลับไม่ได้ */}
        {saved && (
          <button
            className="ml-2 shrink-0 flex items-center"
            style={{ color: "var(--bad)", background: "none", border: "none", padding: "2px" }}
            aria-label={t("ลบโน้ตของวันนี้", "Delete today's note")}
            onClick={() => {
              if (confirm(t("ลบโน้ตของวันนี้? กู้กลับไม่ได้", "Delete today's note? This can't be undone."))) remove();
            }}
          >
            <Icon name="trash" size={12} />
          </button>
        )}
        {/* ปิดช่องพิมพ์ — โน้ตที่บันทึกไว้ยังอยู่ */}
        <button
          className="ml-1.5 shrink-0 flex items-center"
          style={{ color: "var(--dim)", background: "none", border: "none", padding: "2px" }}
          aria-label={t("ปิดช่องพิมพ์โน้ต", "Close the note box")}
          onClick={() => {
            commit();
            setOpen(false);
          }}
        >
          <Icon name="close" size={11} />
        </button>
      </div>
      <textarea
        className="w-full px-3 py-2.5 text-[13px] leading-relaxed"
        style={{ minHeight: 76, resize: "vertical" }}
        value={text}
        maxLength={2000}
        placeholder={t(
          "วันนี้เป็นยังไง — แรงดี/ล้า เจ็บตรงไหน เครื่องเต็มไหม กินมาพอหรือเปล่า",
          "How did today go — strong or flat? Anything hurting? Gym packed? Eaten enough?",
        )}
        onChange={(e) => onChange(e.target.value)}
        onBlur={commit}
      />
      <p className="text-[10.5px] mt-1.5 leading-relaxed" style={{ color: "var(--dim)" }}>
        {t(
          "บันทึกอัตโนมัติระหว่างพิมพ์ · ปิดช่องได้โดยโน้ตไม่หาย · ย้อนดูได้ที่แท็บก้าวหน้า",
          "Saves as you type · closing the box keeps the note · read them back on the Progress tab",
        )}
      </p>
    </div>
  );
}
