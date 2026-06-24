<template>
  <div class="charter-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="charter ex-grain" :class="{ inforce: inForce, scoped, off: !policy.is_active, focused }"
      @click="$emit('focus', policy)">
      <span class="ch-glare" aria-hidden="true" />
      <span class="ch-spine" aria-hidden="true" />
      <span class="ch-grid" aria-hidden="true" />

      <!-- ribbon -->
      <span class="ch-ribbon">{{ ribbon }}</span>

      <header class="ch-head">
        <span class="ch-ico"><ScrollText :size="17" /></span>
        <div class="ch-id">
          <span class="ch-name">{{ policy.policy_name }}</span>
          <span class="ch-scope"><component :is="scoped ? GraduationCap : Building2" :size="11" /> {{ policy.grade_name || 'Organisation default' }}</span>
        </div>
        <!-- wax seal -->
        <span class="ch-seal" :style="{ '--ex-p': sealAngle }">
          <span class="seal-ring" aria-hidden="true" />
          <component :is="inForce ? ShieldCheck : Stamp" :size="16" class="seal-ic" />
        </span>
      </header>

      <!-- dials -->
      <div class="ch-dials">
        <div class="dial">
          <span class="dial-v ex-mono">{{ policy.notice_period_days }}<i>d</i></span>
          <span class="dial-l">Notice</span>
          <span class="cal"><span class="cal-fill" :style="{ width: mounted ? noticePct : '0%' }" /></span>
        </div>
        <div class="dial">
          <span class="dial-v ex-mono">{{ policy.probation_notice_days }}<i>d</i></span>
          <span class="dial-l">Probation</span>
          <span class="cal"><span class="cal-fill alt" :style="{ width: mounted ? probPct : '0%' }" /></span>
        </div>
        <div class="dial">
          <span class="dial-v" :class="policy.buyout_allowed ? 'ok' : 'no'">{{ policy.buyout_allowed ? 'Yes' : 'No' }}</span>
          <span class="dial-l">Buyout · {{ (policy.buyout_basis || 'BASIC').toLowerCase() }}</span>
        </div>
        <div class="dial">
          <span class="dial-v" :class="policy.gratuity_enabled ? 'ok' : 'no'">{{ policy.gratuity_enabled ? gratYears : '—' }}</span>
          <span class="dial-l">Gratuity</span>
        </div>
      </div>

      <!-- approval ladder -->
      <div class="ch-chain">
        <span class="chain-lab"><Workflow :size="11" /> Settlement approval</span>
        <div v-if="chain.length" class="chain-rail">
          <template v-for="(a, j) in chain" :key="j">
            <span class="chain-node" :style="{ '--d': j }"><component :is="roleIcon(a.role)" :size="11" /><b>{{ a.label || roleLabel(a.role) }}</b></span>
            <span v-if="j < chain.length - 1" class="chain-link" :style="{ '--d': j }" />
          </template>
        </div>
        <span v-else class="chain-none">Superuser approval only</span>
      </div>

      <!-- footer meta + actions -->
      <footer class="ch-foot">
        <span class="ch-meta"><DoorOpen :size="12" /> {{ gateCount }} gate{{ gateCount === 1 ? '' : 's' }}</span>
        <span class="ch-meta"><MessagesSquare :size="12" /> {{ qCount }} question{{ qCount === 1 ? '' : 's' }}</span>
        <span class="ch-spacer" />
        <Motion as="button" type="button" class="ch-btn" :whileHover="reduced ? {} : { y: -1 }" :whileTap="{ scale: 0.94 }"
          @click.stop="$emit('edit', policy)"><Pencil :size="13" /> Edit</Motion>
        <Motion as="button" type="button" class="ch-btn danger" :whileHover="reduced ? {} : { y: -1 }" :whileTap="{ scale: 0.94 }"
          @click.stop="$emit('delete', policy)"><Trash2 :size="13" /></Motion>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  ScrollText, Stamp, ShieldCheck, Workflow, DoorOpen, MessagesSquare, Pencil, Trash2,
  Briefcase, Users, Landmark, GitBranch, Building2, GraduationCap,
} from 'lucide-vue-next'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  policy: { type: Object, required: true },
  index: { type: Number, default: 0 },
  inForce: { type: Boolean, default: false },   // resolved org-default in force
  focused: { type: Boolean, default: false },   // currently shown in the blueprint
})
defineEmits(['edit', 'delete', 'focus'])

