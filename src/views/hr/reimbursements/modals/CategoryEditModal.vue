<template>
  <Teleport to="body">
    <div class="rmb-overlay" @mousedown.self="$emit('close')">
      <Motion as="div" class="cstudio" :style="{ '--acc': form.color_hex || '#fb923c' }"
              :initial="{ opacity: 0, scale: 0.94, y: 26 }"
              :animate="{ opacity: 1, scale: 1, y: 0 }"
              :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">

        <!-- ════ LEFT · live preview studio ════ -->
        <aside class="cs-preview">
          <span class="pv-orb a" aria-hidden="true" />
          <span class="pv-orb b" aria-hidden="true" />
          <span class="pv-grid" aria-hidden="true" />
          <span class="rmb-grain" aria-hidden="true" />

          <span class="pv-eyebrow rmb-mono"><Sparkles :size="11" /> LIVE PREVIEW</span>

          <!-- the resulting category card, rendered live -->
          <article class="pv-card rmb-receipt">
            <span class="pv-card-spine" aria-hidden="true" />
            <header class="pv-card-head">
              <span class="pv-card-ic"><component :is="previewIcon" :size="18" /></span>
              <div class="pv-card-id">
                <span class="pv-card-name">{{ form.name || 'Category name' }}</span>
                <span class="pv-card-code rmb-mono">{{ (form.code || 'CODE').toUpperCase() }}</span>
              </div>
              <span class="pv-card-state"><i />Live</span>
            </header>
            <p class="pv-card-desc">{{ form.description || 'A short description shows here.' }}</p>
            <div class="pv-card-flags">
              <span class="pv-flag" :class="{ on: form.requires_attachment }"><Paperclip :size="10" /> Receipt</span>
              <span class="pv-flag" :class="{ on: form.is_taxable }"><Percent :size="10" /> Taxable</span>
            </div>
            <div class="pv-card-pills">
              <TransitionGroup name="pill">
                <span v-for="f in validFields" :key="f._id" class="pv-pill">{{ f.label }}<i v-if="f.required">*</i></span>
              </TransitionGroup>
              <span v-if="!validFields.length" class="pv-pill ghost">core fields only</span>
            </div>
          </article>

          <!-- what the employee will fill -->
          <div class="pv-form">
            <span class="pv-form-lbl rmb-mono">EMPLOYEE FORM · {{ validFields.length }} field{{ validFields.length === 1 ? '' : 's' }}</span>
            <div class="pv-form-fields">
              <TransitionGroup name="pill">
                <div v-for="f in validFields" :key="f._id" class="pv-fauxfield">
                  <span class="pv-faux-lbl">{{ f.label }}<i v-if="f.required">*</i></span>
                  <span class="pv-faux-input" :data-type="f.type">
                    <component :is="typeIcon(f.type)" :size="12" />
                    <em>{{ typeHint(f) }}</em>
                  </span>
                </div>
              </TransitionGroup>
              <p v-if="!validFields.length" class="pv-form-empty">Add dynamic fields to shape the claim form.</p>
            </div>
          </div>
        </aside>

        <!-- ════ RIGHT · builder ════ -->
        <section class="cs-builder">
          <header class="b-head">
            <div>
              <span class="b-eyebrow rmb-mono">{{ editing ? 'EDIT CATEGORY' : 'NEW CATEGORY' }}</span>
              <h3>{{ stepTitles[step] }}</h3>
            </div>
            <button class="b-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <!-- step rail -->
          <div class="b-rail">
            <div class="b-track"><Motion as="div" class="b-fill" :animate="{ width: progress + '%' }" :transition="{ duration: 0.5, ease: [0.16,1,0.3,1] }" /></div>
            <div class="b-steps">
              <button v-for="(t, i) in stepTitles" :key="i" class="b-step" :class="{ on: i === step, done: i < step }"
                      @click="i < step && goTo(i)">
                <span class="b-step-no">{{ i < step ? '✓' : i + 1 }}</span>
                <span class="b-step-t">{{ t }}</span>
              </button>
            </div>
          </div>

          <div class="b-body">
            <Transition :name="slideDir" mode="out-in">
              <!-- ── Step 0 · Identity ── -->
              <div v-if="step === 0" key="s0" class="b-pane">
                <div class="row2">
                  <label class="fld"><span>Name<i class="req">*</i></span>
                    <input class="rmb-input" v-model="form.name" placeholder="e.g. Training & Courses" @input="onName" autofocus /></label>
                  <label class="fld"><span>Code<i v-if="!editing" class="req">*</i></span>
                    <input v-if="!editing" class="rmb-input mono" v-model="form.code" placeholder="TRAINING"
                           @input="codeTouched = true; form.code = clean(form.code)" />
                    <span v-else class="locked-code rmb-mono">{{ form.code }} <Lock :size="11" /></span>
                  </label>
                </div>
                <label class="fld"><span>Description</span>
                  <input class="rmb-input" v-model="form.description" placeholder="Short, friendly description shown to employees" /></label>

                <div class="fld">
                  <span>Accent colour</span>
                  <div class="swatches">
                    <Motion v-for="c in PRESETS" :key="c" as="button" type="button" class="sw" :class="{ on: form.color_hex === c }"
                            :style="{ '--c': c }" :whileHover="{ scale: 1.18, y: -2 }" :whileTap="{ scale: 0.9 }"
                            @click="form.color_hex = c" :aria-label="`Accent ${c}`">
                      <Check v-if="form.color_hex === c" :size="13" />
                    </Motion>
                    <label class="sw custom" :style="{ '--c': form.color_hex }" :title="form.color_hex">
                      <Pipette :size="13" />
                      <input type="color" v-model="form.color_hex" />
                    </label>
                  </div>
                </div>
              </div>

              <!-- ── Step 1 · Rules ── -->
              <div v-else-if="step === 1" key="s1" class="b-pane">
                <p class="pane-hint">How claims in this bucket behave during review &amp; payroll.</p>
                <button type="button" class="toggle-card" :class="{ on: form.requires_attachment }" @click="form.requires_attachment = !form.requires_attachment">
                  <span class="tc-ic"><Paperclip :size="16" /></span>
                  <span class="tc-txt"><b>Receipt required</b><small>Employees must attach an invoice or bill before they can submit.</small></span>
                  <span class="tgl"><i /></span>
                </button>
                <button type="button" class="toggle-card" :class="{ on: form.is_taxable }" @click="form.is_taxable = !form.is_taxable">
                  <span class="tc-ic"><Percent :size="16" /></span>
                  <span class="tc-txt"><b>Taxable on payslip</b><small>Settled amounts are treated as a taxable perquisite in payroll.</small></span>
                  <span class="tgl"><i /></span>
                </button>
              </div>

              <!-- ── Step 2 · Dynamic fields ── -->
              <div v-else-if="step === 2" key="s2" class="b-pane">
                <div class="schema-head">
                  <p class="pane-hint" style="margin:0">Custom fields shown on the claim form for this category.</p>
                  <Motion as="button" type="button" class="rmb-btn rmb-btn-ghost sm" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="addField">
                    <Plus :size="13" /> Add field
                  </Motion>
                </div>
                <TransitionGroup name="frow" tag="div" class="frows">
                  <div v-for="(f, i) in form.field_schema" :key="f._id" class="frow rmb-receipt">
                    <span class="frow-grip" aria-hidden="true">{{ i + 1 }}</span>
                    <div class="frow-main">
                      <input class="rmb-input sm" v-model="f.label" placeholder="Field label" @input="f.key = slug(f.label)" />
                      <select class="rmb-input sm" v-model="f.type">
                        <option value="text">Text</option><option value="number">Number</option>
                        <option value="date">Date</option><option value="currency">Currency</option>
                        <option value="select">Dropdown</option><option value="textarea">Long text</option>
                      </select>
                      <input v-if="f.type === 'select'" class="rmb-input sm opts" :value="(f.options||[]).join(', ')"
                             @input="f.options = $event.target.value.split(',').map(s => s.trim()).filter(Boolean)" placeholder="Option A, Option B" />
                    </div>
                    <label class="req-chk" :class="{ on: f.required }"><input type="checkbox" v-model="f.required" /> req</label>
                    <button type="button" class="frow-rm" @click="removeField(i)" aria-label="Remove field"><X :size="14" /></button>
                  </div>
                </TransitionGroup>
                <div v-if="!form.field_schema.length" class="schema-empty">
                  <ListTree :size="22" />
                  <span>No custom fields yet — the claim form will show only the core amount, date &amp; vendor.</span>
                </div>
              </div>

              <!-- ── Step 3 · Review ── -->
              <div v-else key="s3" class="b-pane">
                <article class="rev rmb-receipt">
                  <header class="rev-head"><span class="rmb-mono">SUMMARY</span>
                    <span class="rev-cat" :style="{ color: form.color_hex }">{{ form.name || '—' }}</span></header>
                  <hr class="rmb-perf-line" />
                  <div class="rev-row"><span>Code</span><b class="rmb-mono">{{ (form.code || '—').toUpperCase() }}</b></div>
                  <div class="rev-row"><span>Description</span><b class="muted">{{ form.description || '—' }}</b></div>
                  <div class="rev-row"><span>Receipt required</span><b :class="form.requires_attachment ? 'yes' : 'no'">{{ form.requires_attachment ? 'Yes' : 'No' }}</b></div>
                  <div class="rev-row"><span>Taxable</span><b :class="form.is_taxable ? 'yes' : 'no'">{{ form.is_taxable ? 'Yes' : 'No' }}</b></div>
                  <div class="rev-row"><span>Dynamic fields</span><b>{{ validFields.length }} defined</b></div>
                </article>
                <p class="rev-note"><Info :size="13" /> {{ editing ? 'Saving updates this category everywhere it is used.' : 'This bucket becomes available on every new claim instantly.' }}</p>
              </div>
            </Transition>
            <p v-if="err" class="err"><AlertCircle :size="13" /> {{ err }}</p>
          </div>

          <footer class="b-foot">
            <button v-if="step > 0" class="rmb-btn rmb-btn-ghost" @click="prev"><ChevronLeft :size="15" /> Back</button>
            <span class="spacer" />
            <Motion v-if="step < lastStep" as="button" class="rmb-btn rmb-btn-primary" :class="{ disabled: !canNext }"
                    :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="next">
              Continue <ChevronRight :size="15" />
            </Motion>
            <Motion v-else as="button" class="rmb-btn rmb-btn-primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
                    :disabled="busy" @click="save">
              <Check :size="15" /> {{ busy ? 'Saving…' : (editing ? 'Save changes' : 'Create category') }}
            </Motion>
          </footer>
        </section>
      </Motion>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  X, Plus, Check, ChevronLeft, ChevronRight, Lock, Pipette, Sparkles, Paperclip, Percent,
  ListTree, Info, AlertCircle, Type, Hash, Calendar, IndianRupee, ChevronsUpDown, AlignLeft,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { createCategory, updateCategory, categoryMeta, errText } from '@/composables/useReimbursements'

