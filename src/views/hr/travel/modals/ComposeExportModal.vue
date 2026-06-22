<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="ce-ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion class="ce-modal" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 22, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.98 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }"
          :style="{ '--ac': sel.accent, '--soft': sel.soft, '--deep': sel.deep }">
          <span class="ce-edge" aria-hidden="true" />

          <!-- ══ Live cover preview (morphs by report + format) ══ -->
          <div class="ce-preview">
            <span class="ce-pv-aura" aria-hidden="true" />
            <span class="ce-pv-label"><Eye :size="12" /> Live preview · {{ fmt.toUpperCase() }}</span>

            <!-- PDF cover skin — full-bleed, mirrors the rendered PDF cover -->
            <div v-if="fmt === 'pdf'" class="pv-doc pv-cover" :class="{ dark: cover.dark }" :style="{ background: cover.bg }">
              <component :is="selIcon" class="pv-scene" :size="280" aria-hidden="true" />
              <div v-if="cover.overlay" class="pv-overlay" :style="{ background: cover.overlay }" />
              <div class="pv-cv" :style="{ color: cover.ink }">
                <div class="pv-cv-top">
                  <span class="pv-cv-crest" :style="{ background: cover.crestBg, color: cover.ink }">F</span>
                  <span class="pv-cv-grp" :style="{ background: cover.chipBg, borderColor: cover.chipBd }">{{ (sel.group || '').toUpperCase() }}</span>
                </div>
                <div class="pv-cv-foot">
                  <div class="pv-cv-kick">{{ (sel.tagline || '').toUpperCase() }}</div>
                  <h3 class="pv-cv-title">{{ sel.name }}</h3>
                  <p class="pv-cv-sub" :style="{ color: cover.sub }">{{ sel.description }}</p>
                  <div class="pv-cv-meta">
                    <div class="pv-cv-hero"><b>{{ count }}</b><span :style="{ color: cover.sub }">RECORDS</span></div>
                    <div class="pv-cv-div" :style="{ background: cover.chipBd }" />
                    <div class="pv-cv-period">
                      <span class="pv-cv-plab" :style="{ color: cover.sub }">REPORTING PERIOD</span>
                      <span class="pv-cv-pval">{{ periodLabel }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Excel skin -->
            <div v-else-if="fmt === 'excel'" class="pv-doc pv-xls">
              <div class="pv-xls-bar"><span /><span class="pv-xls-title">{{ sel.name }}</span></div>
              <div class="pv-xls-grid">
                <div class="pv-xls-row head"><span v-for="c in 4" :key="c" /></div>
                <div v-for="r in 5" :key="r" class="pv-xls-row" :class="{ zeb: r % 2 }"><span v-for="c in 4" :key="c" /></div>
              </div>
              <div class="pv-xls-chart"><span v-for="b in 7" :key="b" :style="{ height: chartH(b) }" /></div>
            </div>

            <!-- CSV skin -->
            <div v-else class="pv-doc pv-csv">
              <pre><span class="cmt"># Fourreck Travel — {{ sel.name }}</span>
<span class="cmt"># Period: {{ periodLabel }}</span>
<span class="cmt"># Generated: now | Rows: {{ count }}</span>
<span class="cmt">#</span>
{{ csvHeader }}
<span class="row">{{ csvSample }}</span>
<span class="row dim">{{ csvSample2 }}</span></pre>
            </div>
          </div>

          <!-- ══ Controls ══ -->
          <div class="ce-form">
            <header class="ce-head">
              <div><span class="ce-eyebrow"><Wand2 :size="12" /> Compose export</span>
                <h3 class="ce-title">Dispatch a report</h3></div>
              <button class="ce-x" @click="$emit('close')"><X :size="17" /></button>
            </header>

            <label class="ce-field">
              <span class="ce-lab">Report</span>
              <TrvSelect v-model="key" :options="reportOpts" />
            </label>

            <div class="ce-row">
              <label class="ce-field"><span class="ce-lab">From</span>
                <HrDatePicker v-model="from" placeholder="Start date" clearable /></label>
              <label class="ce-field"><span class="ce-lab">To</span>
                <HrDatePicker v-model="to" placeholder="End date" clearable /></label>
            </div>

            <label class="ce-field">
              <span class="ce-lab">Department scope</span>
              <TrvSelect v-model="dept" :options="deptOpts" />
            </label>

            <div class="ce-field">
              <span class="ce-lab">Format</span>
              <div class="ce-fmts">
                <button v-for="f in FORMATS" :key="f.key" type="button" class="ce-fmt" :class="{ on: fmt === f.key }"
                  :style="{ '--c': sel.accent }" @click="fmt = f.key">
                  <component :is="f.icon" :size="15" /> {{ f.label }}
                </button>
              </div>
            </div>

            <Motion as="button" type="button" class="ce-go" :disabled="busy"
              :whileHover="busy ? {} : { y: -2, scale: 1.02 }" :whileTap="busy ? {} : { scale: 0.97 }"
              @click="generate">
              <Loader2 v-if="busy" :size="16" class="spin" /><Download v-else :size="16" />
              {{ busy ? 'Composing…' : `Generate ${fmt.toUpperCase()}` }}
            </Motion>
            <p class="ce-note">Branded {{ fmt.toUpperCase() }} rendered server-side — every report carries its own cover design.</p>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Wand2, Eye, Download, Loader2, FileType2, Sheet, FileSpreadsheet } from 'lucide-vue-next'
