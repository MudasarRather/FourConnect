<template>
  <section class="rr">
    <!-- ════════ CONSOLE HERO ════════ -->
    <Motion as="div" class="rr-console" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.16,1,0.3,1] }">
      <span class="rr-aura" aria-hidden="true" />
      <span class="rr-floor" aria-hidden="true" />
      <RotateCcw class="rr-ghost" :size="220" aria-hidden="true" />

      <div class="rr-main">
        <div class="rr-lead">
          <span class="rr-eyebrow"><Repeat :size="12" /> Alumni · Rehire Pool</span>
          <h2 class="rr-title">Welcome them <span class="grad">back</span></h2>
          <p class="rr-sub">Proven performers marked <b>eligible for rehire</b> on their exit. Bring one back on a fresh tenure — their record, full service history and original join date are preserved.</p>
          <div class="rr-cta">
            <div class="rr-search">
              <Search :size="14" />
              <input v-model="search" placeholder="Search alumni…" @input="debouncedLoad" />
            </div>
            <Motion as="button" class="rr-refresh" :class="{ spin: loading }" :whileTap="{ scale: 0.9, rotate: -90 }"
              @click="load" aria-label="Refresh"><RefreshCw :size="15" /></Motion>
          </div>
        </div>

        <div class="rr-scope">
          <ReturnArc :count="items.length" />
        </div>
      </div>

      <!-- telemetry lenses -->
      <div class="rr-lenses">
        <button v-for="l in lenses" :key="l.key" class="rr-lens" :class="[{ on: lens === l.key }, { stat: l.stat }]"
          :disabled="l.stat" @click="!l.stat && (lens = lens === l.key ? 'all' : l.key)">
          <span class="rr-lens-ic"><component :is="l.icon" :size="15" /></span>
          <span class="rr-lens-body">
            <span class="rr-lens-v">{{ l.value }}</span>
            <span class="rr-lens-l">{{ l.label }}</span>
          </span>
          <span class="rr-lens-bar" />
        </button>
      </div>
    </Motion>

    <!-- loading -->
    <div v-if="loading" class="rr-grid">
      <div v-for="i in 3" :key="i" class="rr-skel" />
    </div>

    <!-- empty (no eligible alumni at all) -->
    <div v-else-if="!items.length" class="rr-empty">
      <span class="rr-empty-ic"><UserCheck :size="24" /></span>
      <h3>No rehire-eligible alumni</h3>
      <p>When an exit case is marked <b>eligible for rehire</b> in the Exit module, the former employee appears here ready to bring back.</p>
    </div>

    <!-- roster -->
    <template v-else>
      <div v-if="visible.length" class="rr-grid">
        <Motion v-for="(c, i) in visible" :key="c.id" class="rr-shell"
          :initial="{ opacity: 0, y: 18, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.44, delay: Math.min(i * 0.06, 0.5), ease: [0.16,1,0.3,1] }">
          <RehireAlumCard :cand="c" @rehire="openRehire" />
        </Motion>
      </div>
      <p v-else class="rr-filter-empty">
        <Filter :size="13" /> No {{ lens === 'boomerang' ? 'prior re-joiners' : 'first-time alumni' }} in view.
        <button class="rr-link" @click="lens = 'all'">Clear filter</button>
      </p>
    </template>

    <RehireModal :open="showModal" :candidate="target" @close="showModal = false" @done="onDone" />
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { RotateCcw, Search, RefreshCw, UserCheck, Repeat, Users, UserPlus, Clock, Filter } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { fetchRehireEligible } from '@/composables/useEmployees'
import RehireModal from '@/components/hr/RehireModal.vue'
import ReturnArc from '../components/ReturnArc.vue'
import RehireAlumCard from '../components/RehireAlumCard.vue'

const emit = defineEmits(['refresh-counts'])
const toast = useToast()

const items = ref([])
const loading = ref(false)
const search = ref('')
const lens = ref('all')
const showModal = ref(false)
const target = ref(null)

const boomerangs = computed(() => items.value.filter(c => (c.rehire_count || 0) > 0).length)
const firstTimers = computed(() => items.value.filter(c => !(c.rehire_count || 0)).length)

