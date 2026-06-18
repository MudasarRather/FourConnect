<template>
  <article class="cec" :class="[`t-${tone.key}`, { pending: isPending }]" :style="{ '--uc': tone.color }">
    <span class="cec-rail" aria-hidden="true" />
    <span class="cec-sheen" aria-hidden="true" />

    <!-- avatar -->
    <span class="cec-avatar" aria-hidden="true">
      {{ initials }}
      <span class="cec-av-dot" />
    </span>

    <!-- identity + urgency meter -->
    <div class="cec-main">
      <div class="cec-id">
        <span class="cec-name">{{ cert.name || 'Certification' }}</span>
        <span v-if="cert.certificate_number" class="cec-num trn-mono">{{ cert.certificate_number }}</span>
      </div>
      <div class="cec-sub">
        <span class="cec-emp">{{ cert.employee_name || '—' }}</span>
        <span v-if="cert.department_name" class="cec-dim">· {{ cert.department_name }}</span>
        <span v-if="cert.issuing_authority" class="cec-dim">· {{ cert.issuing_authority }}</span>
      </div>
      <div class="cec-meter" :title="meterTitle">
        <span class="cec-meter-fill" :style="{ width: (ready ? meterPct : 0) + '%' }" />
      </div>
    </div>

    <!-- countdown -->
    <div class="cec-count">
      <span class="cec-days trn-mono"><TrnCountUp :value="daysNum" /></span>
      <span class="cec-days-lab">{{ daysLab }}</span>
    </div>

    <!-- action / renewal -->
    <div class="cec-act">
      <template v-if="isPending">
        <span class="cec-motion"><span class="cec-motion-orb" /> In motion</span>
        <button v-if="cert.renewal_program_name" class="cec-link" @click="$emit('go', 'enrollment')">
          View training <ArrowRight :size="12" />
        </button>
        <span v-else class="cec-hint">renewal flagged</span>
      </template>
      <template v-else>
        <Motion as="button" class="cec-renew" :disabled="renewing === cert.id"
          :whileTap="renewing === cert.id ? {} : { scale: 0.94 }" @click="$emit('renew', cert)">
          <Loader v-if="renewing === cert.id" :size="13" class="spin" /><RefreshCw v-else :size="13" />
          Renew
        </Motion>
        <button v-if="cert.renewal_program_name" class="cec-prog" :title="`Renewal program: ${cert.renewal_program_name}`">
          <GraduationCap :size="11" /> {{ cert.renewal_program_name }}
        </button>
        <button v-else class="cec-noprog" @click="$emit('go', 'certifications')" title="No renewal program linked — set one up">
          <Plus :size="11" /> link program
        </button>
      </template>
    </div>
  </article>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { RefreshCw, Loader, ArrowRight, GraduationCap, Plus } from 'lucide-vue-next'
import TrnCountUp from './TrnCountUp.vue'

const props = defineProps({
  cert: { type: Object, required: true },
  renewing: { default: null },
})
defineEmits(['renew', 'go'])

const isPending = computed(() => props.cert.status === 'PENDING_RENEWAL')
const days = computed(() => (props.cert.days_to_expiry === undefined ? null : props.cert.days_to_expiry))

const tone = computed(() => {
  if (isPending.value) return { key: 'pending', color: 'var(--trn-cert-active)' }
  const d = days.value
  if (d === null) return { key: 'd90', color: 'var(--trn-core)' }
  if (d < 0) return { key: 'expired', color: 'var(--trn-cert-expired)' }
  if (d <= 30) return { key: 'd30', color: 'var(--trn-cert-pending)' }
  if (d <= 60) return { key: 'd60', color: 'var(--trn-cert-expiring)' }
  return { key: 'd90', color: 'var(--trn-core)' }
})

const meterPct = computed(() => {
  if (isPending.value) return 58
  const d = days.value
  if (d === null) return 6
  if (d < 0) return 100
  return Math.round((1 - Math.min(Math.max(d, 0), 90) / 90) * 100)
})

const daysNum = computed(() => {
  const d = days.value
  return d === null ? 0 : Math.abs(d)
})
const daysLab = computed(() => {
  const d = days.value
  if (d === null) return 'no expiry'
  if (d < 0) return Math.abs(d) === 1 ? 'day lapsed' : 'days lapsed'
  if (d === 0) return 'expires today'
  return d === 1 ? 'day left' : 'days left'
})
const meterTitle = computed(() => {
  const d = days.value
  if (d === null) return 'No expiry date set'
  if (d < 0) return `Lapsed ${Math.abs(d)} day(s) ago`
  return `${d} day(s) to expiry`
})

const initials = computed(() => {
  const n = props.cert.employee_name || ''
  return n ? n.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() : '?'
})

const ready = ref(false)
onMounted(async () => { await nextTick(); requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true })) })
</script>

<style scoped>
.cec { position: relative; overflow: hidden; isolation: isolate;
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 15px;
  padding: 14px 18px 14px 20px; border-radius: 17px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow);
  transition: transform 0.3s var(--trn-spring), box-shadow 0.3s var(--trn-spring), border-color 0.3s; }
.cec:hover { transform: translateY(-3px); box-shadow: var(--trn-card-shadow-hover); border-color: color-mix(in srgb, var(--uc) 42%, transparent); }
.cec > *:not(.cec-rail):not(.cec-sheen) { position: relative; z-index: 1; }

