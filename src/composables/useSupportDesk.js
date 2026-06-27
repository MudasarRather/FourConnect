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
const _patch = async (url, body) => (await axios.patch(`${API}${url}`, body, { headers: authHeader() })).data
const _put = async (url, body) => (await axios.put(`${API}${url}`, body, { headers: authHeader() })).data
const _del = async (url) => (await axios.delete(`${API}${url}`, { headers: authHeader() })).data

const SD = '/support-desk'

/* ─────────────────────────── Dashboard ─────────────────────────── */
export const fetchSupportDashboard = () => _get(`${SD}/dashboard/`)
export const fetchSelfDashboard = () => _get(`${SD}/me/tickets/dashboard`)

/* ─────────────────────────── Tickets (admin) ─────────────────────────── */
export const listTickets = (params) => _get(`${SD}/tickets/`, params)
export const getTicket = (id) => _get(`${SD}/tickets/${id}`)
export const createTicket = (payload) => _post(`${SD}/tickets/`, payload)
export const updateTicket = (id, payload) => _patch(`${SD}/tickets/${id}`, payload)
export const assignTicket = (id, payload) => _post(`${SD}/tickets/${id}/assign`, payload)
export const changeTicketStatus = (id, payload) => _post(`${SD}/tickets/${id}/status`, payload)
export const escalateTicket = (id) => _post(`${SD}/tickets/${id}/escalate`, {})
export const setTicketCsat = (id, payload) => _post(`${SD}/tickets/${id}/csat`, payload)
export const addTicketComment = (id, payload) => _post(`${SD}/tickets/${id}/comments`, payload)
export const listTicketComments = (id) => _get(`${SD}/tickets/${id}/comments`)
export const listTicketActivities = (id) => _get(`${SD}/tickets/${id}/activities`)
export const deleteTicket = (id) => _del(`${SD}/tickets/${id}`)
export const rotateTicketPortal = (id) => _post(`${SD}/tickets/${id}/portal/rotate`, {})
export const ticketToTask = (id, body) => _post(`${SD}/tickets/${id}/to-task`, body || {})
export const serviceRequestToInvoice = (id, body) => _post(`${SD}/service-requests/${id}/to-invoice`, body)

/* ─────────────────────────── Tickets (self-service) ─────────────────────────── */
export const listMyTickets = (params) => _get(`${SD}/me/tickets/`, params)
export const getMyTicket = (id) => _get(`${SD}/me/tickets/${id}`)
export const createMyTicket = (payload) => _post(`${SD}/me/tickets/`, payload)
export const replyMyTicket = (id, payload) => _post(`${SD}/me/tickets/${id}/comments`, payload)
export const rateMyTicket = (id, payload) => _post(`${SD}/me/tickets/${id}/csat`, payload)
export const listMyKb = (params) => _get(`${SD}/me/knowledge-base`, params)
export const listMyKbCategories = () => _get(`${SD}/me/knowledge-base/categories`)
export const getMyArticle = (id) => _get(`${SD}/me/knowledge-base/${id}`)
export const listMyAnnouncements = () => _get(`${SD}/me/announcements`)

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
        listCategories().catch(() => empty),
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
  { value: 'internal', label: 'Internal' },
  { value: 'api', label: 'API' },
]
export const TICKET_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_customer', label: 'Pending Customer' },
  { value: 'pending_vendor', label: 'Pending Vendor' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export const statusLabel = (v) => (TICKET_STATUSES.find(s => s.value === v)?.label || v)
export const priorityLabel = (v) => (PRIORITIES.find(p => p.value === v)?.label || v)
