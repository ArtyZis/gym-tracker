# Gym Tracker by ARTYZ — คู่มือสำหรับ Claude

เว็บแอปตารางฝึกเวทส่วนตัวของผู้ใช้ (ARTYZ) — React 19 + TypeScript + Vite + Tailwind
**UI ภาษาไทยทั้งหมด** ธีมกระจกฟ้า/cyan glow, mobile-first (iPhone Safari / PWA)

โครงสร้างไฟล์และรายละเอียดฟีเจอร์ดูที่ [README.md](README.md) — ไฟล์นี้เก็บเฉพาะ
สิ่งที่ต้องรู้ก่อนลงมือแก้ ไม่งั้นพัง

---

## กฎเหล็ก 3 ข้อ

### 1. ห้ามทำข้อมูลผู้ใช้หาย
ข้อมูลจริงทั้งหมดอยู่ใน `localStorage` คีย์ `gymtracker_v1` เท่านั้น — **ไม่มี backend
ไม่มี backup บนคลาวด์** ถ้าเขียนโค้ดที่ทำ shape เปลี่ยนแล้วอ่านของเก่าไม่ได้ ประวัติ
การฝึกของผู้ใช้หายถาวร

- ฟิลด์ใหม่ใน `Data`/`Exercise`/`Settings` **ต้องเป็น optional (`?`) เสมอ** และมี default
  ที่ตีความ `undefined` = ค่าเดิมของระบบ (ดูแพตเทิร์น `soundEnabled?`, `smartRest?`,
  `machine?` ใน [src/lib/store.ts](src/lib/store.ts))
- migration ต้องเป็นแบบบวกเพิ่ม ไม่ลบ ไม่ rename คีย์เก่า
- อย่าเปลี่ยนคีย์ `gymtracker_v1` เด็ดขาด

### 2. ต้อง set PATH ก่อนรัน npm ทุกครั้ง
เครื่องนี้ใช้ Node แบบ portable ใน `.tools/` (ไม่ได้ติดตั้งใน system PATH):

```powershell
$env:PATH = "C:\ARTY\COAD\CLAUDE\gym-tracker\.tools\node-v24.18.0-win-x64;" + $env:PATH
```

### 3. deploy ต้องมี `--no-build` เสมอ
โปรเจกต์มีทั้ง Vite และ Parcel — ถ้าไม่ใส่ Netlify CLI จะถามว่าจะใช้ตัวไหน
แล้ว **crash เพราะไม่มี stdin**

---

## สองรุ่นจากโค้ดชุดเดียว (สำคัญ)

`VITE_EDITION` กำหนดรุ่นตอน build — **ค่าเริ่มต้นคือ `personal` เสมอ** ดู [src/lib/edition.ts](src/lib/edition.ts)

| รุ่น | คำสั่ง | ออกที่ | เว็บ | มีอะไรเพิ่ม |
|---|---|---|---|---|
| personal (ของ ARTYZ) | `npm run build` | `dist/` | artytraining | ไม่มีล็อก ไม่มีลิมิต |
| coach (ขายเทรนเนอร์) | `npm run build:coach` | `dist-coach/` | artycoach | ทะเบียนลูกเทรน + รหัสปลดล็อก |

- โค้ดรุ่น coach (`lib/profiles.ts`, `lib/license.ts`, `ProfileBar`, `LicenseCard`) ถูก
  tree-shake **ออกจาก build รุ่น personal ทั้งหมด** — ยืนยันได้ด้วยการ grep หา `artyz-coach-2026`
  ใน `dist/assets/*.js` ต้องไม่เจอ ถ้าเจอแปลว่า gate หลุดเข้าไปในรุ่นผู้ใช้ = บั๊ก
- รุ่น coach เก็บข้อมูลคนละคีย์ (`gymtracker_coach_roster_v1`, `gymtracker_coach_data_<id>`)
  **ไม่แตะ `gymtracker_v1`** เลย (อ่านคัดลอกครั้งแรกอย่างเดียว)
- สร้างรหัสขาย: `npm run license 5`

## คำสั่ง

```powershell
$env:PATH = "C:\ARTY\COAD\CLAUDE\gym-tracker\.tools\node-v24.18.0-win-x64;" + $env:PATH

npm run dev          # dev server (รุ่น personal)
npm run build        # -> dist/       รุ่น personal
npm run build:coach  # -> dist-coach/ รุ่น coach
npm run bundle       # Parcel -> bundle.html ไฟล์เดียว
npm run license 5    # สร้างรหัสปลดล็อก 5 อัน
```

deploy — **ต้องระบุ `--site` ให้ถูกรุ่น ไม่งั้น deploy ทับผิดเว็บ**:

