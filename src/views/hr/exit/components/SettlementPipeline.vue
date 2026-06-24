<template>
  <div class="sp" :class="{ reversed }">
    <div class="sp-track">
      <span class="sp-fill" :style="{ width: fillPct + '%' }" />
      <span v-if="!reversed && curIdx >= 0 && curIdx < STAGES.length - 1" class="sp-pulse" :style="{ left: fillPct + '%' }" />
    </div>
    <div class="sp-nodes">
      <div v-for="(st, i) in STAGES" :key="st.key" class="sp-node"
        :class="{ done: i < curIdx, active: i === curIdx && !reversed, future: i > curIdx }">
        <span class="sp-dot">
          <component :is="i < curIdx ? Check : st.icon" :size="13" />
        </span>
        <span class="sp-lbl">{{ st.label }}</span>
      </div>
    </div>
    <div v-if="reversed" class="sp-rev"><RotateCcw :size="12" /> Reversed — re-verify to re-post</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { FileText, BadgeCheck, ShieldCheck, Banknote, Lock, Check, RotateCcw } from 'lucide-vue-next'

const props = defineProps({ status: { type: String, default: 'DRAFT' } })

const STAGES = [
  { key: 'DRAFT', label: 'Draft', icon: FileText },
  { key: 'VERIFIED', label: 'Verified', icon: BadgeCheck },
  { key: 'APPROVED', label: 'Approved', icon: ShieldCheck },
  { key: 'PAID', label: 'Paid', icon: Banknote },
  { key: 'CLOSED', label: 'Closed', icon: Lock },
]
const reversed = computed(() => props.status === 'REVERSED')
const curIdx = computed(() => {
  if (reversed.value) return 0
  const i = STAGES.findIndex(s => s.key === props.status)
  return i < 0 ? 0 : i
})
const fillPct = computed(() => {
  if (reversed.value) return 0
  return (curIdx.value / (STAGES.length - 1)) * 100
})
</script>

<style scoped>
.sp { position: relative; padding: 6px 4px 2px; }
.sp-track { position: relative; height: 3px; border-radius: 2px; margin: 0 24px 0;
  background: color-mix(in srgb, var(--ex-text) 9%, transparent); }
.sp-fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 2px;
  background: var(--ex-grad-hero); box-shadow: 0 0 12px -2px var(--ex-amber); transition: width 0.9s var(--ex-spring); }
.sp-pulse { position: absolute; top: 50%; width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; border-radius: 50%;
  background: var(--ex-amber-bright); box-shadow: 0 0 0 0 color-mix(in srgb, var(--ex-amber) 60%, transparent);
  animation: sp-ping 1.8s ease-out infinite; transition: left 0.9s var(--ex-spring); }
.sp-nodes { display: grid; grid-template-columns: repeat(5, 1fr); margin-top: -8px; }
.sp-node { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.sp-dot { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
  background: var(--ex-surface-elevated); border: 1.5px solid var(--ex-border-strong); color: var(--ex-text-dim);
  transition: all 0.4s var(--ex-spring); }
.sp-node.done .sp-dot { color: var(--ex-cleared); border-color: var(--ex-cleared);
  background: color-mix(in srgb, var(--ex-cleared) 14%, transparent); }
.sp-node.active .sp-dot { color: #1a1206; border-color: transparent; background: var(--ex-grad-hero);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--ex-amber) 18%, transparent), 0 6px 18px -6px var(--ex-ember-deep);
  animation: sp-breathe 2.6s ease-in-out infinite; }
.sp-lbl { font-size: 10px; font-weight: 700; letter-spacing: 0.02em; color: var(--ex-text-muted); }
.sp-node.done .sp-lbl { color: var(--ex-text-secondary); }
.sp-node.active .sp-lbl { color: var(--ex-amber); }
.sp.reversed .sp-dot { opacity: 0.5; }
.sp-rev { display: inline-flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 11px; font-weight: 700;
  color: var(--ex-blocked); padding: 4px 10px; border-radius: 999px;
  background: color-mix(in srgb, var(--ex-blocked) 12%, transparent); border: 1px solid color-mix(in srgb, var(--ex-blocked) 28%, transparent); }

@media (prefers-reduced-motion: reduce) { .sp-fill, .sp-dot, .sp-pulse { transition: none; } .sp-pulse, .sp-node.active .sp-dot { animation: none; } }
@keyframes sp-ping { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--ex-amber) 55%, transparent); } 100% { box-shadow: 0 0 0 12px transparent; } }
@keyframes sp-breathe { 0%,100% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--ex-amber) 16%, transparent), 0 6px 18px -6px var(--ex-ember-deep); } 50% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--ex-amber) 9%, transparent), 0 6px 22px -4px var(--ex-ember-deep); } }
</style>