import TrvSelect from '../components/TrvSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  reports: { type: Array, default: () => [] },     // index items (accent/soft/deep/group/...)
  initial: { type: Object, default: null },
  departments: { type: Array, default: () => [] }, // [{value,label}]
  counts: { type: Object, default: () => ({}) },
  iconMap: { type: Object, default: () => ({}) },
  scope: { type: Object, default: () => ({}) },    // { date_from, date_to, department_id }
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'generate'])

const FORMATS = [
  { key: 'pdf', label: 'PDF', icon: FileType2 },
  { key: 'excel', label: 'Excel', icon: Sheet },
  { key: 'csv', label: 'CSV', icon: FileSpreadsheet },
]

const key = ref('')
const fmt = ref('pdf')
const from = ref('')
const to = ref('')
const dept = ref('')

watch(() => props.open, (o) => {
  if (!o) return
  key.value = props.initial?.key || props.reports[0]?.key || ''
  fmt.value = 'pdf'
  from.value = props.scope?.date_from || ''
  to.value = props.scope?.date_to || ''
  dept.value = props.scope?.department_id || ''
})

const sel = computed(() => props.reports.find(r => r.key === key.value)
  || props.initial || { name: '—', group: '', accent: '#fbbf24', soft: '#fef3c7', deep: '#92400e', description: '', tagline: '' })
const selIcon = computed(() => props.iconMap[key.value] || null)
const count = computed(() => Number(props.counts[key.value]) || 0)

// Mirror the PDF cover treatment per motif (see pdf.py _SCENES): dark motifs get
// a near-black gradient, ledger gets paper, the rest get an accent→deep gradient.
const DARK_MOTIFS = new Set(['manifest', 'atlas', 'vault', 'aging', 'tower'])
const cover = computed(() => {
  const m = sel.value.motif, a = sel.value.accent, d = sel.value.deep
  if (m === 'ledger') {
    return { bg: '#fbf7ee', ink: '#1a1208', sub: '#5a4a33', dark: false, crestBg: d,
      chipBg: 'rgba(0,0,0,0.05)', chipBd: 'rgba(0,0,0,0.16)', overlay: '' }
  }
  const dark = DARK_MOTIFS.has(m)
  return {
    bg: dark ? `linear-gradient(160deg, ${d}, #0b0a0c)` : `linear-gradient(150deg, ${a}, ${d})`,
    ink: '#ffffff', sub: 'rgba(255,255,255,0.82)', dark: true, crestBg: 'rgba(255,255,255,0.18)',
    chipBg: 'rgba(255,255,255,0.14)', chipBd: 'rgba(255,255,255,0.32)',
    overlay: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent 55%)',
  }
})

