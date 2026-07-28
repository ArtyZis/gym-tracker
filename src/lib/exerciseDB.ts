// คลังท่าออกกำลังกาย — ข้อมูลครบพอให้ตัววิเคราะห์ตัดสินได้ว่า "ผู้ใช้ทำท่านี้ได้จริงไหม"
//
// โครงสร้าง:
//   name    ชื่ออังกฤษมาตรฐาน — ใช้เป็น id จับคู่ประวัติ ห้ามแก้ทีหลัง ประวัติจะหลุด
//   th      ชื่อไทยสั้น (แสดงใต้ชื่ออังกฤษ ให้รู้ว่าคือท่าอะไร)
//   alias   คำค้นสำรอง (ไม่แสดงบนจอ)
//   equip   อุปกรณ์ที่ "ต้องมีครบทุกชิ้น" ถึงจะทำท่านี้ได้ — หัวใจของการกรองคำแนะนำ
//   pri/sec กล้ามเนื้อหลัก/รอง — นับแบบ fractional: primary 1.0 เซต, secondary 0.5 เซต
//   pattern รูปแบบการเคลื่อนไหว ใช้ตรวจสมดุลที่ระดับแพทเทิร์น
//   fatigue ต้นทุนความล้า ใช้ประเมินเวลาต่อเซตและจัดลำดับท่า
//   avoid   อาการบาดเจ็บที่ควรเลี่ยงท่านี้ (ใส่เฉพาะที่ชัดเจน — ใส่มั่วจะกรองจนไม่เหลือท่า)
//
// ค้นหาได้จาก: ชื่ออังกฤษ · ชื่อไทย · alias · ชื่อกล้ามเนื้อ · ชื่ออุปกรณ์
// เวลาพักไม่เก็บที่นี่ — suggestRest() คำนวณจากชนิดท่า+ช่วงเรปให้เอง

import type { ExType } from "./store";
import type { EquipTag, FatigueCost, InjuryKey, MuscleKey, Pattern } from "./muscles";
import { EQUIP_TH, MUSCLE_ALIAS, MUSCLE_TH } from "./muscles";

// re-export ให้ component ที่ทำงานกับท่า import จากที่เดียวจบ
export { EQUIP_TH, MUSCLE_TH } from "./muscles";
export type { EquipTag, MuscleKey, Pattern } from "./muscles";

export interface ExTemplate {
  name: string;
  th: string;
  alias?: string;
  equip: EquipTag[];
  pri: MuscleKey[];
  sec?: MuscleKey[];
  pattern: Pattern;
  fatigue: FatigueCost;
  type: ExType;
  sets: number;
  rmin: number;
  rmax: number;
  amrap?: boolean;
  avoid?: InjuryKey[];
  tip: string;
}

