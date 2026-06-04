<template>
  <Teleport to="body">
    <transition name="rm">
      <div v-if="open" class="rm-scrim" @click.self="$emit('cancel')">
        <span class="rm-orbit rm-orbit-1" aria-hidden="true" />
        <span class="rm-orbit rm-orbit-2" aria-hidden="true" />
        <span class="rm-orbit rm-orbit-3" aria-hidden="true" />

        <Motion class="rm-card" as="div" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 24, scale: 0.94, rotateX: -8 }"
          :animate="{ opacity: 1, y: 0, scale: 1, rotateX: 0 }"
          :exit="{ opacity: 0, y: 20, scale: 0.95 }"
          :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }"
        >
          <header class="rm-ribbon">
            <span class="rb-grain" aria-hidden="true" />
            <span class="rb-aura" aria-hidden="true" />

            <Motion class="rb-glyph" as="div"
              :initial="{ scale: 0, rotate: -45 }" :animate="{ scale: 1, rotate: 0 }"
              :transition="{ duration: 0.55, delay: 0.18, ease: [0.34, 1.56, 0.64, 1] }"
            >
              <span class="rb-glyph-aura" />
              <Banknote :size="26" />
            </Motion>

            <div class="rb-meta">
              <Motion as="span" class="rb-eye leave-mono"
                :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.24 }"
              >
                STAGE — {{ stage || 'HR' }} · ENCASHMENT
              </Motion>
              <Motion as="h3" class="rb-title"
                :initial="{ opacity: 0, y: -4 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.42, delay: 0.30 }"
              >
                Reject encashment request
              </Motion>
              <Motion as="p" class="rb-sub" v-if="request"
                :initial="{ opacity: 0, y: -3 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.42, delay: 0.36 }"
              >
                <span class="rb-ref leave-mono">{{ request.reference_no }}</span>
                <span class="rb-sep">·</span>
                <span class="rb-emp">{{ request.employee_name || request.employee_code || '—' }}</span>
                <span class="rb-sep">·</span>
                <span class="rb-amt leave-mono">₹{{ inr(request.amount) }}</span>
                <span v-if="request.days_requested != null" class="rb-sep">·</span>
                <span v-if="request.days_requested != null" class="rb-days leave-mono">{{ request.days_requested }}d</span>
              </Motion>
            </div>

            <button class="rm-close" @click="$emit('cancel')" aria-label="Close"><X :size="14" /></button>
          </header>

          <div class="rm-body">
            <Motion class="rm-section" as="section"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.42 }"
            >
              <header class="rm-sec-head">
                <span class="rm-sec-num leave-mono">01</span>
                <span class="rm-sec-rule" />
                <h4 class="rm-sec-title">Pick a reason</h4>
                <span class="rm-sec-meta leave-mono">{{ presetReasons.length }} presets · payroll</span>
              </header>

              <div class="rm-chips">
                <Motion v-for="(reason, i) in presetReasons" :key="reason" as="button" type="button"
                  class="rm-chip" :class="{ 'is-active': selected.has(reason) }"
                  :initial="{ opacity: 0, scale: 0.85, y: 6 }" :animate="{ opacity: 1, scale: 1, y: 0 }"
                  :transition="{ duration: 0.36, delay: 0.5 + i * 0.04, ease: [0.34, 1.56, 0.64, 1] }"
                  :whileHover="{ y: -2, scale: 1.03 }" :whileTap="{ scale: 0.95 }"
                  @click="toggleReason(reason)"
                >
                  <span class="chip-dot" :class="{ on: selected.has(reason) }" />
                  <span class="chip-label">{{ reason }}</span>
                  <Check v-if="selected.has(reason)" :size="11" class="chip-check" />
                </Motion>
              </div>
            </Motion>

            <Motion class="rm-section" as="section"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.62 }"
            >
              <header class="rm-sec-head">
                <span class="rm-sec-num leave-mono">02</span>
                <span class="rm-sec-rule" />
                <h4 class="rm-sec-title">Custom note</h4>
                <span class="rm-sec-meta leave-mono" :data-warn="!finalReason.trim()">{{ finalReason.length }}/1000</span>
              </header>

              <div class="rm-textarea-wrap" :class="{ 'is-focused': focused, 'is-empty': !finalReason.trim() }">
                <textarea ref="ta" v-model.trim="noteOnly" rows="3" class="rm-textarea"
                  :placeholder="placeholder" maxlength="1000"
                  @focus="focused = true" @blur="focused = false"
                />
                <span class="rm-ta-glow" aria-hidden="true" />
                <span class="rm-ta-corner tl" aria-hidden="true" /><span class="rm-ta-corner tr" aria-hidden="true" />
                <span class="rm-ta-corner bl" aria-hidden="true" /><span class="rm-ta-corner br" aria-hidden="true" />
              </div>

              <div v-if="selected.size > 0" class="rm-preview">
                <span class="rm-preview-eye leave-mono">PREVIEW · WHAT THE EMPLOYEE WILL SEE</span>
                <p class="rm-preview-text">{{ finalReason || '—' }}</p>
              </div>
            </Motion>
          </div>

          <Motion class="rm-foot" as="footer"
            :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.78 }"
          >
            <button class="leave-btn leave-btn-sm rm-cancel" @click="$emit('cancel')"><ArrowLeft :size="13" /> Cancel</button>
            <Motion as="button" type="button" class="leave-btn leave-btn-sm leave-btn-danger rm-confirm"
              :disabled="!finalReason.trim()"
              :whileHover="finalReason.trim() ? { y: -2, scale: 1.02 } : {}"
              :whileTap="finalReason.trim() ? { scale: 0.97 } : {}"
              @click="onConfirm"
            >
              <XCircle :size="13" />
              <span class="rm-confirm-label">Reject &amp; notify employee</span>
              <span class="rm-confirm-glow" aria-hidden="true" />
            </Motion>
          </Motion>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { XCircle, X, Check, ArrowLeft, Banknote } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  request: { type: Object, default: null },
  stage: { type: String, default: 'HR' },
})
const emit = defineEmits(['cancel', 'confirm'])

