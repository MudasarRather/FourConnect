<template>
  <TrnDrawer :open="open" eyebrow="Certification" :title="cert?.name || ''" :icon="Award" @close="$emit('close')">
    <template v-if="cert">
      <div class="cd" :style="{ '--accent': accent, '--tone': toneColor }">
        <!-- ── holder hero ── -->
        <Motion as="section" class="cd-hero"
          :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
          <span class="cd-hero-glow" aria-hidden="true" />
          <div class="cd-hero-top">
            <span class="cd-avatar">{{ initial }}</span>
            <div class="cd-holder">
              <span class="cd-holder-name">{{ cert.employee_name || 'Unassigned' }}</span>
              <span class="cd-holder-sub trn-mono">{{ holderSub || 'Credential holder' }}</span>
            </div>
            <span v-if="cert.category" class="cd-cat"><span class="dot" />{{ prettyCat(cert.category) }}</span>
          </div>
          <div class="cd-statline">
            <TrnStatusStamp :status="cert.status" kind="cert" fresh />
            <span class="cd-days" :class="tone">
              <component :is="toneIcon" :size="13" /> {{ expiryLabel }}
            </span>
          </div>
        </Motion>

        <!-- ── validity timeline ── -->
        <Motion as="section" class="cd-card cd-timeline"
          :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
          <header class="cd-card-head">
            <span class="cd-eyebrow trn-mono"><CalendarClock :size="12" /> Validity window</span>
            <span class="cd-big" :class="tone">
              <template v-if="days === null">∞</template>
              <template v-else-if="days < 0">{{ Math.abs(days) }}<i>d ago</i></template>
              <template v-else>{{ days }}<i>d left</i></template>
            </span>
          </header>

          <div class="cd-track" :class="{ lifetime: !cert.expiry_date }">
            <span class="cd-track-fill" :style="{ width: ready ? fillPct + '%' : '0%' }" />
            <span class="cd-node start" :class="{ lit: !!cert.issue_date }" />
            <span v-if="cert.expiry_date && cert.issue_date" class="cd-today" :style="{ left: ready ? fillPct + '%' : '0%' }">
              <span class="cd-today-dot" /><span class="cd-today-lbl">today</span>
            </span>
            <span class="cd-node end" :class="{ lit: !!cert.expiry_date }">
              <InfinityIcon v-if="!cert.expiry_date" :size="10" />
            </span>
          </div>
          <div class="cd-track-labels">
            <span><i class="trn-mono">{{ fmtDate(cert.issue_date) }}</i><b>Issued</b></span>
            <span class="r"><i class="trn-mono">{{ cert.expiry_date ? fmtDate(cert.expiry_date) : 'Never' }}</i><b>{{ cert.expiry_date ? 'Expires' : 'Lifetime' }}</b></span>
          </div>
        </Motion>

        <!-- ── details grid ── -->
        <Motion as="section" class="cd-card"
          :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.14, ease: [0.16, 1, 0.3, 1] }">
          <span class="cd-eyebrow trn-mono"><ScrollText :size="12" /> Credential details</span>
          <dl class="cd-meta">
            <div><dt><Building2 :size="12" /> Issuing authority</dt><dd>{{ cert.issuing_authority || '—' }}</dd></div>
            <div><dt><Hash :size="12" /> Certificate no.</dt><dd class="trn-mono">{{ cert.certificate_number || '—' }}</dd></div>
            <div><dt><Tag :size="12" /> Category</dt><dd class="cap">{{ cert.category ? prettyCat(cert.category) : 'Uncategorised' }}</dd></div>
            <div><dt><RefreshCw :size="12" /> Renewal program</dt><dd>{{ cert.renewal_program_name || '—' }}</dd></div>
            <div v-if="cert.source_assignment_id" class="span2"><dt><Sparkles :size="12" /> Origin</dt><dd>Auto-minted from a completed training</dd></div>
          </dl>
        </Motion>

        <!-- ── certificate file ── -->
        <Motion v-if="cert.certificate_url" as="a" class="cd-link" :href="cert.certificate_url" target="_blank" rel="noopener"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }" :whileHover="{ y: -2 }">
          <span class="cd-link-ic"><FileText :size="15" /></span>
          <span class="cd-link-body"><b>Attached certificate</b><span>Open the uploaded credential file</span></span>
          <ExternalLink :size="14" class="cd-link-arrow" />
        </Motion>

        <!-- ── notes ── -->
        <Motion v-if="cert.notes" as="section" class="cd-card cd-notes"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.24, ease: [0.16, 1, 0.3, 1] }">
          <span class="cd-eyebrow trn-mono"><NotebookPen :size="12" /> Notes</span>
          <p class="cd-notes-body">{{ cert.notes }}</p>
        </Motion>
      </div>
    </template>

    <template #footer>
      <Motion as="button" v-magnetic class="trn-btn cd-pdf" :disabled="downloading"
        :whileHover="downloading ? {} : { y: -2 }" :whileTap="{ scale: 0.97 }" @click="downloadPdf">
        <Loader v-if="downloading" :size="14" class="spin" /><Download v-else :size="14" />
        Certificate PDF
      </Motion>
      <button v-if="canRenew" class="trn-btn trn-btn-ghost" @click="$emit('renew', cert)"><RefreshCw :size="14" /> Renew</button>
      <button class="trn-btn trn-btn-ghost" @click="$emit('edit', cert)"><Pencil :size="14" /> Edit</button>
    </template>
  </TrnDrawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Award, FileText, ExternalLink, Pencil, RefreshCw, Download, Loader,
  CalendarClock, Building2, Hash, Tag, ScrollText, NotebookPen, Sparkles,
  CheckCircle2, AlertTriangle, Clock, Ban, Infinity as InfinityIcon,
} from 'lucide-vue-next'
import TrnDrawer from '../components/TrnDrawer.vue'
import TrnStatusStamp from '../components/TrnStatusStamp.vue'
import { downloadCertificatePdf } from '@/composables/useTraining'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  cert: { type: Object, default: null },
})
defineEmits(['close', 'edit', 'renew'])
const toast = useToast()
const reduced = prefersReduced()

