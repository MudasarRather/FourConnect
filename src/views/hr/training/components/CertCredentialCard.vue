<template>
  <Motion as="article" class="ccard" :class="[tone, { preview, ghost: preview && !cert?.employee_name && !cert?.name }]"
    :style="{ '--tone': toneColor }"
    :initial="reduced || preview ? false : { opacity: 0, y: 16 }"
    :animate="preview ? { scale: ready ? 1 : 0.98 } : { opacity: 1, y: 0 }"
    :transition="{ duration: 0.45, delay: preview ? 0 : Math.min(index * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }"
    :whileHover="preview ? {} : { y: -4 }">
    <span class="ccard-edge" aria-hidden="true" />
    <span class="ccard-sheen" aria-hidden="true" />
    <span class="ccard-holo" aria-hidden="true" />

    <header class="ccard-head" :class="{ clickable: !preview }" @click="!preview && emit('view')">
      <span class="ccard-av" :class="{ seal: !empName }">
        <template v-if="empName">{{ initial }}</template>
        <ShieldCheck v-else :size="17" />
      </span>
      <div class="ccard-who">
        <span class="ccard-emp">{{ empName || 'Unassigned' }}</span>
        <span v-if="code" class="ccard-code trn-mono">{{ code }}</span>
        <span v-else-if="preview" class="ccard-code trn-mono ghosted">employee · dept</span>
      </div>
      <TrnStatusStamp v-if="cert?.status" :status="cert.status" kind="cert" :fresh="preview" />
      <span v-else class="ccard-stamp-ghost">NEW</span>
    </header>

    <div class="ccard-body" :class="{ clickable: !preview }" @click="!preview && emit('view')">
      <h3 class="ccard-name">{{ name || 'Certification name' }}</h3>
      <span class="ccard-auth"><ShieldCheck :size="12" /> {{ authority || 'Issuing authority' }}</span>

      <div class="ccard-mid">
        <div class="ccard-ring">
          <svg :viewBox="`0 0 ${RZ} ${RZ}`" aria-hidden="true">
            <circle class="ccard-ring-track" :cx="RC" :cy="RC" :r="RR" fill="none" :stroke-width="RS" />
            <circle class="ccard-ring-arc" :cx="RC" :cy="RC" :r="RR" fill="none" :stroke-width="RS"
              stroke-linecap="round" :stroke-dasharray="RCIRC"
              :stroke-dashoffset="ready ? ringOffset : RCIRC"
              :transform="`rotate(-90 ${RC} ${RC})`" />
          </svg>
          <span class="ccard-ring-c trn-mono">{{ ringCenter }}</span>
        </div>
        <div class="ccard-expiry">
          <span class="ccard-exp-lab">{{ expiryLabel }}</span>
          <span class="ccard-exp-sub">
            <CalendarClock :size="11" />
            <template v-if="cert?.expiry_date">{{ fmtDate(cert.expiry_date) }}</template>
            <template v-else>no expiry set</template>
          </span>
          <span v-if="certNumber" class="ccard-num trn-mono">№ {{ certNumber }}</span>
        </div>
      </div>
    </div>

    <footer v-if="!preview" class="ccard-foot">
      <button class="ccard-act" @click.stop="emit('view')" title="View"><Eye :size="14" /></button>
      <button class="ccard-act" @click.stop="emit('edit')" title="Edit"><Pencil :size="14" /></button>
      <button v-if="canRenew" class="ccard-act renew" @click.stop="emit('renew')" :disabled="renewing">
        <Loader v-if="renewing" :size="13" class="spin" /><RefreshCw v-else :size="13" /> Renew
      </button>
      <button class="ccard-act danger" @click.stop="emit('delete')" title="Delete"><Trash2 :size="14" /></button>
    </footer>
    <div v-else class="ccard-preview-tag trn-mono">Live preview</div>
  </Motion>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { ShieldCheck, CalendarClock, Eye, Pencil, RefreshCw, Trash2, Loader } from 'lucide-vue-next'
import TrnStatusStamp from './TrnStatusStamp.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  cert: { type: Object, default: () => ({}) },
  index: { type: Number, default: 0 },
  preview: { type: Boolean, default: false },
  renewing: { type: Boolean, default: false },
})
const emit = defineEmits(['view', 'edit', 'renew', 'delete'])
const reduced = prefersReduced()

