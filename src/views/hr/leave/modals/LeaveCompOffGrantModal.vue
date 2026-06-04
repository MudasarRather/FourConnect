<template>
  <Teleport to="body">
    <transition name="cog">
      <div v-if="open" class="cog-scrim" @click.self="$emit('cancel')">
        <Motion class="cog-card" as="div" role="dialog"
          :initial="{ opacity: 0, y: 18, scale: 0.96 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }"
        >
          <header class="cog-head">
            <div class="cog-icon"><Coffee :size="20" /></div>
            <div>
              <h3 class="cog-title">Grant compensatory off</h3>
              <p class="cog-sub">Credit a comp-off day to an employee who worked through a holiday or week-off without an auto-detect record.</p>
            </div>
            <button class="cog-close" @click="$emit('cancel')"><X :size="14" /></button>
          </header>

          <div class="cog-body">
            <label class="cog-field">
              <span>Employee</span>
              <select v-model="form.employee_id">
                <option value="" disabled>— select an employee —</option>
                <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.full_name || e.employee_id }} · {{ e.employee_id }}</option>
              </select>
            </label>
            <div class="cog-row">
              <div class="cog-field">
                <span>Date worked</span>
                <HrDatePicker
                  :model-value="form.earned_on"
                  placeholder="dd / mm / yyyy"
                  :clearable="false"
                  :max="today"
                  @update:model-value="(v) => form.earned_on = v"
                />
              </div>
              <label class="cog-field">
                <span>Days</span>
                <input type="number" min="0.5" max="2" step="0.5" v-model.number="form.days" />
              </label>
              <div class="cog-field">
                <span>Expires on (optional)</span>
                <HrDatePicker
                  :model-value="form.expires_on"
                  placeholder="dd / mm / yyyy"
                  :min="form.earned_on"
                  @update:model-value="(v) => form.expires_on = v"
                />
              </div>
            </div>
            <label class="cog-field">
              <span>Reason</span>
              <textarea v-model.trim="form.reason" rows="3" maxlength="400" placeholder="e.g. Worked on Diwali to support a critical deploy" />
            </label>
            <p class="cog-foot-hint">
              Default expiry is <b>{{ COMP_OFF_EXPIRY_DEFAULT_DAYS }} days</b> from the worked date. Override above to extend or shorten.
            </p>
          </div>

          <footer class="cog-foot">
            <button class="leave-btn leave-btn-sm" @click="$emit('cancel')">Cancel</button>
            <button class="leave-btn leave-btn-sm leave-btn-primary"
              :disabled="!canSave || saving"
              @click="save"
            >
              <Coffee :size="13" /> Grant comp-off
            </button>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Coffee, X } from 'lucide-vue-next'
import axios from 'axios'
import { API } from '@/utils/api'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { grantCompOff, COMP_OFF_EXPIRY_DEFAULT_DAYS } from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['cancel', 'saved'])
const toast = useToast()

const today = new Date().toISOString().slice(0, 10)
const blank = () => ({ employee_id: '', earned_on: today, days: 1, expires_on: '', reason: '' })
const form = ref(blank())
const saving = ref(false)
const employees = ref([])

const canSave = computed(() =>
  !!form.value.employee_id && form.value.earned_on && Number(form.value.days) > 0
  && form.value.reason.trim().length >= 4
)

watch(() => props.open, async (v) => {
  if (!v) return
  form.value = blank()
  if (employees.value.length) return
  try {
    const auth = { Authorization: `Bearer ${localStorage.getItem('admin_token') || localStorage.getItem('user_token')}` }
    // GET /hr/employees/ caps limit at 100 (sending 200 → 422) and has no
    // is_active param; soft-deleted rows are already excluded by default.
    const { data } = await axios.get(`${API}/hr/employees/`, { headers: auth, params: { limit: 100 } })
    employees.value = data.items || []
  } catch { employees.value = [] }
})

