<template>
  <div class="trn-sec">
    <!-- ════ hero: compliance command deck ════ -->
    <section class="ce-hero" ref="heroRef">
      <div class="ce-grain trn-grain" aria-hidden="true" />
      <span class="ce-blob b1" aria-hidden="true" />
      <span class="ce-blob b2" aria-hidden="true" />
      <span class="ce-spot" aria-hidden="true" />

      <div class="ce-hero-copy">
        <Motion as="span" class="ce-eyebrow"
          :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
          <Radar :size="13" /> Expiry Observatory
        </Motion>
        <h2 class="ce-title">
          <Motion v-for="(w, i) in titleWords" :key="i" as="span" class="ce-word" :class="{ grad: w.grad }"
            :initial="{ opacity: 0, y: 22, filter: 'blur(8px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
            :transition="{ duration: 0.6, delay: 0.1 + i * 0.1, ease: [0.16, 1, 0.3, 1] }">{{ w.t }}&nbsp;</Motion>
        </h2>
        <Motion as="p" class="ce-sub"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, delay: 0.4 }">
          A living watch over every credential. The compliance engine re-evaluates each day — certifications drift toward their horizon, and a renewal can be launched the moment one nears the line.
        </Motion>
        <Motion as="div" class="ce-actions"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.52 }">
          <button class="trn-btn trn-btn-ghost" @click="$emit('go', 'certifications')"><Award :size="14" /> Manage certifications</button>
          <button class="ce-refresh" :disabled="loading" @click="load" title="Re-run the watch">
            <Loader v-if="loading" :size="14" class="spin" /><RefreshCw v-else :size="14" /> Refresh
          </button>
        </Motion>
      </div>

      <!-- compliance gauge -->
      <Motion as="div" class="ce-gauge-wrap"
        :initial="{ opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }">
        <div class="ce-gauge" :style="{ '--gc': gaugeColor }">
          <span class="ce-gauge-aura" aria-hidden="true" />
          <svg :viewBox="`0 0 ${GZ} ${GZ}`" class="ce-gauge-svg">
            <circle class="ce-gauge-track" :cx="GC" :cy="GC" :r="GR" fill="none" :stroke-width="GS" />
            <circle class="ce-gauge-arc" :cx="GC" :cy="GC" :r="GR" fill="none" :stroke-width="GS" stroke-linecap="round"
              :stroke-dasharray="GCIRC" :stroke-dashoffset="ready ? gaugeOffset : GCIRC" :transform="`rotate(-90 ${GC} ${GC})`" />
          </svg>
          <div class="ce-gauge-center">
            <span class="ce-gauge-val trn-mono"><TrnCountUp :value="compliancePct" suffix="%" /></span>
            <span class="ce-gauge-lab">compliant</span>
          </div>
        </div>
        <div class="ce-gauge-foot">
          <span class="ce-gf-strong" :class="{ ok: atRiskTotal === 0 }">
            <component :is="atRiskTotal === 0 ? ShieldCheck : ShieldAlert" :size="13" />
            {{ atRiskTotal === 0 ? 'All current' : `${atRiskTotal} at risk` }}
          </span>
          <span class="ce-gf-dim">{{ trackedTotal }} tracked</span>
        </div>
      </Motion>
    </section>

    <!-- ════ loading ════ -->
    <div v-if="loading" class="ce-skel">
      <div class="trn-skel" style="height: 230px; border-radius: 22px" />
      <div class="trn-skel" style="height: 72px; border-radius: 17px" />
      <div class="trn-skel" style="height: 72px; border-radius: 17px" />
    </div>

    <template v-else>
      <!-- ════ all clear ════ -->
      <Motion v-if="!hasWatch" as="section" class="ce-clear"
        :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
        <span class="ce-clear-grain trn-grain" aria-hidden="true" />
        <span class="ce-clear-sweep" aria-hidden="true" />
        <Motion as="span" class="ce-shield"
          :initial="{ scale: 0.4, rotate: -14, opacity: 0 }" :animate="{ scale: 1, rotate: 0, opacity: 1 }"
          :transition="{ type: 'spring', stiffness: 300, damping: 16, delay: 0.15 }">
          <span class="ce-shield-ring r1" /><span class="ce-shield-ring r2" />
          <ShieldCheck :size="34" />
        </Motion>
        <Motion as="h3" class="ce-clear-title"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.32 }">
          Horizon clear
        </Motion>
        <Motion as="p" class="ce-clear-sub"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.42 }">
          {{ trackedTotal }} credential{{ trackedTotal === 1 ? '' : 's' }} tracked · nothing expiring within 90 days · nothing lapsed.
        </Motion>
        <Motion v-if="nextUp" as="div" class="ce-next"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.52 }">
          <Telescope :size="14" />
          <span>Next on the horizon — <b>{{ nextUp.name }}</b> ({{ nextUp.employee_name }}) in <b>{{ nextUp.days_to_expiry }}</b> days</span>
        </Motion>
        <Motion as="button" class="trn-btn trn-btn-ghost ce-clear-cta"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.5, delay: 0.6 }"
          :whileTap="{ scale: 0.97 }" @click="$emit('go', 'certifications')">
          <Award :size="14" /> Open certifications
        </Motion>
      </Motion>

      <!-- ════ active watch ════ -->
      <template v-else>
        <!-- metric deck -->
        <div class="ce-deck">
          <Motion v-for="(m, i) in metrics" :key="m.key" as="div" class="ce-tile" :class="{ on: m.value > 0 }" :style="{ '--mc': m.color }"
            :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }" :whileHover="{ y: -3 }">
            <span class="ce-tile-bar" />
            <span class="ce-tile-val trn-mono"><TrnCountUp :value="m.value" /></span>
            <span class="ce-tile-lab">{{ m.label }}</span>
          </Motion>
        </div>

        <!-- signature horizon -->
        <Motion as="div"
          :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }">
          <CertHorizonRuler :certs="watchList" />
        </Motion>

        <!-- filter + ledger -->
        <div class="ce-ledger">
          <div class="ce-filters">
            <Motion v-for="(f, i) in filterTabs" :key="f.key" as="button" class="ce-filter" :class="{ on: filter === f.key }" :style="{ '--fc': f.color }"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.34, delay: 0.04 * i }"
              :whileTap="{ scale: 0.95 }" @click="filter = f.key">
              {{ f.label }} <span class="ce-filter-n trn-mono">{{ f.count }}</span>
            </Motion>
          </div>

          <Presence>
            <Motion v-for="(c, i) in visible" :key="c.id" as="div" class="ce-row-wrap"
              :initial="{ opacity: 0, y: 16, filter: 'blur(6px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
              :exit="{ opacity: 0, y: -10, scale: 0.97 }"
              :transition="{ duration: 0.42, delay: Math.min(i * 0.045, 0.4), ease: [0.16, 1, 0.3, 1] }">
              <CertExpiryCard :cert="c" :renewing="renewing" @renew="renew" @go="$emit('go', $event)" />
            </Motion>
          </Presence>

          <div v-if="!visible.length" class="ce-nomatch trn-mono">Nothing in this band.</div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Radar, Award, RefreshCw, Loader, ShieldCheck, ShieldAlert, Telescope } from 'lucide-vue-next'