const CAT_VARS = {
  TECHNICAL: '--trn-amber-strong', FUNCTIONAL: '--trn-amber', BEHAVIORAL: '--trn-ember',
  DOMAIN: '--trn-orbit-far', LANGUAGE: '--trn-star', CERTIFICATION: '--trn-st-completed-hex',
  OTHER: '--trn-star-dim',
}
const accent = computed(() => `var(${CAT_VARS[props.cert?.category] || '--trn-amber'})`)
const prettyCat = (c) => String(c || '').replace(/_/g, ' ').toLowerCase()

const initial = computed(() => (props.cert?.employee_name?.trim()[0] || '?').toUpperCase())
const holderSub = computed(() =>
  [props.cert?.employee_code, props.cert?.designation_name, props.cert?.department_name].filter(Boolean).join(' · '))

const days = computed(() => {
  const d = props.cert?.days_to_expiry
  return d === null || d === undefined ? null : Number(d)
})
const tone = computed(() => {
  if (props.cert?.status === 'REVOKED') return 'revoked'
  if (days.value === null) return 'neutral'
  if (days.value < 0) return 'danger'
  if (days.value <= 30) return 'warn'
  if (days.value <= 90) return 'soon'
  return 'ok'
})
const TONE_COLORS = {
  ok: 'var(--trn-cert-active)', soon: 'var(--trn-amber-strong)', warn: 'var(--trn-cert-pending)',
  danger: 'var(--trn-cert-expired)', revoked: 'var(--trn-cert-revoked)', neutral: 'var(--trn-cert-active)',
}
const toneColor = computed(() => TONE_COLORS[tone.value])
const TONE_ICONS = { ok: CheckCircle2, soon: Clock, warn: AlertTriangle, danger: AlertTriangle, revoked: Ban, neutral: InfinityIcon }
const toneIcon = computed(() => TONE_ICONS[tone.value])

