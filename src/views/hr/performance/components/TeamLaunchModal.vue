<template>
  <teleport to="body">
    <Presence>
      <Motion v-if="open" key="ov" as="div" class="tlm-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.2 }" @click.self="$emit('close')">
        <Motion as="div" class="tlm" :class="{ reduced }" :initial="reduced ? false : { opacity: 0, y: 18, scale: 0.97 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }" :exit="{ opacity: 0, y: 10, scale: 0.98 }"
          :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="tlm-edge" aria-hidden="true" />
          <span class="tlm-aura" aria-hidden="true" />

          <header class="tlm-head">
            <span class="tlm-eyebrow"><Rocket :size="12" /> Open a review</span>
            <button class="tlm-x" type="button" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <!-- subject -->
          <div class="tlm-subject">
            <span class="tlm-av">{{ initials(employee?.employee_name) }}<span class="tlm-av-ring" aria-hidden="true" /></span>
            <div><b>{{ employee?.employee_name }}</b><span>{{ employee?.designation_name || '—' }}{{ employee?.department_name ? ' · ' + employee.department_name : '' }}</span></div>
          </div>

          <!-- the process this kicks off -->
          <div class="tlm-flow">
            <div v-for="(st, i) in FLOW" :key="st.k" class="tlm-flow-step" :class="{ head: i === 0 }" :style="{ '--i': i }">
              <span class="tlm-flow-ic"><component :is="st.icon" :size="13" /></span>
              <span class="tlm-flow-lab">{{ st.lab }}</span>
              <span v-if="i < FLOW.length - 1" class="tlm-flow-beam" aria-hidden="true" />
            </div>
          </div>

          <div class="tlm-body">
            <!-- template -->
            <div class="tlm-field">
              <span class="tlm-lab">Appraisal template <i>*</i></span>
              <div class="tlm-tpl-grid">
                <button v-for="(t, i) in templates" :key="t.id" type="button" class="tlm-tpl" :class="{ on: form.template_id === t.id }"
                  :style="{ '--i': i }" @click="form.template_id = t.id">
                  <span class="tlm-tpl-check"><Check :size="12" /></span>
                  <b>{{ t.name }}</b>
                  <span class="tlm-tpl-meta"><span class="tlm-tag">{{ cycleLabel(t.cycle) }}</span> {{ t.section_count }} sections · scale /{{ t.rating_max }}</span>
                </button>
                <p v-if="!templates.length" class="tlm-no-tpl"><AlertTriangle :size="13" /> No active templates. Ask HR to publish one in Settings → Appraisal Templates.</p>
              </div>
            </div>

            <!-- when -->
            <div class="tlm-row">
              <label class="tlm-field">
                <span class="tlm-lab">Period</span>
                <input v-model="form.period_label" type="text" maxlength="60" placeholder="e.g. FY 2026-27" />
              </label>
              <label class="tlm-field">
                <span class="tlm-lab">Due date</span>
                <input v-model="form.due_date" type="date" />
              </label>
            </div>

            <!-- one-line rationale (replaces the old run-on note) -->
            <div class="tlm-note"><Info :size="13" /><span><b>{{ firstName }}</b> never self-rates — you own the score. They may add an optional reflection for context.</span></div>
          </div>

          <footer class="tlm-foot">
            <Motion as="button" class="perf-btn perf-btn-ghost" :whileHover="reduced ? {} : { y: -1 }" :whileTap="reduced ? {} : { scale: 0.97 }" @click="$emit('close')">Cancel</Motion>
            <Motion as="button" class="perf-btn perf-btn-primary" :disabled="saving || !form.template_id"
              :whileHover="(reduced || saving || !form.template_id) ? {} : { y: -2, scale: 1.02 }" :whileTap="(reduced || saving || !form.template_id) ? {} : { scale: 0.97 }" @click="launch">
              <Loader2 v-if="saving" :size="14" class="perf-spin" /><Rocket v-else :size="14" /> Open review
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Rocket, Loader2, Info, AlertTriangle, Check, PencilRuler, Coins, BadgeCheck } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { launchTeamReview } from '@/composables/usePerformance'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  employee: { type: Object, default: null },
  templates: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'launched'])
