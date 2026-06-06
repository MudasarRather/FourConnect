<template>
  <div class="sec">
    <!-- ══════════ AUTHORIZATION DESK — sign-off console ══════════ -->
    <Motion class="signoff" as="section"
      :initial="{ opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16,1,0.3,1] }">
      <span class="so-aura" aria-hidden="true" />
      <span class="so-grid" aria-hidden="true" />

      <div class="so-left">
        <span class="so-eyebrow"><Stamp :size="13" /> Authorization desk</span>
        <h2 class="so-foil">Sign-off &amp; approve</h2>
        <p>Verified pay runs await your authorization. Every approval is a maker-checker gate — review the dossier, then sign or send it back for recalculation.</p>

        <!-- maker-checker flow -->
        <div class="mc-flow">
          <div v-for="(st, i) in MC_STAGES" :key="st.key" class="mc-stage" :class="st.cls">
            <span class="mc-node"><component :is="st.icon" :size="13" /></span>
            <span class="mc-name">{{ st.label }}</span>
            <span v-if="i < MC_STAGES.length-1" class="mc-link"><span class="mc-flow-fill" :class="{ on: st.cls.done }" /></span>
          </div>
        </div>
      </div>

      <!-- wax-seal aggregate -->
      <div class="so-seal">
        <div class="seal-emblem" :class="{ empty: !items.length }">
          <span class="seal-ring" /><span class="seal-ring r2" /><span class="seal-halo" />
          <Stamp :size="26" />
        </div>
        <div class="so-figures">
          <span class="so-lbl">Net awaiting authorization</span>
          <PayMoneyValue class="so-net" tone="net" :value="totalNet" :duration="950" />
          <div class="so-chips">
            <span><ScrollText :size="12" /> {{ items.length }} run{{ items.length === 1 ? '' : 's' }}</span>
            <span><Users :size="12" /> {{ totalEmp }} employees</span>
          </div>
        </div>
      </div>
    </Motion>

    <!-- ══════════ AWAITING APPROVAL ══════════ -->
    <div class="lane-head"><h3><ShieldCheck :size="15" /> Awaiting your approval</h3><span class="mono">{{ items.length }}</span></div>

    <div v-if="loading" class="cards"><div v-for="i in 2" :key="i" class="pay-skel" style="height:172px;border-radius:20px" /></div>
    <PayEmptyState v-else-if="!items.length" :icon="BadgeCheck" title="Queue is clear"
      sub="Verified pay runs land here for sign-off — nothing pending right now." />

    <div v-else class="cards">
      <Motion v-for="(b, i) in items" :key="b.id" as="article" class="dossier" :class="{ stamping: stampId === b.id, leaving: leavingId === b.id }"
        :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.46, delay: Math.min(i*0.07,0.4), ease: [0.16,1,0.3,1] }"
        :whileHover="(stampId || leavingId) ? {} : { y: -3 }">
        <span class="dos-spine" />

        <!-- approve/return stamp overlay -->
        <transition name="stamp-fade">
          <div v-if="stampId === b.id" class="dos-stamp" :class="stampKind">
            <span class="stamp-seal"><component :is="stampKind === 'approve' ? BadgeCheck : Undo2" :size="26" />
              <b>{{ stampKind === 'approve' ? 'APPROVED' : 'RETURNED' }}</b></span>
          </div>
        </transition>

        <div class="dos-head">
          <div class="dos-id">
            <span class="dos-no">{{ b.batch_no }}</span>
            <span class="dos-per">{{ monthLabel(b.period_month) }} {{ b.period_year }} · {{ b.department_name || 'All departments' }}</span>
          </div>
          <span class="dos-seal verified">VERIFIED</span>
        </div>

        <!-- allocation bar: net vs deductions of gross -->
        <div class="dos-bar" :title="`Take-home ${pct(b.total_net, b.total_gross)}% · Deductions ${pct(b.total_deductions, b.total_gross)}%`">
          <Motion as="span" class="seg net" :initial="{ scaleX: 0 }" :animate="{ scaleX: 1 }"
            :transition="{ duration: 0.8, delay: 0.2 + i*0.05, ease: [0.16,1,0.3,1] }"
            :style="{ width: pct(b.total_net, b.total_gross) + '%' }" />
          <Motion as="span" class="seg ded" :initial="{ scaleX: 0 }" :animate="{ scaleX: 1 }"
            :transition="{ duration: 0.8, delay: 0.32 + i*0.05, ease: [0.16,1,0.3,1] }"
            :style="{ width: pct(b.total_deductions, b.total_gross) + '%' }" />
        </div>

        <div class="dos-totals">
          <div><span><Users :size="11" /> Employees</span><b>{{ b.total_employees }}</b></div>
          <div><span>Gross</span><PayMoneyValue :value="b.total_gross" :animate="false" /></div>
          <div><span>Deductions</span><PayMoneyValue tone="deduction" :value="b.total_deductions" :animate="false" /></div>
          <div class="net"><span>Net payable</span><PayMoneyValue tone="net" :value="b.total_net" :animate="false" /></div>
        </div>

        <div class="dos-foot">
          <span class="dos-emp"><Building2 :size="13" /> Employer cost <b><PayMoneyValue :value="b.total_employer_cost" :animate="false" /></b></span>
          <div class="spacer" />
          <button class="dlink" :disabled="busy === b.id" @click="$emit('open-batch', b.id)"><Eye :size="14" /> Review detail</button>
          <button class="dbtn ghost" :disabled="busy === b.id" @click="act(b, 'return')"><Undo2 :size="14" /> Return</button>
          <Motion as="button" class="dbtn approve" :disabled="busy === b.id"
            :whileHover="busy === b.id ? {} : { y: -2 }" :whileTap="{ scale: 0.96 }" @click="act(b, 'approve')">
            <span class="ap-sheen" /><BadgeCheck :size="15" /> Approve &amp; sign
          </Motion>
        </div>
      </Motion>
    </div>

    <!-- ══════════ APPROVED · READY TO RELEASE ══════════ -->
    <template v-if="approved.length">
      <div class="lane-head sub"><h3><Banknote :size="15" /> Approved · ready to release</h3><span class="mono">{{ approved.length }}</span></div>
      <div class="rr-grid">
        <Motion v-for="(b, i) in approved" :key="b.id" as="button" class="rr-card"
          :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: Math.min(i*0.05,0.3), ease: [0.16,1,0.3,1] }"
          :whileHover="{ y: -3 }" @click="$emit('open-batch', b.id)">
          <div class="rr-top"><span class="rr-no">{{ b.batch_no }}</span><span class="dos-seal approved">APPROVED</span></div>
          <span class="rr-per">{{ monthLabel(b.period_month) }} {{ b.period_year }}</span>
          <PayMoneyValue class="rr-net" tone="net" :value="b.total_net" :short="true" :animate="false" />
          <span class="rr-go">Release in Monthly run <ArrowRight :size="13" /></span>
        </Motion>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { ShieldCheck, Eye, Stamp, BadgeCheck, Undo2, Users, Building2, Banknote,
  ScrollText, ArrowRight, Cog } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import { monthLabel } from '@/composables/usePayroll'
