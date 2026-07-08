// Support Desk — per-scope descriptors for the Tickets list workspace.
// One entry per ticket "view" tab. Each makes the SHARED grid engine
// (SdTicketTable + SdTicketListSection) render a DISTINCT, purpose-built page:
// its own hero identity + accent, KPI lenses, specialized columns, filters,
// row + bulk actions, and empty state. This is what turns "one component
// filtered by scope" into Zendesk/ServiceNow-grade views.
//
// `backendScope` maps the tab key → the API `scope` param (agent + /me both
// understand these). `columns` are keys SdTicketTable knows how to render.
// `kpis` are keys SdTicketListSection knows how to compute from the working set.
import {
  Layers, Inbox, Activity, Hourglass, Truck, Pause, AlertTriangle, Flame, Timer,
  AlarmClock, RotateCcw, CircleCheck, CircleSlash, Archive,
} from 'lucide-vue-next'

// Default column set most desks share.
const BASE_COLS = ['flag', 'number', 'subject', 'priority', 'status', 'requester', 'agent', 'sla', 'updated']

export const TICKET_SCOPES = {
  all: {
    backendScope: 'all', label: 'All Tickets', icon: Layers, accent: 'var(--sd-amber)',
    eyebrow: 'EVERY TICKET', sub: 'The full desk — triage, route and resolve from one board.',
    columns: ['flag', 'number', 'subject', 'type', 'priority', 'status', 'requester', 'agent', 'sla', 'updated'],
    filters: ['q', 'priority', 'type', 'status', 'agent', 'org', 'date'],
    kpis: ['total', 'open', 'unassigned', 'breaching', 'dueSoon'],
    rowActions: ['open', 'assignMe', 'escalate', 'status'],
    bulkActions: ['assignMe', 'escalate', 'setStatus', 'resolve', 'addTag'],
    defaultSort: { by: 'created_at', dir: 'desc' },
    empty: { title: 'No tickets', blurb: 'Nothing matches — adjust filters or create a ticket.' },
  },
  unassigned: {
    backendScope: 'unassigned', label: 'Unassigned', icon: Inbox, accent: 'var(--sd-amber-strong)',
    eyebrow: 'INTAKE QUEUE', sub: 'Open work waiting to be claimed. Assign it before the SLA clock bites.',
    columns: ['flag', 'number', 'subject', 'priority', 'status', 'requester', 'age', 'sla'],
    filters: ['q', 'priority', 'type', 'org', 'date'],
    kpis: ['total', 'critical', 'breaching', 'oldestAge'],
    rowActions: ['open', 'assignMe', 'escalate'],
    bulkActions: ['assignMe', 'escalate', 'setStatus', 'addTag'],
    defaultSort: { by: 'created_at', dir: 'asc' },
    empty: { title: 'Queue is clear', blurb: 'No unassigned open tickets — every request has an owner.' },
  },
  open: {
    backendScope: 'open', label: 'Open / In Progress', icon: Activity, accent: 'var(--sd-st-progress)',
    eyebrow: 'ACTIVE WORK', sub: 'Everything actively being worked right now.',
    columns: ['flag', 'number', 'subject', 'priority', 'status', 'requester', 'agent', 'sla', 'updated'],
    filters: ['q', 'priority', 'type', 'agent', 'org'],
    kpis: ['total', 'critical', 'breaching', 'dueSoon', 'unassigned'],
    rowActions: ['open', 'assignMe', 'escalate', 'status'],
    bulkActions: ['assignMe', 'escalate', 'setStatus', 'resolve'],
    defaultSort: { by: 'priority', dir: 'desc' },
    empty: { title: 'Nothing in progress', blurb: 'No open or in-progress tickets right now.' },
  },
  'pending-customer': {
    backendScope: 'pending_customer', label: 'Pending Customer', icon: Hourglass, accent: 'var(--sd-st-pending)',
    eyebrow: 'AWAITING REPLY', sub: 'Waiting on the requester. Nudge stale ones before they go cold.',
    columns: ['flag', 'number', 'subject', 'priority', 'requester', 'agent', 'age', 'updated'],
    filters: ['q', 'priority', 'agent', 'org'],
    kpis: ['total', 'oldestAge', 'avgAge', 'breaching'],
    rowActions: ['open', 'status', 'escalate'],
    bulkActions: ['setStatus', 'resolve', 'addTag'],
    defaultSort: { by: 'updated_at', dir: 'asc' },
    empty: { title: 'Nobody’s waiting on a customer', blurb: 'No tickets are pending a customer reply.' },
  },
  'pending-vendor': {
    backendScope: 'pending_vendor', label: 'Pending Vendor', icon: Truck, accent: 'var(--sd-vendor-signal)',
    eyebrow: 'OFF-NETWORK · WITH A THIRD PARTY',
    sub: 'Handed off to an external vendor — the customer SLA is paused while you track the return.',
    // Vendor-specific columns (rendered by SdTicketTable): vendor + wait-reason chip, ETA with
    // overdue burn, time waiting since dispatch. These replace the generic requester/age set.
    columns: ['flag', 'number', 'subject', 'priority', 'vendor', 'vendorEta', 'agent', 'vendorWait'],
    filters: ['q', 'priority', 'agent', 'org'],
    kpis: ['total', 'oldestAge', 'avgAge', 'breaching'],
    rowActions: ['open', 'chase', 'bringBack', 'escalate'],
    bulkActions: ['vendorChase', 'bringBack', 'setStatus', 'resolve'],
    defaultSort: { by: 'updated_at', dir: 'asc' },
    empty: { title: 'No vendor blocks', blurb: 'No tickets are waiting on a vendor — every hand-off is back on the desk.' },
  },
  'on-hold': {
    backendScope: 'on_hold', label: 'On Hold', icon: Pause, accent: 'var(--sd-st-hold)',
    eyebrow: 'SUSPENSION DOCK', sub: 'Deliberately parked — coded reason, release date, frozen SLA clock.',
    columns: ['flag', 'number', 'subject', 'priority', 'holdReason', 'release', 'heldFor', 'agent', 'updated'],
    filters: ['q', 'priority', 'agent', 'org'],
    kpis: ['total', 'oldestAge', 'critical'],
    rowActions: ['open', 'resume', 'status'],
    bulkActions: ['setStatus', 'addTag'],
    defaultSort: { by: 'release', dir: 'asc' },
    empty: { title: 'Nothing on hold', blurb: 'The dock is clear — no tickets are parked right now.' },
  },
  critical: {
    backendScope: 'critical', label: 'Critical', icon: AlertTriangle, accent: 'var(--sd-pri-critical)',
    eyebrow: 'WAR ROOM', sub: 'Criticals and major incidents. Acknowledge, mobilize, keep stakeholders posted.',
    columns: ['flag', 'number', 'subject', 'mi', 'status', 'ack', 'nextUpdate', 'impact', 'agent', 'age', 'sla'],
    filters: ['q', 'type', 'status', 'agent', 'org'],
    kpis: ['total', 'unassigned', 'breaching', 'escalated'],
    rowActions: ['open', 'assignMe', 'escalate', 'status'],
    bulkActions: ['ack', 'assignMe', 'escalate', 'setStatus'],
    defaultSort: { by: 'created_at', dir: 'asc' },
    empty: { title: 'No critical tickets', blurb: 'Nothing critical right now — the desk is calm.' },
  },
  escalated: {
    // "Thermal Updraft" desk — rendered by the bespoke SdEscalatedSection (registry entry
    // in supportModules.js). Columns feed SdTicketTable's escalation catalog set.
    backendScope: 'escalated', label: 'Escalated', icon: Flame, accent: 'var(--sd-esc-core)',
    eyebrow: 'CHAIN OF COMMAND', sub: 'Escalations ride the thermal — altitude is time at tier.',
    columns: ['flag', 'number', 'subject', 'priority', 'tier', 'escTarget', 'escAck', 'escDue', 'dwell', 'agent', 'sla'],
    filters: ['q', 'priority', 'status', 'agent', 'org'],
    kpis: ['total', 'breaching', 'critical', 'unassigned'],
    rowActions: ['open', 'assignMe', 'escalate', 'status'],
    bulkActions: ['assignMe', 'escalate', 'setStatus'],
    defaultSort: { by: 'escalation_level', dir: 'desc' },
    empty: { title: 'Nothing escalated', blurb: 'The column runs cool — no tickets are escalated.' },
  },
  breached: {
    // "Time-Debt Meter" desk — rendered by the bespoke SdBreachedSection (registry entry
    // in supportModules.js). Columns feed SdTicketTable's breach catalog set (overage /
    // breachedAt / rca are pause-aware, powered by sla_*_breached_at stamps).
    backendScope: 'sla_breached', label: 'SLA Breached', icon: Timer, accent: 'var(--sd-brc-core)',
    eyebrow: 'PAST TARGET · DEBT ACCRUING', sub: 'Every minute owed, on the meter. Repair the damage, file the root cause.',
    columns: ['flag', 'number', 'subject', 'priority', 'status', 'breach', 'overage', 'breachedAt', 'rca', 'agent', 'sla'],
    filters: ['q', 'priority', 'status', 'agent', 'org'],
    kpis: ['total', 'critical', 'unassigned', 'avgAge'],
    rowActions: ['open', 'assignMe', 'escalate', 'status'],
    bulkActions: ['assignMe', 'escalate', 'setStatus', 'resolve'],
    defaultSort: { by: 'sla_resolution_breached_at', dir: 'asc' },
    empty: { title: 'No breaches', blurb: 'Every clock is within target. The meter reads zero.' },
  },
  overdue: {
    // "Gravity Well" desk — rendered by the bespoke SdOverdueSection (registry entry in
    // supportModules.js). Columns feed SdTicketTable's overdue catalog set: lateBy is the
    // live-ticking governing-clock overage, dueAt the absolute resolution target.
    backendScope: 'overdue', label: 'Overdue', icon: AlarmClock, accent: 'var(--sd-ovd-core)',
    eyebrow: 'RECOVERY OPS · CLOCK RUNNING', sub: 'Open, late, and still savable — ranked by how hard they are falling.',
    columns: ['flag', 'number', 'subject', 'priority', 'status', 'lateBy', 'dueAt', 'agent', 'sla'],
    filters: ['q', 'priority', 'status', 'agent', 'org'],
    kpis: ['total', 'critical', 'unassigned', 'avgAge'],
    rowActions: ['open', 'assignMe', 'escalate', 'status'],
    bulkActions: ['assignMe', 'escalate', 'setStatus', 'resolve'],
    defaultSort: { by: 'resolution_due_at', dir: 'asc' },
    empty: { title: 'Nothing overdue', blurb: 'No open ticket is past its target — the well is quiet.' },
  },
  reopened: {
    // "Möbius Loop" desk — rendered by the bespoke SdReopenedSection (registry entry in
    // supportModules.js). Columns feed SdTicketTable's reopen catalog set: reopened is the
    // cycle badge, reopenSource who kicked it back, reopenedAt the live cycle stamp,
    // prevRes the failed-fix verdict preserved from the last cycle.
    backendScope: 'reopened', label: 'Reopened', icon: RotateCcw, accent: 'var(--sd-rop-core)',
    eyebrow: 'RETURNS DESK · BACK ON THE LOOP', sub: 'Resolved once, back again — break the loop before it rings twice.',
    columns: ['flag', 'number', 'subject', 'priority', 'status', 'reopened', 'reopenSource', 'reopenedAt', 'prevRes', 'agent', 'sla'],
    filters: ['q', 'priority', 'status', 'agent', 'org'],
    kpis: ['total', 'critical', 'avgAge'],
    rowActions: ['open', 'assignMe', 'escalate', 'status'],
    bulkActions: ['assignMe', 'escalate', 'setStatus', 'resolve', 'addTag'],
    defaultSort: { by: 'last_reopened_at', dir: 'desc' },
    empty: { title: 'No reopens', blurb: 'No ticket has been reopened — resolutions are sticking.' },
  },
  // No 'assigned' descriptor — backendScope 'my' is exactly what the bespoke
  // My Tickets section renders for agents; the tab was removed as a duplicate.
  resolved: {
    // The cinematic "Closeout" desk (SdResolvedSection) — quality gate + auto-close shelf.
    backendScope: 'resolved', label: 'Resolved', icon: CircleCheck, accent: 'var(--sd-res-core)',
    eyebrow: 'CLOSEOUT · QUALITY GATE', sub: 'The fix landed — verify it, collect the rating, seal the record.',
    columns: ['flag', 'number', 'subject', 'priority', 'resolutionCode', 'resolvedAt', 'autoClose', 'csat', 'agent', 'updated'],
    filters: ['q', 'priority', 'type', 'agent', 'org', 'date'],
    kpis: ['total', 'avgAge', 'reopened'],
    rowActions: ['open', 'status'],
    bulkActions: ['addTag'],
    defaultSort: { by: 'resolved_at', dir: 'desc' },
    empty: { title: 'Nothing resolved yet', blurb: 'Resolved tickets will collect here — the shelf is where fixes prove themselves.' },
  },
  closed: {
    // The cinematic "Archive of Record" desk (SdClosedSection) — closure provenance,
    // follow-up chains, KCS knowledge harvest, closure certificates.
    backendScope: 'closed', label: 'Closed', icon: CircleSlash, accent: 'var(--sd-cls-core)',
    eyebrow: 'ARCHIVE OF RECORD', sub: 'The permanent record — every sealed ticket, its provenance and its verdict.',
    columns: ['flag', 'number', 'subject', 'priority', 'closeSource', 'closedAt', 'closedBy', 'csat', 'lifespan', 'followUp'],
    filters: ['q', 'priority', 'type', 'agent', 'org', 'date'],
    kpis: ['total', 'avgAge', 'csatAvg'],
    rowActions: ['open', 'status'],
    bulkActions: ['addTag'],
    defaultSort: { by: 'closed_at', dir: 'desc' },
    empty: { title: 'The archive is empty', blurb: 'Sealed records will collect here — the story of every finished ticket.' },
  },
  archived: {
    // The "Deep Storage" desk (SdArchivedSection). Visibility is gated by the registry's
    // `agentOnly` flag in supportModules.js — agents (team-sealed) + superusers only.
    backendScope: 'archived', label: 'Archived', icon: Archive, accent: 'var(--sd-arc-core)',
    eyebrow: 'DEEP STORAGE', sub: 'Out of circulation, never out of reach — restore, hold, or let retention run.',
    columns: ['flag', 'number', 'subject', 'statusAtArchive', 'archiveReason', 'archivedAt', 'archivedBy', 'dormancy', 'purgeIn', 'restore'],
    filters: ['q', 'priority', 'org'],
    kpis: ['total'],
    rowActions: ['open'],
    bulkActions: ['restore'],
    defaultSort: { by: 'archived_at', dir: 'desc' },
    empty: { title: 'Deep storage is empty', blurb: 'Archived tickets rest here — restorable until retention runs its course.' },
  },
}

export const getTicketScope = (key) => TICKET_SCOPES[key] || TICKET_SCOPES.all