const props = defineProps({ category: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const editing = !!props.category

const PRESETS = ['#fb923c', '#fbbf24', '#3b82f6', '#8b5cf6', '#14b8a6', '#ef4444', '#22c55e', '#f0abfc']

let _fid = 0
const withId = (f) => ({ key: '', label: '', type: 'text', required: false, options: [], ...f, _id: ++_fid })

const form = reactive({
  name: props.category?.name || '', code: props.category?.code || '',
  description: props.category?.description || '', color_hex: props.category?.color_hex || '#fb923c',
  requires_attachment: props.category?.requires_attachment ?? true,
  is_taxable: props.category?.is_taxable ?? false,
  field_schema: (props.category?.field_schema || []).map(withId),
})

const stepTitles = ['Identity', 'Rules', 'Dynamic fields', 'Review']
const lastStep = stepTitles.length - 1
const step = ref(0)
const slideDir = ref('wz-fwd')
const codeTouched = ref(editing)
const busy = ref(false)
const err = ref('')

const progress = computed(() => ((step.value + 1) / stepTitles.length) * 100)
const validFields = computed(() => form.field_schema.filter(f => f.key && f.label))
const canNext = computed(() => {
  if (step.value === 0) return !!form.name.trim() && (editing || !!form.code.trim())
  return true
})

const previewIcon = computed(() => categoryMeta((form.code || '').toUpperCase()).icon)

const slug = (s) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const clean = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9_]+/g, '_').replace(/^_+/, '')
function onName() {
  if (!editing && !codeTouched.value) form.code = clean(form.name)
}