const avgTenure = computed(() => {
  const spans = items.value.map(c => {
    const a = c.original_joining_date && new Date(c.original_joining_date)
    const b = c.exit_date && new Date(c.exit_date)
    if (!a || !b || isNaN(a) || isNaN(b)) return null
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  }).filter(v => v != null && v >= 0)
  if (!spans.length) return '—'
  const m = Math.round(spans.reduce((s, v) => s + v, 0) / spans.length)
  const y = Math.floor(m / 12), mm = m % 12
  return y ? `${y}y${mm ? ' ' + mm + 'm' : ''}` : `${m}mo`
})

const lenses = computed(() => [
  { key: 'all', label: 'Eligible alumni', icon: Users, value: items.value.length },
  { key: 'boomerang', label: 'Prior re-joiners', icon: Repeat, value: boomerangs.value },
  { key: 'first', label: 'First-timers', icon: UserPlus, value: firstTimers.value },
  { key: 'tenure', label: 'Avg prior tenure', icon: Clock, value: avgTenure.value, stat: true },
])

const visible = computed(() => {
  if (lens.value === 'boomerang') return items.value.filter(c => (c.rehire_count || 0) > 0)
  if (lens.value === 'first') return items.value.filter(c => !(c.rehire_count || 0))
  return items.value
})

const load = async () => {
  loading.value = true
  try {
    const data = await fetchRehireEligible(search.value.trim())
    items.value = data.items || []
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load rehire roster')
  } finally { loading.value = false }
}
let timer = null
const debouncedLoad = () => { clearTimeout(timer); timer = setTimeout(load, 280) }

const openRehire = (c) => { target.value = c; showModal.value = true }
const onDone = async () => { showModal.value = false; await load(); emit('refresh-counts') }

onMounted(load)
</script>

<style scoped>
.rr { display: flex; flex-direction: column; gap: 18px; }

/* ════════ CONSOLE HERO ════════ */
.rr-console {
  position: relative; overflow: hidden; border-radius: 22px; padding: 24px 24px 18px;
  background: var(--hr-surface-elevated); border: 1px solid var(--hr-border-strong);
  box-shadow: 0 24px 60px -42px rgba(0, 0, 0, 0.7);
}
.rr-aura { position: absolute; inset: -50% 35% 25% -15%; pointer-events: none;
  background: radial-gradient(60% 70% at 18% 0%, rgba(251, 191, 36, 0.16), transparent 70%);
  animation: rr-aura 12s ease-in-out infinite; }
@keyframes rr-aura { 0%, 100% { opacity: 0.7; transform: translate(0, 0); } 50% { opacity: 1; transform: translate(14px, 8px); } }
.rr-floor { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--hr-border) 1px, transparent 1px), linear-gradient(90deg, var(--hr-border) 1px, transparent 1px);
  background-size: 44px 44px; -webkit-mask-image: linear-gradient(to bottom, black, transparent 78%); mask-image: linear-gradient(to bottom, black, transparent 78%); }
.rr-ghost { position: absolute; right: -42px; top: -34px; color: var(--hr-accent-gold); opacity: 0.05; pointer-events: none; animation: rr-ghost-spin 80s linear infinite; }
@keyframes rr-ghost-spin { to { transform: rotate(-360deg); } }

