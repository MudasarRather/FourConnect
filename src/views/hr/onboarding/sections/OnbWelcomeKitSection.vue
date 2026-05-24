<template>
  <section class="onb-kit">
    <Motion as="header" class="onb-section-banner kt-banner"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="onb-section-banner-glow" />
      <div class="onb-section-banner-text">
        <span class="onb-eyebrow"><span class="onb-eyebrow-dot" /> Pack · dispatch · deliver</span>
        <h2 class="onb-banner-title">
          <span class="id-title-word">Welcome</span>
          <span class="banner-divider">·</span>
          <span class="id-title-word" style="animation-delay: 80ms">Kit</span>
        </h2>
        <p class="onb-banner-sub">Pick a joiner, pack their kit, hand it to courier, and confirm delivery — every step animated as it lands.</p>
      </div>
      <div class="onb-banner-aside" v-if="kit">
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ packedCount }}</span>
          <span class="onb-banner-stat-label">Packed</span>
        </div>
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ kit.items?.length || 0 }}</span>
          <span class="onb-banner-stat-label">Total items</span>
        </div>
      </div>
    </Motion>

    <OnbProcessPicker v-model="processId" @change="reload" />

    <div v-if="!processId" class="onb-empty-card">
      <div class="onb-empty-mark"><Gift :size="22" /></div>
      <p>Pick a joiner to view or create their welcome kit.</p>
    </div>

    <div v-else class="kt-stage">
      <div v-if="!kit" class="onb-empty-card">
        <div class="onb-empty-mark"><Gift :size="22" /></div>
        <p>No kit created yet.</p>
        <button class="onb-btn-primary" @click="create"><Plus :size="13" />Create from default</button>
      </div>

      <template v-else>
        <!-- Progress strip -->
        <Motion as="div" class="kt-progress"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }"
        >
          <div v-for="(step, i) in steps" :key="step.key" class="kt-step"
               :class="{ 'is-active': currentStepIdx >= i, 'is-current': currentStepIdx === i }">
            <span class="kt-step-mark">
              <component :is="step.icon" :size="13" v-if="currentStepIdx < i" />
              <CheckCircle2 :size="13" v-else />
            </span>
            <span class="kt-step-label">{{ step.label }}</span>
            <span v-if="i < steps.length - 1" class="kt-step-line"></span>
          </div>
        </Motion>

        <div class="kt-grid">
          <!-- Status + tracking card -->
          <Motion as="article" class="kt-card"
            :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }"
          >
            <header class="kt-card-head">
              <div>
                <h3 class="kt-card-title">Dispatch</h3>
                <p class="kt-card-sub">Status & tracking</p>
              </div>
              <span class="kt-pill" :data-status="kit.status">{{ kit.status }}</span>
            </header>
            <div class="kt-card-body">
              <OnbField :model-value="kit.tracking_number || ''" @update:model-value="v => kit.tracking_number = v"
                label="Tracking number" placeholder="DHL12345-IND" full />
              <ul class="kt-times">
                <li><span>Packed</span><span class="onb-mono">{{ formatDateTime(kit.packed_at) }}</span></li>
                <li><span>Dispatched</span><span class="onb-mono">{{ formatDateTime(kit.dispatched_at) }}</span></li>
                <li><span>Delivered</span><span class="onb-mono">{{ formatDateTime(kit.delivered_at) }}</span></li>
              </ul>
              <div class="kt-actions">
                <button v-if="kit.status === 'PENDING'"    class="onb-btn-ghost"   @click="setStatus('PACKED')"><Package :size="13" />Mark packed</button>
                <button v-if="kit.status === 'PACKED'"     class="onb-btn-ghost"   @click="setStatus('DISPATCHED')"><Truck :size="13" />Dispatch</button>
                <button v-if="kit.status === 'DISPATCHED'" class="onb-btn-primary" @click="setStatus('DELIVERED')"><CheckCircle2 :size="13" />Mark delivered</button>
              </div>
            </div>
          </Motion>

          <!-- Items checklist -->
          <Motion as="article" class="kt-card"
            :initial="{ opacity: 0, x: 8 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.45, delay: 0.06, ease: [0.22, 1, 0.36, 1] }"
          >
            <header class="kt-card-head">
              <div>
                <h3 class="kt-card-title">Items packed</h3>
                <p class="kt-card-sub">{{ packedCount }} / {{ kit.items?.length || 0 }} items ready</p>
              </div>
            </header>
            <ul class="kt-items">
              <Motion v-for="(it, i) in (kit.items || [])" :key="i" as="li" class="kt-item" :class="{ 'is-packed': it.packed }"
                :initial="{ opacity: 0, x: -6 }" :animate="{ opacity: 1, x: 0 }"
                :transition="{ duration: 0.3, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
              >
                <button class="kt-item-check" :class="{ 'is-on': it.packed }" @click="togglePack(i)">
                  <svg v-if="it.packed" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <div class="kt-item-main">
                  <div class="kt-item-name" :class="{ 'is-strike': it.packed }">{{ it.item_name }}</div>
                  <div class="kt-item-meta">Qty {{ it.qty || 1 }}</div>
                </div>
              </Motion>
              <li v-if="!kit.items?.length" class="kt-item-empty">Empty kit.</li>
            </ul>
          </Motion>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Gift, Plus, Package, Truck, CheckCircle2, ClipboardList } from 'lucide-vue-next'
