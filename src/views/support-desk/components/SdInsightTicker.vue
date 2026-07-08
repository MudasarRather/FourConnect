<template>
  <div class="ins" :class="cur ? cur.severity : 'clear'" @mouseenter="pause = true" @mouseleave="pause = false">
    <span class="ins-rail" aria-hidden="true" />
    <span class="ins-ic">
      <component :is="cur ? sevIcon(cur.severity) : Sparkles" :size="17" />
    </span>

    <Presence :initial="false" mode="wait">
      <Motion
        v-if="cur" :key="cur.id" class="ins-body"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -10 }"
        :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }"
      >
        <span class="ins-eyebrow"><Sparkles :size="11" /> Smart insight</span>
        <p class="ins-title">{{ cur.title }}</p>
        <p v-if="cur.detail" class="ins-detail">{{ cur.detail }}</p>
      </Motion>
      <Motion
        v-else key="clear" class="ins-body"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :transition="{ duration: 0.3 }"
      >
        <span class="ins-eyebrow"><Sparkles :size="11" /> Smart insights</span>
        <p class="ins-title">You're on top of it — no risks or duplicates detected.</p>
      </Motion>
    </Presence>

    <div v-if="cur" class="ins-actions">
      <Motion
        as="button" type="button" class="ins-act"
        :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
        @click="$emit('act', cur)"
      >
        <component :is="actIcon(cur.action)" :size="13" /> {{ actLabel(cur.action) }}
      </Motion>
      <div v-if="insights.length > 1" class="ins-nav">
        <button class="ins-arrow" @click="step(-1)" aria-label="Previous"><ChevronLeft :size="14" /></button>
        <div class="ins-dots">
          <span v-for="(x, i) in insights" :key="x.id" class="ins-dot" :class="{ on: i === idx }" />
        </div>
        <button class="ins-arrow" @click="step(1)" aria-label="Next"><ChevronRight :size="14" /></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Sparkles, AlertTriangle, Timer, Lightbulb, ChevronLeft, ChevronRight,
  Eye, UserCheck, GitMerge, Flame, CircleCheck, Send,
} from 'lucide-vue-next'

const props = defineProps({
  insights: { type: Array, default: () => [] },
  reduced: { type: Boolean, default: false },
})
defineEmits(['act'])

const idx = ref(0)
const pause = ref(false)
let timer = null
const cur = computed(() => props.insights[idx.value] || null)

const step = (d) => {
  const n = props.insights.length
  if (!n) return
  idx.value = (idx.value + d + n) % n
}
watch(() => props.insights.length, () => { if (idx.value >= props.insights.length) idx.value = 0 })

const sevIcon = (s) => (s === 'crit' ? AlertTriangle : s === 'warn' ? Timer : Lightbulb)
const ACT_ICON = { view: Eye, assign: UserCheck, merge: GitMerge, escalate: Flame, resolve: CircleCheck, reply: Send }
const ACT_LABEL = { view: 'View', assign: 'Assign', merge: 'Merge', escalate: 'Escalate', resolve: 'Resolve', reply: 'Nudge' }
const actIcon = (a) => ACT_ICON[a] || Eye
const actLabel = (a) => ACT_LABEL[a] || 'View'

onMounted(() => {
  timer = setInterval(() => { if (!pause.value && props.insights.length > 1) step(1) }, 6000)
})
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.ins { position: relative; overflow: hidden; display: flex; align-items: center; gap: 14px;
  padding: 12px 14px; border-radius: 15px; --ic: var(--sd-amber);
  background: var(--sd-surface); border: 1px solid var(--sd-border); min-height: 64px; }
.ins.crit { --ic: var(--sd-danger); } .ins.warn { --ic: var(--sd-warning); } .ins.info { --ic: var(--sd-amber); } .ins.clear { --ic: var(--sd-success); }
.ins-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--ic); box-shadow: 0 0 12px color-mix(in srgb, var(--ic) 55%, transparent); }
.ins-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--ic);
  background: color-mix(in srgb, var(--ic) 13%, transparent); border: 1px solid color-mix(in srgb, var(--ic) 28%, transparent); }
.ins.crit .ins-ic { animation: sd-breach-flash 2s ease-out infinite; }
.ins-body { flex: 1; min-width: 0; }
.ins-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-family: var(--sd-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ic); }
.ins-title { font-size: 13.5px; font-weight: 700; color: var(--sd-text); margin: 2px 0 0; line-height: 1.3; }
.ins-detail { font-size: 11.5px; color: var(--sd-text-muted); margin: 2px 0 0; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ins-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.ins-act { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  color: var(--ic); background: color-mix(in srgb, var(--ic) 13%, transparent); border: 1px solid color-mix(in srgb, var(--ic) 32%, transparent); }
.ins-act:hover { background: color-mix(in srgb, var(--ic) 20%, transparent); }
.ins-nav { display: flex; align-items: center; gap: 7px; }
.ins-arrow { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; cursor: pointer; color: var(--sd-text-muted); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); }
.ins-arrow:hover { color: var(--sd-text); border-color: var(--sd-border-strong); }
.ins-dots { display: flex; gap: 4px; }
.ins-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-border-strong); transition: all 0.25s var(--sd-spring); }
.ins-dot.on { width: 16px; border-radius: 3px; background: var(--ic); }

@media (max-width: 720px) { .ins-detail { display: none; } .ins-nav { display: none; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ins.crit .ins-ic { animation: none; }
}
</style>
