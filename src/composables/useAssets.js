// Asset Management ("Asset Hangar") data layer.
// Mirrors useTraining.js: tab/group metadata + status/condition/type meta + thin
// axios fetchers. The 8 core asset/allocation fetchers live HERE and are
// re-exported from useOnbAssets so the onboarding asset section and this module
// share a single source of truth (same trick useTraining uses for onboarding).
import axios from 'axios'
import { API, authHeader } from '@/utils/api'
import {
  LayoutDashboard, Boxes, PackageCheck, Undo2, ArrowLeftRight, ShieldAlert,
  Wrench, History, ClipboardCheck, Trash2, FolderTree, Building2,
  FileBarChart2, ScrollText,
  Banknote, Hammer, Gift, Recycle, CircleHelp, FileX2,
} from 'lucide-vue-next'
import {
  Laptop, HardDrive, Monitor, Smartphone, CreditCard, Headphones, Keyboard, Mouse,
  Car, KeyRound, Package, Bike, Printer, Server, Tablet, Camera, Cpu, Plug, Wifi,
  Tv, Watch, Truck, HardHat, Box, Shapes, Tag, Usb, Projector, Speaker,
} from 'lucide-vue-next'

const BASE = `${API}/hr/assets`
const ME = `${API}/hr/me/assets`

// ── Tab + group metadata ────────────────────────────────────────────────────
export const ASSET_GROUPS = [
  { key: 'overview',   label: 'Hangar' },
  { key: 'fleet',      label: 'Fleet' },
  { key: 'lifecycle',  label: 'Lifecycle' },
  { key: 'governance', label: 'Governance' },
  { key: 'catalog',    label: 'Catalog' },
  { key: 'system',     label: 'System' },
]

// `soon: true` → Phase-2 section renders the AssetComingSoon teaser until its
// backend endpoints are wired into the UI section.
export const ASSET_TABS = [
  { key: 'dashboard',   label: 'Dashboard',   icon: LayoutDashboard, group: 'overview' },
  { key: 'inventory',   label: 'Inventory',   icon: Boxes,           group: 'fleet' },
  { key: 'allocations', label: 'Allocations', icon: PackageCheck,    group: 'fleet' },
  { key: 'returns',     label: 'Returns',     icon: Undo2,           group: 'fleet' },
  { key: 'history',     label: 'History',     icon: History,         group: 'fleet' },
  { key: 'transfers',   label: 'Transfers',   icon: ArrowLeftRight,  group: 'lifecycle' },
  { key: 'damage',      label: 'Damage',      icon: ShieldAlert,     group: 'lifecycle' },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench,          group: 'lifecycle' },
  { key: 'audits',      label: 'Audits',      icon: ClipboardCheck,  group: 'governance' },
  { key: 'disposal',    label: 'Disposal',    icon: Trash2,          group: 'governance' },
  { key: 'categories',  label: 'Categories',  icon: FolderTree,      group: 'catalog' },
  { key: 'vendors',     label: 'Vendors',     icon: Building2,       group: 'catalog' },
  { key: 'reports',     label: 'Reports',     icon: FileBarChart2,   group: 'system' },
  { key: 'audit-logs',  label: 'Audit Logs',  icon: ScrollText,      group: 'system' },
]
export const ASSET_TAB_KEYS = ASSET_TABS.map(t => t.key)

// ── Enum meta ─────────────────────────────────────────────────────────────
const STATUS_META = {
  AVAILABLE:   { label: 'Available',   token: 'available' },
  ALLOCATED:   { label: 'Allocated',   token: 'allocated' },
  RESERVED:    { label: 'Reserved',    token: 'reserved' },
  MAINTENANCE: { label: 'Maintenance', token: 'maintenance' },
  RETIRED:     { label: 'Retired',     token: 'retired' },
}
export const statusMeta = (k) => STATUS_META[k] || STATUS_META.AVAILABLE
export const ASSET_STATUSES = Object.keys(STATUS_META)

const CONDITION_META = {
  NEW:     { label: 'New',     level: 4 },
  GOOD:    { label: 'Good',    level: 3 },
  FAIR:    { label: 'Fair',    level: 2 },
  POOR:    { label: 'Poor',    level: 1 },
  RETIRED: { label: 'Retired', level: 0 },
}
export const conditionMeta = (k) => CONDITION_META[k] || CONDITION_META.GOOD
export const ASSET_CONDITIONS = Object.keys(CONDITION_META)