const TYPE_ICONS = { text: Type, number: Hash, date: Calendar, currency: IndianRupee, select: ChevronsUpDown, textarea: AlignLeft }
const typeIcon = (t) => TYPE_ICONS[t] || Type
const typeHint = (f) => {
  if (f.type === 'select') return (f.options && f.options.length) ? f.options[0] + '…' : 'Select…'
  if (f.type === 'date') return 'dd / mm / yyyy'
  if (f.type === 'currency') return '₹ 0.00'
  if (f.type === 'number') return '0'
  if (f.type === 'textarea') return 'Long text…'
  return 'Text…'
}

function addField() { form.field_schema.push(withId()) }
function removeField(i) { form.field_schema.splice(i, 1) }

function next() { if (!canNext.value) return; slideDir.value = 'wz-fwd'; step.value++ }
function prev() { slideDir.value = 'wz-back'; step.value-- }
function goTo(i) { slideDir.value = i < step.value ? 'wz-back' : 'wz-fwd'; step.value = i }

async function save() {
  err.value = ''
  if (!form.name.trim() || (!editing && !form.code.trim())) { err.value = 'Name and code are required.'; step.value = 0; return }
  busy.value = true
  try {
    const payload = {
      name: form.name, description: form.description, color_hex: form.color_hex,
      requires_attachment: form.requires_attachment, is_taxable: form.is_taxable,
      field_schema: validFields.value.map(f => ({
        key: f.key, label: f.label, type: f.type, required: !!f.required,
        ...(f.type === 'select' ? { options: f.options || [] } : {}),
      })),
    }
    if (editing) await updateCategory(props.category.id, payload)
    else await createCategory({ ...payload, code: form.code })
    toast.success(editing ? 'Category updated' : 'Category created')
    emit('saved'); emit('close')
  } catch (e) { err.value = errText(e, 'Save failed') }
  finally { busy.value = false }
}
</script>