import TrnCountUp from '../components/TrnCountUp.vue'
import CertHorizonRuler from '../components/CertHorizonRuler.vue'
import CertExpiryCard from '../components/CertExpiryCard.vue'
import { fetchEmployeeCertifications, renewEmployeeCertification } from '@/composables/useTraining'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const emit = defineEmits(['refresh-stats', 'go'])
const toast = useToast()

const certs = ref([])
const loading = ref(true)
const renewing = ref(null)
const ready = ref(false)
const filter = ref('all')

const heroRef = ref(null)
usePointerSpotlight(heroRef)

const titleWords = [{ t: 'Nothing' }, { t: 'lapses' }, { t: 'unwatched.', grad: true }]

const daysOf = (c) => (c.days_to_expiry === undefined ? null : c.days_to_expiry)
const isPending = (c) => c.status === 'PENDING_RENEWAL'

const tracked = computed(() => certs.value.filter(c => c.status !== 'REVOKED'))
const trackedTotal = computed(() => tracked.value.length)

const buckets = computed(() => {
  const b = { expired: [], d30: [], d60: [], d90: [], pending: [], current: [] }
  for (const c of tracked.value) {
    if (isPending(c)) { b.pending.push(c); continue }
    const d = daysOf(c)
    if (d === null) { b.current.push(c); continue }
    if (d < 0) b.expired.push(c)
    else if (d <= 30) b.d30.push(c)
    else if (d <= 60) b.d60.push(c)
    else if (d <= 90) b.d90.push(c)
    else b.current.push(c)
  }
  const byDays = (a, z) => (daysOf(a) ?? 1e9) - (daysOf(z) ?? 1e9)
  b.expired.sort(byDays); b.d30.sort(byDays); b.d60.sort(byDays); b.d90.sort(byDays); b.pending.sort(byDays)
  return b
})

