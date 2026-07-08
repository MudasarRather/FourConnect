// Support Ticketing — enterprise module registry (HR-style).
// Single source of truth for: routing, navigation menus, in-page tab rails and
// tab→section mapping. Each module is its own page (SupportModuleWorkspace) with
// its own tabs. `panels` (array) controls where it appears:
//   'employee' → /user/support/<module>      (the agent operations workspace, 18 modules)
//   'admin'    → /admin/support-desk/<module> (SUPERSET: the operational modules PLUS the
//                                              admin-only config/oversight modules)
// Operational modules carry BOTH panels; admin-only config/oversight modules carry only 'admin'.
//
// Tab `kind` drives how SupportModuleWorkspace renders + which props it passes:
//   'self'        → section self-fetches; gets @go/@changed only
//   'dashboard'   → SdDashboardSection; gets :dashboard :loading
//   'tickets'     → SdTicketsSection command deck; gets :dashboard :scope :create-signal
//   'feed'        → presentational (needs tickets); gets :tickets :now :loading + @open
//   'placeholder' → SdSectionPlaceholder; gets :label :phase :blurb :icon
import {
  LayoutDashboard, Ticket, Inbox, AlertTriangle, Bug, LayoutGrid, GitPullRequest,
  BookOpen, Gauge, MessageSquare, Server, Users, Zap, CircleCheck, Star, Activity,
  BarChart3, Building2, Settings, ScrollText, Megaphone,
  Radio, Plug, Sparkles,
} from 'lucide-vue-next'

// Sections + feed components are LAZY (defineAsyncComponent) so this registry can be
// imported by the global TopNav (for its menus) WITHOUT pulling the heavy section graph
// into the layout chunk — each section loads on demand when its tab is first opened.
import { defineAsyncComponent } from 'vue'
const A = (loader) => defineAsyncComponent(loader)
// Sections (reused as tab bodies)
const SdDashboardSection = A(() => import('./sections/SdDashboardSection.vue'))
const SdTicketDashboard = A(() => import('./sections/SdTicketDashboard.vue'))
const SdTicketsSection = A(() => import('./sections/SdTicketsSection.vue'))
const SdTicketListSection = A(() => import('./sections/SdTicketListSection.vue'))
const SdAllTicketsSection = A(() => import('./sections/SdAllTicketsSection.vue'))
const SdUnassignedSection = A(() => import('./sections/SdUnassignedSection.vue'))
const SdOpenTicketsSection = A(() => import('./sections/SdOpenTicketsSection.vue'))
const SdPendingCustomerSection = A(() => import('./sections/SdPendingCustomerSection.vue'))
const SdPendingVendorSection = A(() => import('./sections/SdPendingVendorSection.vue'))
const SdOnHoldSection = A(() => import('./sections/SdOnHoldSection.vue'))
const SdCriticalTicketsSection = A(() => import('./sections/SdCriticalTicketsSection.vue'))
const SdEscalatedSection = A(() => import('./sections/SdEscalatedSection.vue'))
const SdBreachedSection = A(() => import('./sections/SdBreachedSection.vue'))
const SdOverdueSection = A(() => import('./sections/SdOverdueSection.vue'))
const SdReopenedSection = A(() => import('./sections/SdReopenedSection.vue'))
const SdResolvedSection = A(() => import('./sections/SdResolvedSection.vue'))
const SdClosedSection = A(() => import('./sections/SdClosedSection.vue'))
const SdArchivedSection = A(() => import('./sections/SdArchivedSection.vue'))
const SdTeamTicketsSection = A(() => import('./sections/SdTeamTicketsSection.vue'))
const SdQueuesSection = A(() => import('./sections/SdQueuesSection.vue'))
const SdTicketCalendarSection = A(() => import('./sections/SdTicketCalendarSection.vue'))
const SdTemplatesSection = A(() => import('./sections/SdTemplatesSection.vue'))
const SdMyTicketsSection = A(() => import('./sections/SdMyTicketsSection.vue'))
const SdNewTicketSection = A(() => import('./sections/SdNewTicketSection.vue'))
const SdProblemsSection = A(() => import('./sections/SdProblemsSection.vue'))
const SdServiceCatalogSection = A(() => import('./sections/SdServiceCatalogSection.vue'))
const SdChangeRequestsSection = A(() => import('./sections/SdChangeRequestsSection.vue'))
const SdKnowledgeBaseSection = A(() => import('./sections/SdKnowledgeBaseSection.vue'))
const SdMyKnowledgeBaseSection = A(() => import('./sections/SdMyKnowledgeBaseSection.vue'))
const SdMyAnnouncementsSection = A(() => import('./sections/SdMyAnnouncementsSection.vue'))
const SdAnnouncementsSection = A(() => import('./sections/SdAnnouncementsSection.vue'))
const SdCustomerAssetsSection = A(() => import('./sections/SdCustomerAssetsSection.vue'))
const SdAutomationSection = A(() => import('./sections/SdAutomationSection.vue'))
const SdReportsSection = A(() => import('./sections/SdReportsSection.vue'))
const SdOrganizationsSection = A(() => import('./sections/SdOrganizationsSection.vue'))
const SdCustomersSection = A(() => import('./sections/SdCustomersSection.vue'))
const SdContractsSection = A(() => import('./sections/SdContractsSection.vue'))
const SdSettingsSection = A(() => import('./sections/SdSettingsSection.vue'))
const SdSlaSection = A(() => import('./sections/SdSlaSection.vue'))
const SdAuditLogsSection = A(() => import('./sections/SdAuditLogsSection.vue'))
// Feed components (presentational; need a tickets array)
const SdSlaPulse = A(() => import('./components/SdSlaPulse.vue'))
const SdWorkloadMonitor = A(() => import('./components/SdWorkloadMonitor.vue'))
const SdTriageField = A(() => import('./components/SdTriageField.vue'))

