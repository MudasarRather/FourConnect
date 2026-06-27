// HR Settings — single source of truth for the 19 config domains, the HR
// modules they govern, and the deep-link targets. Consumed by the Governance
// Board (trace energising + module-pad lighting), the SectionRail grouping,
// the ModuleLaunchpad, and every section's "Powers these modules" row.
import {
  LayoutDashboard, Building2, BadgeCheck, Layers, MapPin, BriefcaseBusiness,
  UsersRound, DoorOpen, Calculator, ShieldCheck, Hash, Workflow, BellRing,
  UserPlus, Rocket, GraduationCap, Boxes, Target, History,
  Users, CalendarClock, CalendarDays, Clock, Wallet, ReceiptText, Receipt,
  Plane, FolderArchive, Shapes, Coins, Gauge,
} from 'lucide-vue-next'

// ── Downstream HR modules a setting can power (deep-link targets) ────────────
export const MODULES = {
  employees:      { label: 'Employees',      icon: Users,        to: '/admin/hr/employees/all' },
  recruitment:    { label: 'Recruitment',    icon: UserPlus,     to: '/admin/hr/recruitment/dashboard' },
  onboarding:     { label: 'Onboarding',     icon: Rocket,       to: '/admin/hr/onboarding/dashboard' },
  attendance:     { label: 'Attendance',     icon: CalendarClock,to: '/admin/hr/attendance/dashboard' },
  leave:          { label: 'Leave',          icon: CalendarDays, to: '/admin/hr/leave/dashboard' },
  shifts:         { label: 'Shifts',         icon: Clock,        to: '/admin/hr/shifts/dashboard' },
  payroll:        { label: 'Payroll',        icon: Wallet,       to: '/admin/hr/payroll/dashboard' },
  payslips:       { label: 'Payslips',       icon: ReceiptText,  to: '/admin/hr/payroll/payslips' },
  reimbursements: { label: 'Reimbursements', icon: Receipt,      to: '/admin/hr/reimbursements/dashboard' },
  training:       { label: 'Training',       icon: GraduationCap,to: '/admin/hr/training/dashboard' },
  assets:         { label: 'Assets',         icon: Boxes,        to: '/admin/hr/assets/dashboard' },
  travel:         { label: 'Travel',         icon: Plane,        to: '/admin/hr/travel/dashboard' },
  exit:           { label: 'Exit',           icon: DoorOpen,     to: '/admin/hr/exit/dashboard' },
  documents:      { label: 'Documents',      icon: FolderArchive,to: '/admin/hr/employee-documents/dashboard' },
  performance:    { label: 'Performance',    icon: Gauge,        to: '/admin/hr/performance/dashboard' },
}

