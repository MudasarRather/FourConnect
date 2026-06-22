<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="cm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="cm"
          :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.97 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="cm-aura" aria-hidden="true" />
          <header class="cm-head">
            <div>
              <span class="cm-eyebrow"><Vault :size="12" /> Treasury · disburse</span>
              <h3>Raise a cash advance</h3>
            </div>
            <button class="cm-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="cm-body">
            <!-- live preview -->
            <div class="cm-preview" :class="{ ready: valid }">
              <div class="cp-gauge"><span class="cpg-fill" :style="{ height: fillPct + '%' }"><span class="cpg-men" /></span></div>
              <div class="cp-c">
                <span class="cp-amt trv-mono">{{ amount > 0 ? fmtINR(amount) : '₹0' }}</span>
                <span class="cp-sub" v-if="sel">{{ sel.from_location }} → {{ sel.to_location }} · {{ sel.employee_name }}</span>
                <span class="cp-sub muted" v-else>Pick a travel request to advance against</span>
              </div>
              <span class="cp-stamp" :class="valid ? 'ready' : 'draft'">{{ valid ? 'READY' : 'DRAFT' }}</span>
            </div>

            <div v-if="loading" class="cm-load"><Loader2 :size="16" class="spin" /> Loading eligible tours…</div>
            <div v-else-if="!reqOpts.length" class="cm-none">
              <Plane :size="20" />
              <p>No eligible tours</p>
              <span>Advances attach to <b>approved</b> or <b>in-progress</b> tours that don't already have one open.</span>
            </div>

            <template v-else>
              <div class="fld">
                <label>Travel request <span class="req">*</span></label>
                <HrSelect v-model="reqId" :options="reqOpts" placeholder="Select an approved tour…" />
              </div>

              <div v-if="sel" class="cm-facts">
                <div><span>Traveller</span><b>{{ sel.employee_name || '—' }}</b></div>
                <div><span>Depart</span><b class="trv-mono">{{ fmtDate(sel.departure_date) }}</b></div>
                <div><span>Days</span><b class="trv-mono">{{ sel.num_days ?? '—' }}</b></div>
                <div><span>Est. cost</span><b class="trv-mono">{{ fmtINR(sel.est_total_cost) }}</b></div>
              </div>

              <div class="cm-grid">
                <div class="fld">
                  <label>Advance amount (₹) <span class="req">*</span></label>
                  <div class="cm-amt"><span class="cur">₹</span><input v-model.number="amount" type="number" min="1" class="inp" placeholder="0" /></div>
                  <div v-if="sel && sel.est_total_cost" class="cm-quick">
                    <button class="qk" @click="amount = pctOf(0.5)">50% est</button>
                    <button class="qk" @click="amount = pctOf(0.75)">75% est</button>
                    <button class="qk" @click="amount = Math.round(Number(sel.est_total_cost))">Full est</button>
                  </div>
                </div>
                <div class="fld">
                  <label>Purpose <span class="opt">(optional)</span></label>
                  <input v-model="purpose" class="inp" placeholder="e.g. site mobilisation float" />
                </div>
              </div>

              <div class="cm-hint"><Info :size="12" /> Raised as <b>Requested</b> on the traveller's behalf — still needs approval &amp; release before it reaches payroll.</div>
            </template>
          </div>

          <footer class="cm-foot">
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn primary" :disabled="busy || !valid"
              :whileHover="valid && !busy ? { y: -2 } : {}" :whileTap="valid && !busy ? { scale: 0.97 } : {}" @click="submit">
              <Loader2 v-if="busy" :size="15" class="spin" /><Send v-else :size="15" /> Raise advance
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
import { X, Vault, Plane, Send, Info, Loader2 } from 'lucide-vue-next'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import { useToast } from 'vue-toastification'
import { fmtINR, fmtDate, errText, fetchRequests, createAdvance } from '@/composables/useTravel'

const props = defineProps({
  open: Boolean,
  blockedRequestIds: { type: Array, default: () => [] },   // requests that already have an open advance
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const loading = ref(false)
const busy = ref(false)
const requests = ref([])
const reqId = ref('')
const amount = ref(null)
const purpose = ref('')

const blocked = computed(() => new Set(props.blockedRequestIds.map(String)))
const eligible = computed(() => requests.value.filter(r => !blocked.value.has(String(r.id))))
const reqOpts = computed(() => eligible.value.map(r => ({
  value: r.id,
  label: `${r.travel_reference_number} · ${r.from_location || '?'}→${r.to_location || '?'} · ${r.employee_name || ''}`.trim(),
})))
const sel = computed(() => eligible.value.find(r => String(r.id) === String(reqId.value)) || null)

const fillPct = computed(() => {
  if (!sel.value || !Number(sel.value.est_total_cost) || !amount.value) return amount.value > 0 ? 30 : 6
  return Math.max(8, Math.min(100, (Number(amount.value) / Number(sel.value.est_total_cost)) * 100))
})
const pctOf = (f) => Math.round(Number(sel.value?.est_total_cost || 0) * f)
const valid = computed(() => reqId.value && Number(amount.value) > 0)

const load = async () => {
  loading.value = true
  try {
    const [ap, ip] = await Promise.all([
      fetchRequests({ status: 'APPROVED', limit: 100 }),
      fetchRequests({ status: 'IN_PROGRESS', limit: 100 }),
    ])
    const seen = new Set()
    requests.value = [...(ap.items || []), ...(ip.items || [])].filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true })
  } catch (e) { toast.error(errText(e, 'Could not load travel requests')) }
  finally { loading.value = false }
}

