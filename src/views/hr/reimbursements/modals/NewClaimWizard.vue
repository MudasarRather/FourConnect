<template>
  <Teleport to="body">
    <div class="rmb-overlay" @mousedown.self="close">
      <Motion
        as="div" class="rmb-modal rmb-receipt" ref="modalRef"
        :initial="{ opacity: 0, scale: 0.94, y: 24 }"
        :animate="{ opacity: 1, scale: 1, y: 0 }"
        :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
      >
        <!-- cinematic atmosphere -->
        <span class="m-orb o1" aria-hidden="true" />
        <span class="m-orb o2" aria-hidden="true" />
        <span class="m-grid" aria-hidden="true" />
        <span class="rmb-spotlight" aria-hidden="true" />
        <span class="m-tape" aria-hidden="true" />
        <span class="rmb-grain" aria-hidden="true" />

        <!-- success stamp overlay -->
        <Transition name="m-done">
          <div v-if="done" class="m-done-overlay">
            <Motion as="div" class="m-done-stamp"
              :initial="{ scale: 1.6, opacity: 0, rotate: -16 }"
              :animate="{ scale: 1, opacity: 1, rotate: -7 }"
              :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
              <CheckCircle2 :size="34" />
              <b>SUBMITTED</b>
              <span class="rmb-mono">{{ doneNumber }}</span>
            </Motion>
            <span class="m-done-burst" aria-hidden="true"><i v-for="r in 10" :key="r" :style="burstStyle(r)" /></span>
          </div>
        </Transition>

        <header class="m-head">
          <div>
            <div class="eyebrow rmb-mono">NEW CLAIM</div>
            <h3>{{ stepTitles[step] }}</h3>
          </div>
          <button class="x" @click="close"><X :size="18" /></button>
        </header>

        <!-- step rail + progress -->
        <div class="steps-rail">
          <div class="track">
            <Motion as="div" class="fill" :animate="{ width: progress + '%' }" :transition="{ duration: 0.5, ease: [0.16,1,0.3,1] }">
              <span class="fill-glow" aria-hidden="true" />
            </Motion>
          </div>
          <div class="dots">
            <button v-for="(t, i) in stepTitles" :key="i" class="dot" type="button"
                    :class="{ on: i < step, cur: i === step }" :disabled="i > step" @click="goStep(i)">
              <span class="dot-core">{{ i + 1 }}</span>
              <span class="dot-lbl">{{ shortTitles[i] }}</span>
            </button>
          </div>
        </div>

        <div class="m-body">
          <Transition :name="slideDir" mode="out-in">
            <!-- Step 0 — pick category (search + scrollable grid for many categories) -->
            <div v-if="step === 0" key="s0" class="cat-step">
              <div class="cat-search">
                <Search :size="15" />
                <input type="text" v-model="catQuery" placeholder="Search categories…" />
                <span v-if="categories.length" class="cat-count rmb-mono">{{ filteredCats.length }}/{{ categories.length }}</span>
              </div>
              <div class="cat-grid">
                <Motion v-for="(c, i) in filteredCats" :key="c.id" as="button" class="cat-card rmb-receipt"
                        :class="{ sel: form.category_id === c.id }"
                        :style="{ '--cc': c.color_hex || catMeta(c.code).hex }"
                        :initial="{ opacity: 0, y: 14, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
                        :transition="{ delay: Math.min(i, 12) * 0.035, duration: 0.4, ease: [0.16, 1, 0.3, 1] }"
                        :whileHover="{ y: -3 }" :whileTap="{ scale: 0.97 }" @click="pickCategory(c)">
                  <span class="cc-sweep" aria-hidden="true" />
                  <span class="cat-ic"><component :is="catMeta(c.code).icon" :size="18" /></span>
                  <span class="cat-name">{{ c.name }}</span>
                  <span v-if="c.description" class="cat-desc">{{ c.description }}</span>
                  <Transition name="cc-check">
                    <span v-if="form.category_id === c.id" class="cc-check"><Check :size="12" :stroke-width="3" /></span>
                  </Transition>
                </Motion>
                <div v-if="!categories.length" class="loading rmb-mono">Loading categories…</div>
                <div v-else-if="!filteredCats.length" class="loading rmb-mono">No categories match “{{ catQuery }}”.</div>
              </div>

              <!-- travel gate (self): trip-linked expenses reconcile on the trip, not here -->
              <Motion v-if="form.category_id && isTravelCat && mode === 'self'" as="div" class="trip-gate"
                      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.35, ease: [0.16,1,0.3,1] }">
                <div class="tg-q"><Plane :size="14" /> Is this for a business trip you raised a travel request for?</div>
                <div class="tg-opts">
                  <button type="button" class="tg-opt" :class="{ on: tripLinked === 'yes' }" @click="tripLinked = 'yes'">Yes, it's for a trip</button>
                  <button type="button" class="tg-opt" :class="{ on: tripLinked === 'no' }" @click="tripLinked = 'no'">No — ad-hoc travel</button>
                </div>
                <Transition name="cc-check">
                  <div v-if="tripLinked === 'yes'" class="tg-redirect">
                    <p>Trip costs are reconciled on the trip itself — your <b>advance &amp; per-diem are netted there</b>, and a separate claim would <b>double-pay</b>. File your actual expenses on the trip and the overspend is reimbursed after approval.</p>
                    <button type="button" class="tg-go" @click="goTravel"><PlaneTakeoff :size="15" /> Open my travel trips <ArrowRight :size="14" /></button>
                  </div>
                </Transition>
                <p v-if="tripLinked === 'no'" class="tg-ok"><Check :size="13" :stroke-width="3" /> Ad-hoc travel, no travel request — continue below.</p>
              </Motion>

              <!-- admin: non-blocking caution -->
              <div v-else-if="form.category_id && isTravelCat && mode === 'admin'" class="tg-caution">
                <AlertTriangle :size="14" /> If a travel request exists for this trip, reconcile it in the Travel module — a separate claim may double-pay the advance.
              </div>
            </div>

            <!-- Step 1 — dynamic + core fields -->
            <div v-else-if="step === 1" key="s1" class="field-grid">
              <label class="rmb-field core">
                <span class="lbl">Amount (₹)<i class="req">*</i></span>
                <input type="text" inputmode="decimal" class="rmb-input no-spin" :value="form.amount"
                       @input="onAmount" @keydown="blockNonNumeric" placeholder="0.00" />
              </label>
              <div class="rmb-field core">
                <span class="lbl">Expense date<i class="req">*</i></span>
                <HrDatePicker :model-value="form.expense_date" :max="today" placeholder="dd / mm / yyyy"
                              @update:model-value="form.expense_date = $event" />
              </div>
              <label class="rmb-field">
                <span class="lbl">Vendor</span>
                <input type="text" class="rmb-input" v-model="form.vendor" placeholder="Who you paid" />
              </label>
              <label class="rmb-field">
                <span class="lbl">Cost center</span>
                <input type="text" class="rmb-input" v-model="form.cost_center" placeholder="Optional" />
              </label>
              <RmbDynamicField v-for="f in fieldSchema" :key="f.key" :spec="f"
                               v-model="form.details[f.key]" />
              <label class="rmb-field full">
                <span class="lbl">Description</span>
                <textarea class="rmb-input" rows="2" v-model="form.description" placeholder="What was this for?"></textarea>
              </label>
            </div>

            <!-- Step 2 — receipt upload -->
            <div v-else-if="step === 2" key="s2" class="upload-step">
              <label class="drop" :class="{ busy: uploading }">
                <input type="file" hidden accept="image/*,application/pdf" @change="onFile" />
                <Upload :size="26" />
                <span v-if="!uploading">Drop receipt / invoice or click to browse</span>
                <span v-else class="rmb-mono">Uploading… {{ uploadPct }}%</span>
              </label>
              <ul class="att-list">
                <li v-for="(a, i) in form.attachments" :key="i" class="att-item rmb-receipt">
                  <FileText :size="15" /> <span class="nm">{{ a.original_filename || 'receipt' }}</span>
                  <button class="rm" @click="form.attachments.splice(i, 1)"><X :size="14" /></button>
                </li>
              </ul>
              <p class="hint">PDF or image, up to 5 MB. Required when the policy mandates a receipt.</p>
            </div>

            <!-- Step 3 — review -->
            <div v-else key="s3" class="review-step">
              <article class="rmb-receipt review-slip">
                <header class="rev-head">
                  <span class="rmb-mono">PREVIEW</span>
                  <span class="cat" :style="{ color: selectedCat?.color_hex }">{{ selectedCat?.name }}</span>
                </header>
                <hr class="rmb-perf-line" />
                <div class="rev-row"><span>Amount</span><b class="rmb-mono">₹ {{ Number(form.amount || 0).toLocaleString('en-IN') }}</b></div>
                <div class="rev-row"><span>Expense date</span><b>{{ form.expense_date || '—' }}</b></div>
                <div class="rev-row" v-if="form.vendor"><span>Vendor</span><b>{{ form.vendor }}</b></div>
                <template v-for="f in fieldSchema" :key="f.key">
                  <div class="rev-row" v-if="form.details[f.key]"><span>{{ f.label }}</span><b>{{ form.details[f.key] }}</b></div>
                </template>
                <div class="rev-row" v-if="form.description"><span>Notes</span><b class="muted">{{ form.description }}</b></div>
                <div class="rev-row"><span>Receipts</span><b>{{ form.attachments.length }} attached</b></div>
              </article>
            </div>
          </Transition>
          <p v-if="err" class="err">{{ err }}</p>
        </div>

        <footer class="m-foot">
          <button v-if="step > 0" class="rmb-btn rmb-btn-ghost" @click="prev"><ChevronLeft :size="15" /> Back</button>
          <span class="spacer"></span>
          <Motion v-if="step < lastStep" as="button" class="rmb-btn rmb-btn-primary"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
                  :class="{ disabled: !canNext }" @click="next">
            Continue <ChevronRight :size="15" />
          </Motion>
          <Motion v-else as="button" class="rmb-btn rmb-btn-primary"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
                  :disabled="submitting" @click="submit">
            <Send :size="15" /> {{ submitting ? 'Submitting…' : 'Submit claim' }}
          </Motion>
        </footer>
      </Motion>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { X, ChevronLeft, ChevronRight, Upload, FileText, Send, Check, CheckCircle2, Search, Plane, PlaneTakeoff, ArrowRight, AlertTriangle } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import RmbDynamicField from '../components/RmbDynamicField.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  categoryMeta as catMeta, fetchMyCategories, fetchCategories,
  createMyClaim, adminCreateClaim, uploadClaimReceipt, errText,
} from '@/composables/useReimbursements'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  mode: { type: String, default: 'self' },      // 'self' | 'admin'
  employeeId: { type: String, default: null },   // required when mode === 'admin'
})
const emit = defineEmits(['close', 'created'])
const toast = useToast()
const router = useRouter()

