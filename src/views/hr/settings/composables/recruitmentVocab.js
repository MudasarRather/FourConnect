// recruitmentVocab.js — single source of truth for the Recruitment module's
// governing vocabularies, mirrored from the backend enums in
// app/models/hr/recruitment.py. These values are FIXED-IN-CODE on the backend
// (Python str-enums tied to state-machine logic); the only DB-backed,
// org-configurable recruitment entity is the Interview Panel.
//
// Historically these option lists were re-typed across 8+ recruitment Vue files
// (RecApplicationsSection, StageChangeModal, RecCandidatesSection, …) with
// drifting labels. This module is the canonical map the Settings governance
// console reads — and is import-ready for the module to converge on later.
//
// tone keys map to the Settings (--set-*) brand ramp:
//   gold/amber/orange/ember = brand · emerald = success · steel = neutral · red = danger
import {
  Inbox, ScanLine, Filter, Users, CircleCheck, Send, Award, CircleX, Ban,
  Pause, Layers, Star, Mail, Archive, UserRoundSearch,
  Briefcase, Wrench, UsersRound, Sparkles, Crown, Building2,
  Globe, Handshake, Linkedin, Search, Newspaper, Network, Footprints, GraduationCap, Compass,
  ThumbsUp, ThumbsDown, CircleDot, CircleAlert,
  Monitor, Video, Phone, MapPin, Repeat, RotateCcw, Hourglass,
  FileText, GitPullRequestArrow, ShieldCheck, Clock, FlagOff,
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

// ── The funnel spine (matches backend dashboard `funnel[]` order) ─────────────
// Drives the signature Talent-Cascade instrument top→bottom.
export const FUNNEL_STAGES = [
  { key: 'APPLIED',     label: 'Applied',     tone: 'steel',   icon: Inbox },
  { key: 'SCREENING',   label: 'Screening',   tone: 'amber',   icon: ScanLine },
  { key: 'SHORTLISTED', label: 'Shortlisted', tone: 'orange',  icon: Filter },
  { key: 'INTERVIEW',   label: 'Interview',   tone: 'orange',  icon: Users },
  { key: 'SELECTED',    label: 'Selected',    tone: 'ember',   icon: CircleCheck },
  { key: 'OFFER',       label: 'Offer',       tone: 'gold',    icon: Send },
  { key: 'JOINED',      label: 'Joined',      tone: 'emerald', icon: Award },
]

// ── Vocabulary groups (the taxonomy blueprint) ───────────────────────────────
// configurable: false → fixed-in-code enum (read-only governance display)
export const VOCAB_GROUPS = [
  {
    key: 'pipeline', title: 'Application Pipeline', icon: GitPullRequestArrow, accent: 'orange',
    blurb: 'The stages every application moves through. The interview-feedback engine auto-advances Selected / Rejected.',
    configurable: false,
    items: [
      v('APPLIED', 'Applied', 'steel', Inbox),
      v('SCREENING', 'Screening', 'amber', ScanLine),
      v('SHORTLISTED', 'Shortlisted', 'orange', Filter),
      v('INTERVIEW', 'Interview', 'orange', Users),
      v('SELECTED', 'Selected', 'ember', CircleCheck),
      v('OFFER', 'Offer', 'gold', Send),
      v('JOINED', 'Joined', 'emerald', Award),
      v('REJECTED', 'Rejected', 'red', CircleX),
      v('WITHDRAWN', 'Withdrawn', 'steel', Ban),
    ],
  },
  {
    key: 'candidate', title: 'Candidate Journey', icon: UserRoundSearch, accent: 'gold',
    blurb: 'Lifecycle states a candidate record carries — kept in sync with their active application stage.',
    configurable: false,
    items: [
      v('NEW', 'New', 'gold', Star),
      v('SCREENING', 'Screening', 'amber', ScanLine),
      v('SHORTLISTED', 'Shortlisted', 'orange', Filter),
      v('INTERVIEW', 'Interview', 'orange', Users),
      v('SELECTED', 'Selected', 'ember', CircleCheck),
      v('OFFERED', 'Offered', 'gold', Mail),
      v('JOINED', 'Joined', 'emerald', Award),
      v('REJECTED', 'Rejected', 'red', CircleX),
      v('ON_HOLD', 'On Hold', 'steel', Pause),
      v('TALENT_POOL', 'Talent Pool', 'amber', Layers),
      v('ARCHIVED', 'Archived', 'steel', Archive),
    ],
  },
  {
    key: 'interview', title: 'Interview Framework', icon: Users, accent: 'ember',
    blurb: 'The rounds, formats and verdicts that structure every interview. Recommendations drive auto-progression.',
    configurable: false,
    sub: [
      {
        label: 'Type', items: [
          v('HR', 'HR', 'gold', UsersRound),
          v('TECHNICAL', 'Technical', 'orange', Wrench),
          v('MANAGERIAL', 'Managerial', 'amber', Briefcase),
          v('CULTURAL', 'Cultural', 'ember', Sparkles),
          v('FINAL', 'Final', 'gold', Crown),
          v('CLIENT', 'Client', 'orange', Building2),
        ],
      },
      {
        label: 'Round', items: [
          v('R1', 'Round 1', 'steel'),
          v('R2', 'Round 2', 'steel'),
          v('R3', 'Round 3', 'amber'),
          v('R4', 'Round 4', 'orange'),
          v('FINAL', 'Final', 'gold'),
        ],
      },
      {
        label: 'Mode', items: [
          v('ONLINE', 'Online', 'orange', Video),
          v('OFFLINE', 'Offline', 'amber', MapPin),
          v('PHONE', 'Phone', 'steel', Phone),
        ],
      },
      {
        label: 'Verdict', items: [
          v('STRONG_HIRE', 'Strong Hire', 'emerald', ThumbsUp),
          v('HIRE', 'Hire', 'emerald', ThumbsUp),
          v('HOLD', 'Hold', 'steel', CircleDot),
          v('NO_HIRE', 'No Hire', 'red', ThumbsDown),
          v('STRONG_NO_HIRE', 'Strong No-Hire', 'red', ThumbsDown),
        ],
      },
    ],
  },
  {
    key: 'sources', title: 'Hiring Channels', icon: Compass, accent: 'amber',
    blurb: 'Where applicants come from — powers source-of-hire analytics across the funnel.',
    configurable: false,
    items: [
      v('PORTAL', 'Career Portal', 'gold', Globe),
      v('REFERRAL', 'Referral', 'emerald', Handshake),
      v('LINKEDIN', 'LinkedIn', 'orange', Linkedin),
      v('NAUKRI', 'Naukri', 'amber', Search),
      v('INDEED', 'Indeed', 'amber', Search),
      v('AGENCY', 'Agency', 'ember', Network),
      v('WALK_IN', 'Walk-in', 'steel', Footprints),
      v('CAMPUS', 'Campus', 'orange', GraduationCap),
      v('DIRECT', 'Direct', 'gold', Send),
      v('OTHER', 'Other', 'steel', Newspaper),
    ],
  },
  {
    key: 'requisition', title: 'Requisition Governance', icon: FileText, accent: 'orange',
    blurb: 'How a hiring need is raised, prioritised and approved before it becomes an open position.',
    configurable: false,
    sub: [
      {
        label: 'Hiring type', items: [
          v('NEW', 'New role', 'gold'),
          v('REPLACEMENT', 'Replacement', 'amber'),
          v('BACKFILL', 'Backfill', 'orange'),
        ],
      },
      {
        label: 'Priority', items: [
          v('LOW', 'Low', 'steel'),
          v('MEDIUM', 'Medium', 'amber'),
          v('HIGH', 'High', 'orange'),
          v('URGENT', 'Urgent', 'red'),
        ],
      },
      {
        label: 'Status', items: [
          v('DRAFT', 'Draft', 'steel', FileText),
          v('PENDING_APPROVAL', 'Pending', 'amber', Hourglass),
          v('APPROVED', 'Approved', 'emerald', CircleCheck),
          v('REJECTED', 'Rejected', 'red', CircleX),
          v('CONVERTED', 'Converted', 'gold', GitPullRequestArrow),
          v('ARCHIVED', 'Archived', 'steel', Archive),
        ],
      },
    ],
  },
  {
    key: 'position', title: 'Position & Offer', icon: Send, accent: 'gold',
    blurb: 'How an opening is published and how an offer is released, accepted and closed.',
    configurable: false,
    sub: [
      {
        label: 'Work mode', items: [
          v('ONSITE', 'Onsite', 'amber', MapPin),
          v('REMOTE', 'Remote', 'orange', Globe),
          v('HYBRID', 'Hybrid', 'gold', Repeat),
        ],
      },
      {
        label: 'Position status', items: [
          v('DRAFT', 'Draft', 'steel'),
          v('OPEN', 'Open', 'emerald'),
          v('ON_HOLD', 'On Hold', 'amber'),
          v('CLOSED', 'Closed', 'steel'),
          v('ARCHIVED', 'Archived', 'steel'),
        ],
      },
      {
        label: 'Offer status', items: [
          v('DRAFT', 'Draft', 'steel'),
          v('PENDING_APPROVAL', 'Pending', 'amber'),
          v('APPROVED', 'Approved', 'orange'),
          v('RELEASED', 'Released', 'gold'),
          v('ACCEPTED', 'Accepted', 'emerald'),
          v('REJECTED', 'Rejected', 'red'),
          v('EXPIRED', 'Expired', 'steel'),
          v('WITHDRAWN', 'Withdrawn', 'steel'),
        ],
      },
      {
        label: 'Close reason', items: [
          v('FILLED', 'Filled', 'emerald'),
          v('CANCELLED', 'Cancelled', 'red'),
          v('BUDGET', 'Budget', 'amber'),
          v('RESCOPED', 'Rescoped', 'orange'),
          v('OTHER', 'Other', 'steel'),
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
