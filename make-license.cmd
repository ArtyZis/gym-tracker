@echo off
chcp 65001 >nul
title RANKFORGE - Make License Key
setlocal

rem ตัวช่วยออกรหัสให้ลูกค้า — ดับเบิลคลิกไฟล์นี้ได้เลย
rem
rem ทำไมเป็น .cmd ไม่ใช่ .ps1: เครื่องนี้ตั้ง ExecutionPolicy = Restricted
rem ซึ่งบล็อกสคริปต์ PowerShell ทุกตัวรวมทั้ง npm.ps1 แต่ .cmd ไม่โดนบล็อก
rem และเรียก node.exe ตรงๆ ไม่ต้องพึ่ง npm เลย
rem
rem ข้อความในไฟล์นี้ต้องเป็นอังกฤษล้วน: cmd.exe อ่านไฟล์ .cmd ด้วย codepage
rem ของระบบ (874 บนเครื่องไทย) แต่ chcp 65001 ข้างบนตั้งไว้เพื่อให้ผลลัพธ์
rem ภาษาไทยที่ node พ่นออกมาแสดงถูก — สองอย่างนี้ใช้ codepage คนละตัว
rem ถ้าใส่ไทยลงในไฟล์นี้จะเพี้ยนแน่นอน ให้ปล่อยส่วนภาษาไทยเป็นหน้าที่ของ node

set "NODE=%~dp0.tools\node-v24.18.0-win-x64\node.exe"
set "SCRIPT=%~dp0scripts\make-license.mjs"

if not exist "%NODE%" (
  echo   ERROR: node.exe not found - the .tools folder may have been moved
  pause
  exit /b 1
)

rem รับค่าจาก argument ได้ด้วย เผื่ออยากพิมพ์ทีเดียวจบ: make-license.cmd 2 3
set "PLAN=%~1"
set "COUNT=%~2"

echo.
echo   ==========================================
echo      RANKFORGE - Make License Key
echo   ==========================================
echo.

if not defined PLAN (
  echo      1 = 3 months   249 THB
  echo      2 = 1 year     690 THB
  echo      3 = lifetime   special promo only
  echo.
  set /p PLAN="   Type 1-3 then press Enter: "
)

if "%PLAN%"=="1" set "MONTHS=3"
if "%PLAN%"=="2" set "MONTHS=12"
if "%PLAN%"=="3" set "MONTHS=life"

if not defined MONTHS (
  echo.
  echo   ERROR: unknown choice - must be 1, 2 or 3
  pause
  exit /b 1
)

if not defined COUNT set /p COUNT="   How many keys? Press Enter for 1: "
if not defined COUNT set "COUNT=1"

echo.
"%NODE%" "%SCRIPT%" %MONTHS% %COUNT%
echo.
echo   ------------------------------------------
echo   Copy the key above and send it to the buyer.
echo   Log it in your sheet: who, which plan, expiry.
echo   ------------------------------------------
echo.
pause
