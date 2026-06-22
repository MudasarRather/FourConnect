<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="ex" :initial="{ opacity: 0, y: 26, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16 }" :transition="{ duration: 0.42, ease: [0.16,1,0.3,1] }">
          <span class="ex-aura" aria-hidden="true" />

          <header class="ex-head">
            <div>
              <span class="ex-eyebrow"><Scale :size="12" /> Expense claim · {{ trip?.travel_reference_number }}</span>
              <h3>File your travel expenses</h3>
            </div>
            <button class="ex-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <!-- reconciliation ribbon -->
          <div class="recon">
            <div class="recon-node"><span>Claimed</span><b class="trv-mono">{{ fmtINR(claimed) }}</b></div>
            <span class="recon-op">−</span>
            <div class="recon-node"><span>Advance</span><b class="trv-mono">{{ fmtINR(advance) }}</b></div>
            <span class="recon-op">+</span>
            <div class="recon-node"><span>Per-diem</span><b class="trv-mono">{{ fmtINR(da) }}</b></div>
            <span class="recon-op">=</span>
            <div class="recon-net" :class="recon.direction">
              <span>{{ recon.direction === 'recoverable' ? 'You repay' : recon.direction === 'payable' ? 'Payable to you' : 'Balanced' }}</span>
              <b class="trv-mono">{{ fmtINR(recon.direction === 'recoverable' ? recon.recoverable : recon.payable) }}</b>
            </div>
          </div>

          <div class="ex-body">
            <div v-if="loading" class="ex-skel" />
            <template v-else>
              <TransitionGroup name="line" tag="div" class="lines">
                <div v-for="(ln, i) in lines" :key="ln._k" class="line">
                  <div class="line-head">
                    <span class="line-ix trv-mono">{{ String(i + 1).padStart(2, '0') }}</span>
                    <div class="line-cat"><TrvSelect v-model="ln.category" :options="catOpts" size="sm" /></div>
                    <div class="line-amt">
                      <span class="cur">₹</span>
                      <input v-model.number="ln.amount" type="number" min="0" class="inp amt" placeholder="0" />
                    </div>
                    <button class="line-del" @click="removeLine(i)" :disabled="lines.length === 1"><Trash2 :size="14" /></button>
                  </div>

                  <div class="line-grid">
                    <div class="fld"><label>Date</label><HrDatePicker v-model="ln.expense_date" :max="trip?.return_date" /></div>
                    <div class="fld"><label>Vendor</label><input v-model="ln.vendor" class="inp" placeholder="e.g. IndiGo, Taj" /></div>
                    <div class="fld"><label>GST <em>(incl.)</em></label><input v-model.number="ln.gst" type="number" min="0" class="inp" placeholder="0" /></div>
                  </div>
                  <div class="fld"><label>Note</label><input v-model="ln.note" class="inp" placeholder="What was this for?" /></div>

                  <!-- receipts -->
                  <div class="rcpts">
                    <div v-for="(a, ai) in ln.attachments" :key="ai" class="rcpt">
                      <Paperclip :size="11" /><a :href="fileUrl(a)" target="_blank" class="rcpt-name">{{ a.original_filename || 'Receipt' }}</a>
                      <button @click="ln.attachments.splice(ai, 1)"><X :size="11" /></button>
                    </div>
                    <label class="rcpt-add" :class="{ busy: ln._up }">
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif" multiple hidden @change="onFiles($event, ln)" />
                      <Loader2 v-if="ln._up" :size="12" class="spin" /><Upload v-else :size="12" />
                      {{ ln._up ? 'Uploading…' : 'Receipt' }}
                    </label>
                  </div>

                  <!-- per-line flags -->
                  <div v-if="lineFlags(ln).length" class="line-flags">
                    <span v-for="f in lineFlags(ln)" :key="f.key" class="lf" :class="f.tone"><component :is="f.icon" :size="11" /> {{ f.text }}</span>
                  </div>
                </div>
              </TransitionGroup>

              <button class="add-line" @click="addLine"><Plus :size="14" /> Add expense line</button>

              <div class="fld notes"><label>Notes to your verifier <em>(optional)</em></label>
                <textarea v-model="notes" class="inp" rows="2" placeholder="Anything the finance team should know…" /></div>

              <!-- summary warnings -->
              <div v-if="warnings.length" class="warns">
                <div v-for="w in warnings" :key="w.key" class="warn" :class="w.tone"><component :is="w.icon" :size="14" /> {{ w.text }}</div>
              </div>
            </template>
          </div>

          <footer class="ex-foot">
            <div class="foot-tot"><span>{{ lines.length }} line{{ lines.length > 1 ? 's' : '' }}</span><b class="trv-mono">{{ fmtINR(claimed) }}</b></div>
            <div class="foot-right">
              <button class="btn ghost" @click="$emit('close')">Cancel</button>
              <Motion as="button" class="btn primary" :disabled="!valid || busy" :whileHover="(valid && !busy) ? { y: -2 } : {}" :whileTap="(valid && !busy) ? { scale: 0.97 } : {}" @click="submit">
                <Loader2 v-if="busy" :size="15" class="spin" /><Send v-else :size="14" /> Submit claim
              </Motion>
            </div>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Scale, Trash2, Plus, Upload, Paperclip, Loader2, Send, AlertTriangle, ShieldAlert, Info } from 'lucide-vue-next'
