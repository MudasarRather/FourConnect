// trainingVocab.js — single source of truth for the Training (LTCMS) module's
// governing vocabularies, mirrored from the backend enums in
// app/models/hr/training.py, skill.py, certification.py, trainer.py,
// training_material.py, compliance_training.py, training_budget.py,
// training_request.py.
//
// These values are FIXED-IN-CODE on the backend (Python str-enums tied to
// state-machine + reporting logic). The DB-backed, org-configurable Training
// entities are the catalog masters — Skills, Certifications, Trainers, Programs,
// Materials, Compliance configs, Budgets — of which the Settings console owns
// the foundational **Skill catalog** (the others are managed in the module).
//
// This file is the canonical map the Training governance console reads — the
// taxonomy blueprint, the Capability-Canopy branch meta, and the side panels.
//
// tone keys map to the Settings (--set-*) brand ramp (resolved theme-aware):
//   gold/amber/orange/ember/rust = brand · emerald = success · steel = neutral · red = danger
import {
  GraduationCap, BookOpen, ShieldCheck, ShieldAlert, Award, Layers, Code, Scale,
  HardHat, Building2, Shapes, UsersRound, Presentation, Monitor, Footprints, Wrench,
  Video, FileText, Link, ClipboardCheck, Library, MapPin, Plane, Coins, UserRound,
  Globe, Languages, Heart, Cog, BadgeCheck, CircleDot, CircleCheck, CircleX, Ban,
  Hourglass, RotateCcw, CircleDashed, CircleSlash, Repeat, CalendarDays, CalendarRange,
  CalendarClock, Hand, Import, Sparkles, Star,
} from 'lucide-vue-next'

// tone → resolved color (Settings tokens, theme-aware automatically)
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

const v = (value, label, tone, icon, hint) => ({ value, label, tone, icon, hint })

// ── Training type meta — drives the Capability-Canopy branches ────────────────
// Keyed by backend TrainingType enum; the dashboard `by_type[]` feeds counts.
export const TRAINING_TYPE_META = {
  HR_ORIENTATION: { label: 'HR Orientation', tone: 'gold',    icon: UsersRound },
  SECURITY:       { label: 'Security',       tone: 'orange',  icon: ShieldCheck },
  SOFTWARE:       { label: 'Software',       tone: 'amber',   icon: Code },
  COMPLIANCE:     { label: 'Compliance',     tone: 'ember',   icon: Scale },
  SAFETY:         { label: 'Safety',         tone: 'rust',    icon: HardHat },
  DEPARTMENT:     { label: 'Department',     tone: 'emerald', icon: Building2 },
  OTHER:          { label: 'Other',          tone: 'steel',   icon: Shapes },
}
export const TRAINING_TYPE_ORDER = [
  'HR_ORIENTATION', 'SECURITY', 'SOFTWARE', 'COMPLIANCE', 'SAFETY', 'DEPARTMENT', 'OTHER',
]
export const typeMeta = (k) => TRAINING_TYPE_META[k] || TRAINING_TYPE_META.OTHER

// ── Skill category meta — used by the Skill catalog cards + modal ─────────────
export const SKILL_CATEGORY_META = {
  TECHNICAL:     { label: 'Technical',     tone: 'orange',  icon: Code },
  FUNCTIONAL:    { label: 'Functional',    tone: 'amber',   icon: Cog },
  BEHAVIORAL:    { label: 'Behavioral',    tone: 'ember',   icon: Heart },
  DOMAIN:        { label: 'Domain',        tone: 'gold',    icon: Globe },
  LANGUAGE:      { label: 'Language',      tone: 'emerald', icon: Languages },
  CERTIFICATION: { label: 'Certification', tone: 'rust',    icon: BadgeCheck },
  OTHER:         { label: 'Other',         tone: 'steel',   icon: Shapes },
}
export const SKILL_CATEGORY_ORDER = [
  'TECHNICAL', 'FUNCTIONAL', 'BEHAVIORAL', 'DOMAIN', 'LANGUAGE', 'CERTIFICATION', 'OTHER',
]
export const skillCategoryMeta = (k) => SKILL_CATEGORY_META[k] || SKILL_CATEGORY_META.OTHER

