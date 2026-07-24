/*
  incidentTaxonomy — the CLIENT side of the timeline event registry.

  The server truth is GET /incidents/timeline/catalog (ACTIVITY_CATALOG in
  constants.py: label / category / tone / milestone-eligibility / system-writer
  per action). This module carries:
    · EVENT_META    — client-only overlays (lucide icon + short verb) for the
      kinds the desks render loudest; anything not listed falls back cleanly.
    · CATEGORY_META — the six catalog categories with their display order and
      the --tl-* token each colors with (hosts map --tl-* from --sd-inc-* on
      the agent page and --sd-fun-* on the admin page).
    · mergeCatalog(server) — folds the server catalog over the overlays into
      ONE lookup the desks, chips, ticker and exports all read. Unknown/new
      backend actions render with DEFAULT_META instead of disappearing.

  This file KILLS the duplicated EV/VERBS maps the two old timeline sections
  carried — no desk should declare its own action map again.
*/
import {
  Zap, ShieldCheck, Siren, ChevronsUp, Gavel, CircleCheck, RotateCcw, Users,
  FileCheck2, ArrowRightLeft, MessageSquare, StickyNote, Megaphone, BellRing,
  Timer, AlertTriangle, Link2, Unlink2, ListChecks, ClipboardList, Radio,
  UserPlus, UserMinus, Truck, BookOpenCheck, Scale, Star, Route, Wrench,
} from 'lucide-vue-next'

/* Client overlays: verb = the short operational reading, icon = lucide comp. */
export const EVENT_META = {
  created: { verb: 'Fault raised', icon: Zap },
  acknowledged: { verb: 'Acknowledged', icon: ShieldCheck },
  major_incident: { verb: 'MI declared', icon: Siren },
  mi_proposed: { verb: 'MI proposed', icon: Siren },
  mi_confirmed: { verb: 'MI confirmed', icon: Siren },
  mi_declined: { verb: 'MI declined', icon: Siren },
  mi_withdrawn: { verb: 'MI withdrawn', icon: Siren },
  escalated: { verb: 'Escalated', icon: ChevronsUp },
  de_escalated: { verb: 'De-escalated', icon: ChevronsUp },
  escalation_acknowledged: { verb: 'Escalation acked', icon: ShieldCheck },
  decision_logged: { verb: 'Decision', icon: Gavel },
  incident_roles_set: { verb: 'Roster staffed', icon: Users },
  incident_impact_set: { verb: 'Impact stamped', icon: AlertTriangle },
  incident_sev_changed: { verb: 'SEV reclassified', icon: ArrowRightLeft },
  incident_linked: { verb: 'Linked to master', icon: Link2 },
  incident_unlinked: { verb: 'Unlinked', icon: Unlink2 },
  child_incident_linked: { verb: 'Child coupled', icon: Link2 },
  status_changed: { verb: 'Status moved', icon: ArrowRightLeft },
  status_update: { verb: 'Status update', icon: Megaphone },
  resolved: { verb: 'Restored', icon: CircleCheck },
  closed: { verb: 'Closed', icon: CircleCheck },
  reopened: { verb: 'Fault returned', icon: RotateCcw },
  replied: { verb: 'Customer reply', icon: MessageSquare },
  internal_note: { verb: 'Internal note', icon: StickyNote },
  owner_nudge: { verb: 'Owner nudged', icon: BellRing },
  reminded: { verb: 'Reminder', icon: BellRing },
  sla_breached: { verb: 'SLA breached', icon: Timer },
  update_overdue: { verb: 'Cadence overdue', icon: Timer },
  vendor_dispatched: { verb: 'Vendor dispatched', icon: Truck },
  vendor_chased: { verb: 'Vendor chased', icon: Truck },
  vendor_replied: { verb: 'Vendor replied', icon: Truck },
  task_added: { verb: 'Task added', icon: ListChecks },
  task_status: { verb: 'Task moved', icon: ListChecks },
  task_assigned: { verb: 'Task assigned', icon: ListChecks },
  playbook_applied: { verb: 'Playbook applied', icon: ClipboardList },
  swarm_started: { verb: 'Swarm started', icon: Radio },
  swarm_joined: { verb: 'Swarm joined', icon: UserPlus },
  swarm_ended: { verb: 'Swarm ended', icon: UserMinus },
  assigned: { verb: 'Assigned', icon: UserPlus },
  unassigned: { verb: 'Unassigned', icon: UserMinus },
  routed: { verb: 'Queue-routed', icon: Route },
  pir_created: { verb: 'PIR opened', icon: FileCheck2 },
  pir_submitted: { verb: 'PIR submitted', icon: FileCheck2 },
  pir_approved: { verb: 'PIR approved', icon: FileCheck2 },
  pir_rejected: { verb: 'PIR rejected', icon: FileCheck2 },
  pir_published: { verb: 'PIR published', icon: BookOpenCheck },
  rca_recorded: { verb: 'RCA recorded', icon: Wrench },
  kb_promoted: { verb: 'KB promoted', icon: BookOpenCheck },
  legal_hold_set: { verb: 'Legal hold', icon: Scale },
  legal_hold_released: { verb: 'Hold released', icon: Scale },
  csat: { verb: 'CSAT received', icon: Star },
}

export const DEFAULT_META = {
  verb: null, icon: ArrowRightLeft, label: null,
  category: 'system', tone: 'dim', milestone: false, system: false,
}

/* Category display order + the local token each colors with. Hosts define the
   --tl-cat-* custom properties (agent maps them from --sd-inc-*, admin from
   --sd-fun-*), so ONE taxonomy serves both visual identities. */
export const CATEGORY_META = {
  lifecycle: { label: 'Lifecycle', token: '--tl-cat-lifecycle' },
  command: { label: 'Command', token: '--tl-cat-command' },
  comms: { label: 'Comms', token: '--tl-cat-comms' },
  sla: { label: 'SLA', token: '--tl-cat-sla' },
  governance: { label: 'Governance', token: '--tl-cat-governance' },
  system: { label: 'System', token: '--tl-cat-system' },
}
export const CATEGORY_ORDER = Object.keys(CATEGORY_META)

/* Fold the server catalog over the client overlays into one lookup:
   { action: { label, verb, icon, category, tone, milestone, system } }.
   Server wins on label/category/tone/milestone/system; the client only ever
   contributes icon + short verb. Call with null for the offline fallback. */
export const mergeCatalog = (server) => {
  const merged = {}
  for (const entry of server?.actions || []) {
    const overlay = EVENT_META[entry.action] || {}
    merged[entry.action] = {
      label: entry.label,
      verb: overlay.verb || entry.label,
      icon: overlay.icon || DEFAULT_META.icon,
      category: entry.category || DEFAULT_META.category,
      tone: entry.tone || DEFAULT_META.tone,
      milestone: !!entry.milestone_eligible,
      system: !!entry.system,
    }
  }
  // Offline / pre-catalog fallback: overlays alone, best-effort category.
  if (!Object.keys(merged).length) {
    for (const [action, overlay] of Object.entries(EVENT_META)) {
      merged[action] = { ...DEFAULT_META, ...overlay, label: overlay.verb }
    }
  }
  return merged
}

/* One event's meta out of a merged map — never undefined. */
export const metaOf = (map, action) => map?.[action] || {
  ...DEFAULT_META, label: String(action || '').replace(/_/g, ' '), verb: null,
}
