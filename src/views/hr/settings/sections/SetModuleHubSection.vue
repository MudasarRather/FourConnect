<template>
  <div class="mh">
    <SetSectionHead :eyebrow="domain.eyebrow" :title="domain.label.replace(' Settings','')" accent="Settings"
      :accent-color="domain.accent" :icon="domain.icon" :sub="hub.sub" />

    <div class="mh-note">
      <Info :size="14" />
      <span>These settings are configured inside the {{ hub.moduleLabel }} workspace. Jump straight to the surface you need.</span>
    </div>

    <div class="mh-grid">
      <button v-for="(s, i) in hub.surfaces" :key="s.label" class="mh-card" :style="{ '--acc': domain.accent, '--i': i }" @click="go(s.to)">
        <span class="mh-card-ic"><component :is="s.icon" :size="17" /></span>
        <div class="mh-card-text">
          <b>{{ s.label }}</b>
          <span>{{ s.desc }}</span>
        </div>
        <span class="mh-card-go"><ArrowUpRight :size="15" /></span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Info, ArrowUpRight, Workflow, Users, ClipboardList, FileText, Award, Boxes, Rocket,
  Layers, ShieldCheck, Target, Calendar, GraduationCap, BadgeCheck,
} from 'lucide-vue-next'
import SetSectionHead from '../components/SetSectionHead.vue'

const props = defineProps({ domain: { type: Object, required: true } })
const router = useRouter()

const HUBS = {
  recruitment: {
    moduleLabel: 'Recruitment', sub: 'Interview stages, candidate statuses, hiring sources and offer templates that shape the hiring pipeline.',
    surfaces: [
      { label: 'Interview stages', desc: 'Rounds, types and panels', icon: Workflow, to: '/admin/hr/recruitment/interviews' },
      { label: 'Candidate pipeline', desc: 'Stages & statuses', icon: Users, to: '/admin/hr/recruitment/pipeline' },
      { label: 'Applications & sources', desc: 'Hiring sources', icon: ClipboardList, to: '/admin/hr/recruitment/applications' },
      { label: 'Offer templates', desc: 'Offer configuration', icon: FileText, to: '/admin/hr/recruitment/offers' },
      { label: 'Requisitions', desc: 'Approval & openings', icon: BadgeCheck, to: '/admin/hr/recruitment/requisitions' },
    ],
  },
  onboarding: {
    moduleLabel: 'Onboarding', sub: 'Joining checklists, document requirements, welcome kits and probation rules for the onboarding journey.',
    surfaces: [
      { label: 'Checklist templates', desc: 'Per-stage tasks', icon: ClipboardList, to: '/admin/hr/onboarding/checklist' },
      { label: 'Document requirements', desc: 'Required documents', icon: FileText, to: '/admin/hr/onboarding/documents' },
      { label: 'Welcome kit', desc: 'Kit fulfilment', icon: Boxes, to: '/admin/hr/onboarding/welcome-kit' },
      { label: 'Induction', desc: 'Sessions & schedule', icon: Rocket, to: '/admin/hr/onboarding/induction' },
      { label: 'Probation rules', desc: 'Probation tracking', icon: ShieldCheck, to: '/admin/hr/onboarding/probation' },
    ],
  },
  training: {
    moduleLabel: 'Training', sub: 'Skill levels, training categories, certification types and renewal windows for the learning module.',
    surfaces: [
      { label: 'Skill matrix', desc: 'Skill levels & gaps', icon: Layers, to: '/admin/hr/training/skill-matrix' },
      { label: 'Certifications', desc: 'Types & renewals', icon: Award, to: '/admin/hr/training/certifications' },
      { label: 'Programs & categories', desc: 'Course catalog', icon: GraduationCap, to: '/admin/hr/training/programs' },
      { label: 'Compliance training', desc: 'Mandatory training', icon: ShieldCheck, to: '/admin/hr/training/compliance' },
      { label: 'Assessments', desc: 'Tests & results', icon: Target, to: '/admin/hr/training/assessments' },
      { label: 'Budget', desc: 'Training spend', icon: Calendar, to: '/admin/hr/training/budget' },
    ],
  },
}
const hub = computed(() => HUBS[props.domain.slug] || { moduleLabel: props.domain.label, sub: props.domain.blurb, surfaces: [] })
const go = (to) => router.push(to)
</script>

<style scoped>
.mh { display: flex; flex-direction: column; gap: 16px; }
.mh-note { display: flex; align-items: center; gap: 9px; padding: 12px 15px; border-radius: 12px; font-size: 12.5px; color: var(--set-text-muted);
  background: var(--set-surface); border: 1px solid var(--set-border); }
.mh-note :deep(svg) { color: var(--set-gold); flex-shrink: 0; }
.mh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 13px; }
.mh-card { display: flex; align-items: center; gap: 12px; padding: 15px 16px; border-radius: 14px; cursor: pointer; text-align: left;
  background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); transition: transform 0.25s var(--set-spring), border-color 0.25s;
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.04s); }
.mh-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--acc) 40%, transparent); }
.mh-card-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.mh-card-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.mh-card-text b { font-size: 13.5px; font-weight: 800; color: var(--set-text); }
.mh-card-text span { font-size: 11px; color: var(--set-text-muted); }
.mh-card-go { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--set-text-dim); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.25s var(--set-spring); }
.mh-card:hover .mh-card-go { color: var(--acc); border-color: color-mix(in srgb, var(--acc) 40%, transparent); transform: translate(2px, -2px); }
@media (prefers-reduced-motion: reduce) { .mh-card { animation: none; } }
</style>
