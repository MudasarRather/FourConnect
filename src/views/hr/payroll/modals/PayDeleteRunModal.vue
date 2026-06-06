<template>
  <Teleport to="body">
    <transition name="paym-fade">
      <div v-if="open" class="paym-overlay del-overlay" @mousedown.self="$emit('close')">
        <Motion class="paym-modal danger" as="div"
          :initial="{ opacity: 0, y: 30, scale: 0.95 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, ease: [0.16,1,0.3,1] }">
          <span class="paym-foil" />
          <button class="paym-x" @click="$emit('close')"><X :size="18" /></button>

          <header class="paym-hero">
            <div class="paym-coin"><span class="paym-coin-ring" /><span class="paym-coin-halo" /><Trash2 :size="22" /></div>
            <div class="paym-hero-txt">
              <p class="paym-eyebrow"><CalendarClock :size="11" /> Pay run · {{ batch?.batch_no }}</p>
              <h2 class="paym-title">Delete this pay run?</h2>
              <p class="paym-sub">The run and its payslips are removed from every list. It's retained in the database for audit — pick a reason and confirm.</p>
            </div>
          </header>

          <div class="paym-stats">
            <div class="paym-stat" :style="{'--i':0}"><span>Period</span><b>{{ periodLabel }}</b></div>
            <div class="paym-stat" :style="{'--i':1}"><span>Employees</span><b>{{ batch?.total_employees ?? 0 }}</b></div>
            <div class="paym-stat" :style="{'--i':2}"><span>Net payable</span><b><PayMoneyValue tone="net" :value="batch?.total_net" :animate="false" /></b></div>
            <div class="paym-stat" :style="{'--i':3}"><span>Status</span><b><PayStatusChip v-if="batch" :status="batch.status" /></b></div>
          </div>

          <div class="paym-body">
            <div class="del-field">
              <span class="paym-label">Why are you deleting this run? <b class="paym-req">*</b></span>
              <div class="del-reasons">
                <Motion v-for="(r, i) in REASONS" :key="r.key" as="button" type="button" class="del-r"
                  :class="{ on: sel === r.key }"
                  :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.32, delay: 0.1 + i*0.04, ease: [0.16,1,0.3,1] }"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="sel = r.key">
                  <span class="del-r-ico"><component :is="r.icon" :size="15" /></span>
                  <span class="del-r-lbl">{{ r.label }}</span>
                  <span class="del-r-check"><Check :size="13" /></span>
                </Motion>
              </div>
            </div>

            <label class="paym-field" :style="{'--i':6}">
              <span>{{ sel === 'OTHER' ? 'Describe the reason' : 'Additional notes' }}
                <b v-if="sel === 'OTHER'" class="paym-req">*</b><em v-else class="del-opt">optional</em></span>
              <textarea v-model="details" rows="2"
                :placeholder="sel === 'OTHER' ? 'Explain why this run is being deleted…' : 'Add context for the audit log…'" />
            </label>

            <div class="paym-note danger">
              <ShieldAlert :size="15" />
              <ul class="del-list">
                <li>The run is <b>soft-deleted</b> — hidden from Processing &amp; Monthly, but kept in the DB for audit.</li>
                <li>All <b>{{ batch?.total_employees ?? 0 }} payslip(s)</b> under it are hidden too.</li>
                <li><b>Released or locked</b> runs can't be deleted — cancel or return them instead.</li>
                <li>The action and your reason are written to the <b>payroll audit log</b>.</li>
              </ul>
            </div>

            <label class="paym-field" :style="{'--i':7}">
              <span>Type <b class="cf">{{ batch?.batch_no }}</b> to confirm</span>
              <input v-model="confirmText" :placeholder="batch?.batch_no" class="mono" autocomplete="off" />
            </label>
          </div>

          <footer class="paym-foot">
            <button class="paym-btn ghost" @click="$emit('close')">Cancel</button>
            <button class="paym-btn danger" :disabled="!valid || busy" @click="submit">
              <Trash2 :size="14" style="margin-right:6px;vertical-align:-2px" />{{ busy ? 'Deleting…' : 'Delete run' }}
            </button>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  X, Trash2, Check, ShieldAlert, CalendarClock,
  AlertTriangle, Copy, CalendarX, RefreshCw, FlaskConical, MoreHorizontal,
} from 'lucide-vue-next'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import PayStatusChip from '../components/PayStatusChip.vue'
import { monthLabel } from '@/composables/usePayroll'

