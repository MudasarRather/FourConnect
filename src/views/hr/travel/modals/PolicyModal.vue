<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="pm-ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.24 }" @click.self="$emit('close')">
        <Motion as="div" class="pm" :initial="{ opacity: 0, y: 22, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.97 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="pm-aura" aria-hidden="true" />

          <header class="pm-head">
            <div>
              <span class="pm-eyebrow"><FileBadge :size="12" /> Governance · {{ form.id ? 'amend' : 'charter' }}</span>
              <h3>{{ form.id ? 'Amend travel policy' : 'New travel policy' }}</h3>
            </div>
            <button class="pm-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="pm-body">
            <!-- live preview plate -->
            <div class="prev" :class="{ ready: valid }" :style="{ '--c': cabin.hex }">
              <span class="prev-spine" />
              <div class="prev-top">
                <div class="prev-id">
                  <span class="prev-name">{{ form.policy_name || 'Untitled policy' }}</span>
                  <span class="prev-scope trv-mono">{{ gradeLabel }} · {{ form.travel_scope }}</span>
                </div>
                <span class="prev-plate"><Plane :size="11" /> {{ cabin.short }}</span>
              </div>
              <div class="prev-ents">
                <span class="pe"><Plane :size="11" /> {{ cabin.short }}</span>
                <span class="pe"><Hotel :size="11" /> {{ form.hotel_category || 'No hotel' }}</span>
                <span class="pe" :class="{ off: !form.da_eligible }"><Calculator :size="11" /> {{ form.da_eligible ? 'DA' : 'No DA' }}</span>
                <span class="pe accent"><Wallet :size="11" /> {{ form.advance_limit ? '≤ ' + fmtCompactINR(form.advance_limit) : 'No cap' }}</span>
              </div>
              <div class="prev-run">
                <template v-for="(s, k) in stages" :key="k">
                  <span class="pr-node" :style="{ '--c': approverTypeMeta(s.approver_type).hex }" :title="s.label">
                    <component :is="approverTypeMeta(s.approver_type).icon" :size="10" />
                  </span>
                  <span v-if="k < stages.length - 1" class="pr-link" />
                </template>
                <span v-if="!stages.length" class="pr-empty">no stages</span>
              </div>
              <span class="prev-stamp" :class="valid ? 'ok' : 'draft'">{{ valid ? 'READY' : 'DRAFT' }}</span>
            </div>

            <!-- identity -->
            <div class="fld span"><label>Policy name <span class="req">*</span></label>
              <input v-model="form.policy_name" class="inp" placeholder="e.g. Senior Management — Domestic" /></div>
            <div class="fld span"><label>Description <span class="opt">(optional)</span></label>
              <input v-model="form.description" class="inp" placeholder="Short note on who/what this covers" /></div>

            <!-- scope -->
            <div class="grid2">
              <div class="fld"><label>Grade band</label><TrvSelect v-model="form.grade_id" :options="gradeOpts" placeholder="All grades" /></div>
              <div class="fld"><label>Travel scope</label><TrvSelect v-model="form.travel_scope" :options="scopeOpts" /></div>
            </div>

            <!-- entitlements -->
            <div class="sect-lab"><Plane :size="13" /> Cabin entitlements</div>
            <div class="fld"><label>Flight class</label>
              <div class="seg">
                <button v-for="f in FLIGHT_CLASSES" :key="f.key" class="seg-b" :class="{ on: form.flight_eligibility === f.key }"
                  :style="{ '--c': f.hex }" @click="form.flight_eligibility = f.key">{{ f.short }}</button>
              </div>
            </div>
            <div class="fld"><label>Train class</label>
              <div class="seg">
                <button v-for="t in TRAIN_CLASSES" :key="t.key" class="seg-b" :class="{ on: form.train_class === t.key }"
                  @click="form.train_class = t.key">{{ t.short }}</button>
              </div>
            </div>
            <div class="grid2">
              <div class="fld"><label>Hotel category</label><TrvSelect v-model="form.hotel_category" :options="hotelOpts" placeholder="No hotel" /></div>
              <div class="fld"><label>Advance limit (₹)</label>
                <div class="inp-money"><span>₹</span><input v-model.number="form.advance_limit" type="number" min="0" class="inp bare" placeholder="No cap" /></div>
              </div>
            </div>
            <label class="row-toggle"><TrvSwitch v-model="form.da_eligible" /> <span>Daily allowance (DA) eligible</span></label>

            <!-- approval runway builder -->
            <div class="sect-lab"><ShieldCheck :size="13" /> Approval runway
              <button class="mini-link" @click="resetChain" type="button"><RotateCcw :size="11" /> Default</button>
            </div>
            <div class="chain">
              <Presence>
                <Motion v-for="(s, i) in stages" :key="s._k" as="div" class="stage"
                  :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, x: -10 }"
                  :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }" :style="{ '--c': approverTypeMeta(s.approver_type).hex }">
                  <span class="stage-no">{{ i + 1 }}</span>
                  <div class="stage-body">
                    <div class="stage-row">
                      <TrvSelect class="stage-type" :model-value="s.approver_type" :options="approverOpts"
                        @update:model-value="(v) => setType(s, v)" />
                      <input v-model="s.label" class="inp sm stage-label" placeholder="Stage label" />
                      <div class="stage-acts">
                        <button class="sa" :disabled="i === 0" @click="move(i, -1)" title="Up"><ChevronUp :size="13" /></button>
                        <button class="sa" :disabled="i === stages.length - 1" @click="move(i, 1)" title="Down"><ChevronDown :size="13" /></button>
                        <button class="sa danger" @click="removeStage(i)" title="Remove"><X :size="13" /></button>
                      </div>
                    </div>
                    <div class="stage-row2">
                      <TrvSelect v-if="approverTypeMeta(s.approver_type).needsUser" class="stage-user" size="sm"
                        v-model="s.approver_user_id" :options="approverCandidateOpts" :loading="loadingCands"
                        placeholder="Pick approver…" />
                      <span v-else class="stage-hint"><Info :size="11" /> {{ approverTypeMeta(s.approver_type).hint }}</span>
                      <div class="stage-min">
                        <span class="sm-lab">applies ≥ ₹</span>
                        <input v-model.number="s.min_amount" type="number" min="0" class="inp sm bare mini" placeholder="0" />
                      </div>
                    </div>
                  </div>
                </Motion>
              </Presence>
              <button class="add-stage" @click="addStage" type="button"><Plus :size="14" /> Add approval stage</button>
            </div>

            <!-- eligibility (optional) -->
            <button class="sect-lab toggleable" @click="showElig = !showElig" type="button">
              <Layers :size="13" /> Applies to <span class="opt">(optional filter)</span>
              <ChevronDown :size="13" class="sl-chev" :class="{ up: showElig }" />
            </button>
            <Presence>
              <Motion v-if="showElig" as="div" class="elig" :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -8 }" :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }">
                <div class="elig-grp">
                  <span class="elig-lab">Departments</span>
                  <div class="chips">
                    <button v-for="d in departments" :key="d.id" class="chip-t" :class="{ on: elig.department_ids.includes(d.id) }" @click="toggleElig('department_ids', d.id)">{{ d.name }}</button>
                    <span v-if="!departments.length" class="elig-empty">No departments</span>
                  </div>
                </div>
                <div class="elig-grp">
                  <span class="elig-lab">Grades</span>
                  <div class="chips">
                    <button v-for="g in grades" :key="g.id" class="chip-t" :class="{ on: elig.grade_ids.includes(g.id) }" @click="toggleElig('grade_ids', g.id)">{{ g.name }}</button>
                  </div>
                </div>
              </Motion>
            </Presence>

            <label class="row-toggle border-t"><TrvSwitch v-model="form.is_active" /> <span>Policy active</span></label>
          </div>

          <footer class="pm-foot">
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn primary" :disabled="busy || !valid" :whileHover="valid && !busy ? { y: -2 } : {}" :whileTap="valid && !busy ? { scale: 0.97 } : {}" @click="save">
              <Loader2 v-if="busy" :size="15" class="spin" /><Check v-else :size="15" /> {{ form.id ? 'Save changes' : 'Create policy' }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { FileBadge, X, Plane, Hotel, Calculator, Wallet, ShieldCheck, Layers, Plus, RotateCcw, ChevronUp, ChevronDown, Info, Check, Loader2 } from 'lucide-vue-next'
import TrvSelect from '../components/TrvSelect.vue'
import TrvSwitch from '../components/TrvSwitch.vue'
import { useToast } from 'vue-toastification'
import {
  fmtCompactINR, errText, createPolicy, updatePolicy, fetchDepartments, fetchApproverCandidates,
  FLIGHT_CLASSES, TRAIN_CLASSES, HOTEL_CATEGORIES, TRAVEL_SCOPES, APPROVER_TYPES,
  flightClassMeta, approverTypeMeta, DEFAULT_TRAVEL_CHAIN,
} from '@/composables/useTravel'

const props = defineProps({ open: Boolean, policy: { type: Object, default: null }, grades: { type: Array, default: () => [] } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

let keyN = 0
const form = reactive({ id: null, policy_name: '', description: '', grade_id: null, travel_scope: 'ALL', flight_eligibility: 'ECONOMY', train_class: 'NONE', hotel_category: '3 Star', advance_limit: 50000, da_eligible: true, is_active: true })
const stages = ref([])
const elig = reactive({ department_ids: [], grade_ids: [] })
const showElig = ref(false)
const busy = ref(false)
const departments = ref([])
const candidates = ref([])
const loadingCands = ref(false)

const gradeOpts = computed(() => [{ value: null, label: 'All grades' }, ...props.grades.map(g => ({ value: g.id, label: g.name }))])
const scopeOpts = TRAVEL_SCOPES.map(s => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))
const hotelOpts = [{ value: '', label: 'No hotel' }, ...HOTEL_CATEGORIES.map(h => ({ value: h, label: h }))]
const approverOpts = APPROVER_TYPES.map(a => ({ value: a.key, label: a.label, icon: a.icon }))
const approverCandidateOpts = computed(() => candidates.value.map(c => ({ value: c.id, label: c.full_name || c.name || c.email || 'User', hint: c.designation || c.email || '' })))

const cabin = computed(() => flightClassMeta(form.flight_eligibility))
const gradeLabel = computed(() => form.grade_id ? (props.grades.find(g => g.id === form.grade_id)?.name || 'Grade') : 'All grades')

const valid = computed(() => form.policy_name.trim() &&
  stages.value.every(s => s.label.trim() && (!approverTypeMeta(s.approver_type).needsUser || s.approver_user_id)))

const mkStage = (approver_type = 'MANAGER', label = null, approver_user_id = null, min_amount = null) =>
  ({ _k: ++keyN, approver_type, label: label || approverTypeMeta(approver_type).label, approver_user_id, min_amount })
const defaultStages = () => DEFAULT_TRAVEL_CHAIN.map(s => mkStage(s.approver_type, s.label))
const resetChain = () => { stages.value = defaultStages() }
const addStage = () => { stages.value.push(mkStage()) }
const removeStage = (i) => { stages.value.splice(i, 1) }
const move = (i, d) => { const j = i + d; if (j < 0 || j >= stages.value.length) return; const a = stages.value; [a[i], a[j]] = [a[j], a[i]] }
const setType = (s, v) => { s.approver_type = v; s.label = approverTypeMeta(v).label; if (!approverTypeMeta(v).needsUser) s.approver_user_id = null }
const toggleElig = (key, id) => { const arr = elig[key]; const i = arr.indexOf(id); i >= 0 ? arr.splice(i, 1) : arr.push(id) }

const loadAux = async () => {
  loadingCands.value = true
  try {
    const [d, c] = await Promise.all([fetchDepartments(), fetchApproverCandidates('')])
    departments.value = d.items || d || []
    candidates.value = c.items || c || []
  } catch { /* non-fatal */ } finally { loadingCands.value = false }
}

watch(() => props.open, (o) => {
  if (!o) return
  loadAux()
  const p = props.policy
  if (p) {
    Object.assign(form, {
      id: p.id, policy_name: p.policy_name || '', description: p.description || '', grade_id: p.grade_id || null,
      travel_scope: p.travel_scope || 'ALL', flight_eligibility: flightClassMeta(p.flight_eligibility).key,
      train_class: (TRAIN_CLASSES.find(t => t.key === String(p.train_class || '').toUpperCase()) || TRAIN_CLASSES[0]).key,
      hotel_category: p.hotel_category || '', advance_limit: p.advance_limit != null ? Number(p.advance_limit) : null,
      da_eligible: p.da_eligible !== false, is_active: p.is_active !== false,
    })
    stages.value = (p.approval_chain && p.approval_chain.length)
      ? p.approval_chain.map(s => mkStage(s.approver_type, s.label, s.approver_user_id || null, s.min_amount != null ? Number(s.min_amount) : null))
      : defaultStages()
    elig.department_ids = [...(p.eligibility?.department_ids || [])]
    elig.grade_ids = [...(p.eligibility?.grade_ids || [])]
    showElig.value = elig.department_ids.length > 0 || elig.grade_ids.length > 0
  } else {
    Object.assign(form, { id: null, policy_name: '', description: '', grade_id: null, travel_scope: 'ALL', flight_eligibility: 'ECONOMY', train_class: 'AC2', hotel_category: '3 Star', advance_limit: 50000, da_eligible: true, is_active: true })
    stages.value = defaultStages()
    elig.department_ids = []; elig.grade_ids = []; showElig.value = false
  }
})

const save = async () => {
  if (!valid.value) return
  busy.value = true
  try {
    const chain = stages.value.map(s => {
      const o = { approver_type: s.approver_type, label: s.label.trim() }
      if (approverTypeMeta(s.approver_type).needsUser && s.approver_user_id) o.approver_user_id = s.approver_user_id
      if (s.min_amount != null && s.min_amount !== '' && Number(s.min_amount) > 0) o.min_amount = Number(s.min_amount)
      return o
    })
    const hasElig = elig.department_ids.length || elig.grade_ids.length
    const body = {
      policy_name: form.policy_name.trim(), description: form.description.trim() || null,
      grade_id: form.grade_id, travel_scope: form.travel_scope,
      flight_eligibility: form.flight_eligibility, train_class: form.train_class,
      hotel_category: form.hotel_category || null, da_eligible: form.da_eligible,
      advance_limit: form.advance_limit != null && form.advance_limit !== '' ? Number(form.advance_limit) : null,
      approval_chain: chain.length ? chain : null, is_active: form.is_active,
      eligibility: hasElig ? { department_ids: elig.department_ids, grade_ids: elig.grade_ids } : null,
    }
    if (form.id) await updatePolicy(form.id, body); else await createPolicy(body)
    toast.success(form.id ? 'Policy updated' : 'Policy created')
    emit('saved'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not save policy')) } finally { busy.value = false }
}
</script>

<style scoped>
.pm-ov { position: fixed; inset: 0; z-index: 1445; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.pm { position: relative; width: min(660px, 96vw); max-height: 92vh; overflow-y: auto; display: flex; flex-direction: column; border-radius: 20px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.pm-aura { position: absolute; inset: -40% 30% 75% -20%; pointer-events: none; background: radial-gradient(55% 70% at 30% 0%, rgba(251,191,36,0.16), transparent 70%); animation: trv-aura-drift 11s ease-in-out infinite; }
.pm-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 17px 20px 12px; }
.pm-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-amber); }
.pm-head h3 { font-size: 18px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.pm-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.pm-body { position: relative; padding: 4px 20px 16px; display: flex; flex-direction: column; gap: 13px; }

/* preview */
.prev { position: relative; overflow: hidden; padding: 15px 16px; border-radius: 15px; background: linear-gradient(155deg, var(--trv-surface), var(--trv-panel)); border: 1px solid var(--trv-border-strong); transition: border-color 0.3s; }
.prev.ready { border-color: color-mix(in srgb, var(--c) 40%, transparent); }
.prev::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--c), transparent 75%); }
.prev-spine { position: absolute; top: 12px; bottom: 12px; left: 0; width: 3px; background: var(--c); border-radius: 0 3px 3px 0; }
.prev-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.prev-name { display: block; font-size: 15px; font-weight: 800; color: var(--trv-text); }
.prev-scope { font-size: 10px; color: var(--trv-text-dim); }
.prev-plate { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 8px; font-size: 10px; font-weight: 850; letter-spacing: 0.07em; text-transform: uppercase; color: #1a1205; background: linear-gradient(135deg, color-mix(in srgb, var(--c) 88%, #fff 12%), var(--c)); }
.prev-ents { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 11px; }
.pe { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; padding: 4px 8px; border-radius: 7px; color: var(--trv-text-secondary); background: var(--trv-panel); border: 1px solid var(--trv-border); }
.pe.off { color: var(--trv-text-dim); } .pe.accent { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.prev-run { display: flex; align-items: center; }
.pr-node { display: inline-flex; padding: 5px; border-radius: 50%; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 36%, transparent); }
.pr-link { width: 16px; height: 2px; border-radius: 2px; background: repeating-linear-gradient(90deg, var(--trv-amber-border) 0 3px, transparent 3px 6px); }
.pr-empty { font-size: 10px; color: var(--trv-text-dim); }
.prev-stamp { position: absolute; right: 14px; bottom: 12px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 6px; }
.prev-stamp.draft { color: var(--trv-text-dim); background: var(--trv-panel); border: 1px solid var(--trv-border); }
.prev-stamp.ok { color: #1a1205; background: var(--trv-grad-hero); }

.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fld.span { grid-column: 1 / -1; }
.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 6px; }
.req { color: var(--trv-amber); } .opt { color: var(--trv-text-dim); font-weight: 500; }
.inp { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); }
.inp:focus { outline: none; border-color: var(--trv-amber-border); }
.inp.sm { padding: 8px 10px; font-size: 12.5px; }
.inp-money { display: flex; align-items: center; gap: 6px; padding: 0 12px; border-radius: 10px; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); }
.inp-money span { color: var(--trv-text-muted); font-weight: 700; }
.inp.bare { background: none; border: none; padding: 10px 0; } .inp.bare.mini { padding: 7px 0; width: 70px; }