const canRenew = computed(() => ['EXPIRING_SOON', 'EXPIRED', 'PENDING_RENEWAL'].includes(props.cert?.status))

const expiryLabel = computed(() => {
  if (props.cert?.status === 'REVOKED') return 'Revoked credential'
  if (days.value === null) return 'Lifetime credential — never expires'
  if (days.value < 0) return `Expired ${Math.abs(days.value)} days ago`
  if (days.value === 0) return 'Expires today'
  return `Valid · expires in ${days.value} days`
})

const fillPct = computed(() => {
  const iso = props.cert?.issue_date, exp = props.cert?.expiry_date
  if (!exp) return 100
  if (iso) {
    const span = (new Date(exp) - new Date(iso)) / 86400000
    if (span > 0) {
      const elapsed = (new Date() - new Date(iso)) / 86400000
      return Math.max(0, Math.min(100, (elapsed / span) * 100))
    }
  }
  if (days.value === null) return 0
  return days.value < 0 ? 100 : Math.max(0, Math.min(100, 100 - (days.value / 365) * 100))
})

const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

const ready = ref(false)
watch(() => props.open, (o) => {
  ready.value = false
  if (o) requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true }))
})

const downloading = ref(false)
const downloadPdf = async () => {
  if (downloading.value || !props.cert) return
  downloading.value = true
  try {
    await downloadCertificatePdf(props.cert)
    toast.success('Certificate PDF generated')
  } catch (e) {
    const detail = e?.response?.status === 503
      ? 'PDF engine unavailable on the server (GTK runtime).'
      : (e?.response?.data?.detail || 'Could not generate the certificate PDF')
    toast.error(detail)
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.cd { display: flex; flex-direction: column; gap: 14px; }

/* hero */
.cd-hero { position: relative; overflow: hidden; padding: 16px 17px; border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--accent) 26%, var(--trn-border-soft));
  background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); display: flex; flex-direction: column; gap: 13px; }
.cd-hero-glow { position: absolute; top: -50%; right: -20%; width: 70%; height: 130%; z-index: 0; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%);
  animation: cd-breathe 6s ease-in-out infinite; }
.cd-hero-top { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; }
.cd-avatar { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
  font-weight: 800; font-size: 17px; color: #1a1206; background: var(--trn-grad-rail); box-shadow: 0 4px 12px -4px rgba(251,146,60,0.5); }
.cd-holder { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cd-holder-name { font-size: 15px; font-weight: 800; color: var(--trn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cd-holder-sub { font-size: 11px; color: var(--trn-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cd-cat { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; padding: 4px 10px; border-radius: 999px;
  font-size: 10px; font-weight: 700; text-transform: capitalize; color: var(--accent);
  background: color-mix(in srgb, var(--accent) 13%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); }
.cd-cat .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 6px var(--accent); }
.cd-statline { position: relative; z-index: 1; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cd-days { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--tone); }
.cd-days :deep(svg) { flex-shrink: 0; }

/* cards */
.cd-card { padding: 15px 16px; border-radius: 16px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surface); display: flex; flex-direction: column; gap: 12px; }
.cd-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--accent); }

/* timeline */
.cd-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.cd-big { font-family: var(--trn-mono); font-size: 24px; font-weight: 850; line-height: 1; color: var(--tone); }
.cd-big i { font-size: 11px; font-style: normal; color: var(--trn-text-muted); margin-left: 2px; }
.cd-track { position: relative; height: 8px; border-radius: 999px; margin: 6px 4px 0;
  background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); }
.cd-track-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--tone) 45%, transparent), var(--tone));
  box-shadow: 0 0 12px -2px var(--tone); transition: width 1.1s var(--trn-spring); }
