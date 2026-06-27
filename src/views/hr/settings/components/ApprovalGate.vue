<template>
  <Motion as="div" class="gate-shell" :class="{ lit, active }"
    :initial="reduced ? false : { opacity: 0, y: 16, scale: 0.96 }"
    :animate="{ opacity: 1, y: 0, scale: 1 }"
    :transition="{ duration: 0.5, delay: 0.05 + index * 0.07, ease: [0.16, 1, 0.3, 1] }">
    <article ref="cardEl" class="gate" :style="{ '--acc': accent }">
      <span class="gate-spine" aria-hidden="true" />
      <span class="gate-glare" aria-hidden="true" />
      <span v-if="active" class="gate-pulse" aria-hidden="true" />

      <!-- head: order index + approver glyph + verdict -->
      <header class="gate-head">
        <span class="gate-idx">{{ index + 1 }}</span>
        <span class="gate-glyph">
          <span class="gate-glyph-ring" aria-hidden="true" />
          <component :is="meta.icon" :size="17" />
        </span>
        <div class="gate-head-txt">
          <span class="gate-eyebrow">Stage {{ index + 1 }}</span>
          <b>Approves the request</b>
        </div>
        <Transition name="seal">
          <span v-if="lit" class="gate-seal"><Check :size="13" /></span>
          <span v-else-if="active" class="gate-state">Reviewing…</span>
        </Transition>
      </header>

      <!-- approver type -->
      <label class="gate-field">
        <span class="gate-lab">Who approves</span>
        <SetSelect :model-value="stage.approver_type" :options="typeOptions" :accent-color="accent"
          @update:model-value="onType" />
      </label>

      <!-- specific person — only for a USER ("Specific person") stage -->
      <div v-if="stage.approver_type === 'USER'" class="gate-field">
        <span class="gate-lab">Which person <i v-if="!stage.approver_user_id" class="gate-req">· required</i></span>
        <ApproverPicker :model-value="stage.approver_user_id" :accent-color="accent" @change="onPerson" />
      </div>

      <!-- display label -->
      <label class="gate-field">
        <span class="gate-lab">Stage label</span>
        <input class="gate-input" :value="stage.label" :placeholder="meta.label"
          @input="emit('patch', { label: $event.target.value })" />
      </label>

      <!-- amount gate (travel / reimbursement) -->
      <div v-if="supportsAmounts" class="gate-field">
        <span class="gate-lab">
          Amount gate
          <i v-if="hasAmount">applies only when amount ≥ ₹{{ fmt(stage.min_amount) }}</i>
          <i v-else>applies to every request</i>
        </span>
        <div class="gate-amt" :class="{ set: hasAmount }">
          <button type="button" class="gate-step" :disabled="!hasAmount" title="Decrease" @click="bump(-STEP)"><Minus :size="13" /></button>
          <span class="gate-amt-face">
            <span class="gate-amt-cur">₹</span>
            <input class="gate-amt-input" inputmode="numeric" :value="amtText"
              placeholder="Always" @input="onAmt($event.target.value)" />
          </span>
          <button type="button" class="gate-step" title="Increase" @click="bump(STEP)"><Plus :size="13" /></button>
          <button v-if="hasAmount" type="button" class="gate-clear" title="Clear gate — always apply" @click="emit('patch', { min_amount: null })"><X :size="12" /></button>
        </div>
      </div>

      <!-- controls -->
      <footer class="gate-ctl">
        <div class="gate-move">
          <button type="button" :disabled="index === 0" title="Move earlier" @click="emit('move', -1)"><ArrowLeft :size="13" /></button>
          <button type="button" :disabled="index === total - 1" title="Move later" @click="emit('move', 1)"><ArrowRight :size="13" /></button>
        </div>
        <button type="button" class="gate-del" title="Remove stage" @click="emit('remove')"><Trash2 :size="13" /> Remove</button>
      </footer>
    </article>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { Check, Plus, Minus, X, Trash2, ArrowLeft, ArrowRight } from 'lucide-vue-next'
