// Support Desk · TICKETS workspace — menu single-source-of-truth.
//
// The Tickets module is its OWN workspace (like HR's /admin/hr/settings,
// /attendance, /payroll): a dedicated vertical menu where EACH item is its own
// page (route `/admin/support-desk/tickets/:tab`). This file drives the rail
// (SdTicketRail), the workspace section switch, and the placeholder metadata.
//
// Structure validated against corporate ticketing (Zendesk "Views" / Explore /
// Admin; ServiceNow incident lists / dashboards / SLA). Groups mirror the
// product owner's tree exactly.
//
// `phase` = the build phase a tab graduates from placeholder → real page:
//   2 = wire an existing component · 3 = new frontend-only · 4 = needs backend.
// `countKey` = flat key resolved against the merged dashboard counts (the
//   workspace flattens status_counts + a `my` count before passing them in).
import {
  LayoutDashboard, Layers, UserCheck, Users, Inbox, AlertTriangle, Flame, Timer,
  Hourglass, Truck, CheckCircle2, CircleSlash, ListTree, Kanban, CalendarDays,
  Scale, Activity, BarChart3, LineChart, ScrollText, ListChecks, ArrowDownUp,
} from 'lucide-vue-next'

// Saved Views, Templates and module-wide Settings are NOT here — Settings is its
// own Support Desk sub-module (/admin/support-desk/settings), mirroring HR.
export const TICKET_GROUP_ORDER = ['Overview', 'Views', 'Boards & Monitors', 'Insights', 'Operations']