<style scoped>
.rmb-overlay { position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 24px;
  background: rgba(0,0,0,0.58); backdrop-filter: blur(9px); }
[data-theme="light"] .rmb-overlay { background: rgba(40,25,10,0.34); }

.cstudio { width: min(880px, 96vw); max-height: 92vh; display: grid; grid-template-columns: 312px 1fr; overflow: hidden;
  border-radius: 22px; border: 1px solid var(--rmb-border-strong); box-shadow: var(--rmb-glass-shadow);
  background: var(--rmb-glass-deep); backdrop-filter: var(--rmb-glass-blur); }

/* ════ left preview ════ */
.cs-preview { position: relative; padding: 22px 20px; overflow: hidden; display: flex; flex-direction: column; gap: 16px;
  background: linear-gradient(165deg, color-mix(in srgb, var(--acc) 12%, var(--rmb-paper-elevated)), var(--rmb-paper));
  border-right: 1px solid var(--rmb-border-soft); }
.pv-orb { position: absolute; border-radius: 50%; filter: blur(48px); pointer-events: none; transition: background 0.6s; }
.pv-orb.a { width: 220px; height: 220px; top: -90px; left: -50px; opacity: 0.4;
  background: radial-gradient(circle, color-mix(in srgb, var(--acc) 80%, transparent), transparent 70%); animation: pv-drift 16s ease-in-out infinite; }
.pv-orb.b { width: 200px; height: 200px; bottom: -80px; right: -40px; opacity: 0.28;
  background: radial-gradient(circle, color-mix(in srgb, var(--acc) 60%, transparent), transparent 70%); animation: pv-drift 21s ease-in-out infinite reverse; }
.pv-grid { position: absolute; inset: 0; opacity: 0.4; pointer-events: none;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 30px 30px; -webkit-mask: radial-gradient(120% 90% at 30% 10%, #000, transparent 72%); mask: radial-gradient(120% 90% at 30% 10%, #000, transparent 72%); }
.pv-eyebrow { position: relative; z-index: 2; display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px;
  letter-spacing: 0.18em; color: color-mix(in srgb, var(--acc) 60%, var(--rmb-text-muted)); }

/* live card */
.pv-card { position: relative; z-index: 2; padding: 14px 15px 14px 18px; display: flex; flex-direction: column; gap: 9px; --cat: var(--acc);
  background: linear-gradient(165deg, var(--rmb-paper-elevated), var(--rmb-paper));
  box-shadow: 0 18px 40px -26px color-mix(in srgb, var(--acc) 50%, rgba(0,0,0,0.6)); }
.pv-card-spine { position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 25%, transparent)); box-shadow: 0 0 12px -1px var(--acc); }
.pv-card-head { display: flex; align-items: center; gap: 10px; }
.pv-card-ic { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; flex: 0 0 auto;
  color: var(--acc); background: color-mix(in srgb, var(--acc) 16%, transparent); transition: color 0.4s, background 0.4s; }