const reportOpts = computed(() => props.reports.map(r => ({ value: r.key, label: r.name, hint: r.group, dot: r.accent })))
const deptOpts = computed(() => [{ value: '', label: 'All departments' }, ...props.departments])

const periodLabel = computed(() => {
  const f = from.value, t = to.value
  const fmtD = (s) => { try { return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return s } }
  if (f && t) return `${fmtD(f)} → ${fmtD(t)}`
  if (f) return `From ${fmtD(f)}`
  if (t) return `Until ${fmtD(t)}`
  return 'All time'
})

const pvTiles = computed(() => ([
  { v: count.value, l: 'Records' },
  { v: sel.value.group || '—', l: 'Group' },
  { v: fmt.value.toUpperCase(), l: 'Format' },
  { v: '✓', l: 'Branded' },
]))
const csvHeader = computed(() => 'Reference,Employee,Departure,Status,Est. Cost')
const csvSample = computed(() => 'TR-26-000142,A. Sharma,18 Jun 2026,Approved,42500')
const csvSample2 = computed(() => 'TR-26-000139,R. Nair,12 Jun 2026,Completed,18900')
const chartH = (b) => `${[34, 58, 46, 72, 52, 80, 40][(b - 1) % 7]}%`

const generate = () => {
  if (props.busy || !key.value) return
  emit('generate', {
    key: key.value, format: fmt.value,
    date_from: from.value || undefined, date_to: to.value || undefined,
    department_id: dept.value || undefined,
  })
}
</script>

<style scoped>
.ce-ov { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 22px;
  background: rgba(6,6,6,0.62); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.ce-modal { position: relative; display: grid; grid-template-columns: 1fr 0.92fr; gap: 0; width: min(880px, 96vw);
  max-height: 92vh; overflow: hidden; border-radius: 22px; background: var(--trv-surface-elevated);
  border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow-hover); }
.ce-edge { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--ac), var(--deep)); z-index: 3; }

/* preview pane */
.ce-preview { position: relative; overflow: hidden; padding: 22px; background: linear-gradient(160deg, rgba(0,0,0,0.28), rgba(0,0,0,0.05)); }
.ce-pv-aura { position: absolute; inset: -30% 20% 40% -20%; pointer-events: none;
  background: radial-gradient(60% 70% at 20% 0%, color-mix(in srgb, var(--ac) 22%, transparent), transparent 70%); }
.ce-pv-label { position: relative; display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--trv-text-muted); margin-bottom: 12px; }
.ce-pv-label :deep(svg) { color: var(--ac); }

.pv-doc { position: relative; border-radius: 12px; background: #fffdf9; color: #1a1410; overflow: hidden;
  box-shadow: 0 16px 40px -12px rgba(0,0,0,0.5); min-height: 360px; }
