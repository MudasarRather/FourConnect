<template>
  <nav class="pay-tabbar" role="tablist" aria-label="Payroll sections">
    <div class="tb-scroll" ref="scrollRef">
      <Motion v-for="(t, i) in tabs" :key="t.key" as="button"
        class="tb-item" :class="{ active: t.key === modelValue, locked: t.phaseA === false }"
        role="tab" :aria-selected="t.key === modelValue"
        :ref="el => setRef(el, t.key)"
        :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: Math.min(i * 0.025, 0.4), ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
        @click="$emit('update:modelValue', t.key)">
        <component :is="t.icon" :size="15" />
        <span class="tb-label">{{ t.label }}</span>
        <span v-if="t.phaseA === false" class="tb-soon">soon</span>
      </Motion>
    </div>
  </nav>
</template>

<script setup>
import { ref, nextTick, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'

const props = defineProps({
  modelValue: { type: String, required: true },
  tabs: { type: Array, required: true },
})
defineEmits(['update:modelValue'])

const scrollRef = ref(null)
const refs = {}
const setRef = (el, key) => { if (el) refs[key] = el.$el || el }

const scrollActiveIntoView = async () => {
  await nextTick()
  const el = refs[props.modelValue]
  if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
}
watch(() => props.modelValue, scrollActiveIntoView)
onMounted(scrollActiveIntoView)
</script>

<style scoped>
.pay-tabbar { position: sticky; top: 0; z-index: 20; padding: 10px 0;
  background: linear-gradient(180deg, var(--pay-canvas) 60%, transparent); }
.tb-scroll { display: flex; gap: 6px; overflow-x: auto; padding: 4px 2px; scrollbar-width: none; }
.tb-scroll::-webkit-scrollbar { display: none; }
.tb-item { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 15px; border-radius: 999px; cursor: pointer; white-space: nowrap;
  border: 1px solid transparent; background: var(--pay-surface);
  color: var(--pay-text-2); font-size: 12.5px; font-weight: 600;
  transition: color 0.25s var(--pay-ease), background 0.25s var(--pay-ease), border-color 0.25s; }
.tb-item:hover { color: var(--pay-text); border-color: var(--pay-border); }
.tb-item.active { color: #1a1206; background: var(--pay-grad-cta);
  box-shadow: 0 8px 24px -8px rgba(245,158,11,0.55); border-color: transparent; }
.tb-label { line-height: 1; }
.tb-soon { font-family: var(--pay-mono); font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.1em;
  padding: 1px 5px; border-radius: 5px; background: rgba(251,191,36,0.14); color: var(--pay-treasury); }
.tb-item.active .tb-soon { background: rgba(0,0,0,0.18); color: #2a1c0b; }
.tb-item.locked { opacity: 0.82; }
[data-theme="light"] .pay-tabbar { background: linear-gradient(180deg, var(--pay-canvas) 60%, transparent); }
[data-theme="light"] .tb-item.active { color: #2a1c0b; }
</style>