.pv-card-id { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pv-card-name { font-weight: 700; font-size: 13.5px; color: var(--rmb-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pv-card-code { font-size: 9.5px; color: var(--rmb-text-muted); letter-spacing: 0.5px; }
.pv-card-state { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase;
  color: var(--rmb-st-approved); padding: 3px 8px; border-radius: 999px; background: var(--rmb-st-approved-soft); }
.pv-card-state i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; animation: rmb-pulse-dot 2.2s ease-in-out infinite; }
.pv-card-desc { margin: 0; font-size: 11px; color: var(--rmb-text-muted); line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 30px; }
.pv-card-flags { display: flex; gap: 6px; }
.pv-flag { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 600; padding: 3px 7px; border-radius: 6px;
  border: 1px dashed var(--rmb-border-strong); color: var(--rmb-text-muted); opacity: 0.5; transition: all 0.3s var(--rmb-spring); }
.pv-flag.on { opacity: 1; border-style: solid; color: var(--acc); background: color-mix(in srgb, var(--acc) 12%, transparent);
  border-color: color-mix(in srgb, var(--acc) 35%, transparent); }
.pv-card-pills { display: flex; flex-wrap: wrap; gap: 5px; min-height: 20px; }
.pv-pill { display: inline-flex; align-items: center; font-size: 10px; padding: 2px 8px; border-radius: 999px; color: var(--rmb-text-secondary);
  background: color-mix(in srgb, var(--acc) 10%, var(--rmb-surface)); border: 1px solid var(--rmb-border-soft); }
.pv-pill i { color: var(--rmb-st-rejected); font-style: normal; margin-left: 1px; }
.pv-pill.ghost { color: var(--rmb-text-muted); font-style: italic; background: transparent; border-style: dashed; }

/* employee form preview */
.pv-form { position: relative; z-index: 2; margin-top: auto; }
.pv-form-lbl { font-size: 8.5px; letter-spacing: 0.12em; color: var(--rmb-text-muted); opacity: 0.7; }
.pv-form-fields { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; max-height: 168px; overflow-y: auto; padding-right: 2px; }
.pv-fauxfield { display: flex; flex-direction: column; gap: 3px; }
.pv-faux-lbl { font-size: 10px; font-weight: 600; color: var(--rmb-text-secondary); }
.pv-faux-lbl i { color: var(--rmb-st-rejected); font-style: normal; margin-left: 2px; }
.pv-faux-input { display: flex; align-items: center; gap: 6px; padding: 7px 9px; border-radius: 8px; font-size: 11px;
  color: var(--rmb-text-muted); background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.pv-faux-input em { font-style: normal; opacity: 0.7; }
.pv-form-empty { font-size: 10.5px; color: var(--rmb-text-muted); font-style: italic; margin: 0; }

/* ════ right builder ════ */
.cs-builder { display: flex; flex-direction: column; min-width: 0; }
.b-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 22px 6px; }
.b-eyebrow { font-size: 9.5px; letter-spacing: 0.2em; color: var(--rmb-st-returned); }
.b-head h3 { margin: 4px 0 0; font-size: 19px; color: var(--rmb-text); }
.b-x { background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted);
  width: 32px; height: 32px; border-radius: 9px; cursor: pointer; display: grid; place-items: center; transition: 0.2s; flex: 0 0 auto; }
.b-x:hover { color: var(--rmb-text); border-color: var(--rmb-border-strong); }

/* step rail */
.b-rail { padding: 8px 22px 4px; }
.b-track { height: 4px; border-radius: 4px; background: var(--rmb-surface); overflow: hidden; }
.b-fill { height: 100%; background: var(--hr-gradient-hero); border-radius: 4px; }
.b-steps { display: flex; gap: 4px; margin-top: 10px; }
.b-step { flex: 1; display: flex; align-items: center; gap: 6px; padding: 5px 4px; background: none; border: none; cursor: default;
  color: var(--rmb-text-muted); border-radius: 8px; transition: color 0.25s; min-width: 0; }
.b-step.done { cursor: pointer; }
.b-step-no { width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; flex: 0 0 auto;
  font-size: 10px; font-weight: 700; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); transition: all 0.3s var(--rmb-spring); }
