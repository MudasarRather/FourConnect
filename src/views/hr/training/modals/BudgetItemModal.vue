<template>
  <TrnModal :open="open" wide title="Add cost line" subtitle="Record a spend or a committed cost against this budget." :icon="ReceiptText" @close="$emit('close')">
    <div class="bi-layout">
      <!-- form -->
      <div class="bi-form">
        <Motion as="div" class="bi-group" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.04 }">
          <span class="bi-label">Cost category</span>
          <div class="bi-cats">
            <button v-for="t in BUDGET_COST_TYPES" :key="t" type="button" class="bi-cat" :class="{ on: form.cost_type === t }"
              :style="{ '--c': meta(t).color }" @click="form.cost_type = t">
              <span class="bi-cat-ic"><component :is="meta(t).icon" :size="15" /></span>
              <span class="bi-cat-l">{{ meta(t).label }}</span>
            </button>
          </div>
        </Motion>

        <Motion as="div" class="bi-group" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.09 }">
          <TrnField v-model="form.title" label="Title" placeholder="e.g. Trainer fee — AWS workshop" />
        </Motion>

        <Motion as="div" class="bi-group bi-row" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.13 }">
          <TrnField v-model.number="form.amount" label="Amount" type="number" required placeholder="0" />
          <div class="bi-field">
            <span class="bi-label">Status</span>
            <div class="bi-seg" :style="{ '--idx': form.is_committed ? 1 : 0 }">
              <span class="bi-seg-ind" :class="{ committed: form.is_committed }" aria-hidden="true" />
              <button type="button" :class="{ on: !form.is_committed }" @click="form.is_committed = false"><Coins :size="13" /> Spent</button>
              <button type="button" :class="{ on: form.is_committed }" @click="form.is_committed = true"><Clock3 :size="13" /> Committed</button>
            </div>
          </div>
        </Motion>

        <Motion as="div" class="bi-group bi-row" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.17 }">
          <TrnSelect v-model="form.program_id" label="Program (optional)" :options="programOptions" placeholder="—" searchable search-placeholder="Search programs…" />
          <TrnSelect v-model="form.trainer_id" label="Trainer (optional)" :options="trainerOptions" placeholder="—" searchable search-placeholder="Search trainers…" />
        </Motion>

        <Motion as="div" class="bi-group" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.21 }">
          <label class="bi-date">
            <span class="bi-label">Incurred date</span>
            <HrDatePicker v-model="form.incurred_date" placeholder="Pick a date" />
          </label>
        </Motion>

        <Motion as="div" class="bi-group" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.25 }">
          <TrnField v-model="form.notes" label="Notes" type="textarea" :rows="2" placeholder="Optional context…" />
        </Motion>
      </div>

      <!-- impact -->
      <aside class="bi-aside">
        <span class="bi-aside-eyebrow"><Sparkles :size="12" /> Budget impact</span>
        <Motion as="div" class="bi-impact" :class="{ over: impact.over }" :animate="{ scale: form.amount ? 1 : 0.99 }">
          <div class="bi-impact-line" :class="{ on: form.is_committed }">
            <component :is="form.is_committed ? Clock3 : Coins" :size="14" />
            <span>This {{ form.is_committed ? 'commitment' : 'spend' }}</span>
            <b class="trn-mono">₹{{ inr(form.amount) }}</b>
          </div>
          <div class="bi-impact-rail">
            <span class="bi-iseg spent" :style="{ width: impact.spentPct + '%' }" />
            <span class="bi-iseg committed" :style="{ width: impact.commPct + '%' }" />
            <span class="bi-iseg new" :style="{ width: impact.newPct + '%' }" />
          </div>
          <div class="bi-impact-rows">
            <div><span>Allocated</span><b class="trn-mono">₹{{ inr(impact.allocated) }}</b></div>
            <div><span>Used after</span><b class="trn-mono">₹{{ inr(impact.usedAfter) }}</b></div>
            <div class="rem" :class="{ neg: impact.remAfter < 0 }"><span>Remaining after</span><b class="trn-mono">₹{{ inr(impact.remAfter) }}</b></div>
          </div>
          <Presence>
            <Motion v-if="impact.over" as="div" class="bi-warn" key="w"
              :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }" :transition="{ duration: 0.28 }">
              <TriangleAlert :size="13" /> Pushes this budget <b>₹{{ inr(Math.abs(impact.remAfter)) }}</b> over allocation.
            </Motion>
          </Presence>
        </Motion>
        <p class="bi-hint"><b>Committed</b> = approved but not yet paid; <b>Spent</b> = already incurred. Both burn down remaining.</p>
      </aside>
    </div>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="trn-btn trn-btn-primary" :disabled="!canSave || saving"
        :whileHover="canSave && !saving ? { y: -2 } : {}" :whileTap="canSave && !saving ? { scale: 0.97 } : {}" @click="save">
        <Loader v-if="saving" :size="14" class="spin" /><Plus v-else :size="15" /> Add cost line
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { ReceiptText, Loader, Coins, Clock3, Sparkles, TriangleAlert, Plus } from 'lucide-vue-next'
import TrnModal from '../components/TrnModal.vue'
import TrnField from '../components/TrnField.vue'
import TrnSelect from '../components/TrnSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { addBudgetItem, BUDGET_COST_TYPES, budgetCostMeta, fetchTrainingPrograms, fetchTrainers } from '@/composables/useTraining'