import { fetchBatches, transitionBatch } from '@/composables/usePayrollBatch'

const emit = defineEmits(['refresh-stats', 'open-batch'])
const toast = useToast()
const items = ref([]); const approved = ref([]); const loading = ref(false); const busy = ref(null)
const stampId = ref(null); const stampKind = ref('approve'); const leavingId = ref(null)

const MC_STAGES = [
  { key: 'GENERATED', label: 'Generated', icon: Cog,        cls: { done: true } },
  { key: 'VERIFIED',  label: 'Verified',  icon: ShieldCheck, cls: { done: true } },
  { key: 'APPROVE',   label: 'Approve',   icon: Stamp,       cls: { active: true } },
  { key: 'RELEASED',  label: 'Released',  icon: Banknote,    cls: {} },
]

const totalNet = computed(() => items.value.reduce((a, b) => a + Number(b.total_net || 0), 0))
const totalEmp = computed(() => items.value.reduce((a, b) => a + Number(b.total_employees || 0), 0))
const pct = (v, g) => { const G = Number(g || 0); return G ? Math.max(0, Math.min(100, Math.round(Number(v || 0) / G * 100))) : 0 }
const wait = (ms) => new Promise(r => setTimeout(r, ms))

const reload = async () => {
  loading.value = true
  try { items.value = (await fetchBatches({ status: 'VERIFIED', limit: 50 })).items || [] }
  catch { toast.error('Failed to load approval queue') }
  finally { loading.value = false }
}
const loadApproved = async () => {
  try { approved.value = (await fetchBatches({ status: 'APPROVED', limit: 12 })).items || [] }
  catch { approved.value = [] }
}
const act = async (b, action) => {
  if (busy.value) return
  busy.value = b.id; stampId.value = b.id; stampKind.value = action
  try {
    await transitionBatch(b.id, action, action === 'return' ? { note: 'Returned for recalculation' } : {})
    await wait(720)                       // let the seal press in
    leavingId.value = b.id
    await wait(420)                       // slide-out
    items.value = items.value.filter(x => x.id !== b.id)
    toast.success(action === 'approve' ? 'Run approved & signed' : 'Run returned for recalculation')
    emit('refresh-stats')
    if (action === 'approve') loadApproved()
  } catch (e) {
    toast.error(e?.response?.data?.detail || `Failed to ${action}`)
  } finally {
    busy.value = null; stampId.value = null; leavingId.value = null
  }
}
onMounted(() => { reload(); loadApproved() })
</script>