// the full at-risk watch list (incl. in-motion renewals), urgency-ordered
const watchList = computed(() => {
  const b = buckets.value
  return [...b.expired, ...b.d30, ...b.d60, ...b.d90, ...b.pending]
})
const hasWatch = computed(() => watchList.value.length > 0)

const atRiskTotal = computed(() => {
  const b = buckets.value
  return b.expired.length + b.d30.length + b.d60.length + b.d90.length
})
const compliancePct = computed(() => (trackedTotal.value ? Math.round(100 * (trackedTotal.value - atRiskTotal.value) / trackedTotal.value) : 100))
const gaugeColor = computed(() => {
  const p = compliancePct.value
  if (p >= 90) return 'var(--trn-cert-active)'
  if (p >= 70) return 'var(--trn-core)'
  if (p >= 40) return 'var(--trn-cert-pending)'
  return 'var(--trn-cert-expired)'
})

// soonest future expiry overall (for the all-clear panel)
const nextUp = computed(() => {
  const fut = tracked.value.filter(c => daysOf(c) !== null && daysOf(c) >= 0)
  if (!fut.length) return null
  return [...fut].sort((a, b) => daysOf(a) - daysOf(b))[0]
})

const metrics = computed(() => {
  const b = buckets.value
  return [
    { key: 'expired', label: 'Lapsed', value: b.expired.length, color: 'var(--trn-cert-expired)' },
    { key: 'd30', label: 'Critical ≤30d', value: b.d30.length, color: 'var(--trn-cert-pending)' },
    { key: 'd60', label: 'Watch ≤60d', value: b.d60.length, color: 'var(--trn-cert-expiring)' },
    { key: 'd90', label: 'Soon ≤90d', value: b.d90.length, color: 'var(--trn-core)' },
    { key: 'pending', label: 'In motion', value: b.pending.length, color: 'var(--trn-cert-active)' },
  ]
})

const filterTabs = computed(() => {
  const b = buckets.value
  const defs = [
    { key: 'all', label: 'All', count: watchList.value.length, color: 'var(--trn-amber)' },
    { key: 'expired', label: 'Lapsed', count: b.expired.length, color: 'var(--trn-cert-expired)' },
    { key: 'd30', label: '≤30d', count: b.d30.length, color: 'var(--trn-cert-pending)' },
    { key: 'd60', label: '≤60d', count: b.d60.length, color: 'var(--trn-cert-expiring)' },
    { key: 'd90', label: '≤90d', count: b.d90.length, color: 'var(--trn-core)' },
    { key: 'pending', label: 'In motion', count: b.pending.length, color: 'var(--trn-cert-active)' },
  ]
  return defs.filter(d => d.key === 'all' || d.count > 0)
})

const visible = computed(() => (filter.value === 'all' ? watchList.value : (buckets.value[filter.value] || [])))

// gauge geometry
const GZ = 152, GS = 13, GC = GZ / 2, GR = GC - GS / 2 - 2
const GCIRC = 2 * Math.PI * GR
const gaugeOffset = computed(() => GCIRC * (1 - compliancePct.value / 100))

const load = async () => {
  loading.value = true
  ready.value = false
  try {
    const data = await fetchEmployeeCertifications()
    certs.value = Array.isArray(data) ? data : (data?.items || [])
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load the expiry monitor')
    certs.value = []
  } finally {
    loading.value = false
    requestAnimationFrame(() => requestAnimationFrame(() => { ready.value = true }))
  }
}
onMounted(load)

const renew = async (c) => {
  if (renewing.value) return
  renewing.value = c.id
  try {
    await renewEmployeeCertification(c.id)
    if (c.renewal_program_name) toast.success(`Renewal enrolled — "${c.renewal_program_name}" assigned to ${c.employee_name}`)
    else toast.success(`Flagged for renewal — link a renewal program to auto-assign training`)
    await load()
    emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not start renewal')
  } finally {
    renewing.value = null
  }
}
</script>

<style scoped>
.trn-sec { display: flex; flex-direction: column; gap: 16px; }