const props = defineProps({
  open: Boolean,
  batch: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const REASONS = [
  { key: 'ERROR',      label: 'Created in error',     icon: AlertTriangle },
  { key: 'DUPLICATE',  label: 'Duplicate run',        icon: Copy },
  { key: 'WRONG',      label: 'Wrong period / scope', icon: CalendarX },
  { key: 'SUPERSEDED', label: 'Superseded by re-run', icon: RefreshCw },
  { key: 'TEST',       label: 'Test / trial run',     icon: FlaskConical },
  { key: 'OTHER',      label: 'Other',                icon: MoreHorizontal },
]
const LABEL = Object.fromEntries(REASONS.map(r => [r.key, r.label]))

const sel = ref('')
const details = ref('')
const confirmText = ref('')
watch(() => props.open, (o) => { if (o) { sel.value = ''; details.value = ''; confirmText.value = '' } })

const periodLabel = computed(() => props.batch ? `${monthLabel(props.batch.period_month)} ${props.batch.period_year}` : '—')
const reasonOk = computed(() => !!sel.value && (sel.value !== 'OTHER' || details.value.trim().length >= 3))
const confirmOk = computed(() => !!props.batch && confirmText.value.trim() === props.batch.batch_no)
const valid = computed(() => reasonOk.value && confirmOk.value)

const submit = () => {
  if (!valid.value) return
  const note = details.value.trim()
  const reason = sel.value === 'OTHER' ? note : LABEL[sel.value]
  emit('confirm', { reason, note: sel.value === 'OTHER' ? undefined : (note || undefined) })
}
</script>

<style scoped>
.del-overlay { z-index: 4200; }
.paym-stats { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 480px) { .paym-stats { grid-template-columns: 1fr 1fr; } }
.paym-field span .cf { font-family: var(--pay-mono); color: var(--pay-deduction); font-weight: 800; }
.paym-field input.mono { font-family: var(--pay-mono); letter-spacing: 0.04em; }
.del-opt { font-style: normal; font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--pay-text-muted); margin-left: 4px; }

.del-field { display: flex; flex-direction: column; gap: 8px;
  animation: pay-rise 0.5s var(--pay-ease) both; animation-delay: 0.1s; }
.del-reasons { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
@media (max-width: 480px) { .del-reasons { grid-template-columns: 1fr; } }
.del-r { position: relative; display: flex; align-items: center; gap: 10px; text-align: left;
  padding: 11px 13px; border-radius: 12px; cursor: pointer; overflow: hidden;
  border: 1px solid var(--pay-border-soft); background: var(--hr-input-bg); color: var(--pay-text-2);
  transition: border-color 0.18s var(--pay-ease), background 0.18s var(--pay-ease), color 0.18s var(--pay-ease); }
.del-r:hover { border-color: var(--pay-border); color: var(--pay-text); }
.del-r-ico { flex-shrink: 0; width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center;
  background: var(--pay-deduction-soft); color: var(--pay-deduction); transition: background 0.18s, color 0.18s; }
.del-r-lbl { flex: 1; font-size: 12.5px; font-weight: 600; line-height: 1.25; }
.del-r-check { flex-shrink: 0; opacity: 0; transform: scale(0.4); color: var(--pay-deduction);
  transition: opacity 0.22s var(--pay-spring), transform 0.22s var(--pay-spring); }
.del-r.on { border-color: var(--pay-deduction); color: var(--pay-text);
  background: var(--pay-deduction-soft); box-shadow: 0 8px 22px -14px rgba(194,65,12,0.7); }
.del-r.on .del-r-ico { background: linear-gradient(135deg, #f59e0b, #ea580c, #c2410c); color: #fff; }
.del-r.on .del-r-check { opacity: 1; transform: scale(1); }

.del-list { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 5px; }
.del-list li { line-height: 1.42; }

@media (prefers-reduced-motion: reduce) { .del-field, .del-r-check { animation: none !important; transition: none !important; } }
</style>