<style scoped>
.sec { display: flex; flex-direction: column; gap: 18px; padding-top: 8px; }
.mono { font-family: var(--pay-mono); }

/* ══════════ SIGN-OFF CONSOLE ══════════ */
.signoff { position: relative; overflow: hidden; border-radius: 24px; border: 1px solid var(--pay-border);
  padding: 26px 28px; display: flex; gap: 28px; align-items: center; justify-content: space-between; flex-wrap: wrap;
  background:
    radial-gradient(120% 130% at 8% -10%, rgba(251,191,36,0.16), transparent 52%),
    radial-gradient(120% 120% at 100% 110%, rgba(52,211,153,0.12), transparent 55%),
    var(--pay-surface-2);
  box-shadow: 0 28px 80px -42px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05); }
.so-aura { position: absolute; inset: -30% auto auto -10%; width: 70%; height: 90%; pointer-events: none; z-index: 0;
  background: radial-gradient(60% 80% at 30% 20%, rgba(251,191,36,0.2), transparent 60%);
  filter: blur(16px); animation: pay-aurora-drift 12s ease-in-out infinite; }
.so-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5;
  background-image: linear-gradient(rgba(251,191,36,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.05) 1px, transparent 1px);
  background-size: 38px 38px; mask-image: radial-gradient(80% 80% at 50% 0%, #000, transparent 75%); }

.so-left { position: relative; z-index: 1; flex: 1; min-width: 300px; }
.so-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); font-size: 11px;
  text-transform: uppercase; letter-spacing: 0.13em; color: var(--pay-treasury); }
.so-foil { margin: 9px 0 7px; font-size: 30px; font-weight: 800; letter-spacing: -0.02em; line-height: 1;
  background: linear-gradient(100deg, var(--pay-text) 30%, var(--pay-mint-bright) 50%, var(--pay-text) 70%);
  background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  animation: pay-foil-text 6s linear infinite; }
.so-left p { margin: 0 0 18px; color: var(--pay-text-2); font-size: 13.5px; line-height: 1.55; max-width: 460px; }

/* maker-checker flow */
.mc-flow { display: flex; align-items: center; }
.mc-stage { position: relative; display: flex; align-items: center; gap: 8px; flex: 1; }
.mc-stage:last-child { flex: 0 0 auto; }
.mc-node { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); color: var(--pay-text-muted);
  transition: background 0.4s, border-color 0.4s, color 0.4s, box-shadow 0.4s; }
.mc-stage.done .mc-node { background: var(--pay-net-soft); border-color: rgba(52,211,153,0.4); color: var(--pay-net); }
.mc-stage.active .mc-node { background: var(--pay-grad-cta); border-color: transparent; color: #1a1206;
  box-shadow: 0 8px 20px -8px rgba(245,158,11,0.7); animation: pay-node-halo 1.9s ease-in-out infinite; }
.mc-name { font-size: 11px; color: var(--pay-text-muted); white-space: nowrap; }
.mc-stage.done .mc-name, .mc-stage.active .mc-name { color: var(--pay-text-2); }
.mc-stage.active .mc-name { color: var(--pay-treasury); font-weight: 700; }
.mc-link { flex: 1; min-width: 18px; height: 3px; margin: 0 10px; border-radius: 3px; position: relative; background: var(--pay-border-soft); overflow: hidden; }
.mc-flow-fill { position: absolute; inset: 0; transform-origin: left; transform: scaleX(0);
  background: linear-gradient(90deg, var(--pay-net-strong), var(--pay-net)); transition: transform 0.6s var(--pay-ease); }
.mc-flow-fill.on { transform: scaleX(1); }

/* wax seal */
.so-seal { position: relative; z-index: 1; display: flex; align-items: center; gap: 18px; flex-shrink: 0; }
.seal-emblem { position: relative; width: 92px; height: 92px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0;
  color: #1a1206; background: var(--pay-grad-coin);
  box-shadow: 0 14px 36px -12px rgba(245,158,11,0.6), inset 0 2px 6px rgba(255,255,255,0.35), inset 0 -3px 8px rgba(120,53,15,0.35);
  animation: pay-seal-press 0.7s var(--pay-spring) both; }
