<template>
  <section class="night">
    <Motion as="header" class="night-banner" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
      <span class="banner-glow" />
      <div class="banner-text">
        <span class="eyebrow"><Moon :size="12" /> After-hours operations</span>
        <h2>Night Shifts Console</h2>
        <p>Configure allowance, OT differential, transport and meal eligibility for each night shift — and see who's on the night roster right now.</p>
      </div>
      <button class="btn-ghost" @click="reload" :class="{ spin: loading }"><RefreshCw :size="14" /> Refresh</button>
    </Motion>

    <!-- roster -->
    <div class="card">
      <header class="card-head"><span class="hnum"><Moon :size="13" /></span><h3>Night roster · today</h3><span class="hmeta">{{ roster.length }} on duty</span></header>
      <div v-if="roster.length" class="roster">
        <div v-for="(r, i) in roster" :key="i" class="rchip">
          <span class="rc-av">{{ initials(r.employee_name) }}</span>
          <div class="rc-meta"><b>{{ r.employee_name }}</b><small>{{ r.shift_code }}</small></div>
          <div class="rc-perks">
            <span v-if="r.allowance_amount" class="perk" title="Allowance">₹{{ r.allowance_amount }}</span>
            <span v-if="r.transport_required" class="perk" title="Transport"><Bus :size="11" /></span>
            <span v-if="r.meal_eligible" class="perk" title="Meal"><Utensils :size="11" /></span>
          </div>
        </div>
      </div>
      <p v-else class="empty-note">No one on a night shift today.</p>
    </div>

    <!-- per-shift night policies -->
    <div class="grid" v-if="nightShifts.length">
      <Motion v-for="(s, i) in nightShifts" :key="s.id" as="article" class="np-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.05 * i }">
        <header class="np-head">
          <div><span class="np-code">{{ s.code }}</span><h3>{{ s.name }}</h3></div>
          <span class="np-time shift-mono">{{ shortTime(s.start_time) }}–{{ shortTime(s.end_time) }}</span>
        </header>
        <div class="np-fields">
          <label class="np-f"><span>Allowance (₹)</span><input v-model.number="draft[s.id].allowance_amount" type="number" min="0" class="np-input" /></label>
          <label class="np-f"><span>OT rate (×)</span><input v-model.number="draft[s.id].overtime_rate" type="number" min="1" step="0.25" class="np-input" /></label>
        </div>
        <div class="np-toggles">
          <label class="np-tg" :class="{ on: draft[s.id].transport_required }"><input type="checkbox" v-model="draft[s.id].transport_required" /><Bus :size="13" /> Transport</label>
          <label class="np-tg" :class="{ on: draft[s.id].meal_eligible }"><input type="checkbox" v-model="draft[s.id].meal_eligible" /><Utensils :size="13" /> Meal</label>
          <label class="np-tg" :class="{ on: draft[s.id].safety_compliance }"><input type="checkbox" v-model="draft[s.id].safety_compliance" /><ShieldCheck :size="13" /> Safety</label>
        </div>
        <button class="np-save" :disabled="savingId === s.id" @click="save(s)">
          <Loader2 v-if="savingId === s.id" :size="13" class="spin" /><Save v-else :size="13" /> Save policy
        </button>
      </Motion>
    </div>
    <ShiftEmptyState v-else-if="!loading" :icon="Moon" title="No night shifts defined"
      sub="Night shifts are shift templates with type = NIGHT. Create one in Shift Management to configure its night-ops policy here." />
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Moon, RefreshCw, Bus, Utensils, ShieldCheck, Save, Loader2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import { fetchShifts, fetchNightPolicies, upsertNightPolicy, fetchNightRoster, shortTime } from '@/composables/useShifts'

const toast = useToast()
const nightShifts = ref([])
const roster = ref([])
const loading = ref(false)
const savingId = ref(null)
const draft = reactive({})

const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'