const empName = computed(() => props.cert?.employee_name || '')
const code = computed(() => props.cert?.employee_code || '')
const name = computed(() => props.cert?.name || '')
const authority = computed(() => props.cert?.issuing_authority || '')
const certNumber = computed(() => props.cert?.certificate_number || '')
const initial = computed(() => (empName.value.trim()[0] || '?').toUpperCase())

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
  danger: 'var(--trn-cert-expired)', revoked: 'var(--trn-cert-revoked)', neutral: 'var(--trn-star-dim)',
}
const toneColor = computed(() => TONE_COLORS[tone.value])

const canRenew = computed(() => ['EXPIRING_SOON', 'EXPIRED', 'PENDING_RENEWAL'].includes(props.cert?.status))

const expiryLabel = computed(() => {
  if (props.cert?.status === 'REVOKED') return 'Revoked credential'
  if (days.value === null) return props.cert?.expiry_date ? 'No expiry data' : 'Never expires'
  if (days.value < 0) return `Expired ${Math.abs(days.value)}d ago`
  if (days.value === 0) return 'Expires today'
  return `Expires in ${days.value}d`
})

// ── expiry ring (remaining fraction of the credential's life) ────────────────
const RZ = 54, RC = RZ / 2, RS = 5, RR = RC - RS / 2 - 1
const RCIRC = 2 * Math.PI * RR
const fraction = computed(() => {
  if (props.cert?.status === 'REVOKED' || days.value === null) return tone.value === 'neutral' && !props.cert?.expiry_date ? 1 : 0
  if (days.value < 0) return 0
  const iso = props.cert?.issue_date
  const exp = props.cert?.expiry_date
  if (iso && exp) {
    const span = (new Date(exp) - new Date(iso)) / 86400000
    if (span > 0) return Math.max(0, Math.min(1, days.value / span))
  }
  return Math.max(0, Math.min(1, days.value / 365))
})
const ringOffset = computed(() => RCIRC * (1 - fraction.value))
const ringCenter = computed(() => {
  if (props.cert?.status === 'REVOKED') return '—'
  if (days.value === null) return '∞'
  if (days.value < 0) return '0'
  return days.value > 999 ? '999' : String(days.value)
})

const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

const ready = ref(false)
onMounted(() => requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true })))
// re-trigger ring draw when preview content changes
watch(() => [props.cert?.issue_date, props.cert?.expiry_date, props.cert?.status], () => {
  if (!props.preview) return
  ready.value = false
  requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true }))
})
</script>

<style scoped>
.ccard { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px;
  padding: 16px 17px; border-radius: 18px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow);
  transition: box-shadow 0.3s, border-color 0.3s; }
.ccard:not(.preview):hover { box-shadow: var(--trn-card-shadow-hover);
  border-color: color-mix(in srgb, var(--tone) 34%, transparent); }
.ccard.preview { background: var(--trn-surf-card); }

/* status edge glow */
.ccard-edge { position: absolute; top: 0; left: 0; right: 0; height: 3px; z-index: 1;
  background: linear-gradient(90deg, transparent, var(--tone), transparent); opacity: 0.9; }
.ccard.danger .ccard-edge, .ccard.warn .ccard-edge { animation: ccard-edge-pulse 2.4s ease-in-out infinite; }

/* holographic resting wash + hover sheen sweep */
.ccard-holo { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.5;
  background: radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--tone) 10%, transparent), transparent 55%); }
.ccard-sheen { position: absolute; top: 0; bottom: 0; left: 0; width: 40%; z-index: 1; pointer-events: none;
  background: linear-gradient(105deg, transparent, color-mix(in srgb, var(--tone) 22%, transparent) 50%, transparent);
  transform: translateX(-160%); opacity: 0; mix-blend-mode: screen; }
[data-theme="light"] .ccard-sheen { mix-blend-mode: multiply; }
.ccard:not(.preview):hover .ccard-sheen { animation: ccard-sweep 0.9s var(--trn-ease); }