const props = defineProps({
  open: { type: Boolean, default: false },
  budget: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const saving = ref(false)
const programs = ref([])
const trainers = ref([])

const meta = budgetCostMeta
const num = (v) => Number(v || 0)
const inr = (v) => num(v).toLocaleString('en-IN')

const programOptions = computed(() => programs.value.map(p => ({ value: p.id, label: p.name })))
const trainerOptions = computed(() => trainers.value.map(t => ({ value: t.id, label: t.name })))

const blank = () => ({ title: '', amount: null, cost_type: 'TRAINER_FEE', program_id: '', trainer_id: '', incurred_date: '', is_committed: false, notes: '' })
const form = ref(blank())
const canSave = computed(() => num(form.value.amount) > 0 && !!props.budget?.id)

const impact = computed(() => {
  const b = props.budget || {}
  const alloc = num(b.allocated_amount)
  const spent = num(b.spent_amount), comm = num(b.committed_amount)
  const add = num(form.value.amount)
  const newSpent = spent + (form.value.is_committed ? 0 : add)
  const newComm = comm + (form.value.is_committed ? add : 0)
  const usedAfter = newSpent + newComm
  const pct = (v) => alloc > 0 ? Math.min(100, (v / alloc) * 100) : 0
  return {
    allocated: alloc, usedAfter, remAfter: alloc - usedAfter, over: usedAfter > alloc && alloc > 0,
    spentPct: pct(spent), commPct: Math.min(pct(spent + comm) - pct(spent), pct(comm)),
    newPct: alloc > 0 ? Math.min(100 - pct(spent + comm), (add / alloc) * 100) : 0,
  }
})

watch(() => props.open, async (o) => {
  if (!o) return
  form.value = blank()
  try { programs.value = await fetchTrainingPrograms({ limit: 200 }) } catch { programs.value = [] }
  try { trainers.value = await fetchTrainers() } catch { trainers.value = [] }
})

const save = async () => {
  if (!canSave.value) return
  saving.value = true
  try {
    const payload = { ...form.value }
    if (!payload.program_id) delete payload.program_id
    if (!payload.trainer_id) delete payload.trainer_id
    if (!payload.incurred_date) delete payload.incurred_date
    await addBudgetItem(props.budget.id, payload)
    toast.success('Cost line added')
    emit('saved'); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not add cost line') }
  finally { saving.value = false }
}
</script>

<style scoped>
.bi-layout { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; }
.bi-form { display: flex; flex-direction: column; gap: 14px; }
.bi-group { display: flex; flex-direction: column; gap: 8px; }
.bi-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.bi-field { display: flex; flex-direction: column; gap: 6px; }
.bi-label { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }

.bi-cats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.bi-cat { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 11px 6px; border-radius: 12px; cursor: pointer;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: all 0.22s var(--trn-spring); }
.bi-cat:hover { border-color: color-mix(in srgb, var(--c) 40%, transparent); transform: translateY(-2px); }
.bi-cat.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); box-shadow: 0 6px 16px -8px color-mix(in srgb, var(--c) 60%, transparent); }
.bi-cat-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); transition: transform 0.25s var(--trn-spring); }
.bi-cat.on .bi-cat-ic { transform: scale(1.1); }
.bi-cat-l { font-size: 11px; font-weight: 600; color: var(--trn-text-secondary); }
.bi-cat.on .bi-cat-l { color: var(--trn-text); }

