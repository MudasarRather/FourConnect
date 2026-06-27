// Performance Management — "The Arena" data layer.
// Review instances scored against appraisal templates. Admin endpoints under
// /hr/performance; employee + manager self-service under /hr/me/performance.
import axios from 'axios'
import { API, authHeader } from '@/utils/api'
import {
  LayoutDashboard, ClipboardList, CalendarRange,
  PencilRuler, UserCheck, CheckCircle2, BadgeCheck, CircleSlash, FileText,
  Target, Orbit, Grid3x3, BarChart3, LifeBuoy,
  TrendingUp, AlertTriangle, Trophy, MinusCircle, CircleDot,
  Crown, Rocket, Boxes, Puzzle, ShieldAlert, Activity, Users, Coins,
} from 'lucide-vue-next'

const BASE = `${API}/hr/performance`
const ME = `${API}/hr/me/performance`
const GOALS = `${API}/hr/performance-goals`
const FEEDBACK = `${API}/hr/performance-feedback`
const CALIB = `${API}/hr/performance-calibration`
const PIP = `${API}/hr/performance-pip`
const ANALYTICS = `${API}/hr/performance-analytics`
const h = () => ({ headers: authHeader() })

// ── Tabs / groups (admin workspace rail) ───────────────────────────────────
export const PERFORMANCE_GROUPS = [
  { key: 'overview', title: 'Arena' },
  { key: 'cycle', title: 'Review cycle' },
  { key: 'develop', title: 'Growth & talent' },
]
export const PERFORMANCE_TABS = [
  { key: 'dashboard', label: 'Command', icon: LayoutDashboard, group: 'overview' },
  { key: 'insights', label: 'Insights', icon: BarChart3, group: 'overview' },
  { key: 'reviews', label: 'Reviews', icon: ClipboardList, group: 'cycle' },
  { key: 'cycles', label: 'Cycles', icon: CalendarRange, group: 'cycle' },
  { key: 'calibration', label: 'Calibration', icon: Grid3x3, group: 'cycle' },
  { key: 'merit', label: 'Merit & Increments', icon: Coins, group: 'cycle' },
  { key: 'goals', label: 'Goals & OKRs', icon: Target, group: 'develop' },
  { key: 'feedback', label: '360° Feedback', icon: Orbit, group: 'develop' },
  { key: 'pips', label: 'Improvement', icon: LifeBuoy, group: 'develop' },
]
export const PERFORMANCE_TAB_KEYS = PERFORMANCE_TABS.map(t => t.key)

// ── Status meta ─────────────────────────────────────────────────────────────
export const STATUS_META = {
  DRAFT:              { label: 'Draft',            color: 'var(--perf-unset)',  icon: FileText },
  SELF_ASSESSMENT:    { label: 'Self-reflection',  color: 'var(--perf-amber)',  icon: PencilRuler },
  MANAGER_ASSESSMENT: { label: 'Awaiting review',  color: 'var(--perf-orange)', icon: UserCheck },
  COMPLETED:          { label: 'Completed',        color: 'var(--perf-gold)',   icon: CheckCircle2 },
  ACKNOWLEDGED:       { label: 'Acknowledged',     color: 'var(--perf-ok)',     icon: BadgeCheck },
  CANCELLED:          { label: 'Cancelled',        color: 'var(--perf-conflict)', icon: CircleSlash },
}
export const statusMeta = (k) => STATUS_META[k] || STATUS_META.DRAFT
export const STATUS_ORDER = ['SELF_ASSESSMENT', 'MANAGER_ASSESSMENT', 'COMPLETED', 'ACKNOWLEDGED']