const ALLOC_STATUS_META = {
  ALLOCATED: { label: 'Allocated' },
  RETURNED:  { label: 'Returned' },
  LOST:      { label: 'Lost' },
  DAMAGED:   { label: 'Damaged' },
}
export const allocStatusMeta = (k) => ALLOC_STATUS_META[k] || ALLOC_STATUS_META.ALLOCATED
export const ALLOCATION_STATUSES = Object.keys(ALLOC_STATUS_META)

export const ASSET_TYPES = [
  'LAPTOP', 'DESKTOP', 'MONITOR', 'MOBILE', 'SIM', 'RFID_CARD', 'ID_CARD',
  'HEADSET', 'KEYBOARD', 'MOUSE', 'VEHICLE', 'KEYS', 'OTHER',
]
const TYPE_LABELS = {
  LAPTOP: 'Laptop', DESKTOP: 'Desktop', MONITOR: 'Monitor', MOBILE: 'Mobile',
  SIM: 'SIM', RFID_CARD: 'RFID Card', ID_CARD: 'ID Card', HEADSET: 'Headset',
  KEYBOARD: 'Keyboard', MOUSE: 'Mouse', VEHICLE: 'Vehicle', KEYS: 'Keys', OTHER: 'Other',
}
export const typeMeta = (k) => ({
  label: TYPE_LABELS[k] || 'Other',
  cssVar: `--as-type-${(k || 'OTHER').toLowerCase()}`,
})

export const SEVERITIES = ['MINOR', 'MODERATE', 'MAJOR', 'TOTAL_LOSS']

export const ASSET_DELETE_REASONS = [
  'Decommissioned', 'Sold / disposed', 'Lost or stolen', 'Duplicate record',
  'Data-entry error', 'Other',
]

// ── Error text helper ───────────────────────────────────────────────────────
export function errText(e, fallback = 'Something went wrong') {
  const d = e?.response?.data?.detail
  if (!d) return e?.message || fallback
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map(x => x?.msg || String(x)).join('; ') || fallback
  if (typeof d === 'object') return d.msg || JSON.stringify(d)
  return String(d)
}

// guarded(): swallow 404/405 (endpoint not wired yet) so a section can degrade
// to a "coming online" teaser instead of throwing. Anything else re-throws.
export async function guarded(fn, fallback = {}) {
  try { return await fn() }
  catch (e) {
    if ([404, 405].includes(e?.response?.status)) return { __unavailable: true, ...fallback }
    throw e
  }
}

// ── Core asset + allocation fetchers (single source of truth) ────────────────
export async function fetchAssets(params = {}) {
  const { data } = await axios.get(`${BASE}/`, { headers: authHeader(), params })
  return data
}
export async function fetchAsset(id) {
  const { data } = await axios.get(`${BASE}/${id}`, { headers: authHeader() })
  return data
}
export async function createAsset(payload) {
  const { data } = await axios.post(`${BASE}/`, payload, { headers: authHeader() })
  return data
}
export async function patchAsset(id, payload) {
  const { data } = await axios.patch(`${BASE}/${id}`, payload, { headers: authHeader() })
  return data
}
export async function deleteAsset(id) {
  await axios.delete(`${BASE}/${id}`, { headers: authHeader() })
}
export async function fetchAllocations(params = {}) {
  const { data } = await axios.get(`${BASE}/allocations`, { headers: authHeader(), params })
  // The allocations endpoint returns a bare array, not { items }.
  return Array.isArray(data) ? data : (data?.items || [])
}
export async function allocateAsset(assetId, payload) {
  const { data } = await axios.post(`${BASE}/${assetId}/allocate`, payload, { headers: authHeader() })
  return data
}
export async function returnAllocation(allocId, payload) {
  const { data } = await axios.post(`${BASE}/allocations/${allocId}/return`, payload, { headers: authHeader() })
  return data
}
export async function acknowledgeAllocation(allocId) {
  const { data } = await axios.post(`${BASE}/allocations/${allocId}/acknowledge`, {}, { headers: authHeader() })
  return data
}
export async function fetchAssetHistory(assetId, params = {}) {
  const { data } = await axios.get(`${BASE}/${assetId}/history`, { headers: authHeader(), params })
  return Array.isArray(data) ? data : (data?.items || [])
}
export async function fetchAssetStats() {
  return guarded(async () => {
    const { data } = await axios.get(`${BASE}/stats`, { headers: authHeader() })
    return data
  })
}