.b-step.on { color: var(--rmb-text); }
.b-step.on .b-step-no { background: var(--rmb-st-pending); color: #2a1a06; border-color: transparent; transform: scale(1.08); }
.b-step.done .b-step-no { background: var(--rmb-st-approved); color: #06281c; border-color: transparent; }
.b-step-t { font-size: 11px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.b-body { padding: 16px 22px; overflow-y: auto; flex: 1; min-height: 268px; }
.b-pane { display: flex; flex-direction: column; gap: 14px; }
.pane-hint { margin: 0; font-size: 12px; color: var(--rmb-text-muted); }

.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fld { display: flex; flex-direction: column; gap: 6px; }
.fld > span { font-size: 12px; font-weight: 600; color: var(--rmb-text-secondary); }
.req { color: var(--rmb-st-rejected); margin-left: 2px; }
.rmb-input { width: 100%; box-sizing: border-box; background: var(--hr-input-bg); color: var(--rmb-text);
  border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 9px 11px; font-size: 13px; font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
.rmb-input:focus { outline: none; border-color: var(--rmb-st-pending); box-shadow: 0 0 0 3px color-mix(in srgb, var(--rmb-st-pending) 14%, transparent); }
.rmb-input.mono { font-family: var(--rmb-mono); letter-spacing: 0.5px; }
[data-theme="light"] .rmb-input { background: rgba(40,25,10,0.04); border-color: rgba(40,25,10,0.14); }
.locked-code { display: inline-flex; align-items: center; gap: 6px; padding: 9px 11px; font-size: 13px; border-radius: 9px;
  background: var(--rmb-surface); border: 1px dashed var(--rmb-border-strong); color: var(--rmb-text-muted); }

/* swatches */
.swatches { display: flex; flex-wrap: wrap; gap: 8px; }
.sw { width: 30px; height: 30px; border-radius: 9px; cursor: pointer; display: grid; place-items: center; color: #fff;
  background: var(--c); border: 2px solid transparent; box-shadow: 0 4px 12px -6px var(--c); transition: border-color 0.2s; }
.sw.on { border-color: var(--rmb-text); }
.sw.custom { position: relative; overflow: hidden; background: var(--c); color: #fff; }
.sw.custom input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

/* toggle cards */
.toggle-card { display: flex; align-items: center; gap: 12px; padding: 14px 15px; border-radius: 13px; cursor: pointer; text-align: left;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); transition: border-color 0.25s, background 0.25s; }
.toggle-card:hover { border-color: var(--rmb-border-strong); }
.toggle-card.on { border-color: color-mix(in srgb, var(--acc) 45%, transparent); background: color-mix(in srgb, var(--acc) 7%, var(--rmb-surface)); }
.tc-ic { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; flex: 0 0 auto;
  background: var(--rmb-surface-elevated); color: var(--rmb-text-muted); transition: all 0.3s var(--rmb-spring); }
.toggle-card.on .tc-ic { color: var(--acc); background: color-mix(in srgb, var(--acc) 15%, transparent); transform: scale(1.05) rotate(-4deg); }
.tc-txt { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tc-txt b { font-size: 13.5px; color: var(--rmb-text); }
.tc-txt small { font-size: 11px; color: var(--rmb-text-muted); line-height: 1.35; }
.tgl { width: 42px; height: 24px; border-radius: 999px; flex: 0 0 auto; position: relative; background: var(--rmb-surface-elevated);
  border: 1px solid var(--rmb-border-strong); transition: background 0.3s; }
.toggle-card.on .tgl { background: var(--acc); border-color: transparent; }
.tgl i { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff;
  box-shadow: 0 2px 5px rgba(0,0,0,0.3); transition: transform 0.32s var(--rmb-spring); }
.toggle-card.on .tgl i { transform: translateX(18px); }

/* field builder */
.schema-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.rmb-btn.sm { padding: 6px 11px; font-size: 11.5px; }
.frows { display: flex; flex-direction: column; gap: 8px; }
.frow { display: flex; align-items: center; gap: 8px; padding: 9px 10px; }
.frow-grip { width: 20px; height: 20px; border-radius: 6px; display: grid; place-items: center; flex: 0 0 auto;
  font-family: var(--rmb-mono); font-size: 10px; color: var(--rmb-text-muted); background: var(--rmb-surface); }
.frow-main { flex: 1; display: flex; gap: 6px; min-width: 0; flex-wrap: wrap; }
.frow-main .rmb-input { flex: 1; min-width: 90px; }
.rmb-input.sm { padding: 7px 9px; font-size: 12px; }
.rmb-input.opts { flex: 1.4 1 130px; }
.req-chk { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--rmb-text-muted); cursor: pointer;
  padding: 5px 8px; border-radius: 7px; border: 1px solid var(--rmb-border-soft); transition: all 0.2s; flex: 0 0 auto; }
.req-chk.on { color: var(--rmb-st-pending); border-color: color-mix(in srgb, var(--rmb-st-pending) 40%, transparent); background: var(--rmb-st-pending-soft); }
.req-chk input { accent-color: var(--rmb-st-pending); }
.frow-rm { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; cursor: pointer; flex: 0 0 auto;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted); transition: all 0.2s; }
.frow-rm:hover { color: var(--rmb-st-rejected); border-color: color-mix(in srgb, var(--rmb-st-rejected) 40%, transparent); }
.schema-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 26px 20px; text-align: center;
  border: 1.5px dashed var(--rmb-border-strong); border-radius: 14px; color: var(--rmb-text-muted); }
.schema-empty span { font-size: 12px; max-width: 320px; }

/* review */
.rev { padding: 16px 18px; }
.rev-head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--rmb-text-muted); }
.rev-head .rev-cat { font-weight: 700; font-size: 13px; }
.rev-row { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0; font-size: 13px; color: var(--rmb-text-secondary); border-bottom: 1px dotted var(--rmb-perf-color); }
.rev-row:last-child { border-bottom: none; }
.rev-row b { color: var(--rmb-text); text-align: right; }
.rev-row b.muted { font-weight: 400; color: var(--rmb-text-muted); }
.rev-row b.yes { color: var(--rmb-st-approved); }
.rev-row b.no { color: var(--rmb-text-muted); }
.rev-note { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--rmb-text-muted); margin: 0; }