/* urgency rail */
.cec-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; z-index: 0; background: var(--uc); opacity: 0.6;
  transition: opacity 0.3s, width 0.3s var(--trn-spring), box-shadow 0.3s; }
.cec:hover .cec-rail { opacity: 1; width: 4px; box-shadow: 0 0 16px -1px var(--uc); }
.cec.t-expired .cec-rail { animation: cec-rail-pulse 2.4s ease-in-out infinite; }
@keyframes cec-rail-pulse { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 13px 0 var(--uc); } }

.cec-sheen { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0; background-repeat: no-repeat;
  background-size: 250% 100%; background-position: 150% 0;
  background-image: linear-gradient(110deg, transparent 38%, color-mix(in srgb, var(--uc) 16%, rgba(255,255,255,0.1)) 50%, transparent 62%); }
.cec:hover .cec-sheen { opacity: 1; animation: cec-sheen 0.85s var(--trn-spring); }
@keyframes cec-sheen { from { background-position: 150% 0; } to { background-position: -60% 0; } }

/* avatar */
.cec-avatar { position: relative; display: inline-grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  font-family: var(--trn-mono); font-size: 14px; font-weight: 800; color: #1a1206; background: var(--trn-grad-rail);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--uc) 40%, transparent), 0 4px 14px -5px var(--uc);
  transition: transform 0.3s var(--trn-spring); }
.cec:hover .cec-avatar { transform: scale(1.06); }
.cec-av-dot { position: absolute; right: -1px; bottom: -1px; width: 12px; height: 12px; border-radius: 50%;
  background: var(--uc); border: 2px solid var(--trn-canvas); box-shadow: 0 0 8px -1px var(--uc); }

/* identity */
.cec-main { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.cec-id { display: flex; align-items: center; gap: 9px; min-width: 0; }
.cec-name { font-size: 14px; font-weight: 800; letter-spacing: -0.01em; color: var(--trn-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cec-num { font-size: 10px; color: var(--trn-text-dim); padding: 1px 7px; border-radius: 6px; background: var(--trn-surface-elevated); flex-shrink: 0; }
.cec-sub { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--trn-text-muted); min-width: 0; flex-wrap: wrap; }
.cec-emp { font-weight: 600; color: var(--trn-text-secondary); }
.cec-dim { color: var(--trn-text-dim); }
.cec-meter { position: relative; height: 6px; border-radius: 999px; overflow: hidden; margin-top: 1px;
  background: var(--trn-surface-elevated); box-shadow: inset 0 1px 2px rgba(0,0,0,0.2); }
.cec-meter-fill { display: block; height: 100%; border-radius: 999px; transition: width 1.05s var(--trn-spring);
  background: linear-gradient(90deg, color-mix(in srgb, var(--uc) 45%, transparent), var(--uc)); box-shadow: 0 0 10px -2px var(--uc); }

/* countdown */
.cec-count { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; flex-shrink: 0; min-width: 56px; }
.cec-days { font-size: 26px; font-weight: 850; line-height: 1; letter-spacing: -0.03em; color: var(--uc);
  text-shadow: 0 0 18px color-mix(in srgb, var(--uc) 35%, transparent); }
.cec-days-lab { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--trn-text-dim); white-space: nowrap; }

/* action */
.cec-act { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.cec-renew { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 12.5px; font-weight: 650; padding: 7px 14px; border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--trn-amber) 34%, transparent); background: color-mix(in srgb, var(--trn-amber) 10%, transparent);
  color: var(--trn-amber-strong); cursor: pointer; transition: background 0.2s, border-color 0.2s, color 0.2s; white-space: nowrap; }
.cec-renew:hover:not(:disabled) { background: color-mix(in srgb, var(--trn-amber) 18%, transparent); color: var(--trn-amber); border-color: color-mix(in srgb, var(--trn-amber) 50%, transparent); }
.cec-renew:disabled { opacity: 0.55; cursor: not-allowed; }
.cec-prog, .cec-noprog, .cec-link, .cec-hint { display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 10.5px; font-weight: 600;
  border: 0; background: transparent; cursor: pointer; max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cec-prog { color: var(--trn-text-dim); cursor: default; }
.cec-noprog { color: var(--trn-text-muted); }
.cec-noprog:hover { color: var(--trn-amber-strong); }
.cec-link { color: var(--trn-cert-active); }
.cec-link:hover { text-decoration: underline; }
.cec-hint { color: var(--trn-text-dim); cursor: default; }
.cec-motion { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; padding: 6px 11px; border-radius: 999px;
  color: var(--trn-cert-active); background: var(--trn-cert-active-soft); border: 1px solid color-mix(in srgb, var(--trn-cert-active) 28%, transparent); white-space: nowrap; }
.cec-motion-orb { width: 7px; height: 7px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; animation: cec-orb 1.6s ease-in-out infinite; }
@keyframes cec-orb { 0%, 100% { opacity: 0.5; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.25); } }
.spin { animation: trn-orbit-spin 0.9s linear infinite; }

@media (max-width: 640px) {
  .cec { grid-template-columns: auto 1fr auto; grid-auto-rows: auto; }
  .cec-act { grid-column: 1 / -1; flex-direction: row; align-items: center; justify-content: flex-end; }
}
@media (prefers-reduced-motion: reduce) {
  .cec, .cec-avatar, .cec-meter-fill { transition: none; }
  .cec-sheen, .cec.t-expired .cec-rail, .cec-motion-orb { animation: none; }
}
</style>