const stepTitles = ['Pick a category', 'Claim details', 'Attach receipts', 'Review & submit']
const shortTitles = ['Category', 'Details', 'Receipts', 'Review']
const lastStep = 3
const step = ref(0)
const slideDir = ref('wz-fwd')

const modalRef = ref(null)
usePointerSpotlight(modalRef)

const done = ref(false)
const doneNumber = ref('')

const categories = ref([])
const catQuery = ref('')
const filteredCats = computed(() => {
  const q = catQuery.value.trim().toLowerCase()
  if (!q) return categories.value
  return categories.value.filter(c =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.code || '').toLowerCase().includes(q) ||
    (c.description || '').toLowerCase().includes(q))
})
const selectedCat = computed(() => categories.value.find(c => c.id === form.category_id) || null)
const fieldSchema = computed(() => selectedCat.value?.field_schema || [])

// Travel must reconcile on the trip (advance + per-diem netting), not as a standalone claim.
// In self mode we gate it: a trip-linked expense is redirected to the Travel module.
const isTravelCat = computed(() => String(selectedCat.value?.code || '').toUpperCase() === 'TRAVEL')
const tripLinked = ref(null)   // null | 'yes' | 'no'  (self mode only)
function goTravel() { emit('close'); router.push('/user/self-service/travel') }

