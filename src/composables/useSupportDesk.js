// Support Desk — central data layer for the admin/agent panel + self-service.
// Thin axios wrappers over /api/support-desk/* with path-aware auth headers, plus
// a module-scoped picker cache (categories / organizations / SLA packages) that
// rarely changes and is shared across sections.
import { reactive } from 'vue'
import axios from 'axios'
import { API } from '@/utils/api'

const authHeader = () => {
  const isUser = typeof window !== 'undefined' && window.location?.pathname?.startsWith('/user')
  const primary = isUser ? 'user_token' : 'admin_token'
  const fallback = isUser ? 'admin_token' : 'user_token'
  const t = localStorage.getItem(primary) || localStorage.getItem(fallback)
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const _get = async (url, params) => (await axios.get(`${API}${url}`, { headers: authHeader(), params })).data
const _post = async (url, body) => (await axios.post(`${API}${url}`, body, { headers: authHeader() })).data
const _patch = async (url, body, params) => (await axios.patch(`${API}${url}`, body, { headers: authHeader(), params })).data
const _put = async (url, body) => (await axios.put(`${API}${url}`, body, { headers: authHeader() })).data
const _del = async (url, params) => (await axios.delete(`${API}${url}`, { headers: authHeader(), params })).data

const SD = '/support-desk'

/* ─────────────────────────── Dashboard ─────────────────────────── */
export const fetchSupportDashboard = () => _get(`${SD}/dashboard/`)
export const fetchSelfDashboard = () => _get(`${SD}/me/tickets/dashboard`)
// Consolidated Pulse dashboard (the tickets landing page): { me, is_agent, agent, generated_at }.
export const fetchTicketPulse = () => _get(`${SD}/me/tickets/dashboard/pulse`)
// Consolidated ADMIN intel payload (the admin tickets dashboard "Concourse"): trend, SLA
// attainment, teams, leaderboard, channel mix, heatmap, CSAT, at-risk, presence, incidents.
// params: { days: 7|14|30|90, tz_offset: minutes east of UTC (JS -getTimezoneOffset()) }
export const fetchSupportIntel = (params) => _get(`${SD}/dashboard/intel`, params)

/* ─────────────────────────── Support-agent detection (shared cache) ───────────────────────────
   The operational /support-desk/* endpoints require superuser OR users.is_support_agent;
   the flag is NOT on /auth/me. We derive "is this user an agent?" by probing the admin
   dashboard once — success ⇒ agent (and we keep the ops payload for the hybrid cockpit),
   403/anything ⇒ pure self-service. Module-scoped + single-inflight so the workspace
   (tab gating) and the dashboard (cockpit data) share one probe. */
const agentState = reactive({ checked: false, isAgent: false, ops: null, inflight: null })
export async function detectSupportAgent(isAdmin = false) {
  if (isAdmin) { agentState.isAgent = true; agentState.checked = true; return agentState }
  if (agentState.checked) return agentState
  if (agentState.inflight) return agentState.inflight
  agentState.inflight = (async () => {
    try { agentState.ops = await fetchSupportDashboard(); agentState.isAgent = true }
    catch { agentState.isAgent = false; agentState.ops = null }
    finally { agentState.checked = true; agentState.inflight = null }
    return agentState
  })()
  return agentState.inflight
}
export function useSupportAgentState() { return agentState }

/* ─────────────────────────── Capabilities (role-adaptive UI) ───────────────────────────
   One source of truth for what the current user may do: agent (full controls),
   reporting manager (assign to direct reports), admin. Backed by the new
   GET /support-desk/me/tickets/capabilities. Single-inflight, module-scoped cache. */
const capState = reactive({ checked: false, isAdmin: false, isAgent: false, isManager: false, teamSize: 0, memberTeamIds: [], leadTeamIds: [], inflight: null })
export async function fetchCapabilities(force = false) {
  if (capState.checked && !force) return capState
  if (capState.inflight) return capState.inflight
  capState.inflight = (async () => {
    try {
      const c = await _get(`${SD}/me/tickets/capabilities`)
      capState.isAdmin = !!c.is_admin
      capState.isAgent = !!c.is_agent
      capState.isManager = !!c.is_manager
      capState.teamSize = c.team_size || 0
      capState.memberTeamIds = (c.member_team_ids || []).map(String)
      capState.leadTeamIds = (c.lead_team_ids || []).map(String)
    } catch {
      capState.isAdmin = false; capState.isAgent = false; capState.isManager = false; capState.teamSize = 0
      capState.memberTeamIds = []; capState.leadTeamIds = []
    } finally { capState.checked = true; capState.inflight = null }
    return capState
  })()
  return capState.inflight
}
export function useCapabilities() { return capState }

/* ─────────────────────────── Tickets (admin) ─────────────────────────── */
export const listTickets = (params) => _get(`${SD}/tickets/`, params)
export const bulkTickets = (payload) => _post(`${SD}/tickets/bulk`, payload)
export const getTicket = (id) => _get(`${SD}/tickets/${id}`)
export const createTicket = (payload) => _post(`${SD}/tickets/`, payload)
export const updateTicket = (id, payload) => _patch(`${SD}/tickets/${id}`, payload)
export const assignTicket = (id, payload) => _post(`${SD}/tickets/${id}/assign`, payload)
export const changeTicketStatus = (id, payload) => _post(`${SD}/tickets/${id}/status`, payload)
// Structured escalate — body: { reason, reason_code?, escalation_type?, team_id?,
// support_team?, response_minutes?, update_interval_minutes? }. Persists the full record
// (who/direction/coded reason/target team), arms the receiving tier's ack clock and posts
// the [Escalation] internal note server-side.
export const escalateTicket = (id, payload) => _post(`${SD}/tickets/${id}/escalate`, payload || {})
// De-escalation now REQUIRES a reason: { reason } — the backend 422s without one.
export const deEscalateTicket = (id, payload) => _post(`${SD}/tickets/${id}/de-escalate`, payload)
// Escalation ACK — "the receiving tier owns eyes on this" (the eMTTA stamp; 409 when
// already acked / not escalated / terminal). DISTINCT from the war-room ackTicket. { note? }.
export const ackEscalation = (id, payload) => _post(`${SD}/tickets/${id}/escalation-ack`, payload || {})
// Tier timeline — every escalate/de-escalate rung with actor/reason/direction/target/dwell.
export const fetchEscalationHistory = (id) => _get(`${SD}/tickets/${id}/escalation-history`)
export const remindTicket = (id, payload) => _post(`${SD}/tickets/${id}/remind`, payload || {})
export const setTicketRca = (id, payload) => _post(`${SD}/tickets/${id}/rca`, payload || {})
export const setMajorIncident = (id, payload) => _post(`${SD}/tickets/${id}/major-incident`, payload || {})
export const holdTicket = (id, payload) => _post(`${SD}/tickets/${id}/hold`, payload || {})
// Resume accepts an optional { reason } — lands on the timeline as the transition note.
export const resumeTicket = (id, payload) => _post(`${SD}/tickets/${id}/resume`, payload || {})
// Review/extend an ACTIVE hold without lifting it: { hold_until?, hold_reason_code?,
// hold_reason?, note? }. Stamps last_hold_review_at + hold_review_count (governance).
export const extendHold = (id, payload) => _post(`${SD}/tickets/${id}/hold-extend`, payload || {})
export const reopenTicket = (id, payload) => _post(`${SD}/tickets/${id}/reopen`, payload || {})
// Un-archive (Deep Storage). Optional { note } lands on the 'restored' activity beside a
// snapshot of the prior stamps. 409 when not archived / legal-held (non-superuser).
export const restoreTicket = (id, payload) => _post(`${SD}/tickets/${id}/restore`, payload || {})
export const setTicketCsat = (id, payload) => _post(`${SD}/tickets/${id}/csat`, payload)
export const resolveTicket = (id, payload) => _post(`${SD}/tickets/${id}/resolve`, payload || {})
export const mergeTicket = (id, payload) => _post(`${SD}/tickets/${id}/merge`, payload)
export const logTicketTime = (id, payload) => _post(`${SD}/tickets/${id}/time`, payload)
export const markTicketViewed = (id) => _post(`${SD}/tickets/${id}/viewed`, {})
export const fetchWorkbench = () => _get(`${SD}/tickets/workbench`)
export const fetchMyWorkbench = () => _get(`${SD}/me/tickets/workbench`)
export const addTicketComment = (id, payload) => _post(`${SD}/tickets/${id}/comments`, payload)
export const listTicketComments = (id) => _get(`${SD}/tickets/${id}/comments`)
export const listTicketActivities = (id) => _get(`${SD}/tickets/${id}/activities`)
// Superuser-only: destructively scrub a comment's content (Zendesk redaction). Reason required.
export const redactTicketComment = (id, commentId, payload) => _post(`${SD}/tickets/${id}/comments/${commentId}/redact`, payload)
// Superuser-only: re-home a ticket to a different requester (ServiceNow change-caller).
export const changeTicketRequester = (id, payload) => _post(`${SD}/tickets/${id}/change-requester`, payload)
// Collaborators (admin side) — extra people who can see + work the ticket.
export const addTicketCollaborator = (id, payload) => _post(`${SD}/tickets/${id}/collaborators`, payload)
export const removeTicketCollaborator = (id, memberId) => _del(`${SD}/tickets/${id}/collaborators/${memberId}`)
// Soft-delete (archive) with an audited reason + coded taxonomy — restorable via
// restoreTicket. reasonCode ∈ ARCHIVE_REASON_CODES (422 on 'auto_retention' — sweep-only).
export const deleteTicket = (id, reason, reasonCode) => {
  const params = {}
  if (reason) params.reason = reason
  if (reasonCode) params.reason_code = reasonCode
  return axios.delete(`${API}${SD}/tickets/${id}`,
    { headers: authHeader(), params: Object.keys(params).length ? params : undefined }).then(r => r.data)
}
export const rotateTicketPortal = (id) => _post(`${SD}/tickets/${id}/portal/rotate`, {})
// ── War Room (Critical tickets) ──
// Acknowledge = "a responder owns eyes on this" (MTTA stamp). 409 when already acked
// or terminal; does NOT touch the customer SLA clocks. Body: { note? }.
export const ackTicket = (id, payload) => _post(`${SD}/tickets/${id}/ack`, payload || {})
// Stakeholder status update — lands as a comment (internal or public) and re-arms /
// stands down the update-cadence timer. Body: { body, is_internal?, interval_minutes?, stop_cadence? }.
export const postStatusUpdate = (id, payload) => _post(`${SD}/tickets/${id}/status-update`, payload)
// Agent-collision presence: upserts my heartbeat + returns everyone viewing this ticket
// right now. Call every ~25s while a drawer/console is open.
export const ticketPresence = (id) => _post(`${SD}/tickets/${id}/presence`, {})
export const bulkAck = (ids) => bulkTickets({ ids, action: 'ack' })
// ── Escalated desk ("Thermal Updraft") ──
export const bulkEscalationAck = (ids) => bulkTickets({ ids, action: 'escalation_ack' })
export const bulkDeEscalate = (ids, reason) => bulkTickets({ ids, action: 'de_escalate', reason })
// Team-sealed escalated-desk aggregate (by_level/by_type/by_reason_code, unacked,
// response-overdue, eMTTA, avg dwell, breach candidates, squad).
export const fetchEscalationStats = (params) => _get(`${SD}/me/tickets/escalated/stats`, params)
export const ticketToTask = (id, body) => _post(`${SD}/tickets/${id}/to-task`, body || {})
export const serviceRequestToInvoice = (id, body) => _post(`${SD}/service-requests/${id}/to-invoice`, body)

/* ─────────────────────────── Tickets (self-service) ─────────────────────────── */
export const listMyTickets = (params) => _get(`${SD}/me/tickets/`, params)
export const getMyTicket = (id) => _get(`${SD}/me/tickets/${id}`)
export const createMyTicket = (payload) => _post(`${SD}/me/tickets/`, payload)
export const replyMyTicket = (id, payload) => _post(`${SD}/me/tickets/${id}/comments`, payload)
export const rateMyTicket = (id, payload) => _post(`${SD}/me/tickets/${id}/csat`, payload)
// Requester self-edit (open tickets only), withdraw (recoverable cancel), reopen (resolved only).
export const updateMyTicket = (id, payload) => _patch(`${SD}/me/tickets/${id}`, payload)
export const withdrawMyTicket = (id, payload) => _post(`${SD}/me/tickets/${id}/withdraw`, payload)
export const reopenMyTicket = (id, payload) => _post(`${SD}/me/tickets/${id}/reopen`, payload)
// Team-scoped assign — route a ticket to a teammate / direct report (or self).
export const managerAssignTicket = (id, payload) => _post(`${SD}/me/tickets/${id}/assign`, payload)
// Who the current user may route THIS ticket to (members of its team + my reports + me).
export const listTicketAssignees = (id) => _get(`${SD}/me/tickets/${id}/assignees`)
// Worker resolve / close (ITIL) from the My-Tickets side — assignee/team-member/agent.
export const resolveMyTicket = (id, payload) => _post(`${SD}/me/tickets/${id}/resolve`, payload || {})
// Collaborators (extra people who can see + work the ticket).
export const addMyCollaborator = (id, payload) => _post(`${SD}/me/tickets/${id}/collaborators`, payload)
export const removeMyCollaborator = (id, memberId) => _del(`${SD}/me/tickets/${id}/collaborators/${memberId}`)
// My direct reports (assignee pool) + active ticket categories readable by any employee.
export const listMyTeam = () => _get(`${SD}/me/tickets/team`)
export const listMyCategories = () => _get(`${SD}/me/tickets/categories`)
// A reporting manager's team board — direct reports' tickets (raised-by or assigned-to).
export const listMyTeamTickets = (params) => _get(`${SD}/me/tickets/team-tickets`, params)
// Team Operations Command Center (All Tickets) — backend-sealed: an agent sees only their
// team(s)' tickets + the triage pool routing to them + their own work; a superuser sees the
// whole desk. `stats` adds the F1 flag board, fastest-lap + per-agent squad load.
export const listCommandCenter = (params) => _get(`${SD}/me/tickets/command-center`, params)
export const fetchCommandCenterStats = (params) => _get(`${SD}/me/tickets/command-center/stats`, params)
// ── Team Ops desk (agent-side Team Tickets) ──
// Backend-sealed to tickets ROUTED TO the support team(s) the caller is on (member/lead;
// superuser: any team — out-of-scope team_id 403s, never leaks). The list is the ACTIVE
// working set (terminal + merged excluded; the untriaged pool stays on the Unassigned
// desk). `lens` = all|unassigned|mine|breaching|due_soon|idle|escalated|pending|critical.
// Rows carry `viewers` — live agent-collision pips (everyone ELSE with the ticket open).
// limit ≤ 100 (backend cap — never send more).
export const listTeamQueue = (params) => _get(`${SD}/me/tickets/team-queue`, params)
// Companion aggregate (lenses ≡ list): switcher chips w/ live load, per-agent roster
// telemetry (open/breaching/critical/due_soon/idle + aging buckets + resolved_7d/csat),
// queue totals, 14-day inflow/outflow, MTTR p50/p90 + FRT p50, leaderboard, collision
// hotspots, selected-team identity (lead/method/business_hours) + can_distribute.
export const fetchTeamQueueStats = (params) => _get(`${SD}/me/tickets/team-queue/stats`, params)
// First-class audited agent→agent HANDOFF. Body: { to_agent_id, reason_code?, note? }.
// Reach mirrors managerAssignTicket; 409 on terminal / already-owner; writes a dedicated
// 'handoff' timeline entry (from → to + coded reason).
export const handoffTicket = (id, payload) => _post(`${SD}/me/tickets/${id}/handoff`, payload)
// Round-robin / load-balanced spread of the team's unowned queue — team lead or superuser
// only. Body: { team_id, max_tickets? }. Returns { assigned, skipped, method, assignments }.
export const distributeTeamQueue = (payload) => _post(`${SD}/me/tickets/team-queue/distribute`, payload)
// Critical war-room aggregate — same team seal as the command center, computed over
// priority=critical ∪ major incidents (active/unacked/update-overdue/MTTA/MTTR/RCA-gap/squad).
export const fetchCriticalStats = (params) => _get(`${SD}/me/tickets/critical/stats`, params)
// ── Breached desk ("Time-Debt Meter") ──
// Team-sealed breached-desk aggregate — runs the breach-flag sweep server-side FIRST so
// idle tickets that silently passed their deadline are counted (lenses ≡ list). Fields:
// active_breached/by_kind/by_priority/by_age/total_debt_minutes/avg+max overage/at_risk/
// imminent/repaired_today/missing_rca/rca_coverage/squad/team_names.
export const fetchBreachedStats = (params) => _get(`${SD}/me/tickets/breached/stats`, params)
// ── Overdue desk ("Gravity Well") ──
// Team-sealed overdue-desk aggregate — open statuses, clock RUNNING, past the resolution
// and/or response target. Runs the breach-flag sweep server-side FIRST (lenses ≡ list).
// Fields: total/resolution_overdue/response_overdue/both_overdue/unassigned/not_escalated/
// critical/frozen_excluded/by_priority/by_status/by_late/total+avg+max late/oldest/
// at_risk/imminent/recovered_today/squad/team_names.
export const fetchOverdueStats = (params) => _get(`${SD}/me/tickets/overdue/stats`, params)
// ── Reopened desk ("Möbius Loop") ──
// Team-sealed reopened-desk aggregate — reopened is a LIFETIME marker (reopened_count>0),
// not a status: active = back on the desk now, re_resolved = off the loop again. Fields:
// total/active/re_resolved(+today)/chronic(+open)/unassigned/critical/re_breached/due_soon/
// max_reopens+worst/by_source/by_reason/by_priority/by_status/reopens_30d/resolved_30d/
// reopen_rate_30d/avg+max time-to-reopen/avg_cycle_age/squad/team_names.
export const fetchReopenedStats = (params) => _get(`${SD}/me/tickets/reopened/stats`, params)
// ── Resolved desk ("Closeout") ──
// Team-sealed closeout aggregate — two populations: the SHELF (status=resolved, inside the
// 3-day auto-close/reopen window) and the 30-day SURVIVING resolution record. Fields:
// resolved_now/pending_close/due_close_24h/overdue_close/soonest_auto_close_at/unrated_shelf/
// closed_total/resolved_today+7d+30d/trend[14d]/mttr avg+p50+p90+by_priority/avg_time_spent/
// fcr_30d(+pct)/reopens_30d/survived_30d/reopen_rate_30d/sla_met_30d(+pct)/csat avg+count+
// coverage+low+dist/by_resolution_code/by_root_cause/by_priority/leaderboard/squad/team_names.
// Opening it also runs the auto-close sweep, so the shelf is honest.
export const fetchResolvedStats = (params) => _get(`${SD}/me/tickets/resolved/stats`, params)
// ── Closed desk ("Archive of Record") ──
// Team-sealed archive aggregate — the terminal population (status=closed; merged tombstones
// count as records but are excluded from quality math). Fields: closed_today/7d/30d/total/
// resolved_waiting/by_close_source/merged_total/by_resolution_code/by_root_cause/by_priority/
// uncoded_30d/lifespan avg+p50+p90+by_priority/reopened_from_closed_30d/
// closure_survival_pct_30d/csat block/kb_candidates_30d/kb_promoted_total/follow_ups_30d/
// open_follow_ups/trend[12mo]/leaderboard/auto_closed_30d/team_count/team_names.
// Opening it also runs the auto-close sweep, so the archive is honest.
export const fetchClosedStats = (params) => _get(`${SD}/me/tickets/closed/stats`, params)
// Zendesk follow-up: spawn a linked continuation case from a TERMINAL ticket (409 on open
// tickets and on merged tombstones — follow up the master instead). Body: { description,
// subject?, priority?, ticket_type?, category_id?, tags?, assign_me? }. The child keeps
// the original requester and carries follow_up_of_id + an enriched follow_up_of_number.
export const createFollowUpTicket = (id, payload) => _post(`${SD}/tickets/${id}/follow-up`, payload)
// KCS promote: harvest a sealed resolution into a DRAFT knowledge article. Idempotent —
// a second call returns the SAME article; status is server-forced to draft (publishing
// stays an editorial/superuser act). 422 when the record has no resolution summary.
export const promoteTicketToKb = (id, payload) => _post(`${SD}/tickets/${id}/promote-article`, payload || {})
// Merge lineage for the closure certificate: masters walked UP merged_into_id + the
// duplicates folded INTO this ticket.
export const fetchMergeChain = (id) => _get(`${SD}/tickets/${id}/merge-chain`)
// ── Archived desk ("Deep Storage") ──
// Team-sealed tombstone aggregate (superuser = whole desk). Fields: archived_today/7d/30d/
// total_archived/restored_30d/by_reason_code/by_status_at_archive/by_priority/open_at_archive/
// uncoded/age_cohorts/dormancy_p50_minutes/oldest_archived_at/purge_eligible_count/
// expiring_soon_count/legal_hold_count/auto_archived_30d/retention_days/autoarchive_days/
// trend[12mo archived+restored]/top_archivers/restored_by_30d/team_count/team_names.
// Opening it also runs the retention sweep (closed → auto-archive), so the shelf is honest.
export const fetchArchivedStats = (params) => _get(`${SD}/me/tickets/archived/stats`, params)
// PERMANENT destruction — superuser only, typed-confirmation UI. 409 unless the record is
// archived + past the retention window + not legal-held + not a merge master.
export const purgeTicket = (id, reason) =>
  axios.delete(`${API}${SD}/tickets/${id}/purge`,
    { headers: authHeader(), params: reason ? { reason } : undefined }).then(r => r.data)
// Legal hold: { hold: true|false, note? }. Any agent places; only a superuser releases
// (403). A held record is exempt from the retention sweep and can never be purged.
export const setLegalHold = (id, payload) => _post(`${SD}/tickets/${id}/legal-hold`, payload)
// Server-side bulk restore/hold (per-ticket guards, team-sealed, one transaction).
export const bulkRestoreTickets = (ids, note) => bulkTickets({ ids, action: 'restore', note: note || undefined })
export const bulkLegalHold = (ids, hold, note) => bulkTickets({ ids, action: 'legal_hold', hold, note: note || undefined })

// Archive-reason taxonomy — mirrors the backend ArchiveReason enum. tone drives the chip
// tint on the Deep Storage desk ('auto_retention' is display-only: the sweep writes it).
export const PURGE_RETENTION_DAYS = 180
export const AUTO_ARCHIVE_DAYS = 120
export const ARCHIVE_REASON_CODES = [
  { value: 'spam',                  label: 'Spam',                  short: 'SPAM',      tone: 'purge' },
  { value: 'duplicate',             label: 'Duplicate',             short: 'DUPE',      tone: 'bronze' },
  { value: 'created_in_error',      label: 'Created in error',      short: 'ERROR',     tone: 'hold' },
  { value: 'test_ticket',           label: 'Test ticket',           short: 'TEST',      tone: 'deep' },
  { value: 'resolved_off_platform', label: 'Resolved off-platform', short: 'OFF-PLAT',  tone: 'restore' },
  { value: 'obsolete',              label: 'Obsolete',              short: 'OBSOLETE',  tone: 'core' },
  { value: 'compliance',            label: 'Compliance',            short: 'LEGAL',     tone: 'hold' },
  { value: 'auto_retention',        label: 'Retention sweep',       short: 'RETENTION', tone: 'deep' },
  { value: 'other',                 label: 'Other',                 short: 'OTHER',     tone: 'core' },
]
// Coded reason of a (possibly legacy) tombstone: prefers the stored code, falls back to
// mapping the old free-text presets, else 'uncoded' (archived before the taxonomy existed).
export const archiveReasonOf = (t) => {
  if (t?.archive_reason_code) return t.archive_reason_code
  const legacy = String(t?.archive_reason || t?.delete_reason || '').trim().toLowerCase()
  const map = {
    'spam': 'spam', 'test ticket': 'test_ticket', 'duplicate': 'duplicate',
    'created in error': 'created_in_error', 'resolved off-platform': 'resolved_off_platform',
  }
  if (map[legacy]) return map[legacy]
  return legacy ? 'other' : 'uncoded'
}
export const archiveReasonLabel = (v) =>
  ARCHIVE_REASON_CODES.find(r => r.value === v)?.label
  || (v === 'uncoded' ? 'Uncoded' : String(v || '').replace(/_/g, ' ') || '—')
export const archiveReasonShort = (v) =>
  ARCHIVE_REASON_CODES.find(r => r.value === v)?.short || 'UNCODED'
export const archiveReasonTone = (v) =>
  ARCHIVE_REASON_CODES.find(r => r.value === v)?.tone || 'deep'

// Closure-source taxonomy — mirrors the backend's mutually-exclusive buckets
// (merged > withdrawn > no_response > auto_sweep > manual), so a lens/filter always
// paginates exactly the population the stat counted.
export const CLOSE_SOURCES = [
  { value: 'manual', label: 'Closed by agent', short: 'MANUAL' },
  { value: 'auto_sweep', label: 'Auto-sealed (3-day sweep)', short: 'AUTO-SEAL' },
  { value: 'merged', label: 'Merged duplicate', short: 'MERGED' },
  { value: 'withdrawn', label: 'Withdrawn by requester', short: 'WITHDRAWN' },
  { value: 'no_response', label: 'Closed for no response', short: 'NO REPLY' },
]
// Team Ops handoff taxonomy — mirrors backend HANDOFF_REASON_CODES (constants.py).
export const HANDOFF_REASONS = [
  { value: 'workload_balance', label: 'Workload balance', desc: 'Spreading an overloaded queue' },
  { value: 'expertise', label: 'Expertise', desc: 'Teammate owns this skill or domain' },
  { value: 'availability', label: 'Availability', desc: 'Owner OOO / off-shift / on leave' },
  { value: 'shift_change', label: 'Shift change', desc: 'End-of-shift handover' },
  { value: 'customer_request', label: 'Customer request', desc: 'Requester asked for someone else' },
  { value: 'escalation_prep', label: 'Escalation prep', desc: 'Staging for a tier lift' },
  { value: 'other', label: 'Other', desc: 'Anything else — say why in the note' },
]
export const handoffReasonLabel = (v) => (HANDOFF_REASONS.find(r => r.value === v) || {}).label || v
export const closeSourceOf = (t) => {
  if (!t) return 'manual'
  if (t.merged_into_id) return 'merged'
  if (t.resolution_code === 'cancelled') return 'withdrawn'
  if (t.resolution_code === 'no_response') return 'no_response'
  return t.closed_by_id ? 'manual' : 'auto_sweep'
}
export const closeSourceLabel = (v) => (CLOSE_SOURCES.find(s => s.value === v) || {}).label || v
// Accountability ping to the ASSIGNED AGENT of a late ticket (requester reminders ride
// /remind instead). Backend guards: team-sealed, 409 on unowned/terminal/self/24h-throttle.
export const nudgeTicketOwner = (id, payload = {}) => _post(`${SD}/tickets/${id}/nudge-owner`, payload)
// Bulk owner-nudge = client loop (mirrors bulkRemind): per-ticket eligibility is enforced
// server-side; 409s (throttled/self/unowned) count separately so the toast stays honest.
export async function bulkNudgeOwners (ids, message) {
  let ok = 0, skipped = 0, failed = 0
  for (const id of ids) {
    try { await nudgeTicketOwner(id, message ? { message } : {}); ok++ }
    catch (e) { (e?.response?.status === 409 ? skipped++ : failed++) }
  }
  return { ok, skipped, failed }
}
// Pause-aware minutes past the resolution target (frozen at sla_paused_since while the
// clock is stopped). 0 when un-breached / no deadline.
export const breachOverageMinutes = (t, ref) => {
  const due = t?.resolution_due_at ? new Date(t.resolution_due_at).getTime() : null
  if (!due) return 0
  const end = t?.resolved_at ? new Date(t.resolved_at).getTime()
    : t?.sla_paused_since ? new Date(t.sla_paused_since).getTime()
    : (ref ?? Date.now())
  return Math.max(0, Math.floor((end - due) / 60000))
}
// Worst (earliest) breach stamp for a ticket — resolution wins, falls back to due dates.
export const breachStampOf = (t) =>
  t?.sla_resolution_breached_at || t?.sla_response_breached_at ||
  (t?.sla_resolution_breached ? t?.resolution_due_at : null) ||
  (t?.sla_response_breached ? t?.response_due_at : null) || null
export const breachAgeBucket = (t, ref) => {
  const st = breachStampOf(t)
  if (!st) return null
  const h = ((ref ?? Date.now()) - new Date(st).getTime()) / 3600000
  return h < 2 ? '<2h' : h < 8 ? '2-8h' : h < 24 ? '8-24h' : '>24h'
}
export const BREACH_KINDS = [
  { value: 'response', label: 'Response missed' },
  { value: 'resolution', label: 'Resolution missed' },
  { value: 'both', label: 'Both targets missed' },
]
// Coded breach-reason taxonomy for the RCA console (mirrors RootCauseCategory + the
// desk's own operational causes; breach_reason stays a free-form String(240) server-side).
export const BREACH_REASONS = [
  { value: 'understaffed', label: 'Understaffed / no coverage' },
  { value: 'misrouted', label: 'Misrouted / wrong team' },
  { value: 'awaiting_customer', label: 'Customer response lag' },
  { value: 'vendor', label: 'Vendor / third party' },
  { value: 'complexity', label: 'Underestimated complexity' },
  { value: 'configuration', label: 'Configuration / environment' },
  { value: 'hardware', label: 'Hardware failure' },
  { value: 'software', label: 'Software defect' },
  { value: 'network', label: 'Network outage' },
  { value: 'other', label: 'Other' },
]
// Unassigned intake queue ("Claim Field") — backend-sealed to the caller's CLAIMABLE POOL
// only (their team(s)' unowned tickets + the triage pool routing to their teams). Excludes
// tickets they merely raised that route elsewhere; superuser sees the whole desk.
// Params: { lane:'all'|'team'|'triage', q, priority, ticket_type, team_id, sort_by, sort_dir, page, limit }.
export const listUnassignedQueue = (params) => _get(`${SD}/me/tickets/unassigned-queue`, params)
export const fetchUnassignedQueueStats = () => _get(`${SD}/me/tickets/unassigned-queue/stats`)
// Guided-mode atomic claim — server picks the top-ranked unowned ticket in scope, assigns
// it to me (stamping its team if untriaged) and returns it; 404 when the queue is empty.
// Body: { lane?, team_id? } (send {} for the whole pool).
export const claimNextTicket = (payload = {}) => _post(`${SD}/me/tickets/claim-next`, payload)
// Deliberate single-ticket claim (eligibility-enforced server-side: caller must be on a
// team that handles the ticket's request type). Body: { note? }.
export const claimTicket = (id, payload = {}) => _post(`${SD}/me/tickets/${id}/claim`, payload)
// Read-only intake intelligence for the create page: which team WOULD handle this
// classification, a real SLA forecast, and whether the current user is on that team
// (can self-claim). Params: { category_id, ticket_type, organization_id, priority, sla_package_id }.
export const routingPreview = (params) => _get(`${SD}/me/tickets/routing-preview`, params)
export const listMyKb = (params) => _get(`${SD}/me/knowledge-base`, params)
export const listMyKbCategories = () => _get(`${SD}/me/knowledge-base/categories`)
export const getMyArticle = (id) => _get(`${SD}/me/knowledge-base/${id}`)
export const listMyAnnouncements = () => _get(`${SD}/me/announcements`)

/* ─────────────────────────── Phase 3 — workspace entities ─────────────────────────── */
export const listTeams = (params) => _get(`${SD}/teams/`, params)
// Assignable agent pool (active support agents / superusers) — for team + assignee pickers.
export const listSupportAgents = () => _get(`${SD}/teams/agents`)
// Full employee directory for building a team (members = employees, with role badges).
export const listTeamPeople = (params) => _get(`${SD}/teams/people`, params)
// Support teams the current user belongs to (member or lead) — user-panel team board.
export const listMyTeams = () => _get(`${SD}/teams/mine`)
export const createTeam = (p) => _post(`${SD}/teams/`, p)
// PATCH may 409 with a STRUCTURED detail ({error, message, members[]/counts}) when the
// update removes members who still own active team tickets or deactivates a loaded team.
// Resolve member removal by resending with { reassign_strategy: 'auto'|'unassign'|'reassign',
// reassign_to? } — the backend re-seats the orphaned tickets atomically with the save.
export const updateTeam = (id, p) => _patch(`${SD}/teams/${id}`, p)
export const deleteTeam = (id) => _del(`${SD}/teams/${id}`)

/* ── Team Command (admin oversight desk) — all on /teams/*, never /me/* ── */
// One-call fleet board: per-team live counts (the SAME lens math as the agent Squad
// Command desk, so both panels reconcile), workload spread, 7d MTTR/FRT p50, 30d CSAT,
// escalations-in, business-hours coverage + a 7-day inflow/outflow spark, plus a
// `totals` rollup for the hero console. Superuser = whole fleet; agents = own teams.
export const fetchTeamsOverview = (params) => _get(`${SD}/teams/overview`, params)
// Per-team drill (switcher/roster/flow/leaderboard/hotspots) — thin admin delegate of
// the agent desk's team-queue/stats, so the two panels can never drift.
export const fetchTeamStats = (id) => _get(`${SD}/teams/${id}/stats`)
// Drill ledger with the same lens vocabulary as the stats (all|unassigned|breaching|
// due_soon|idle|escalated|pending|critical) — counts reconcile by construction.
export const listTeamTickets = (id, params) => _get(`${SD}/teams/${id}/tickets`, params)
// Admin rebalance — the audited distribute single-writer (method + rr cursor honoured,
// capped, per-ticket activity + notification). Body: { max_tickets? }.
export const rebalanceTeam = (id, payload) => _post(`${SD}/teams/${id}/rebalance`, payload || {})
// Preflight for the edit wizard: active tickets still owned by members about to be
// removed — the same helper that powers the PATCH 409, so warning === guard.
export const fetchTeamMemberImpact = (id, removeIds) =>
  _get(`${SD}/teams/${id}/member-impact`, { remove: (removeIds || []).join(',') })

export const listQueues = (params) => _get(`${SD}/queues/`, params)
export const createQueue = (p) => _post(`${SD}/queues/`, p)
export const updateQueue = (id, p) => _patch(`${SD}/queues/${id}`, p)
export const deleteQueue = (id) => _del(`${SD}/queues/${id}`)

export const listSavedViews = (params) => _get(`${SD}/saved-views/`, params)
export const createSavedView = (p) => _post(`${SD}/saved-views/`, p)
export const updateSavedView = (id, p) => _patch(`${SD}/saved-views/${id}`, p)
export const deleteSavedView = (id) => _del(`${SD}/saved-views/${id}`)

export const listTemplates = (params) => _get(`${SD}/ticket-templates/`, params)
export const createTemplate = (p) => _post(`${SD}/ticket-templates/`, p)
// params (optional) → { reason, note } become query args the backend folds into
// the audit trail on lifecycle/delete transitions.
export const updateTemplate = (id, p, params) => _patch(`${SD}/ticket-templates/${id}`, p, params)
export const deleteTemplate = (id, params) => _del(`${SD}/ticket-templates/${id}`, params)
/* ─── Template Studio ("Copperplate") — lifecycle / analytics / apply ───
   getTemplate returns the detail shape (adds revisions). applyTemplate records
   ONE use server-side and returns the render-ready prefill payload — the caller
   must strip its ?template= query param immediately so refresh can't double-count. */
export const getTemplate = (id) => _get(`${SD}/ticket-templates/${id}`)
export const cloneTemplate = (id) => _post(`${SD}/ticket-templates/${id}/clone`, {})
export const applyTemplate = (id) => _post(`${SD}/ticket-templates/${id}/apply`, {})
export const fetchTemplateStats = () => _get(`${SD}/ticket-templates/stats`)
/* ─── Agent Template Desk ("Projection Room") — favorites + run-on-ticket macros ───
   toggleTemplateFavorite flips the caller's per-user star (distinct from the admin's
   GLOBAL pinned flag). runTemplateOnTicket is the Zendesk-style macro: body arrives
   RENDERED (templateVariables.js substitution, agent-reviewed) and lands as an
   internal note or public reply; usage counts server-side as kind='macro' — do NOT
   also call applyTemplate for a macro run. */
export const toggleTemplateFavorite = (id) => _post(`${SD}/ticket-templates/${id}/favorite`, {})
export const runTemplateOnTicket = (ticketId, tplId, p) =>
  _post(`${SD}/me/tickets/${ticketId}/run-template/${tplId}`, p)

export const fetchTicketCalendar = (params) => _get(`${SD}/tickets/calendar`, params)
// CSV export — returns a Blob (auth-aware); caller triggers the download.
export const exportTicketsCsv = async (params) => {
  const res = await axios.get(`${API}${SD}/tickets/export`, { headers: authHeader(), params, responseType: 'blob' })
  return res.data
}

/* ─────────────────────────── Chrono Desk (agent calendar) ───────────────────────────
   ONE sealed request per navigation: typed events + zero-filled local-day buckets +
   HR holidays + team business hours + meta. tz_offset guards the UTC→local off-by-one
   (JS getTimezoneOffset is minutes WEST of UTC; the backend wants minutes EAST). */
export const fetchMyCalendar = (params) =>
  _get(`${SD}/me/tickets/calendar`, { tz_offset: -new Date().getTimezoneOffset(), ...params })
// ICS export — auth-aware Blob; caller triggers the download (never a token in a URL).
export const exportMyCalendarIcs = async (params) => {
  const res = await axios.get(`${API}${SD}/me/tickets/calendar/export.ics`,
    { headers: authHeader(), params, responseType: 'blob' })
  return res.data
}
export const listMyReminders = (params) => _get(`${SD}/me/tickets/reminders`, params)
export const createMyReminder = (p) => _post(`${SD}/me/tickets/reminders`, p)
export const updateMyReminder = (id, p) => _patch(`${SD}/me/tickets/reminders/${id}`, p)
export const deleteMyReminder = (id) => _del(`${SD}/me/tickets/reminders/${id}`)

/* Kind → token/label vocabulary for the Chrono Desk (single source for legend chips,
   day-cell dots, peek rows and the instrument — components must not invent hues). */
export const CAL_KINDS = [
  { value: 'resolution_due', label: 'Resolution due',  short: 'Due',      token: 'core' },
  { value: 'response_due',   label: 'First response',  short: 'Respond',  token: 'ember' },
  { value: 'escalation_ack', label: 'Escalation ACK',  short: 'Esc ACK',  token: 'rose' },
  { value: 'cadence_due',    label: 'Update cadence',  short: 'Update',   token: 'gold' },
  { value: 'hold_resume',    label: 'Hold resumes',    short: 'Resume',   token: 'resume' },
  { value: 'vendor_due',     label: 'Vendor reply',    short: 'Vendor',   token: 'stone' },
  { value: 'auto_close',     label: 'Auto-close',      short: 'Auto',     token: 'moon' },
  { value: 'reminder',       label: 'My reminders',    short: 'Pin',      token: 'pin' },
]
export const CAL_HISTORY_KINDS = [
  { value: 'created',  label: 'Opened',   short: 'Opened',   token: 'moon' },
  { value: 'resolved', label: 'Resolved', short: 'Resolved', token: 'pin' },
  { value: 'closed',   label: 'Closed',   short: 'Closed',   token: 'stone' },
]
export const calKindMeta = (kind) =>
  CAL_KINDS.find(k => k.value === kind) || CAL_HISTORY_KINDS.find(k => k.value === kind)
  || { value: kind, label: kind, short: kind, token: 'moon' }

/* ─────────────────────────── Masters ─────────────────────────── */
export const listOrganizations = (params) => _get(`${SD}/organizations/`, params)
export const getOrganization = (id) => _get(`${SD}/organizations/${id}`)
export const createOrganization = (p) => _post(`${SD}/organizations/`, p)
export const updateOrganization = (id, p) => _patch(`${SD}/organizations/${id}`, p)
export const deleteOrganization = (id) => _del(`${SD}/organizations/${id}`)

export const listCustomers = (params) => _get(`${SD}/customers/`, params)
export const createCustomer = (p) => _post(`${SD}/customers/`, p)
export const updateCustomer = (id, p) => _patch(`${SD}/customers/${id}`, p)
export const deleteCustomer = (id) => _del(`${SD}/customers/${id}`)

export const listContracts = (params) => _get(`${SD}/contracts/`, params)
export const createContract = (p) => _post(`${SD}/contracts/`, p)
export const updateContract = (id, p) => _patch(`${SD}/contracts/${id}`, p)
export const deleteContract = (id) => _del(`${SD}/contracts/${id}`)

export const listSlaPackages = () => _get(`${SD}/sla-packages/`)
export const createSlaPackage = (p) => _post(`${SD}/sla-packages/`, p)
export const updateSlaPackage = (id, p) => _patch(`${SD}/sla-packages/${id}`, p)
export const deleteSlaPackage = (id) => _del(`${SD}/sla-packages/${id}`)

export const listCategories = () => _get(`${SD}/categories/`)
export const createCategory = (p) => _post(`${SD}/categories/`, p)
export const updateCategory = (id, p) => _patch(`${SD}/categories/${id}`, p)
export const deleteCategory = (id) => _del(`${SD}/categories/${id}`)

/* ─────────────────────────── KB + Service Catalog ─────────────────────────── */
export const listKbCategories = () => _get(`${SD}/kb-categories/`)
export const createKbCategory = (p) => _post(`${SD}/kb-categories/`, p)
export const listArticles = (params) => _get(`${SD}/articles/`, params)
export const createArticle = (p) => _post(`${SD}/articles/`, p)
export const updateArticle = (id, p) => _patch(`${SD}/articles/${id}`, p)
export const deleteArticle = (id) => _del(`${SD}/articles/${id}`)
export const listServiceItems = () => _get(`${SD}/service-items/`)
export const createServiceItem = (p) => _post(`${SD}/service-items/`, p)
export const updateServiceItem = (id, p) => _patch(`${SD}/service-items/${id}`, p)
export const listServiceRequests = (params) => _get(`${SD}/service-requests/`, params)
export const updateServiceRequest = (id, p) => _patch(`${SD}/service-requests/${id}`, p)

/* ─────────────────────────── ITIL ─────────────────────────── */
export const listChangeRequests = (params) => _get(`${SD}/change-requests/`, params)
export const createChangeRequest = (p) => _post(`${SD}/change-requests/`, p)
export const updateChangeRequest = (id, p) => _patch(`${SD}/change-requests/${id}`, p)
export const deleteChangeRequest = (id) => _del(`${SD}/change-requests/${id}`)
export const listProblems = (params) => _get(`${SD}/problems/`, params)
export const createProblem = (p) => _post(`${SD}/problems/`, p)
export const updateProblem = (id, p) => _patch(`${SD}/problems/${id}`, p)
export const listCustomerAssets = (params) => _get(`${SD}/customer-assets/`, params)
export const createCustomerAsset = (p) => _post(`${SD}/customer-assets/`, p)
export const updateCustomerAsset = (id, p) => _patch(`${SD}/customer-assets/${id}`, p)
export const deleteCustomerAsset = (id) => _del(`${SD}/customer-assets/${id}`)

/* ─────────────────────────── Ops ─────────────────────────── */
export const listAnnouncements = (params) => _get(`${SD}/announcements/`, params)
export const createAnnouncement = (p) => _post(`${SD}/announcements/`, p)
export const updateAnnouncement = (id, p) => _patch(`${SD}/announcements/${id}`, p)
export const deleteAnnouncement = (id) => _del(`${SD}/announcements/${id}`)
export const listAutomationRules = () => _get(`${SD}/automation-rules/`)
export const createAutomationRule = (p) => _post(`${SD}/automation-rules/`, p)
export const updateAutomationRule = (id, p) => _patch(`${SD}/automation-rules/${id}`, p)
export const deleteAutomationRule = (id) => _del(`${SD}/automation-rules/${id}`)
export const listSettings = () => _get(`${SD}/settings/`)
export const upsertSetting = (p) => _put(`${SD}/settings/`, p)
export const listAuditLogs = (params) => _get(`${SD}/audit-logs/`, params)

/* ─────────────────────────── Public client portal (no auth) ─────────────────────────── */
// These hit the no-auth /public/support/* endpoints; we deliberately send NO
// Authorization header (a visitor has no token; the org code / token are the gate).
export const publicSubmitTicket = (payload) => axios.post(`${API}/public/support/tickets`, payload).then(r => r.data)
export const publicGetTicket = (token) => axios.get(`${API}/public/support/tickets/${token}`).then(r => r.data)
export const publicReplyTicket = (token, payload) => axios.post(`${API}/public/support/tickets/${token}/comments`, payload).then(r => r.data)

/* ─────────────────────────── current user ─────────────────────────── */
export const getMe = () => _get('/auth/me')

/* ─────────────────────────── Attachment upload ───────────────────────────
   Reuses the generic /uploads/file endpoint (PDF + images, ≤5MB). Returns a
   normalized attachment object suitable for a ticket's attachments[] JSON. */
export async function uploadSupportFile(file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await axios.post(`${API}/uploads/file`, fd, { headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' } })
  const d = res.data || {}
  return { name: d.original_filename || file.name, url: d.file_url, file_url: d.file_url, size: d.file_size || file.size }
}

/* ─────────────────────────── Picker cache (categories/orgs/sla) ─────────────────────────── */
const pickers = reactive({ categories: [], organizations: [], slaPackages: [], loaded: false, loading: false })
let _inflight = null

export async function loadPickers(force = false) {
  if (pickers.loaded && !force) return pickers
  if (_inflight) return _inflight
  pickers.loading = true
  _inflight = (async () => {
    try {
      const empty = []
      const [cats, orgs, slas] = await Promise.all([
        // Agents get the full admin list; a plain requester 403s → fall back to the
        // employee-readable /me categories so the Category dropdown is never empty.
        listCategories().catch(() => listMyCategories().catch(() => empty)),
        listOrganizations().catch(() => empty),
        listSlaPackages().catch(() => empty),
      ])
      pickers.categories = cats || []
      pickers.organizations = orgs || []
      pickers.slaPackages = slas || []
      pickers.loaded = true
    } finally {
      pickers.loading = false
      _inflight = null
    }
    return pickers
  })()
  return _inflight
}

export function usePickers() { return pickers }

/* ─────────────────────────── Display constants ─────────────────────────── */
export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'critical', label: 'Critical' },
]
export const TICKET_TYPES = [
  { value: 'incident', label: 'Incident' },
  { value: 'service_request', label: 'Service Request' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'change', label: 'Change' },
  { value: 'problem', label: 'Problem' },
  { value: 'training', label: 'Training' },
  { value: 'implementation', label: 'Implementation Support' },
]
export const SOURCES = [
  { value: 'portal', label: 'Portal' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'chat', label: 'Chat' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'api', label: 'API' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'internal', label: 'Internal' },
]
export const TICKET_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_customer', label: 'Pending Customer' },
  { value: 'pending_vendor', label: 'Pending Vendor' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export const statusLabel = (v) => (TICKET_STATUSES.find(s => s.value === v)?.label || v)
export const priorityLabel = (v) => (PRIORITIES.find(p => p.value === v)?.label || v)
export const typeLabel = (v) => (TICKET_TYPES.find(t => t.value === v)?.label || v)

/* ── Colour/meta maps (CSS-var tokens; resolve under whichever page palette) ── */
export const PRIORITY_META = {
  low: { label: 'Low', color: 'var(--sd-pri-low)' },
  medium: { label: 'Medium', color: 'var(--sd-pri-medium)' },
  high: { label: 'High', color: 'var(--sd-pri-high)' },
  urgent: { label: 'Urgent', color: 'var(--sd-pri-urgent)' },
  critical: { label: 'Critical', color: 'var(--sd-pri-critical)' },
}
export const STATUS_META = {
  open: { label: 'Open', color: 'var(--sd-st-open)' },
  in_progress: { label: 'In Progress', color: 'var(--sd-st-progress)' },
  pending_customer: { label: 'Pending Customer', color: 'var(--sd-st-pending)' },
  pending_vendor: { label: 'Pending Vendor', color: 'var(--sd-st-pending)' },
  on_hold: { label: 'On Hold', color: 'var(--sd-st-hold)' },
  escalated: { label: 'Escalated', color: 'var(--sd-st-escalated)' },
  resolved: { label: 'Resolved', color: 'var(--sd-st-resolved)' },
  closed: { label: 'Closed', color: 'var(--sd-st-closed)' },
}
export const priorityColor = (v) => PRIORITY_META[v]?.color || 'var(--sd-steel)'
export const statusColor = (v) => STATUS_META[v]?.color || 'var(--sd-steel)'

/* ── Workbench vocabularies (ITIL triage + resolve) — mirror the backend enums ── */
export const IMPACT_URGENCY = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]
export const RESOLUTION_CODES = [
  { value: 'solved', label: 'Solved' },
  { value: 'workaround', label: 'Workaround provided' },
  { value: 'no_fault_found', label: 'No fault found' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'not_reproducible', label: 'Not reproducible' },
  { value: 'configuration', label: 'Configuration change' },
  { value: 'known_error', label: 'Known error' },
  { value: 'cancelled', label: 'Cancelled by requester' },
  { value: 'no_response', label: 'No customer response' },
]
export const ROOT_CAUSES = [
  { value: 'hardware', label: 'Hardware' },
  { value: 'software', label: 'Software' },
  { value: 'network', label: 'Network' },
  { value: 'user_error', label: 'User error' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'configuration', label: 'Configuration' },
  { value: 'other', label: 'Other' },
]
export const resolutionLabel = (v) => RESOLUTION_CODES.find(r => r.value === v)?.label || v
export const rootCauseLabel = (v) => ROOT_CAUSES.find(r => r.value === v)?.label || v

/* ── Impact × Urgency → Priority matrix (mirrors backend IMPACT_URGENCY_MATRIX) ──
   Both axes use low|medium|high|critical; the derived priority is one of our
   priorities (critical=P1, high=P2, medium=P3, low=P4). */
export const IMPACT_URGENCY_MATRIX = {
  critical: { critical: 'critical', high: 'critical', medium: 'high', low: 'medium' },
  high: { critical: 'critical', high: 'high', medium: 'medium', low: 'low' },
  medium: { critical: 'high', high: 'high', medium: 'medium', low: 'low' },
  low: { critical: 'medium', high: 'medium', medium: 'low', low: 'low' },
}
export const priorityFromMatrix = (impact, urgency) =>
  (impact && urgency) ? (IMPACT_URGENCY_MATRIX[urgency]?.[impact] || null) : null
// P-code label for display (P1 = most severe).
export const PRIORITY_P = { critical: 'P1', urgent: 'P2', high: 'P2', medium: 'P3', low: 'P4' }
export const priorityP = (v) => PRIORITY_P[v] || ''
// Resolved ticket reopen window before auto-close (mirrors SUPPORT_RESOLVED_AUTOCLOSE_DAYS).
export const SUPPORT_AUTOCLOSE_DAYS = 3
// Pending-customer silence thresholds (mirror backend PENDING_AUTO_CLOSE_DAYS / PENDING_WARN_DAYS).
// The desk derives silence buckets + auto-close ETA client-side; the backend `auto_close_at`
// field is authoritative when present.
export const PENDING_AUTOCLOSE_DAYS = 7
export const PENDING_WARN_DAYS = 4
// On-hold governance thresholds (mirror backend STALE_HOLD_DAYS): a hold with no release
// date and no review past this many days is flagged stale; backend `hold_stale` is
// authoritative when present.
export const STALE_HOLD_DAYS = 7

/* ── Hold-reason taxonomy (mirrors backend HoldReason / HOLD_REASON_CODES). The coded
   category drives the Suspension Dock's reason analytics; free-text detail rides along
   in hold_reason. `tone` picks the crate-tag tint on the dock. ── */
export const HOLD_REASON_CODES = [
  { value: 'awaiting_approval', label: 'Awaiting approval', short: 'APPROVAL' },
  { value: 'awaiting_change', label: 'Awaiting change window', short: 'CHANGE' },
  { value: 'awaiting_parts', label: 'Awaiting parts', short: 'PARTS' },
  { value: 'awaiting_third_party', label: 'Awaiting third party', short: '3RD PARTY' },
  { value: 'customer_requested', label: 'Customer requested', short: 'CUSTOMER' },
  { value: 'internal_review', label: 'Internal review', short: 'REVIEW' },
  { value: 'scheduled_maintenance', label: 'Scheduled maintenance', short: 'MAINT' },
  { value: 'legal_compliance', label: 'Legal / compliance', short: 'LEGAL' },
  { value: 'other', label: 'Other', short: 'OTHER' },
]
export const holdReasonLabel = (v) => HOLD_REASON_CODES.find(r => r.value === v)?.label || (v ? String(v).replace(/_/g, ' ') : 'Unspecified')
export const holdReasonShort = (v) => HOLD_REASON_CODES.find(r => r.value === v)?.short || 'HOLD'

/* ── Reopen vocabulary (mirrors backend ReopenSource / ReopenReason /
   CHRONIC_REOPEN_THRESHOLD). reason_code = the coded verdict on the failed fix
   (reopen_reason stays the free-text detail); source = who kicked the ticket back. ── */
export const CHRONIC_REOPEN_THRESHOLD = 2
export const REOPEN_SOURCES = [
  { value: 'requester', label: 'Requester', short: 'REQUESTER' },
  { value: 'agent', label: 'Agent', short: 'AGENT' },
  { value: 'portal', label: 'Customer reply', short: 'PORTAL' },
  { value: 'auto', label: 'Automation', short: 'AUTO' },
]
export const REOPEN_REASON_CODES = [
  { value: 'not_fixed', label: 'Not fixed', short: 'NOT FIXED' },
  { value: 'recurred', label: 'Issue recurred', short: 'RECURRED' },
  { value: 'partial_fix', label: 'Partial fix', short: 'PARTIAL' },
  { value: 'wrong_resolution', label: 'Wrong resolution', short: 'WRONG FIX' },
  { value: 'premature_closure', label: 'Closed too early', short: 'PREMATURE' },
  { value: 'new_info', label: 'New information', short: 'NEW INFO' },
  { value: 'customer_unsatisfied', label: 'Customer unsatisfied', short: 'UNSATISFIED' },
  { value: 'follow_up', label: 'Follow-up work', short: 'FOLLOW-UP' },
  { value: 'other', label: 'Other', short: 'OTHER' },
]
export const reopenReasonLabel = (v) => REOPEN_REASON_CODES.find(r => r.value === v)?.label || (v ? String(v).replace(/_/g, ' ') : 'Uncoded')
export const reopenReasonShort = (v) => REOPEN_REASON_CODES.find(r => r.value === v)?.short || 'UNCODED'
export const reopenSourceLabel = (v) => REOPEN_SOURCES.find(s => s.value === v)?.label || (v ? String(v).replace(/_/g, ' ') : 'Unrecorded')

/* ── Escalation vocabulary (mirrors backend EscalationType / EscalationReason) ── */
export const ESCALATION_TYPES = [
  { value: 'hierarchical', label: 'Hierarchical', desc: 'Up the tiers — same team, higher authority' },
  { value: 'functional', label: 'Functional', desc: 'Sideways — to a specialist team' },
]
export const ESCALATION_REASON_CODES = [
  { value: 'sla_risk', label: 'SLA at risk', short: 'SLA RISK' },
  { value: 'sla_breach', label: 'SLA breached', short: 'BREACH' },
  { value: 'customer_request', label: 'Customer request', short: 'CUSTOMER' },
  { value: 'complexity', label: 'Complexity', short: 'COMPLEX' },
  { value: 'expertise', label: 'Needs a specialist', short: 'EXPERT' },
  { value: 'vendor_stall', label: 'Vendor stalled', short: 'VENDOR' },
  { value: 'repeat_incident', label: 'Repeat incident', short: 'REPEAT' },
  { value: 'vip', label: 'VIP / executive visibility', short: 'VIP' },
  { value: 'major_incident', label: 'Major incident', short: 'MI' },
  { value: 'other', label: 'Other', short: 'OTHER' },
]
export const escReasonLabel = (v) => ESCALATION_REASON_CODES.find(r => r.value === v)?.label || (v ? String(v).replace(/_/g, ' ') : 'Unspecified')
export const escReasonShort = (v) => ESCALATION_REASON_CODES.find(r => r.value === v)?.short || 'ESC'
// The escalated desk flags an escalation "stalled at tier" past this dwell (hours).
export const STALE_ESCALATION_HOURS = 24

/* ── Bulk client-side reminder loop — the /bulk endpoint has no `remind` action, so a
   "nudge selected" fans out one-per-ticket remind() calls (the merge-loop pattern). Returns
   { ok, failed }. ── */
export const bulkRemind = async (ids, message) => {
  let ok = 0, failed = 0
  for (const id of ids) {
    try { await remindTicket(id, message ? { message } : {}); ok++ } catch { failed++ }
  }
  return { ok, failed }
}

/* ── Agent-aware list: agents/superusers see the org-wide desk; plain employees
   see their own involvement via /me — so the SAME scoped page works on both panels.
   `agent` is decided by the workspace via detectSupportAgent(). ── */
export const listScoped = ({ agent = false, ...params } = {}) =>
  (agent ? listTickets(params) : listMyTickets(params))

/* ─────────────────────────── Vendor Relay Station (pending-vendor lifecycle) ───────────────────────────
   Agent-side endpoints (get_support_agent). The Pending Vendor console gates every vendor
   action behind `agent`, so a plain requester never reaches these. */
export const vendorDispatch = (id, payload) => _post(`${SD}/tickets/${id}/vendor-dispatch`, payload || {})
export const vendorChase = (id, payload) => _post(`${SD}/tickets/${id}/vendor-chase`, payload || {})
export const vendorReply = (id, payload) => _post(`${SD}/tickets/${id}/vendor-reply`, payload)
export const fetchVendorScorecard = () => _get(`${SD}/tickets/vendor-scorecard`)
// Bulk vendor ops ride the shared /bulk endpoint (per-ticket eligibility-guarded server-side).
export const bulkVendorChase = (ids, message) => bulkTickets({ ids, action: 'vendor_chase', message })
export const bulkVendorBringBack = (ids) => bulkTickets({ ids, action: 'vendor_bring_back' })
export const bulkSetVendorDue = (ids, vendor_due_at) => bulkTickets({ ids, action: 'set_vendor_due', vendor_due_at })

// Structured hand-off reasons (mirror backend VendorWaitReason).
export const VENDOR_WAIT_REASONS = [
  { value: 'awaiting_quote', label: 'Awaiting quote' },
  { value: 'awaiting_parts', label: 'Awaiting parts' },
  { value: 'awaiting_rma', label: 'Awaiting RMA' },
  { value: 'awaiting_fix', label: 'Awaiting fix' },
  { value: 'awaiting_approval', label: 'Awaiting approval' },
  { value: 'awaiting_info', label: 'Awaiting info' },
  { value: 'other', label: 'Other' },
]
export const vendorReasonLabel = (v) => VENDOR_WAIT_REASONS.find(r => r.value === v)?.label || v
export const VENDOR_DEFAULT_SLA_DAYS = 3

/* ─────────────────────────── War Room (Critical tickets) ───────────────────────────
   Stakeholder update cadence + comm templates. The cadence arms next_update_due_at on
   the backend; the sweep nudges the owner when a promised update lapses. */
export const UPDATE_CADENCE_OPTIONS = [
  { value: 15, label: 'Every 15 min' },
  { value: 30, label: 'Every 30 min' },
  { value: 60, label: 'Every hour' },
  { value: 120, label: 'Every 2 hours' },
  { value: 240, label: 'Every 4 hours' },
]
// PagerDuty-style incident-lifecycle comm templates. `phase` tints the chip; the text is a
// starting point — the composer keeps it editable before posting via postStatusUpdate().
export const CRITICAL_UPDATE_TEMPLATES = [
  { key: 'investigating', label: 'Investigating', phase: 'start',
    text: 'We are aware of the issue and are actively investigating. Impact is being assessed; next update to follow.' },
  { key: 'identified', label: 'Identified', phase: 'mid',
    text: 'The root cause has been identified. A fix is being prepared; we will update you as remediation progresses.' },
  { key: 'mitigating', label: 'Mitigating', phase: 'mid',
    text: 'Remediation is underway and impact is reducing. Some users may still be affected while the fix rolls out.' },
  { key: 'monitoring', label: 'Monitoring', phase: 'late',
    text: 'A fix has been applied and service is recovering. We are monitoring closely before declaring resolution.' },
  { key: 'resolved', label: 'Resolved', phase: 'end',
    text: 'The issue is fully resolved and service is operating normally. A post-incident review will follow.' },
]
// Business-impact scale (mirrors the backend's low|medium|high|critical string column).
export const BUSINESS_IMPACTS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]
// A critical with no timeline movement for this long reads as "stale" on the board.
export const STALE_CRITICAL_HOURS = 4