const save = async () => {
  saving.value = true
  try {
    const body = {
      employee_id: form.value.employee_id,
      earned_on: form.value.earned_on,
      days: form.value.days,
      reason: form.value.reason,
      expires_on: form.value.expires_on || undefined,
    }
    await grantCompOff(body)
    toast.success('Comp-off granted')
    emit('saved')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Grant failed')
  } finally { saving.value = false }
}

onMounted(() => {})
</script>

<style scoped>
.cog-scrim {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(60% 60% at 50% 40%, rgba(251, 146, 60, 0.25), rgba(20, 12, 8, 0.55));
  backdrop-filter: blur(10px); padding: 20px;
}
.cog-card {
  width: 540px; max-width: calc(100vw - 32px); max-height: calc(100vh - 40px);
  border-radius: 20px;
  background:
    radial-gradient(120% 70% at 100% 0%, rgba(251, 146, 60, 0.14), transparent 55%),
    linear-gradient(180deg, rgba(22, 16, 14, 0.96), rgba(16, 12, 10, 0.96));
  border: 1px solid rgba(251, 146, 60, 0.30);
  overflow: hidden auto;
  box-shadow: 0 50px 110px -40px rgba(0,0,0,0.85);
}
[data-theme="light"] .cog-card {
  background:
    radial-gradient(120% 70% at 100% 0%, rgba(251, 146, 60, 0.16), transparent 55%),
    rgba(255, 250, 240, 0.96);
}
.cog-head { position: relative; display: flex; gap: 12px; align-items: center; padding: 20px 20px 14px; }
.cog-icon {
  display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.30), rgba(180, 83, 9, 0.20));
  border: 1px solid rgba(251, 146, 60, 0.42); color: #fed7aa; flex-shrink: 0;
}
[data-theme="light"] .cog-icon { color: #9a3412; }
.cog-title { margin: 0; font-size: 17px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.012em; }
.cog-sub { margin: 4px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--hr-text-muted); max-width: 380px; }
.cog-close {
  position: absolute; top: 12px; right: 12px;
  display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px;
  border: 1px solid var(--hr-border); background: transparent; color: var(--hr-text-muted); cursor: pointer;
  transition: transform .25s, color .25s, border-color .25s;
}
.cog-close:hover { transform: rotate(90deg); color: var(--leave-compoff); border-color: var(--leave-compoff); }

.cog-body { padding: 4px 20px 14px; display: flex; flex-direction: column; gap: 10px; }
.cog-row { display: grid; grid-template-columns: 1fr 80px 1fr; gap: 10px; }
@media (max-width: 540px) { .cog-row { grid-template-columns: 1fr; } }
.cog-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.cog-field > span { font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--hr-text-muted); }
.cog-field > input, .cog-field > select, .cog-field > textarea {
  padding: 9px 11px; border-radius: 9px;
  background: rgba(251, 146, 60, 0.06);
  border: 1px solid rgba(251, 146, 60, 0.24);
  color: var(--hr-text); font: inherit; font-size: 13px;
  outline: none; transition: border-color .22s, box-shadow .22s;
}
[data-theme="light"] .cog-field > input,
[data-theme="light"] .cog-field > select,
[data-theme="light"] .cog-field > textarea { background: rgba(255, 250, 240, 0.86); border-color: rgba(180, 83, 9, 0.22); }
.cog-field > input:focus, .cog-field > select:focus, .cog-field > textarea:focus {
  border-color: var(--leave-compoff); box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.14);
}
.cog-field > textarea { resize: vertical; min-height: 72px; }
.cog-foot-hint { margin: 4px 2px 0; font-size: 11px; color: var(--hr-text-muted); }
.cog-foot-hint b { color: var(--leave-compoff); }
.cog-foot {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 12px 20px 18px;
  border-top: 1px solid rgba(251, 146, 60, 0.14);
}
.cog-enter-active, .cog-leave-active { transition: opacity .25s; }
.cog-enter-from, .cog-leave-to { opacity: 0; }
</style>