.seal-emblem.empty { filter: saturate(0.6) opacity(0.7); }
.seal-ring { position: absolute; inset: -7px; border-radius: 50%; border: 1.5px dashed rgba(251,191,36,0.55); animation: pay-orbit 16s linear infinite; }
.seal-ring.r2 { inset: -13px; border-color: rgba(251,191,36,0.28); animation: pay-orbit 24s linear infinite reverse; }
.seal-halo { position: absolute; inset: -3px; border-radius: 50%; animation: pay-node-halo 2.6s ease-in-out infinite; }
.so-figures { display: flex; flex-direction: column; gap: 3px; }
.so-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--pay-net-strong); }
.so-net { font-size: 30px; }
.so-chips { display: flex; gap: 14px; margin-top: 4px; }
.so-chips span { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--pay-text-muted); }

/* ══════════ LANES ══════════ */
.lane-head { display: flex; align-items: center; gap: 10px; margin-top: 2px; }
.lane-head h3 { margin: 0; font-size: 14px; color: var(--pay-text); display: inline-flex; align-items: center; gap: 7px; }
.lane-head h3 svg { color: var(--pay-treasury); }
.lane-head .mono { font-size: 11px; color: var(--pay-text-muted); padding: 2px 9px; border-radius: 999px; background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
.lane-head.sub { margin-top: 6px; }
.lane-head.sub h3 svg { color: var(--pay-net); }

.cards { display: flex; flex-direction: column; gap: 14px; }

/* ── approval dossier ── */
.dossier { position: relative; overflow: hidden; border-radius: 20px; padding: 18px 20px 16px 24px;
  background: radial-gradient(120% 80% at 100% 0%, rgba(251,191,36,0.07), transparent 50%), var(--pay-surface);
  border: 1px solid var(--pay-border); transition: opacity 0.42s var(--pay-ease), transform 0.42s var(--pay-ease), border-color 0.25s, box-shadow 0.25s; }
.dossier:hover { border-color: var(--pay-border); box-shadow: 0 20px 48px -28px rgba(0,0,0,0.6); }
.dossier.leaving { opacity: 0; transform: translateX(48px) scale(0.97); }
.dossier.stamping { border-color: var(--pay-treasury); }
.dos-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--pay-grad-rail); }

/* stamp overlay */
.dos-stamp { position: absolute; inset: 0; z-index: 5; display: grid; place-items: center;
  background: radial-gradient(60% 60% at 70% 30%, rgba(251,191,36,0.14), transparent 70%), rgba(20,14,7,0.32);
  backdrop-filter: blur(1.5px); }
.stamp-seal { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 22px; border-radius: 14px;
  border: 2.5px solid var(--pay-net); color: var(--pay-net); transform: rotate(-11deg);
  animation: pay-seal-press 0.55s var(--pay-spring) both; }
.stamp-seal b { font-family: var(--pay-mono); font-size: 15px; font-weight: 800; letter-spacing: 0.16em; }
.dos-stamp.return .stamp-seal { border-color: var(--pay-deduction); color: var(--pay-deduction); }
.stamp-fade-enter-active, .stamp-fade-leave-active { transition: opacity 0.3s; }
.stamp-fade-enter-from, .stamp-fade-leave-to { opacity: 0; }

.dos-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 13px; }
.dos-no { font-family: var(--pay-mono); font-size: 16px; color: var(--pay-text); font-weight: 700; }
.dos-per { display: block; font-size: 12px; color: var(--pay-text-muted); margin-top: 2px; }
.dos-seal { font-family: var(--pay-mono); font-size: 10px; font-weight: 800; letter-spacing: 0.08em; padding: 4px 10px;
  border-radius: 8px; border: 1.5px solid currentColor; white-space: nowrap; }
.dos-seal.verified { color: var(--pay-treasury); }
.dos-seal.approved { color: var(--pay-net); }

.dos-bar { display: flex; height: 9px; border-radius: 999px; overflow: hidden; margin-bottom: 14px;
  background: var(--pay-surface-2); border: 1px solid var(--pay-border-soft); }
