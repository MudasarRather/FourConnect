<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="esc-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="esc"
          :initial="{ opacity: 0, y: 22, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.97 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <header class="esc-head">
            <span class="esc-ico"><FastForward :size="20" /></span>
            <div>
              <h3>Override holding pattern</h3>
              <p class="esc-ref trv-mono">{{ request?.travel_reference_number }} · {{ request?.employee_name }}</p>
            </div>
            <button class="esc-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <!-- before → after stage morph -->
          <div class="esc-flow">
            <div class="ef-node skip">
              <span class="ef-dot"><Hourglass :size="13" /></span>
              <span class="ef-lbl">Now holding</span>
              <b>{{ curStage }}</b>
            </div>
            <span class="ef-arrow"><ChevronRight :size="16" /></span>
            <div class="ef-node next">
              <span class="ef-dot"><component :is="nextIco" :size="13" /></span>
              <span class="ef-lbl">Advances to</span>
              <b>{{ nextStage }}</b>
            </div>
          </div>

          <p class="esc-note-txt">
            Skips the current approver (e.g. an unresponsive manager) and forwards the request to the next gate.
            Recorded in the audit trail under your name.
          </p>

          <label class="esc-label">Reason (optional)</label>
          <textarea v-model="note" class="esc-textarea" rows="2" placeholder="Why are you overriding this stage?" />

          <footer class="esc-foot">
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn act" :disabled="busy" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="confirm">
              <Loader2 v-if="busy" :size="15" class="spin" /><FastForward v-else :size="15" />
              Override &amp; advance
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, FastForward, Hourglass, ChevronRight, CheckCircle2, PlaneTakeoff, Loader2 } from 'lucide-vue-next'
import { runwayStateFor } from '@/composables/useTravel'

const props = defineProps({ open: Boolean, request: { type: Object, default: null }, busy: Boolean })
const emit = defineEmits(['close', 'confirm'])

const note = ref('')
watch(() => props.open, (v) => { if (v) note.value = '' })

const stages = computed(() => runwayStateFor(props.request || {}))
const curIdx = computed(() => Number(props.request?.current_step || 0))
const curStage = computed(() => stages.value.find(s => s.state === 'current')?.typeLabel || stages.value[curIdx.value]?.typeLabel || 'Current gate')
const next = computed(() => stages.value.find((s, i) => i > curIdx.value && s.state !== 'skipped'))
const nextStage = computed(() => next.value ? next.value.typeLabel : 'Cleared for takeoff')
const nextIco = computed(() => next.value ? CheckCircle2 : PlaneTakeoff)

const confirm = () => emit('confirm', note.value.trim())
</script>

<style scoped>
.esc-overlay { position: fixed; inset: 0; z-index: 1460; display: grid; place-items: center; padding: 20px;
  background: rgba(6, 5, 4, 0.62); backdrop-filter: blur(8px); }
.esc { width: min(460px, 96vw); border-radius: 20px; padding: 22px; position: relative; overflow: hidden;
  background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.esc::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 3px; background: linear-gradient(90deg, var(--trv-st-returned), var(--trv-ember)); }
.esc-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.esc-ico { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  color: var(--trv-st-returned); background: var(--trv-st-returned-soft); border: 1px solid color-mix(in srgb, var(--trv-st-returned) 30%, transparent); }
.esc-head h3 { font-size: 16px; font-weight: 800; margin: 0; color: var(--trv-text); }
.esc-ref { font-size: 11.5px; color: var(--trv-text-muted); margin: 2px 0 0; }
.esc-x { margin-left: auto; background: none; border: none; color: var(--trv-text-dim); cursor: pointer; padding: 4px; }

.esc-flow { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; padding: 14px; border-radius: 14px; background: var(--trv-panel); border: 1px solid var(--trv-border); margin-bottom: 14px; }
.ef-node { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; }
.ef-dot { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; }
.ef-node.skip .ef-dot { color: var(--trv-st-returned); background: var(--trv-st-returned-soft); border: 1px solid color-mix(in srgb, var(--trv-st-returned) 30%, transparent); }
.ef-node.next .ef-dot { color: var(--trv-st-approved); background: var(--trv-st-approved-soft); border: 1px solid color-mix(in srgb, var(--trv-st-approved) 30%, transparent); }
.ef-lbl { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-dim); }
.ef-node b { font-size: 12px; color: var(--trv-text); font-weight: 700; }
.ef-arrow { color: var(--trv-amber); animation: ef-nudge 1.6s ease-in-out infinite; }
@keyframes ef-nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(3px); } }

.esc-note-txt { font-size: 12px; color: var(--trv-text-muted); line-height: 1.5; margin: 0 0 14px; }
.esc-label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 6px; }
.esc-textarea { width: 100%; resize: vertical; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit;
  background: var(--trv-input-bg, rgba(0, 0, 0, 0.3)); border: 1px solid var(--trv-border); color: var(--trv-text); }
.esc-textarea:focus { outline: none; border-color: var(--trv-amber-border); }
.esc-foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.act { background: linear-gradient(135deg, var(--trv-st-returned), var(--trv-ember)); color: #1a1205; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

[data-theme="light"] .esc-overlay { background: rgba(60, 40, 15, 0.3); }
[data-theme="light"] .esc-textarea { background: rgba(255, 250, 240, 0.7); }
@media (prefers-reduced-motion: reduce) { .ef-arrow { animation: none; } }
</style>
