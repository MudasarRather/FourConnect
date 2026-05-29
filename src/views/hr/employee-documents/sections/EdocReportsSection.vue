<template>
  <div class="edoc-section">
    <div class="rep-pills">
      <button v-for="r in REPORTS" :key="r.key" class="rep-pill edoc-press" :class="{ 'is-active': active === r.key }" @click="select(r.key)">
        <component :is="r.icon" :size="15" />
        <span>{{ r.label }}</span>
      </button>
    </div>

    <Motion as="div" class="rep-panel edoc-card" :key="active"
      :initial="{ opacity: 0, y: 14, filter: 'blur(6px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
      :transition="{ duration: 0.45, ease: EASE }">
      <div class="rep-head">
        <div>
          <span class="edoc-eyebrow">Report</span>
          <h3 class="rep-title">{{ current.label }}</h3>
          <span class="rep-sub">{{ rows.length }} record{{ rows.length === 1 ? '' : 's' }}</span>
        </div>
        <div class="rep-actions">
          <button class="edoc-btn edoc-btn-sm" :disabled="!rows.length" @click="exportCsv"><Download :size="13" /> CSV</button>
          <button class="edoc-btn edoc-btn-sm" :disabled="!rows.length" @click="exportPdf"><FileDown :size="13" /> PDF</button>
        </div>
      </div>

      <div v-if="loading" class="rep-rows"><div v-for="i in 6" :key="i" class="edoc-skel" style="height:42px" /></div>
      <EdocEmptyState v-else-if="!rows.length" :icon="current.icon" :title="`Nothing to report`" body="No records match this report right now." />
      <div v-else class="rep-table">
        <div class="rt-head">
          <span v-for="c in current.columns" :key="c.k" :style="{ flex: c.flex || 1 }">{{ c.label }}</span>
        </div>
        <Motion v-for="(row, i) in rows" :key="i" as="div" class="rt-row"
          :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.3, delay: Math.min(i * 0.02, 0.4), ease: EASE }">
          <span v-for="c in current.columns" :key="c.k" :style="{ flex: c.flex || 1 }" class="rt-cell">
            <EdocStatusChip v-if="c.k === 'verification_status'" :status="row[c.k]" />
            <template v-else>{{ format(row, c) }}</template>
          </span>
        </Motion>
      </div>
    </Motion>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { FileX2, ClipboardCheck, CalendarClock, ShieldAlert, Layers, ShieldCheck, Download, FileDown } from 'lucide-vue-next'
import EdocEmptyState from '../components/EdocEmptyState.vue'
import EdocStatusChip from '../components/EdocStatusChip.vue'
import { useEmployeeDocuments, fetchEdocDashboard } from '@/composables/useEmployeeDocuments'

const EASE = [0.16, 1, 0.3, 1]
const api = useEmployeeDocuments()

const DOC_COLS = [
  { k: 'employee_name', label: 'Employee', flex: 1.4 },
  { k: 'employee_code', label: 'Code', flex: 0.9 },
  { k: 'category', label: 'Category', flex: 1 },
  { k: 'doc_type', label: 'Type', flex: 1.2 },
  { k: 'verification_status', label: 'Status', flex: 1 },
  { k: 'expiry_date', label: 'Expiry', flex: 1, fmt: 'date' },
]
const SUMMARY_COLS = [{ k: 'label', label: 'Segment', flex: 2 }, { k: 'value', label: 'Count', flex: 1 }]

