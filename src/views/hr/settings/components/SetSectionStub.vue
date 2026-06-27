<template>
  <div class="set-stub">
    <SetSectionHead :eyebrow="domain.eyebrow" :title="domain.label" accent=""
      :accent-color="domain.accent" :sub="domain.blurb" :icon="domain.icon" />

    <Motion as="div" class="stub-card" :style="{ '--acc': domain.accent }"
      :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">
      <span class="stub-grid" aria-hidden="true" />
      <span class="stub-aura" aria-hidden="true" />
      <span class="stub-scan" aria-hidden="true" />

      <div class="stub-body">
        <span class="stub-ic"><component :is="domain.icon" :size="30" /></span>
        <span class="stub-phase">Phase {{ domain.phase }} · On the governance roadmap</span>
        <h2>{{ domain.label }}</h2>
        <p>{{ blueprint }}</p>

        <div v-if="moduleChips.length" class="stub-governs">
          <span class="stub-governs-lab">Powers</span>
          <button v-for="m in moduleChips" :key="m.slug" class="stub-mod" @click="goModule(m.to)">
            <component :is="m.icon" :size="13" /> {{ m.label }}
          </button>
        </div>
      </div>
    </Motion>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { useRouter } from 'vue-router'
import { prefersReduced } from '@/composables/useShiftMotion'
import { MODULES } from './connectivity'
import SetSectionHead from './SetSectionHead.vue'

const props = defineProps({ domain: { type: Object, required: true } })
const router = useRouter()
const reduced = prefersReduced()

const ROADMAP = {
  'separation-reasons': 'A configurable vocabulary of exit reasons — voluntary vs. involuntary, mapped to settlement and rehire-eligibility rules. Replaces the hardcoded reason enum so HR can curate it without a code change.',
  'payroll-rules': 'The calculation brain: payroll cycle, processing date, financial year, LOP & half-day formulas, overtime multipliers, leave-encashment and notice-recovery basis, and the default tax regime — all read by the payroll engine with safe fallbacks.',
  'compliance': 'Statutory rate tables for PF, ESI, Professional Tax and TDS, scoped by financial year and state, with effective-date windows and a live employer/employee contribution simulator.',
  'numbering-series': 'Designer for every auto-generated identifier — Employee, Recruitment, Asset and Exit — with prefix, year tokens, counter width and reset policy, plus a live next-value preview.',
  'approval-workflows': 'A drag-and-drop multi-stage approval chain builder per module (leave, travel, reimbursement, payroll, exit) with a travelling test-packet that visualises exactly how a request will route.',
  'notification-rules': 'An events × channels matrix — decide which lifecycle events fire in-app, email, SMS, push or WhatsApp, and to whom.',
  'recruitment': 'Interview stages, candidate statuses, offer templates and hiring sources that shape the Recruitment pipeline.',
  'onboarding': 'Joining checklist templates, document requirements, asset-allocation templates and probation rules for the Onboarding journey.',
  'training': 'Skill levels, training categories, certification types and renewal-notification windows for the Learning module.',
  'appraisal-templates': 'Performance rubrics — competencies with weightings, rating scales and reviewer chains — ready for the upcoming Performance Management module.',
  'audit-logs': 'A unified, immutable ledger of every settings change across all domains, folded together with each module’s own audit trail.',
}
const blueprint = computed(() => ROADMAP[props.domain.slug] || props.domain.blurb)

const moduleChips = computed(() =>
  (props.domain.governs || []).map(s => ({ slug: s, ...MODULES[s] })).filter(m => m.label))
const goModule = (to) => { if (to) router.push(to) }
</script>

<style scoped>
.set-stub { display: flex; flex-direction: column; gap: 16px; }
.stub-card { position: relative; overflow: hidden; border-radius: 22px; padding: 44px 32px; min-height: 360px;
  display: grid; place-items: center; background: var(--set-surface); border: 1px solid var(--set-border);
  box-shadow: var(--set-card-shadow); }
.stub-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.6;
  background-image: linear-gradient(color-mix(in srgb, var(--acc) 7%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--acc) 7%, transparent) 1px, transparent 1px);
  background-size: 34px 34px; mask-image: radial-gradient(90% 90% at 50% 40%, #000 28%, transparent 78%);
  -webkit-mask-image: radial-gradient(90% 90% at 50% 40%, #000 28%, transparent 78%); }
.stub-aura { position: absolute; inset: -30% 20% auto 20%; height: 80%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--acc) 18%, transparent), transparent 70%); filter: blur(40px); }
.stub-scan { position: absolute; left: 0; right: 0; height: 2px; top: 0;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--acc) 60%, transparent), transparent);
  animation: stub-scan 5s ease-in-out infinite; }
@keyframes stub-scan { 0% { top: 8%; opacity: 0; } 20% { opacity: 0.8; } 80% { opacity: 0.8; } 100% { top: 92%; opacity: 0; } }

.stub-body { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; max-width: 60ch; }
.stub-ic { display: grid; place-items: center; width: 66px; height: 66px; border-radius: 20px; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 12%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 30%, transparent);
  box-shadow: 0 0 30px -6px color-mix(in srgb, var(--acc) 50%, transparent); }
.stub-phase { font-size: 10.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--acc); padding: 4px 12px; border-radius: 999px; background: color-mix(in srgb, var(--acc) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc) 28%, transparent); }
.stub-body h2 { margin: 4px 0 0; font-size: 24px; font-weight: 850; letter-spacing: -0.02em; color: var(--set-text); }
.stub-body p { margin: 0; font-size: 13.5px; line-height: 1.6; color: var(--set-text-muted); }

.stub-governs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
.stub-governs-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.stub-mod { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 12px; font-weight: 600; color: var(--set-text-secondary); background: var(--set-surface);
  border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.stub-mod:hover { color: var(--acc); border-color: color-mix(in srgb, var(--acc) 34%, transparent); transform: translateY(-1px); }
.stub-mod :deep(svg) { color: var(--acc); }

@media (prefers-reduced-motion: reduce) { .stub-scan { animation: none; display: none; } }
</style>
