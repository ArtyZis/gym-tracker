# สร้างไอคอน PNG จากดีไซน์บาร์เบลล์เดิม (iOS ไม่รองรับ SVG สำหรับ apple-touch-icon)
# รัน: python scripts/make-icons.py
from PIL import Image, ImageDraw

BG = (4, 7, 13, 255)  # --bg0 #04070D
CYAN = (79, 216, 255, 255)  # --cyan #4FD8FF
SS = 4  # supersample เพื่อให้ขอบเนียน


def round_cap_line(draw, x0, y0, x1, y1, w):
    """เส้นปลายมน = เส้นหนา + วงกลมสองปลาย (เลียน stroke-linecap:round ของ SVG)"""
    r = w / 2
    draw.line([(x0, y0), (x1, y1)], fill=CYAN, width=int(round(w)))
    for cx, cy in ((x0, y0), (x1, y1)):
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CYAN)


def barbell(size, compact=False, radius_ratio=0.0):
    """compact=True สำหรับ maskable (บาร์เบลล์เล็กลงให้อยู่ใน safe zone 80%)"""
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if radius_ratio > 0:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=S * radius_ratio, fill=BG)
    else:
        d.rectangle([0, 0, S, S], fill=BG)

    k = S / 180.0  # ดีไซน์เดิมอิง viewBox 180
    if compact:
        sw, inner, outer, bar_h, plate_h = 9, (58, 122), (44, 136), 28, 12
    else:
        sw, inner, outer, bar_h, plate_h = 11, (50, 130), (32, 148), 40, 16

    w = sw * k
    cy = 90 * k
    round_cap_line(d, inner[0] * k, cy, inner[1] * k, cy, w)  # แกนบาร์
    for x in inner:  # แผ่นใน
        round_cap_line(d, x * k, cy - bar_h / 2 * k, x * k, cy + bar_h / 2 * k, w)
    for x in outer:  # แผ่นนอก
        round_cap_line(d, x * k, cy - plate_h / 2 * k, x * k, cy + plate_h / 2 * k, w)

    return img.resize((size, size), Image.LANCZOS)


def flatten(img):
    """ทับพื้นทึบ — apple-touch-icon ห้ามโปร่งใส"""
    bg = Image.new("RGB", img.size, BG[:3])
    bg.paste(img, mask=img.split()[3])
    return bg


out = "public"
# manifest icons (Android/Chrome)
barbell(192, radius_ratio=0.2).save(f"{out}/icon-192.png")
barbell(512, radius_ratio=0.2).save(f"{out}/icon-512.png")
# maskable — เต็มขอบ ไม่มีมุมมน ให้ OS ครอบเอง, บาร์เบลล์เล็กลงกันโดนตัด
barbell(512, compact=True).save(f"{out}/icon-maskable-512.png")
# iOS home screen — ต้องเป็น PNG ทึบ 180x180
flatten(barbell(180)).save(f"{out}/apple-touch-icon.png")

print("icons written to public/")