/* head */
.ccard-head { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; }
.ccard-head.clickable, .ccard-body.clickable { cursor: pointer; }
.ccard-av { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  font-weight: 800; font-size: 14px; color: #1a1206; background: var(--trn-grad-rail);
  box-shadow: 0 3px 10px -4px rgba(251,146,60,0.5); }
.ccard-av.seal { color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--tone) 28%, transparent); box-shadow: none; }
.ccard-who { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ccard-emp { font-size: 13px; font-weight: 700; color: var(--trn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ccard-code { font-size: 10.5px; color: var(--trn-text-dim); }
.ccard-code.ghosted { opacity: 0.6; }
.ccard-stamp-ghost { font-family: var(--trn-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.1em;
  padding: 3px 8px; border-radius: 999px; color: var(--trn-amber-strong);
  background: color-mix(in srgb, var(--trn-amber) 14%, transparent); border: 1px dashed color-mix(in srgb, var(--trn-amber) 36%, transparent); }

/* body */
.ccard-body { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 7px; }
.ccard-name { margin: 0; font-size: 15px; font-weight: 800; letter-spacing: -0.01em; color: var(--trn-text); line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ccard-auth { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--trn-text-muted); }
.ccard-auth :deep(svg) { color: var(--tone); flex-shrink: 0; }

.ccard-mid { display: flex; align-items: center; gap: 13px; margin-top: 4px; padding: 11px 12px; border-radius: 13px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.ccard-ring { position: relative; width: 54px; height: 54px; flex-shrink: 0; }
.ccard-ring svg { width: 100%; height: 100%; display: block; }
.ccard-ring-track { stroke: var(--trn-border-strong); opacity: 0.45; }
.ccard-ring-arc { stroke: var(--tone); transition: stroke-dashoffset 1.1s var(--trn-spring);
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--tone) 55%, transparent)); }
.ccard-ring-c { position: absolute; inset: 0; display: grid; place-items: center; font-size: 13px; font-weight: 800; color: var(--trn-text); }
.ccard-expiry { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.ccard-exp-lab { font-size: 12.5px; font-weight: 700; color: var(--tone); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ccard-exp-sub { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--trn-text-muted); }
.ccard-exp-sub :deep(svg) { color: var(--trn-text-dim); flex-shrink: 0; }
.ccard-num { font-size: 10px; color: var(--trn-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* foot */
.ccard-foot { position: relative; z-index: 2; display: flex; align-items: center; gap: 6px;
  border-top: 1px solid var(--trn-border-soft); padding-top: 11px; }
.ccard-act { display: inline-flex; align-items: center; justify-content: center; gap: 5px; font: inherit; font-size: 12px; font-weight: 600;
  width: 32px; height: 32px; padding: 0; border-radius: 9px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surface); color: var(--trn-text-secondary); cursor: pointer; transition: all 0.2s; }
.ccard-act:hover { color: var(--trn-text); background: var(--trn-surface-elevated); transform: translateY(-1px); }
.ccard-act:disabled { opacity: 0.55; cursor: not-allowed; }
.ccard-act.renew { width: auto; padding: 0 11px; color: var(--trn-amber-strong); border-color: color-mix(in srgb, var(--trn-amber) 32%, transparent); }
.ccard-act.renew:hover { background: color-mix(in srgb, var(--trn-amber) 12%, transparent); color: var(--trn-amber); }
.ccard-act.danger { margin-left: auto; color: var(--trn-st-failed); }
.ccard-act.danger:hover { background: rgba(248,113,113,0.14); }

/* preview tag */
.ccard-preview-tag { position: absolute; bottom: 10px; right: 12px; z-index: 2; font-size: 9px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--trn-text-dim); }
.ccard.ghost { opacity: 0.92; }
.ccard.ghost .ccard-name, .ccard.ghost .ccard-auth { color: var(--trn-text-dim); }

.spin { animation: trn-orbit-spin 0.9s linear infinite; }

@keyframes ccard-sweep { 0% { transform: translateX(-160%); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateX(320%); opacity: 0; } }
@keyframes ccard-edge-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .ccard-ring-arc { transition: none; }
  .ccard-edge, .ccard-sheen { animation: none !important; }
}
</style>