import SetSelect from './SetSelect.vue'
import ApproverPicker from './ApproverPicker.vue'
import { approverMeta, approverTypeOptions } from './approverMeta'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  stage: { type: Object, required: true },
  index: { type: Number, default: 0 },
  total: { type: Number, default: 1 },
  approverTypes: { type: Array, default: () => [] },
  supportsAmounts: { type: Boolean, default: false },
  lit: { type: Boolean, default: false },     // dispatch sim: this stage approved
  active: { type: Boolean, default: false },  // dispatch sim: packet is here now
})
const emit = defineEmits(['patch', 'remove', 'move'])

const STEP = 1000
const reduced = prefersReduced()
const cardEl = ref(null)
usePointerSpotlight(cardEl)

const metaFor = approverMeta
const meta = computed(() => metaFor(props.stage.approver_type))
const accent = computed(() => meta.value.color)
const typeOptions = computed(() => approverTypeOptions(props.approverTypes))

const hasAmount = computed(() => props.stage.min_amount != null && props.stage.min_amount !== '')
const amtText = computed(() => hasAmount.value ? String(props.stage.min_amount) : '')
const fmt = (v) => Number(v || 0).toLocaleString('en-IN')

function onType(t) {
  // keep the label in sync when it was still the previous type's default label
  const wasDefault = !props.stage.label || props.stage.label === metaFor(props.stage.approver_type).label
  const patch = { approver_type: t }
  if (wasDefault) patch.label = metaFor(t).label
  // a pinned person only belongs to a USER stage — drop it when switching away
  if (t !== 'USER') patch.approver_user_id = null
  emit('patch', patch)
}
function onPerson(p) {
  // store the chosen person's USER id; default the stage label to their name
  // when the label is still the generic "Specific person".
  const patch = { approver_user_id: p.id }
  const isDefaultLabel = !props.stage.label || props.stage.label === metaFor('USER').label
  if (isDefaultLabel && p.name) patch.label = p.name
  emit('patch', patch)
}
function onAmt(raw) {
  const cleaned = String(raw).replace(/[^\d.]/g, '')
  emit('patch', { min_amount: cleaned === '' ? null : Number(cleaned) })
}
function bump(by) {
  const base = hasAmount.value ? Number(props.stage.min_amount) : 0
  emit('patch', { min_amount: Math.max(0, base + by) })
}
</script>

<style scoped>
.gate-shell { flex: 0 0 auto; width: 236px; display: flex; }

.gate { position: relative; overflow: hidden; flex: 1; display: flex; flex-direction: column; gap: 11px;
  padding: 15px 15px 13px; border-radius: 17px; background: var(--set-surface-elevated);
  border: 1px solid color-mix(in srgb, var(--acc) 30%, var(--set-border));
  box-shadow: var(--set-card-shadow); transition: transform 0.4s var(--set-spring), box-shadow 0.4s var(--set-spring), border-color 0.4s; }
.gate:hover { transform: perspective(1100px)
  rotateX(calc((var(--my, 0.5) - 0.5) * -5deg))
  rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-3px);
  box-shadow: 0 28px 56px -30px rgba(0,0,0,0.7), 0 0 26px -12px var(--acc); }
.gate-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 25%, transparent)); transition: background 0.4s; }
.gate-glare { position: absolute; inset: 0; pointer-events: none; opacity: calc(var(--spot, 0) * 0.7); transition: opacity 0.3s;
  background: radial-gradient(420px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--acc) 22%, transparent), transparent 60%); }
.gate-pulse { position: absolute; inset: -1px; border-radius: 17px; pointer-events: none;
  border: 1.5px solid var(--acc); animation: gate-ring 1.1s ease-out infinite; }
@keyframes gate-ring { 0% { opacity: 0.8; transform: scale(1); } 100% { opacity: 0; transform: scale(1.04); } }

/* lit (approved during dispatch) */
.gate-shell.lit .gate { border-color: color-mix(in srgb, var(--set-ok) 50%, transparent); }
.gate-shell.lit .gate-spine { background: linear-gradient(180deg, var(--set-ok), color-mix(in srgb, var(--set-ok) 30%, transparent)); }

.gate-head { position: relative; display: flex; align-items: center; gap: 9px; }
.gate-idx { display: grid; place-items: center; width: 21px; height: 21px; border-radius: 7px; flex-shrink: 0;
  font-size: 11px; font-weight: 850; color: var(--acc); background: color-mix(in srgb, var(--acc) 15%, transparent); }
