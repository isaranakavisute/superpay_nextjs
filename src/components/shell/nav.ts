import {
  BookOpen,
  ArrowUp,
  Bell,
  Copy,
  CreditCard,
  Download,
  FileText,
  Inbox,
  Landmark,
  LayoutDashboard,
  Link,
  Megaphone,
  MessageSquare,
  type LucideIcon,
  QrCode,
  Radio,
  Repeat,
  Settings,
  Shield,
  Smartphone,
  User,
  Users,
  Webhook,
} from "lucide-react";

export type NavItem = { key: string; label: string; href: string; icon: LucideIcon };
export type NavGroup = { id: string; label: string; items: NavItem[] };

export const TOP_ITEMS: NavItem[] = [
  { key: "dashboard", label: "แดชบอร์ด", href: "/dashboard", icon: LayoutDashboard },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "money",
    label: "เงินเข้า–เงินออก",
    items: [
      { key: "payments", label: "รายการชำระเงิน", href: "/payments", icon: CreditCard },
      { key: "outflows", label: "รายการเงินออก", href: "/outflows", icon: ArrowUp },
      { key: "withdrawals", label: "คำขอถอน", href: "/withdrawals", icon: Download },
      { key: "p2p", label: "จับคู่ P2P", href: "/p2p", icon: Repeat },
      { key: "double-credits", label: "ตรวจเติมเงินซ้ำ", href: "/double-credits", icon: Copy },
      { key: "accounts", label: "บัญชีธนาคาร", href: "/accounts", icon: Landmark },
    ],
  },
  {
    id: "merchants",
    label: "ร้านค้า",
    items: [
      { key: "merchants", label: "Merchants", href: "/merchants", icon: Shield },
      { key: "merchant-dashboard", label: "แดชบอร์ดร้านค้า", href: "/merchant-dashboard", icon: LayoutDashboard },
      { key: "webhooks", label: "Webhook ร้านค้า", href: "/webhooks", icon: Webhook },
      { key: "api-docs", label: "API Docs", href: "/api-docs", icon: Link },
    ],
  },
  {
    id: "channels",
    label: "ช่องทางรับข้อมูล",
    items: [
      { key: "channels", label: "ช่องทางตรวจสอบ", href: "/channels", icon: Radio },
      { key: "events", label: "กล่องรับ Event", href: "/events", icon: Inbox },
      { key: "devices", label: "อุปกรณ์ Forwarder", href: "/devices", icon: Smartphone },
      { key: "qr-demo", label: "ตัวอย่าง QR + สลิป", href: "/qr-demo", icon: QrCode },
    ],
  },
  {
    id: "system",
    label: "ตั้งค่าระบบ",
    items: [
      { key: "settings", label: "ตั้งค่าระบบ", href: "/settings", icon: Settings },
      { key: "alerts", label: "แจ้งเตือน Telegram", href: "/alerts", icon: Bell },
      { key: "support-bot", label: "บอทตอบคำถาม", href: "/support-bot", icon: MessageSquare },
      { key: "announcements", label: "ประชาสัมพันธ์", href: "/announcements", icon: Megaphone },
      { key: "roles", label: "สิทธิ์การเข้าถึง", href: "/roles", icon: Shield },
      { key: "users", label: "จัดการผู้ใช้", href: "/users", icon: Users },
      { key: "audit", label: "บันทึกการตรวจสอบ", href: "/audit", icon: FileText },
      { key: "manual", label: "คู่มือผู้ดูแลระบบ", href: "/manual", icon: BookOpen },
    ],
  },
];

/** Shown after the groups, as on the original. */
export const PROFILE_ITEM: NavItem = { key: "profile", label: "โปรไฟล์", href: "/profile", icon: User };