import TrvSelect from '../components/TrvSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { useToast } from 'vue-toastification'
import { API_BASE } from '@/utils/api'
import {
  fmtINR, errText, EXPENSE_CATEGORIES, reconcilePreview, advanceEffective, sumDaCovered,
  bookingDupeFlag, daCoveredFlag, expenseLineUnsupported, countUnsupported, countBookingDupes,
  RECEIPT_THRESHOLD, fetchMyBookings, fetchMySettlement, submitMyExpenses, uploadTravelReceipt,
} from '@/composables/useTravel'

const props = defineProps({ open: Boolean, trip: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

let kc = 0
const newLine = (seed = {}) => ({ _k: ++kc, _up: false, category: 'TRAVEL', expense_date: '', vendor: '', amount: 0, gst: 0, note: '', attachments: [], ...seed })
const lines = reactive([newLine()])
const notes = ref('')
const bookings = ref([])
const loading = ref(false)
const busy = ref(false)

const catOpts = EXPENSE_CATEGORIES.map(c => ({ value: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))
const advance = computed(() => advanceEffective(props.trip?.advance))
const da = computed(() => Number(props.trip?.da?.approved_da ?? props.trip?.da?.eligible_da ?? 0))
const claimed = computed(() => lines.reduce((a, l) => a + (Number(l.amount) || 0), 0))
const daCovered = computed(() => sumDaCovered(lines, da.value))
const recon = computed(() => reconcilePreview({ advance: advance.value, da: da.value, approvedExpense: Math.max(0, claimed.value - daCovered.value) }))

const fileUrl = (a) => a?.file_url ? (a.file_url.startsWith('http') ? a.file_url : `${API_BASE}${a.file_url}`) : '#'

const reset = async () => {
  lines.splice(0, lines.length, newLine())
  notes.value = ''; bookings.value = []
  if (!props.trip) return
  loading.value = true
  try {
    const [bk, st] = await Promise.all([
      fetchMyBookings(props.trip.id).catch(() => ({ items: [] })),
      fetchMySettlement(props.trip.id).catch(() => null),
    ])
    bookings.value = bk.items || []
    if (st && Array.isArray(st.expense_lines) && st.expense_lines.length) {
      lines.splice(0, lines.length, ...st.expense_lines.map(l => newLine({
        category: l.category || 'TRAVEL', expense_date: l.expense_date || '', vendor: l.vendor || '',
        amount: Number(l.amount) || 0, gst: Number(l.gst) || 0, note: l.note || '', attachments: l.attachments || [],
      })))
      notes.value = st.notes || ''
    }
  } finally { loading.value = false }
}
watch(() => props.open, (v) => { if (v) reset() })

const addLine = () => lines.push(newLine())
const removeLine = (i) => { if (lines.length > 1) lines.splice(i, 1) }

const onFiles = async (e, ln) => {
  const files = Array.from(e.target.files || []); e.target.value = ''
  if (!files.length) return
  ln._up = true
  try {
    for (const f of files) ln.attachments.push(await uploadTravelReceipt(f))
  } catch (err) { toast.error(errText(err, 'Upload failed')) } finally { ln._up = false }
}

const lineFlags = (ln) => {
  const out = []
  if (daCoveredFlag(ln, da.value)) out.push({ key: 'da', tone: 'info', icon: Info, text: 'Covered by per-diem — not separately reimbursed' })
  const dupe = bookingDupeFlag(ln, bookings.value)
  if (dupe.flagged) out.push({ key: 'dupe', tone: dupe.strong ? 'bad' : 'warn', icon: ShieldAlert, text: dupe.strong ? 'Matches a company booking — likely already paid' : 'Overlaps a company booking — check before claiming' })
  if (expenseLineUnsupported(ln)) out.push({ key: 'rcpt', tone: 'warn', icon: AlertTriangle, text: `Attach a receipt — claims ≥ ${fmtINR(RECEIPT_THRESHOLD)} need proof` })
  return out
}
const warnings = computed(() => {
  const out = []
  const u = countUnsupported(lines); if (u) out.push({ key: 'u', tone: 'warn', icon: AlertTriangle, text: `${u} line${u > 1 ? 's' : ''} over ${fmtINR(RECEIPT_THRESHOLD)} without a receipt` })
  const d = countBookingDupes(lines, bookings.value); if (d) out.push({ key: 'd', tone: 'bad', icon: ShieldAlert, text: `${d} line${d > 1 ? 's' : ''} may duplicate a company booking` })
  if (daCovered.value > 0) out.push({ key: 'dac', tone: 'info', icon: Info, text: `${fmtINR(daCovered.value)} of claims is covered by your per-diem` })
  return out
})
const valid = computed(() => lines.length > 0 && lines.every(l => l.category && Number(l.amount) > 0))

const submit = async () => {
  if (!valid.value || !props.trip) return
  busy.value = true
  try {
    const expense_lines = lines.map(l => ({
      category: l.category, expense_date: l.expense_date || null, vendor: l.vendor || null,
      amount: Number(l.amount) || 0, gst: l.gst ? Number(l.gst) : null, currency: 'INR',
      note: l.note || null, attachments: l.attachments || [],
    }))
    await submitMyExpenses(props.trip.id, { expense_lines, notes: notes.value })
    toast.success('Expense claim filed'); emit('saved'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not file expenses')) } finally { busy.value = false }
}
</script>

<style scoped>
.ov { position: fixed; inset: 0; z-index: 1460; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.ex { position: relative; width: min(720px, 97vw); max-height: 94vh; overflow: hidden; display: flex; flex-direction: column; border-radius: 24px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.ex-aura { position: absolute; inset: -40% 40% 70% -10%; pointer-events: none; background: radial-gradient(55% 70% at 25% 0%, rgba(52,211,153,0.12), transparent 70%); }
.ex-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 12px; }
.ex-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-st-approved); }
.ex-head h3 { font-size: 19px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.ex-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.ex-x:hover { color: var(--trv-text); }

.recon { display: flex; align-items: center; gap: 8px; margin: 0 22px 6px; padding: 12px 14px; border-radius: 14px; background: var(--trv-panel); border: 1px solid var(--trv-border); flex-wrap: wrap; }
.recon-node { display: flex; flex-direction: column; gap: 1px; }
.recon-node span { font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-dim); }
.recon-node b { font-size: 14px; color: var(--trv-text-secondary); }
.recon-op { font-size: 15px; font-weight: 800; color: var(--trv-text-dim); }
.recon-net { margin-left: auto; display: flex; flex-direction: column; gap: 1px; align-items: flex-end; padding: 6px 13px; border-radius: 11px; border: 1px solid var(--trv-border-strong); }
.recon-net span { font-size: 9px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--trv-text-dim); }
.recon-net b { font-size: 17px; font-weight: 850; }
.recon-net.payable { background: var(--trv-st-approved-soft); border-color: color-mix(in srgb, var(--trv-st-approved) 35%, transparent); }
.recon-net.payable b { color: var(--trv-st-approved); }
.recon-net.recoverable { background: var(--trv-st-rejected-soft); border-color: color-mix(in srgb, var(--trv-st-rejected) 35%, transparent); }
.recon-net.recoverable b { color: var(--trv-st-rejected); }
.recon-net.balanced b { color: var(--trv-text-secondary); }

.ex-body { padding: 10px 22px 16px; overflow-y: auto; flex: 1; min-height: 0; }
.ex-skel { height: 160px; border-radius: 16px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }
.lines { display: flex; flex-direction: column; gap: 12px; }
.line { padding: 13px; border-radius: 15px; background: var(--trv-panel); border: 1px solid var(--trv-border); display: flex; flex-direction: column; gap: 10px; }
.line-head { display: flex; align-items: center; gap: 10px; }
.line-ix { font-size: 11px; font-weight: 700; color: var(--trv-text-dim); width: 22px; flex-shrink: 0; }
.line-cat { width: 150px; flex-shrink: 0; }
.line-amt { display: flex; align-items: center; gap: 4px; margin-left: auto; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); border-radius: 9px; padding: 0 10px; }
.line-amt .cur { font-size: 13px; color: var(--trv-text-muted); }
.amt { border: none !important; background: transparent !important; width: 96px; text-align: right; box-shadow: none !important; padding: 9px 0 !important; font-weight: 700; }
.line-del { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); color: var(--trv-text-dim); cursor: pointer; flex-shrink: 0; }
.line-del:hover:not(:disabled) { color: var(--trv-st-rejected); border-color: color-mix(in srgb, var(--trv-st-rejected) 40%, transparent); }
.line-del:disabled { opacity: 0.35; cursor: not-allowed; }
.line-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 9px; }
.fld label { display: block; font-size: 10px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 4px; }
.fld label em { color: var(--trv-text-dim); font-style: normal; }
.inp { width: 100%; padding: 8px 10px; border-radius: 9px; font-size: 12.5px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); transition: border-color 0.2s; }
.inp:focus { outline: none; border-color: var(--trv-amber-border); }
.rcpts { display: flex; flex-wrap: wrap; gap: 6px; }
.rcpt { display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 8px; font-size: 10.5px; color: var(--trv-text-secondary); background: var(--trv-surface-elevated); border: 1px solid var(--trv-border); max-width: 180px; }
.rcpt-name { color: var(--trv-text-secondary); text-decoration: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rcpt-name:hover { color: var(--trv-amber); }
.rcpt button { background: none; border: none; color: var(--trv-text-dim); cursor: pointer; display: grid; place-items: center; }
.rcpt button:hover { color: var(--trv-st-rejected); }
.rcpt-add { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 8px; font-size: 11px; font-weight: 650; cursor: pointer; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px dashed var(--trv-amber-border); }
.rcpt-add.busy { opacity: 0.7; cursor: wait; }
.line-flags { display: flex; flex-direction: column; gap: 5px; }
.lf { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; padding: 5px 9px; border-radius: 8px; width: fit-content; }
.lf.info { color: var(--trv-amber-bright); background: var(--trv-amber-soft); }
.lf.warn { color: var(--trv-st-returned); background: var(--trv-st-returned-soft); }
.lf.bad { color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); }
.add-line { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 700; cursor: pointer; color: var(--trv-amber); background: transparent; border: 1px dashed var(--trv-amber-border); width: 100%; justify-content: center; }
.add-line:hover { background: var(--trv-amber-soft); }
.notes { margin-top: 12px; }
.notes .inp { resize: vertical; }
.warns { display: flex; flex-direction: column; gap: 7px; margin-top: 12px; }
.warn { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.warn.warn { color: var(--trv-st-returned); background: var(--trv-st-returned-soft); }
.warn.bad { color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); }
.warn.info { color: var(--trv-amber-bright); background: var(--trv-amber-soft); }

.ex-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 22px; border-top: 1px solid var(--trv-border); background: var(--trv-surface-glass); }
.foot-tot { display: flex; flex-direction: column; }
.foot-tot span { font-size: 10px; color: var(--trv-text-dim); text-transform: uppercase; letter-spacing: 0.05em; }
.foot-tot b { font-size: 18px; color: var(--trv-amber-bright); }
.foot-right { display: flex; gap: 10px; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 17px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: trv-spin-slow 0.8s linear infinite; }

.line-enter-active, .line-leave-active { transition: all 0.3s var(--trv-spring); }
.line-enter-from, .line-leave-to { opacity: 0; transform: translateY(-8px); }

@media (max-width: 620px) { .line-grid { grid-template-columns: 1fr; } .line-cat { width: 120px; } .amt { width: 72px; } }
[data-theme="light"] .ov { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp, [data-theme="light"] .line-amt { background: rgba(255,250,240,0.72); }
@media (prefers-reduced-motion: reduce) { .ex-skel, .spin { animation: none; } }
</style>