// Encashment is a payroll conversion — reasons are finance/policy oriented,
// NOT leave-scheduling ("coverage not arranged" etc. don't apply here).
const presetReasons = [
  'Insufficient leave balance',
  'Annual encashment cap reached',
  'Outside the encashment window',
  'Policy does not permit this now',
  'Pending dues / clawback',
  'Duplicate — already processed',
  'Payroll cut-off passed',
  'Documentation / approval pending',
]

const inr = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })

const selected = ref(new Set())
const noteOnly = ref('')
const focused = ref(false)
const ta = ref(null)

const placeholder = computed(() =>
  `Add context for the employee${selected.value.size ? ' (optional)' : ' (required if no preset chosen)'}.`)

const toggleReason = (r) => {
  if (selected.value.has(r)) selected.value.delete(r)
  else selected.value.add(r)
  selected.value = new Set(selected.value)
}

const finalReason = computed(() => {
  const chips = Array.from(selected.value)
  const parts = []
  if (chips.length) parts.push(chips.join(' · '))
  if (noteOnly.value.trim()) parts.push(noteOnly.value.trim())
  return parts.join('\n— ')
})

const onConfirm = () => {
  const out = finalReason.value.trim()
  if (!out) return
  emit('confirm', out)
}

watch(() => props.open, async (v) => {
  if (v) {
    selected.value = new Set()
    noteOnly.value = ''
    focused.value = false
    await nextTick()
  }
})
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.rm-scrim {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center; padding: 20px;
  background:
    radial-gradient(60% 60% at 50% 40%, rgba(234, 88, 12, 0.30), transparent 60%),
    radial-gradient(40% 50% at 25% 70%, rgba(180, 83, 9, 0.22), transparent 60%),
    rgba(8, 4, 2, 0.72);
  backdrop-filter: blur(12px) saturate(140%); perspective: 1200px;
}
[data-theme="light"] .rm-scrim {
  background:
    radial-gradient(60% 60% at 50% 40%, rgba(234, 88, 12, 0.24), transparent 60%),
    radial-gradient(40% 50% at 25% 70%, rgba(251, 191, 36, 0.20), transparent 60%),
    rgba(60, 24, 8, 0.42);
}
.rm-orbit { position: absolute; border-radius: 50%; border: 1px solid rgba(251, 191, 36, 0.14); pointer-events: none; filter: blur(0.6px); }
.rm-orbit-1 { width: 540px; height: 540px; border-color: rgba(234, 88, 12, 0.22); animation: rm-spin 38s linear infinite; }
.rm-orbit-2 { width: 720px; height: 720px; border-color: rgba(251, 191, 36, 0.14); animation: rm-spin 56s linear infinite reverse; }
.rm-orbit-3 { width: 900px; height: 900px; border-color: rgba(180, 83, 9, 0.10); animation: rm-spin 78s linear infinite; }
@keyframes rm-spin { to { transform: rotate(360deg); } }