const today = new Date().toISOString().slice(0, 10)
const form = reactive({
  category_id: null, amount: '', expense_date: '', vendor: '', cost_center: '',
  description: '', attachments: [], details: {},
})

const uploading = ref(false)
const uploadPct = ref(0)
const submitting = ref(false)
const err = ref('')

const progress = computed(() => ((step.value + 1) / stepTitles.length) * 100)
const canNext = computed(() => {
  if (step.value === 0) {
    if (!form.category_id) return false
    // a trip-linked travel expense must be filed on the trip, not here
    if (isTravelCat.value && props.mode === 'self') return tripLinked.value === 'no'
    return true
  }
  if (step.value === 1) return Number(form.amount) > 0 && !!form.expense_date
  return true
})

onMounted(async () => {
  try {
    const data = props.mode === 'admin' ? await fetchCategories() : await fetchMyCategories()
    categories.value = data.items || []
  } catch (e) { toast.error('Could not load claim categories') }
})

function pickCategory(c) {
  form.category_id = c.id
  form.details = {}
  tripLinked.value = null
}

// amount: digits + a single decimal point only, no spinner, no e/+/-
function sanitizeNum(v) {
  let s = String(v).replace(/[^\d.]/g, '')
  const i = s.indexOf('.')
  if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '')
  return s
}
function onAmount(e) {
  const clean = sanitizeNum(e.target.value)
  if (clean !== e.target.value) e.target.value = clean
  form.amount = clean
}
function blockNonNumeric(e) {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault()
}
function next() {
  if (!canNext.value) return
  slideDir.value = 'wz-fwd'; step.value++
}
function prev() { slideDir.value = 'wz-back'; step.value-- }
function goStep(i) {
  if (i > step.value) return          // only allow stepping back to completed stages
  slideDir.value = i < step.value ? 'wz-back' : 'wz-fwd'
  step.value = i
}

