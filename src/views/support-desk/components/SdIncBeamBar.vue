<template>
  <!-- THE BEAM — the Active desk's signature instrument (artifact-faithful): a glass
       omnibar over a warm light field; typed lens words become glowing tokens, free
       text searches server-side, and the stat tray hangs off the bar's lower edge. -->
  <div class="bb" :class="{ hot: breached > 0, focus: focused, flash }">
    <div class="bb-bar" @click="inputEl?.focus()">
      <Search :size="16" class="bb-ico" />
      <TransitionGroup name="tok" tag="div" class="bb-tokens">
        <button v-for="t in tokens" :key="t.key" class="bb-tok" :class="t.tone"
          :title="`Clear ${t.label}`" @click.stop="$emit('remove-token', t.key)">
          {{ t.label }} <X :size="10" />
        </button>
      </TransitionGroup>
      <input ref="inputEl" :value="modelValue" type="text" class="bb-input" spellcheck="false"
        :placeholder="placeholder" aria-label="Filter live faults"
        @input="$emit('update:modelValue', $event.target.value)"
        @keydown="onKey" @focus="focused = true" @blur="focused = false" />
      <span class="bb-counter sd-mono" :title="`${shown} of ${count} in the light`">{{ shown }}/{{ count }}</span>
      <button v-if="modelValue || tokens.length" class="bb-x" title="Clear all filters (esc)"
        @click.stop="$emit('clear')"><X :size="13" /></button>
      <span class="bb-kbd sd-mono" aria-hidden="true">⌘K</span>
    </div>

    <!-- stat tray — hangs off the bar -->
    <div class="bb-tray">
      <span v-for="s in trayStats" :key="s.k" class="bb-stat" :class="{ warn: s.hot }">
        <i>{{ s.k }}</i>
        <b class="sd-mono"><SdCountUp :value="s.v" :duration="900" /><em v-if="s.sfx">{{ s.sfx }}</em></b>
        <span class="meter" aria-hidden="true"><span :style="{ width: s.pct + '%' }" /></span>
      </span>
    </div>

    <!-- live feed + keyboard hints -->
    <Transition name="feedswap" mode="out-in">
      <p v-if="feedLine" :key="feedLine.key" class="bb-feed sd-mono">
        <span class="dot" :class="`s${feedLine.sev}`" />{{ feedLine.text }}
      </p>
    </Transition>
    <p class="bb-hint sd-mono">↑↓ TO MOVE · ↵ TO OPEN · ESC TO CLEAR · TYPE A LENS ("SEV1", "BREACHED") OR SEARCH</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Search, X } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  modelValue: { type: String, default: '' },
  tokens: { type: Array, default: () => [] },       // [{key,label,tone}]
  stats: { type: Object, default: null },
  count: { type: Number, default: 0 },              // filtered total on the desk
  shown: { type: Number, default: 0 },              // rows on this page
})
const emit = defineEmits(['update:modelValue', 'remove-token', 'try-token', 'clear', 'nav', 'open'])

const inputEl = ref(null)
const focused = ref(false)
const flash = ref(false)
const reduced = prefersReduced()

const breached = computed(() => props.stats?.sla?.breached || 0)
const trayStats = computed(() => {
  const s = props.stats || {}
  const total = Math.max(1, s.active_total || 0)
  return [
    { k: 'MTTA 30D', v: Math.round(s.mtta_minutes_30d ?? 0), sfx: 'm',
      pct: Math.min(100, Math.round((s.mtta_minutes_30d ?? 0) / 1.2)) },
    { k: 'AT RISK', v: s.sla?.at_risk || 0, hot: (s.sla?.at_risk || 0) > 0,
      pct: Math.round(100 * (s.sla?.at_risk || 0) / total) },
    { k: 'UNACKED', v: s.unacked || 0, hot: (s.unacked || 0) > 0,
      pct: Math.round(100 * (s.unacked || 0) / total) },
    { k: 'RESOLVED TODAY', v: s.resolved_today || 0,
      pct: Math.min(100, (s.resolved_today || 0) * 10) },
  ]
})

/* cycling placeholder — typed out letter by letter (cinematic-gated) */
const QUERIES = ['breached', 'payments-api', 'unacked sev2', 'update overdue', 'checkout']
const placeholder = ref('Search the live board…')
let phTimer = null
const cyclePh = () => {
  if (reduced) return
  let qi = 0
  const typeOne = () => {
    const q = QUERIES[qi % QUERIES.length]; qi++
    let k = 0
    const step = () => {
      placeholder.value = 'Try "' + q.slice(0, ++k) + '"'
      if (k < q.length) phTimer = setTimeout(step, 70)
      else phTimer = setTimeout(() => { placeholder.value = 'Search the live board…'; phTimer = setTimeout(typeOne, 3600) }, 2200)
    }
    step()
  }
  phTimer = setTimeout(typeOne, 2500)
}