/* ════ hero ════ */
.ce-hero { position: relative; overflow: hidden; border-radius: 24px; padding: 30px 34px; display: flex; align-items: center; gap: 28px;
  background: var(--trn-dome); border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow); }
.ce-hero::before { content: ''; position: absolute; inset: 0; background: var(--trn-grad-hero); z-index: 0; }
.ce-grain { z-index: 1; }
.ce-blob { position: absolute; z-index: 0; border-radius: 50%; filter: blur(46px); pointer-events: none; opacity: 0.5; }
.ce-blob.b1 { width: 320px; height: 320px; top: -120px; right: 8%; background: radial-gradient(circle, color-mix(in srgb, var(--trn-cert-expired) 30%, transparent), transparent 70%); animation: ce-drift1 16s ease-in-out infinite; }
.ce-blob.b2 { width: 300px; height: 300px; bottom: -140px; left: 22%; background: radial-gradient(circle, color-mix(in srgb, var(--trn-amber) 28%, transparent), transparent 70%); animation: ce-drift2 19s ease-in-out infinite; }
.ce-spot { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: calc(var(--spot, 0) * 0.7); transition: opacity 0.4s;
  background: radial-gradient(300px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--trn-amber) 18%, transparent), transparent 60%); }
.ce-hero-copy { position: relative; z-index: 2; flex: 1; min-width: 0; }
.ce-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--trn-mono); font-size: 11px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--trn-amber-strong); }
.ce-title { margin: 12px 0 9px; font-size: 32px; line-height: 1.05; font-weight: 850; letter-spacing: -0.03em; color: var(--trn-text); display: flex; flex-wrap: wrap; }
.ce-word { display: inline-block; }
.ce-word.grad { background: linear-gradient(110deg, #fbbf24, #fde68a 42%, #fb923c); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; background-size: 220% auto; animation: trn-sheen 5s linear infinite; }
[data-theme="light"] .ce-word.grad { background: linear-gradient(110deg, #b45309, #d97706 42%, #c2410c); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.ce-sub { margin: 0 0 18px; max-width: 560px; font-size: 13.5px; line-height: 1.6; color: var(--trn-text-secondary); }
.ce-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.ce-refresh { display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: 13px; font-weight: 600; padding: 9px 15px; border-radius: 11px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-secondary); cursor: pointer; transition: all 0.2s; }
.ce-refresh:hover:not(:disabled) { color: var(--trn-text); background: var(--trn-surface-elevated); }
.ce-refresh:disabled { opacity: 0.6; cursor: not-allowed; }

/* gauge */
.ce-gauge-wrap { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 12px; flex-shrink: 0; }
.ce-gauge { position: relative; width: 152px; height: 152px; }
.ce-gauge-aura { position: absolute; inset: 16px; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--gc) 26%, transparent), transparent 70%);
  filter: blur(8px); animation: trn-core-breathe 4.5s ease-in-out infinite; }
.ce-gauge-svg { position: relative; width: 100%; height: 100%; }
.ce-gauge-track { stroke: var(--trn-border-strong); opacity: 0.5; }
.ce-gauge-arc { stroke: var(--gc); transition: stroke-dashoffset 1.3s var(--trn-spring); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--gc) 55%, transparent)); }
.ce-gauge-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.ce-gauge-val { font-size: 34px; font-weight: 850; line-height: 1; letter-spacing: -0.03em; color: var(--trn-text); }
.ce-gauge-lab { font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--trn-text-dim); }
.ce-gauge-foot { display: flex; align-items: center; gap: 10px; }
.ce-gf-strong { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; color: var(--trn-cert-expired); }
.ce-gf-strong.ok { color: var(--trn-cert-active); }
.ce-gf-dim { font-size: 11px; color: var(--trn-text-dim); }

/* ════ skeletons ════ */
.ce-skel { display: flex; flex-direction: column; gap: 12px; }

/* ════ metric deck ════ */
.ce-deck { display: grid; grid-template-columns: repeat(5, 1fr); gap: 11px; }
.ce-tile { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; padding: 15px 16px 14px; border-radius: 16px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); transition: border-color 0.25s, box-shadow 0.25s; }
.ce-tile.on { border-color: color-mix(in srgb, var(--mc) 34%, transparent); }
.ce-tile-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--mc); opacity: 0.35; transition: opacity 0.25s; }
.ce-tile.on .ce-tile-bar { opacity: 0.9; }
.ce-tile-val { font-size: 30px; font-weight: 850; line-height: 1; letter-spacing: -0.03em; color: var(--trn-text); }
.ce-tile.on .ce-tile-val { color: var(--mc); text-shadow: 0 0 18px color-mix(in srgb, var(--mc) 30%, transparent); }
.ce-tile-lab { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--trn-text-dim); }