import OnbProcessPicker from '../components/OnbProcessPicker.vue'
import OnbField from '../components/OnbField.vue'
import { fetchProcessDetail } from '../composables/useOnboarding'
import { fetchKitByEmployee, createKit, patchKit, fetchKitTemplates } from '../composables/useOnbMisc'
import { useToast } from 'vue-toastification'

defineEmits(['refresh-stats'])

const toast = useToast()
const processId = ref('')
const employeeId = ref(null)
const kit = ref(null)

const steps = [
  { key: 'PENDING',    label: 'Pending',    icon: ClipboardList },
  { key: 'PACKED',     label: 'Packed',     icon: Package },
  { key: 'DISPATCHED', label: 'Dispatched', icon: Truck },
  { key: 'DELIVERED',  label: 'Delivered',  icon: CheckCircle2 },
]
const currentStepIdx = computed(() => steps.findIndex(s => s.key === kit.value?.status))
const packedCount = computed(() => (kit.value?.items || []).filter(i => i.packed).length)

const reload = async () => {
  if (!processId.value) return
  try {
    const detail = await fetchProcessDetail(processId.value)
    employeeId.value = detail.process.employee_id
    kit.value = await fetchKitByEmployee(employeeId.value)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not load kit') }
}

const create = async () => {
  try {
    const templates = await fetchKitTemplates()
    const tpl = templates[0]
    kit.value = await createKit({ employee_id: employeeId.value, process_id: processId.value, template_id: tpl?.id || null })
    toast.success('Kit created')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Create failed') }
}
const setStatus = async (next) => {
  try { kit.value = await patchKit(kit.value.id, { status: next, tracking_number: kit.value.tracking_number }) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Update failed') }
}
const togglePack = async (i) => {
  const next = [...(kit.value.items || [])]
  next[i] = { ...next[i], packed: !next[i].packed }
  try { kit.value = await patchKit(kit.value.id, { items: next }) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Update failed') }
}
const formatDateTime = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
</script>

<style scoped>
@import '../../../../styles/onboarding-theme.css';

.onb-kit { display: flex; flex-direction: column; gap: 16px; }

.kt-banner .banner-divider {
  display: inline-block;
  margin: 0 6px;
  color: var(--hr-text-dim);
  font-weight: 400;
  -webkit-text-fill-color: var(--hr-text-dim);
}

.kt-stage { display: flex; flex-direction: column; gap: 16px; }

/* Stepper */
.kt-progress {
  position: relative;
  display: flex; align-items: center; padding: 22px 28px;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke);
  border-radius: 22px;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  gap: 0; flex-wrap: wrap;
  overflow: hidden;
  isolation: isolate;
}
.kt-progress::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(60% 100% at 0% 0%, rgba(251, 146, 60, 0.08), transparent 60%);
  pointer-events: none; z-index: -1;
}
.kt-step { position: relative; display: inline-flex; align-items: center; gap: 10px; padding: 4px 0; flex: 1; min-width: 150px; }
.kt-step-mark {
  width: 36px; height: 36px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.04); color: var(--hr-text-muted);
  border: 2px solid rgba(255, 255, 255, 0.10);
  transition: background .35s var(--hr-spring), border-color .35s var(--hr-spring), color .35s var(--hr-spring), transform .35s var(--hr-spring);
}
.kt-step.is-active .kt-step-mark {
  background: var(--hr-gradient-hero);
  color: #1f1408;
  border-color: transparent;
  box-shadow: 0 12px 28px -10px rgba(251, 146, 60, 0.7), inset 0 1px 0 rgba(255,255,255,0.3);
  transform: scale(1.05);
}
.kt-step.is-current .kt-step-mark { animation: onb-ripple 2s ease-out infinite; }
.kt-step-label { font-size: 12px; font-weight: 700; color: var(--hr-text-muted); letter-spacing: 0.2px; }
.kt-step.is-active .kt-step-label { color: var(--hr-text); }
.kt-step.is-current .kt-step-label { color: var(--hr-accent-gold); }
.kt-step-line {
  flex: 1; height: 2px;
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.22), rgba(255,255,255,0.05));
  margin: 0 12px;
  border-radius: 2px;
  position: relative; overflow: hidden;
}