/* live feed line — cycles the stats feed */
const feedIdx = ref(0)
const feedLine = computed(() => {
  const f = (props.stats?.feed || [])[feedIdx.value % Math.max(1, (props.stats?.feed || []).length)]
  if (!f) return null
  const verb = (f.action || '').replace(/_/g, ' ')
  return { key: feedIdx.value, sev: f.sev || 4,
    text: `${f.ticket_number || ''} · ${verb} · ${f.actor || 'System'}` }
})
let feedTimer = null

/* keyboard: "/" or Ctrl/Cmd+K focuses; arrows navigate; Enter opens or converts a token */
const onGlobalKey = (e) => {
  const tag = document.activeElement?.tagName
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable
  if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
    e.preventDefault(); inputEl.value?.focus()
  }
}
const onKey = (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); emit('nav', 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); emit('nav', -1) }
  else if (e.key === 'Escape') { emit('clear') }
  else if (e.key === 'Enter') {
    if (!props.modelValue.trim() || !emitToken(props.modelValue.trim())) emit('open')
  } else if (e.key === ' ') {
    if (emitToken(props.modelValue.trim())) e.preventDefault()
  } else if (e.key === 'Backspace' && !props.modelValue && props.tokens.length) {
    emit('remove-token', props.tokens[props.tokens.length - 1].key)
  }
}
const emitToken = (word) => {
  if (!word || word.includes(' ')) return false
  let handled = false
  emit('try-token', word.toLowerCase(), (ok) => { handled = ok })
  return handled
}

/* the section calls this on arrivals via a template ref */
const flashBeam = () => {
  if (reduced) return
  flash.value = true
  setTimeout(() => { flash.value = false }, 700)
}
defineExpose({ flashBeam, focus: () => inputEl.value?.focus(), flash })

onMounted(() => {
  addEventListener('keydown', onGlobalKey)
  cyclePh()
  feedTimer = setInterval(() => { feedIdx.value++ }, 6000)
})
onBeforeUnmount(() => {
  removeEventListener('keydown', onGlobalKey)
  clearTimeout(phTimer)
  clearInterval(feedTimer)
})
watch(() => props.stats, () => { feedIdx.value = 0 })
</script>

<style scoped>
.bb { position: relative; display: flex; flex-direction: column; align-items: center; }

/* the omnibar */
.bb-bar { position: relative; z-index: 3; display: flex; align-items: center; gap: 10px;
  width: min(820px, 94vw); min-height: 58px; padding: 9px 14px 9px 20px; border-radius: 19px;
  cursor: text; background: linear-gradient(155deg,
    color-mix(in srgb, var(--sd-surface-elevated) 78%, transparent),
    color-mix(in srgb, var(--sd-surface) 58%, transparent));
  border: 1px solid var(--sd-inc-brd);
  backdrop-filter: blur(20px) saturate(1.15); -webkit-backdrop-filter: blur(20px) saturate(1.15);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 30px 70px -34px rgba(0, 0, 0, 0.55);
  transition: border-color 0.3s, box-shadow 0.3s; }
[data-theme="light"] .bb-bar { background: linear-gradient(155deg, rgba(255, 253, 247, 0.92), rgba(255, 250, 240, 0.7));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 26px 60px -32px rgba(122, 90, 40, 0.35); }
.bb.focus .bb-bar { border-color: var(--sd-inc-core);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 0 0 1px var(--sd-inc-core),
    0 34px 80px -30px var(--sd-inc-glow, rgba(0, 0, 0, 0.55)); }
/* flashBeam() pulse — fires when a new fault lands on the board during a silent poll */
.bb.flash .bb-bar { animation: bb-flash 0.7s ease-out; }
@keyframes bb-flash {
  0% { border-color: var(--sd-inc-core);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 0 0 2px var(--sd-inc-core),
      0 0 42px -4px var(--sd-inc-core); }
  100% { border-color: var(--sd-inc-brd);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 30px 70px -34px rgba(0, 0, 0, 0.55); } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .bb.flash .bb-bar { animation: none; } }
.bb-ico { color: var(--sd-inc-core); flex: none; }
.bb-tokens { display: flex; gap: 6px; flex-wrap: wrap; }
.bb-tok { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px;
  cursor: pointer; font: inherit; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em;
  color: var(--sd-inc-core); background: var(--sd-inc-soft); border: 1px solid var(--sd-inc-brd);
  box-shadow: 0 0 14px -4px var(--sd-inc-core); transition: all 0.22s var(--sd-spring);
  font-family: var(--sd-mono); }