// the workflow pipeline (for the dashboard + stepper)
export const PIPELINE = [
  { key: 'SELF_ASSESSMENT', label: 'Reflection', icon: PencilRuler },
  { key: 'MANAGER_ASSESSMENT', label: 'Manager review', icon: UserCheck },
  { key: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged', icon: BadgeCheck },
]

export const ratingLabel = (labels, n) => (Array.isArray(labels) && labels[n - 1]) ? labels[n - 1] : `Level ${n}`
export const scoreTone = (score, max = 5) => {
  if (score == null) return 'var(--perf-unset)'
  const f = score / max
  if (f >= 0.8) return 'var(--perf-ok)'
  if (f >= 0.6) return 'var(--perf-gold)'
  if (f >= 0.4) return 'var(--perf-orange)'
  return 'var(--perf-conflict)'
}

// ── Admin fetchers ──────────────────────────────────────────────────────────
export async function fetchPerformanceStats() { return (await axios.get(`${BASE}/stats`, h())).data }
export async function fetchReviews(params = {}) { return (await axios.get(`${BASE}/`, { ...h(), params })).data }
export async function createReview(p) { return (await axios.post(`${BASE}/`, p, h())).data }
export async function bulkCreateReviews(p) { return (await axios.post(`${BASE}/bulk`, p, h())).data }
export async function fetchReview(id) { return (await axios.get(`${BASE}/${id}`, h())).data }
export async function updateReview(id, p) { return (await axios.patch(`${BASE}/${id}`, p, h())).data }
export async function adminSelfScores(id, p) { return (await axios.post(`${BASE}/${id}/self`, p, h())).data }
export async function adminManagerScores(id, p) { return (await axios.post(`${BASE}/${id}/manager`, p, h())).data }
export async function transitionReview(id, p) { return (await axios.post(`${BASE}/${id}/transition`, p, h())).data }
export async function deleteReview(id) { await axios.delete(`${BASE}/${id}`, h()) }
export async function fetchCycles() { return (await axios.get(`${BASE}/cycles`, h())).data }
export async function fetchEmployeeLatestReview(employeeId) {
  return (await axios.get(`${BASE}/employees/${employeeId}/latest-review`, h())).data
}
// subject detail — used by the 360° modal to resolve the reporting-manager name
// and confirm the linked login before seeding the rater set.
export async function fetchEmployeeDetail(employeeId) {
  return (await axios.get(`${API}/hr/employees/${employeeId}`, h())).data
}

// employees picker (for create / launch) — limit capped at 100 by the backend.
// exclude_separated drops EXITED / ARCHIVED / INACTIVE so you can never open a
// review against someone who has already left (ON_NOTICE stays — still employed).
export async function fetchEmployeesForReview(params = {}) {
  const { data } = await axios.get(`${API}/hr/employees/`, {
    ...h(),
    params: { limit: 100, exclude_separated: true, ...params },
  })
  return data
}

// ── Self-service + manager fetchers ─────────────────────────────────────────
export async function fetchMyReviews() { return (await axios.get(`${ME}/`, h())).data }
export async function fetchMySummary() { return (await axios.get(`${ME}/summary`, h())).data }
export async function fetchMyReview(id) { return (await axios.get(`${ME}/${id}`, h())).data }
export async function submitSelfAssessment(id, p) { return (await axios.patch(`${ME}/${id}/self`, p, h())).data }
export async function acknowledgeReview(id, p) { return (await axios.post(`${ME}/${id}/acknowledge`, p, h())).data }
export async function fetchTeamReviews() { return (await axios.get(`${ME}/team`, h())).data }
// manager view of the 360° feedback collected about a direct report (incl. their SELF response)
export async function fetchTeamFeedback(employeeId) { return (await axios.get(`${ME}/team/${employeeId}/feedback`, h())).data }
// one-shot 360° feedback summary across all direct reports — powers the Team Feedback board
export async function fetchTeamFeedbackOverview() { return (await axios.get(`${ME}/team/feedback-overview`, h())).data }
export async function fetchTeamTemplates() { return (await axios.get(`${ME}/team/templates`, h())).data }
export async function launchTeamReview(p) { return (await axios.post(`${ME}/team/launch`, p, h())).data }
export async function submitManagerAssessment(id, p) { return (await axios.patch(`${ME}/team/${id}/manager`, p, h())).data }
// Improvement plans (PIP) — employee sees/acknowledges own; manager runs reports'
export async function fetchMyPips() { return (await axios.get(`${ME}/pips`, h())).data }
export async function acknowledgeMyPip(id, p = {}) { return (await axios.post(`${ME}/pips/${id}/acknowledge`, p, h())).data }
export async function fetchTeamPips() { return (await axios.get(`${ME}/team-pips`, h())).data }
export async function updateTeamPip(id, p) { return (await axios.patch(`${ME}/team-pips/${id}`, p, h())).data }
export async function teamPipCheckIn(id, p) { return (await axios.post(`${ME}/team-pips/${id}/check-in`, p, h())).data }
export async function teamPipTransition(id, p) { return (await axios.post(`${ME}/team-pips/${id}/transition`, p, h())).data }

// ════════════════════════════════════════════════════════════════════════════
//  Goals & OKRs
// ════════════════════════════════════════════════════════════════════════════
export const GOAL_STATUS_META = {
  DRAFT:     { label: 'Draft',      color: 'var(--perf-unset)',    icon: CircleDot },
  ON_TRACK:  { label: 'On track',   color: 'var(--perf-ok)',       icon: TrendingUp },
  AT_RISK:   { label: 'At risk',    color: 'var(--perf-amber)',    icon: AlertTriangle },
  OFF_TRACK: { label: 'Off track',  color: 'var(--perf-conflict)', icon: AlertTriangle },
  ACHIEVED:  { label: 'Achieved',   color: 'var(--perf-ok)',       icon: Trophy },
  MISSED:    { label: 'Missed',     color: 'var(--perf-conflict)', icon: MinusCircle },
  CANCELLED: { label: 'Cancelled',  color: 'var(--perf-unset)',    icon: CircleSlash },
}
export const goalStatusMeta = (k) => GOAL_STATUS_META[k] || GOAL_STATUS_META.DRAFT
export const GOAL_METRICS = [
  { value: 'PERCENT',   label: '% Percent',  unit: '%' },
  { value: 'NUMBER',    label: 'Number',     unit: '' },
  { value: 'CURRENCY',  label: 'Currency ₹', unit: '₹' },
  { value: 'MILESTONE', label: 'Milestone',  unit: '' },
  { value: 'BOOLEAN',   label: 'Done / not', unit: '' },
]
export const GOAL_CATEGORIES = ['Business', 'Customer', 'People', 'Innovation', 'Operational', 'Financial']
export const goalTone = (p) => {
  const v = Number(p || 0)
  if (v >= 100) return 'var(--perf-ok)'
  if (v >= 70) return 'var(--perf-ok)'
  if (v >= 40) return 'var(--perf-amber)'
  return 'var(--perf-conflict)'
}

export async function fetchGoalStats(params = {}) { return (await axios.get(`${GOALS}/stats`, { ...h(), params })).data }
export async function fetchGoals(params = {}) { return (await axios.get(`${GOALS}/`, { ...h(), params })).data }
export async function fetchEmployeeGoals(employeeId, params = {}) {
  return (await axios.get(`${GOALS}/employees/${employeeId}`, { ...h(), params })).data
}
export async function createGoal(p) { return (await axios.post(`${GOALS}/`, p, h())).data }
export async function createObjective(p) { return (await axios.post(`${GOALS}/objective`, p, h())).data }
export async function updateGoal(id, p) { return (await axios.patch(`${GOALS}/${id}`, p, h())).data }
export async function goalCheckIn(id, p) { return (await axios.post(`${GOALS}/${id}/check-in`, p, h())).data }
export async function deleteGoal(id) { await axios.delete(`${GOALS}/${id}`, h()) }

// ════════════════════════════════════════════════════════════════════════════
//  360° Feedback
// ════════════════════════════════════════════════════════════════════════════
export const FEEDBACK_RELATIONSHIPS = {
  SELF:          { label: 'Self',          color: 'var(--perf-gold)',   icon: UserCheck },
  MANAGER:       { label: 'Manager',       color: 'var(--perf-orange)', icon: Crown },
  PEER:          { label: 'Peer',          color: 'var(--perf-amber)',  icon: Users },
  DIRECT_REPORT: { label: 'Direct report', color: 'var(--perf-ember)',  icon: UserCheck },
  SKIP_LEVEL:    { label: 'Skip-level',    color: 'var(--perf-rust)',   icon: Crown },
  EXTERNAL:      { label: 'External',      color: 'var(--perf-unset)',  icon: UserCheck },
}
export const feedbackRelMeta = (k) => FEEDBACK_RELATIONSHIPS[k] || FEEDBACK_RELATIONSHIPS.PEER
export const FEEDBACK_REQ_STATUS = {
  OPEN:      { label: 'Collecting', color: 'var(--perf-amber)', icon: Orbit },
  CLOSED:    { label: 'Closed',     color: 'var(--perf-ok)',    icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled',  color: 'var(--perf-unset)', icon: CircleSlash },
}
export const feedbackReqMeta = (k) => FEEDBACK_REQ_STATUS[k] || FEEDBACK_REQ_STATUS.OPEN
export const DEFAULT_COMPETENCIES = [
  { key: 'collaboration', label: 'Collaboration' },
  { key: 'communication', label: 'Communication' },
  { key: 'ownership', label: 'Ownership & accountability' },
  { key: 'execution', label: 'Execution & delivery' },
  { key: 'leadership', label: 'Leadership & influence' },
  { key: 'innovation', label: 'Innovation & problem-solving' },
]

export async function fetchFeedbackStats(params = {}) { return (await axios.get(`${FEEDBACK}/stats`, { ...h(), params })).data }
export async function fetchFeedbackRequests(params = {}) { return (await axios.get(`${FEEDBACK}/`, { ...h(), params })).data }
export async function fetchFeedbackRequest(id, params = {}) { return (await axios.get(`${FEEDBACK}/${id}`, { ...h(), params })).data }
export async function createFeedbackRequest(p) { return (await axios.post(`${FEEDBACK}/`, p, h())).data }
export async function updateFeedbackRequest(id, p) { return (await axios.patch(`${FEEDBACK}/${id}`, p, h())).data }
export async function nominateFeedback(id, p) { return (await axios.post(`${FEEDBACK}/${id}/nominate`, p, h())).data }
export async function closeFeedback(id) { return (await axios.post(`${FEEDBACK}/${id}/close`, {}, h())).data }
export async function reopenFeedback(id) { return (await axios.post(`${FEEDBACK}/${id}/reopen`, {}, h())).data }
export async function removeNominee(responseId) { await axios.delete(`${FEEDBACK}/responses/${responseId}`, h()) }
export async function deleteFeedbackRequest(id) { await axios.delete(`${FEEDBACK}/${id}`, h()) }

// ════════════════════════════════════════════════════════════════════════════
//  Calibration / 9-box
// ════════════════════════════════════════════════════════════════════════════
export const BOX_META = {
  1: { label: 'Risk',                color: '#dc2626', icon: ShieldAlert },
  2: { label: 'Inconsistent Player', color: '#ea580c', icon: AlertTriangle },
  3: { label: 'Workhorse',           color: '#d97706', icon: Boxes },
  4: { label: 'Dilemma',             color: '#ea580c', icon: Puzzle },
  5: { label: 'Core Player',         color: '#f59e0b', icon: CircleDot },
  6: { label: 'High Performer',      color: '#16a34a', icon: TrendingUp },
  7: { label: 'Enigma',              color: '#d97706', icon: Puzzle },
  8: { label: 'Growth Employee',     color: '#16a34a', icon: Rocket },
  9: { label: 'Star',                color: '#059669', icon: Crown },
}
export const boxMeta = (b) => BOX_META[b] || BOX_META[5]
export const BAND_LABELS = { 1: 'Low', 2: 'Medium', 3: 'High' }

export async function fetchCalibrationGrid(params = {}) { return (await axios.get(`${CALIB}/grid`, { ...h(), params })).data }
export async function fetchCalibrationCycles() { return (await axios.get(`${CALIB}/cycles`, h())).data }
export async function fetchCalibrationList(params = {}) { return (await axios.get(`${CALIB}/`, { ...h(), params })).data }
export async function seedCalibration(p) { return (await axios.post(`${CALIB}/seed`, p, h())).data }
export async function upsertCalibration(p) { return (await axios.post(`${CALIB}/`, p, h())).data }
export async function moveCalibration(id, p) { return (await axios.patch(`${CALIB}/${id}/move`, p, h())).data }
export async function markCalibrated(id) { return (await axios.post(`${CALIB}/${id}/calibrate`, {}, h())).data }
export async function deleteCalibration(id) { await axios.delete(`${CALIB}/${id}`, h()) }

// ════════════════════════════════════════════════════════════════════════════
//  PIP — Performance Improvement Plans
// ════════════════════════════════════════════════════════════════════════════
export const PIP_STATUS_META = {
  DRAFT:        { label: 'Draft',        color: 'var(--perf-unset)',    icon: FileText },
  ACTIVE:       { label: 'Active',       color: 'var(--perf-amber)',    icon: Activity },
  EXTENDED:     { label: 'Extended',     color: 'var(--perf-orange)',   icon: CalendarRange },
  SUCCESSFUL:   { label: 'Successful',   color: 'var(--perf-ok)',       icon: CheckCircle2 },
  UNSUCCESSFUL: { label: 'Unsuccessful', color: 'var(--perf-conflict)', icon: MinusCircle },
  CANCELLED:    { label: 'Cancelled',    color: 'var(--perf-unset)',    icon: CircleSlash },
}
export const pipStatusMeta = (k) => PIP_STATUS_META[k] || PIP_STATUS_META.DRAFT

export async function fetchPipStats() { return (await axios.get(`${PIP}/stats`, h())).data }
export async function fetchPips(params = {}) { return (await axios.get(`${PIP}/`, { ...h(), params })).data }
export async function fetchPip(id) { return (await axios.get(`${PIP}/${id}`, h())).data }
export async function createPip(p) { return (await axios.post(`${PIP}/`, p, h())).data }
export async function updatePip(id, p) { return (await axios.patch(`${PIP}/${id}`, p, h())).data }
export async function pipCheckIn(id, p) { return (await axios.post(`${PIP}/${id}/check-in`, p, h())).data }
export async function transitionPip(id, p) { return (await axios.post(`${PIP}/${id}/transition`, p, h())).data }
export async function deletePip(id) { await axios.delete(`${PIP}/${id}`, h()) }

// ════════════════════════════════════════════════════════════════════════════
//  Analytics + employee snapshot (profile Appraisal Console)
// ════════════════════════════════════════════════════════════════════════════
export async function fetchAnalyticsOverview(params = {}) { return (await axios.get(`${ANALYTICS}/overview`, { ...h(), params })).data }
export async function fetchEmployeeSnapshot(employeeId) { return (await axios.get(`${BASE}/employees/${employeeId}/snapshot`, h())).data }

// ── Self-service: my goals + 360 feedback to give ──
export async function fetchMyGoals() { return (await axios.get(`${ME}/goals`, h())).data }
export async function myGoalCheckIn(goalId, p) { return (await axios.post(`${ME}/goals/${goalId}/check-in`, p, h())).data }
export async function fetchMyFeedbackToGive() { return (await axios.get(`${ME}/feedback`, h())).data }
export async function submitMyFeedback(responseId, p) { return (await axios.post(`${ME}/feedback/${responseId}/submit`, p, h())).data }
// employee posts an OPTIONAL non-scoring reflection (no ratings, never advances)
export async function submitSelfReflection(id, p) { return (await axios.patch(`${ME}/${id}/self`, p, h())).data }

// ════════════════════════════════════════════════════════════════════════════
//  Merit & Increment Policy + the appraisal → hike pipeline
// ════════════════════════════════════════════════════════════════════════════
const MERIT = `${API}/hr/settings/merit-policy`

// Mirror of the backend seed (app/models/hr/merit_policy.py DEFAULT_BANDS) — used
// for "reset to defaults" + new-policy scaffolding. Bands are fractions of rating_max.
export const DEFAULT_MERIT_BANDS = [
  { key: 'EXCEPTIONAL', label: 'Exceptional',        frac_min: 0.90, frac_max: 1.01, hike_min_pct: 12, hike_max_pct: 18, auto_pip: false },
  { key: 'EXCEEDS',     label: 'Exceeds',            frac_min: 0.70, frac_max: 0.90, hike_min_pct: 8,  hike_max_pct: 12, auto_pip: false },
  { key: 'MEETS',       label: 'Meets expectations', frac_min: 0.50, frac_max: 0.70, hike_min_pct: 4,  hike_max_pct: 8,  auto_pip: false },
  { key: 'PARTIAL',     label: 'Partially meets',    frac_min: 0.30, frac_max: 0.50, hike_min_pct: 0,  hike_max_pct: 3,  auto_pip: false },
  { key: 'BELOW',       label: 'Below expectations', frac_min: 0.0,  frac_max: 0.30, hike_min_pct: 0,  hike_max_pct: 0,  auto_pip: true },
]

export const bandTone = (key) => ({
  EXCEPTIONAL: 'var(--perf-ok)', EXCEEDS: 'var(--perf-gold)', MEETS: 'var(--perf-amber)',
  PARTIAL: 'var(--perf-orange)', BELOW: 'var(--perf-conflict)',
}[key] || 'var(--perf-gold)')

export async function fetchMeritPolicies() { return (await axios.get(`${MERIT}/`, h())).data }
export async function fetchMeritPolicy(id) { return (await axios.get(`${MERIT}/${id}`, h())).data }
export async function createMeritPolicy(p) { return (await axios.post(`${MERIT}/`, p, h())).data }
export async function updateMeritPolicy(id, p) { return (await axios.patch(`${MERIT}/${id}`, p, h())).data }
export async function deleteMeritPolicy(id) { await axios.delete(`${MERIT}/${id}`, h()) }

// hike pipeline (admin)
export async function fetchReviewSuggestions(id) { return (await axios.get(`${BASE}/${id}/suggestions`, h())).data }
export async function fetchReviewMerit(id) { return (await axios.get(`${BASE}/${id}/merit`, h())).data }
export async function recommendHikeAdmin(id, p) { return (await axios.post(`${BASE}/${id}/recommend`, p, h())).data }
export async function approveHike(id, p) { return (await axios.post(`${BASE}/${id}/approve-hike`, p, h())).data }
export async function rejectHike(id, p) { return (await axios.post(`${BASE}/${id}/reject-hike`, p, h())).data }
export async function fetchMeritBudget(params = {}) { return (await axios.get(`${BASE}/merit-budget`, { ...h(), params })).data }

// hike pipeline (manager self-service)
export async function fetchTeamSuggestions(id) { return (await axios.get(`${ME}/team/${id}/suggestions`, h())).data }
export async function recommendHikeManager(id, p) { return (await axios.patch(`${ME}/team/${id}/recommend`, p, h())).data }

export const HIKE_STATUS_META = {
  NONE:        { label: 'No hike yet',  color: 'var(--perf-unset)',    icon: MinusCircle },
  RECOMMENDED: { label: 'Recommended',  color: 'var(--perf-amber)',    icon: TrendingUp },
  APPROVED:    { label: 'Approved',     color: 'var(--perf-gold)',     icon: BadgeCheck },
  APPLIED:     { label: 'Applied',      color: 'var(--perf-ok)',       icon: CheckCircle2 },
  REJECTED:    { label: 'Rejected',     color: 'var(--perf-conflict)', icon: CircleSlash },
}
export const hikeStatusMeta = (k) => HIKE_STATUS_META[k] || HIKE_STATUS_META.NONE
