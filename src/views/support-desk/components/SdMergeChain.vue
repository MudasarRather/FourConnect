<template>
  <div class="mc">
    <div class="mc-h sd-mono"><GitMerge :size="12" /> MERGE LINEAGE</div>

    <!-- masters — walked UP merged_into_id -->
    <template v-for="(m, i) in mastersTop" :key="String(m.id)">
      <Motion as="button" class="mc-node master" :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.35, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="{ x: 3 }" @click="$emit('open', m.id)">
        <Crown :size="12" />
        <span class="mc-no sd-mono">{{ m.ticket_number }}</span>
        <span class="mc-subj">{{ m.subject }}</span>
        <span class="mc-st sd-mono" :class="m.status">{{ (m.status || '').replace(/_/g, ' ') }}</span>
      </Motion>
      <span class="mc-link" aria-hidden="true"><CornerDownRight :size="11" /> folded into</span>
    </template>

    <!-- this record -->
    <div class="mc-node current">
      <FileArchive :size="12" />
      <span class="mc-no sd-mono">{{ currentNumber }}</span>
      <span class="mc-subj">this record</span>
    </div>

    <!-- duplicates folded INTO this record -->
    <template v-if="(chain.duplicates || []).length">
      <span class="mc-link" aria-hidden="true"><CornerDownRight :size="11" /> absorbed</span>
      <Motion v-for="(d, i) in chain.duplicates" :key="String(d.id)" as="button" class="mc-node dup"
        :initial="{ opacity: 0, x: 10 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.35, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
        :while-hover="{ x: 3 }" @click="$emit('open', d.id)">
        <Copy :size="12" />
        <span class="mc-no sd-mono">{{ d.ticket_number }}</span>
        <span class="mc-subj">{{ d.subject }}</span>
        <span class="mc-when sd-mono">{{ when(d.closed_at) }}</span>
      </Motion>
    </template>

    <p v-if="!(chain.masters || []).length && !(chain.duplicates || []).length" class="mc-empty">
      No merges touch this record — it stands alone.
    </p>
  </div>
</template>

<script setup>
/* SdMergeChain — the closure certificate's lineage graph: masters this record was folded
   into (walked up merged_into_id) and the duplicates absorbed into it. Every node opens
   that ticket's drawer via @open. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { GitMerge, Crown, Copy, CornerDownRight, FileArchive } from 'lucide-vue-next'

const props = defineProps({
  chain: { type: Object, default: () => ({ masters: [], duplicates: [] }) },
  currentNumber: { type: String, default: '' },
})
defineEmits(['open'])

/* masters arrive nearest-first (direct master → its master); render top-down farthest first */
const mastersTop = computed(() => [...(props.chain.masters || [])].reverse())
const when = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`
}
</script>

<style scoped>
.mc { display: flex; flex-direction: column; gap: 6px; }
.mc-h { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-cls-frost); margin-bottom: 2px; }
.mc-node { display: flex; align-items: center; gap: 8px; padding: 8px 11px; border-radius: 11px; text-align: left; font-family: inherit;
  border: 1px solid var(--sd-border); background: var(--sd-surface-glass); color: var(--sd-text); cursor: pointer; min-width: 0;
  transition: border-color 0.18s; }
.mc-node:hover { border-color: var(--sd-cls-seal); }
.mc-node.master { border-color: color-mix(in srgb, var(--sd-cls-seal) 40%, transparent); color: var(--sd-text); }
.mc-node.master svg { color: var(--sd-cls-seal); }
.mc-node.current { border-style: dashed; border-color: var(--sd-cls-brd); cursor: default; }
.mc-node.current svg { color: var(--sd-cls-hi); }
[data-theme="light"] .mc-node.current svg { color: var(--sd-cls-deep); }
.mc-node.dup svg { color: var(--sd-cls-frost); }
.mc-no { font-size: 11px; font-weight: 800; color: var(--sd-cls-hi); flex-shrink: 0; }
[data-theme="light"] .mc-no { color: var(--sd-cls-deep); }
.mc-subj { font-size: 12px; color: var(--sd-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.mc-st { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--sd-text-dim); flex-shrink: 0; }
.mc-st.closed { color: var(--sd-cls-frost); }
.mc-when { font-size: 9.5px; color: var(--sd-text-dim); flex-shrink: 0; }
.mc-link { display: inline-flex; align-items: center; gap: 5px; margin-left: 14px; font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--sd-text-dim); }
.mc-empty { margin: 0; font-size: 12px; color: var(--sd-text-dim); }
</style>