const toast = useToast()
const reduced = prefersReduced()
const saving = ref(false)
const form = reactive({ template_id: null, period_label: '', due_date: '' })

// the workflow opening a review kicks off — communicates "process + reasons" visually
const FLOW = [
  { k: 'open', lab: 'Open', icon: Rocket },
  { k: 'score', lab: 'You score', icon: PencilRuler },
  { k: 'hike', lab: 'Recommend hike', icon: Coins },
  { k: 'hr', lab: 'HR approves', icon: BadgeCheck },
]
const CYCLE = { ANNUAL: 'Annual', HALF_YEARLY: 'Half-yearly', QUARTERLY: 'Quarterly', PROBATION: 'Probation', PROJECT: 'Project', '360': '360°' }
const cycleLabel = (c) => CYCLE[c] || (c || 'Annual')

const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const firstName = computed(() => (props.employee?.employee_name || 'They').split(/\s+/)[0])

watch(() => props.open, (v) => {
  if (v) { form.template_id = props.templates[0]?.id || null; form.period_label = ''; form.due_date = '' }
})

async function launch() {
  saving.value = true
  try {
    const rev = await launchTeamReview({
      employee_id: props.employee.employee_id,
      template_id: form.template_id,
      period_label: form.period_label || null,
      due_date: form.due_date || null,
    })
    toast.success(`Review opened for ${firstName.value}`)
    emit('launched', rev)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not open review') }
  finally { saving.value = false }
}
</script>

<style scoped>
.tlm-ov { position: fixed; inset: 0; z-index: 1450; display: grid; place-items: center; padding: 22px;
  background: rgba(5, 5, 6, 0.62); backdrop-filter: blur(9px); }
.tlm { position: relative; overflow: hidden; width: min(540px, 96vw); max-height: 92vh; border-radius: 22px;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); box-shadow: 0 40px 90px -40px rgba(0,0,0,0.8);
  display: flex; flex-direction: column; }
.tlm-edge { position: absolute; left: 0; right: 0; top: 0; height: 3px; z-index: 3; background: var(--perf-grad-hero);
  background-size: 200% 100%; animation: tlm-edge 5s linear infinite; }
.tlm-aura { position: absolute; top: -110px; right: -70px; width: 280px; height: 280px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--perf-orange) 26%, transparent), transparent 70%); filter: blur(46px); }

.tlm-head { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 0; }
.tlm-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--perf-gold); }
.tlm-x { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.tlm-x:hover { color: var(--perf-text); transform: rotate(90deg); }

.tlm-subject { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 14px 18px 12px; }
.tlm-av { position: relative; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; font-size: 14px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); }
.tlm-av-ring { position: absolute; inset: -4px; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--perf-gold) 45%, transparent); }
.tlm-subject b { display: block; font-size: 15px; font-weight: 850; color: var(--perf-text); }
.tlm-subject span { font-size: 11.5px; color: var(--perf-text-muted); }

/* process pipeline */
.tlm-flow { position: relative; z-index: 1; display: flex; align-items: flex-start; gap: 0; margin: 0 18px 4px; padding: 12px 14px; border-radius: 14px;
  background: color-mix(in srgb, var(--perf-gold) 5%, var(--perf-panel)); border: 1px solid var(--perf-border); }
.tlm-flow-step { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; text-align: center;
  opacity: 0; transform: translateY(8px); animation: tlm-rise 0.4s var(--perf-spring) forwards; animation-delay: calc(0.12s + var(--i) * 0.08s); }