.bb-tok:hover { transform: translateY(-1px); filter: brightness(1.1); }
.bb-tok.hot { color: var(--sd-inc-arc); background: var(--sd-inc-arc-soft);
  border-color: color-mix(in srgb, var(--sd-inc-arc) 45%, transparent); box-shadow: 0 0 14px -4px var(--sd-inc-arc); }
.bb-tok.warn { color: var(--sd-inc-warn); border-color: color-mix(in srgb, var(--sd-inc-warn) 45%, transparent);
  background: color-mix(in srgb, var(--sd-inc-warn) 12%, transparent); box-shadow: 0 0 14px -4px var(--sd-inc-warn); }
.tok-enter-active, .tok-leave-active { transition: all 0.28s var(--sd-spring); }
.tok-enter-from, .tok-leave-to { opacity: 0; transform: scale(0.8); }
.bb-input { flex: 1; min-width: 120px; border: 0; outline: none; background: transparent;
  font: inherit; font-size: 15px; color: var(--sd-text); caret-color: var(--sd-inc-core); }
.bb-input::placeholder { color: var(--sd-text-placeholder, var(--sd-text-muted)); }
.bb-counter { flex: none; font-size: 10.5px; letter-spacing: 0.06em; color: var(--sd-text-muted); }
.bb-x { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 9px; cursor: pointer;
  color: var(--sd-text-muted); background: transparent; border: 1px solid var(--sd-border);
  transition: all 0.2s; flex: none; }
.bb-x:hover { color: var(--sd-inc-arc); border-color: var(--sd-inc-arc); }
.bb-kbd { flex: none; display: grid; place-items: center; min-width: 26px; height: 24px; padding: 0 7px;
  border-radius: 7px; font-size: 10px; color: var(--sd-text-muted);
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.25); }
[data-theme="light"] .bb-kbd { box-shadow: inset 0 -2px 0 rgba(122, 90, 40, 0.18); }

/* stat tray — hangs off the bar, artifact style: cells with underline meters */
.bb-tray { position: relative; z-index: 2; display: flex; align-items: stretch; flex-wrap: wrap;
  justify-content: center; margin-top: -2px; width: min(700px, 88vw); border-radius: 0 0 18px 18px;
  background: color-mix(in srgb, var(--sd-surface) 78%, transparent);
  border: 1px solid var(--sd-border); border-top: 0;
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 24px 50px -30px rgba(0, 0, 0, 0.45); }
[data-theme="light"] .bb-tray { background: rgba(255, 250, 240, 0.8); }
.bb-stat { flex: 1 1 140px; display: flex; flex-direction: column; gap: 4px; padding: 13px 20px 11px;
  border-right: 1px solid var(--sd-border); min-width: 130px; }
.bb-stat:last-child { border-right: 0; }
.bb-stat i { font-style: normal; font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em;
  color: var(--sd-text-muted); }
.bb-stat b { font-size: 21px; font-weight: 350; color: var(--sd-text); line-height: 1.1; }
.bb-stat b em { font-style: normal; font-size: 12px; color: var(--sd-text-secondary); }
.bb-stat.warn b { color: var(--sd-inc-warn); }
.bb-stat .meter { display: block; height: 2px; border-radius: 2px; margin-top: 4px;
  background: var(--sd-border); overflow: hidden; }
.bb-stat .meter span { display: block; height: 100%; background: var(--sd-inc-grad);
  transition: width 1.2s var(--sd-spring); }
.bb-stat.warn .meter span { background: var(--sd-inc-warn); }

/* live feed + hint lines */
.bb-feed { display: flex; align-items: center; gap: 8px; margin: 13px 0 0; font-size: 10px;
  letter-spacing: 0.06em; color: var(--sd-text-secondary); max-width: 92vw;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bb-feed .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-inc-dim); flex: none; }
.bb-feed .dot.s1 { background: var(--sd-pri-critical); box-shadow: 0 0 8px var(--sd-pri-critical); }
.bb-feed .dot.s2 { background: var(--sd-pri-urgent); }
.bb-feed .dot.s3 { background: var(--sd-amber); }
.feedswap-enter-active, .feedswap-leave-active { transition: all 0.35s var(--sd-spring); }
.feedswap-enter-from { opacity: 0; transform: translateY(6px); }
.feedswap-leave-to { opacity: 0; transform: translateY(-6px); }
.bb-hint { margin: 6px 0 0; font-size: 8.5px; letter-spacing: 0.14em;
  color: var(--sd-text-dim, var(--sd-text-muted)); text-align: center; }
</style>
