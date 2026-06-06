<template>
  <Teleport to="body">
    <transition name="paym-fade">
      <div v-if="open" class="paym-overlay" @mousedown.self="$emit('close')">
        <Motion class="paym-modal" :class="action === 'lock' ? 'confirm' : 'release'" as="div"
          :initial="{ opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, ease: [0.16,1,0.3,1] }">
          <span class="paym-foil" />
          <button class="paym-x" @click="$emit('close')"><X :size="18" /></button>

          <header class="paym-hero center">
            <div class="paym-coin"><span class="paym-coin-ring" /><span class="paym-coin-halo" /><AlertTriangle :size="22" /></div>
            <div class="paym-hero-txt">
              <p class="paym-eyebrow">Pay run · {{ batch?.batch_no }}</p>
              <h2 class="paym-title">{{ titleText }}</h2>
              <p class="paym-sub">{{ blurb }}</p>
            </div>
          </header>

          <div class="paym-body">
            <div class="paym-stats">
              <div class="paym-stat"><span>Employees</span><b>{{ batch?.total_employees }}</b></div>
              <div class="paym-stat"><span>Net payable</span><b><PayMoneyValue tone="net" :value="batch?.total_net" :animate="false" /></b></div>
            </div>

            <label v-if="action === 'release'" class="paym-field" :style="{'--i': 0}">
              <span>Pay date (optional)</span>
              <HrDatePicker v-model="payDate" />
            </label>

            <label class="paym-field" :style="{'--i': 1}">
              <span>Type <b>{{ batch?.batch_no }}</b> to confirm</span>
              <input v-model="confirmText" :placeholder="batch?.batch_no" class="mono" />
            </label>

            <div v-if="action === 'lock'" class="paym-note danger">
              <AlertTriangle :size="15" />
              <span>Locking freezes attendance for this period and marks the run final — this cannot be undone.</span>
            </div>
          </div>

          <footer class="paym-foot center">
            <button class="paym-btn ghost" @click="$emit('close')">Cancel</button>
            <button class="paym-btn danger" :disabled="confirmText !== batch?.batch_no" @click="confirm">
              {{ titleText }}</button>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { AlertTriangle } from 'lucide-vue-next'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { X } from 'lucide-vue-next'

const props = defineProps({ open: Boolean, action: { type: String, default: 'release' }, batch: { type: Object, default: null } })
const emit = defineEmits(['close', 'confirm'])
const confirmText = ref('')
const payDate = ref('')
watch(() => props.open, (o) => { if (o) { confirmText.value = ''; payDate.value = '' } })

const titleText = computed(() => props.action === 'lock' ? 'Lock run' : 'Release pay run')
const blurb = computed(() => props.action === 'lock'
  ? 'Locking freezes attendance for this period and marks the run final. This cannot be undone.'
  : 'Releasing posts net pay to all payslips and marks approved leave encashments as paid.')
const confirm = () => emit('confirm', { pay_date: payDate.value || undefined })
</script>

<style scoped>
/* Modal-specific tweaks only — overlay/shell/field/button styles come from .paym-* globally */
.paym-field span b { font-family: var(--pay-mono); color: var(--pay-treasury); font-weight: 700; }
.paym-field input.mono { font-family: var(--pay-mono); letter-spacing: 0.04em; }
</style>