// prettier-ignore
export const EXERCISE_DB: ExTemplate[] = [
  // ══════════ อก ══════════
  { name: "Barbell Bench Press", th: "เบนช์เพรส", alias: "นอนดันบาร์ ดันอก", equip: ["barbell","bench","rack"], pri: ["chest"], sec: ["triceps","front_delts"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 4, rmin: 5, rmax: 8, avoid: ["shoulder"], tip: "สะบักหุบล็อกไว้ ลดบาร์แตะอกช่วงหัวนม ศอกทำมุม ~45° กับลำตัว" },
  { name: "Incline Barbell Press", th: "เบนช์เอียง (อกบน)", alias: "อินไคลน์ บาร์", equip: ["barbell","bench","rack"], pri: ["chest"], sec: ["front_delts","triceps"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 4, rmin: 6, rmax: 10, avoid: ["shoulder"], tip: "ปรับเบาะ 30-45° ชันเกินจะกลายเป็นเล่นไหล่" },
  { name: "Decline Barbell Press", th: "เบนช์หัวลง (อกล่าง)", alias: "ดีไคลน์", equip: ["barbell","bench","rack"], pri: ["chest"], sec: ["triceps"], pattern: "horizontal_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "เน้นอกส่วนล่าง ช่วงเคลื่อนไหวสั้นกว่า ยกได้หนักกว่าท่าราบ" },
  { name: "Dumbbell Bench Press", th: "เบนช์ดัมเบล", alias: "นอนดันดัมเบล", equip: ["dumbbell","bench"], pri: ["chest"], sec: ["triceps","front_delts"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 4, rmin: 6, rmax: 12, tip: "ช่วงยืดกว้างกว่าบาร์เบล ลงช้าให้อกยืดสุด" },
  { name: "Incline DB Press", th: "ดัมเบลเอียง (อกบน)", alias: "อินไคลน์ดัมเบล", equip: ["dumbbell","bench"], pri: ["chest"], sec: ["front_delts","triceps"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 4, rmin: 6, rmax: 10, tip: "เน้นอกบน อย่าให้ดัมเบลชนกันด้านบน คงแรงตึงไว้" },
  { name: "Dumbbell Fly", th: "ฟลายดัมเบล (กางอก)", alias: "กางอก บินอก", equip: ["dumbbell","bench"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, avoid: ["shoulder"], tip: "งอศอกเล็กน้อยค้างไว้ตลอด นึกภาพกอดต้นไม้ ห้ามงอ-เหยียดศอก" },
  { name: "Incline Dumbbell Fly", th: "ฟลายเอียง", alias: "กางอกบน", equip: ["dumbbell","bench"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, avoid: ["shoulder"], tip: "เน้นอกบนช่วงยืด ใช้น้ำหนักเบากว่าท่าราบ" },
  { name: "Cable Fly", th: "เคเบิลฟลาย (ไขว้สาย)", alias: "ครอสโอเวอร์ ไขว้อก", equip: ["cable"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แรงตึงคงที่ทั้งช่วง บีบอกค้าง 1 วิตอนสายไขว้กัน" },
  { name: "Low Cable Fly", th: "เคเบิลฟลายล่างขึ้นบน", alias: "ไขว้อกบน", equip: ["cable"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ดึงจากล่างขึ้นบน เน้นอกส่วนบน" },
  { name: "Pec Deck", th: "เครื่องหนีบอก", alias: "เพคเดค บัตเตอร์ฟลาย", equip: ["machine"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "เหมาะเป็นท่าปิดท้าย ควบคุมจังหวะกลับช้าๆ" },
  { name: "Chest Press Machine", th: "เครื่องดันอก", alias: "เชสเพรส", equip: ["machine"], pri: ["chest"], sec: ["triceps","front_delts"], pattern: "horizontal_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ปรับเบาะให้มือระดับกลางอก ปลอดภัยกว่าฟรีเวทเมื่อเล่นคนเดียว" },
  { name: "Landmine Press", th: "แลนด์ไมน์เพรส", alias: "ดันบาร์เอียง", equip: ["barbell"], pri: ["chest","front_delts"], sec: ["triceps"], pattern: "horizontal_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ปลายบาร์ปักมุมห้อง ดันขึ้นเฉียง เป็นมิตรกับหัวไหล่" },
  { name: "Push-up", th: "วิดพื้น", alias: "ดันพื้น", equip: ["bodyweight"], pri: ["chest"], sec: ["triceps","front_delts","core"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 25, avoid: ["wrist"], tip: "ลำตัวตรงเป็นเส้นเดียว เกร็งท้อง อย่าให้สะโพกตก" },
  { name: "Wide Push-up", th: "วิดพื้นมือกว้าง", alias: "ดันพื้นกว้าง", equip: ["bodyweight"], pri: ["chest"], sec: ["front_delts"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, avoid: ["wrist","shoulder"], tip: "มือกว้างกว่าไหล่ ~1.5 เท่า เน้นอกด้านนอก" },
  { name: "Decline Push-up", th: "วิดพื้นเท้าสูง", alias: "ดันพื้นยกขา", equip: ["bodyweight"], pri: ["chest"], sec: ["front_delts","triceps"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, avoid: ["wrist"], tip: "ยกเท้าสูงเพื่อเน้นอกบน ยิ่งสูงยิ่งหนัก" },
  { name: "Dip", th: "ดิป (ยันตัวบนบาร์คู่)", alias: "ยันตัว", equip: ["other","bodyweight"], pri: ["chest","triceps"], sec: ["front_delts"], pattern: "horizontal_push", fatigue: "high", type: "bodyweight", sets: 3, rmin: 6, rmax: 15, avoid: ["shoulder"], tip: "โน้มตัวไปหน้าเน้นอก ตั้งตัวตรงเน้นไตรเซป" },

  // ══════════ หลัง ══════════
  { name: "Deadlift", th: "เดดลิฟต์", alias: "ดึงพื้น ยกบาร์จากพื้น", equip: ["barbell"], pri: ["back","glutes","hamstrings"], sec: ["forearms","quads"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 3, rmax: 6, avoid: ["lower_back"], tip: "หลังตรงตลอด ดันพื้นด้วยขา บาร์ชิดหน้าแข้ง — ท่าหนักสุด พักให้เต็ม" },
  { name: "Sumo Deadlift", th: "เดดลิฟต์ขากว้าง", alias: "ซูโม่", equip: ["barbell"], pri: ["glutes","back"], sec: ["quads","hamstrings","forearms"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 4, rmax: 6, avoid: ["lower_back"], tip: "ยืนกว้าง จับในวงขา ลำตัวตั้งกว่าเดดปกติ เป็นมิตรกับหลังล่างกว่า" },
  { name: "Rack Pull", th: "แร็คพูล (เดดครึ่งบน)", alias: "ดึงจากแร็ค", equip: ["barbell","rack"], pri: ["back"], sec: ["glutes","forearms"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 5, rmax: 8, avoid: ["lower_back"], tip: "เริ่มจากระดับเข่า เน้นช่วงบนของเดดลิฟต์ ยกหนักกว่าปกติได้" },
  { name: "Barbell Row", th: "โรว์บาร์เบล (ดึงหลัง)", alias: "เบนโอเวอร์โรว์", equip: ["barbell"], pri: ["back"], sec: ["biceps","rear_delts"], pattern: "horizontal_pull", fatigue: "high", type: "weight", sets: 4, rmin: 6, rmax: 10, avoid: ["lower_back"], tip: "โน้มตัว ~45° ดึงบาร์เข้าท้องน้อย บีบสะบักสุด" },
  { name: "Pendlay Row", th: "เพนด์เลย์โรว์", alias: "โรว์วางพื้น", equip: ["barbell"], pri: ["back"], sec: ["biceps","rear_delts"], pattern: "horizontal_pull", fatigue: "high", type: "weight", sets: 4, rmin: 5, rmax: 8, avoid: ["lower_back"], tip: "วางบาร์แตะพื้นทุกครั้ง ระเบิดแรงขึ้นเร็ว หลังขนานพื้น" },
  { name: "T-Bar Row", th: "ทีบาร์โรว์", alias: "โรว์ทีบาร์ ดึงหลังเครื่อง", equip: ["machine"], pri: ["back"], sec: ["biceps","rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "หน้าอกดันแผ่นรอง ตัดการโกงด้วยหลังล่าง เน้นหลังกลาง" },
  { name: "Dumbbell Row", th: "โรว์ดัมเบลข้างเดียว", alias: "ดึงดัมเบล", equip: ["dumbbell","bench"], pri: ["back"], sec: ["biceps","rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ดึงข้อศอกไปด้านหลัง อย่าบิดลำตัวช่วย" },
  { name: "Seated Cable Row", th: "โรว์เคเบิลนั่งดึง", alias: "ดึงเคเบิลนั่ง", equip: ["cable"], pri: ["back"], sec: ["biceps","rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "อกตั้ง ดึงเข้าท้อง ปล่อยกลับให้สะบักยืดสุด" },
  { name: "Chest Supported Row", th: "โรว์พิงอก", alias: "โรว์เบาะเอียง", equip: ["machine","bench"], pri: ["back"], sec: ["biceps","rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "อกแนบเบาะ ตัดหลังล่างออกจากสมการ เล่นหลังล้วน" },
  { name: "Machine Row", th: "เครื่องดึงหลัง", alias: "โรว์เครื่อง", equip: ["machine"], pri: ["back"], sec: ["biceps"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "เหมาะคนเริ่มต้น ฟอร์มถูกง่ายกว่าฟรีเวท" },
  { name: "Lat Pulldown", th: "แลทพูลดาวน์ (ดึงบนลงล่าง)", alias: "ดึงบาร์ลง ดึงบน", equip: ["machine"], pri: ["back"], sec: ["biceps"], pattern: "vertical_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ดึงข้อศอกลงหาสะโพก อย่าเอนหลังมากเกิน" },
  { name: "Close Grip Pulldown", th: "พูลดาวน์จับแคบ", alias: "ดึงบนมือชิด", equip: ["machine"], pri: ["back"], sec: ["biceps"], pattern: "vertical_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "จับแคบ/หงายมือ เน้นแลทช่วงล่างและไบเซป" },
  { name: "Wide Grip Pull-up", th: "พูลอัพจับกว้าง (ดึงข้อ)", alias: "ดึงข้อ โหนบาร์", equip: ["pullup_bar","bodyweight"], pri: ["back"], sec: ["biceps","forearms"], pattern: "vertical_pull", fatigue: "high", type: "bodyweight", sets: 4, rmin: 1, rmax: 999, amrap: true, tip: "เริ่มจากแขวนสุด ดึงจนคางพ้นบาร์ ลงช้า" },
  { name: "Chin-up", th: "ชินอัพ (ดึงข้อหงายมือ)", alias: "ดึงข้อหงาย", equip: ["pullup_bar","bodyweight"], pri: ["back","biceps"], sec: ["forearms"], pattern: "vertical_pull", fatigue: "high", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, avoid: ["elbow"], tip: "หงายมือ ได้ไบเซปเยอะกว่าพูลอัพ" },
  { name: "Neutral Grip Pull-up", th: "ดึงข้อมือหันเข้า", alias: "พูลอัพนิวทรัล", equip: ["pullup_bar","bodyweight"], pri: ["back"], sec: ["biceps","forearms"], pattern: "vertical_pull", fatigue: "high", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, tip: "ฝ่ามือหันเข้าหากัน เป็นมิตรกับข้อไหล่ที่สุด" },
  { name: "Australian Row", th: "โรว์นอน (ดึงตัวใต้บาร์)", alias: "อินเวอร์เต็ดโรว์", equip: ["pullup_bar","bodyweight"], pri: ["back"], sec: ["biceps","rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, tip: "ท่าเริ่มต้นก่อนไปพูลอัพ ยิ่งตัวขนานพื้นยิ่งหนัก" },
  { name: "Straight Arm Pulldown", th: "ดึงแขนตรง", alias: "พูลดาวน์แขนตรง", equip: ["cable"], pri: ["back"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แขนตรงตลอด เน้นแลทล้วน ไม่ใช้ไบเซป" },
  { name: "Dumbbell Pullover", th: "พูลโอเวอร์", alias: "ยกดัมเบลข้ามหัว", equip: ["dumbbell","bench"], pri: ["back"], sec: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, avoid: ["shoulder"], tip: "ยืดซี่โครงและแลท ควบคุมช่วงลงหลังศีรษะ" },
  { name: "Barbell Shrug", th: "ชรักบาร์เบล (ยักไหล่)", alias: "ยักไหล่ ทราพีเซียส", equip: ["barbell"], pri: ["back"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ยักตรงขึ้น ค้าง 1 วิ ไม่ต้องหมุนไหล่" },
  { name: "Dumbbell Shrug", th: "ชรักดัมเบล", alias: "ยักไหล่ดัมเบล", equip: ["dumbbell"], pri: ["back"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 20, tip: "ช่วงเคลื่อนไหวอิสระกว่าบาร์ ยักให้สุด" },

  // ══════════ ไหล่ ══════════
  { name: "Overhead Press", th: "โอเวอร์เฮดเพรส (ดันบ่า)", alias: "ดันบาร์เหนือหัว มิลิทารีเพรส", equip: ["barbell","rack"], pri: ["front_delts"], sec: ["triceps","side_delts","core"], pattern: "vertical_push", fatigue: "high", type: "weight", sets: 4, rmin: 5, rmax: 8, avoid: ["shoulder"], tip: "เกร็งก้นและท้อง ดันขึ้นตรงหัว หลังไม่แอ่น" },
  { name: "Overhead Press (DB)", th: "ดันไหล่ดัมเบล", alias: "ดันดัมเบลเหนือหัว", equip: ["dumbbell"], pri: ["front_delts"], sec: ["triceps","side_delts"], pattern: "vertical_push", fatigue: "high", type: "weight", sets: 3, rmin: 6, rmax: 10, avoid: ["shoulder"], tip: "ช่วงเคลื่อนไหวอิสระกว่าบาร์ เหมาะกับคนไหล่ติด" },
  { name: "Arnold Press", th: "อาร์โนลด์เพรส", alias: "ดันไหล่หมุนข้อมือ", equip: ["dumbbell"], pri: ["front_delts","side_delts"], sec: ["triceps"], pattern: "vertical_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["shoulder"], tip: "หมุนข้อมือระหว่างดัน โดนไหล่ทั้งหน้าและกลาง" },
  { name: "Push Press", th: "พุชเพรส (ใช้ขาช่วย)", alias: "ดันบ่าใช้ขา", equip: ["barbell","rack"], pri: ["front_delts"], sec: ["triceps","quads"], pattern: "vertical_push", fatigue: "high", type: "weight", sets: 3, rmin: 5, rmax: 8, avoid: ["shoulder"], tip: "ย่อเข่าเล็กน้อยแล้วระเบิดขึ้น ใช้น้ำหนักมากกว่าเพรสปกติได้" },
  { name: "Lateral Raise", th: "กางข้าง (ไหล่กลาง)", alias: "ยกข้าง ไซด์เรส", equip: ["dumbbell"], pri: ["side_delts"], pattern: "isolation", fatigue: "low", type: "weight", sets: 4, rmin: 12, rmax: 20, tip: "ยกแค่ระดับไหล่ เอียงนิ้วก้อยขึ้นนิด ใช้น้ำหนักเบาแต่คุมให้นิ่ง" },
  { name: "Cable Lateral Raise", th: "กางข้างเคเบิล", alias: "ยกข้างสาย", equip: ["cable"], pri: ["side_delts"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แรงตึงคงที่ตลอดช่วง ดีกว่าดัมเบลตรงช่วงล่าง" },
  { name: "Machine Lateral Raise", th: "เครื่องกางไหล่", alias: "ไหล่กลางเครื่อง", equip: ["machine"], pri: ["side_delts"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "คุมฟอร์มง่าย เหมาะเล่นหนักตอนล้าแล้ว" },
  { name: "Front Raise", th: "ยกหน้า (ไหล่หน้า)", alias: "ฟรอนต์เรส", equip: ["dumbbell"], pri: ["front_delts"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ไหล่หน้ามักได้พอแล้วจากท่าดันอก ไม่ต้องเล่นเยอะ" },
  { name: "Face Pull", th: "เฟซพูล (ดึงเข้าหน้า)", alias: "ดึงหน้า ไหล่หลัง", equip: ["cable"], pri: ["rear_delts"], sec: ["back"], pattern: "horizontal_pull", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "ดึงเข้าหาหน้าผาก กางศอกออก แก้ไหล่ห่อได้ดีมาก" },
  { name: "Rear Delt Fly", th: "กางหลัง (ไหล่หลัง)", alias: "รีเวิร์สฟลาย ไหล่หลัง", equip: ["dumbbell"], pri: ["rear_delts"], sec: ["back"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "โน้มตัวขนานพื้น ยกออกข้าง ไม่ใช่ขึ้นบน" },
  { name: "Reverse Pec Deck", th: "เครื่องกางหลัง", alias: "เพคเดคกลับด้าน ไหล่หลังเครื่อง", equip: ["machine"], pri: ["rear_delts"], sec: ["back"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "นั่งกลับด้านกับท่าหนีบอก เน้นไหล่หลังล้วน" },
  { name: "Upright Row", th: "อัพไรท์โรว์ (ดึงตั้ง)", alias: "ดึงบาร์ขึ้นตรง", equip: ["barbell"], pri: ["side_delts"], sec: ["back","biceps"], pattern: "isolation", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["shoulder"], tip: "จับกว้างหน่อยลดการบีบข้อไหล่ ดึงแค่ระดับอก" },
  { name: "Shoulder Press Machine", th: "เครื่องดันไหล่", alias: "ไหล่เครื่อง", equip: ["machine"], pri: ["front_delts"], sec: ["triceps"], pattern: "vertical_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "ปรับเบาะให้มือจับระดับหู ปลอดภัยเมื่อเล่นหนักคนเดียว" },
  { name: "Pike Push-up", th: "วิดพื้นก้นโด่ง", alias: "ไพค์ วิดพื้นไหล่", equip: ["bodyweight"], pri: ["front_delts"], sec: ["triceps"], pattern: "vertical_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 8, rmax: 15, avoid: ["wrist","shoulder"], tip: "ยกก้นสูง ศีรษะลงระหว่างมือ — ท่าไหล่แบบไม่ใช้อุปกรณ์" },

  // ══════════ ไบเซป ══════════
  { name: "Barbell Curl", th: "ม้วนบาร์เบล", alias: "เคิร์ลบาร์ ม้วนแขน", equip: ["barbell"], pri: ["biceps"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["wrist","elbow"], tip: "ข้อศอกแนบลำตัว ห้ามเหวี่ยงหลัง" },
  { name: "EZ Bar Curl", th: "ม้วนบาร์หยัก", alias: "อีซี่บาร์", equip: ["barbell"], pri: ["biceps"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "บาร์หยักลดแรงบิดข้อมือ เหมาะคนข้อมือเจ็บจากบาร์ตรง" },
  { name: "Dumbbell Curl", th: "ม้วนดัมเบล", alias: "เคิร์ลดัมเบล", equip: ["dumbbell"], pri: ["biceps"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "หงายข้อมือตอนขึ้นสุด บีบไบเซปค้าง" },
  { name: "Incline DB Curl", th: "ม้วนเอียง (ยืดไบเซป)", alias: "อินไคลน์เคิร์ล", equip: ["dumbbell","bench"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "เบาะเอียง 45° แขนห้อยหลังลำตัว = ยืดไบเซปสุด" },
  { name: "Hammer Curl", th: "ม้วนค้อน", alias: "แฮมเมอร์เคิร์ล", equip: ["dumbbell"], pri: ["biceps","forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "จับแนวตั้งเหมือนถือค้อน โดนแขนท่อนล่างด้วย" },
  { name: "Preacher Curl", th: "ม้วนพาดเบาะ", alias: "พรีชเชอร์", equip: ["barbell","bench"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["elbow"], tip: "แขนพาดเบาะตลอด ตัดการโกง เน้นช่วงล่าง" },
  { name: "Cable Curl", th: "ม้วนเคเบิล", alias: "เคิร์ลสาย", equip: ["cable"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แรงตึงไม่หายตอนขึ้นสุด เหมาะปิดท้าย" },
  { name: "Concentration Curl", th: "ม้วนพาดเข่า", alias: "คอนเซนเทรชั่น", equip: ["dumbbell"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ศอกยันต้นขา บีบสุดตอนบน เน้นพีคไบเซป" },
  { name: "Spider Curl", th: "ม้วนคว่ำหน้า", alias: "สไปเดอร์เคิร์ล", equip: ["dumbbell","bench"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "นอนคว่ำบนเบาะเอียง แขนห้อยตรง ตัดการโกงหมด" },
  { name: "Machine Curl", th: "เครื่องม้วนแขน", alias: "เคิร์ลเครื่อง", equip: ["machine"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "คุมฟอร์มง่าย ดันถึงจุดล้าได้ปลอดภัย" },

  // ══════════ ไตรเซป ══════════
  { name: "Close Grip Bench Press", th: "เบนช์จับแคบ", alias: "โคลสกริป ดันแคบ", equip: ["barbell","bench","rack"], pri: ["triceps"], sec: ["chest","front_delts"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 3, rmin: 6, rmax: 10, avoid: ["elbow"], tip: "จับกว้างเท่าไหล่ ศอกแนบลำตัว — ท่าไตรเซปที่ยกหนักได้สุด" },
  { name: "Tricep Pushdown", th: "กดไตรเซป", alias: "พุชดาวน์ กดสาย", equip: ["cable"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "ศอกล็อกข้างลำตัว เหยียดสุดแล้วบีบ 1 วิ" },
  { name: "Rope Pushdown", th: "กดไตรเซปด้วยเชือก", alias: "พุชดาวน์เชือก", equip: ["cable"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "กางเชือกออกตอนล่างสุด บีบไตรเซปให้สุด" },
  { name: "Overhead Tricep Extension", th: "เหยียดไตรเซปเหนือหัว", alias: "เอ็กซ์เทนชั่นเหนือหัว", equip: ["dumbbell"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["elbow"], tip: "แขนอยู่เหนือหัว = ยืดหัวยาวของไตรเซปสุด" },
  { name: "Cable Overhead Extension", th: "เหยียดไตรเซปเคเบิลเหนือหัว", alias: "โอเวอร์เฮดเคเบิล", equip: ["cable"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "แรงตึงคงที่ในช่วงยืด ดีกว่าดัมเบล" },
  { name: "Skull Crusher", th: "สกัลครัชเชอร์", alias: "ไลอิ้งเอ็กซ์เทนชั่น", equip: ["barbell","bench"], pri: ["triceps"], pattern: "isolation", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["elbow"], tip: "ลดบาร์ลงหลังหน้าผาก ไม่ใช่ที่จมูก ศอกนิ่ง" },
  { name: "Tricep Kickback", th: "คิกแบ็ก (เตะหลัง)", alias: "เตะไตรเซป", equip: ["dumbbell"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ต้นแขนขนานพื้นนิ่ง เหยียดแค่ข้อศอก" },
  { name: "Machine Tricep Extension", th: "เครื่องเหยียดไตรเซป", alias: "ไตรเซปเครื่อง", equip: ["machine"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "เหมาะดันถึงจุดล้าโดยไม่ต้องกลัวฟอร์มพัง" },
  { name: "Diamond Push-up", th: "วิดพื้นมือชิด (เพชร)", alias: "ไดมอนด์ วิดพื้นไตรเซป", equip: ["bodyweight"], pri: ["triceps"], sec: ["chest"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 8, rmax: 20, avoid: ["wrist","elbow"], tip: "มือชิดเป็นสามเหลี่ยม ศอกแนบตัว" },
  { name: "Bench Dip", th: "ดิปเก้าอี้", alias: "ยันเก้าอี้", equip: ["bench","bodyweight"], pri: ["triceps"], sec: ["front_delts"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 20, avoid: ["shoulder"], tip: "มือวางขอบเบาะ ลงจนศอก 90° อย่าลงลึกจนไหล่เจ็บ" },

  // ══════════ ต้นขาหน้า ══════════
  { name: "Barbell Squat", th: "สควอทบาร์เบล", alias: "แบกบาร์ย่อ สควอทหลัง", equip: ["barbell","rack"], pri: ["quads"], sec: ["glutes","hamstrings","core"], pattern: "squat", fatigue: "high", type: "weight", sets: 4, rmin: 5, rmax: 8, avoid: ["lower_back","knee"], tip: "เท้ากว้างเท่าไหล่ ย่อจนต้นขาขนานพื้น เข่าไปทางปลายเท้า" },
  { name: "Front Squat", th: "ฟรอนต์สควอท (แบกหน้า)", alias: "สควอทหน้า", equip: ["barbell","rack"], pri: ["quads"], sec: ["glutes","core"], pattern: "squat", fatigue: "high", type: "weight", sets: 3, rmin: 6, rmax: 10, avoid: ["wrist","knee"], tip: "บาร์วางหน้าไหล่ ศอกชี้ขึ้น ลำตัวตั้งตรงกว่าสควอทหลัง" },
  { name: "Box Squat", th: "สควอทนั่งกล่อง", alias: "บ็อกซ์สควอท", equip: ["barbell","rack","bench"], pri: ["quads"], sec: ["glutes"], pattern: "squat", fatigue: "high", type: "weight", sets: 3, rmin: 5, rmax: 8, avoid: ["lower_back"], tip: "นั่งแตะกล่องแล้วดันขึ้น ฝึกความลึกให้สม่ำเสมอ" },
  { name: "Smith Machine Squat", th: "สควอทสมิธแมชชีน", alias: "สควอทเครื่อง", equip: ["machine"], pri: ["quads"], sec: ["glutes"], pattern: "squat", fatigue: "high", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["knee"], tip: "บาร์วิ่งในราง ทรงตัวง่าย เหมาะเล่นหนักคนเดียว" },
  { name: "Leg Press", th: "เลกเพรส (เครื่องดันขา)", alias: "ดันขา", equip: ["machine"], pri: ["quads"], sec: ["glutes"], pattern: "squat", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 15, avoid: ["knee"], tip: "อย่าเหยียดเข่าล็อกสุด หลังล่างแนบเบาะตลอด" },
  { name: "Hack Squat", th: "แฮคสควอท", alias: "สควอทเครื่องเอียง", equip: ["machine"], pri: ["quads"], sec: ["glutes"], pattern: "squat", fatigue: "high", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["knee"], tip: "เน้นต้นขาหน้าหนักกว่าสควอทปกติ ลงลึกได้ปลอดภัย" },
  { name: "Bulgarian Split Squat", th: "บัลแกเรียนสควอท (ขาเดียว)", alias: "ย่อขาเดียวเท้าหลังสูง", equip: ["bodyweight","bench"], pri: ["quads","glutes"], sec: ["hamstrings"], pattern: "lunge", fatigue: "high", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, avoid: ["knee"], tip: "เท้าหลังวางสูง ลงตรงๆ — โหดกว่าที่คิด เริ่มจากน้ำหนักตัวก่อน" },
  { name: "Walking Lunge", th: "ลันจ์เดิน", alias: "เดินย่อขา", equip: ["dumbbell"], pri: ["quads","glutes"], sec: ["hamstrings"], pattern: "lunge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["knee"], tip: "ก้าวยาวพอให้เข่าหน้าไม่เลยปลายเท้า ลำตัวตั้งตรง" },
  { name: "Reverse Lunge", th: "ลันจ์ถอยหลัง", alias: "ย่อถอยหลัง", equip: ["dumbbell"], pri: ["quads","glutes"], pattern: "lunge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "ก้าวถอยหลัง เป็นมิตรกับเข่ากว่าลันจ์เดินหน้า" },
  { name: "Goblet Squat", th: "ก็อบเลตสควอท (อุ้มดัมเบล)", alias: "สควอทอุ้มหน้าอก", equip: ["dumbbell"], pri: ["quads"], sec: ["glutes","core"], pattern: "squat", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "อุ้มดัมเบลหน้าอก เหมาะฝึกฟอร์มสควอทให้ถูกก่อนใช้บาร์" },
  { name: "Step-up", th: "สเต็ปอัพ (ก้าวขึ้นกล่อง)", alias: "ก้าวขึ้นม้า", equip: ["dumbbell","bench"], pri: ["quads","glutes"], pattern: "lunge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "ดันด้วยส้นเท้าขาบน อย่าถีบขาล่างช่วย" },
  { name: "Leg Extension", th: "เลกเอ็กซ์เทนชั่น (เหยียดขา)", alias: "เหยียดเข่าเครื่อง", equip: ["machine"], pri: ["quads"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, avoid: ["knee"], tip: "ท่า isolation ปิดท้าย บีบค้างตอนเหยียดสุด 1 วิ" },
  { name: "Sissy Squat", th: "ซิสซี่สควอท", alias: "สควอทเอนหลัง", equip: ["bodyweight"], pri: ["quads"], pattern: "isolation", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, avoid: ["knee"], tip: "เอนตัวไปหลังพร้อมย่อ ยืดต้นขาหน้าสุด ใช้มือจับที่ยึดช่วย" },
  { name: "Wall Sit", th: "นั่งพิงกำแพง", alias: "วอลล์ซิท", equip: ["bodyweight"], pri: ["quads"], pattern: "isolation", fatigue: "low", type: "time", sets: 3, rmin: 30, rmax: 60, tip: "ต้นขาขนานพื้น ค้างไว้ — ฝึกความทนของต้นขาหน้า" },

  // ══════════ หลังขา / ก้น ══════════
  { name: "Romanian Deadlift", th: "อาร์ดีแอล (เดดขาตึง)", alias: "หลังขา บานพับสะโพก", equip: ["barbell"], pri: ["hamstrings","glutes"], sec: ["back"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["lower_back"], tip: "ดันสะโพกไปหลัง เข่างอนิดเดียว รู้สึกตึงหลังขา อย่าย่อเป็นสควอท" },
  { name: "Stiff Leg Deadlift", th: "เดดขาเหยียด", alias: "สติฟเลก", equip: ["barbell"], pri: ["hamstrings"], sec: ["glutes","back"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["lower_back"], tip: "ขาตรงกว่า RDL ยืดหลังขาสุด ใช้น้ำหนักเบากว่า" },
  { name: "Dumbbell RDL", th: "อาร์ดีแอลดัมเบล", alias: "เดดขาตึงดัมเบล หลังขา", equip: ["dumbbell"], pri: ["hamstrings","glutes"], pattern: "hip_hinge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 15, avoid: ["lower_back"], tip: "เวอร์ชันเบากว่าบาร์เบล เหมาะเล่นที่บ้าน" },
  { name: "Barbell Hip Thrust", th: "ฮิปทรัส (ดันสะโพก)", alias: "ดันก้น สะโพก", equip: ["barbell","bench"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "สะบักพาดเบาะ ดันจนลำตัวขนานพื้น บีบก้นค้าง 1 วิ" },
  { name: "Dumbbell Hip Thrust", th: "ฮิปทรัสดัมเบล", alias: "ดันสะโพกดัมเบล", equip: ["dumbbell","bench"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "วางดัมเบลบนสะโพก เวอร์ชันเบากว่าบาร์เบล" },
  { name: "Lying Leg Curl", th: "เลกเคิร์ลนอน (งอขา)", alias: "งอขานอน หลังขาเครื่อง", equip: ["machine"], pri: ["hamstrings"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "ควบคุมขากลับช้าๆ ช่วงลงสำคัญกว่าช่วงงอ" },
  { name: "Seated Leg Curl", th: "เลกเคิร์ลนั่ง", alias: "งอขานั่ง", equip: ["machine"], pri: ["hamstrings"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "งานวิจัยชี้ว่าโดนหลังขาดีกว่าท่านอนเล็กน้อย" },
  { name: "Good Morning", th: "กู้ดมอร์นิ่ง", alias: "ก้มแบกบาร์", equip: ["barbell","rack"], pri: ["hamstrings"], sec: ["glutes","back"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["lower_back"], tip: "ใช้น้ำหนักเบา หลังตรงตลอด เน้นบานพับสะโพก" },
  { name: "Glute Bridge", th: "สะพานก้น", alias: "ยกสะโพกพื้น", equip: ["bodyweight"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "low", type: "bodyweight", sets: 3, rmin: 15, rmax: 20, tip: "เวอร์ชันพื้นของฮิปทรัส บีบก้นสุดด้านบน" },
  { name: "Single Leg Glute Bridge", th: "สะพานก้นขาเดียว", alias: "ยกสะโพกขาเดียว", equip: ["bodyweight"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "low", type: "bodyweight", sets: 3, rmin: 12, rmax: 15, tip: "ทำทีละข้าง แก้ก้นข้างที่อ่อนกว่า" },
  { name: "Nordic Curl", th: "นอร์ดิกเคิร์ล", alias: "ล้มหน้าเข่าคุก", equip: ["bodyweight"], pri: ["hamstrings"], pattern: "isolation", fatigue: "high", type: "bodyweight", sets: 3, rmin: 5, rmax: 10, avoid: ["knee"], tip: "โคตรหนัก ใช้มือช่วยรับตอนลง ป้องกันหลังขาฉีกได้ดีมาก" },
  { name: "Back Extension", th: "แบ็กเอ็กซ์เทนชั่น (หลังล่าง)", alias: "ไฮเปอร์เอ็กซ์เทนชั่น", equip: ["other","bodyweight"], pri: ["glutes","hamstrings"], sec: ["back"], pattern: "hip_hinge", fatigue: "low", type: "bodyweight", sets: 3, rmin: 12, rmax: 15, avoid: ["lower_back"], tip: "ขึ้นแค่ลำตัวตรง อย่าแอ่นเกิน" },
  { name: "Cable Pull Through", th: "พูลทรูเคเบิล", alias: "ดึงสายลอดขา", equip: ["cable"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ฝึกบานพับสะโพกได้ดี แรงตึงคงที่ ปลอดภัยกับหลัง" },
  { name: "Cable Kickback", th: "เตะก้นเคเบิล", alias: "กลูทคิกแบ็ก", equip: ["cable"], pri: ["glutes"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "เตะไปหลังพร้อมบีบก้น ลำตัวนิ่ง อย่าแอ่นหลัง" },
  { name: "Hip Abduction Machine", th: "เครื่องกางสะโพก", alias: "กางขาเครื่อง ก้นข้าง", equip: ["machine"], pri: ["glutes"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "โน้มตัวไปหน้าเล็กน้อยจะโดนก้นด้านข้างมากขึ้น" },

  // ══════════ น่อง ══════════
  { name: "Standing Calf Raise", th: "เขย่งน่องยืน", alias: "ยกส้นยืน", equip: ["machine"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "weight", sets: 4, rmin: 12, rmax: 20, tip: "ลงให้ส้นต่ำสุด ขึ้นสุด ค้างบน 1 วิ — น่องต้องการช่วงยืดเต็ม" },
  { name: "Seated Calf Raise", th: "เขย่งน่องนั่ง", alias: "ยกส้นนั่ง", equip: ["machine"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "เข่างอ = เน้นน่องมัดล่าง (soleus) ควรมีคู่กับท่ายืน" },
  { name: "Leg Press Calf Raise", th: "เขย่งน่องบนเลกเพรส", alias: "ดันน่องเครื่อง", equip: ["machine"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "ใช้เครื่องเลกเพรส ดันด้วยปลายเท้า เข่าเหยียดเกือบตรง" },
  { name: "Calf Raise", th: "เขย่งน่อง (น้ำหนักตัว)", alias: "ยกส้นเท้า", equip: ["bodyweight"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "bodyweight", sets: 4, rmin: 15, rmax: 25, tip: "ยืนขอบขั้นบันไดให้ส้นห้อย เพิ่มช่วงยืด" },
  { name: "Single Leg Calf Raise", th: "เขย่งน่องขาเดียว", alias: "ยกส้นขาเดียว", equip: ["bodyweight"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "bodyweight", sets: 3, rmin: 12, rmax: 20, tip: "ทีละข้างหนักกว่าเท่าตัว แก้น่องสองข้างไม่เท่ากัน" },

  // ══════════ แกนกลาง ══════════
  { name: "Plank", th: "แพลงก์ (ไม้กระดาน)", alias: "ท่าแพลงค์", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "time", sets: 3, rmin: 30, rmax: 60, tip: "ลำตัวเป็นเส้นตรง เกร็งก้นและท้อง อย่าให้สะโพกตกหรือโด่ง" },
  { name: "Side Plank", th: "แพลงก์ข้าง", alias: "แพลงค์ตะแคง", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "time", sets: 3, rmin: 20, rmax: 45, tip: "เน้นข้างลำตัว ทำทั้งสองข้างเท่ากัน" },
  { name: "Hollow Body Hold", th: "ฮอลโลว์โฮลด์", alias: "ค้างตัวเรือ", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "time", sets: 3, rmin: 20, rmax: 45, tip: "หลังล่างแนบพื้นตลอด ยกไหล่และขาพ้นพื้น" },
  { name: "Hanging Knee Raise", th: "ห้อยยกเข่า", alias: "โหนบาร์ยกเข่า", equip: ["pullup_bar","bodyweight"], pri: ["core"], sec: ["forearms"], pattern: "core", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, tip: "ม้วนสะโพกขึ้นด้วย ไม่ใช่แค่ยกเข่า อย่าแกว่ง" },
  { name: "Hanging Leg Raise", th: "ห้อยยกขาตรง", alias: "โหนบาร์ยกขา", equip: ["pullup_bar","bodyweight"], pri: ["core"], sec: ["forearms"], pattern: "core", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 8, rmax: 15, tip: "เวอร์ชันยากของยกเข่า ขาตรงตลอด" },
  { name: "Toes to Bar", th: "ยกเท้าแตะบาร์", alias: "ทูสทูบาร์", equip: ["pullup_bar","bodyweight"], pri: ["core"], sec: ["forearms","back"], pattern: "core", fatigue: "high", type: "bodyweight", sets: 3, rmin: 5, rmax: 12, tip: "ขั้นสูงสุดของยกขา ต้องมีแรงบีบมือและแกนกลางแข็งแรง" },
  { name: "Lying Leg Raise", th: "นอนยกขา", alias: "ยกขาพื้น", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 12, rmax: 20, avoid: ["lower_back"], tip: "มือสอดใต้ก้น หลังล่างแนบพื้น ลงช้าอย่าให้ขาแตะพื้น" },
  { name: "Cable Crunch", th: "เคเบิลครันช์ (ม้วนท้อง)", alias: "ม้วนท้องเคเบิล", equip: ["cable"], pri: ["core"], pattern: "core", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ม้วนกระดูกสันหลังลง ไม่ใช่ก้มสะโพก — ท้องเพิ่มน้ำหนักได้เหมือนกล้ามอื่น" },
  { name: "Crunch", th: "ครันช์ (ม้วนท้อง)", alias: "ซิทอัพ ลุกนั่ง", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 15, rmax: 25, tip: "ยกแค่สะบักพ้นพื้น ไม่ต้องขึ้นสุด อย่าดึงคอ" },
  { name: "Bicycle Crunch", th: "ปั่นจักรยานอากาศ", alias: "ครันช์บิดตัว", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 20, rmax: 30, tip: "ศอกแตะเข่าฝั่งตรงข้าม ช้าๆ ให้รู้สึกท้องข้าง" },
  { name: "Russian Twist", th: "รัสเซียนทวิสต์ (บิดตัว)", alias: "บิดเอว", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 20, rmax: 30, avoid: ["lower_back"], tip: "บิดจากลำตัว ไม่ใช่แค่แกว่งแขน" },
  { name: "Ab Wheel Rollout", th: "ล้อหน้าท้อง", alias: "แอบวีล ลูกกลิ้ง", equip: ["other"], pri: ["core"], pattern: "core", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 8, rmax: 12, avoid: ["lower_back"], tip: "เกร็งท้องห้ามให้หลังแอ่น เริ่มจากคุกเข่าระยะสั้นก่อน" },
  { name: "Dead Bug", th: "เดดบัก", alias: "แมลงตาย", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, tip: "หลังล่างแนบพื้นตลอด ปลอดภัยกับหลัง เหมาะคนเริ่มต้น" },
  { name: "Mountain Climber", th: "ไต่เขา", alias: "เมาน์เทนไคลม์เบอร์", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "moderate", type: "time", sets: 3, rmin: 30, rmax: 45, avoid: ["wrist"], tip: "สะโพกนิ่ง สลับเข่าเข้าอก เร็วแต่คุมฟอร์ม" },
  { name: "Pallof Press", th: "พาลอฟเพรส (ต้านบิด)", alias: "ดันต้านแรงบิด", equip: ["cable"], pri: ["core"], pattern: "core", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "ยืนข้างเคเบิล ดันออกหน้าโดยไม่ให้ลำตัวบิด — ฝึกความมั่นคง" },

  // ══════════ ปลายแขน ══════════
  { name: "Wrist Curl (DB)", th: "ม้วนข้อมือ", alias: "ริสต์เคิร์ล", equip: ["dumbbell"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, avoid: ["wrist"], tip: "พาดแขนบนเข่า ปล่อยข้อมือลงสุดแล้วม้วนขึ้น" },
  { name: "Reverse Wrist Curl (DB)", th: "ม้วนข้อมือคว่ำ", alias: "ริสต์เคิร์ลกลับ", equip: ["dumbbell"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, avoid: ["wrist"], tip: "คว่ำมือ เน้นด้านบนปลายแขน ใช้น้ำหนักเบามาก" },
  { name: "Reverse Curl", th: "ม้วนคว่ำมือ", alias: "รีเวิร์สเคิร์ล", equip: ["barbell"], pri: ["forearms"], sec: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "คว่ำมือม้วนขึ้น โดนปลายแขนด้านบนและไบเซปมัดล่าง" },
  { name: "Pronation Curl", th: "ม้วนบิดข้อมือ", alias: "โปรเนชั่น", equip: ["dumbbell"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["wrist"], tip: "บิดข้อมือคว่ำ-หงายทวนแรง เสริมกล้ามหมุนปลายแขน" },
  { name: "Farmer's Walk", th: "ฟาร์เมอร์วอล์ก (หิ้วเดิน)", alias: "หิ้วดัมเบลเดิน", equip: ["dumbbell"], pri: ["forearms"], sec: ["core","back"], pattern: "isolation", fatigue: "moderate", type: "time", sets: 3, rmin: 30, rmax: 60, tip: "หิ้วหนักเดิน ไหล่ตั้ง — สร้างแรงบีบมือและแกนกลางไปพร้อมกัน" },
  { name: "Dead Hang", th: "ห้อยบาร์", alias: "โหนบาร์ค้าง", equip: ["pullup_bar","bodyweight"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "time", sets: 3, rmin: 20, rmax: 60, tip: "ห้อยนิ่งๆ สร้างแรงบีบและยืดหัวไหล่" },
  { name: "Towel Pull-up", th: "ดึงข้อผ้าขนหนู", alias: "โหนผ้า", equip: ["pullup_bar","bodyweight"], pri: ["forearms","back"], sec: ["biceps"], pattern: "vertical_pull", fatigue: "high", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, tip: "พาดผ้าบนบาร์แล้วจับ — แรงบีบโหดกว่าจับบาร์มาก" },
  { name: "Wrist Isometric Hold", th: "เกร็งข้อมือค้าง", alias: "ค้างข้อมือ", equip: ["dumbbell"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "time", sets: 3, rmin: 20, rmax: 30, avoid: ["wrist"], tip: "ถือค้างในมุมที่อ่อนแรง ฝึกความทนของข้อมือ" },
];

// ── ค่าเริ่มต้นตามอุปกรณ์ ──
// ดัมเบลนับน้ำหนักต่อข้าง (ถือข้างละอัน) ที่เหลือนับน้ำหนักรวม
export function unitFor(t: ExTemplate): string | undefined {
  if (t.type === "time") return "วิ";
  if (t.type === "bodyweight") return undefined;
  return t.equip.includes("dumbbell") ? "kg/ข้าง" : "kg";
}

// ระยะขยับน้ำหนักที่เล็กที่สุดที่ทำได้จริงกับอุปกรณ์นั้น
export function incFor(t: ExTemplate): number | undefined {
  if (t.type !== "weight") return undefined;
  if (t.equip.includes("dumbbell")) return 1; // ดัมเบลไทยมักขยับทีละ 1-2 kg ต่อข้าง
  if (t.equip.includes("machine") || t.equip.includes("cable")) return 5; // แผ่นเครื่องมักล็อกที่ 5
  if (t.equip.includes("band")) return 1;
  return 2.5; // บาร์เบล = แผ่นเล็กสุดข้างละ 1.25
}

// ท่าที่ใช้เครื่อง/เคเบิล — น้ำหนักรวม ไม่ใช่ต่อข้าง และไม่ต้อง warm-up ramp แบบฟรีเวท
export const isMachineEx = (t: ExTemplate): boolean => t.equip.includes("machine") || t.equip.includes("cable");

// นับเซตแบบ fractional ตามสเปค: primary 1.0 · secondary 0.5
export function musclesOf(t: ExTemplate): { m: MuscleKey; w: number }[] {
  return [...t.pri.map((m) => ({ m, w: 1 })), ...(t.sec ?? []).map((m) => ({ m, w: 0.5 }))];
}

// คำที่ใช้ค้นได้ทั้งหมดของท่านั้น
const searchFields = (t: ExTemplate) => ({
  en: t.name.toLowerCase(),
  th: t.th.toLowerCase(),
  alias: (t.alias ?? "").toLowerCase(),
  muscle: t.pri.map((m) => MUSCLE_TH[m] + " " + MUSCLE_ALIAS[m]).join(" ").toLowerCase(),
  equip: t.equip.map((e) => EQUIP_TH[e]).join(" ").toLowerCase(),
});

// ค้นหาท่า — ไทย/อังกฤษ/ชื่อเล่น/กล้ามเนื้อ/อุปกรณ์
// จัดลำดับให้ผลที่ "ตรงใจ" ขึ้นก่อน: ค้น "อก" ต้องได้ท่าอก ไม่ใช่ "บ็อกซ์สควอท"
export function searchExercises(query: string, limit = 60): ExTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISE_DB.slice(0, limit);

  const scored: { t: ExTemplate; score: number }[] = [];
  for (const t of EXERCISE_DB) {
    const f = searchFields(t);
    let score = 0;
    if (f.muscle.includes(q) || f.equip.includes(q)) score = 4;
    else if (f.en.startsWith(q) || f.th.startsWith(q)) score = 3;
    else if (f.en.includes(q) || f.th.includes(q)) score = 2;
    else if (f.alias.includes(q)) score = 1;
    if (score) scored.push({ t, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.t.name.localeCompare(b.t.name))
    .slice(0, limit)
    .map((s) => s.t);
}

export const findTemplate = (name: string): ExTemplate | undefined =>
  EXERCISE_DB.find((t) => t.name.toLowerCase() === name.trim().toLowerCase());

export const EXERCISE_COUNT = EXERCISE_DB.length;