.dos-bar .seg { height: 100%; transform-origin: left; }
.dos-bar .seg.net { background: linear-gradient(90deg, var(--pay-net-strong), var(--pay-net)); }
.dos-bar .seg.ded { background: linear-gradient(90deg, var(--pay-deduction), #ea580c); }

.dos-totals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
.dos-totals div { display: flex; flex-direction: column; gap: 3px; }
.dos-totals span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--pay-text-muted); display: inline-flex; align-items: center; gap: 4px; }
.dos-totals b, .dos-totals :deep(.pay-money) { font-family: var(--pay-mono); font-size: 16px; color: var(--pay-text); }
.dos-totals .net span { color: var(--pay-net-strong); }
.dos-totals .net :deep(.pay-money) { font-size: 18px; }

.dos-foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dos-emp { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--pay-text-muted); }
.dos-emp b :deep(.pay-money), .dos-emp :deep(.pay-money) { font-size: 12px; color: var(--pay-text-2); }
.spacer { flex: 1; }
.dlink { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; color: var(--pay-text-muted); font-size: 12.5px; }
.dlink:hover:not(:disabled) { color: var(--pay-treasury); }
.dbtn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 11px; cursor: pointer; font-weight: 700; font-size: 13px; border: 1px solid transparent;
  transition: transform 0.16s var(--pay-spring), border-color 0.18s, color 0.18s, background 0.18s; }
.dbtn:disabled { opacity: 0.5; cursor: not-allowed; }
.dbtn.ghost { background: transparent; border-color: var(--pay-border-soft); color: var(--pay-text-2); }
.dbtn.ghost:hover:not(:disabled) { border-color: var(--pay-deduction); color: var(--pay-deduction); }
.dbtn.approve { position: relative; overflow: hidden; background: var(--pay-grad-cta); color: #1a1206; box-shadow: 0 8px 22px -10px rgba(245,158,11,0.7); }
.ap-sheen { position: absolute; top: 0; bottom: 0; left: 0; width: 36%; transform: translateX(-220%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); }
.dbtn.approve:hover:not(:disabled) .ap-sheen { animation: pay-foil-sweep 0.9s var(--pay-ease); }

/* ── ready to release ── */
.rr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.rr-card { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 5px; align-items: flex-start; text-align: left;
  padding: 14px 16px; border-radius: 16px; cursor: pointer;
  background: var(--pay-net-soft); border: 1px solid rgba(52,211,153,0.26); transition: border-color 0.25s, box-shadow 0.25s; }
.rr-card:hover { border-color: var(--pay-net); box-shadow: 0 16px 36px -22px rgba(16,185,129,0.5); }
.rr-top { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px; }
.rr-no { font-family: var(--pay-mono); font-size: 13px; color: var(--pay-text); font-weight: 700; }
.rr-per { font-size: 11px; color: var(--pay-text-muted); }
.rr-net { font-size: 18px; }
.rr-go { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--pay-net-strong); font-weight: 600; margin-top: 2px; }
.rr-card:hover .rr-go { gap: 8px; }

@media (max-width: 760px) {
  .signoff { flex-direction: column; align-items: stretch; }
  .so-seal { justify-content: center; }
  .mc-flow { overflow-x: auto; } .mc-name { display: none; }
  .dos-totals { grid-template-columns: 1fr 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .so-aura, .so-foil, .seal-emblem, .seal-ring, .seal-halo, .stamp-seal, .dbtn.approve:hover .ap-sheen, .mc-stage.active .mc-node { animation: none !important; }
  .so-foil { -webkit-text-fill-color: var(--pay-text); }
  .dossier { transition: none; }
}

/* ════════ LIGHT THEME ════════ */
[data-theme="light"] .signoff {
  background:
    radial-gradient(120% 130% at 8% -10%, rgba(245,158,11,0.14), transparent 52%),
    radial-gradient(120% 120% at 100% 110%, rgba(5,150,105,0.10), transparent 55%),
    var(--pay-surface-2);
  box-shadow: 0 24px 60px -40px rgba(40,25,10,0.3), inset 0 1px 0 rgba(255,255,255,0.6); }
[data-theme="light"] .so-foil {
  background: linear-gradient(100deg, var(--pay-text) 35%, #d97706 50%, var(--pay-text) 65%);
  background-size: 200% auto; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
[data-theme="light"] .mc-node { background: rgba(255,250,240,0.8); }
[data-theme="light"] .so-grid { opacity: 0.4;
  background-image: linear-gradient(rgba(184,134,11,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(184,134,11,0.07) 1px, transparent 1px); }
[data-theme="light"] .dos-stamp { background: radial-gradient(60% 60% at 70% 30%, rgba(245,158,11,0.12), transparent 70%), rgba(255,250,240,0.5); }
</style>