// ── The 19 settings domains ─────────────────────────────────────────────────
// kind: dashboard | master | instrument | config | audit
// phase: A (shipped) | B | C (roadmap stub)
export const DOMAINS = [
  { slug: 'dashboard', label: 'Dashboard', eyebrow: 'Governance · Command', group: 'Command',
    accent: '#fbbf24', icon: LayoutDashboard, kind: 'dashboard', phase: 'A', governs: [],
    blurb: 'The governance board — every configuration domain wired to the HR modules it powers.' },

  // Organization structure
  { slug: 'departments', label: 'Departments', eyebrow: 'Organization · Structure', group: 'Organization',
    accent: '#f59e0b', icon: Building2, kind: 'master', phase: 'A',
    governs: ['employees', 'attendance', 'payroll'],
    blurb: 'The org tree — cost centres, hierarchy and department heads.' },
  { slug: 'designations', label: 'Designations', eyebrow: 'Organization · Titles', group: 'Organization',
    accent: '#fb923c', icon: BadgeCheck, kind: 'master', phase: 'A',
    governs: ['employees', 'recruitment'],
    blurb: 'Job titles mapped to grades and reporting lines.' },
  { slug: 'grades', label: 'Grades', eyebrow: 'Organization · Bands', group: 'Organization',
    accent: '#fbbf24', icon: Layers, kind: 'master', phase: 'A',
    governs: ['payroll', 'travel'],
    blurb: 'Pay bands that drive salary ranges and travel eligibility.' },
  { slug: 'work-locations', label: 'Work Locations', eyebrow: 'Organization · Geography', group: 'Organization',
    accent: '#34d399', icon: MapPin, kind: 'master', phase: 'A',
    governs: ['attendance', 'travel'],
    blurb: 'Offices and sites with timezone and weekly-off patterns.' },

  // Workforce taxonomy
  { slug: 'employment-types', label: 'Employment Types', eyebrow: 'Workforce · Engagement', group: 'Workforce',
    accent: '#ea580c', icon: BriefcaseBusiness, kind: 'master', phase: 'A',
    governs: ['employees', 'payroll', 'recruitment'],
    blurb: 'Permanent, contract, intern — the engagement models.' },
  { slug: 'employee-categories', label: 'Employee Categories', eyebrow: 'Workforce · Classification', group: 'Workforce',
    accent: '#d97706', icon: UsersRound, kind: 'master', phase: 'A',
    governs: ['employees', 'payroll', 'exit'],
    blurb: 'Staff classifications that scope leave, payroll and travel.' },
  { slug: 'separation-reasons', label: 'Separation Reasons', eyebrow: 'Workforce · Exit', group: 'Workforce',
    accent: '#b45309', icon: DoorOpen, kind: 'master', phase: 'A',
    governs: ['exit'],
    blurb: 'The vocabulary of why people leave — used by Exit Management.' },

  // Pay & statutory
  { slug: 'payroll-rules', label: 'Payroll Rules', eyebrow: 'Pay & Statutory · Engine', group: 'Pay & Statutory',
    accent: '#f59e0b', icon: Calculator, kind: 'instrument', phase: 'A',
    governs: ['payroll'],
    blurb: 'Cycle, LOP, overtime and settlement formulas the engine reads.' },
  { slug: 'compliance', label: 'Compliance', eyebrow: 'Pay & Statutory · Statute', group: 'Pay & Statutory',
    accent: '#34d399', icon: ShieldCheck, kind: 'instrument', phase: 'A',
    governs: ['payroll', 'payslips'],
    blurb: 'PF, ESI, Professional Tax and TDS — statutory rate tables.' },
  { slug: 'numbering-series', label: 'Numbering Series', eyebrow: 'Pay & Statutory · Sequences', group: 'Pay & Statutory',
    accent: '#d97706', icon: Hash, kind: 'instrument', phase: 'A',
    governs: ['employees', 'recruitment'],
    blurb: 'Auto-generated IDs — EMP-2026-0001, REQ-…, CAN-… formats for Employees & Recruitment.' },

  // Automation
  { slug: 'approval-workflows', label: 'Approval Workflows', eyebrow: 'Automation · Routing', group: 'Automation',
    accent: '#fb923c', icon: Workflow, kind: 'instrument', phase: 'A',
    governs: ['leave', 'travel', 'reimbursements', 'payroll', 'exit'],
    blurb: 'Multi-stage approval chains per module.' },
  { slug: 'notification-rules', label: 'Notification Rules', eyebrow: 'Automation · Alerts', group: 'Automation',
    accent: '#fbbf24', icon: BellRing, kind: 'instrument', phase: 'A',
    governs: ['employees', 'recruitment', 'leave', 'attendance', 'travel', 'reimbursements', 'payroll', 'assets', 'training', 'exit'],
    blurb: 'Which lifecycle events fire which channels, to whom — the org-wide alert matrix.' },

  // Module settings
  { slug: 'recruitment', label: 'Recruitment Settings', eyebrow: 'Modules · Hiring', group: 'Modules',
    accent: '#fb923c', icon: UserPlus, kind: 'config', phase: 'A',
    governs: ['recruitment'],
    blurb: 'Interview stages, candidate statuses and hiring sources.' },
  { slug: 'onboarding', label: 'Onboarding Settings', eyebrow: 'Modules · Joining', group: 'Modules',
    accent: '#34d399', icon: Rocket, kind: 'config', phase: 'A',
    governs: ['onboarding'],
    blurb: 'Joining checklists, document requirements and probation rules.' },
  { slug: 'training', label: 'Training Settings', eyebrow: 'Modules · Learning', group: 'Modules',
    accent: '#f59e0b', icon: GraduationCap, kind: 'config', phase: 'A',
    governs: ['training'],
    blurb: 'Skill levels, training categories and certification types.' },
  { slug: 'asset-categories', label: 'Asset Categories', eyebrow: 'Modules · Assets', group: 'Modules',
    accent: '#d97706', icon: Boxes, kind: 'master', phase: 'A',
    governs: ['assets'],
    blurb: 'The asset taxonomy — depreciation and useful-life per class.' },
  { slug: 'asset-types', label: 'Asset Types', eyebrow: 'Modules · Assets', group: 'Modules',
    accent: '#ea580c', icon: Shapes, kind: 'master', phase: 'A',
    governs: ['assets'],
    blurb: 'The catalog of asset kinds (Laptop, Vehicle… + your own) the register form offers.' },
  { slug: 'appraisal-templates', label: 'Appraisal Templates', eyebrow: 'Modules · Performance', group: 'Modules',
    accent: '#ea580c', icon: Target, kind: 'instrument', phase: 'A',
    governs: ['employees', 'training', 'performance'],
    blurb: 'Rubrics, competencies and rating scales for performance reviews.' },
  { slug: 'merit-policy', label: 'Merit & Increment Policy', eyebrow: 'Modules · Performance', group: 'Modules',
    accent: '#fbbf24', icon: Coins, kind: 'instrument', phase: 'A',
    governs: ['performance', 'payroll'],
    blurb: 'Rating→hike% bands and the merit budget that bound every appraisal increment.' },

  // Governance
  { slug: 'audit-logs', label: 'Audit Logs', eyebrow: 'Governance · Ledger', group: 'Governance',
    accent: '#9ca3af', icon: History, kind: 'audit', phase: 'A',
    governs: [],
    blurb: 'Every settings change, sealed into an immutable ledger.' },
]

export const DOMAIN_BY_SLUG = Object.fromEntries(DOMAINS.map(d => [d.slug, d]))
export const RAIL_GROUP_ORDER = ['Command', 'Organization', 'Workforce', 'Pay & Statutory', 'Automation', 'Modules', 'Governance']

// Modules shown as edge pads on the Governance Board (curated, ordered).
export const BOARD_MODULES = [
  'employees', 'recruitment', 'onboarding', 'attendance', 'leave', 'shifts',
  'payroll', 'payslips', 'reimbursements', 'training', 'assets', 'travel', 'exit',
]
