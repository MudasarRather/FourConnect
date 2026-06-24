<template>
  <Teleport to="body">
    <transition name="lp">
      <div v-if="open" class="lp-scrim" @click.self="$emit('cancel')">
        <Motion class="lp-card" as="div" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 26, scale: 0.95 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="lp-aura" aria-hidden="true" />
          <header class="lp-head">
            <span class="lp-ic"><CalendarX :size="19" /></span>
            <div>
              <span class="lp-eye leave-mono">{{ stage }} · CLOSE-OUT</span>
              <h3 class="lp-title">Close as lapsed</h3>
            </div>
          </header>

          <p class="lp-sub" v-if="leave">
            <b>{{ leave.reference_no }}</b> · {{ leave.employee_name }} —
            this leave’s dates (<span class="leave-mono">{{ range }}</span>) have already
            passed and it was never approved. It can no longer be granted; closing it
            records why it wasn’t actioned in time.
          </p>

          <label class="lp-label leave-mono">
            Remark <i>required</i>
            <span class="lp-count" :class="{ ok: reason.trim().length >= 4 }">{{ reason.length }}/600</span>
          </label>
          <div class="lp-textwrap" :class="{ filled: reason.trim().length >= 4 }">
            <textarea v-model.trim="reason" rows="3" maxlength="600"
              class="lp-textarea" placeholder="Why wasn't this approved in time? (e.g. employee already back, request stale, covered as LWP…)" />
          </div>

          <div class="lp-presets">
            <button v-for="p in PRESETS" :key="p" type="button" class="lp-preset" @click="reason = p">{{ p }}</button>
          </div>

          <footer class="lp-foot">
            <button class="leave-btn leave-btn-sm" @click="$emit('cancel')">Keep open</button>
            <Motion as="button" type="button" class="lp-confirm" :class="{ ready: canConfirm }"
              :whileHover="canConfirm ? { y: -2, scale: 1.015 } : {}" :whileTap="canConfirm ? { scale: 0.97 } : {}"
              :disabled="!canConfirm || busy" @click="confirm">
              <component :is="busy ? Loader2 : CalendarX" :size="14" :class="{ 'lp-spin': busy }" />
              {{ busy ? 'Closing…' : 'Close as lapsed' }}
            </Motion>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { CalendarX, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  leave: { type: Object, default: null },
  stage: { type: String, default: 'HR' },     // 'HR' | 'MANAGER'
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['cancel', 'confirm'])

const reason = ref('')
const PRESETS = [
  'Employee already resumed work — request stale.',
  'Not approved in time; dates have elapsed.',
  'Covered as loss-of-pay / handled offline.',
]
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
const range = computed(() => {
  const l = props.leave
  if (!l) return ''
  return l.from_date === l.to_date ? fmtDate(l.from_date) : `${fmtDate(l.from_date)} → ${fmtDate(l.to_date)}`
})
const canConfirm = computed(() => reason.value.trim().length >= 4)
const confirm = () => { if (canConfirm.value && !props.busy) emit('confirm', reason.value.trim()) }
watch(() => props.open, (v) => { if (v) reason.value = '' })
</script>

<style scoped>
@import '@/styles/leave-theme.css';
.lp-scrim {
  position: fixed; inset: 0; z-index: 1100; display: grid; place-items: center; padding: 20px;
  background: radial-gradient(60% 80% at 50% 30%, rgba(234, 88, 12, 0.18), transparent 60%), rgba(6, 5, 8, 0.62);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.lp-card {
  position: relative; overflow: hidden; width: min(460px, 96vw); padding: 22px 22px 18px; border-radius: 20px;
  background: linear-gradient(180deg, rgba(22, 15, 9, 0.98), rgba(14, 9, 5, 0.98));
  border: 1px solid var(--leave-border-strong); box-shadow: 0 40px 90px -40px rgba(0,0,0,0.9);
}
[data-theme="light"] .lp-card { background: linear-gradient(180deg, rgba(255, 251, 243, 0.99), rgba(255, 245, 230, 0.99)); }
.lp-aura { position: absolute; inset: -50% 30% 50% -10%; pointer-events: none; background: radial-gradient(60% 80% at 30% 0%, rgba(180, 83, 9, 0.22), transparent 70%); }
.lp-head { position: relative; display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.lp-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; color: #fde68a; background: linear-gradient(135deg, rgba(180, 83, 9, 0.4), rgba(146, 64, 14, 0.3)); border: 1px solid rgba(217, 119, 6, 0.5); }
[data-theme="light"] .lp-ic { color: #92400e; }
.lp-eye { font-size: 9px; font-weight: 800; letter-spacing: 0.18em; color: var(--leave-text-muted); }
.lp-title { margin: 3px 0 0; font-size: 18px; font-weight: 900; color: var(--leave-text); }
.lp-sub { position: relative; margin: 0 0 14px; font-size: 12.5px; line-height: 1.55; color: var(--leave-text-secondary); }
.lp-sub b { color: var(--leave-text); font-weight: 800; }
.lp-label { display: flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--leave-text-secondary); margin-bottom: 7px; }
.lp-label i { font-style: normal; text-transform: none; letter-spacing: 0; color: var(--w-ember-400); font-weight: 700; }
.lp-count { margin-left: auto; color: var(--leave-text-muted); }
.lp-count.ok { color: var(--leave-approved); }
.lp-textwrap { position: relative; border-radius: 12px; border: 1px solid var(--leave-border-strong); background: rgba(28, 18, 10, 0.5); overflow: hidden; transition: border-color .2s; }
[data-theme="light"] .lp-textwrap { background: rgba(255, 250, 240, 0.8); }
.lp-textwrap:focus-within { border-color: var(--leave-brand); }
.lp-textwrap.filled { border-color: color-mix(in srgb, var(--leave-approved) 50%, transparent); }
.lp-textarea { display: block; width: 100%; resize: vertical; min-height: 70px; padding: 11px 12px; border: 0; outline: 0; background: transparent; font: inherit; font-size: 13px; line-height: 1.55; color: var(--leave-text); }
.lp-textarea::placeholder { color: var(--leave-text-placeholder); }
.lp-presets { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.lp-preset { font: inherit; font-size: 10.5px; font-weight: 600; padding: 5px 10px; border-radius: 8px; background: rgba(28, 18, 10, 0.5); border: 1px solid var(--leave-border); color: var(--leave-text-muted); cursor: pointer; transition: all .2s; }
[data-theme="light"] .lp-preset { background: rgba(255, 250, 240, 0.7); }
.lp-preset:hover { border-color: var(--leave-brand); color: var(--leave-text); }
.lp-foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
.lp-confirm { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 18px; border-radius: 11px; font: inherit; font-size: 12.5px; font-weight: 800; color: var(--leave-text-muted); background: rgba(28, 18, 10, 0.6); border: 1px solid var(--leave-border-strong); cursor: not-allowed; transition: all .3s; }
.lp-confirm.ready { cursor: pointer; color: #fff3ec; background: linear-gradient(135deg, #d97706, #b45309); border-color: rgba(217, 119, 6, 0.6); box-shadow: 0 12px 30px -12px rgba(180, 83, 9, 0.6); }
.lp-spin { animation: lp-rot 0.8s linear infinite; }
@keyframes lp-rot { to { transform: rotate(360deg); } }
.lp-enter-active, .lp-leave-active { transition: opacity .3s; }
.lp-enter-from, .lp-leave-to { opacity: 0; }
</style>