const reduced = prefersReduced()
const cardEl = ref(null)
usePointerSpotlight(cardEl)
const mounted = ref(false)
onMounted(() => { requestAnimationFrame(() => { mounted.value = true }) })

const ROLE = {
  MANAGER: { label: 'Manager', icon: Briefcase },
  HR: { label: 'HR', icon: Users },
  FINANCE: { label: 'Finance', icon: Landmark },
  DEPT_HEAD: { label: 'Dept head', icon: GitBranch },
}
const roleIcon = (r) => ROLE[r]?.icon || Workflow
const roleLabel = (r) => ROLE[r]?.label || r

const scoped = computed(() => !!props.policy.grade_id)
const chain = computed(() => props.policy.approval_levels || [])
const gateCount = computed(() => (props.policy.clearance_template || []).length || 0)
const qCount = computed(() => (props.policy.interview_questions || []).length || 0)
const gratYears = computed(() => `${Number(props.policy.gratuity_min_years ?? 0)}y`)
const ribbon = computed(() => !props.policy.is_active ? 'Inactive' : props.inForce ? 'In force' : scoped.value ? 'Grade override' : 'Default')
const noticePct = computed(() => Math.min(100, Math.round((props.policy.notice_period_days || 0) / 90 * 100)) + '%')
const probPct = computed(() => Math.min(100, Math.round((props.policy.probation_notice_days || 0) / 90 * 100)) + '%')
const sealAngle = computed(() => (props.policy.is_active ? 360 : 90) + 'deg')
</script>

<style scoped>
.charter-shell { animation: ex-deal 0.55s var(--ex-spring) backwards; animation-delay: calc(var(--i) * 0.06s); }
.charter { position: relative; overflow: hidden; cursor: pointer; padding: 0; border-radius: 18px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
  transition: transform 0.35s var(--ex-spring), box-shadow 0.35s, border-color 0.35s; }
.charter:hover { transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-3px);
  box-shadow: var(--ex-shadow-hover); border-color: var(--ex-violet-border); }
.charter.inforce { border-color: color-mix(in srgb, var(--ex-cleared) 32%, transparent); }
.charter.focused { border-color: var(--ex-violet); box-shadow: 0 0 0 1px var(--ex-violet-border), var(--ex-shadow-hover); }
.charter.off { opacity: 0.82; }