// helpers
const self = (key, label, comp) => ({ key, label, kind: 'self', comp })
const tickets = (key, label, scope) => ({ key, label, kind: 'tickets', comp: SdTicketsSection, scope })
const feed = (key, label, comp) => ({ key, label, kind: 'feed', comp })
const ph = (key, label, phase, blurb) => ({ key, label, kind: 'placeholder', phase, blurb })
// Detailed per-scope list workspace (SdTicketListSection, descriptor-driven). scope = tab key.
const list = (key, label) => ({ key, label, kind: 'ticket-list', comp: SdTicketListSection, scope: key })
// Phase-3 workspace tools (team/queues/calendar/templates) — get { panel, agentReveal }.
const tool = (key, label, comp) => ({ key, label, kind: 'ticket-tool', comp })

export const SUPPORT_MODULES = [
  /* ───────────────────────── EMPLOYEE (full operational) ───────────────────────── */
  {
    key: 'dashboards', label: 'Dashboards', icon: LayoutDashboard, accent: 'var(--sd-amber)', group: 'Overview', panels: ['employee', 'admin'],
    sub: 'The state of the desk at a glance — operations, SLA and satisfaction.',
    tabs: [
      { key: 'overview', label: 'Overview', kind: 'dashboard', comp: SdDashboardSection },
      feed('live-ops', 'Live Operations', SdTriageField),
      feed('sla', 'SLA', SdSlaPulse),
      feed('team-performance', 'Team Performance', SdWorkloadMonitor),
      ph('executive', 'Executive', 'PHASE 1 · INSIGHTS'),
      ph('csat', 'Customer Satisfaction', 'PHASE 1 · INSIGHTS'),
    ],
  },
  {
    key: 'tickets', label: 'Tickets', icon: Ticket, accent: 'var(--sd-ember)', group: 'Tickets', panels: ['employee', 'admin'],
    verticalRail: true, // renders the vertical SdWorkspaceRail menu instead of the horizontal tab bar
    sub: 'Triage, route and resolve — intake to closure against the SLA frontier.',
    tabs: [
      // Dashboard renders DIFFERENTLY per panel (SdTicketDashboard dispatcher):
      // admin/agent → crimson Operations Command Deck · employee → emerald Personal Console.
      { key: 'dashboard', label: 'Dashboard', kind: 'ticket-dashboard', comp: SdTicketDashboard },
      self('my', 'My Tickets', SdMyTicketsSection),
      self('new', 'Create Ticket', SdNewTicketSection),
      // Detailed per-scope list workspaces — full menu on BOTH panels. Each is a
      // distinct descriptor-driven page (ticketScopes.js); data is agent-aware
      // (agents → org-wide, plain employees → their own tickets in that status).
      // All Tickets = the cinematic "Team Operations Command Center" (its own section,
      // team-scoped via /me/tickets/command-center). Keeps kind:'ticket-list' so the
      // workspace passes {scope,panel,agentReveal,dashboard} exactly like the others.
      { key: 'all', label: 'All Tickets', kind: 'ticket-list', comp: SdAllTicketsSection, scope: 'all' },
      // Unassigned = the cinematic "Claim Field" (own section, team-sealed to my claimable
      // pool via /me/tickets/unassigned-queue). Keeps kind:'ticket-list' so the workspace
      // passes {scope,panel,agentReveal,dashboard} exactly like the others.
      { key: 'unassigned', label: 'Unassigned', kind: 'ticket-list', comp: SdUnassignedSection, scope: 'unassigned' },
      // Open / In Progress = the cinematic "Live Operations Floor" (own section, Momentum
      // Pipeline signature). Keeps kind:'ticket-list' so the workspace passes {scope,panel,
      // agentReveal,dashboard} exactly like All/Unassigned. Strict scope = open + in_progress.
      { key: 'open', label: 'Open / In Progress', kind: 'ticket-list', comp: SdOpenTicketsSection, scope: 'open' },
      // Pending Customer = the cinematic "Silence Chronometer" awaiting-reply console (own
      // section, SLA-paused workflow, silence-cadence). Keeps kind:'ticket-list' so the
      // workspace passes {scope,panel,agentReveal,dashboard} exactly like Open/All/Unassigned.
      { key: 'pending-customer', label: 'Pending Customer', kind: 'ticket-list', comp: SdPendingCustomerSection, scope: 'pending_customer' },
      // Pending Vendor = the cinematic "Vendor Relay Station" — a 3D deep-space relay hero
      // (three.js) + vendor hand-off lifecycle (dispatch / chase / OLA / bring-back). Keeps
      // kind:'ticket-list' so the workspace passes {scope,panel,agentReveal,dashboard} exactly
      // like Pending Customer. Strict scope = pending_vendor.
      { key: 'pending-vendor', label: 'Pending Vendor', kind: 'ticket-list', comp: SdPendingVendorSection, scope: 'pending_vendor' },
      // On Hold = the cinematic "Suspension Dock" — held tickets hang as crates from a
      // gantry (hold-reason taxonomy, release runway, auto-resume + stale-review
      // governance). Same {scope,panel,agentReveal,dashboard} contract as its siblings.
      { key: 'on-hold', label: 'On Hold', kind: 'ticket-list', comp: SdOnHoldSection, scope: 'on_hold' },
      // Critical = the cinematic "War Room" — criticals ∪ major incidents (include_major on
      // the list, team-sealed /me/tickets/critical/stats rollup), ACK/MTTA, stakeholder
      // update cadence, guided mode, presence + the war-room console. Same
      // {scope,panel,agentReveal,dashboard} contract as its siblings.
      { key: 'critical', label: 'Critical', kind: 'ticket-list', comp: SdCriticalTicketsSection, scope: 'critical' },
      // Escalated = the cinematic "Thermal Updraft" — escalations ride a heat column
      // (altitude = time at tier); tier ledger + reason spectrum, escalation ACK/eMTTA,
      // response clock, reasoned de-escalation, auto-escalation sweep lenses. Same
      // {scope,panel,agentReveal,dashboard} contract as its siblings.
      { key: 'escalated', label: 'Escalated', kind: 'ticket-list', comp: SdEscalatedSection, scope: 'escalated' },
      // SLA Breached = the cinematic "Time-Debt Meter" — every missed SLA accrues debt on
      // a live compounding odometer; worst-debtors ledger, breach-kind/aging lenses, per-
      // ticket SLA anatomy, RCA capture console, at-risk rail (prevent the NEXT breach),
      // guided triage. Opening it runs the backend breach-flag sweep so idle past-due
      // tickets surface. Same {scope,panel,agentReveal,dashboard} contract as its siblings.
      { key: 'breached', label: 'SLA Breached', kind: 'ticket-list', comp: SdBreachedSection, scope: 'breached' },
      // Overdue = the cinematic "Gravity Well" RECOVERY desk — open tickets with the clock
      // RUNNING past either target (overdue_kind=any: resolution AND first-response misses)
      // orbit a canvas singularity (depth = lateness); tipping-point strip (due ≤2h),
      // recovery roster, ranked Recovery Run guided mode, owner-nudge (single + bulk,
      // 24h-throttled), horizon view, sealed /me/tickets/overdue/stats. Opening it runs
      // the backend breach-flag sweep. Distinct from Breached (the debt ledger/RCA desk):
      // everything here is live and still savable. Same {scope,panel,agentReveal,dashboard}
      // contract as its siblings.
      { key: 'overdue', label: 'Overdue', kind: 'ticket-list', comp: SdOverdueSection, scope: 'overdue' },
      // Reopened = the cinematic "Möbius Loop" RETURNS desk — resolved once, back again.
      // Tickets ride a one-sided band (loops = reopen cycles); chronic rail (≥2×), reopen
      // source/reason-code taxonomy, previous-fix context, fresh re-resolution clock,
      // portal auto-reopen lens, ranked Quality Loop Run guided mode, sealed
      // /me/tickets/reopened/stats. Same {scope,panel,agentReveal,dashboard} contract
      // as its siblings.
      { key: 'reopened', label: 'Reopened', kind: 'ticket-list', comp: SdReopenedSection, scope: 'reopened' },
      // NOTE: no 'assigned' tab — for agents scope=my is exactly what My Tickets renders
      // (see SdMyTicketsSection); /tickets/assigned redirects to /tickets/my in the router.
      // Resolved = the cinematic "Closeout" quality-gate desk (sealed /resolved/stats,
      // auto-close rail, CSAT/FCR quality board, resolver leaderboard, closeout run).
      { key: 'resolved', label: 'Resolved', kind: 'ticket-list', comp: SdResolvedSection, scope: 'resolved' },
      // Closed = the cinematic "Archive of Record" desk (sealed /closed/stats, closure
      // provenance, follow-up chains, KCS knowledge harvest, closure certificates).
      { key: 'closed', label: 'Closed', kind: 'ticket-list', comp: SdClosedSection, scope: 'closed' },
      // Archived = the cinematic "Deep Storage" recovery-and-retention desk (sealed
      // /archived/stats, coded archive reasons, restore/legal-hold/purge governance,
      // recovery review). agentOnly: plain employees never see the tab — agents get
      // their team's shelf (server-sealed), superusers the whole desk.
      { key: 'archived', label: 'Archived', kind: 'ticket-list', comp: SdArchivedSection, scope: 'archived', agentOnly: true },
      // Team Command is panel-split INSIDE the section: employee panel → the cinematic
      // "Squad Command" Team Ops desk (sealed /me/tickets/team-queue + /stats: roster
      // telemetry, take-next, audited handoffs, round-robin distribute, collision watch,
      // flow balance); admin panel → the cinematic "Team Command" oversight desk
      // (sealed /teams/overview + /teams/{id}/stats|tickets|rebalance: fleet board,
      // per-team drill, guarded team CRUD). Key stays 'team' for URL stability.
      tool('team', 'Team Command', SdTeamTicketsSection),
      // Calendar = the cinematic "Chrono Desk" — the desk's TIME surface. Sealed
      // /me/tickets/calendar feed (multi-kind events + local-day buckets + HR holidays +
      // team business hours in ONE request), month/week/day/agenda views, layer toggles,
      // conflict/overload warnings, personal reminders, ICS export. agentOnly: the feed
      // is desk-scoped work telemetry — plain employees track their own tickets on My
      // Tickets; the workspace's revealPending ensureRoute guard keeps deep links stable.
      { ...tool('calendar', 'Calendar', SdTicketCalendarSection), agentOnly: true },
      // Templates is panel-split INSIDE the section: admin panel → the "Copperplate
      // Studio"; employee panel → the cinematic "Projection Room" agent desk (visibility-
      // sealed library, personal templates, favorites, run-on-ticket macros, ⌘K apply).
      // agentOnly: the list/apply API is get_support_agent-gated — before this flag a
      // plain employee saw the tab but every fetch 403'd into a fake "No templates yet".
      { ...tool('templates', 'Templates', SdTemplatesSection), agentOnly: true },
    ],
  },
  {
    key: 'queues', label: 'Queues', icon: Inbox, accent: 'var(--sd-gold)', group: 'Tickets', panels: ['employee', 'admin'],
    sub: 'Skill-based work queues — L1/L2/L3, technical, billing, infrastructure.',
    tabs: [
      tool('overview', 'Queue Overview', SdQueuesSection),
      ph('l1', 'L1 Support', 'PHASE 3 · QUEUES'),
      ph('l2', 'L2 Support', 'PHASE 3 · QUEUES'),
      ph('l3', 'L3 Support', 'PHASE 3 · QUEUES'),
      ph('config', 'Queue Config', 'PHASE 3 · QUEUES'),
    ],
  },
  {
    key: 'incidents', label: 'Incidents', icon: AlertTriangle, accent: 'var(--sd-pri-critical)', group: 'ITIL', panels: ['employee', 'admin'],
    sub: 'Major-incident command — active incidents, timelines and post-incident reviews.',
    tabs: [
      ph('active', 'Active Incidents', 'PHASE 3 · ITIL'),
      ph('major', 'Major Incidents', 'PHASE 3 · ITIL'),
      ph('critical', 'Critical Incidents', 'PHASE 3 · ITIL'),
      ph('timeline', 'Incident Timeline', 'PHASE 3 · ITIL'),
      ph('rca', 'Root Cause Analysis', 'PHASE 3 · ITIL'),
      ph('post-incident', 'Post-Incident Reports', 'PHASE 3 · ITIL'),
    ],
  },
  {
    key: 'problems', label: 'Problems', icon: Bug, accent: 'var(--sd-ember-deep)', group: 'ITIL', panels: ['employee', 'admin'],
    sub: 'Root-cause records linking recurring tickets, changes and assets.',
    tabs: [
      self('problems', 'Problems', SdProblemsSection),
      ph('known-errors', 'Known Errors', 'PHASE 3 · ITIL'),
      ph('rca', 'RCA Records', 'PHASE 3 · ITIL'),
      ph('corrective', 'Corrective Actions', 'PHASE 3 · ITIL'),
      ph('preventive', 'Preventive Actions', 'PHASE 3 · ITIL'),
    ],
  },
  {
    key: 'service-requests', label: 'Service Requests', icon: LayoutGrid, accent: 'var(--sd-ember)', group: 'Service', panels: ['employee', 'admin'],
    sub: 'Pre-defined service requests with their own intake forms and approvals.',
    tabs: [
      self('catalog', 'Service Catalog', SdServiceCatalogSection),
      ph('requests', 'Requests', 'PHASE 2 · SERVICE'),
      ph('approvals', 'Approval Requests', 'PHASE 2 · SERVICE'),
      ph('fulfillment', 'Fulfillment', 'PHASE 2 · SERVICE'),
      ph('tracking', 'Request Tracking', 'PHASE 2 · SERVICE'),
    ],
  },
  {
    key: 'changes', label: 'Changes', icon: GitPullRequest, accent: 'var(--sd-ember)', group: 'ITIL', panels: ['employee', 'admin'],
    sub: 'ITIL change workflow — planned changes, risk, CAB approvals and calendar.',
    tabs: [
      self('requests', 'Change Requests', SdChangeRequestsSection),
      ph('standard', 'Standard Changes', 'PHASE 3 · ITIL'),
      ph('normal', 'Normal Changes', 'PHASE 3 · ITIL'),
      ph('emergency', 'Emergency Changes', 'PHASE 3 · ITIL'),
      ph('cab', 'CAB Approvals', 'PHASE 3 · ITIL'),
      ph('calendar', 'Change Calendar', 'PHASE 3 · ITIL'),
    ],
  },
  {
    key: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen, accent: 'var(--sd-gold)', group: 'Knowledge', panels: ['employee', 'admin'],
    sub: 'Self-service articles, organised by category and visibility.',
    tabs: [
      self('browse', 'Browse', SdMyKnowledgeBaseSection),
      self('articles', 'Articles', SdKnowledgeBaseSection),
      ph('faq', 'FAQ', 'PHASE 2 · KNOWLEDGE'),
    ],
  },
  {
    key: 'sla', label: 'SLA', icon: Gauge, accent: 'var(--sd-amber)', group: 'Service', panels: ['employee', 'admin'],
    sub: 'Live SLA frontier — within / approaching / breached, with countdowns.',
    tabs: [
      feed('monitoring', 'Monitoring', SdSlaPulse),
      ph('breaches', 'Breaches', 'PHASE 1 · SLA'),
      ph('escalations', 'Escalations', 'PHASE 2 · SLA'),
      ph('reports', 'SLA Reports', 'PHASE 1 · SLA'),
    ],
  },
  {
    key: 'communication', label: 'Communication', icon: MessageSquare, accent: 'var(--sd-gold)', group: 'Ops', panels: ['employee', 'admin'],
    sub: 'Every customer touchpoint — conversations, channels and announcements.',
    tabs: [
      self('announcements', 'Announcements', SdMyAnnouncementsSection),
      ph('conversations', 'Conversations', 'PHASE 2 · COMMS'),
      ph('email', 'Email', 'PHASE 2 · COMMS'),
      ph('notes', 'Notes', 'PHASE 2 · COMMS'),
      ph('chat', 'Chat History', 'PHASE 4 · COMMS'),
      ph('calls', 'Call Logs', 'PHASE 4 · COMMS'),
      ph('sms', 'SMS Logs', 'PHASE 4 · COMMS'),
    ],
  },
  {
    key: 'assets', label: 'Assets & CMDB', icon: Server, accent: 'var(--sd-steel)', group: 'Service', panels: ['employee', 'admin'],
    sub: 'Client infrastructure under support — configuration items and relationships.',
    tabs: [
      self('inventory', 'Inventory', SdCustomerAssetsSection),
      ph('hardware', 'Hardware', 'PHASE 3 · CMDB'),
      ph('software', 'Software', 'PHASE 3 · CMDB'),
      ph('licenses', 'Licenses', 'PHASE 3 · CMDB'),
      ph('assignments', 'Assignments', 'PHASE 3 · CMDB'),
      ph('cis', 'Configuration Items', 'PHASE 3 · CMDB'),
      ph('relationships', 'Relationships', 'PHASE 3 · CMDB'),
    ],
  },
  {
    key: 'team', label: 'Team', icon: Users, accent: 'var(--sd-amber)', group: 'People', panels: ['employee', 'admin'],
    sub: 'Agents, workload balancing, skills, shifts and on-call scheduling.',
    tabs: [
      feed('workload', 'Workload', SdWorkloadMonitor),
      ph('agents', 'Agent Directory', 'PHASE 3 · TEAMS'),
      ph('availability', 'Availability', 'PHASE 3 · TEAMS'),
      ph('skills', 'Skills Matrix', 'PHASE 3 · TEAMS'),
      ph('teams', 'Teams', 'PHASE 3 · TEAMS'),
      ph('shifts', 'Shifts & Rotations', 'PHASE 3 · TEAMS'),
      ph('on-call', 'On-Call', 'PHASE 3 · TEAMS'),
    ],
  },
  {
    key: 'automation', label: 'Automation', icon: Zap, accent: 'var(--sd-ember)', group: 'Ops', panels: ['employee', 'admin'],
    sub: 'Condition → action rules that route, assign and escalate automatically.',
    tabs: [
      self('workflows', 'Workflows', SdAutomationSection),
      ph('routing', 'Ticket Routing', 'PHASE 2 · AUTOMATION'),
      ph('assignment', 'Assignment Rules', 'PHASE 2 · AUTOMATION'),
      ph('escalation', 'Escalation Rules', 'PHASE 2 · AUTOMATION'),
      ph('triggers', 'Trigger Rules', 'PHASE 2 · AUTOMATION'),
      ph('scheduled', 'Scheduled Rules', 'PHASE 2 · AUTOMATION'),
      ph('auto-close', 'Auto-Close', 'PHASE 2 · AUTOMATION'),
      ph('macros', 'Macros', 'PHASE 2 · AUTOMATION'),
      ph('templates', 'Response Templates', 'PHASE 2 · AUTOMATION'),
    ],
  },
  {
    key: 'approvals', label: 'Approvals', icon: CircleCheck, accent: 'var(--sd-success)', group: 'Ops', panels: ['employee', 'admin'],
    sub: 'One inbox for every service-request, change and escalation approval.',
    tabs: [
      ph('center', 'Approval Center', 'PHASE 2 · APPROVALS'),
      ph('pending', 'Pending', 'PHASE 2 · APPROVALS'),
      ph('approved', 'Approved', 'PHASE 2 · APPROVALS'),
      ph('rejected', 'Rejected', 'PHASE 2 · APPROVALS'),
      ph('escalated', 'Escalated', 'PHASE 2 · APPROVALS'),
    ],
  },
  {
    key: 'ai', label: 'AI Assist', icon: Sparkles, accent: 'var(--sd-ember)', group: 'AI', panels: ['employee', 'admin'],
    sub: 'Intelligent triage, agent copilot, virtual agents and self-service deflection.',
    tabs: [
      ph('overview', 'AI Overview', 'PHASE 4 · AI', 'Adoption, deflection rate and assist usage across the desk.'),
      ph('triage', 'Auto-Triage', 'PHASE 4 · AI', 'AI classifies, prioritises and routes incoming tickets.'),
      ph('copilot', 'Agent Copilot', 'PHASE 4 · AI', 'Reply suggestions, summarise, expand and tone-adjust for agents.'),
      ph('bots', 'Virtual Agent', 'PHASE 4 · AI', 'No-code bot flows that resolve or collect details before handoff.'),
      ph('intents', 'Intents & Training', 'PHASE 4 · AI', 'Intent models and the training data behind triage + bots.'),
      ph('deflection', 'Deflection', 'PHASE 4 · AI', 'KB-grounded answers that deflect tickets to self-service.'),
      ph('settings', 'AI Settings', 'PHASE 4 · AI', 'Enable features, choose models and set guardrails.'),
    ],
  },
  {
    key: 'surveys', label: 'Surveys & Feedback', icon: Star, accent: 'var(--sd-gold)', group: 'Insights', panels: ['employee', 'admin'],
    sub: 'CSAT surveys, responses and the customer feedback loop.',
    tabs: [
      ph('csat', 'CSAT Surveys', 'PHASE 4 · SURVEYS'),
      ph('responses', 'Survey Responses', 'PHASE 4 · SURVEYS'),
      ph('reports', 'CSAT Reports', 'PHASE 4 · SURVEYS'),
      ph('feedback', 'Feedback Center', 'PHASE 4 · SURVEYS'),
      ph('suggestions', 'Improvement Suggestions', 'PHASE 4 · SURVEYS'),
    ],
  },
  {
    key: 'monitoring', label: 'Monitoring & Alerts', icon: Activity, accent: 'var(--sd-pri-urgent)', group: 'Insights', panels: ['employee', 'admin'],
    sub: 'Threshold alerts, alert rules and external monitoring integrations.',
    tabs: [
      ph('alerts', 'Active Alerts', 'PHASE 4 · MONITORING'),
      ph('rules', 'Alert Rules', 'PHASE 4 · MONITORING'),
      ph('history', 'Alert History', 'PHASE 4 · MONITORING'),
      ph('integrations', 'Integrations', 'PHASE 4 · MONITORING'),
    ],
  },
  {
    key: 'reports', label: 'Reports', icon: BarChart3, accent: 'var(--sd-amber)', group: 'Insights', panels: ['employee', 'admin'],
    sub: 'Operational, agent, customer and SLA reporting with exports.',
    tabs: [
      self('operational', 'Operational', SdReportsSection),
      ph('agent', 'Agent Reports', 'PHASE 2 · REPORTS'),
      ph('customer', 'Customer Reports', 'PHASE 2 · REPORTS'),
      ph('sla', 'SLA Reports', 'PHASE 2 · REPORTS'),
      ph('custom', 'Report Builder', 'PHASE 4 · REPORTS'),
      ph('saved', 'Saved Reports', 'PHASE 4 · REPORTS'),
      ph('scheduled', 'Scheduled Reports', 'PHASE 4 · REPORTS'),
    ],
  },
  {
    key: 'clients', label: 'Clients', icon: Building2, accent: 'var(--sd-gold)', group: 'People', panels: ['employee', 'admin'],
    sub: 'The organizations, contacts and contracts behind the tickets.',
    tabs: [
      self('organizations', 'Organizations', SdOrganizationsSection),
      self('customers', 'Customers', SdCustomersSection),
      self('contracts', 'Contracts', SdContractsSection),
    ],
  },

  /* ───────────────────────── ADMIN (slim config + oversight) ───────────────────────── */
  {
    key: 'dashboard', label: 'Oversight', icon: LayoutDashboard, accent: 'var(--sd-amber)', group: 'Oversight', panels: ['admin'],
    sub: 'Executive oversight of the support operation.',
    tabs: [
      { key: 'executive', label: 'Executive', kind: 'dashboard', comp: SdDashboardSection },
      feed('sla', 'SLA Health', SdSlaPulse),
    ],
  },
  {
    key: 'service-catalog', label: 'Service Catalog', icon: LayoutGrid, accent: 'var(--sd-ember)', group: 'Content', panels: ['admin'],
    sub: 'Define the service offerings employees and clients can request.',
    tabs: [
      self('catalog', 'Catalog', SdServiceCatalogSection),
      ph('requests', 'Requests', 'PHASE 2 · SERVICE'),
      ph('approvals', 'Approvals', 'PHASE 2 · SERVICE'),
    ],
  },
  {
    key: 'announcements', label: 'Announcements', icon: Megaphone, accent: 'var(--sd-gold)', group: 'Content', panels: ['admin'],
    sub: 'Broadcast notices to the employee and client portals.',
    tabs: [
      self('all', 'Announcements', SdAnnouncementsSection),
    ],
  },
  {
    key: 'settings', label: 'Administration', icon: Settings, accent: 'var(--sd-steel)', group: 'Administration', panels: ['admin'],
    sub: 'Configure the desk — categories, fields, SLA policies, automation and access.',
    tabs: [
      self('general', 'General', SdSettingsSection),
      self('sla-policies', 'SLA Policies', SdSlaSection),
      self('automation-rules', 'Automation Rules', SdAutomationSection),
      ph('categories', 'Categories', 'PHASE 1 · ADMIN'),
      ph('types', 'Ticket Types', 'PHASE 1 · ADMIN'),
      ph('priorities', 'Priorities', 'PHASE 1 · ADMIN'),
      ph('statuses', 'Statuses', 'PHASE 1 · ADMIN'),
      ph('tags', 'Tags', 'PHASE 1 · ADMIN'),
      ph('forms', 'Forms & Fields', 'PHASE 2 · ADMIN', 'A drag-and-drop form builder for dynamic ticket fields.'),
      ph('notifications', 'Notifications', 'PHASE 2 · ADMIN'),
      ph('roles', 'Roles & Permissions', 'PHASE 1 · ADMIN', 'Support roles (agent / manager / analyst) — the gate that lets agents work tickets.'),
      ph('business-hours', 'Business Hours', 'PHASE 2 · ADMIN'),
      ph('holidays', 'Holidays', 'PHASE 2 · ADMIN'),
      ph('timezones', 'Time Zones', 'PHASE 2 · ADMIN'),
    ],
  },
  {
    key: 'channels', label: 'Channels', icon: Radio, accent: 'var(--sd-gold)', group: 'Administration', panels: ['admin'],
    sub: 'Connect every customer touchpoint — email, web, chat, voice, social and API.',
    tabs: [
      ph('overview', 'Channels Overview', 'PHASE 4 · CHANNELS', 'Every connected channel and its health at a glance.'),
      ph('email', 'Email', 'PHASE 2 · CHANNELS', 'Support addresses, forwarding and email-to-ticket.'),
      ph('web', 'Web Widget & Forms', 'PHASE 2 · CHANNELS', 'Embeddable widget and public contact forms.'),
      ph('chat', 'Live Chat & Messaging', 'PHASE 4 · CHANNELS'),
      ph('voice', 'Voice / Phone', 'PHASE 4 · CHANNELS'),
      ph('social', 'Social Messaging', 'PHASE 4 · CHANNELS', 'Facebook, Instagram, X and more.'),
      ph('whatsapp', 'WhatsApp', 'PHASE 4 · CHANNELS'),
      ph('api', 'API Channel', 'PHASE 4 · CHANNELS', 'Create tickets programmatically via the API.'),
    ],
  },
  {
    key: 'integrations', label: 'Integrations', icon: Plug, accent: 'var(--sd-steel)', group: 'Administration', panels: ['admin'],
    sub: 'Connected apps, API access and event webhooks.',
    tabs: [
      ph('overview', 'Connected Apps', 'PHASE 4 · INTEGRATIONS', 'Active integrations and their status.'),
      ph('marketplace', 'App Marketplace', 'PHASE 4 · INTEGRATIONS'),
      ph('api-tokens', 'API Tokens', 'PHASE 4 · INTEGRATIONS', 'Issue and revoke API access tokens.'),
      ph('webhooks', 'Webhooks', 'PHASE 4 · INTEGRATIONS', 'Push ticket events to external endpoints.'),
      ph('oauth', 'OAuth Clients', 'PHASE 4 · INTEGRATIONS'),
      ph('events', 'Events & Targets', 'PHASE 4 · INTEGRATIONS'),
      ph('logs', 'Integration Logs', 'PHASE 4 · INTEGRATIONS'),
    ],
  },
  {
    key: 'audit', label: 'Audit & Compliance', icon: ScrollText, accent: 'var(--sd-steel)', group: 'Oversight', panels: ['admin'],
    sub: 'A hash-sealed record of every action across the desk.',
    tabs: [
      self('activity', 'Activity Logs', SdAuditLogsSection),
      ph('ticket-audit', 'Ticket Audit', 'PHASE 1 · AUDIT'),
      ph('user-activity', 'User Activity', 'PHASE 2 · AUDIT'),
      ph('system', 'System Logs', 'PHASE 4 · AUDIT'),
      ph('compliance', 'Compliance', 'PHASE 4 · AUDIT'),
      ph('retention', 'Data Retention', 'PHASE 4 · AUDIT'),
    ],
  },
]

