<template>
  <SetModal :open="open" :title="isEdit ? 'Edit welcome kit' : 'New welcome kit'"
    :subtitle="isEdit ? (form.name || 'Kit template') : 'A bundle handed to every new joiner'"
    :icon="Gift" accent-color="var(--set-ok)" :width="720"
    :mode="isEdit ? 'edit' : 'create'" aside-placement="side" @close="$emit('close')">

    <div class="wm-form">
      <Motion as="div" class="wm-block" v-bind="fT(0)">
        <label class="wm-lab">Kit name <i>*</i></label>
        <HrInput v-model="form.name" placeholder="e.g. Engineering Starter Kit" :error="!!err.name" :error-text="err.name" />
      </Motion>

      <Motion as="div" class="wm-block" v-bind="fT(1)">
        <label class="wm-lab">Description</label>
        <HrTextarea v-model="form.description" :rows="2" placeholder="Who is this kit for, and when is it handed over?" />
      </Motion>

      <Motion as="div" class="wm-block" v-bind="fT(2)">
        <div class="wm-mhead">
          <label class="wm-lab">Kit contents</label>
          <span class="wm-mcount">{{ validItems.length }} items</span>
        </div>
        <div class="wm-items">
          <div v-for="(it, i) in form.items" :key="i" class="wm-irow">
            <HrInput v-model="it.item_name" placeholder="Item (e.g. Laptop, ID card, Swag)" />
            <div class="wm-qty">
              <button type="button" @click="it.qty = Math.max(1, (Number(it.qty) || 1) - 1)" aria-label="Less"><Minus :size="13" /></button>
              <span>{{ Number(it.qty) || 1 }}</span>
              <button type="button" @click="it.qty = Math.min(99, (Number(it.qty) || 1) + 1)" aria-label="More"><Plus :size="13" /></button>
            </div>
            <button class="wm-irm" type="button" @click="rm(i)" aria-label="Remove item"><X :size="14" /></button>
          </div>
          <button class="wm-add" type="button" @click="add"><Plus :size="14" /> Add item</button>
        </div>
      </Motion>
    </div>

    <template #aside>
      <div class="wm-prev">
        <span class="wm-prev-eyebrow"><Sparkles :size="11" /> Live preview</span>
        <div class="wm-box">
          <span class="wm-box-glow" aria-hidden="true" />
          <div class="wm-box-top"><Gift :size="16" /><b>{{ form.name || 'Untitled kit' }}</b></div>
          <ul v-if="validItems.length" class="wm-box-list">
            <li v-for="(it, i) in validItems.slice(0, 8)" :key="i"><PackageCheck :size="12" /><span>{{ it.item_name }}</span><em v-if="it.qty > 1">×{{ it.qty }}</em></li>
            <li v-if="validItems.length > 8" class="more">+{{ validItems.length - 8 }} more</li>
          </ul>
          <p v-else class="wm-box-empty">Add items to compose the kit.</p>
        </div>
        <p class="wm-note"><Info :size="12" /> The active kit is copied to a new joiner during onboarding, then packed → dispatched → delivered.</p>
      </div>
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" type="button" @click="$emit('close')">Cancel</button>
      <button class="set-btn set-btn-primary" type="button" :disabled="saving" @click="submit">
        <Loader2 v-if="saving" :size="14" class="set-spin" />
        <component v-else :is="isEdit ? Check : Plus" :size="14" />
        {{ isEdit ? 'Save changes' : 'Create kit' }}
      </button>
    </template>
  </SetModal>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Gift, Sparkles, Info, Plus, Minus, X, Check, Loader2, PackageCheck } from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import HrTextarea from '@/components/hr/forms/HrTextarea.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  initial: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])

const isEdit = computed(() => !!props.initial)
const reduced = prefersReduced()
const fT = (i) => reduced ? {} : ({
  initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] },
})

const blank = () => ({ name: '', description: '', items: [{ item_name: '', qty: 1 }] })
const form = reactive(blank())
const err = reactive({ name: '' })

const validItems = computed(() => form.items.filter(it => it.item_name?.trim()).map(it => ({ item_name: it.item_name.trim(), qty: Number(it.qty) || 1 })))

const add = () => form.items.push({ item_name: '', qty: 1 })
const rm = (i) => { if (form.items.length === 1) form.items[0] = { item_name: '', qty: 1 }; else form.items.splice(i, 1) }