// deterministic confetti-spark burst around the success stamp
const burstStyle = (r) => {
  const ang = (r / 10) * Math.PI * 2
  const dist = 60 + (r % 3) * 16
  return {
    '--bx': (Math.cos(ang) * dist).toFixed(1) + 'px',
    '--by': (Math.sin(ang) * dist).toFixed(1) + 'px',
    animationDelay: (r * 0.03).toFixed(2) + 's',
  }
}

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { toast.error('File exceeds 5 MB'); return }
  uploading.value = true; uploadPct.value = 0
  try {
    const res = await uploadClaimReceipt(file, p => uploadPct.value = p)
    form.attachments.push({
      file_url: res.file_url, file_path: res.file_path,
      original_filename: res.original_filename || file.name, file_size: res.file_size,
    })
  } catch (e) { toast.error('Upload failed') }
  finally { uploading.value = false; e.target.value = '' }
}

async function submit() {
  err.value = ''
  submitting.value = true
  const payload = {
    category_id: form.category_id,
    amount: Number(form.amount),
    expense_date: form.expense_date,
    vendor: form.vendor || null,
    cost_center: form.cost_center || null,
    description: form.description || null,
    attachments: form.attachments,
    details: form.details,
  }
  try {
    let created
    if (props.mode === 'admin') {
      created = await adminCreateClaim({ ...payload, employee_id: props.employeeId })
    } else {
      created = await createMyClaim(payload)
    }
    toast.success(`Claim ${created.claim_number} submitted`)
    doneNumber.value = created.claim_number || ''
    done.value = true
    submitting.value = false
    setTimeout(() => { emit('created', created); emit('close') }, 1050)
    return
  } catch (e) {
    err.value = errText(e, 'Could not submit the claim')
    submitting.value = false
  }
}

function close() { emit('close') }
</script>

<style scoped>
.rmb-overlay {
  position: fixed; inset: 0; z-index: 4000; display: grid; place-items: center; padding: 24px;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(8px);
}
.rmb-modal {
  width: min(640px, 96vw); max-height: 90vh; display: flex; flex-direction: column;
  background: var(--rmb-glass-deep); backdrop-filter: var(--rmb-glass-blur);
  border: 1px solid var(--rmb-border-strong); box-shadow: var(--rmb-glass-shadow);
  border-radius: 18px; overflow: hidden;
}
.m-head { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 22px 8px; }
.steps-rail { position: relative; z-index: 2; }
.eyebrow { font-size: 10px; letter-spacing: 2.5px; color: var(--rmb-st-returned); }
.m-head h3 { margin: 4px 0 0; font-size: 19px; color: var(--rmb-text); }
.x { background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-muted);
  width: 32px; height: 32px; border-radius: 9px; cursor: pointer; display: grid; place-items: center; }
