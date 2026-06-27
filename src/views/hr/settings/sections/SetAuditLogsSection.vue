<template>
  <div class="al">
    <SetSectionHead eyebrow="Governance · Ledger" title="Audit" accent="Logs"
      accent-color="var(--set-gold)" :icon="History"
      sub="Every configuration change across HR Settings — masters, instruments, statutory rates and org structure — sealed into one immutable, hash-ordered provenance ledger.">
      <template #actions>
        <Motion as="button" class="set-btn set-btn-steel" :disabled="!filtered.length"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" title="Export visible entries (CSV)" @click="exportCsv">
          <Download :size="14" /> Export
        </Motion>
        <Motion as="button" class="set-btn set-btn-steel" :disabled="loading"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" title="Refresh" @click="reload">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </Motion>
      </template>

      <template #lenses>
        <div class="al-lenses">
          <button v-for="l in lenses" :key="l.key || 'all'" class="al-lens" :class="{ on: actionFilter === l.key }"
            :style="{ '--lc': l.color }" @click="setAction(l.key)">
            <span class="al-lens-ic"><component :is="l.icon" :size="15" /></span>
            <span class="al-lens-num"><SetCountUp :value="l.count" /></span>
            <span class="al-lens-lab">{{ l.label }}</span>
            <span class="al-lens-bar" aria-hidden="true" />
          </button>
        </div>
      </template>
    </SetSectionHead>

    <!-- Signature instrument -->
    <LedgerSpectrogram :rows="enriched" :total="serverTotal" :total-domains="DOMAIN_COUNT" :loading="loading && !rows.length" />

    <!-- Controls bar -->
    <div class="al-controls">
      <div class="al-ctrl-left">
        <span class="al-ctrl-cap"><ListFilter :size="13" /> Filter by domain</span>
        <div class="al-domain"><SetSelect v-model="domainFilter" :options="domainOptions" placeholder="All domains" /></div>
      </div>
      <div class="al-ctrl-right">
        <span v-if="serverTotal > rows.length" class="al-cap">Latest <b>{{ rows.length }}</b> of <b>{{ serverTotal }}</b> sealed</span>
        <span class="al-ctrl-count"><b>{{ filtered.length }}</b> {{ filtered.length === 1 ? 'entry' : 'entries' }}</span>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading && !rows.length" class="al-feed">
      <span class="al-spine" aria-hidden="true" />
      <div v-for="n in 6" :key="n" class="al-skel-row"><span class="al-skel-beam" /></div>
    </div>

    <!-- Empty -->
    <SetEmptyState v-else-if="!filtered.length" :icon="History" accent-color="var(--set-gold)"
      :title="rows.length ? 'No matching changes' : 'No settings changes yet'"
      :sub="rows.length ? 'Adjust the filters above to widen the ledger.' : 'Configuration changes will appear here the moment you tune any HR Setting.'" />

    <!-- Ledger feed (spine timeline, 10/page) -->
    <div v-else class="al-feed" :key="page">
      <span class="al-spine" aria-hidden="true" />
      <article v-for="(r, i) in paged" :key="r.id" class="al-row" :data-open="open.has(r.id)"
        :style="{ '--i': i, '--ac': r._act.color, '--dom': r._dom.accent }">
        <span class="al-node" aria-hidden="true"><i /></span>

        <button class="al-card" @click="toggle(r.id)">
          <span class="al-glyph"><component :is="r._dom.icon" :size="15" /></span>
          <div class="al-bodywrap">
            <div class="al-line">
              <span class="al-dom">{{ r._dom.label }}</span>
              <span class="al-act"><component :is="r._act.icon" :size="11" /> {{ r._act.label }}</span>
              <span class="al-src" :data-src="r.source">{{ r.source }}</span>
              <span class="al-time">{{ relTime(r.created_at) }}</span>
            </div>
            <div class="al-note">{{ r.note || '—' }}</div>
            <div class="al-foot">
              <span class="al-actor"><UserRound :size="11" /> {{ r.actor_name || 'System' }}</span>
              <span v-if="r._diff.length" class="al-diffcount">{{ r._diff.length }} field{{ r._diff.length === 1 ? '' : 's' }} changed</span>
            </div>
          </div>
          <span class="al-chev" :class="{ open: open.has(r.id) }"><ChevronDown :size="15" /></span>
        </button>

        <div class="al-detail">
          <div class="al-detail-in">
            <div class="al-detail-pad">
              <div v-if="r.from_status || r.to_status" class="al-morph">
                <span class="al-morph-chip from">{{ r.from_status || '—' }}</span>
                <ArrowRight :size="12" />
                <span class="al-morph-chip to">{{ r.to_status || '—' }}</span>
              </div>

              <div v-if="r._diff.length" class="al-diff">
                <div v-for="d in r._diff" :key="d.key" class="al-diff-row">
                  <span class="al-diff-key set-mono">{{ d.key }}</span>
                  <span class="al-diff-old">{{ d.from }}</span>
                  <ArrowRight :size="11" />
                  <span class="al-diff-new">{{ d.to }}</span>
                </div>
              </div>
              <p v-else-if="!r.from_status && !r.to_status" class="al-nodiff">No field-level snapshot was captured for this entry.</p>

              <div class="al-detail-meta">
                <span class="al-ts set-mono"><Clock3 :size="11" /> {{ fmtTs(r.created_at) }}</span>
                <button v-if="r._dom.link" class="al-jump" @click.stop="openDomain(r._dom.slug)">
                  Open {{ r._dom.label }} <ArrowUpRight :size="12" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>

    <SetPager :page="page" :page-count="pageCount" :total="filtered.length" :limit="PER" @update:page="goPage" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { Motion } from 'motion-v'