.kt-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 16px; }
@media (max-width: 1000px) { .kt-grid { grid-template-columns: 1fr; } }

.kt-card {
  position: relative;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke);
  border-radius: 22px;
  overflow: hidden;
  isolation: isolate;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  transition: border-color .3s var(--hr-spring), box-shadow .3s var(--hr-spring);
}
.kt-card::before {
  content: ''; position: absolute; inset: 0;
  background:
    linear-gradient(160deg, rgba(255,255,255,0.06), transparent 35%),
    radial-gradient(70% 60% at 100% 0%, rgba(251, 146, 60, 0.10), transparent 70%);
  pointer-events: none; z-index: -1;
}
.kt-card:hover { border-color: rgba(251, 191, 36, 0.28); box-shadow: var(--onb-glass-shadow-hi); }
.kt-card-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); gap: 10px; }
.kt-card-title { margin: 0; font-size: 14.5px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.01em; }
.kt-card-sub { margin: 4px 0 0; font-size: 11.5px; color: var(--hr-text-muted); }
.kt-pill { font-size: 9.5px; font-weight: 800; padding: 4px 10px; border-radius: 999px; letter-spacing: 0.5px;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); border: 1px solid var(--hr-border-warm); }
.kt-pill[data-status="DELIVERED"] { background: rgba(52, 211, 153, 0.18); color: #34d399; border-color: rgba(52, 211, 153, 0.32); }

.kt-card-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 16px; }
.kt-times { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.kt-times li {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11.5px; color: var(--hr-text-secondary);
  padding: 10px 14px;
  background: rgba(14, 11, 9, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}
.onb-mono { font-family: var(--hr-mono); }
.kt-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.kt-items { list-style: none; margin: 0; padding: 4px 8px; max-height: 360px; overflow-y: auto; }
.kt-items::-webkit-scrollbar { width: 6px; }
.kt-items::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.18); border-radius: 4px; }
.kt-item {
  display: flex; align-items: center; gap: 14px;
  padding: 13px 16px; margin: 2px 6px;
  border-radius: 12px;
  transition: background .25s var(--hr-spring), transform .25s var(--hr-spring);
}
.kt-item:hover { background: rgba(255, 255, 255, 0.04); transform: translateX(3px); }
.kt-item-check {
  position: relative;
  width: 26px; height: 26px; border-radius: 8px;
  background: transparent; border: 2px solid rgba(255, 255, 255, 0.14);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; color: #1f1408;
  transition: background .25s var(--hr-spring), border-color .25s var(--hr-spring), transform .15s var(--hr-spring);
}
.kt-item-check:hover { border-color: var(--hr-accent-gold); transform: scale(1.08); }
.kt-item-check.is-on {
  background: linear-gradient(135deg, var(--hr-accent-gold), #fb923c);
  border-color: transparent;
  box-shadow: 0 6px 16px -4px rgba(251, 146, 60, 0.6);
  animation: onb-ripple 0.9s 1 ease-out;
}
.kt-item-main { flex: 1; min-width: 0; }
.kt-item-name { font-size: 13px; font-weight: 600; color: var(--hr-text); transition: color .25s var(--hr-spring); }
.kt-item-name.is-strike { text-decoration: line-through; text-decoration-color: rgba(251, 191, 36, 0.65); text-decoration-thickness: 2px; color: var(--hr-text-muted); }
.kt-item-meta { font-size: 10.5px; color: var(--hr-text-muted); margin-top: 2px; }
.kt-item-empty { padding: 26px; color: var(--hr-text-dim); font-size: 12px; text-align: center; }
</style>