.err { display: flex; align-items: center; gap: 6px; color: var(--rmb-st-rejected); font-size: 12.5px; margin: 12px 0 0; }

.b-foot { display: flex; align-items: center; gap: 10px; padding: 14px 22px 18px; border-top: 1px solid var(--rmb-border-soft); }
.spacer { flex: 1; }
.rmb-btn.disabled { opacity: 0.5; pointer-events: none; }

/* transitions */
.wz-fwd-enter-active, .wz-fwd-leave-active, .wz-back-enter-active, .wz-back-leave-active { transition: all 0.32s var(--rmb-spring); }
.wz-fwd-enter-from { opacity: 0; transform: translateX(22px); }
.wz-fwd-leave-to { opacity: 0; transform: translateX(-18px); }
.wz-back-enter-from { opacity: 0; transform: translateX(-22px); }
.wz-back-leave-to { opacity: 0; transform: translateX(18px); }
.pill-enter-active, .pill-leave-active { transition: all 0.3s var(--rmb-spring); }
.pill-enter-from, .pill-leave-to { opacity: 0; transform: scale(0.6); }
.pill-leave-active { position: absolute; }
.frow-enter-active, .frow-leave-active { transition: all 0.34s var(--rmb-spring); }
.frow-enter-from { opacity: 0; transform: translateX(-16px); }
.frow-leave-to { opacity: 0; transform: translateX(24px); }

@keyframes pv-drift { 0%, 100% { translate: 0 0; } 50% { translate: 18px 16px; } }

@media (prefers-reduced-motion: reduce) {
  .pv-orb, .pv-card-state i { animation: none !important; }
}
@media (max-width: 820px) {
  .cstudio { grid-template-columns: 1fr; max-height: 94vh; overflow-y: auto; }
  .cs-preview { border-right: none; border-bottom: 1px solid var(--rmb-border-soft); flex-direction: row; flex-wrap: wrap; gap: 12px; }
  .pv-card { flex: 1 1 240px; }
  .pv-form { flex: 1 1 200px; margin-top: 0; }
  .pv-form-fields { max-height: 120px; }
}
@media (max-width: 480px) {
  .b-step-t { display: none; }
  .b-step { flex: 0 0 auto; }
  .b-steps { gap: 8px; }
}
</style>