import {
  History, RefreshCw, Download, Plus, FilePen, Trash2, Settings2, Layers,
  ArrowRight, ArrowUpRight, ChevronDown, UserRound, ListFilter, Clock3, ScrollText,
} from 'lucide-vue-next'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetEmptyState from '../components/SetEmptyState.vue'
import SetCountUp from '../components/SetCountUp.vue'
import SetSelect from '../components/SetSelect.vue'
import SetPager from '../components/SetPager.vue'
import LedgerSpectrogram from '../components/LedgerSpectrogram.vue'
import { DOMAIN_BY_SLUG, DOMAINS } from '../components/connectivity'
import { listSettingsAudit, errText } from '../composables/useHrSettings'

const toast = useToast()
const router = useRouter()

const PER = 10
const LOAD = 200
const loading = ref(false)
const rows = ref([])
const serverTotal = ref(0)
const actionFilter = ref('')
const domainFilter = ref('')
const page = ref(1)
const open = ref(new Set())

const DOMAIN_COUNT = DOMAINS.filter(d => d.kind !== 'dashboard' && d.kind !== 'audit').length

// ── entity_type → settings domain (single source of truth = connectivity.js) ──
const ENTITY_DOMAIN = {
  DEPARTMENT: 'departments', DESIGNATION: 'designations', GRADE: 'grades', WORK_LOCATION: 'work-locations',
  EmploymentTypeMaster: 'employment-types', EmployeeCategoryMaster: 'employee-categories',
  SeparationReasonMaster: 'separation-reasons', NUMBERING: 'numbering-series', PAYROLL_RULE: 'payroll-rules',
  APPRAISAL_TEMPLATE: 'appraisal-templates', NOTIFICATION_RULE: 'notification-rules',
  APPROVAL_WORKFLOW: 'approval-workflows', MERIT_POLICY: 'merit-policy', COMPLIANCE: 'compliance',
  ASSET_CATEGORY: 'asset-categories', ASSET_TYPE: 'asset-types', RECRUITMENT_PANEL: 'recruitment',
  ONBOARDING_CHECKLIST: 'onboarding', WELCOME_KIT: 'onboarding', TRAINING_SKILL: 'training',
}
function prettyEntity(e) {
  if (!e) return 'Setting'
  const s = String(e).replace(/Master$/, '').replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
  return s.replace(/\b\w/g, c => c.toUpperCase())
}
function domainMeta(entity) {
  const slug = ENTITY_DOMAIN[entity]
  const d = slug && DOMAIN_BY_SLUG[slug]
  if (d) return { slug, label: d.label.replace(/ Settings$/, ''), accent: d.accent, icon: d.icon, link: `/admin/hr/settings/${slug}` }
  return { slug: '', label: prettyEntity(entity), accent: '#9ca3af', icon: History, link: '' }
}