// ── Vocabulary groups (the taxonomy blueprint — read-only governance) ─────────
// configurable: false → fixed-in-code enum (read-only governance display)
export const VOCAB_GROUPS = [
  {
    key: 'type', title: 'Training Types', icon: GraduationCap, accent: 'gold',
    blurb: 'The seven program families every course is filed under — drives the canopy, reporting and compliance tagging.',
    configurable: false,
    items: TRAINING_TYPE_ORDER.map(k => v(k, TRAINING_TYPE_META[k].label, TRAINING_TYPE_META[k].tone, TRAINING_TYPE_META[k].icon)),
  },
  {
    key: 'delivery', title: 'Delivery Modes', icon: Presentation, accent: 'orange',
    blurb: 'How a program is run — set per program, surfaced on the calendar and trainer scheduling.',
    configurable: false,
    items: [
      v('CLASSROOM', 'Classroom', 'gold', Presentation),
      v('ONLINE', 'Online', 'orange', Monitor),
      v('BLENDED', 'Blended', 'amber', Layers),
      v('SELF_PACED', 'Self-paced', 'ember', Footprints),
      v('WORKSHOP', 'Workshop', 'rust', Wrench),
      v('WEBINAR', 'Webinar', 'emerald', Video),
    ],
  },
  {
    key: 'skillCat', title: 'Skill Categories', icon: Layers, accent: 'orange',
    blurb: 'The competency taxonomy your Skill catalog is bucketed into. The skills themselves are configurable below — the buckets are fixed.',
    configurable: false,
    items: SKILL_CATEGORY_ORDER.map(k => v(k, SKILL_CATEGORY_META[k].label, SKILL_CATEGORY_META[k].tone, SKILL_CATEGORY_META[k].icon)),
  },
  {
    key: 'skillSource', title: 'Proficiency Sources', icon: Sparkles, accent: 'amber',
    blurb: 'How a recorded proficiency level was established on the skill matrix.',
    configurable: false,
    items: [
      v('MANUAL', 'Manual', 'gold', Hand),
      v('ASSESSMENT', 'Assessment', 'orange', ClipboardCheck),
      v('SELF', 'Self-rated', 'amber', UserRound),
      v('IMPORT', 'Imported', 'steel', Import),
    ],
  },
  {
    key: 'certLife', title: 'Certification Lifecycle', icon: Award, accent: 'ember',
    blurb: 'The states an employee credential moves through — the expiry engine advances them automatically on the 90/60/30-day windows.',
    configurable: false,
    items: [
      v('ACTIVE', 'Active', 'emerald', CircleCheck),
      v('EXPIRING_SOON', 'Expiring soon', 'amber', Hourglass),
      v('EXPIRED', 'Expired', 'red', CircleX),
      v('REVOKED', 'Revoked', 'red', Ban),
      v('PENDING_RENEWAL', 'Pending renewal', 'orange', RotateCcw),
    ],
  },
  {
    key: 'frequency', title: 'Compliance Cadence', icon: ShieldAlert, accent: 'rust',
    blurb: 'How often a mandatory compliance program re-assigns itself across the eligible workforce.',
    configurable: false,
    items: [
      v('ONE_TIME', 'One-time', 'steel', CircleDot),
      v('MONTHLY', 'Monthly', 'gold', CalendarDays),
      v('QUARTERLY', 'Quarterly', 'amber', CalendarRange),
      v('HALF_YEARLY', 'Half-yearly', 'orange', CalendarRange),
      v('ANNUAL', 'Annual', 'ember', CalendarClock),
      v('BIENNIAL', 'Biennial', 'rust', Repeat),
    ],
  },
  {
    key: 'enrollment', title: 'Enrollment & Status', icon: BookOpen, accent: 'gold',
    blurb: 'Where an enrollment originates, and the lifecycle each assignment carries through to completion.',
    configurable: false,
    sub: [
      {
        label: 'Source', items: [
          v('ONBOARDING', 'Onboarding', 'emerald'),
          v('COMPLIANCE', 'Compliance', 'ember'),
          v('REQUEST', 'Request', 'orange'),
          v('MANUAL', 'Manual', 'gold'),
          v('SELF', 'Self', 'amber'),
        ],
      },
      {
        label: 'Assignment status', items: [
          v('NOT_STARTED', 'Not started', 'steel', CircleDashed),
          v('IN_PROGRESS', 'In progress', 'orange', CircleDot),
          v('COMPLETED', 'Completed', 'emerald', CircleCheck),
          v('FAILED', 'Failed', 'red', CircleX),
          v('WAIVED', 'Waived', 'steel', CircleSlash),
        ],
      },
    ],
  },
  {
    key: 'request', title: 'Request Lifecycle', icon: ClipboardCheck, accent: 'orange',
    blurb: 'How an employee-raised training request is routed through its fixed Manager → HR sign-off and into a real enrollment.',
    configurable: false,
    items: [
      v('DRAFT', 'Draft', 'steel', FileText),
      v('PENDING_APPROVAL', 'Pending', 'amber', Hourglass),
      v('APPROVED', 'Approved', 'emerald', CircleCheck),
      v('REJECTED', 'Rejected', 'red', CircleX),
      v('RETURNED', 'Returned', 'orange', RotateCcw),
      v('CANCELLED', 'Cancelled', 'steel', Ban),
      v('FULFILLED', 'Fulfilled', 'gold', Award),
    ],
  },
  {
    key: 'people', title: 'People & Resources', icon: UsersRound, accent: 'amber',
    blurb: 'The registries that supply who delivers training, what learners read, and how the spend is classified.',
    configurable: false,
    sub: [
      {
        label: 'Trainer type', items: [
          v('INTERNAL', 'Internal', 'gold', UserRound),
          v('EXTERNAL', 'External', 'orange', Globe),
          v('VENDOR', 'Vendor', 'ember', Building2),
        ],
      },
      {
        label: 'Material type', items: [
          v('DOCUMENT', 'Document', 'gold', FileText),
          v('VIDEO', 'Video', 'orange', Video),
          v('LINK', 'Link', 'amber', Link),
          v('SLIDE', 'Slide', 'ember', Presentation),
          v('QUIZ', 'Quiz', 'emerald', ClipboardCheck),
          v('OTHER', 'Other', 'steel', Shapes),
        ],
      },
      {
        label: 'Budget cost type', items: [
          v('TRAINER_FEE', 'Trainer fee', 'gold', UserRound),
          v('MATERIAL', 'Material', 'amber', Library),
          v('VENUE', 'Venue', 'orange', MapPin),
          v('TRAVEL', 'Travel', 'ember', Plane),
          v('CERT_FEE', 'Cert fee', 'rust', Award),
          v('OTHER', 'Other', 'steel', Coins),
        ],
      },
    ],
  },
]

// Count of distinct vocabulary values described (for the hero readout).
export const VOCAB_VALUE_COUNT = VOCAB_GROUPS.reduce((n, g) => {
  if (g.items) return n + g.items.length
  if (g.sub) return n + g.sub.reduce((m, s) => m + s.items.length, 0)
  return n
}, 0)

// Certification-horizon segment meta (side panel).
export const CERT_HORIZON = [
  { key: 'ACTIVE', label: 'Active', tone: 'emerald' },
  { key: 'EXPIRING_SOON', label: 'Expiring', tone: 'amber' },
  { key: 'PENDING_RENEWAL', label: 'Renewing', tone: 'orange' },
  { key: 'EXPIRED', label: 'Expired', tone: 'red' },
  { key: 'REVOKED', label: 'Revoked', tone: 'steel' },
]