// Every module (except the two main dashboards) gets its OWN in-page "Dashboard"
// tab as its first item — a module-scoped overview, distinct from the main support
// dashboard. Placeholder for now; specialised per-module dashboards land in a later phase.
const _MAIN_DASH = new Set(['dashboards', 'dashboard'])
for (const _m of SUPPORT_MODULES) {
  if (_MAIN_DASH.has(_m.key)) continue
  if (_m.tabs.some(t => t.key === 'dashboard')) continue
  _m.tabs.unshift(ph('dashboard', 'Dashboard', `${(_m.group || 'SUPPORT').toUpperCase()} · DASHBOARD`,
    `${_m.label} KPIs, trends and live state — separate from the main support dashboard.`))
}

export const EMPLOYEE_MODULES = SUPPORT_MODULES.filter(m => m.panels.includes('employee'))
export const ADMIN_MODULES = SUPPORT_MODULES.filter(m => m.panels.includes('admin'))

const byPanel = (panel) => SUPPORT_MODULES.filter(m => m.panels.includes(panel))
export const getSupportModule = (panel, key) =>
  byPanel(panel).find(m => m.key === key) || byPanel(panel)[0]
export const defaultModuleKey = (panel) => byPanel(panel)[0]?.key
export const defaultTabKey = (mod) => mod?.tabs?.[0]?.key

// Route param constraints (kept in sync with the registry).
export const EMPLOYEE_MODULE_KEYS = EMPLOYEE_MODULES.map(m => m.key)
export const ADMIN_MODULE_KEYS = ADMIN_MODULES.map(m => m.key)

// Nav groups, in display order, per panel.
export const navGroups = (panel) => {
  const out = []
  for (const m of byPanel(panel)) {
    let g = out.find(x => x.title === m.group)
    if (!g) { g = { title: m.group, items: [] }; out.push(g) }
    g.items.push(m)
  }
  return out
}