const ACTION_META = {
  CREATE: { key: 'CREATE', label: 'Created', icon: Plus, color: 'var(--set-ok)' },
  UPDATE: { key: 'UPDATE', label: 'Updated', icon: FilePen, color: 'var(--set-gold)' },
  DELETE: { key: 'DELETE', label: 'Removed', icon: Trash2, color: 'var(--set-conflict)' },
  CONFIG: { key: 'CONFIG', label: 'Config', icon: Settings2, color: 'var(--set-orange)' },
}
function actionMeta(action, source) {
  if (source === 'compliance') return ACTION_META.CONFIG
  const a = (action || '').toUpperCase()
  if (a === 'CREATE') return ACTION_META.CREATE
  if (a === 'DELETE') return ACTION_META.DELETE
  if (a === 'CONFIG_CHANGE' || a === 'CONFIG') return ACTION_META.CONFIG
  return ACTION_META.UPDATE
}

// ── diff builder (before/after snapshots now exposed by the API) ──────────────
const NOISE = new Set(['updated_at', 'created_at', 'id'])
function shortVal(v) {
  if (v === null || v === undefined) return '∅'
  if (typeof v === 'object') { try { return JSON.stringify(v).slice(0, 44) } catch { return '…' } }
  const s = String(v); return s.length > 44 ? s.slice(0, 44) + '…' : s
}
function buildDiff(before, after) {
  const out = []
  const b = before && typeof before === 'object' ? before : null
  const a = after && typeof after === 'object' ? after : null
  if (b && a) {
    for (const k of new Set([...Object.keys(b), ...Object.keys(a)])) {
      if (NOISE.has(k)) continue
      if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) out.push({ key: k, from: shortVal(b[k]), to: shortVal(a[k]) })
    }
  } else if (a) {
    for (const k of Object.keys(a)) { if (!NOISE.has(k)) out.push({ key: k, from: '∅', to: shortVal(a[k]) }) }
  } else if (b) {
    for (const k of Object.keys(b)) { if (!NOISE.has(k)) out.push({ key: k, from: shortVal(b[k]), to: '∅' }) }
  }
  return out.slice(0, 7)
}

const enriched = computed(() => rows.value.map(r => ({
  ...r,
  _dom: domainMeta(r.entity_type),
  _act: actionMeta(r.action, r.source),
  _date: r.created_at ? new Date(r.created_at) : null,
  _diff: buildDiff(r.before, r.after),
})))

const counts = computed(() => {
  const c = { CREATE: 0, UPDATE: 0, DELETE: 0, CONFIG: 0 }
  for (const r of enriched.value) c[r._act.key]++
  return c
})
const lenses = computed(() => [
  { key: '', label: 'All sealed', icon: ScrollText, color: 'var(--set-gold)', count: enriched.value.length },
  { key: 'CREATE', label: 'Created', icon: Plus, color: 'var(--set-ok)', count: counts.value.CREATE },
  { key: 'UPDATE', label: 'Updated', icon: FilePen, color: 'var(--set-gold)', count: counts.value.UPDATE },
  { key: 'DELETE', label: 'Removed', icon: Trash2, color: 'var(--set-conflict)', count: counts.value.DELETE },
  { key: 'CONFIG', label: 'Config / statutory', icon: Settings2, color: 'var(--set-orange)', count: counts.value.CONFIG },
])

const domainOptions = computed(() => {
  const seen = {}
  for (const r of enriched.value) {
    const d = r._dom
    if (d.slug && !seen[d.slug]) seen[d.slug] = { value: d.slug, label: d.label, icon: d.icon, dot: d.accent }
  }
  return [{ value: '', label: 'All domains', icon: Layers }, ...Object.values(seen).sort((a, b) => a.label.localeCompare(b.label))]
})

const filtered = computed(() => enriched.value.filter(r =>
  (!actionFilter.value || r._act.key === actionFilter.value) &&
  (!domainFilter.value || r._dom.slug === domainFilter.value)
))
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PER)))
const paged = computed(() => { const s = (page.value - 1) * PER; return filtered.value.slice(s, s + PER) })

watch([actionFilter, domainFilter], () => { page.value = 1 })
watch(pageCount, (c) => { if (page.value > c) page.value = c })

function setAction(key) { actionFilter.value = (actionFilter.value === key && key !== '') ? '' : key }
function goPage(n) { page.value = n; open.value = new Set() }
function toggle(id) { const s = new Set(open.value); s.has(id) ? s.delete(id) : s.add(id); open.value = s }
function openDomain(slug) { if (slug) router.push(`/admin/hr/settings/${slug}`) }

async function load() {
  loading.value = true
  try {
    const data = await listSettingsAudit({ limit: LOAD })
    rows.value = data.items || []
    serverTotal.value = data.total || rows.value.length
  } catch (e) { toast.error(errText(e, 'Failed to load audit logs')) }
  finally { loading.value = false }
}
const reload = () => { page.value = 1; open.value = new Set(); load() }
onMounted(load)