/* pdf — full-bleed cover (mirrors the rendered PDF) */
.pv-cover { position: relative; min-height: 420px; overflow: hidden; }
.pv-scene { position: absolute; right: -40px; top: 50%; transform: translateY(-50%); color: #ffffff; opacity: 0.1; }
.pv-cover.dark .pv-scene { opacity: 0.12; }
.pv-cover:not(.dark) .pv-scene { color: var(--ac); opacity: 0.09; }
.pv-overlay { position: absolute; inset: 0; }
.pv-cv { position: absolute; inset: 0; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; }
.pv-cv-top { display: flex; align-items: center; justify-content: space-between; }
.pv-cv-crest { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; font-weight: 800; font-size: 16px; }
.pv-cv-grp { font-size: 8px; font-weight: 700; letter-spacing: 1.5px; padding: 4px 11px; border-radius: 999px; border: 1px solid; }
.pv-cv-kick { font-size: 8px; font-weight: 700; letter-spacing: 2px; opacity: 0.9; margin-bottom: 10px; }
.pv-cv-title { font-size: 27px; font-weight: 800; line-height: 1.04; margin: 0 0 8px; letter-spacing: -0.5px; }
.pv-cv-sub { font-size: 10.5px; line-height: 1.45; margin: 0 0 16px; max-width: 90%; }
.pv-cv-meta { display: flex; align-items: center; gap: 14px; }
.pv-cv-hero b { display: block; font-size: 24px; font-weight: 800; line-height: 1; }
.pv-cv-hero span { font-size: 7.5px; letter-spacing: 1.5px; }
.pv-cv-div { width: 1px; height: 30px; }
.pv-cv-period { display: flex; flex-direction: column; gap: 2px; }
.pv-cv-plab { font-size: 7px; font-weight: 700; letter-spacing: 1.5px; }
.pv-cv-pval { font-size: 11px; font-weight: 600; }
/* excel */
.pv-xls { padding: 14px; }
.pv-xls-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.pv-xls-bar > span:first-child { width: 26px; height: 26px; border-radius: 6px; background: linear-gradient(135deg, var(--ac), var(--deep)); }
.pv-xls-title { font-size: 13px; font-weight: 800; color: var(--deep); }
.pv-xls-grid { display: flex; flex-direction: column; gap: 4px; }
.pv-xls-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr 0.8fr; gap: 4px; }
.pv-xls-row span { height: 14px; border-radius: 3px; background: #eee6d6; }
.pv-xls-row.head span { background: var(--ac); }
.pv-xls-row.zeb span { background: #f6efe1; }
.pv-xls-chart { display: flex; align-items: flex-end; gap: 6px; height: 70px; margin-top: 14px; padding-top: 10px; border-top: 1px solid #ece3d3; }
.pv-xls-chart span { flex: 1; border-radius: 3px 3px 0 0; background: linear-gradient(180deg, var(--ac), var(--deep)); opacity: 0.85; }
/* csv */
.pv-csv { padding: 14px; background: #14110c; color: #d6cdbb; }
.pv-csv pre { margin: 0; font-family: var(--trv-mono); font-size: 10px; line-height: 1.7; white-space: pre-wrap; word-break: break-all; }
.pv-csv .cmt { color: #8a7a5f; }
.pv-csv .row { color: var(--ac); }
.pv-csv .row.dim { opacity: 0.6; }

/* form pane */
.ce-form { padding: 22px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
.ce-head { display: flex; align-items: flex-start; justify-content: space-between; }
.ce-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ac); }
.ce-title { font-size: 18px; font-weight: 800; color: var(--trv-text); margin: 5px 0 0; }
.ce-x { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; cursor: pointer;
  color: var(--trv-text-muted); background: var(--trv-panel); border: 1px solid var(--trv-border); }
.ce-x:hover { color: var(--trv-text); }
.ce-field { display: flex; flex-direction: column; gap: 6px; }
.ce-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ce-lab { font-size: 11px; font-weight: 650; color: var(--trv-text-secondary); }
.ce-fmts { display: flex; gap: 8px; }
.ce-fmt { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 11px;
  cursor: pointer; font-size: 12.5px; font-weight: 700; color: var(--trv-text-secondary); background: var(--trv-panel);
  border: 1px solid var(--trv-border); transition: all 0.2s; }
.ce-fmt:hover { color: var(--trv-text); border-color: var(--trv-border-strong); }
.ce-fmt.on { color: var(--c); border-color: color-mix(in srgb, var(--c) 50%, transparent); background: color-mix(in srgb, var(--c) 12%, transparent); }
.ce-go { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 13px; margin-top: 4px;
  border-radius: 12px; cursor: pointer; font-size: 13.5px; font-weight: 750; border: 1px solid transparent; color: #1a1205;
  background: linear-gradient(135deg, var(--ac), var(--deep)); box-shadow: 0 10px 26px -10px var(--ac); }
.ce-go:disabled { opacity: 0.7; cursor: progress; }
.ce-note { font-size: 11px; color: var(--trv-text-dim); margin: 0; line-height: 1.4; }
.spin { animation: trv-spin-slow 0.8s linear infinite; }

[data-theme="light"] .ce-ov { background: rgba(40,30,12,0.42); }
[data-theme="light"] .ce-go, [data-theme="light"] .pv-crest { color: #fff; }

@media (max-width: 720px) { .ce-modal { grid-template-columns: 1fr; max-height: 94vh; overflow-y: auto; } .ce-preview { display: none; } }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