```powershell
# รุ่นส่วนตัว -> artytraining (โฟลเดอร์ link ไว้กับอันนี้อยู่แล้ว)
.\node_modules\.bin\netlify.cmd deploy --prod --dir=dist --no-build

# รุ่นขาย -> artycoach (ต้องใส่ --site เพราะ link ไม่ได้ชี้มาที่นี่)
.\node_modules\.bin\netlify.cmd deploy --prod --dir=dist-coach --no-build --site 8d4dc317-a810-4075-8f7e-4d4311f4ee26
```

เทสต์ logic (parser / rest / forecast) — ต้อง bundle ก่อน เพราะ Node ESM
ไม่ resolve import แบบไม่มีนามสกุล:

```powershell
.\node_modules\.bin\esbuild.cmd scripts/test-logic.mjs --bundle --platform=node --format=esm --outfile=t.mjs; node t.mjs
```

---

## Deploy target

- **`artytraining`** → https://artytraining.netlify.app (รุ่น personal — โฟลเดอร์ link ไว้กับอันนี้)
- **`artycoach`** → https://artycoach.netlify.app (รุ่น coach, siteId `8d4dc317-a810-4075-8f7e-4d4311f4ee26`)
- ชื่อเดิม `gym-tracker-artyz` **เลิกใช้แล้ว (404)** อย่าอ้างถึงอีก
- โฟลเดอร์นี้ link ไว้แล้วผ่าน `.netlify/state.json` (gitignored — ห้าม commit)
- ตรวจว่า deploy ตรงกับเครื่องไหม: เทียบ hash ของ `assets/index-*.js`
  ในหน้าเว็บจริงกับใน `dist/`

---

## สองรูปแบบส่งมอบ

| แบบ | ไฟล์ | หมายเหตุ |
|---|---|---|
| PWA | `dist/` → Netlify | ติดตั้งหน้าจอโฮมได้, offline ผ่าน Service Worker |
| ไฟล์เดียว | `bundle.html` (gitignored, generated) | เปิด/แชร์ได้ทันที แต่**ไม่มี** SW/offline — เป็นข้อจำกัดของไฟล์เดี่ยว ไม่ใช่บั๊ก |

---

## ข้อจำกัดแพลตฟอร์ม — อย่า "แก้" สิ่งเหล่านี้ มันแก้ไม่ได้

- **iOS Safari suspend JS เร็วมาก** เมื่อสลับแอป/ล็อกจอ ตัวจับเวลาพักจึงคำนวณจาก
  timestamp (ไม่ใช่ setInterval นับถอยหลัง) — แสดงเวลาถูกเสมอเมื่อกลับมา
  ถ้าจะให้แจ้งเตือนแม่น 100% แม้ปิดแอปนาน ต้องใช้ Web Push + server เท่านั้น
- `new Notification()` **ใช้ไม่ได้บน iOS** — โค้ด fallback เป็น SW notification
- **Vibration API: iOS Safari ไม่รองรับ** (เงียบเฉยๆ ไม่พัง) Android/Chrome ทำงานปกติ

---

## แนวทางเขียนโค้ด (ตามของเดิมในโปรเจกต์)

- คอมเมนต์เป็น**ภาษาไทย** อธิบาย *ทำไม* ไม่ใช่ *ทำอะไร* — ตามที่มีอยู่แล้วใน store.ts
- state ทั้งแอปอยู่ที่ `App.tsx` ตัวเดียว ส่งผ่าน `AppContext` (`data`, `update`, `toast`, `rest`)
  — `update(fn)` ใช้ `structuredClone` แล้วแก้ draft, ไม่มี Redux/Zustand อย่าเพิ่ม
- ไม่มี router — สลับแท็บด้วย `useState<TabId>` ใน App.tsx
- Tailwind + CSS variables (`--cyan`, `--ink`, `--dim`, `--edge-hi`) ใน `src/index.css`
  สีอย่า hardcode ให้ใช้ var
- แอปคุมความกว้าง `max-w-[520px]` และเผื่อ `env(safe-area-inset-*)` ทุกขอบ (iPhone notch)
- **ระวัง bundle size** — v4 ถอด voice logging + Supabase ออกเพื่อลดจาก 510 → 282 KB
  ก่อนเพิ่ม dependency ใหม่ให้ถามผู้ใช้ก่อน ตอนนี้ runtime deps มีแค่ react + react-dom

---

## git

repo นี้เพิ่ง `git init` เมื่อ 24 ก.ค. 2026 หลังผู้ใช้เคยเผลอลบข้อมูลไปครั้งหนึ่ง —
**commit ทุกครั้งที่งานเป็นชิ้นเป็นอัน** เพื่อให้กู้กลับได้เสมอ