/* ════ ledger ════ */
.ce-ledger { display: flex; flex-direction: column; gap: 11px; }
.ce-filters { display: flex; flex-wrap: wrap; gap: 7px; }
.ce-filter { display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: 12px; font-weight: 600; padding: 7px 13px; border-radius: 999px; cursor: pointer;
  color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: color 0.22s, background 0.22s, border-color 0.22s, box-shadow 0.22s; }
.ce-filter:hover { color: var(--trn-text); border-color: color-mix(in srgb, var(--fc) 38%, transparent); }
.ce-filter.on { color: var(--fc); background: color-mix(in srgb, var(--fc) 15%, transparent); border-color: color-mix(in srgb, var(--fc) 42%, transparent); box-shadow: 0 0 16px -6px var(--fc); }
.ce-filter-n { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; background: color-mix(in srgb, var(--trn-text) 8%, transparent); }
.ce-filter.on .ce-filter-n { background: color-mix(in srgb, var(--fc) 24%, transparent); color: var(--fc); }
.ce-row-wrap { margin-bottom: 0; }
.ce-row-wrap + .ce-row-wrap { margin-top: 10px; }
.ce-nomatch { padding: 32px 16px; text-align: center; font-size: 12.5px; color: var(--trn-text-dim); }

/* ════ all clear ════ */
.ce-clear { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 52px 28px 46px;
  border-radius: 24px; border: 1px solid color-mix(in srgb, var(--trn-cert-active) 22%, var(--trn-border-soft)); background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); }
.ce-clear-grain { z-index: 0; opacity: 0.05; }
.ce-clear-sweep { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.5; mix-blend-mode: screen;
  background: radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--trn-cert-active) 18%, transparent), transparent 70%); animation: trn-core-breathe 6s ease-in-out infinite; }
[data-theme="light"] .ce-clear-sweep { mix-blend-mode: multiply; }
.ce-clear > *:not(.ce-clear-grain):not(.ce-clear-sweep) { position: relative; z-index: 1; }
.ce-shield { position: relative; display: inline-grid; place-items: center; width: 74px; height: 74px; border-radius: 22px; margin-bottom: 6px;
  color: var(--trn-cert-active); background: color-mix(in srgb, var(--trn-cert-active) 14%, transparent); border: 1px solid color-mix(in srgb, var(--trn-cert-active) 32%, transparent); }
.ce-shield-ring { position: absolute; inset: -4px; border-radius: 26px; border: 1.5px solid color-mix(in srgb, var(--trn-cert-active) 40%, transparent); animation: ce-ring 2.6s ease-out infinite; }
.ce-shield-ring.r2 { animation-delay: 1.3s; }
.ce-clear-title { margin: 0; font-size: 22px; font-weight: 850; letter-spacing: -0.02em; color: var(--trn-text); }
.ce-clear-sub { margin: 0; max-width: 460px; font-size: 13px; line-height: 1.6; color: var(--trn-text-secondary); }
.ce-next { display: inline-flex; align-items: center; gap: 8px; margin-top: 6px; padding: 8px 14px; border-radius: 999px; font-size: 12px; color: var(--trn-text-muted);
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.ce-next :deep(svg) { color: var(--trn-amber-strong); flex-shrink: 0; }
.ce-next b { color: var(--trn-text); }
.ce-clear-cta { margin-top: 14px; }

.spin { animation: trn-orbit-spin 0.9s linear infinite; }

@keyframes ce-drift1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-26px, 28px); } }
@keyframes ce-drift2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, -22px); } }
@keyframes ce-ring { 0% { transform: scale(0.9); opacity: 0.7; } 70%, 100% { transform: scale(1.3); opacity: 0; } }

@media (max-width: 880px) {
  .ce-hero { flex-direction: column; align-items: flex-start; }
  .ce-gauge-wrap { align-self: center; }
  .ce-deck { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 560px) {
  .ce-title { font-size: 26px; }
  .ce-deck { grid-template-columns: repeat(2, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .ce-blob, .ce-gauge-aura, .ce-clear-sweep, .ce-shield-ring, .ce-word.grad { animation: none; }
  .ce-gauge-arc { transition: none; }
}
</style>