// ── Self-service (guarded — degrades gracefully before /hr/me/assets is wired) ─
export async function fetchMyAssets(params = {}) {
  return guarded(async () => {
    const { data } = await axios.get(`${ME}/`, { headers: authHeader(), params })
    return data
  }, { items: [], unlinked: false })
}
export async function fetchMyAssetHistory(params = {}) {
  return guarded(async () => {
    const { data } = await axios.get(`${ME}/history`, { headers: authHeader(), params })
    return Array.isArray(data) ? data : (data?.items || [])
  }, { items: [] })
}
export async function acknowledgeMyAllocation(allocId) {
  try {
    const { data } = await axios.post(`${ME}/${allocId}/acknowledge`, {}, { headers: authHeader() })
    return data
  } catch (e) {
    // Fall back to the admin-shared acknowledge endpoint if the self route is absent.
    if ([404, 405].includes(e?.response?.status)) return acknowledgeAllocation(allocId)
    throw e
  }
}
export async function reportMyDamage(allocId, payload) {
  const { data } = await axios.post(`${ME}/${allocId}/report-damage`, payload, { headers: authHeader() })
  return data
}
export async function requestMyReturn(allocId, payload = {}) {
  const { data } = await axios.post(`${ME}/${allocId}/request-return`, payload, { headers: authHeader() })
  return data
}
export async function cancelMyReturnRequest(allocId) {
  const { data } = await axios.post(`${ME}/${allocId}/cancel-return-request`, {}, { headers: authHeader() })
  return data
}

// ════════════════════════ Phase 2 — lifecycle + governance + catalog ════════════════════════

// ── Categories ──
export async function fetchCategories(params = {}) {
  const { data } = await axios.get(`${API}/hr/asset-categories/`, { headers: authHeader(), params })
  return data
}
export async function createCategory(payload) {
  const { data } = await axios.post(`${API}/hr/asset-categories/`, payload, { headers: authHeader() })
  return data
}
export async function patchCategory(id, payload) {
  const { data } = await axios.patch(`${API}/hr/asset-categories/${id}`, payload, { headers: authHeader() })
  return data
}
export async function deleteCategory(id) {
  await axios.delete(`${API}/hr/asset-categories/${id}`, { headers: authHeader() })
}

// ── Asset Types (manageable catalog — the physical-kind tag on each asset) ──
export async function fetchAssetTypes(params = {}) {
  const { data } = await axios.get(`${API}/hr/asset-types/`, { headers: authHeader(), params })
  return Array.isArray(data) ? data : (data?.items || [])
}
export async function createAssetType(payload) {
  const { data } = await axios.post(`${API}/hr/asset-types/`, payload, { headers: authHeader() })
  return data
}
export async function patchAssetType(id, payload) {
  const { data } = await axios.patch(`${API}/hr/asset-types/${id}`, payload, { headers: authHeader() })
  return data
}
export async function deleteAssetType(id) {
  await axios.delete(`${API}/hr/asset-types/${id}`, { headers: authHeader() })
}

// ── Vendors ──
export async function fetchVendors(params = {}) {
  const { data } = await axios.get(`${API}/hr/asset-vendors/`, { headers: authHeader(), params })
  return data
}
export async function createVendor(payload) {
  const { data } = await axios.post(`${API}/hr/asset-vendors/`, payload, { headers: authHeader() })
  return data
}
export async function patchVendor(id, payload) {
  const { data } = await axios.patch(`${API}/hr/asset-vendors/${id}`, payload, { headers: authHeader() })
  return data
}
export async function deleteVendor(id) {
  await axios.delete(`${API}/hr/asset-vendors/${id}`, { headers: authHeader() })
}

// ── Masters used by transfer destinations (guarded — degrade if empty) ──
export async function fetchLocations(params = {}) {
  return guarded(async () => {
    const { data } = await axios.get(`${API}/hr/locations/`, { headers: authHeader(), params })
    return Array.isArray(data) ? data : (data?.items || [])
  }, [])
}
export async function fetchDepartments(params = {}) {
  return guarded(async () => {
    const { data } = await axios.get(`${API}/hr/departments/`, { headers: authHeader(), params })
    return Array.isArray(data) ? data : (data?.items || [])
  }, [])
}

// ── Transfers ──
export async function fetchTransfers(params = {}) {
  const { data } = await axios.get(`${API}/hr/asset-transfers/`, { headers: authHeader(), params })
  return data
}
export async function createTransfer(payload) {
  const { data } = await axios.post(`${API}/hr/asset-transfers/`, payload, { headers: authHeader() })
  return data
}
export async function transferAction(id, action, body = {}) {
  const { data } = await axios.post(`${API}/hr/asset-transfers/${id}/${action}`, body, { headers: authHeader() })
  return data
}