export const TICKET_TABS = [
  // ── Overview ──
  { slug: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview', accent: 'var(--sd-amber)', phase: 2, blurb: 'Ticket KPIs, distributions and the live triage state of the desk at a glance.' },

  // ── Views (Zendesk "Views" / ServiceNow lists — the same ticket set, scoped) ──
  { slug: 'all', label: 'All Tickets', icon: Layers, group: 'Views', accent: 'var(--sd-amber)', phase: 2, countKey: 'total_tickets', blurb: 'Every ticket across the desk, newest first.' },
  { slug: 'my', label: 'My Tickets', icon: UserCheck, group: 'Views', accent: 'var(--sd-amber)', phase: 2, countKey: 'my', blurb: 'Tickets currently assigned to you.' },
  { slug: 'team', label: 'Team Tickets', icon: Users, group: 'Views', accent: 'var(--sd-gold)', phase: 4, blurb: 'Tickets owned by your support team / queue (needs the team entity).' },
  { slug: 'unassigned', label: 'Unassigned', icon: Inbox, group: 'Views', accent: 'var(--sd-steel)', phase: 2, countKey: 'unassigned', blurb: 'Tickets awaiting an owner — the triage inbox.' },
  { slug: 'critical', label: 'Critical', icon: AlertTriangle, group: 'Views', accent: 'var(--sd-pri-critical)', phase: 2, countKey: 'critical', blurb: 'Highest-priority tickets demanding immediate attention.' },
  { slug: 'escalated', label: 'Escalated', icon: Flame, group: 'Views', accent: 'var(--sd-st-escalated)', phase: 2, countKey: 'escalated', blurb: 'Tickets raised up the escalation ladder.' },
  { slug: 'sla-breached', label: 'SLA Breached', icon: Timer, group: 'Views', accent: 'var(--sd-danger)', phase: 2, countKey: 'sla_breached', blurb: 'Tickets past their response or resolution SLA.' },
  { slug: 'pending-customer', label: 'Pending Customer', icon: Hourglass, group: 'Views', accent: 'var(--sd-st-pending)', phase: 2, countKey: 'pending_customer', blurb: 'Waiting on a reply from the customer.' },
  { slug: 'pending-vendor', label: 'Pending Vendor', icon: Truck, group: 'Views', accent: 'var(--sd-st-pending)', phase: 2, countKey: 'pending_vendor', blurb: 'Waiting on a third-party vendor.' },
  { slug: 'resolved', label: 'Resolved', icon: CheckCircle2, group: 'Views', accent: 'var(--sd-success)', phase: 2, countKey: 'resolved', blurb: 'Fixed and awaiting confirmation or closure.' },
  { slug: 'closed', label: 'Closed', icon: CircleSlash, group: 'Views', accent: 'var(--sd-steel)', phase: 2, countKey: 'closed', blurb: 'Completed and archived tickets.' },

  // ── Boards & Monitors ──
  { slug: 'queues', label: 'Queue Management', icon: ListTree, group: 'Boards & Monitors', accent: 'var(--sd-ember)', phase: 4, blurb: 'L1/L2/L3 and team queues with live load and SLA health (needs the queue entity).' },
  { slug: 'kanban', label: 'Kanban Board', icon: Kanban, group: 'Boards & Monitors', accent: 'var(--sd-ember)', phase: 2, blurb: 'Drag tickets across status columns, intake to closure.' },
  { slug: 'calendar', label: 'Calendar View', icon: CalendarDays, group: 'Boards & Monitors', accent: 'var(--sd-gold)', phase: 3, blurb: 'Due, follow-up, escalation and resolution dates on a calendar.' },
  { slug: 'workload', label: 'Workload Monitor', icon: Scale, group: 'Boards & Monitors', accent: 'var(--sd-amber)', phase: 2, blurb: 'Per-agent load — balanced, busy or overloaded.' },
  { slug: 'sla-monitor', label: 'SLA Monitor', icon: Activity, group: 'Boards & Monitors', accent: 'var(--sd-danger)', phase: 2, blurb: 'Live countdown to breach — within / approaching / breached.' },

  // ── Insights ──
  { slug: 'reports', label: 'Reports', icon: BarChart3, group: 'Insights', accent: 'var(--sd-amber)', phase: 2, blurb: 'Operational, agent, SLA and customer reporting with exports.' },
  { slug: 'analytics', label: 'Analytics', icon: LineChart, group: 'Insights', accent: 'var(--sd-gold)', phase: 3, blurb: 'Resolution, root-cause, category and customer insight cuts.' },
  { slug: 'audit-logs', label: 'Audit Logs', icon: ScrollText, group: 'Insights', accent: 'var(--sd-steel)', phase: 2, blurb: 'Every ticket change, sealed into an immutable ledger.' },

  // ── Operations ──
  { slug: 'bulk', label: 'Bulk Operations', icon: ListChecks, group: 'Operations', accent: 'var(--sd-ember)', phase: 3, blurb: 'Mass assign, re-status, escalate, merge or delete across many tickets.' },
  { slug: 'import-export', label: 'Import / Export', icon: ArrowDownUp, group: 'Operations', accent: 'var(--sd-gold)', phase: 4, blurb: 'Bulk import tickets and export the working set (CSV / Excel).' },
]

export const TICKET_TAB_KEYS = TICKET_TABS.map(t => t.slug)
export const TICKET_TAB_MAP = Object.fromEntries(TICKET_TABS.map(t => [t.slug, t]))
export const getTicketTab = (slug) => TICKET_TAB_MAP[slug] || TICKET_TABS[0]

// Grouped, ordered list for the rail's numbered group heads.
export const ticketRailGroups = () => {
  const groups = {}
  for (const g of TICKET_GROUP_ORDER) groups[g] = { title: g, items: [] }
  for (const t of TICKET_TABS) {
    if (!groups[t.group]) groups[t.group] = { title: t.group, items: [] }
    groups[t.group].items.push(t)
  }
  return TICKET_GROUP_ORDER.map(g => groups[g]).filter(g => g && g.items.length)
}

// Human label for the build phase (shown on the placeholder + as a rail hint).
export const PHASE_LABEL = {
  2: 'Ships in Phase 2',
  3: 'Ships in Phase 3',
  4: 'Ships in Phase 4',
}