.gate-glyph { position: relative; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
  color: var(--acc); background: color-mix(in srgb, var(--acc) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc) 32%, transparent); }
.gate-glyph-ring { position: absolute; inset: -3px; border-radius: 15px; border: 1px solid color-mix(in srgb, var(--acc) 30%, transparent);
  opacity: 0.6; animation: gate-glyph-pulse 3s ease-in-out infinite; }
@keyframes gate-glyph-pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 0; } }
.gate-head-txt { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 1px; }
.gate-eyebrow { font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.gate-head-txt b { font-size: 11.5px; font-weight: 700; color: var(--set-text-secondary); }
.gate-seal { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; color: #06281c;
  background: var(--set-ok); box-shadow: 0 0 14px -2px var(--set-ok); }
.gate-state { font-size: 9.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--acc); }
.seal-enter-active { transition: all 0.4s var(--set-spring); }
.seal-enter-from { opacity: 0; transform: scale(0.4) rotate(-30deg); }

.gate-field { display: flex; flex-direction: column; gap: 5px; }
.gate-lab { font-size: 9.5px; font-weight: 750; letter-spacing: 0.05em; text-transform: uppercase; color: var(--set-text-dim);
  display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.gate-lab i { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; font-size: 9.5px; color: var(--set-text-muted); }
.gate-lab i.gate-req { color: var(--set-conflict); font-weight: 700; }
.gate-input { width: 100%; padding: 9px 11px; border-radius: 10px; font: inherit; font-size: 12.5px; font-weight: 600;
  color: var(--hr-input-text); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s, background 0.2s; }
.gate-input:focus { outline: none; background: var(--hr-input-bg-focus); border-color: var(--hr-input-border-focus); }
.gate-input::placeholder { color: var(--hr-input-placeholder); }

/* amount stepper — no native spinner arrows */
.gate-amt { display: flex; align-items: center; gap: 6px; padding: 4px; border-radius: 11px;
  background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.25s; }
.gate-amt.set { border-color: color-mix(in srgb, var(--acc) 45%, transparent); }
.gate-step { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; cursor: pointer;
  color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.18s; }
.gate-step:hover:not(:disabled) { color: var(--acc); border-color: color-mix(in srgb, var(--acc) 40%, transparent); }
.gate-step:disabled { opacity: 0.35; cursor: not-allowed; }
.gate-amt-face { flex: 1; min-width: 0; display: flex; align-items: center; gap: 3px; padding: 0 4px; }
.gate-amt-cur { font-size: 12px; font-weight: 700; color: var(--set-text-muted); }
.gate-amt-input { width: 100%; min-width: 0; padding: 4px 0; border: none; background: transparent; font: inherit; font-size: 13px; font-weight: 700;
  color: var(--set-text); }
.gate-amt-input:focus { outline: none; }
.gate-amt-input::placeholder { color: var(--set-text-dim); font-weight: 500; }
.gate-clear { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0; cursor: pointer;
  color: var(--set-text-dim); background: transparent; border: 1px solid transparent; transition: all 0.18s; }
.gate-clear:hover { color: var(--set-conflict); background: var(--set-conflict-soft); }

.gate-ctl { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 9px;
  border-top: 1px solid var(--set-border); }
.gate-move { display: inline-flex; gap: 5px; }
.gate-move button { display: grid; place-items: center; width: 30px; height: 28px; border-radius: 8px; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.18s; }
.gate-move button:hover:not(:disabled) { color: var(--set-text); border-color: var(--set-border-strong); transform: translateY(-1px); }
.gate-move button:disabled { opacity: 0.3; cursor: not-allowed; }
.gate-del { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9px; cursor: pointer;
  font: inherit; font-size: 11px; font-weight: 700; color: var(--set-text-muted);
  background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s; }
.gate-del:hover { color: var(--set-conflict); border-color: color-mix(in srgb, var(--set-conflict) 40%, transparent); background: var(--set-conflict-soft); }

@media (prefers-reduced-motion: reduce) {
  .gate:hover { transform: none; }
  .gate-pulse, .gate-glyph-ring { animation: none; }
}
</style>