.x:hover { color: var(--rmb-text); }
.steps-rail { padding: 8px 22px 0; }
.track { position: relative; height: 4px; border-radius: 4px; background: var(--rmb-surface); overflow: hidden; }
.fill { position: relative; height: 100%; background: var(--hr-gradient-hero); border-radius: 4px; overflow: hidden; }
.fill-glow { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
  background-size: 220% 100%; animation: rmb-amount-shimmer 2.4s linear infinite; }
.dots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 12px; }
.dot { display: flex; flex-direction: column; align-items: center; gap: 5px; background: none; border: none; cursor: pointer; padding: 0; }
.dot:disabled { cursor: default; }
.dot-core { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-family: var(--rmb-mono); font-size: 11px; font-weight: 700;
  background: var(--rmb-surface-elevated); color: var(--rmb-text-muted); border: 1px solid var(--rmb-border-soft); transition: all 0.3s var(--rmb-spring); }
.dot-lbl { font-size: 9.5px; letter-spacing: 0.04em; color: var(--rmb-text-muted); transition: color 0.3s; }
.dot.on .dot-core { background: var(--rmb-st-approved-soft); color: var(--rmb-st-approved); border-color: transparent; }
.dot.cur .dot-core { background: var(--hr-gradient-hero); color: #1a1206; border-color: transparent;
  box-shadow: 0 0 0 4px var(--rmb-st-pending-soft); animation: rmb-pulse-dot 1.9s ease-in-out infinite; }
.dot.cur .dot-lbl, .dot.on .dot-lbl { color: var(--rmb-text); }
.m-body { position: relative; z-index: 2; padding: 18px 22px; overflow-y: auto; flex: 1; }
/* category step — search + scrollable compact grid (handles 30+ categories) */
.cat-step { display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.cat-search { position: relative; display: flex; align-items: center; gap: 9px; padding: 0 12px; height: 42px; border-radius: 11px;
  background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--rmb-text-muted); transition: border-color 0.2s, background 0.2s; }
.cat-search:focus-within { border-color: var(--rmb-st-pending); color: var(--rmb-st-pending); }
.cat-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: var(--rmb-text); font: inherit; font-size: 13px; }
.cat-search input::placeholder { color: var(--rmb-text-muted); }
.cat-count { font-size: 10.5px; color: var(--rmb-text-muted); padding: 2px 8px; border-radius: 999px; background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); white-space: nowrap; }
[data-theme="light"] .cat-search { background: rgba(40,25,10,0.04); border-color: rgba(40,25,10,0.14); }
.cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 10px;
  max-height: min(46vh, 380px); overflow-y: auto; padding: 2px; margin: -2px; }
.cat-grid::-webkit-scrollbar { width: 7px; }
.cat-grid::-webkit-scrollbar-thumb { background: var(--rmb-border-strong); border-radius: 8px; }
.cat-grid::-webkit-scrollbar-track { background: transparent; }
.cat-card { position: relative; padding: 13px; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 5px; overflow: hidden;
  border: 1px solid var(--rmb-paper-edge); border-radius: 12px; transition: border-color 0.25s, box-shadow 0.3s; will-change: transform; }
.cat-card:hover { border-color: color-mix(in srgb, var(--cc) 45%, var(--rmb-border-soft)); box-shadow: 0 14px 30px -22px color-mix(in srgb, var(--cc) 50%, rgba(0,0,0,0.5)); }
.cat-card.sel { border-color: var(--cc); box-shadow: 0 0 0 1px var(--cc), 0 12px 26px -18px color-mix(in srgb, var(--cc) 55%, transparent); }
.cc-sweep { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.3s;
  background: radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--cc) 20%, transparent), transparent 60%); }
.cat-card:hover .cc-sweep, .cat-card.sel .cc-sweep { opacity: 1; }
.cat-ic { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; position: relative; z-index: 1;
  color: var(--cc); background: color-mix(in srgb, var(--cc) 14%, transparent); transition: transform 0.35s var(--rmb-spring); }
