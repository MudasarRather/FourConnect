// appraisalVocab.js — single source of truth for the Appraisal-Template
// settings console, mirrored from the backend model
// app/models/hr/appraisal_template.py:
//   AppraisalTemplate(cycle, rating_scale JSONB {max,labels}, applies_to_json
//   JSONB {grade_ids, department_ids}, is_active) + AppraisalTemplateSection
//   (title, weight, section_type, criteria_json, sort_order).
//
// These vocabularies are FIXED-IN-CODE strings on the backend. The DB-backed,
// org-configurable entity is the template itself (name/code/cycle/scale/scope +
// its weighted sections). NOTE: appraisal templates are authored here but are a
// configuration surface only — the Performance-review module that will consume
// them is not built yet, and the employee PROMOTE action does not read them.
import {
  Target, Brain, Goal, Users, CalendarCheck, MessageSquare,
  CalendarClock, CalendarRange, Hourglass, FolderKanban, Orbit,
} from 'lucide-vue-next'

// section_type → display + colour (resolved theme-aware via --set-* tokens)
export const SECTION_TYPE_META = {
  KRA:        { label: 'KRA',        color: 'var(--set-deep)',   icon: Target,        blurb: 'Key result areas — the measurable outcomes the role owns.' },
  COMPETENCY: { label: 'Competency', color: 'var(--set-orange)', icon: Brain,         blurb: 'Skills & capabilities demonstrated on the job.' },
  GOAL:       { label: 'Goal',       color: 'var(--set-amber)',  icon: Goal,          blurb: 'Objectives agreed for the review period.' },
  BEHAVIORAL: { label: 'Behavioral', color: 'var(--set-gold)',   icon: Users,         blurb: 'Values & ways-of-working the org expects.' },
  ATTENDANCE: { label: 'Attendance', color: 'var(--set-ok)',     icon: CalendarCheck, blurb: 'Presence, punctuality & reliability signals.' },
  FEEDBACK:   { label: 'Feedback',   color: '#10b981',           icon: MessageSquare, blurb: 'Peer / manager / 360° qualitative input.' },
}
export const SECTION_TYPES = Object.keys(SECTION_TYPE_META)
export const sectionMeta = (k) => SECTION_TYPE_META[k] || SECTION_TYPE_META.COMPETENCY
export const typeColor = (k) => sectionMeta(k).color

// review cycle → display
export const CYCLE_META = {
  ANNUAL:      { label: 'Annual',      icon: CalendarClock, hint: 'Once a year' },
  HALF_YEARLY: { label: 'Half-yearly', icon: CalendarRange, hint: 'Twice a year' },
  QUARTERLY:   { label: 'Quarterly',   icon: CalendarRange, hint: 'Every quarter' },
  PROBATION:   { label: 'Probation',   icon: Hourglass,     hint: 'During probation' },
  PROJECT:     { label: 'Project',     icon: FolderKanban,  hint: 'Per project close' },
  '360':       { label: '360°',        icon: Orbit,         hint: 'Multi-rater 360°' },
}
export const CYCLES = Object.keys(CYCLE_META)
export const cycleMeta = (k) => CYCLE_META[k] || CYCLE_META.ANNUAL

// default named rungs for the rating scale labels builder (by max)
export const DEFAULT_RATING_LABELS = {
  3: ['Below', 'Meets', 'Exceeds'],
  4: ['Needs work', 'Developing', 'Strong', 'Outstanding'],
  5: ['Poor', 'Needs improvement', 'Meets', 'Exceeds', 'Outstanding'],
}
export const defaultLabelsFor = (max) =>
  DEFAULT_RATING_LABELS[max] || Array.from({ length: max }, (_, i) => `Level ${i + 1}`)

export const blankSection = (type = 'COMPETENCY') => ({
  title: '', section_type: type, weight: 0, criteria: [],
})
