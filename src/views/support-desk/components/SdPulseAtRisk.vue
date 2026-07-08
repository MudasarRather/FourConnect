<template>
  <section class="par sd-card">
    <span class="par-sweep" aria-hidden="true" />
    <header class="par-head">
      <h3><Timer :size="15" /> At-risk deadlines</h3>
      <button class="par-link" @click="$emit('go')">Recovery desk →</button>
    </header>

    <div v-if="rows.length" class="par-rows">
      <button v-for="(r, i) in rows" :key="r.id" class="par-row" :class="r.tone" :style="{ '--i': i }"
        @click="$emit('open', String(r.id))">
        <span class="par-spine" aria-hidden="true" />
        <span class="par-main">
          <span class="par-top">
            <span class="par-no sd-mono">{{ r.ticket_number }}</span>
            <SdPill kind="priority" :value="r.priority" />
            <span v-if="r.unassigned" class="par-tag">unclaimed</span>
            <span v-else-if="r.assigned_to_me" class="par-tag mine">mine</span>
          </span>
          <span class="par-subj">{{ r.subject || 'Untitled ticket' }}</span>
        </span>
        <span class="par-count sd-mono" :class="r.tone">
          <i class="par-pip" aria-hidden="true" />
          {{ r.text }}
        </span>
      </button>
    </div>

    <div v-else class="par-empty">
      <span class="par-eico"><ShieldCheck :size="24" /></span>
      <p>No deadlines at risk — every clock is comfortably in the green.</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Timer, ShieldCheck } from 'lucide-vue-next'
import SdPill from './SdPill.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
})
defineEmits(['open', 'go'])

// A single ticking clock drives every countdown; cleared on unmount.
const now = ref(Date.now())
let iv = null
onMounted(() => { iv = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => { if (iv) clearInterval(iv) })

const fmt = (ms) => {
  const past = ms < 0
  let s = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(s / 3600); s -= h * 3600
  const m = Math.floor(s / 60); s -= m * 60
  const body = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m`
    : m > 0 ? `${m}m ${String(s).padStart(2, '0')}s`
    : `${s}s`
  return past ? `-${body}` : body
}

const rows = computed(() => (props.items || []).map((it) => {
  const due = it.due_at ? new Date(it.due_at).getTime() : null
  const diff = due != null ? due - now.value : null
  const breached = it.breached || (diff != null && diff < 0)
  const tone = breached ? 'crit' : (diff != null && diff <= 30 * 60 * 1000) ? 'warn' : 'ok'
  return {
    ...it,
    tone,
    text: diff == null ? 'no clock' : (breached ? `BREACHED ${fmt(diff)}` : fmt(diff)),
  }
}))
</script>

<style scoped>
.par { position: relative; overflow: hidden; padding: 16px 18px; display: flex; flex-direction: column; }
.par-sweep { position: absolute; top: 0; left: 0; right: 0; height: 2px; pointer-events: none; z-index: 1;
  background: linear-gradient(90deg, transparent, var(--pulse), transparent); opacity: 0.55;
  transform: translateX(-100%); animation: par-sweep 5.5s ease-in-out infinite; }
@keyframes par-sweep { 0% { transform: translateX(-100%); } 55%, 100% { transform: translateX(100%); } }
.par-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.par-head h3 { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--sd-text); margin: 0; }
.par-head h3 :deep(svg) { color: var(--pulse); }
.par-link { background: none; border: none; color: var(--pulse); font-size: 12.5px; font-weight: 600; cursor: pointer; }

.par-rows { display: flex; flex-direction: column; gap: 6px; }
.par-row { position: relative; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 12px;
  padding: 10px 13px 10px 16px; border-radius: 13px; text-align: left; cursor: pointer; overflow: hidden;
  background: var(--sd-surface-glass); border: 1px solid transparent;
  transition: border-color 0.18s, transform 0.2s var(--sd-spring);
  animation: sd-stream-in 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.05s); }
.par-row:hover { transform: translateY(-2px); border-color: var(--sd-border-strong); }
.par-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--sd-steel); }
.par-row.warn .par-spine { background: var(--pulse-ember); box-shadow: 0 0 12px var(--pulse-ember); }
.par-row.crit .par-spine { background: var(--pulse-dn); box-shadow: 0 0 12px var(--pulse-dn); }
.par-row.ok .par-spine { background: var(--pulse-up); }

.par-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.par-top { display: flex; align-items: center; gap: 8px; }
.par-no { font-size: 12px; font-weight: 700; color: var(--pulse); }
.par-tag { font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 1px 6px; border-radius: 5px;
  color: var(--sd-text-dim); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.par-tag.mine { color: var(--pulse); border-color: var(--pulse-border); background: var(--pulse-soft); }
.par-subj { font-size: 13px; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.par-count { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 700; white-space: nowrap;
  padding: 5px 10px; border-radius: 9px; }
.par-count.ok { color: var(--pulse-up); background: color-mix(in srgb, var(--pulse-up) 12%, transparent); }
.par-count.warn { color: var(--pulse-ember); background: color-mix(in srgb, var(--pulse-ember) 14%, transparent); }
.par-count.crit { color: var(--pulse-dn); background: color-mix(in srgb, var(--pulse-dn) 15%, transparent); }
.par-pip { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
.par-row.crit .par-pip, .par-row.warn .par-pip { animation: sd-breathe 1.3s ease-in-out infinite; }

.par-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 22px 16px; text-align: center; }
.par-eico { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 15px; color: var(--pulse-up);
  background: color-mix(in srgb, var(--pulse-up) 12%, transparent); }
.par-empty p { margin: 0; font-size: 12.5px; color: var(--sd-text-muted); max-width: 32ch; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .par-row { animation: none; }
  html:not([data-cinematic="on"]) .par-sweep { animation: none; opacity: 0; }
  html:not([data-cinematic="on"]) .par-pip { animation: none !important; }
}
</style>