.cat-card:hover .cat-ic, .cat-card.sel .cat-ic { transform: scale(1.1) rotate(-5deg); }
.cat-name { font-weight: 700; font-size: 12.5px; color: var(--rmb-text); position: relative; z-index: 1; }
.cat-desc { font-size: 10.5px; color: var(--rmb-text-muted); line-height: 1.3; position: relative; z-index: 1;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cc-check { position: absolute; top: 12px; right: 12px; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; z-index: 2;
  color: #1a1206; background: var(--cc); box-shadow: 0 4px 12px -4px var(--cc); }
.cc-check-enter-active { transition: all 0.4s var(--rmb-spring); }
.cc-check-leave-active { transition: all 0.2s ease; }
.cc-check-enter-from, .cc-check-leave-to { opacity: 0; transform: scale(0.2) rotate(-30deg); }
/* travel gate — redirect trip-linked expenses to the Travel module */
.trip-gate { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 13px;
  background: var(--rmb-surface); border: 1px solid var(--rmb-border-soft); }
.tg-q { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 650; color: var(--rmb-text); }
.tg-q svg { color: var(--rmb-st-pending); flex-shrink: 0; }
.tg-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.tg-opt { padding: 10px 12px; border-radius: 10px; font-size: 12.5px; font-weight: 650; cursor: pointer; font-family: inherit;
  background: var(--rmb-surface-elevated); border: 1px solid var(--rmb-border-soft); color: var(--rmb-text-secondary); transition: all 0.2s; }
.tg-opt:hover { border-color: var(--rmb-st-pending); color: var(--rmb-text); }
.tg-opt.on { border-color: var(--rmb-st-pending); color: var(--rmb-st-pending); background: var(--rmb-st-pending-soft); box-shadow: 0 0 0 1px var(--rmb-st-pending); }
.tg-redirect { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 11px;
  background: var(--rmb-st-pending-soft); border: 1px solid color-mix(in srgb, var(--rmb-st-pending) 32%, transparent); }
.tg-redirect p { margin: 0; font-size: 12px; line-height: 1.55; color: var(--rmb-text-secondary); }
.tg-redirect p b { color: var(--rmb-text); }
.tg-go { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 14px; border-radius: 10px;
  font-size: 12.5px; font-weight: 750; cursor: pointer; border: 1px solid transparent; color: #1a1206; background: var(--hr-gradient-hero); }
.tg-ok { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 12px; font-weight: 600; color: var(--rmb-st-approved); }
.tg-caution { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; padding: 11px 13px; border-radius: 11px; font-size: 12px; line-height: 1.5;
  color: var(--rmb-st-returned); background: var(--rmb-st-returned-soft); border: 1px solid color-mix(in srgb, var(--rmb-st-returned) 30%, transparent); }
.tg-caution svg { flex-shrink: 0; margin-top: 1px; }

.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field-grid .full { grid-column: 1 / -1; }
.rmb-field { display: flex; flex-direction: column; gap: 6px; }
.rmb-field .lbl { font-size: 11.5px; font-weight: 600; color: var(--rmb-text-secondary); }
.req { color: var(--rmb-st-rejected); margin-left: 3px; font-style: normal; }
.rmb-input { width: 100%; box-sizing: border-box; background: var(--hr-input-bg); color: var(--rmb-text);
  border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 9px 11px; font-size: 13px; font-family: inherit; }
.rmb-input:focus { outline: none; border-color: var(--rmb-st-pending); }
.no-spin::-webkit-outer-spin-button, .no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.no-spin { -moz-appearance: textfield; appearance: textfield; }
[data-theme="light"] .rmb-input { background: rgba(40,25,10,0.04); border-color: rgba(40,25,10,0.14); }
.upload-step { display: flex; flex-direction: column; gap: 12px; }
.drop { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 30px;
  border: 1.5px dashed var(--rmb-border-strong); border-radius: 14px; cursor: pointer;
  color: var(--rmb-text-muted); background: var(--rmb-surface); transition: border-color 0.2s; }
.drop:hover { border-color: var(--rmb-st-pending); color: var(--rmb-text-secondary); }
.att-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.att-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; font-size: 12px; color: var(--rmb-text); }
.att-item .nm { flex: 1; }
.att-item .rm { background: none; border: none; color: var(--rmb-text-muted); cursor: pointer; }
.hint { font-size: 11px; color: var(--rmb-text-muted); margin: 0; }
.review-slip { padding: 16px; }
.rev-head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--rmb-text-muted); }
.rev-head .cat { font-weight: 700; }
.rev-row { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; font-size: 13px; color: var(--rmb-text-secondary); border-bottom: 1px dotted var(--rmb-perf-color); }
.rev-row b { color: var(--rmb-text); text-align: right; }
.rev-row b.muted { font-weight: 400; color: var(--rmb-text-muted); }
.err { color: var(--rmb-st-rejected); font-size: 12.5px; margin: 12px 0 0; }
.loading { color: var(--rmb-text-muted); grid-column: 1/-1; text-align: center; padding: 20px; }
.m-foot { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 14px 22px 20px; border-top: 1px solid var(--rmb-border-soft); }
.spacer { flex: 1; }
.rmb-btn.disabled { opacity: 0.5; pointer-events: none; }
.wz-fwd-enter-active, .wz-fwd-leave-active, .wz-back-enter-active, .wz-back-leave-active { transition: all 0.3s var(--rmb-spring); }
.wz-fwd-enter-from { opacity: 0; transform: translateX(20px); }
.wz-fwd-leave-to { opacity: 0; transform: translateX(-16px); }
.wz-back-enter-from { opacity: 0; transform: translateX(-20px); }
.wz-back-leave-to { opacity: 0; transform: translateX(16px); }
[data-theme="light"] .rmb-overlay { background: rgba(40,25,10,0.32); }