.ch-glare { position: absolute; inset: 0; z-index: 4; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(280px 200px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(251,146,60,0.18), transparent 60%); }
.ch-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--ex-violet); box-shadow: 0 0 12px color-mix(in srgb, var(--ex-violet) 55%, transparent); }
.charter.inforce .ch-spine { background: var(--ex-cleared); box-shadow: 0 0 12px color-mix(in srgb, var(--ex-cleared) 55%, transparent); }
.charter.off .ch-spine { background: var(--ex-steel); box-shadow: none; }
.ch-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--ex-border) 1px, transparent 1px), linear-gradient(90deg, var(--ex-border) 1px, transparent 1px);
  background-size: 26px 26px; mask: radial-gradient(120% 90% at 100% 0, #000, transparent 70%); -webkit-mask: radial-gradient(120% 90% at 100% 0, #000, transparent 70%); }

.ch-ribbon { position: absolute; top: 13px; right: -34px; transform: rotate(45deg); width: 130px; text-align: center;
  font-size: 8.5px; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 0; z-index: 3;
  color: #1a1206; background: var(--ex-grad-hero); box-shadow: 0 4px 10px -4px rgba(0,0,0,0.4); }
.charter.inforce .ch-ribbon { background: linear-gradient(135deg, #6ee7b7, #34d399 60%, #10b981); color: #06281b; }
.charter.off .ch-ribbon { background: var(--ex-steel); color: #fff; }

.ch-head { position: relative; display: flex; align-items: center; gap: 11px; padding: 15px 15px 12px; }
.ch-ico { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.charter.inforce .ch-ico { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.ch-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ch-name { font-size: 14.5px; font-weight: 820; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ch-scope { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--ex-text-muted); }
.ch-seal { position: relative; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; margin-right: 8px;
  color: var(--ex-violet); transform: rotate(-8deg); }
.charter.inforce .ch-seal { color: var(--ex-cleared); }
.charter.off .ch-seal { color: var(--ex-steel); }
.seal-ring { position: absolute; inset: 0; border-radius: 50%; padding: 2px;
  background: conic-gradient(from -90deg, currentColor var(--ex-p, 360deg), color-mix(in srgb, currentColor 16%, transparent) 0);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px)); mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px));
  transition: --ex-p 0.9s var(--ex-spring); }
.charter.inforce .seal-ring { animation: seal-pulse 3s ease-in-out infinite; }
.seal-ic { position: relative; }
@keyframes seal-pulse { 0%,100% { filter: drop-shadow(0 0 0 transparent); } 50% { filter: drop-shadow(0 0 7px color-mix(in srgb, var(--ex-cleared) 70%, transparent)); } }

.ch-dials { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; padding: 0 15px 12px; }
.dial { display: flex; flex-direction: column; gap: 2px; padding: 9px 8px 8px; border-radius: 11px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.dial-v { font-size: 15px; font-weight: 850; color: var(--ex-text); line-height: 1; }
.dial-v i { font-size: 10px; font-weight: 700; color: var(--ex-text-muted); font-style: normal; }
.dial-v.ok { color: var(--ex-cleared); } .dial-v.no { color: var(--ex-text-muted); }
.dial-l { font-size: 8.5px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cal { margin-top: 4px; height: 3px; border-radius: 3px; background: color-mix(in srgb, var(--ex-steel) 22%, transparent); overflow: hidden; }
.cal-fill { display: block; height: 100%; border-radius: 3px; background: var(--ex-grad-hero); transition: width 0.9s var(--ex-spring); }
.cal-fill.alt { background: linear-gradient(90deg, var(--ex-amber), var(--ex-ember)); }

.ch-chain { position: relative; padding: 0 15px 12px; }
.chain-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-dim); margin-bottom: 7px; }
.chain-rail { display: flex; align-items: center; gap: 0; flex-wrap: wrap; row-gap: 6px; }
.chain-node { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 750;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border);
  animation: node-rise 0.5s var(--ex-spring) backwards; animation-delay: calc(var(--d) * 0.08s + 0.2s); }
.chain-node b { font-weight: 750; }
.chain-link { width: 14px; height: 2px; flex-shrink: 0; background: linear-gradient(90deg, var(--ex-violet-border), transparent);
  animation: link-draw 0.4s ease backwards; animation-delay: calc(var(--d) * 0.08s + 0.35s); transform-origin: left; }
@keyframes node-rise { 0% { opacity: 0; transform: translateY(6px) scale(0.9); } 100% { opacity: 1; transform: none; } }
@keyframes link-draw { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
.chain-none { font-size: 11px; color: var(--ex-text-muted); }

.ch-foot { position: relative; display: flex; align-items: center; gap: 9px; padding: 11px 15px; border-top: 1px solid var(--ex-border); }
.ch-meta { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 650; color: var(--ex-text-secondary); }
.ch-meta svg { color: var(--ex-text-dim); }
.ch-spacer { flex: 1; }
.ch-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; border-radius: 9px; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 750;
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); color: var(--ex-violet); }
.ch-btn.danger { background: transparent; border-color: var(--ex-border); color: var(--ex-text-muted); padding: 7px 9px; }
.ch-btn.danger:hover { color: var(--ex-blocked); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }

@media (prefers-reduced-motion: reduce) {
  .charter-shell, .chain-node, .chain-link { animation: none; }
  .charter:hover { transform: translateY(-2px); }
  .seal-ring { transition: none; } .charter.inforce .seal-ring { animation: none; }
  .cal-fill { transition: none; }
}
</style>