.tlm-flow-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; z-index: 1; color: var(--perf-text-muted); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); }
.tlm-flow-step.head .tlm-flow-ic { color: #1a1206; background: var(--perf-grad-hero); border-color: transparent; box-shadow: 0 0 0 4px color-mix(in srgb, var(--perf-gold) 16%, transparent); }
.tlm-flow-lab { font-size: 9.5px; font-weight: 700; color: var(--perf-text-muted); line-height: 1.2; max-width: 70px; }
.tlm-flow-step.head .tlm-flow-lab { color: var(--perf-text); }
.tlm-flow-beam { position: absolute; top: 14px; left: 50%; width: 100%; height: 2px; z-index: 0; background: repeating-linear-gradient(90deg, var(--perf-border-strong) 0 4px, transparent 4px 8px); }

.tlm-body { position: relative; z-index: 1; flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding: 10px 18px 16px; }
.tlm-field { display: flex; flex-direction: column; gap: 6px; }
.tlm-lab { font-size: 11.5px; font-weight: 700; color: var(--perf-text-secondary); }
.tlm-lab i { color: var(--perf-conflict); font-style: normal; }
.tlm-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.tlm-tpl-grid { display: flex; flex-direction: column; gap: 8px; }
.tlm-tpl { position: relative; text-align: left; padding: 11px 13px 11px 13px; border-radius: 12px; cursor: pointer; font: inherit;
  background: var(--perf-panel); border: 1px solid var(--perf-border-strong); transition: border-color 0.2s, background 0.2s, transform 0.2s var(--perf-spring);
  opacity: 0; transform: translateY(8px); animation: tlm-rise 0.4s var(--perf-spring) forwards; animation-delay: calc(0.2s + var(--i) * 0.06s); }
.tlm-tpl:hover { border-color: var(--perf-border-warm); transform: translateY(-1px); }
.tlm-tpl.on { border-color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 10%, var(--perf-panel)); }
.tlm-tpl-check { position: absolute; top: 11px; right: 12px; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%;
  color: #1a1206; background: var(--perf-grad-hero); opacity: 0; transform: scale(0.6); transition: all 0.22s var(--perf-spring); }
.tlm-tpl.on .tlm-tpl-check { opacity: 1; transform: scale(1); }
.tlm-tpl b { display: block; font-size: 13px; font-weight: 800; color: var(--perf-text); padding-right: 26px; }
.tlm-tpl-meta { display: inline-flex; align-items: center; gap: 7px; margin-top: 3px; font-size: 10.5px; color: var(--perf-text-muted); }
.tlm-tag { font-size: 9px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; padding: 2px 7px; border-radius: 999px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); }
.tlm-no-tpl { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 11.5px; color: var(--perf-text-muted); }
.tlm-no-tpl :deep(svg) { color: var(--perf-amber); }

.tlm-field input { font: inherit; font-size: 13px; color: var(--perf-text); background: var(--perf-panel); border: 1px solid var(--perf-border-strong); border-radius: 10px; padding: 9px 11px; transition: border-color 0.2s; }
.tlm-field input:focus { outline: none; border-color: var(--perf-gold); }

.tlm-note { display: flex; align-items: flex-start; gap: 8px; font-size: 11.5px; line-height: 1.5; color: var(--perf-text-secondary);
  padding: 11px 12px; border-radius: 11px; background: color-mix(in srgb, var(--perf-gold) 8%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 22%, transparent); }
.tlm-note :deep(svg) { color: var(--perf-gold); flex-shrink: 0; margin-top: 1px; }
.tlm-note b { color: var(--perf-text); }

.tlm-foot { position: relative; z-index: 1; display: flex; justify-content: flex-end; gap: 9px; padding: 14px 18px; border-top: 1px solid var(--perf-border); }

@keyframes tlm-edge { to { background-position: 200% 0; } }
@keyframes tlm-rise { to { opacity: 1; transform: none; } }
.tlm.reduced .tlm-edge { animation: none; }
.tlm.reduced .tlm-flow-step, .tlm.reduced .tlm-tpl { animation: none; opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .tlm-edge { animation: none; }
  .tlm-flow-step, .tlm-tpl { animation: none; opacity: 1; transform: none; }
  .tlm-x:hover { transform: none; }
}
</style>