/* ── cinematic modal atmosphere ── */
.m-orb { position: absolute; border-radius: 50%; z-index: 0; pointer-events: none; filter: blur(46px); }
.m-orb.o1 { width: 280px; height: 280px; top: -120px; right: -70px; opacity: 0.4;
  background: radial-gradient(circle, rgba(251,191,36,0.6), transparent 68%); animation: rmb-aura-breathe 7s ease-in-out infinite; }
.m-orb.o2 { width: 240px; height: 240px; bottom: -120px; left: -60px; opacity: 0.28;
  background: radial-gradient(circle, rgba(45,212,191,0.5), transparent 70%); animation: rmb-aura-breathe 9s ease-in-out 1s infinite; }
.m-grid { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.35;
  background-image: linear-gradient(var(--rmb-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--rmb-grid-line) 1px, transparent 1px);
  background-size: 30px 30px; -webkit-mask: radial-gradient(120% 90% at 80% 0%, #000, transparent 72%); mask: radial-gradient(120% 90% at 80% 0%, #000, transparent 72%); }
.m-tape { position: absolute; top: 0; left: 0; right: 0; height: 4px; z-index: 1; pointer-events: none;
  background: var(--hr-gradient-ambient); background-size: 220% 100%; animation: rmb-perforation-shimmer 6s linear infinite; opacity: 0.85; }

/* ── success stamp overlay ── */
.m-done-overlay { position: absolute; inset: 0; z-index: 20; display: grid; place-items: center;
  background: var(--rmb-glass-deep); backdrop-filter: var(--rmb-glass-blur); }
.m-done-stamp { display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--rmb-st-approved);
  padding: 26px 38px; border-radius: 16px; border: 2.4px solid currentColor; background: var(--rmb-st-approved-soft); }
.m-done-stamp b { font-family: var(--rmb-mono); font-size: 22px; letter-spacing: 0.18em; font-weight: 800; }
.m-done-stamp span { font-size: 12px; color: var(--rmb-text-secondary); letter-spacing: 0.1em; }
.m-done-burst { position: absolute; inset: 0; pointer-events: none; display: grid; place-items: center; }
.m-done-burst i { position: absolute; width: 7px; height: 7px; border-radius: 2px; background: var(--rmb-st-settled);
  animation: m-burst 0.85s var(--rmb-ease) both; }
.m-done-burst i:nth-child(even) { background: var(--rmb-amber); }
@keyframes m-burst {
  0% { transform: translate(0, 0) scale(0.4); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translate(var(--bx, 0), var(--by, 0)) scale(0.6) rotate(180deg); opacity: 0; }
}
.m-done-enter-active { transition: opacity 0.3s ease; }
.m-done-leave-active { transition: opacity 0.4s ease; }
.m-done-enter-from, .m-done-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .m-orb, .m-tape, .fill-glow, .m-done-burst i, .dot.cur .dot-core { animation: none !important; }
}
</style>
