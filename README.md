# Gym Tracker by ARTYZ

เว็บแอปตารางฝึกเวท — React + TypeScript + Vite + Tailwind, UI ไทยทั้งหมด, ธีมกระจกฟ้า/cyan glow, mobile-first (iPhone Safari / PWA)

## โครงสร้าง

```
src/
  lib/store.ts        data model + localStorage (key: gymtracker_v1) — migration ปลอดภัย ข้อมูลเก่าไม่หาย
  lib/progression.ts  เป้าน้ำหนัก / warm-up ramp / plate calc
  lib/analyzer.ts     วิเคราะห์สมดุลกล้ามเนื้อ rule-based
  lib/streak.ts       สตรีค + heatmap (นับเฉพาะวันฝึกจริง · วันพักไม่บวกไม่ตัด · ชดเชยครบลบล้างวันที่พลาด)
  lib/forecast.ts     พยากรณ์ PR (linear regression จาก 4+ เซสชันล่าสุด)
  lib/share.ts        การ์ดสรุปสัปดาห์ (canvas 1080×1350) → Web Share / ดาวน์โหลด png
  lib/haptics.ts      รูปแบบสั่นตามเหตุการณ์ (ติ๊กเซต/ครบท่า/PR/พักครบ)
  lib/programParser.ts วางข้อความโปรแกรมทีเดียว -> รายการท่า (ไทย/อังกฤษ, เซตxเรป, น้ำหนัก, วิ, AMRAP, machine)
  lib/sound.ts        เสียงติ๊กเซต/ครบท่า/PR/พักครบ (Web Audio สังเคราะห์ ปิดได้)
  components/         TodayView ProgramView AnalyzerView ProgressView ManageView RestTimer
                      + StreakCard BodyCompCard ImportProgramCard
  App.tsx             shell, context, bottom nav

ฟีเจอร์: นำเข้าโปรแกรมทีเดียว (ManageView), เวลาพักแนะนำต่อท่า (suggestRest — compound/rep range),
ตัวจับเวลาลากขยับได้ + จำตำแหน่ง, เสียงตอบสนองการกด (ปิดได้), โหมดเครื่อง (machine — Exercise.machine,
ใส่น้ำหนักรวม ไม่มี warm-up ramp, ผู้ใช้กดเปลี่ยนเองในฟอร์มแก้ท่า)

v4 (2026-07-21): เอา voice logging + Cloud Sync (Supabase) ออก — bundle เล็กลง ~45% (510→282 KB)
```

## คำสั่ง (เครื่องนี้ใช้ Node portable ใน `.tools/`)

```powershell
$env:PATH = "C:\ARTY\COAD\CLAUDE\gym-tracker\.tools\node-v24.18.0-win-x64;" + $env:PATH
npm run dev      # dev server
npm run build    # typecheck + build PWA ลง dist/  (มี sw.js + manifest)
npm run bundle   # สร้าง bundle.html ไฟล์เดียว (Parcel) แบบเดียวกับ gym-tracker_4.html เดิม
# เทสต์ logic (parser/rest/forecast): bundle ด้วย esbuild ก่อน เพราะ Node ESM ไม่ resolve extensionless
.\node_modules\.bin\esbuild.cmd scripts/test-logic.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs
```

## Deploy (Netlify)

Live: **https://artytraining.netlify.app** · admin: https://app.netlify.com/projects/artytraining

> เดิมชื่อ `gym-tracker-artyz` — เปลี่ยนชื่อโปรเจกต์เป็น `artytraining` แล้ว URL เก่า 404

โฟลเดอร์นี้ link กับ Netlify project แล้ว (`.netlify/` ไม่เข้า git) — deploy รอบถัดไป:

```powershell
$env:PATH = "C:\ARTY\COAD\CLAUDE\gym-tracker\.tools\node-v24.18.0-win-x64;" + $env:PATH
npm run build
.\node_modules\.bin\netlify.cmd deploy --prod --dir=dist --no-build
```

⚠️ ต้องมี `--no-build` เสมอ: โปรเจกต์มีทั้ง Vite และ Parcel — ถ้าไม่ใส่ Netlify CLI
จะถามว่าจะใช้ตัวไหนแล้ว crash เพราะไม่มี stdin

## สองรูปแบบการใช้งาน

| แบบ | ไฟล์ | ได้อะไร |
|---|---|---|
| **PWA เต็มรูปแบบ** | deploy แล้วที่ https://artytraining.netlify.app | ติดตั้งลงหน้าจอโฮม, offline cache ผ่าน Service Worker, Notification จาก SW |
| **ไฟล์เดียว** | `bundle.html` | เปิด/แชร์ได้ทันทีเหมือนเวอร์ชันเดิม — จับเวลาแม่น, เสียง, สั่น ทำงานครบ แต่**ไม่มี** Service Worker/offline (ข้อจำกัดของไฟล์เดี่ยว ไม่ใช่บั๊ก) |

ข้อมูลทั้งหมดเก็บใน localStorage (key `gymtracker_v1`) — ย้ายข้ามเครื่องด้วยปุ่ม "ย้ายข้อมูลข้ามเครื่อง"
ในแท็บจัดการ (สร้างโค้ด/กู้คืนจากโค้ด)

## ข้อจำกัดที่ต้องรู้ (ตรงไปตรงมา)

- **iOS Safari suspend JS เร็วมาก** เมื่อสลับแอป/ล็อกจอ — ตัวจับเวลาคำนวณจาก timestamp
  จึง**แสดงเวลาถูกต้องเสมอเมื่อกลับมา** และ Notification จะยิงได้ก็ต่อเมื่อ OS ยังให้ JS รัน
  การแจ้งเตือนแม่นยำ 100% แม้ปิดแอปนาน ต้องใช้ **Web Push + server คั่นเวลา** (phase ถัดไป)
- `new Notification()` ใช้ไม่ได้บน iOS — โค้ด fallback เป็น SW notification → เสียง+สั่นเมื่อกลับมาแท็บ
- Vibration API: Android/Chrome ทำงาน, **iOS Safari ไม่รองรับ** (จะเงียบเฉยๆ ไม่พัง)
```
