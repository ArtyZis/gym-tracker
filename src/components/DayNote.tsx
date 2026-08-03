// โน้ตประจำวัน — บันทึกสั้นๆ ว่าวันนั้นเป็นยังไง
//
// ทำไมผูกกับ "วันที่จริง" ไม่ใช่ช่องวัน: ช่องวันเป็นตัวโปรแกรม ซึ่งย้าย/สลับ/เปลี่ยนรอบได้
// ถ้าโน้ตผูกกับช่องวัน พอสลับวันจันทร์กับเสาร์ โน้ตจะตามไปผิดวันทันที
// ผูกกับวันที่จึงย้อนดูได้ตรงเสมอ และใช้ได้ทั้งโหมดสัปดาห์และโหมดรอบ

import { useEffect, useRef, useState } from "react";
import { useApp } from "../AppContext";
import { todayStr } from "../lib/store";

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
    const t = raw.trim().slice(0, 2000);
    update((d) => {
      const notes = { ...(d.dayNotes ?? {}) };
      if (t) notes[date] = t;
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

  if (!open)
    return (
      <button className="btn-gh w-full !py-2.5 !text-[12px] mb-2.5" onClick={() => setOpen(true)}>
        + เพิ่มโน้ตของวันนี้
      </button>
    );

  return (
    <div className="glass p-4 mb-2.5">
      <div className="panel-head">
        <span className="mark" />
        <span className="font-mono2 text-[8.5px] uppercase tracking-[.28em] shrink-0" style={{ color: "#c9d6ff" }}>
          โน้ตของวัน
        </span>
        <span className="flex-1 min-w-[6px]" />
        <span className="font-mono2 text-[8.5px]" style={{ color: "var(--dim)" }}>
          {text.length}/2000
        </span>
      </div>
      <textarea
        className="w-full px-3 py-2.5 text-[13px] leading-relaxed"
        style={{ minHeight: 76, resize: "vertical" }}
        value={text}
        maxLength={2000}
        placeholder="วันนี้เป็นยังไง — แรงดี/ล้า เจ็บตรงไหน เครื่องเต็มไหม กินมาพอหรือเปล่า"
        onChange={(e) => onChange(e.target.value)}
        onBlur={commit}
      />
      <p className="text-[10.5px] mt-1.5 leading-relaxed" style={{ color: "var(--dim)" }}>
        บันทึกอัตโนมัติระหว่างพิมพ์ · ย้อนดูได้ที่แท็บก้าวหน้า
      </p>
    </div>
  );
}