function relTime(iso) {
  if (!iso) return ''
  const d = new Date(iso); const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return d.toLocaleDateString('en-IN')
}
function fmtTs(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' }) } catch { return iso }
}

function exportCsv() {
  const head = ['timestamp', 'domain', 'action', 'source', 'actor', 'note']
  const lines = [head.join(',')]
  for (const r of filtered.value) {
    const cells = [r.created_at || '', r._dom.label, r._act.label, r.source, r.actor_name || 'System', r.note || '']
    lines.push(cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'hr-settings-audit-ledger.csv'; a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.al { display: flex; flex-direction: column; gap: 16px; }

/* ── telemetry lenses ─────────────────────────────────────────────────────── */
.al-lenses { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 9px; }
.al-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 2px;
  padding: 11px 13px 13px; border-radius: 14px; cursor: pointer; text-align: left;
  background: var(--set-surface); border: 1px solid var(--set-border);
  transition: border-color 0.22s var(--set-spring), background 0.22s, transform 0.22s var(--set-spring); }
.al-lens:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--lc) 38%, transparent); background: var(--set-surface-elevated); }
.al-lens.on { border-color: color-mix(in srgb, var(--lc) 55%, transparent); background: color-mix(in srgb, var(--lc) 9%, var(--set-surface)); }
.al-lens-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; margin-bottom: 4px;
  color: var(--lc); background: color-mix(in srgb, var(--lc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--lc) 26%, transparent); }
.al-lens-num { font-size: 21px; font-weight: 850; line-height: 1; color: var(--set-text); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.al-lens-lab { font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em; color: var(--set-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.al-lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--lc); transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--set-spring); }
.al-lens:hover .al-lens-bar, .al-lens.on .al-lens-bar { transform: scaleX(1); }

/* ── controls bar ─────────────────────────────────────────────────────────── */
.al-controls { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.al-ctrl-left { display: flex; align-items: center; gap: 11px; min-width: 0; }
.al-ctrl-cap { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--set-text-dim); white-space: nowrap; }
.al-ctrl-cap :deep(svg) { color: var(--set-gold); }
.al-domain { width: 210px; }
.al-ctrl-right { display: inline-flex; align-items: center; gap: 14px; }
.al-cap { font-size: 11px; color: var(--set-text-dim); }
.al-cap b { color: var(--set-text-secondary); font-weight: 750; }
.al-ctrl-count { font-size: 12px; color: var(--set-text-muted); }
.al-ctrl-count b { color: var(--set-gold); font-weight: 800; font-variant-numeric: tabular-nums; }

/* ── ledger spine feed ────────────────────────────────────────────────────── */
.al-feed { position: relative; display: flex; flex-direction: column; gap: 9px; padding-left: 26px; }
.al-spine { position: absolute; left: 9px; top: 6px; bottom: 6px; width: 2px; border-radius: 2px;
  background: linear-gradient(180deg, transparent, var(--set-border-strong) 8%, var(--set-border-strong) 92%, transparent); }

.al-row { position: relative; --i: 0; animation: set-deal 0.5s var(--set-spring) backwards; animation-delay: calc(var(--i) * 0.055s); }
.al-node { position: absolute; left: -21px; top: 18px; width: 14px; height: 14px; display: grid; place-items: center; z-index: 2; }
.al-node i { width: 10px; height: 10px; border-radius: 50%; background: var(--set-canvas); border: 2px solid var(--ac);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ac) 16%, transparent), 0 0 10px color-mix(in srgb, var(--ac) 55%, transparent); transition: transform 0.22s var(--set-spring); }
.al-row[data-open="true"] .al-node i { transform: scale(1.25); }

.al-card { display: grid; grid-template-columns: auto 1fr auto; align-items: start; gap: 13px; width: 100%; text-align: left;
  padding: 13px 15px; border-radius: 14px; cursor: pointer;
  background: var(--set-surface); border: 1px solid var(--set-border); border-left: 3px solid var(--ac);
  transition: background 0.2s, border-color 0.2s, box-shadow 0.25s, transform 0.2s var(--set-spring); }
.al-card:hover { background: var(--set-surface-elevated); border-color: var(--set-border-strong); transform: translateX(2px); box-shadow: var(--set-card-shadow); }
.al-row[data-open="true"] .al-card { background: var(--set-surface-elevated); border-color: color-mix(in srgb, var(--ac) 40%, var(--set-border)); }

