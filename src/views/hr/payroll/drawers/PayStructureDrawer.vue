<template>
  <Teleport to="body">
    <transition name="paym-fade">
      <div v-if="open" class="payd-overlay" @mousedown.self="$emit('close')">
        <Motion class="payd-panel" as="aside"
          :initial="{ x: 80, opacity: 0 }" :animate="{ x: 0, opacity: 1 }"
          :transition="{ duration: 0.42, ease: [0.16,1,0.3,1] }">

          <!-- sticky header -->
          <header class="payd-head">
            <span class="payd-foil"><i></i></span>
            <div class="payd-head-txt">
              <span class="payd-eyebrow">Salary structure</span>
              <h2 class="payd-title">{{ isEdit ? (f.name || 'Edit structure') : 'New structure' }}</h2>
            </div>
            <button class="paym-x" @click="$emit('close')" aria-label="Close"><X :size="18" /></button>
          </header>

          <div class="payd-body">

            <!-- ═══ 1. Identity ═══ -->
            <section class="payd-sec">
              <div class="payd-sec-head">
                <span class="payd-sec-no">1</span>
                <div><h3>Identity</h3><p>Name and code this reusable template.</p></div>
              </div>
              <div class="paym-grid2">
                <label class="paym-field" :style="{ '--i': 0 }">
                  <span>Code <i class="paym-req">*</i></span>
                  <input v-model="f.code" :disabled="isEdit"
                    @input="f.code=f.code.toUpperCase().replace(/\s+/g,'-')" placeholder="STR-PERM-SR" />
                </label>
                <label class="paym-field" :style="{ '--i': 1 }">
                  <span>Name <i class="paym-req">*</i></span>
                  <input v-model="f.name" placeholder="Permanent — Senior" />
                </label>
              </div>
              <label class="paym-field" :style="{ '--i': 2 }">
                <span>Description</span>
                <input v-model="f.description" placeholder="Optional — who this structure is for" />
              </label>
            </section>

            <!-- ═══ 2. Validity ═══ -->
            <section class="payd-sec">
              <div class="payd-sec-head">
                <span class="payd-sec-no">2</span>
                <div><h3>Validity</h3><p>When this structure becomes effective.</p></div>
              </div>
              <div class="paym-grid2">
                <label class="paym-field" :style="{ '--i': 0 }">
                  <span>Pay scale</span>
                  <input v-model="f.pay_scale" placeholder="Optional" />
                </label>
                <div class="paym-field" :style="{ '--i': 1 }">
                  <span>Effective from</span>
                  <HrDatePicker v-model="f.effective_from" />
                </div>
              </div>
              <label class="paym-tg" :style="{ '--i': 2 }">
                <input type="checkbox" v-model="f.is_default" />
                <span>Set as default structure</span>
              </label>
              <label class="paym-tg" :style="{ '--i': 3 }">
                <input type="checkbox" v-model="f.pf_restrict_to_ceiling" />
                <span>Cap PF at the ₹15,000 ceiling (₹1,800/mo). Uncheck to compute PF as 12% of full Basic.</span>
              </label>
              <p class="payd-pf-hint">{{ f.pf_restrict_to_ceiling
                ? 'PF = 12% of ₹15,000 = ₹1,800 each side (statutory minimum — maximises take-home).'
                : 'PF = 12% of actual Basic (higher retirement corpus, lower take-home; reduces Special Allowance to keep CTC fixed).' }}</p>
            </section>

            <!-- ═══ 3. Components ═══ -->
            <section class="payd-sec">
              <div class="payd-sec-head">
                <span class="payd-sec-no">3</span>
                <div><h3>Components</h3><p>Pick pay components and tune each split.</p></div>
              </div>

              <div class="payd-builder">
                <div class="payd-add">
                  <Plus :size="15" class="payd-add-ic" />
                  <select @change="onAddSelect">
                    <option value="" selected disabled>Add a pay component…</option>
                    <option v-for="c in availableCatalog" :key="c.id" :value="c.id">{{ c.name }} ({{ c.code }})</option>
                  </select>
                  <ChevronDown :size="15" class="payd-add-caret" />
                </div>

                <TransitionGroup name="payd-row" tag="ul" class="payd-list">
                  <li v-for="(row, i) in sortedSelected" :key="row.component_id"
                    class="payd-row" :style="{ '--i': i }">
                    <span class="payd-seq">{{ row.sequence }}</span>
                    <span class="pay-cat" :class="categoryMeta(row.component_type).cat">{{ row.component_code }}</span>
                    <span class="payd-cn">{{ row.component_name }}</span>

                    <!-- contextual control -->
                    <div class="payd-ctrl">
                      <div v-if="row.calc_type==='PERCENT_OF'" class="payd-ov" :class="{ filled: row.override_pct != null && row.override_pct !== '' }">
                        <Percent :size="12" class="payd-ov-ic" />
                        <input type="number" step="0.5" min="0" v-model.number="row.override_pct"
                          placeholder="0" title="Override percentage" />
                        <span class="payd-ov-unit">%</span>
                      </div>
                      <div v-else-if="row.calc_type==='FLAT'" class="payd-ov" :class="{ filled: row.override_flat_amount != null && row.override_flat_amount !== '' }">
                        <span class="payd-ov-unit pre">₹</span>
                        <input type="number" min="0" v-model.number="row.override_flat_amount"
                          placeholder="0" title="Override amount" />
                      </div>
                      <span v-else-if="row.calc_type==='BALANCE'" class="payd-tag balance"><Scale :size="11" /> Balance</span>
                      <span v-else-if="row.calc_type==='STATUTORY'" class="payd-tag stat"><ShieldCheck :size="11" /> Statutory</span>
                      <span v-else-if="row.calc_type==='FORMULA'" class="payd-tag formula"><Sigma :size="11" /> Formula</span>
                      <span v-else class="payd-tag">{{ row.calc_type }}</span>
                    </div>

                    <button class="payd-rm" @click="removeComp(row.component_id)" title="Remove"><X :size="13" /></button>
                  </li>
                </TransitionGroup>

                <p v-if="!selected.length" class="payd-empty">No components added yet — start from the picker above.</p>
              </div>
            </section>

            <!-- ═══ 4. Live preview ═══ -->
            <section class="payd-sec">
              <div class="payd-sec-head">
                <span class="payd-sec-no">4</span>
                <div><h3>Live preview</h3><p>Computes from your in-drawer edits — no save needed.</p></div>
              </div>

              <div class="payd-preview">
                <div class="payd-pv-head">
                  <span class="payd-pv-title">Breakdown</span>
                  <label class="payd-ctc">
                    <span>CTC ₹</span>
                    <input type="number" v-model.number="ctc" />
                  </label>
                  <button class="paym-btn primary payd-compute"
                    :disabled="!selected.length || previewing" @click="runPreview">
                    {{ previewing ? '…' : 'Compute' }}
                  </button>
                </div>

                <transition name="paym-fade" mode="out-in">
                  <div v-if="preview" key="body" class="payd-pv-body">
                    <TransitionGroup name="payd-row" tag="div" class="payd-pv-rows">
                      <div v-for="(l, i) in preview.lines" :key="l.component_code"
                        class="payd-pv-row" :style="{ '--i': i }">
                        <div class="payd-pv-left">
                          <span class="pay-cat" :class="categoryMeta(l.component_type).cat">{{ l.component_code }}</span>
                          <span class="payd-pv-name">{{ l.component_name }}</span>
                          <span v-if="l.calc_note" class="payd-pv-note">{{ l.calc_note }}</span>
                        </div>
                        <PayMoneyValue :value="l.amount" :animate="false" />
                      </div>
                    </TransitionGroup>

                    <div class="payd-totals">
                      <div class="payd-tot"><span>Gross</span><PayMoneyValue :value="preview.gross_earnings" :animate="false" /></div>
                      <div class="payd-tot"><span>Deductions</span><PayMoneyValue tone="deduction" :value="preview.total_deductions" :animate="false" /></div>
                      <div class="payd-tot net"><span>Net</span><PayMoneyValue tone="net" :value="preview.net_pay" :animate="false" /></div>
                      <div class="payd-tot"><span>Employer</span><PayMoneyValue :value="preview.employer_contributions" :animate="false" /></div>
                      <div class="payd-tot"><span>CTC</span><PayMoneyValue :value="preview.ctc_value" :animate="false" /></div>
                    </div>
                  </div>
                  <p v-else key="empty" class="payd-pv-empty">Add components and hit Compute to see the live split.</p>
                </transition>
              </div>
            </section>

            <!-- ═══ 5. How this structure works ═══ -->
            <section class="payd-sec">
              <div class="payd-sec-head">
                <span class="payd-sec-no">5</span>
                <div><h3>How this structure works</h3><p>A quick primer for corporate payroll.</p></div>
              </div>

              <div class="payd-explain">
                <ul>
                  <li><b>Reusable template.</b> A structure is a named bundle of pay components you assign to many employees — change it once, roll it everywhere.</li>
                  <li><b>Percentages slice the CTC.</b> PERCENT_OF components split the monthly CTC into Basic, HRA and other allowances.</li>
                  <li><b>Special Allowance absorbs the rest.</b> The BALANCE component soaks up the remainder, so GROSS and CTC stay fixed while you re-slice Basic/HRA — line amounts move, totals can stay the same by design.</li>
                  <li><b>Statutory is automatic.</b> PF, ESI, PT and TDS deductions apply on their own; PF is wage-capped, so it won't scale past the statutory ceiling.</li>
                  <li><b>Employer sits on top.</b> Employer PF/ESI contributions add ON TOP of gross to form the CTC — they aren't taken from the employee's pay.</li>
                </ul>
              </div>
            </section>
          </div>

          <!-- sticky footer -->
          <footer class="payd-foot">
            <button class="paym-btn ghost" @click="$emit('close')">Cancel</button>
            <button class="paym-btn primary" :disabled="saving || !f.code || !f.name" @click="save">
              {{ saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create structure') }}
            </button>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { X, Plus, ChevronDown, Percent, Scale, ShieldCheck, Sigma } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  categoryMeta, fetchComponents, createStructure, updateStructure,
  addStructureComponent, deleteStructureComponent, previewStructure,
} from '@/composables/usePayroll'

const props = defineProps({ open: Boolean, structure: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const blank = () => ({ code: '', name: '', description: '', pay_scale: '', effective_from: '', is_default: false, pf_restrict_to_ceiling: true })
const f = ref(blank())
const selected = ref([])
const catalog = ref([])
const ctc = ref(100000)
const preview = ref(null)
const previewing = ref(false)
const saving = ref(false)
const isEdit = computed(() => !!props.structure)
const availableCatalog = computed(() => catalog.value.filter(c => !selected.value.some(s => s.component_id === c.id)))

const loadCatalog = async () => {
  try { catalog.value = (await fetchComponents({ is_active: true, limit: 200 })).items || [] } catch {}
}
watch(() => props.open, async (o) => {
  if (!o) return
  await loadCatalog()
  preview.value = null
  if (props.structure) {
    const s = props.structure
    f.value = { code: s.code, name: s.name, description: s.description || '', pay_scale: s.pay_scale || '',
      effective_from: s.effective_from || '', is_default: s.is_default, pf_restrict_to_ceiling: s.pf_restrict_to_ceiling !== false }
    selected.value = (s.components || []).map(l => ({
      link_id: l.id, component_id: l.component_id, component_code: l.component_code,
      component_name: l.component_name, component_type: l.component_type, calc_type: l.calc_type,
      sequence: l.sequence, override_pct: l.override_percent_value != null ? Number(l.override_percent_value) * 100 : null,
      override_flat_amount: l.override_flat_amount,
    }))
    // auto-show the breakdown for an existing structure with components
    if (selected.value.length) { await nextTick(); runPreview() }
  } else { f.value = blank(); selected.value = [] }
})

// Read the chosen id straight off the event and snap the native <select> back to
// its placeholder on the DOM — this avoids the v-model null-reset race that left
// the second add silently failing to fire `change`.
const onAddSelect = (e) => {
  const id = e.target.value
  e.target.value = ''            // reset first so every subsequent pick re-fires change
  if (!id) return
  if (selected.value.some(s => String(s.component_id) === String(id))) return
  const c = catalog.value.find(x => String(x.id) === String(id))
  if (!c) return
  // Default the per-structure sequence to the component's OWN registry sequence
  // (so e.g. Medical Allowance @39 slots between HRA @20 and Special @40), not a
  // positional (count+1)*10 that dumped every new head at the bottom.
  const seq = c.sequence != null ? c.sequence : (selected.value.length + 1) * 10
  selected.value.push({ component_id: c.id, component_code: c.code, component_name: c.name,
    component_type: c.component_type, calc_type: c.calc_type,
    sequence: seq, override_pct: null, override_flat_amount: null })
}
// Render the builder ordered by sequence so a newly-added head appears in its real
// calculation position. Spread keeps the same row objects, so v-model edits still bind.
const sortedSelected = computed(() => [...selected.value].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)))
const removeComp = (componentId) => {
  const i = selected.value.findIndex(s => s.component_id === componentId)
  if (i >= 0) selected.value.splice(i, 1)
}

const runPreview = async () => {
  if (!selected.value.length) { toast.error('Add at least one component to preview'); return }
  previewing.value = true
  try {
    preview.value = await previewStructure({
      structure_id: props.structure?.id || null,
      components: selected.value.map(r => ({
        component_id: r.component_id,
        sequence: r.sequence,
        override_percent_value: r.override_pct != null ? r.override_pct / 100 : null,
        override_flat_amount: r.override_flat_amount ?? null,
      })),
      monthly_ctc: ctc.value,
      regime: 'NEW',
      pf_restrict_to_ceiling: f.value.pf_restrict_to_ceiling,
    })
  } catch (e) { toast.error(e?.response?.data?.detail || 'Preview failed') }
  finally { previewing.value = false }
}

// Re-run the live impact when the PF policy is toggled (if already previewing).
watch(() => f.value.pf_restrict_to_ceiling, () => { if (preview.value) runPreview() })

const save = async () => {
  saving.value = true
  try {
    const fields = { name: f.value.name, description: f.value.description, pay_scale: f.value.pay_scale,
      effective_from: f.value.effective_from || null, is_default: f.value.is_default,
      pf_restrict_to_ceiling: f.value.pf_restrict_to_ceiling }
    if (isEdit.value) {
      await updateStructure(props.structure.id, fields)
      const existing = props.structure.components || []
      // add new links
      for (const row of selected.value) {
        if (!row.link_id) await addStructureComponent(props.structure.id, {
          component_id: row.component_id, sequence: row.sequence,
          override_percent_value: row.override_pct != null ? row.override_pct / 100 : null,
          override_flat_amount: row.override_flat_amount ?? null })
      }
      // remove dropped links
      for (const ex of existing) {
        if (!selected.value.some(s => s.link_id === ex.id)) await deleteStructureComponent(props.structure.id, ex.id)
      }
    } else {
      await createStructure({ code: f.value.code, ...fields, components: selected.value.map(r => ({
        component_id: r.component_id, sequence: r.sequence,
        override_percent_value: r.override_pct != null ? r.override_pct / 100 : null,
        override_flat_amount: r.override_flat_amount ?? null })) })
    }
    toast.success(isEdit.value ? 'Structure updated' : 'Structure created')
    emit('saved'); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed') }
  finally { saving.value = false }
}
</script>

<style scoped>
/* ── shell ── */
.payd-overlay {
  position: fixed; inset: 0; z-index: 4000; display: flex; justify-content: flex-end;
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(245,158,11,0.14), transparent 55%),
    rgba(6,5,4,0.56);
  backdrop-filter: blur(8px) saturate(140%);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
}
.payd-panel {
  width: min(560px, 96vw); height: 100%; overflow-y: auto;
  display: flex; flex-direction: column;
  background:
    radial-gradient(120% 50% at 50% 0%, rgba(251,191,36,0.08), transparent 46%),
    var(--pay-surface-2);
  border-left: 1px solid var(--pay-border);
  box-shadow: -40px 0 120px -40px rgba(0,0,0,0.7);
}
.payd-panel::-webkit-scrollbar { width: 8px; }
.payd-panel::-webkit-scrollbar-thumb { background: var(--pay-border); border-radius: 8px; }
.payd-panel::-webkit-scrollbar-track { background: transparent; }

/* ── sticky header ── */
.payd-head {
  position: sticky; top: 0; z-index: 4; display: flex; align-items: flex-start; gap: 12px;
  padding: 22px 56px 16px 24px;
  background: var(--pay-surface-2); border-bottom: 1px solid var(--pay-border-soft);
}
.payd-foil { position: absolute; top: 0; left: 0; right: 0; height: 3px; overflow: hidden;
  background: linear-gradient(90deg, transparent, rgba(251,191,36,0.22), transparent); }
.payd-foil i { position: absolute; top: 0; bottom: 0; width: 40%;
  background: linear-gradient(90deg, transparent, var(--pay-mint-bright), var(--pay-amber), transparent);
  animation: pay-foil-sweep 3.4s var(--pay-ease) infinite; }
.payd-head-txt { min-width: 0; flex: 1; }
.payd-eyebrow {
  font-size: 10px; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; color: var(--pay-treasury);
}
.payd-title { margin: 4px 0 0; font-size: 19px; font-weight: 800; letter-spacing: -0.01em; color: var(--pay-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── body ── */
.payd-body { padding: 18px 24px 8px; display: flex; flex-direction: column; gap: 22px; flex: 1; }

/* ── sections ── */
.payd-sec { display: flex; flex-direction: column; gap: 14px;
  animation: pay-rise 0.5s var(--pay-ease) both; }
.payd-sec:nth-child(1) { animation-delay: 0.06s; }
.payd-sec:nth-child(2) { animation-delay: 0.12s; }
.payd-sec:nth-child(3) { animation-delay: 0.18s; }
.payd-sec:nth-child(4) { animation-delay: 0.24s; }
.payd-sec:nth-child(5) { animation-delay: 0.30s; }
.payd-sec-head { display: flex; align-items: center; gap: 11px; }
.payd-sec-no {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 8px; display: grid; place-items: center;
  font-family: var(--pay-mono); font-size: 12px; font-weight: 700; color: #1a1206;
  background: var(--pay-grad-cta); box-shadow: 0 4px 12px -4px rgba(245,158,11,0.5);
}
.payd-sec-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--pay-text); }
.payd-sec-head p { margin: 1px 0 0; font-size: 11px; color: var(--pay-text-muted); }

/* ── component builder ── */
.payd-builder {
  border: 1px solid var(--pay-border-soft); border-radius: 16px; padding: 14px;
  background: var(--pay-surface);
}
.payd-add { position: relative; display: flex; align-items: center; }
.payd-add-ic { position: absolute; left: 11px; color: var(--pay-treasury); pointer-events: none; z-index: 1; }
.payd-add-caret { position: absolute; right: 11px; color: var(--pay-text-muted); pointer-events: none; }
.payd-add select {
  width: 100%; height: 40px; box-sizing: border-box; appearance: none; -webkit-appearance: none;
  background: var(--hr-input-bg); border: 1px dashed var(--hr-input-border); border-radius: 11px;
  padding: 0 34px; color: var(--pay-text-2); font-size: 12.5px; font-weight: 600; outline: none; cursor: pointer;
  transition: border-color 180ms var(--pay-ease), background 180ms var(--pay-ease), box-shadow 180ms var(--pay-ease);
}
.payd-add select:hover { border-color: var(--pay-border); background: rgba(251,191,36,0.05); }
.payd-add select:focus { border-color: var(--hr-input-border-focus); border-style: solid;
  box-shadow: 0 0 0 3px rgba(251,191,36,0.12); }
.payd-list { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.payd-row {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 10px; border-radius: 11px;
  background: var(--hr-input-bg); border: 1px solid var(--pay-border-soft);
  transition: border-color 160ms var(--pay-ease), background 160ms var(--pay-ease);
}
.payd-row:hover { border-color: var(--pay-border); }
.payd-seq { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); width: 20px; flex-shrink: 0; }
.payd-cn { flex: 1; min-width: 0; font-size: 12.5px; color: var(--pay-text-2);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.payd-ctrl { flex-shrink: 0; display: flex; align-items: center; }
/* override pill (% / ₹) */
.payd-ov { display: inline-flex; align-items: center; gap: 6px; min-width: 92px; height: 34px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); border-radius: 10px; padding: 0 10px;
  transition: border-color 160ms var(--pay-ease), box-shadow 160ms var(--pay-ease), background 160ms var(--pay-ease); }
.payd-ov:hover { border-color: var(--pay-border); }
.payd-ov.filled { border-color: rgba(251,191,36,0.32); background: rgba(251,191,36,0.06); }
.payd-ov:focus-within { border-color: var(--hr-input-border-focus); box-shadow: 0 0 0 3px rgba(251,191,36,0.14); background: var(--hr-input-bg-focus); }
.payd-ov-ic { color: var(--pay-text-muted); flex-shrink: 0; }
.payd-ov:focus-within .payd-ov-ic { color: var(--pay-treasury); }
.payd-ov input { width: 100%; min-width: 30px; background: transparent; border: none; outline: none;
  color: var(--pay-text); font-size: 13px; font-family: var(--pay-mono); text-align: right;
  appearance: none; -moz-appearance: textfield; }
.payd-ov input::-webkit-outer-spin-button,
.payd-ov input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.payd-ov input::placeholder { color: var(--pay-text-muted); opacity: 0.6; }
.payd-ov-unit { font-size: 12.5px; font-weight: 700; color: var(--pay-treasury); flex-shrink: 0; }
.payd-ov-unit.pre { order: -1; }
/* read-only calc chips */
.payd-tag {
  display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; border-radius: 9px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase;
  font-family: var(--pay-mono); color: var(--pay-text-muted); background: var(--pay-surface); white-space: nowrap;
}
.payd-tag svg { opacity: 0.95; }
.payd-tag.balance { color: var(--pay-mint); background: rgba(251,191,36,0.13); }
.payd-tag.stat { color: var(--pay-statutory); background: var(--pay-statutory-soft); }
.payd-tag.formula { color: var(--pay-amber); background: rgba(245,158,11,0.13); }
.payd-rm {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 8px; border: 1px solid var(--pay-border-soft);
  background: var(--pay-surface); color: var(--pay-text-muted); cursor: pointer; display: grid; place-items: center;
  transition: color 160ms var(--pay-ease), border-color 160ms var(--pay-ease), background 160ms var(--pay-ease);
}
.payd-rm:hover { color: var(--pay-deduction); border-color: rgba(194,65,12,0.32); background: var(--pay-deduction-soft); }
.payd-empty { font-size: 12px; color: var(--pay-text-muted); margin: 12px 0 0; text-align: center; }

/* ── live preview card ── */
.payd-preview {
  border: 1px solid var(--pay-border); border-radius: 16px; padding: 16px;
  background:
    radial-gradient(120% 70% at 50% 0%, rgba(251,191,36,0.07), transparent 55%),
    var(--pay-surface);
}
.payd-pv-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.payd-pv-title { flex: 1; font-size: 13px; font-weight: 700; color: var(--pay-text); }
.payd-ctc { display: inline-flex; align-items: center; gap: 6px;
  background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 0 10px; height: 34px; }
.payd-ctc:focus-within { border-color: var(--hr-input-border-focus); box-shadow: 0 0 0 2px rgba(251,191,36,0.12); }
.payd-ctc span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.payd-ctc input { width: 92px; background: transparent; border: none; outline: none;
  color: var(--pay-text); font-size: 13px; font-family: var(--pay-mono); }
.payd-compute { height: 34px; padding: 0 16px; }

.payd-pv-rows { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.payd-pv-row {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 7px 10px; border-radius: 9px; background: var(--hr-input-bg); font-size: 12px;
}
.payd-pv-left { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: wrap; }
.payd-pv-name { color: var(--pay-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.payd-pv-note { font-size: 10.5px; color: var(--pay-text-muted); font-family: var(--pay-mono); }
.payd-totals {
  display: grid; grid-template-columns: 1fr 1fr; gap: 9px;
  border-top: 1px dashed var(--pay-border-soft); padding-top: 12px;
}
.payd-tot { display: flex; flex-direction: column; gap: 3px;
  background: var(--hr-input-bg); border: 1px solid var(--pay-border-soft); border-radius: 11px; padding: 9px 11px; }
.payd-tot span { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--pay-text-muted); }
.payd-tot.net { grid-column: span 2; border-color: rgba(52,211,153,0.28); background: var(--pay-net-soft); }
.payd-tot.net span { color: var(--pay-net); }
.payd-pv-empty { font-size: 12px; color: var(--pay-text-muted); margin: 0; text-align: center; padding: 8px 0; }

/* ── explainer ── */
.payd-explain {
  border: 1px solid var(--pay-border); border-radius: 14px; padding: 14px 16px;
  background: rgba(251,191,36,0.06);
}
.payd-explain ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.payd-explain li {
  position: relative; padding-left: 18px; font-size: 12px; line-height: 1.55; color: var(--pay-text-2);
}
.payd-explain li::before {
  content: ''; position: absolute; left: 0; top: 6px; width: 7px; height: 7px; border-radius: 50%;
  background: var(--pay-grad-cta); box-shadow: 0 0 0 3px rgba(251,191,36,0.12);
}
.payd-explain b { color: var(--pay-text); font-weight: 700; }

.payd-pf-hint { font-size: 11px; color: var(--pay-text-muted); margin: 2px 0 0; line-height: 1.45; }

/* ── sticky footer ── */
.payd-foot {
  position: sticky; bottom: 0; z-index: 4; display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 24px; background: var(--pay-surface-2); border-top: 1px solid var(--pay-border-soft);
}

/* ── row transition (builder + preview) ── */
.payd-row-enter-active { transition: opacity 0.4s var(--pay-ease), transform 0.4s var(--pay-ease);
  transition-delay: calc(var(--i, 0) * 40ms); }
.payd-row-leave-active { transition: opacity 0.25s var(--pay-ease), transform 0.25s var(--pay-ease); position: absolute; }
.payd-row-enter-from { opacity: 0; transform: translateX(16px); }
.payd-row-leave-to { opacity: 0; transform: translateX(-12px); }

@media (prefers-reduced-motion: reduce) {
  .payd-foil i { animation: none; }
  .payd-sec { animation: none; }
  .payd-row-enter-active, .payd-row-leave-active { transition: none; }
}
</style>
