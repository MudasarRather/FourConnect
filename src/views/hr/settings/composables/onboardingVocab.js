// onboardingVocab.js — single source of truth for the Onboarding module's
// governing vocabularies, mirrored from app/models/hr/onboarding.py +
// the bootstrap (app/utils/hr/onboarding_bootstrap.py).
//
// What is genuinely CONFIGURABLE (DB-backed, edited from this settings page):
//   • Checklist Templates  — POST/PATCH /hr/onboarding/checklist-templates
//                            (bootstrap stamps every ACTIVE template onto each
//                             new hire's checklist; is_active gates seeding)
//   • Welcome-Kit Templates — POST/PATCH /hr/welcome-kit/templates
// Everything else (the 7-stage journey, the 9 document slots, the default
// provisioned accounts, every status machine) is FIXED-IN-CODE — shown here as
// an honest governance blueprint, not editable.
import {
  Hourglass, Stamp, FileText, ScanFace, Boxes, GraduationCap, Rocket,
  Briefcase, Cpu, Building2, IndianRupee, Shield, GitBranch, UserCog,
  IdCard, FileCheck, Image, FilePen, ScrollText, Landmark,
  Server, Mail, Wifi, Clock, MessagesSquare, HardDrive, Ellipsis,
  CircleDot, Package, Truck, PackageCheck, Users,
} from 'lucide-vue-next'

export const TONES = {
  gold: 'var(--set-gold)',
  amber: 'var(--set-amber)',
  orange: 'var(--set-orange)',
  ember: 'var(--set-ember)',
  rust: 'var(--set-rust)',
  emerald: 'var(--set-ok)',
  steel: 'var(--set-unset)',
  red: 'var(--set-conflict)',
}
export const toneColor = (t) => TONES[t] || TONES.gold
const v = (value, label, tone, icon) => ({ value, label, tone, icon })

// ── The launch sequence (the 7-stage journey, matches journey-state order) ────
// Drives the signature Launch-Sequence ascent instrument.
export const STAGES = [
  { key: 'PRE_JOIN', label: 'Pre-Join',   tone: 'gold',    icon: Hourglass },
  { key: 'APPROVAL', label: 'Approvals',  tone: 'amber',   icon: Stamp },
  { key: 'DOCS',     label: 'Documents',  tone: 'amber',   icon: FileText },
  { key: 'IDENTITY', label: 'Identity',   tone: 'orange',  icon: ScanFace },
  { key: 'ASSETS',   label: 'Assets',     tone: 'ember',   icon: Boxes },
  { key: 'TRAINING', label: 'Training',   tone: 'rust',    icon: GraduationCap },
  { key: 'ACTIVE',   label: 'Active',     tone: 'emerald', icon: Rocket },
]

// Checklist categories — used by the template editor's category picker
export const CHECKLIST_CATEGORIES = [
  v('HR', 'HR', 'gold', Briefcase),
  v('IT', 'IT', 'orange', Cpu),
  v('ADMIN', 'Admin', 'amber', Building2),
  v('FINANCE', 'Finance', 'emerald', IndianRupee),
  v('SECURITY', 'Security', 'red', Shield),
  v('DEPARTMENT', 'Department', 'ember', GitBranch),
]

// Free-text role hints offered for default_assignee_role on a template
export const ASSIGNEE_ROLE_SUGGESTIONS = [
  { value: '', label: 'Unassigned', icon: UserCog },
  { value: 'HR Team', label: 'HR Team', icon: Briefcase },
  { value: 'IT Team', label: 'IT Team', icon: Cpu },
  { value: 'Admin', label: 'Admin', icon: Building2 },
  { value: 'Finance', label: 'Finance', icon: IndianRupee },
  { value: 'Security', label: 'Security', icon: Shield },
  { value: 'Reporting Manager', label: 'Reporting Manager', icon: Users },
]