.bi-seg { position: relative; display: grid; grid-template-columns: 1fr 1fr; padding: 4px; border-radius: 11px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.bi-seg-ind { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / 2); border-radius: 8px; z-index: 0;
  background: color-mix(in srgb, var(--trn-amber) 16%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--trn-amber) 32%, transparent);
  transform: translateX(calc(var(--idx) * 100%)); transition: transform 0.34s var(--trn-spring), background 0.3s; }
.bi-seg-ind.committed { background: color-mix(in srgb, var(--trn-ember) 16%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--trn-ember) 36%, transparent); }
.bi-seg button { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; font: inherit; font-size: 12px; font-weight: 600; padding: 8px; border: 0; background: transparent; cursor: pointer; color: var(--trn-text-muted); transition: color 0.25s; }
.bi-seg button.on { color: var(--trn-amber-strong); }
.bi-seg button:last-child.on { color: var(--trn-ember); }
.bi-date { display: flex; flex-direction: column; gap: 6px; }

/* impact */
.bi-aside { display: flex; flex-direction: column; gap: 10px; }
.bi-aside-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--trn-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trn-amber-strong); }
.bi-aside-eyebrow :deep(svg) { color: var(--trn-amber); }
.bi-impact { display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 16px; background: var(--trn-grad-hero), var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: transform 0.3s var(--trn-spring); }
.bi-impact.over { border-color: color-mix(in srgb, var(--trn-st-failed) 34%, transparent); }
.bi-impact-line { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--trn-amber-strong); }
.bi-impact-line.on { color: var(--trn-ember); }
.bi-impact-line b { margin-left: auto; font-size: 15px; font-weight: 850; color: var(--trn-text); }
.bi-impact-rail { position: relative; display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--trn-st-completed) 16%, var(--trn-surface)); border: 1px solid var(--trn-border-soft); }
.bi-iseg { display: block; height: 100%; transition: width 0.5s var(--trn-spring); }
.bi-iseg.spent { background: var(--trn-amber); }
.bi-iseg.committed { background: repeating-linear-gradient(45deg, var(--trn-ember) 0, var(--trn-ember) 4px, color-mix(in srgb, var(--trn-ember) 55%, transparent) 4px, color-mix(in srgb, var(--trn-ember) 55%, transparent) 8px); }
.bi-iseg.new { background: linear-gradient(90deg, var(--trn-amber-bright), var(--trn-amber)); box-shadow: inset 1px 0 0 var(--trn-canvas); animation: bi-new-pulse 1.6s ease-in-out infinite; }
.bi-impact-rows { display: flex; flex-direction: column; gap: 7px; }
.bi-impact-rows div { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--trn-text-muted); }
.bi-impact-rows b { color: var(--trn-text); font-weight: 700; }
.bi-impact-rows .rem b { color: var(--trn-st-completed); }
.bi-impact-rows .rem.neg b { color: var(--trn-st-failed); }
.bi-warn { display: flex; align-items: center; gap: 6px; overflow: hidden; font-size: 11.5px; font-weight: 600; color: var(--trn-st-failed); }
.bi-warn b { font-family: var(--trn-mono); }
.bi-hint { margin: 0; font-size: 11px; line-height: 1.5; color: var(--trn-text-dim); }
.bi-hint b { color: var(--trn-text-secondary); }

.spin { animation: trn-orbit-spin 0.9s linear infinite; }
@keyframes bi-new-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
@media (max-width: 640px) {
  .bi-layout { grid-template-columns: 1fr; }
  .bi-row { grid-template-columns: 1fr; }
  .bi-cats { grid-template-columns: repeat(2, 1fr); }
}
@media (prefers-reduced-motion: reduce) { .spin, .bi-iseg.new { animation: none; } .bi-seg-ind, .bi-iseg { transition: none; } }
</style>