watch(() => props.open, (o) => {
  if (o) { reqId.value = ''; amount.value = null; purpose.value = ''; load() }
})

const submit = async () => {
  if (!valid.value) return
  busy.value = true
  try {
    await createAdvance({ travel_request_id: reqId.value, advance_amount: Number(amount.value), currency: 'INR', purpose: purpose.value.trim() || null })
    toast.success('Advance raised')
    emit('done'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not raise advance')) }
  finally { busy.value = false }
}
</script>

<style scoped>
.cm-overlay { position: fixed; inset: 0; z-index: 1445; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.cm { position: relative; width: min(540px, 96vw); max-height: 92vh; overflow-y: auto; display: flex; flex-direction: column; border-radius: 20px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.cm-aura { position: absolute; inset: -50% 30% 70% -20%; pointer-events: none; background: radial-gradient(55% 70% at 30% 0%, rgba(251,191,36,0.16), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; }
.cm-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 10px; }
.cm-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-amber); }
.cm-head h3 { font-size: 17px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.cm-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.cm-body { position: relative; padding: 6px 18px 14px; display: flex; flex-direction: column; gap: 13px; }

.cm-preview { position: relative; display: flex; align-items: center; gap: 14px; padding: 15px 16px; border-radius: 14px;
  background: linear-gradient(155deg, var(--trv-flap), color-mix(in srgb, var(--trv-flap) 84%, #000)); border: 1px solid var(--trv-border-strong); transition: border-color 0.3s; }
.cm-preview.ready { border-color: var(--trv-amber-border); }
.cp-gauge { position: relative; width: 30px; height: 56px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: linear-gradient(100deg, rgba(0,0,0,0.45), rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.45)); border: 1px solid var(--trv-border-strong); }
.cpg-fill { position: absolute; left: 0; right: 0; bottom: 0; transition: height 0.5s var(--trv-spring); background: linear-gradient(180deg, rgba(251,191,36,0.85), rgba(245,158,11,0.5)); box-shadow: inset 0 0 12px rgba(251,191,36,0.5); }
.cpg-men { position: absolute; top: -1px; left: 0; right: 0; height: 2px; background: rgba(255,237,180,0.95); box-shadow: 0 0 6px rgba(251,191,36,0.9); }
.cp-c { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
.cp-amt { font-size: 26px; font-weight: 860; color: var(--trv-amber-bright); line-height: 1; }
.cp-sub { font-size: 11.5px; color: var(--trv-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cp-sub.muted { color: var(--trv-text-dim); }
.cp-stamp { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; padding: 3px 9px; border-radius: 6px; }
.cp-stamp.draft { color: var(--trv-text-dim); background: var(--trv-panel); border: 1px solid var(--trv-border); }
.cp-stamp.ready { color: #1a1205; background: var(--trv-grad-hero); }

.cm-load { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--trv-text-muted); padding: 8px 0; }
.cm-none { text-align: center; padding: 22px 10px; color: var(--trv-text-dim); }
.cm-none p { margin: 8px 0 4px; font-size: 13.5px; font-weight: 700; color: var(--trv-text-secondary); }
.cm-none span { font-size: 11.5px; } .cm-none b { color: var(--trv-text-secondary); }

.cm-facts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 12px 14px; border-radius: 12px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.cm-facts div { display: flex; flex-direction: column; gap: 2px; }
.cm-facts span { font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-dim); }
.cm-facts b { font-size: 12px; color: var(--trv-text-secondary); }
.cm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 6px; }
.req { color: var(--trv-amber); } .opt { color: var(--trv-text-dim); font-weight: 500; }
.cm-amt { display: flex; align-items: center; gap: 6px; padding: 0 11px; border-radius: 9px; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); }
.cm-amt .cur { color: var(--trv-text-muted); font-weight: 700; }
.cm-amt .inp { border: none; background: none; padding: 10px 0; }
.inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); }
.inp:focus { outline: none; border-color: var(--trv-amber-border); }
.cm-quick { display: flex; gap: 6px; margin-top: 8px; }
.qk { padding: 5px 10px; border-radius: 8px; font-size: 10.5px; font-weight: 650; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); }
.qk:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.cm-hint { display: flex; align-items: flex-start; gap: 7px; font-size: 11px; line-height: 1.5; color: var(--trv-text-dim); }
.cm-hint svg { flex-shrink: 0; margin-top: 1px; } .cm-hint b { color: var(--trv-text-secondary); }

.cm-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 13px 18px; border-top: 1px solid var(--trv-border); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: cm-spin 0.8s linear infinite; }
@keyframes cm-spin { to { transform: rotate(360deg); } }
[data-theme="light"] .cm-overlay { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp, [data-theme="light"] .cm-amt { background: rgba(255,250,240,0.72); }
[data-theme="light"] .cm-preview { background: linear-gradient(155deg, #2a2620, #1f1c16); }
[data-theme="light"] .cp-amt { color: var(--trv-amber-strong); }
@media (prefers-reduced-motion: reduce) { .cm-aura { animation: none; } .spin { animation: none; } .cpg-fill { transition: none; } }
</style>