.rm-card {
  position: relative; width: 580px; max-width: calc(100vw - 32px); max-height: calc(100vh - 40px);
  border-radius: 22px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(234, 88, 12, 0.18), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(251, 191, 36, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(22, 12, 10, 0.96), rgba(14, 8, 6, 0.96));
  border: 1px solid rgba(234, 88, 12, 0.30);
  box-shadow: 0 60px 140px -30px rgba(0, 0, 0, 0.88), 0 0 0 1px rgba(251, 191, 36, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  overflow: hidden; display: flex; flex-direction: column; transform-style: preserve-3d;
}
[data-theme="light"] .rm-card {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(234, 88, 12, 0.16), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(251, 191, 36, 0.18), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.98), rgba(255, 244, 220, 0.98));
  border-color: rgba(194, 65, 12, 0.32);
  box-shadow: 0 50px 120px -30px rgba(127, 29, 29, 0.40), 0 0 0 1px rgba(217, 119, 6, 0.10);
}

.rm-ribbon {
  position: relative; display: grid; grid-template-columns: 56px 1fr auto; gap: 14px; align-items: center;
  padding: 22px 22px 18px; border-bottom: 1px solid rgba(234, 88, 12, 0.20); overflow: hidden;
  background: linear-gradient(90deg, rgba(234, 88, 12, 0.12), rgba(180, 83, 9, 0.04) 60%, transparent);
}
[data-theme="light"] .rm-ribbon { background: linear-gradient(90deg, rgba(234, 88, 12, 0.10), rgba(251, 191, 36, 0.08) 60%, transparent); border-color: rgba(194, 65, 12, 0.18); }
.rb-grain { position: absolute; inset: 0; opacity: 0.06; background-image: radial-gradient(rgba(251, 191, 36, 0.7) 1px, transparent 1px); background-size: 7px 7px; pointer-events: none; }
.rb-aura { position: absolute; left: -10%; top: -50%; width: 60%; height: 200%; background: radial-gradient(50% 30% at 50% 50%, rgba(234, 88, 12, 0.40), transparent 65%); filter: blur(28px); pointer-events: none; }
.rb-glyph {
  position: relative; width: 56px; height: 56px; display: grid; place-items: center; border-radius: 16px;
  background: radial-gradient(60% 60% at 30% 30%, rgba(251, 191, 36, 0.30), transparent 70%), linear-gradient(135deg, rgba(234, 88, 12, 0.32), rgba(127, 29, 29, 0.28));
  border: 1px solid rgba(234, 88, 12, 0.42); color: #ffe0d0;
  box-shadow: 0 12px 32px -10px rgba(234, 88, 12, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
[data-theme="light"] .rb-glyph { color: #7c2d12; background: radial-gradient(60% 60% at 30% 30%, rgba(251, 191, 36, 0.30), transparent 70%), linear-gradient(135deg, rgba(251, 191, 36, 0.40), rgba(234, 88, 12, 0.30)); border-color: rgba(194, 65, 12, 0.40); }
.rb-glyph-aura { position: absolute; inset: -8px; border-radius: 50%; border: 1.5px solid rgba(234, 88, 12, 0.50); opacity: 0.7; animation: rb-pulse 2.4s ease-in-out infinite; }
@keyframes rb-pulse { 0%, 100% { transform: scale(0.9); opacity: 0.6; } 50% { transform: scale(1.18); opacity: 0; } }
.rb-meta { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.rb-eye { font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: var(--w-ember-200, #ffb088); }
[data-theme="light"] .rb-eye { color: var(--w-ember-700, #8b2906); }
.rb-title { margin: 0; font-size: 19px; font-weight: 800; color: var(--leave-text); letter-spacing: -0.014em; line-height: 1.15; }
.rb-sub { margin: 0; font-size: 11.5px; color: var(--leave-text-muted); display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.rb-ref { color: var(--leave-brand); font-weight: 700; }
.rb-emp { color: var(--leave-text-secondary); font-weight: 600; }
.rb-amt { color: var(--leave-approved); font-weight: 800; }
.rb-days { color: var(--leave-text-secondary); font-weight: 700; }
.rb-sep { opacity: 0.5; }
.rm-close { position: relative; display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; border: 1px solid rgba(234, 88, 12, 0.30); background: rgba(20, 12, 10, 0.4); color: var(--leave-text-muted); cursor: pointer; transition: transform .26s var(--leave-ease), color .22s, border-color .22s, background .22s; }
[data-theme="light"] .rm-close { background: rgba(255, 250, 235, 0.6); }
.rm-close:hover { transform: rotate(90deg) scale(1.08); color: var(--leave-rejected); border-color: var(--leave-rejected); background: var(--leave-rejected-soft); }

.rm-body { padding: 16px 22px 4px; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; }
.rm-section { display: flex; flex-direction: column; gap: 10px; }
.rm-sec-head { display: flex; align-items: center; gap: 10px; }
.rm-sec-num { font-size: 9.5px; font-weight: 800; color: var(--leave-brand); padding: 2px 7px; border-radius: 5px; background: rgba(251, 191, 36, 0.14); border: 1px solid rgba(251, 191, 36, 0.32); letter-spacing: 0.06em; }
.rm-sec-rule { flex: 0 0 20px; height: 1px; background: linear-gradient(90deg, var(--leave-brand), transparent); }
.rm-sec-title { margin: 0; font-size: 13.5px; font-weight: 800; color: var(--leave-text); letter-spacing: -0.008em; }
.rm-sec-meta { margin-left: auto; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--leave-text-muted); }
.rm-sec-meta[data-warn="true"] { color: var(--leave-rejected); }

.rm-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.rm-chip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 999px; background: rgba(255, 250, 235, 0.04); border: 1px solid rgba(234, 88, 12, 0.20); color: var(--leave-text-secondary); font-size: 11.5px; font-weight: 600; cursor: pointer; transition: border-color .22s, color .22s, background .22s, transform .22s; position: relative; }
[data-theme="light"] .rm-chip { background: rgba(255, 250, 240, 0.6); border-color: rgba(194, 65, 12, 0.20); }
.rm-chip:hover { border-color: var(--leave-rejected); color: var(--leave-text); background: var(--leave-rejected-soft); }
.rm-chip.is-active { background: linear-gradient(135deg, rgba(234, 88, 12, 0.30), rgba(180, 83, 9, 0.20)); border-color: var(--leave-rejected); color: #fff7ed; font-weight: 700; box-shadow: 0 8px 20px -10px rgba(234, 88, 12, 0.50); }
[data-theme="light"] .rm-chip.is-active { background: linear-gradient(135deg, rgba(234, 88, 12, 0.18), rgba(180, 83, 9, 0.10)); color: #7c2d12; border-color: var(--w-ember-600); }
.chip-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(234, 88, 12, 0.30); transition: background .22s, transform .22s, box-shadow .22s; }
.chip-dot.on { background: #ffc7a8; box-shadow: 0 0 8px #ff8a4c; transform: scale(1.30); }
[data-theme="light"] .chip-dot.on { background: var(--w-ember-600); box-shadow: 0 0 8px var(--w-ember-500); }
.chip-check { color: #ffe0d0; filter: drop-shadow(0 0 4px rgba(234, 88, 12, 0.6)); }
[data-theme="light"] .chip-check { color: var(--w-ember-700); }

.rm-textarea-wrap { position: relative; border-radius: 14px; background: rgba(14, 8, 6, 0.55); border: 1px solid rgba(234, 88, 12, 0.24); transition: border-color .26s var(--leave-ease), box-shadow .26s var(--leave-ease); overflow: hidden; }
[data-theme="light"] .rm-textarea-wrap { background: rgba(255, 248, 230, 0.88); border-color: rgba(194, 65, 12, 0.24); }
.rm-textarea-wrap.is-focused { border-color: var(--leave-rejected); box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.12); }
.rm-textarea { width: 100%; padding: 12px 14px; min-height: 80px; background: transparent; border: none; outline: none; color: var(--leave-text); font: inherit; font-size: 13px; line-height: 1.55; resize: vertical; }
.rm-textarea::placeholder { color: var(--leave-text-placeholder); }
.rm-ta-glow { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(234, 88, 12, 0.10), transparent); background-size: 200% 100%; opacity: 0; pointer-events: none; transition: opacity .3s; }
.rm-textarea-wrap.is-focused .rm-ta-glow { opacity: 1; animation: leave-gradient-pan 2.6s linear infinite; }
.rm-ta-corner { position: absolute; width: 12px; height: 12px; border: 1.5px solid var(--leave-rejected); opacity: 0; pointer-events: none; transition: opacity .26s var(--leave-ease); }
.rm-ta-corner.tl { top: 6px; left: 6px; border-right: 0; border-bottom: 0; }
.rm-ta-corner.tr { top: 6px; right: 6px; border-left: 0; border-bottom: 0; }
.rm-ta-corner.bl { bottom: 6px; left: 6px; border-right: 0; border-top: 0; }
.rm-ta-corner.br { bottom: 6px; right: 6px; border-left: 0; border-top: 0; }
.rm-textarea-wrap.is-focused .rm-ta-corner { opacity: 0.9; }

.rm-preview { padding: 10px 12px; border-radius: 10px; background: rgba(251, 191, 36, 0.05); border: 1px dashed rgba(251, 191, 36, 0.22); }
[data-theme="light"] .rm-preview { background: rgba(255, 244, 210, 0.55); border-color: rgba(180, 83, 9, 0.22); }
.rm-preview-eye { font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--leave-brand); }
[data-theme="light"] .rm-preview-eye { color: var(--w-gold-700); }
.rm-preview-text { margin: 4px 0 0; font-size: 11.5px; line-height: 1.55; color: var(--leave-text-secondary); white-space: pre-wrap; }

.rm-foot { display: flex; gap: 10px; justify-content: flex-end; padding: 14px 22px 20px; border-top: 1px solid rgba(234, 88, 12, 0.18); background: linear-gradient(180deg, transparent, rgba(234, 88, 12, 0.04)); }
[data-theme="light"] .rm-foot { border-color: rgba(194, 65, 12, 0.16); background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.06)); }
.rm-cancel:hover { border-color: var(--leave-brand); color: var(--leave-text); }
.rm-confirm { position: relative; overflow: hidden; }
.rm-confirm:disabled { opacity: 0.42; cursor: not-allowed; filter: grayscale(0.4); }
.rm-confirm-glow { position: absolute; inset: 0; background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.32), transparent); background-size: 220% 100%; background-position: -100% 0; pointer-events: none; transition: background-position .7s var(--leave-ease); }
.rm-confirm:not(:disabled):hover .rm-confirm-glow { background-position: 100% 0; }

.rm-enter-active, .rm-leave-active { transition: opacity .28s; }
.rm-enter-from, .rm-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) { .rm-orbit, .rb-glyph-aura, .rm-ta-glow { animation: none !important; } }
@media (max-width: 600px) {
  .rm-card { width: calc(100vw - 24px); border-radius: 16px; }
  .rm-ribbon { grid-template-columns: 44px 1fr auto; padding: 18px 16px 14px; }
  .rb-glyph { width: 44px; height: 44px; border-radius: 12px; }
  .rb-title { font-size: 16px; }
  .rm-body { padding: 14px 16px 4px; }
  .rm-foot { padding: 12px 16px 18px; }
}
</style>