const reload = async () => {
  loading.value = true
  try {
    const [sh, pols, rost] = await Promise.all([
      fetchShifts({ limit: 100, shift_type: 'NIGHT' }),
      fetchNightPolicies(),
      fetchNightRoster(),
    ])
    nightShifts.value = sh.items || []
    roster.value = rost.staff || []
    const pmap = {}
    for (const p of (Array.isArray(pols) ? pols : [])) pmap[p.shift_id] = p
    for (const k of Object.keys(draft)) delete draft[k]
    for (const s of nightShifts.value) {
      const p = pmap[s.id]
      draft[s.id] = {
        allowance_amount: p ? p.allowance_amount : 0,
        overtime_rate: p ? p.overtime_rate : 1.5,
        transport_required: p ? p.transport_required : false,
        meal_eligible: p ? p.meal_eligible : false,
        safety_compliance: p ? p.safety_compliance : true,
      }
    }
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load night console') }
  finally { loading.value = false }
}
onMounted(reload)

const save = async (s) => {
  savingId.value = s.id
  try {
    await upsertNightPolicy({ shift_id: s.id, ...draft[s.id] })
    toast.success(`${s.name} policy saved`)
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not save policy') }
  finally { savingId.value = null }
}
</script>

<style scoped>
.night { display: flex; flex-direction: column; gap: 16px; }
.night-banner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 20px 24px; border-radius: 20px; overflow: hidden; background: var(--shift-surface); border: 1px solid var(--shift-border); }
.banner-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.banner-text { position: relative; z-index: 1; max-width: 640px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.banner-text h2 { margin: 6px 0 4px; font-size: 22px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.02em; }
.banner-text p { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 10px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; flex-shrink: 0; }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

.card { background: var(--shift-surface); border: 1px solid var(--shift-border-soft); border-radius: 18px; padding: 16px 18px; }
.card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.hnum { color: var(--shift-amber); display: inline-flex; }
.card-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--shift-text); flex: 1; }
.hmeta { font-family: var(--shift-mono); font-size: 10.5px; color: var(--shift-text-muted); }
.roster { display: flex; flex-wrap: wrap; gap: 10px; }
.rchip { display: flex; align-items: center; gap: 9px; padding: 8px 12px; border-radius: 12px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.rc-av { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-size: 10px; font-weight: 700; background: rgba(251,191,36,0.14); color: var(--shift-amber); font-family: var(--shift-mono); }
.rc-meta b { display: block; font-size: 12.5px; color: var(--shift-text); }
.rc-meta small { font-size: 10px; color: var(--shift-text-muted); font-family: var(--shift-mono); }
.rc-perks { display: flex; align-items: center; gap: 5px; margin-left: 4px; }
.perk { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; padding: 2px 6px; border-radius: 6px; background: rgba(251,191,36,0.12); color: var(--shift-amber); font-family: var(--shift-mono); }
.empty-note { color: var(--shift-text-muted); font-size: 13px; padding: 16px 6px; text-align: center; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 13px; }
.np-card { display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 16px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.np-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.np-code { font-family: var(--shift-mono); font-size: 10px; color: var(--shift-amber); }
.np-head h3 { margin: 2px 0 0; font-size: 14px; font-weight: 700; color: var(--shift-text); }
.np-time { font-size: 11px; color: var(--shift-text-muted); }
.np-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.np-f { display: flex; flex-direction: column; gap: 5px; }
.np-f > span { font-size: 11px; color: var(--shift-text-muted); }
.np-input { background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); border-radius: 9px; padding: 8px 10px; color: var(--shift-text); font: inherit; font-size: 13px; }
.np-toggles { display: flex; flex-wrap: wrap; gap: 7px; }
.np-tg { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 9px; cursor: pointer; font-size: 11.5px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-muted); }
.np-tg input { display: none; }
.np-tg.on { border-color: var(--shift-amber); color: var(--shift-amber); background: rgba(251,191,36,0.1); }
.np-save { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px; border-radius: 10px; cursor: pointer; border: none; background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 12.5px; margin-top: auto; }
.np-save:disabled { opacity: 0.6; }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }
</style>
