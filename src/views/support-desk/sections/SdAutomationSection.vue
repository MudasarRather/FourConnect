<template>
  <div class="sd-automation">
    <div class="sd-info-banner">
      <Info :size="16" />
      <span>Rules are saved now; the execution engine activates in a later phase.</span>
    </div>

    <div class="sd-toolbar">
      <span class="sd-toolbar-spacer" />
      <button class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> New Rule</button>
    </div>

    <div v-if="rules.length" class="sd-rule-list">
      <Motion
        v-for="(r, i) in rules"
        :key="r.id"
        as="button"
        type="button"
        class="sd-rule-row sd-card"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :while-hover="{ y: -2 }"
        :transition="{ duration: 0.32, delay: Math.min(i * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }"
        @click="openEdit(r)"
      >
        <span class="sd-rule-order sd-mono">{{ r.order_index ?? i }}</span>
        <div class="sd-rule-main">
          <p class="sd-rule-name">{{ r.name }}</p>
          <p class="sd-rule-counts">
            {{ countOf(r.conditions) }} {{ countOf(r.conditions) === 1 ? 'condition' : 'conditions' }}
            <ArrowRight :size="12" class="sd-rule-arrow" />
            {{ countOf(r.actions) }} {{ countOf(r.actions) === 1 ? 'action' : 'actions' }}
          </p>
        </div>
        <span class="sd-rule-state" :class="r.is_active ? 'is-on' : 'is-off'">
          <span class="sd-rule-dot" />{{ r.is_active ? 'active' : 'inactive' }}
        </span>
      </Motion>
    </div>
    <div v-else class="sd-empty-state">
      <Workflow :size="34" />
      <p>{{ loading ? 'Loading…' : 'No automation rules yet.' }}</p>
      <button v-if="!loading" class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Create a rule</button>
    </div>

    <SdRuleModal :open="modalOpen" :rule="editing" @close="modalOpen = false" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Plus, Workflow, Info, ArrowRight } from 'lucide-vue-next'
import SdRuleModal from '../modals/SdRuleModal.vue'
import { listAutomationRules } from '@/composables/useSupportDesk'

const props = defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  createSignal: { type: Number, default: 0 },
})
const emit = defineEmits(['go', 'changed'])

const rules = ref([])
const loading = ref(true)
const modalOpen = ref(false)
const editing = ref(null)

const countOf = (arr) => (Array.isArray(arr) ? arr.length : 0)

const reload = async () => {
  loading.value = true
  try { rules.value = await listAutomationRules() }
  catch { rules.value = [] }
  finally { loading.value = false }
}
const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (r) => { editing.value = r; modalOpen.value = true }
const onSaved = () => { modalOpen.value = false; reload(); emit('changed') }

watch(() => props.createSignal, () => { if (props.createSignal) openCreate() })
onMounted(reload)
</script>

<style scoped>
.sd-automation { display: flex; flex-direction: column; gap: 16px; }
.sd-info-banner { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 12px; background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); color: var(--sd-text-secondary); font-size: 12.5px; }
.sd-info-banner svg { color: var(--sd-amber); flex-shrink: 0; }
.sd-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.sd-toolbar-spacer { flex: 1; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: var(--sd-grad-hero); color: #1a1206; white-space: nowrap; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }

.sd-rule-list { display: flex; flex-direction: column; gap: 9px; }
.sd-rule-row { display: flex; align-items: center; gap: 14px; padding: 13px 16px; text-align: left; cursor: pointer; transition: border-color 0.2s var(--sd-spring); }
.sd-rule-row:hover { border-color: var(--sd-amber-border); }
.sd-rule-order { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; font-size: 13px; font-weight: 800; color: var(--sd-amber); background: var(--sd-amber-soft); flex-shrink: 0; }
.sd-rule-main { flex: 1; min-width: 0; }
.sd-rule-name { font-size: 14.5px; font-weight: 600; color: var(--sd-text); margin: 0 0 3px; }
.sd-rule-counts { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--sd-text-muted); margin: 0; }
.sd-rule-arrow { color: var(--sd-text-dim); }
.sd-rule-state { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; padding: 4px 10px; border-radius: 999px; flex-shrink: 0; }
.sd-rule-state.is-on { color: var(--sd-success); background: var(--sd-success-soft); border: 1px solid color-mix(in srgb, var(--sd-success) 30%, transparent); }
.sd-rule-state.is-off { color: var(--sd-steel); background: var(--sd-steel-soft); border: 1px solid color-mix(in srgb, var(--sd-steel) 30%, transparent); }
.sd-rule-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 56px 20px; color: var(--sd-text-dim); text-align: center; }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }

@media (prefers-reduced-motion: reduce) {
  .sd-rule-row { transition: none !important; }
}
</style>