const reset = () => {
  Object.assign(form, blank())
  if (props.initial) {
    form.name = props.initial.name || ''
    form.description = props.initial.description || ''
    const items = Array.isArray(props.initial.default_items) ? props.initial.default_items : []
    form.items = items.length
      ? items.map(it => typeof it === 'string' ? { item_name: it, qty: 1 } : { item_name: it.item_name || it.name || '', qty: Number(it.qty) || 1 })
      : [{ item_name: '', qty: 1 }]
  }
  err.name = ''
}
watch(() => props.open, (v) => { if (v) reset() })

const submit = () => {
  err.name = form.name.trim() ? '' : 'Kit name is required'
  if (err.name) return
  emit('save', {
    name: form.name.trim(),
    description: form.description?.trim() || null,
    default_items: validItems.value.map(it => ({ item_name: it.item_name, qty: it.qty, included: true })),
  })
}
</script>

<style scoped>
.wm-form { display: flex; flex-direction: column; gap: 15px; }
.wm-block { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.wm-lab { font-size: 11.5px; font-weight: 700; color: var(--set-text-secondary); }
.wm-lab i { color: var(--set-conflict); font-style: normal; }
.wm-mhead { display: flex; align-items: center; justify-content: space-between; }
.wm-mcount { font-size: 10.5px; font-weight: 700; color: var(--set-text-dim); }
.wm-items { display: flex; flex-direction: column; gap: 8px; }
.wm-irow { display: grid; grid-template-columns: 1fr auto 34px; gap: 8px; align-items: center; }
.wm-qty { display: flex; align-items: center; gap: 4px; height: 42px; padding: 0 5px; border-radius: 10px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.wm-qty button { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; cursor: pointer; color: var(--set-ok);
  background: color-mix(in srgb, var(--set-ok) 12%, transparent); border: 1px solid color-mix(in srgb, var(--set-ok) 24%, transparent); transition: all 0.16s; }
.wm-qty button:hover { background: color-mix(in srgb, var(--set-ok) 22%, transparent); }
.wm-qty span { min-width: 18px; text-align: center; font-size: 12.5px; font-weight: 800; color: var(--set-text); font-variant-numeric: tabular-nums; }
.wm-irm { display: grid; place-items: center; width: 34px; height: 42px; border-radius: 9px; cursor: pointer; color: var(--set-text-muted);
  background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 22%, transparent); transition: all 0.18s; }
.wm-irm:hover { color: var(--set-conflict); }
.wm-add { display: inline-flex; align-items: center; gap: 6px; width: max-content; padding: 8px 13px; border-radius: 10px; cursor: pointer; font: inherit;
  font-size: 12px; font-weight: 700; color: var(--set-ok); background: var(--set-ok-soft); border: 1px solid color-mix(in srgb, var(--set-ok) 26%, transparent); transition: all 0.2s var(--set-spring); }
.wm-add:hover { background: color-mix(in srgb, var(--set-ok) 20%, transparent); }

/* preview box */
.wm-prev { display: flex; flex-direction: column; gap: 13px; }
.wm-prev-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-muted); }
.wm-prev-eyebrow :deep(svg) { color: var(--set-ok); }
.wm-box { position: relative; overflow: hidden; padding: 14px 15px; border-radius: 15px; background: var(--set-surface);
  border: 1px solid color-mix(in srgb, var(--set-ok) 26%, transparent); }
.wm-box-glow { position: absolute; inset: -40% 30% auto -10%; height: 80%; background: radial-gradient(circle, color-mix(in srgb, var(--set-ok) 22%, transparent), transparent 70%); filter: blur(24px); pointer-events: none; }
.wm-box-top { position: relative; display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.wm-box-top :deep(svg) { color: var(--set-ok); }
.wm-box-top b { font-size: 13.5px; font-weight: 800; color: var(--set-text); }
.wm-box-list { position: relative; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.wm-box-list li { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--set-text-secondary); }
.wm-box-list li :deep(svg) { color: var(--set-ok); flex-shrink: 0; }
.wm-box-list li span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wm-box-list li em { font-style: normal; font-weight: 800; color: var(--set-text); }
.wm-box-list li.more { color: var(--set-text-muted); font-style: italic; padding-left: 19px; }
.wm-box-empty { position: relative; margin: 0; font-size: 11.5px; font-style: italic; color: var(--set-text-dim); }
.wm-note { display: flex; gap: 7px; margin: 0; font-size: 11px; line-height: 1.5; color: var(--set-text-muted); }
.wm-note :deep(svg) { color: var(--set-ok); flex-shrink: 0; margin-top: 1px; }

@media (max-width: 720px) { .wm-irow { grid-template-columns: 1fr; } }
</style>