.rr-main { position: relative; display: grid; grid-template-columns: 1fr clamp(260px, 34vw, 380px); gap: 22px; align-items: center; }
.rr-lead { min-width: 0; }
.rr-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; color: var(--hr-accent-gold); padding: 5px 11px; border-radius: 999px; background: var(--hr-accent-gold-soft); border: 1px solid var(--hr-accent-gold-border); }
.rr-title { margin: 12px 0 6px; font-size: clamp(24px, 3.4vw, 34px); font-weight: 850; letter-spacing: -0.02em; color: var(--hr-text); line-height: 1.05; }
.rr-title .grad { background: var(--hr-gradient-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.rr-sub { margin: 0; max-width: 540px; font-size: 13px; line-height: 1.55; color: var(--hr-text-muted); } .rr-sub b { color: var(--hr-text-secondary); }
.rr-cta { display: flex; align-items: center; gap: 10px; margin-top: 16px; }
.rr-search { display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--hr-text-muted); transition: border-color 0.2s, background 0.2s; }
.rr-search:focus-within { border-color: var(--hr-accent-gold-border); background: var(--hr-input-bg-focus); }
.rr-search input { background: transparent; border: 0; outline: none; color: var(--hr-text); font: inherit; font-size: 13px; width: 180px; }
.rr-search input::placeholder { color: var(--hr-input-placeholder); }
.rr-refresh { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; cursor: pointer; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--hr-text-muted); transition: 0.2s; }
.rr-refresh:hover { color: var(--hr-accent-gold); border-color: var(--hr-accent-gold-border); }
.rr-refresh.spin :deep(svg) { animation: rr-spin 0.85s linear infinite; }
@keyframes rr-spin { to { transform: rotate(360deg); } }

.rr-scope { min-width: 0; height: 184px; }

/* lenses */
.rr-lenses { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 20px; }
.rr-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 14px; cursor: pointer; text-align: left;
  background: var(--hr-surface); border: 1px solid var(--hr-border-strong); transition: transform 0.25s var(--hr-spring), border-color 0.25s, background 0.25s; }
.rr-lens:not(.stat):hover { transform: translateY(-2px); border-color: var(--hr-accent-gold-border); }
.rr-lens.stat { cursor: default; }
.rr-lens-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--hr-text-muted); background: var(--hr-input-bg); border: 1px solid var(--hr-border); transition: 0.25s; }
.rr-lens-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.rr-lens-v { font-size: 20px; font-weight: 850; color: var(--hr-text); line-height: 1; font-variant-numeric: tabular-nums; }
.rr-lens-l { font-size: 10.5px; color: var(--hr-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rr-lens-bar { position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--hr-spring); background: var(--hr-gradient-hero); }
.rr-lens.on { border-color: var(--hr-accent-gold-border); background: var(--hr-accent-gold-soft); }
.rr-lens.on .rr-lens-bar { transform: scaleX(1); }
.rr-lens.on .rr-lens-ic, .rr-lens.stat .rr-lens-ic { color: var(--hr-accent-gold); }

/* grid + cards */
.rr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.rr-skel { height: 196px; border-radius: 18px; background: linear-gradient(100deg, var(--hr-surface), var(--hr-surface-elevated), var(--hr-surface)); background-size: 200% 100%; animation: rr-shim 1.4s linear infinite; border: 1px solid var(--hr-border); }
@keyframes rr-shim { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* empty */
.rr-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 52px 24px; text-align: center; border-radius: 18px; background: var(--hr-surface); border: 1px dashed var(--hr-border-strong); }
.rr-empty-ic { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 16px; color: var(--hr-accent-gold); background: var(--hr-accent-gold-soft); border: 1px solid var(--hr-accent-gold-border); }
.rr-empty h3 { margin: 6px 0 0; font-size: 15px; color: var(--hr-text); }
.rr-empty p { margin: 0; max-width: 380px; font-size: 12px; line-height: 1.5; color: var(--hr-text-muted); } .rr-empty b { color: var(--hr-text-secondary); }

.rr-filter-empty { display: inline-flex; align-items: center; gap: 7px; justify-content: center; font-size: 12.5px; color: var(--hr-text-dim); padding: 16px; border-radius: 14px; background: var(--hr-surface); border: 1px dashed var(--hr-border-strong); }
.rr-link { background: none; border: 0; color: var(--hr-accent-gold); font-weight: 700; cursor: pointer; font-size: 12.5px; text-decoration: underline; }

@media (max-width: 880px) {
  .rr-main { grid-template-columns: 1fr; }
  .rr-scope { width: 100%; max-width: 420px; }
  .rr-lenses { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 460px) { .rr-lenses { grid-template-columns: 1fr; } .rr-search input { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .rr-aura, .rr-ghost { animation: none; } }
</style>
