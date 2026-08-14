@echo off
chcp 65001 >nul
title RANKFORGE - License Manager
setlocal enabledelayedexpansion

rem ตัวช่วยจัดการรหัสลูกค้า — ดับเบิลคลิกไฟล์นี้ได้เลย ไม่ต้องเปิด terminal
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

:menu
cls
echo.
echo   ==========================================
echo      RANKFORGE - License Manager
echo   ==========================================
echo.
echo      1 = New key, 3 months   249 THB
echo      2 = New key, 1 year     690 THB
echo      3 = New key, lifetime   (promo only)
echo.
echo      4 = Show all keys issued
echo      5 = Trace a key  (who did I give it to?)
echo.
echo      0 = Quit
echo.
set "PICK="
set /p PICK="   Choose then press Enter: "

if "%PICK%"=="0" exit /b 0
if "%PICK%"=="4" goto list
if "%PICK%"=="5" goto find

if "%PICK%"=="1" set "MONTHS=3"
if "%PICK%"=="2" set "MONTHS=12"
if "%PICK%"=="3" set "MONTHS=life"

if not defined MONTHS (
  echo.
  echo   ERROR: unknown choice
  echo.
  pause
  goto menu
)

echo.
echo   Who is this for? Name + LINE id helps you trace it later.
echo   Example:  Somchai line:somchai99
echo.
set "WHO="
set /p WHO="   Customer (Enter to skip): "

set "COUNT="
set /p COUNT="   How many keys? (Enter for 1): "
if not defined COUNT set "COUNT=1"

echo.
"%NODE%" "%SCRIPT%" %MONTHS% %COUNT% "%WHO%"
echo.
echo   ------------------------------------------
echo   Copy the key above and send it to the buyer.
echo   It is already saved in licenses.log.tsv
echo   ------------------------------------------
echo.
pause
set "MONTHS="
goto menu

:list
echo.
"%NODE%" "%SCRIPT%" list
echo.
pause
goto menu

:find
echo.
set "KEY="
set /p KEY="   Paste the key you found: "
echo.
"%NODE%" "%SCRIPT%" find "%KEY%"
echo.
echo   ------------------------------------------
echo   To block this key: put it in REVOKED in
echo   src/lib/license.ts then push to main.
echo   It stops working everywhere in ~2 minutes.
echo   ------------------------------------------
echo.
pause
goto menu