.sect-lab { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 750; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-amber); margin-top: 6px; padding-top: 12px; border-top: 1px solid var(--trv-border); }
.sect-lab.toggleable { background: none; border-top: 1px solid var(--trv-border); border-left: none; border-right: none; border-bottom: none; width: 100%; cursor: pointer; }
.sl-chev { margin-left: auto; transition: transform 0.25s; color: var(--trv-text-muted); } .sl-chev.up { transform: rotate(180deg); }
.mini-link { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 650; color: var(--trv-text-muted); background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 7px; padding: 4px 9px; cursor: pointer; text-transform: none; letter-spacing: 0; }
.mini-link:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }

.seg { display: flex; gap: 5px; padding: 4px; border-radius: 11px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.seg-b { flex: 1; padding: 8px 4px; border-radius: 8px; font-size: 11.5px; font-weight: 650; cursor: pointer; background: none; border: none; color: var(--trv-text-muted); transition: all 0.2s; }
.seg-b:hover { color: var(--trv-text); }
.seg-b.on { color: #1a1205; background: linear-gradient(135deg, color-mix(in srgb, var(--c, var(--trv-amber)) 88%, #fff 12%), var(--c, var(--trv-amber))); box-shadow: 0 3px 12px -4px color-mix(in srgb, var(--c, var(--trv-amber)) 70%, transparent); }

.row-toggle { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--trv-text-secondary); }
.row-toggle.border-t { padding-top: 13px; border-top: 1px solid var(--trv-border); margin-top: 2px; }

/* chain builder */
.chain { display: flex; flex-direction: column; gap: 9px; }
.stage { display: flex; gap: 10px; padding: 11px; border-radius: 12px; background: var(--trv-panel); border: 1px solid var(--trv-border); border-left: 3px solid var(--c); }
.stage-no { display: grid; place-items: center; width: 22px; height: 22px; flex-shrink: 0; border-radius: 50%; font-size: 11px; font-weight: 800; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.stage-body { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.stage-row { display: flex; gap: 8px; align-items: center; }
.stage-type { width: 160px; flex-shrink: 0; }
.stage-label { flex: 1; min-width: 0; }
.stage-acts { display: flex; gap: 3px; flex-shrink: 0; }
.sa { display: inline-flex; padding: 6px; border-radius: 7px; background: var(--trv-surface); border: 1px solid var(--trv-border); color: var(--trv-text-muted); cursor: pointer; }
.sa:hover:not(:disabled) { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.sa.danger:hover { color: var(--trv-st-rejected); border-color: color-mix(in srgb, var(--trv-st-rejected) 40%, transparent); }
.sa:disabled { opacity: 0.35; cursor: not-allowed; }
.stage-row2 { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.stage-user { flex: 1; min-width: 180px; }
.stage-hint { display: inline-flex; align-items: center; gap: 5px; flex: 1; font-size: 10.5px; color: var(--trv-text-dim); }
.stage-min { display: inline-flex; align-items: center; gap: 5px; padding: 0 10px; border-radius: 9px; background: var(--trv-surface); border: 1px solid var(--trv-border); }
.sm-lab { font-size: 10px; color: var(--trv-text-dim); white-space: nowrap; }
.add-stage { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 11px; font-size: 12.5px; font-weight: 650; cursor: pointer;
  color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px dashed var(--trv-amber-border); }
.add-stage:hover { background: color-mix(in srgb, var(--trv-amber) 16%, transparent); }

/* eligibility */
.elig { display: flex; flex-direction: column; gap: 12px; overflow: hidden; }
.elig-grp { display: flex; flex-direction: column; gap: 7px; }
.elig-lab { font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--trv-text-muted); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip-t { padding: 5px 11px; border-radius: 999px; font-size: 11.5px; font-weight: 600; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.chip-t.on { color: var(--trv-amber); border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }
.elig-empty { font-size: 11.5px; color: var(--trv-text-dim); }

.pm-foot { position: sticky; bottom: 0; display: flex; justify-content: flex-end; gap: 10px; padding: 13px 20px; border-top: 1px solid var(--trv-border); background: var(--trv-surface-glass); backdrop-filter: blur(12px); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: pm-spin 0.8s linear infinite; }
@keyframes pm-spin { to { transform: rotate(360deg); } }

[data-theme="light"] .pm-ov { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp, [data-theme="light"] .inp-money, [data-theme="light"] .stage-min { background: rgba(255,250,240,0.72); }
@media (max-width: 560px) { .grid2 { grid-template-columns: 1fr; } .stage-row { flex-wrap: wrap; } .stage-type { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .pm-aura { animation: none; } .spin { animation: none; } .sl-chev { transition: none; } }
</style>