.al-glyph { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px;
  color: var(--dom); background: color-mix(in srgb, var(--dom) 13%, transparent); border: 1px solid color-mix(in srgb, var(--dom) 30%, transparent); }
.al-bodywrap { min-width: 0; }
.al-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.al-dom { font-size: 13.5px; font-weight: 800; color: var(--set-text); letter-spacing: -0.01em; }
.al-act { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;
  padding: 2px 8px; border-radius: 999px; color: var(--ac); background: color-mix(in srgb, var(--ac) 13%, transparent); border: 1px solid color-mix(in srgb, var(--ac) 26%, transparent); }
.al-src { font-size: 8.5px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; padding: 2px 7px; border-radius: 999px;
  color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); }
.al-src[data-src="compliance"] { color: var(--set-ok); background: var(--set-ok-soft); border-color: color-mix(in srgb, var(--set-ok) 30%, transparent); }
.al-time { margin-left: auto; font-size: 10.5px; color: var(--set-text-dim); white-space: nowrap; }
.al-note { font-size: 12.5px; color: var(--set-text-secondary); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.al-foot { display: flex; align-items: center; gap: 12px; margin-top: 6px; }
.al-actor { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--set-text-muted); }
.al-actor :deep(svg) { color: var(--set-text-dim); }
.al-diffcount { font-size: 9.5px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--set-text-dim); }
.al-chev { color: var(--set-text-dim); transition: transform 0.28s var(--set-spring), color 0.2s; padding-top: 2px; }
.al-chev.open { transform: rotate(180deg); color: var(--ac); }

/* expand (grid-rows 0fr→1fr — smooth + reliable, no JS height) */
.al-detail { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.34s var(--set-spring); }
.al-row[data-open="true"] .al-detail { grid-template-rows: 1fr; }
.al-detail-in { overflow: hidden; }
.al-detail-pad { display: flex; flex-direction: column; gap: 11px; margin: 2px 0 0 0; padding: 13px 15px;
  border-radius: 13px; background: var(--set-panel); border: 1px solid var(--set-border); }

.al-morph { display: inline-flex; align-items: center; gap: 8px; }
.al-morph :deep(svg) { color: var(--set-text-dim); }
.al-morph-chip { font-family: var(--set-mono); font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 7px;
  background: var(--set-surface); border: 1px solid var(--set-border); color: var(--set-text-secondary); }
.al-morph-chip.to { color: var(--set-ok); border-color: color-mix(in srgb, var(--set-ok) 32%, transparent); background: var(--set-ok-soft); }

.al-diff { display: flex; flex-direction: column; gap: 5px; }
.al-diff-row { display: grid; grid-template-columns: minmax(90px, 0.4fr) 1fr auto 1fr; align-items: center; gap: 9px; font-size: 11.5px; }
.al-diff-row :deep(svg) { color: var(--set-text-dim); }
.al-diff-key { font-size: 10.5px; font-weight: 700; color: var(--set-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.al-diff-old { color: var(--set-text-dim); text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--set-conflict) 60%, transparent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.al-diff-new { color: var(--set-text); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.al-nodiff { font-size: 11px; color: var(--set-text-dim); font-style: italic; margin: 0; }

.al-detail-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding-top: 10px; border-top: 1px dashed var(--set-border); }
.al-ts { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--set-text-dim); }
.al-ts :deep(svg) { color: var(--set-text-dim); }
.al-jump { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer;
  padding: 5px 11px; border-radius: 9px; color: var(--set-gold); background: var(--set-partial-soft);
  border: 1px solid color-mix(in srgb, var(--set-gold) 30%, transparent); transition: all 0.2s var(--set-spring); }
.al-jump:hover { background: color-mix(in srgb, var(--set-gold) 18%, transparent); transform: translateX(2px); }

/* skeleton */
.al-skel-row { position: relative; overflow: hidden; height: 78px; border-radius: 14px; background: var(--set-surface); border: 1px solid var(--set-border); border-left: 3px solid var(--set-border-strong); }
.al-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--set-gold) 8%, transparent) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (max-width: 860px) {
  .al-lenses { grid-template-columns: repeat(2, 1fr); }
  .al-domain { width: 100%; }
  .al-ctrl-left { width: 100%; flex-direction: column; align-items: flex-start; }
}
@media (prefers-reduced-motion: reduce) {
  .al-row { animation: none; }
  .al-card, .al-chev, .al-node i, .al-lens, .al-detail { transition: none; }
  .al-skel-beam { animation: none; }
}
</style>