// ── Maintenance ──
export async function fetchMaintenance(params = {}) {
  const { data } = await axios.get(`${API}/hr/asset-maintenance/`, { headers: authHeader(), params })
  return data
}
export async function createMaintenance(payload) {
  const { data } = await axios.post(`${API}/hr/asset-maintenance/`, payload, { headers: authHeader() })
  return data
}
export async function maintenanceAction(id, action, body = {}) {
  const { data } = await axios.post(`${API}/hr/asset-maintenance/${id}/${action}`, body, { headers: authHeader() })
  return data
}

// ── Damage ──
export async function fetchDamages(params = {}) {
  const { data } = await axios.get(`${API}/hr/asset-damages/`, { headers: authHeader(), params })
  return data
}
export async function createDamage(payload) {
  const { data } = await axios.post(`${API}/hr/asset-damages/`, payload, { headers: authHeader() })
  return data
}
export async function patchDamage(id, payload) {
  const { data } = await axios.patch(`${API}/hr/asset-damages/${id}`, payload, { headers: authHeader() })
  return data
}
export async function damageAction(id, action, body = {}) {
  const { data } = await axios.post(`${API}/hr/asset-damages/${id}/${action}`, body, { headers: authHeader() })
  return data
}

// ── Audits ──
export async function fetchAudits(params = {}) {
  const { data } = await axios.get(`${API}/hr/asset-audits/`, { headers: authHeader(), params })
  return data
}
export async function createAudit(payload) {
  const { data } = await axios.post(`${API}/hr/asset-audits/`, payload, { headers: authHeader() })
  return data
}
export async function fetchAuditItems(id) {
  const { data } = await axios.get(`${API}/hr/asset-audits/${id}/items`, { headers: authHeader() })
  return Array.isArray(data) ? data : (data?.items || [])
}
export async function auditAction(id, action, body = {}) {
  const { data } = await axios.post(`${API}/hr/asset-audits/${id}/${action}`, body, { headers: authHeader() })
  return data
}
export async function scanAuditItem(auditId, itemId, body) {
  const { data } = await axios.post(`${API}/hr/asset-audits/${auditId}/items/${itemId}/scan`, body, { headers: authHeader() })
  return data
}

// ── Disposal ──
export async function fetchDisposals(params = {}) {
  const { data } = await axios.get(`${API}/hr/asset-disposals/`, { headers: authHeader(), params })
  return data
}
export async function createDisposal(payload) {
  const { data } = await axios.post(`${API}/hr/asset-disposals/`, payload, { headers: authHeader() })
  return data
}
export async function disposalAction(id, action, body = {}) {
  const { data } = await axios.post(`${API}/hr/asset-disposals/${id}/${action}`, body, { headers: authHeader() })
  return data
}

// ── Audit log feed ──
export async function fetchAuditLogs(params = {}) {
  const { data } = await axios.get(`${API}/hr/assets/audit-logs`, { headers: authHeader(), params })
  return data
}