const REPORTS = [
  { key: 'expired', label: 'Expired Documents', icon: FileX2, kind: 'docs', columns: DOC_COLS, load: async () => { api.setFilters({ status: 'EXPIRED', category: null, archived: false, q: '', limit: 200 }); await api.fetchList(); return api.items.value } },
  { key: 'pending', label: 'Pending Verification', icon: ClipboardCheck, kind: 'docs', columns: DOC_COLS, load: async () => { await api.fetchQueue(1, 200); return api.items.value } },
  { key: 'expiring', label: 'Expiring (90 days)', icon: CalendarClock, kind: 'docs', columns: DOC_COLS, load: async () => { await api.fetchExpiring(90); return api.items.value.filter(d => (d.days_to_expiry ?? 1) >= 0) } },
  { key: 'compliance', label: 'Compliance Pending', icon: ShieldAlert, kind: 'docs', columns: DOC_COLS, load: async () => { api.setFilters({ category: 'COMPLIANCE', status: 'PENDING', archived: false, q: '', limit: 200 }); await api.fetchList(); return api.items.value } },
  { key: 'verification', label: 'Verification Summary', icon: ShieldCheck, kind: 'summary', columns: SUMMARY_COLS, load: async () => (await fetchEdocDashboard()).verification_status || [] },
  { key: 'category', label: 'Category Summary', icon: Layers, kind: 'summary', columns: SUMMARY_COLS, load: async () => (await fetchEdocDashboard()).category_distribution || [] },
]

const active = ref('expired')
const rows = ref([])
const loading = ref(false)
const current = computed(() => REPORTS.find(r => r.key === active.value))

const select = async (k) => { active.value = k; await load() }
const load = async () => {
  loading.value = true
  try { rows.value = await current.value.load() }
  catch { rows.value = [] }
  finally { loading.value = false }
}

const format = (row, c) => {
  const v = row[c.k]
  if (c.fmt === 'date') return v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  if (typeof v === 'string') return v.replace(/_/g, ' ')
  return v ?? '—'
}

const exportCsv = () => {
  const cols = current.value.columns
  const head = cols.map(c => c.label).join(',')
  const body = rows.value.map(r => cols.map(c => `"${String(format(r, c)).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([`${head}\n${body}`], { type: 'text/csv' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${active.value}-report.csv`; a.click(); URL.revokeObjectURL(a.href)
}
const exportPdf = () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  doc.setFillColor(245, 158, 11); doc.rect(0, 0, doc.internal.pageSize.getWidth(), 6, 'F')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(26, 20, 16)
  doc.text(current.value.label, 40, 44)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120, 108, 92)
  doc.text(`Fourreck · ${new Date().toLocaleString('en-IN')} · ${rows.value.length} records`, 40, 60)
  autoTable(doc, {
    startY: 78,
    head: [current.value.columns.map(c => c.label)],
    body: rows.value.map(r => current.value.columns.map(c => format(r, c))),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [26, 20, 16], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [250, 246, 238] },
  })
  doc.save(`${active.value}-report.pdf`)
}

onMounted(load)
</script>

<style scoped>
.rep-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.rep-pill {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 12px; cursor: pointer;
  background: var(--edoc-surface); border: 1px solid var(--hr-border); color: var(--hr-text-muted);
  font-size: 12.5px; font-weight: 600; transition: all 0.2s var(--edoc-spring);
}
.rep-pill:hover { color: var(--hr-text-secondary); border-color: var(--hr-border-warm); }
.rep-pill.is-active { background: var(--hr-accent-gold-soft); border-color: var(--hr-accent-gold); color: var(--hr-accent-gold); }
.rep-panel { padding: 18px; }
.rep-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
.rep-title { margin: 2px 0 1px; font-size: 18px; font-weight: 800; color: var(--hr-text); }
.rep-sub { font-size: 12px; color: var(--hr-text-muted); }
.rep-actions { display: flex; gap: 6px; }
.rep-rows { display: flex; flex-direction: column; gap: 8px; }
.rep-table { display: flex; flex-direction: column; }
.rt-head { display: flex; gap: 10px; padding: 8px 12px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--hr-text-muted); border-bottom: 1px solid var(--edoc-grid-line); }
.rt-row { display: flex; gap: 10px; padding: 11px 12px; border-bottom: 1px solid var(--edoc-grid-line); align-items: center; }
.rt-row:hover { background: rgba(251,191,36,0.05); }
.rt-cell { font-size: 12.5px; color: var(--hr-text-secondary); text-transform: capitalize; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
[data-theme="light"] .rep-title { color: #1a1410; }
[data-theme="light"] .rt-row:hover { background: rgba(217,119,6,0.06); }
</style>