.cd-track.lifetime .cd-track-fill { background: linear-gradient(90deg, color-mix(in srgb, var(--trn-cert-active) 40%, transparent), var(--trn-cert-active)); }
.cd-node { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 13px; height: 13px; border-radius: 50%;
  display: grid; place-items: center; background: var(--trn-surface-elevated); border: 1.5px solid var(--trn-border-strong); color: #1a1206; }
.cd-node.start { left: 0; }
.cd-node.end { left: 100%; }
.cd-node.lit { background: var(--tone); border-color: var(--tone); box-shadow: 0 0 9px -1px var(--tone); }
.cd-node :deep(svg) { stroke-width: 3; }
.cd-today { position: absolute; top: 50%; transform: translate(-50%, -50%); z-index: 2; display: flex; flex-direction: column; align-items: center;
  transition: left 1.1s var(--trn-spring); }
.cd-today-dot { width: 9px; height: 9px; border-radius: 50%; background: #fff; border: 2px solid var(--tone); box-shadow: 0 0 8px 1px var(--tone);
  animation: trn-pulse-dot 2.2s ease-out infinite; }
[data-theme="light"] .cd-today-dot { background: var(--trn-canvas); }
.cd-today-lbl { position: absolute; top: 12px; font-size: 8.5px; font-family: var(--trn-mono); letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--tone); white-space: nowrap; }
.cd-track-labels { display: flex; justify-content: space-between; gap: 10px; margin-top: 14px; }
.cd-track-labels span { display: flex; flex-direction: column; gap: 1px; }
.cd-track-labels span.r { text-align: right; }
.cd-track-labels i { font-size: 12px; font-style: normal; font-weight: 700; color: var(--trn-text); }
.cd-track-labels b { font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trn-text-dim); }

/* meta grid */
.cd-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 13px 16px; margin: 0; }
.cd-meta div { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.cd-meta .span2 { grid-column: span 2; }
.cd-meta dt { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trn-text-dim); }
.cd-meta dt :deep(svg) { color: var(--accent); }
.cd-meta dd { margin: 0; font-size: 13px; font-weight: 600; color: var(--trn-text); word-break: break-word; }
.cd-meta dd.cap { text-transform: capitalize; }

/* link */
.cd-link { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; text-decoration: none;
  border: 1px solid color-mix(in srgb, var(--accent) 26%, var(--trn-border-soft)); background: var(--trn-surface); transition: border-color 0.2s, background 0.2s; }
.cd-link:hover { background: var(--trn-surface-elevated); border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
.cd-link-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0;
  color: var(--accent); background: color-mix(in srgb, var(--accent) 13%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); }
.cd-link-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.cd-link-body b { font-size: 13px; font-weight: 700; color: var(--trn-text); }
.cd-link-body span { font-size: 11px; color: var(--trn-text-muted); }
.cd-link-arrow { color: var(--trn-text-dim); flex-shrink: 0; }

/* notes */
.cd-notes-body { margin: 0; font-size: 13px; line-height: 1.6; color: var(--trn-text-secondary); white-space: pre-line; }

/* footer pdf button */
.cd-pdf { margin-right: auto; color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 34%, transparent); }
.cd-pdf:hover:not(:disabled) { background: color-mix(in srgb, var(--accent) 18%, transparent); }
.cd-pdf:disabled { opacity: 0.6; cursor: not-allowed; }
.spin { animation: trn-orbit-spin 0.9s linear infinite; }

/* tones */
.cd-days.ok, .cd-big.ok { color: var(--trn-cert-active); }
.cd-days.soon, .cd-big.soon { color: var(--trn-amber-strong); }
.cd-days.warn, .cd-big.warn { color: var(--trn-cert-pending); }
.cd-days.danger, .cd-big.danger { color: var(--trn-cert-expired); }
.cd-days.revoked, .cd-big.revoked { color: var(--trn-cert-revoked); }
.cd-days.neutral, .cd-big.neutral { color: var(--trn-cert-active); }

@keyframes cd-breathe { 0%, 100% { opacity: 0.5; transform: scale(0.95); } 50% { opacity: 0.85; transform: scale(1.08); } }
@media (prefers-reduced-motion: reduce) {
  .cd-track-fill, .cd-today { transition: none; }
  .cd-hero-glow, .cd-today-dot { animation: none; }
}
</style>