// ── Reports ──
export async function fetchReports() {
  const { data } = await axios.get(`${API}/hr/assets/reports`, { headers: authHeader() })
  return data?.reports || []
}
export async function downloadReport(key, format, params = {}) {
  // Drop empty scope params so the backend keeps its "all time / all depts" defaults.
  const clean = {}
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v !== null && v !== undefined) clean[k] = v
  }
  const res = await axios.get(`${API}/hr/assets/reports/${key}/export`, {
    headers: authHeader(), params: { format, ...clean }, responseType: 'blob',
  })
  const ext = format === 'excel' ? 'xlsx' : format
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `asset_${key}_${new Date().toISOString().slice(0, 10)}.${ext}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

// Live per-report telemetry for the Reports briefing deck. Guarded so the page
// degrades to metadata-only cards if the backend hasn't been restarted with the
// /reports/overview endpoint yet.
export async function fetchReportOverview() {
  return guarded(async () => {
    const { data } = await axios.get(`${API}/hr/assets/reports/overview`, { headers: authHeader() })
    return data
  }, { reports: {}, totals: {}, __unavailable: true })
}

// Cross-link: each dossier opens the live module tab it is sourced from.
export const REPORT_TAB_LINK = {
  estate_overview: 'dashboard',
  inventory_register: 'inventory',
  category_distribution: 'categories',
  allocation_register: 'allocations',
  allocation_by_department: 'allocations',
  unacknowledged: 'allocations',
  maintenance_log: 'maintenance',
  damage_log: 'damage',
  transfers_log: 'transfers',
  financial_valuation: 'inventory',
  asset_aging: 'inventory',
  vendor_spend: 'vendors',
  warranty_expiry: 'inventory',
  compliance: 'inventory',
  audit_reconciliation: 'audits',
  disposal_register: 'disposal',
}

// ── Phase-2 enum option lists ──
export const TRANSFER_TYPES = ['EMPLOYEE_TO_EMPLOYEE', 'EMPLOYEE_TO_STORE', 'STORE_TO_EMPLOYEE', 'LOCATION', 'DEPARTMENT']
export const MAINTENANCE_TYPES = ['REPAIR', 'PREVENTIVE', 'INSPECTION', 'UPGRADE', 'CALIBRATION']
export const DISPOSAL_METHODS = ['SOLD', 'SCRAPPED', 'DONATED', 'RECYCLED', 'LOST', 'WRITE_OFF', 'RETURNED_TO_VENDOR']
export const DEPRECIATION_METHODS = ['STRAIGHT_LINE', 'NONE']

// Disposal method metadata — shared by the Foundry console, docket cards and the
// request modal so the icon / tone / "does it recover value" story stays in one
// place. `tone` maps to a CSS accent (gain=emerald, amber, ember, steel, loss=red)
// in the disposal components; `recovers` flags methods that typically return value.
export const DISPOSAL_METHOD_META = {
  SOLD:               { label: 'Sold',          icon: Banknote, tone: 'gain',  recovers: true,  blurb: 'Resold for residual value' },
  RETURNED_TO_VENDOR: { label: 'To vendor',     icon: Undo2,    tone: 'steel', recovers: true,  blurb: 'Buy-back / vendor return' },
  RECYCLED:           { label: 'Recycled',      icon: Recycle,  tone: 'ember', recovers: true,  blurb: 'Material recovery' },
  DONATED:            { label: 'Donated',       icon: Gift,     tone: 'amber', recovers: false, blurb: 'Given to a cause' },
  SCRAPPED:           { label: 'Scrapped',      icon: Hammer,   tone: 'steel', recovers: false, blurb: 'Dismantled / destroyed' },
  WRITE_OFF:          { label: 'Write-off',     icon: FileX2,   tone: 'loss',  recovers: false, blurb: 'Booked as a full loss' },
  LOST:               { label: 'Lost',          icon: CircleHelp, tone: 'loss', recovers: false, blurb: 'Untraceable / unaccounted' },
}
export const disposalMethodMeta = (k) => DISPOSAL_METHOD_META[k] || DISPOSAL_METHOD_META.SCRAPPED

export function titleCase(s) {
  return String(s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// ── Asset-type icon registry (catalog `icon` column stores the lucide name) ──
export const ASSET_TYPE_ICONS = {
  Laptop, HardDrive, Monitor, Smartphone, CreditCard, Headphones, Keyboard, Mouse,
  Car, KeyRound, Package, Bike, Printer, Server, Tablet, Camera, Cpu, Plug, Wifi,
  Tv, Watch, Truck, HardHat, Box, Boxes, Shapes, Tag, Usb, Projector, Speaker,
}
export const iconForTypeName = (name) => ASSET_TYPE_ICONS[name] || Package
export const ASSET_TYPE_ICON_CHOICES = Object.keys(ASSET_TYPE_ICONS)

// ── Client-side stats aggregate (used until /stats lands; merged with it too) ─
export function computeAssetStats(assets = [], allocations = []) {
  const by_status = {}, by_type = {}, by_condition = {}
  let total_value = 0
  for (const a of assets) {
    by_status[a.status] = (by_status[a.status] || 0) + 1
    by_type[a.asset_type] = (by_type[a.asset_type] || 0) + 1
    by_condition[a.condition] = (by_condition[a.condition] || 0) + 1
    total_value += Number(a.purchase_cost || 0)
  }
  const active = allocations.filter(al => al.status === 'ALLOCATED')
  const today = new Date().toISOString().slice(0, 10)
  return {
    total: assets.length,
    available: by_status.AVAILABLE || 0,
    allocated: by_status.ALLOCATED || 0,
    reserved: by_status.RESERVED || 0,
    maintenance: by_status.MAINTENANCE || 0,
    retired: by_status.RETIRED || 0,
    total_value,
    unacknowledged: active.filter(al => !al.acknowledged_by_employee).length,
    overdue_returns: active.filter(al => al.expected_return_date && al.expected_return_date < today).length,
    open_damages: 0,
    warranty_expiring_30d: 0,
    by_status, by_type, by_condition,
  }
}