// ── Governance taxonomy (the blueprint of fixed vocabularies) ─────────────────
export const VOCAB_GROUPS = [
  {
    key: 'journey', title: 'The Joining Journey', icon: Rocket, accent: 'orange',
    blurb: 'The seven stages every new hire ascends through. Stage is inferred from checklist, document, identity, asset & training completeness.',
    configurable: false,
    items: STAGES.map(s => v(s.key, s.label, s.tone, s.icon)),
  },
  {
    key: 'categories', title: 'Checklist Lanes', icon: ScrollText, accent: 'gold',
    blurb: 'The ownership lanes a checklist task belongs to. Your editable templates are filed under these — bootstrap stamps active templates onto each joiner.',
    configurable: false,
    items: CHECKLIST_CATEGORIES,
  },
  {
    key: 'documents', title: 'Document Requirements', icon: FileCheck, accent: 'amber',
    blurb: 'The document slots seeded on every new hire. These are fixed in the joining bootstrap — surfaced here so the requirement set is visible.',
    configurable: false,
    items: [
      v('aadhaar', 'Aadhaar Card', 'orange', IdCard),
      v('pan', 'PAN Card', 'orange', IdCard),
      v('resume', 'Resume', 'amber', FileText),
      v('edu_cert', 'Educational Certs', 'amber', GraduationCap),
      v('exp_letter', 'Experience Letters', 'steel', FileText),
      v('passport_photo', 'Passport Photo', 'gold', Image),
      v('bank_details', 'Bank Details', 'emerald', Landmark),
      v('offer_letter', 'Offer Letter', 'gold', FilePen),
      v('nda', 'Signed NDA', 'steel', ScrollText),
    ],
  },
  {
    key: 'accounts', title: 'Account Provisioning', icon: Server, accent: 'ember',
    blurb: 'System accounts a joiner may receive. ERP, Email & Attendance are auto-requested by the bootstrap; the rest are added on demand.',
    configurable: false,
    items: [
      v('ERP', 'ERP Login', 'gold', Server),
      v('EMAIL', 'Official Email', 'amber', Mail),
      v('ATTENDANCE', 'Attendance', 'orange', Clock),
      v('VPN', 'VPN', 'steel', Wifi),
      v('BIOMETRIC', 'Biometric', 'orange', ScanFace),
      v('RFID_SYSTEM', 'RFID System', 'steel', IdCard),
      v('GIT', 'Git', 'ember', GitBranch),
      v('SLACK', 'Slack', 'rust', MessagesSquare),
      v('DRIVE', 'Drive', 'amber', HardDrive),
      v('OTHER', 'Other', 'steel', Ellipsis),
    ],
  },
  {
    key: 'roles', title: 'Joining Approvals', icon: Stamp, accent: 'rust',
    blurb: 'Approver roles on the joining sign-off chain. Approvals are added per joiner today — not yet a configurable workflow.',
    configurable: false,
    items: [
      v('HR_HEAD', 'HR Head', 'gold', Briefcase),
      v('DEPT_HEAD', 'Dept Head', 'ember', GitBranch),
      v('FINANCE', 'Finance', 'emerald', IndianRupee),
      v('IT', 'IT', 'orange', Cpu),
      v('SECURITY', 'Security', 'red', Shield),
      v('OTHER', 'Other', 'steel', Ellipsis),
    ],
  },
  {
    key: 'statuses', title: 'Status Machines', icon: CircleDot, accent: 'amber',
    blurb: 'The lifecycle states driving each onboarding surface — all fixed in the engine.',
    configurable: false,
    sub: [
      {
        label: 'Checklist item', items: [
          v('PENDING', 'Pending', 'steel'),
          v('IN_PROGRESS', 'In progress', 'orange'),
          v('COMPLETED', 'Completed', 'emerald'),
          v('BLOCKED', 'Blocked', 'red'),
          v('WAIVED', 'Waived', 'steel'),
        ],
      },
      {
        label: 'Document', items: [
          v('PENDING', 'Pending', 'steel'),
          v('UPLOADED', 'Uploaded', 'amber'),
          v('VERIFIED', 'Verified', 'emerald'),
          v('REJECTED', 'Rejected', 'red'),
          v('EXPIRED', 'Expired', 'rust'),
        ],
      },
      {
        label: 'Welcome kit', items: [
          v('PENDING', 'Pending', 'steel', Hourglass),
          v('PACKED', 'Packed', 'amber', Package),
          v('DISPATCHED', 'Dispatched', 'orange', Truck),
          v('DELIVERED', 'Delivered', 'emerald', PackageCheck),
        ],
      },
      {
        label: 'Identity', items: [
          v('PENDING', 'Pending', 'steel'),
          v('ISSUED', 'Issued', 'emerald'),
          v('REVOKED', 'Revoked', 'red'),
        ],
      },
      {
        label: 'Account', items: [
          v('PENDING', 'Pending', 'steel'),
          v('REQUESTED', 'Requested', 'amber'),
          v('ACTIVE', 'Active', 'emerald'),
          v('REVOKED', 'Revoked', 'red'),
          v('FAILED', 'Failed', 'red'),
        ],
      },
      {
        label: 'Induction type', items: [
          v('WELCOME', 'Welcome', 'gold'),
          v('DEPT_ORIENTATION', 'Dept Orientation', 'amber'),
          v('POLICY', 'Policy', 'orange'),
          v('COMPLIANCE', 'Compliance', 'emerald'),
          v('TEAM_INTRO', 'Team Intro', 'ember'),
          v('SAFETY', 'Safety', 'red'),
          v('OTHER', 'Other', 'steel'),
        ],
      },
    ],
  },
]

export const VOCAB_VALUE_COUNT = VOCAB_GROUPS.reduce((n, g) => {
  if (g.items) return n + g.items.length
  if (g.sub) return n + g.sub.reduce((m, s) => m + s.items.length, 0)
  return n
}, 0)

export const categoryMeta = (code) => CHECKLIST_CATEGORIES.find(c => c.value === code) || CHECKLIST_CATEGORIES[0]
