// Support Desk — module registry. Mirrors the HR pattern: each submenu is its own
// page/route. This single source of truth drives the nav rail, the per-page module
// headers, and the section-component map used by the parametric section page.
import {
  LayoutDashboard, Ticket, Building2, Users, FileSignature, Gauge,
  BookOpen, LayoutGrid, GitPullRequest, Bug, Server, Megaphone,
  BarChart3, Zap, Settings, ScrollText,
} from 'lucide-vue-next'

import SdOrganizationsSection from './sections/SdOrganizationsSection.vue'
import SdCustomersSection from './sections/SdCustomersSection.vue'
import SdContractsSection from './sections/SdContractsSection.vue'
import SdSlaSection from './sections/SdSlaSection.vue'
import SdKnowledgeBaseSection from './sections/SdKnowledgeBaseSection.vue'
import SdServiceCatalogSection from './sections/SdServiceCatalogSection.vue'
import SdChangeRequestsSection from './sections/SdChangeRequestsSection.vue'
import SdProblemsSection from './sections/SdProblemsSection.vue'
import SdCustomerAssetsSection from './sections/SdCustomerAssetsSection.vue'
import SdAnnouncementsSection from './sections/SdAnnouncementsSection.vue'
import SdReportsSection from './sections/SdReportsSection.vue'
import SdAutomationSection from './sections/SdAutomationSection.vue'
import SdSettingsSection from './sections/SdSettingsSection.vue'
import SdAuditLogsSection from './sections/SdAuditLogsSection.vue'

// Full ordered module list (drives the rail). dashboard + tickets have bespoke pages.
export const SD_MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview', accent: 'var(--sd-amber)', sub: 'KPIs, distributions and the live Triage Basin — the state of the desk at a glance.' },
  { key: 'tickets', label: 'Tickets', icon: Ticket, group: 'Tickets', accent: 'var(--sd-ember)', sub: 'Triage, route and resolve — intake to closure against the SLA frontier.' },
  { key: 'organizations', label: 'Organizations', icon: Building2, group: 'Tickets', accent: 'var(--sd-gold)', sub: 'Client companies you support — contacts, contracts and ticket volume at a glance.' },
  { key: 'customers', label: 'Customers', icon: Users, group: 'Tickets', accent: 'var(--sd-amber)', sub: 'The people behind the tickets — contacts within each organization.' },
  { key: 'contracts', label: 'Contracts', icon: FileSignature, group: 'Service', accent: 'var(--sd-gold)', sub: 'Support contracts — packages, entitlements, renewals and attached SLAs.' },
  { key: 'sla', label: 'SLA Management', icon: Gauge, group: 'Service', accent: 'var(--sd-amber)', sub: 'Priority → response/resolution matrices and escalation ladders.' },
  { key: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen, group: 'Service', accent: 'var(--sd-gold)', sub: 'Self-service articles, organised by category and visibility.' },
  { key: 'service-catalog', label: 'Service Catalog', icon: LayoutGrid, group: 'Service', accent: 'var(--sd-ember)', sub: 'Pre-defined service requests with their own intake forms and approvals.' },
  { key: 'change-requests', label: 'Change Requests', icon: GitPullRequest, group: 'ITIL', accent: 'var(--sd-ember)', sub: 'ITIL change workflow — planned changes, risk and approvals.' },
  { key: 'problem-management', label: 'Problem Management', icon: Bug, group: 'ITIL', accent: 'var(--sd-ember-deep)', sub: 'Root-cause records linking recurring tickets, changes and assets.' },
  { key: 'customer-assets', label: 'Customer Assets', icon: Server, group: 'Assets & Comms', accent: 'var(--sd-steel)', sub: 'Client infrastructure under support — warranty and AMC tracking.' },
  { key: 'announcements', label: 'Announcements', icon: Megaphone, group: 'Assets & Comms', accent: 'var(--sd-gold)', sub: 'Portal notices targeted at clients and employees.' },
  { key: 'reports', label: 'Reports', icon: BarChart3, group: 'Administration', accent: 'var(--sd-amber)', sub: 'Operational, agent, SLA and customer reporting with exports.' },
  { key: 'automation', label: 'Automation Rules', icon: Zap, group: 'Administration', accent: 'var(--sd-ember)', sub: 'Condition → action rules that route, assign and escalate automatically.' },
  { key: 'settings', label: 'Settings', icon: Settings, group: 'Administration', accent: 'var(--sd-amber)', sub: 'Numbering, channels, SLA defaults, branding and CSAT.' },
  { key: 'audit-logs', label: 'Audit Logs', icon: ScrollText, group: 'Administration', accent: 'var(--sd-steel)', sub: 'A hash-sealed record of every action across the desk.' },
]

export const SD_MODULE_MAP = Object.fromEntries(SD_MODULES.map(m => [m.key, m]))
export const getModule = (key) => SD_MODULE_MAP[key] || SD_MODULES[0]

// Sections rendered by the parametric SupportDeskSectionPage (everything except
// dashboard + tickets, which have bespoke pages).
export const SD_SECTIONS = {
  organizations: SdOrganizationsSection,
  customers: SdCustomersSection,
  contracts: SdContractsSection,
  sla: SdSlaSection,
  'knowledge-base': SdKnowledgeBaseSection,
  'service-catalog': SdServiceCatalogSection,
  'change-requests': SdChangeRequestsSection,
  'problem-management': SdProblemsSection,
  'customer-assets': SdCustomerAssetsSection,
  announcements: SdAnnouncementsSection,
  reports: SdReportsSection,
  automation: SdAutomationSection,
  settings: SdSettingsSection,
  'audit-logs': SdAuditLogsSection,
}
