<template>
  <div class="tcs-wrap">
    <Motion class="tcs-card" as="div"
      :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <div class="tcs-orb" aria-hidden="true">
        <span class="ring r1" /><span class="ring r2" /><span class="ring r3" />
        <span class="sweep" />
        <span v-for="s in STARS" :key="s.i" class="star" :style="s.style" />
        <div class="tcs-icon"><component :is="meta.icon" :size="28" /></div>
      </div>
      <span class="tcs-eyebrow">{{ meta.phase }}</span>
      <h2>{{ meta.title }}</h2>
      <p>{{ meta.blurb }}</p>

      <div v-if="teaser != null" class="tcs-teaser">
        <span class="tt-val trn-mono">{{ teaser }}</span>
        <span class="tt-label">{{ meta.teaserLabel }}</span>
      </div>

      <ul class="tcs-feats">
        <li v-for="f in meta.features" :key="f"><Check :size="13" /> {{ f }}</li>
      </ul>
      <div class="tcs-foundation"><ShieldCheck :size="13" /> {{ meta.foundation }}</div>
    </Motion>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Check, ShieldCheck, ClipboardCheck, Wallet, CalendarDays, FileBarChart2, Telescope,
} from 'lucide-vue-next'

const props = defineProps({
  sectionKey: { type: String, required: true },
  teaser: { type: [Number, String], default: null },
})

const STARS = Array.from({ length: 7 }, (_, i) => ({
  i,
  style: {
    top: `${10 + (i * 17) % 80}%`, left: `${8 + (i * 23) % 84}%`,
    animationDelay: `${(i * 0.5).toFixed(2)}s`,
  },
}))

const META = {
  assessments: {
    title: 'Assessments', icon: ClipboardCheck, phase: 'Roadmap — Evaluation',
    blurb: 'Author quizzes and exams, set pass thresholds and attempt limits, and let a passing score auto-complete the enrollment.',
    features: ['Question bank + auto-grading', 'Pass score gates completion', 'Per-attempt history'],
    foundation: 'Scores already record on each enrollment — this adds the grading engine on top.',
    teaserLabel: 'enrollments scored so far',
  },
  budget: {
    title: 'Training Budget', icon: Wallet, phase: 'Roadmap — Finance',
    blurb: 'Allocate L&D budget by department and period, track committed vs spent against programs and trainers, and surface utilisation.',
    features: ['Allocation by dept / period', 'Committed vs spent rollups', 'Cost-per-employee analytics'],
    foundation: 'Program & trainer costs are captured today, ready to roll up when this lands.',
    teaserLabel: 'cost-bearing programs',
  },
  calendar: {
    title: 'Training Calendar', icon: CalendarDays, phase: 'Roadmap — Planning',
    blurb: 'A unified calendar of training schedules, certification renewals and compliance deadlines across day / week / month / year.',
    features: ['Schedule + due-date overlay', 'Certification renewal markers', 'Compliance deadline lanes'],
    foundation: 'Enrollment due-dates and cert expiries already exist — this composes them into one view.',
    teaserLabel: 'dated events available',
  },
  reports: {
    title: 'Reports & Exports', icon: FileBarChart2, phase: 'Roadmap — Reporting',
    blurb: 'Branded PDF / Excel / CSV exports: attendance, completion, skill-gap, certification and compliance-readiness reports.',
    features: ['PDF / Excel / CSV exports', 'Executive ROI & coverage', 'Audit-ready compliance pack'],
    foundation: 'The dashboard already aggregates these metrics live — exports formalise them.',
    teaserLabel: 'metrics aggregated live',
  },
}
const meta = computed(() => META[props.sectionKey] || {
  title: 'Coming soon', icon: Telescope, phase: 'Roadmap',
  blurb: 'This surface is on the Learning Observatory roadmap.', features: [],
  foundation: 'The data model is being prepared.', teaserLabel: '',
})
</script>

<style scoped>
.tcs-wrap { display: grid; place-items: center; min-height: 56vh; padding: 32px; }
.tcs-card { max-width: 580px; text-align: center; padding: 42px 36px; position: relative;
  background: var(--trn-glass); backdrop-filter: var(--trn-glass-blur);
  border: 1px solid var(--trn-border-strong); border-radius: 26px; box-shadow: var(--trn-glass-shadow); }
.tcs-orb { position: relative; width: 130px; height: 130px; margin: 0 auto 18px; }
.tcs-orb .ring { position: absolute; inset: 0; border-radius: 50%; border: 1px solid var(--trn-border-strong); }
.ring.r2 { inset: 15px; opacity: 0.7; animation: trn-orbit-spin 18s linear infinite; }
.ring.r3 { inset: 30px; opacity: 0.45; animation: trn-orbit-spin-rev 24s linear infinite; }
.tcs-orb .sweep { position: absolute; inset: 0; border-radius: 50%; background: var(--trn-grad-sweep);
  -webkit-mask: radial-gradient(transparent 54%, #000 55%); mask: radial-gradient(transparent 54%, #000 55%);
  animation: trn-radar-sweep 5s linear infinite; }
.tcs-orb .star { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: var(--trn-star);
  box-shadow: 0 0 6px var(--trn-star); animation: trn-twinkle 3s ease-in-out infinite; }
.tcs-icon { position: absolute; inset: 42px; border-radius: 50%; display: grid; place-items: center;
  color: var(--trn-amber); background: radial-gradient(circle, var(--trn-dome-glow), transparent 70%); }
.tcs-eyebrow { font-family: var(--trn-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--trn-amber-strong); }
.tcs-card h2 { margin: 8px 0 6px; font-size: 24px; font-weight: 800; color: var(--trn-text); letter-spacing: -0.02em; }
.tcs-card p { margin: 0 auto 18px; color: var(--trn-text-secondary); font-size: 14px; line-height: 1.55; max-width: 460px; }
.tcs-teaser { display: inline-flex; flex-direction: column; gap: 2px; margin: 0 auto 18px; padding: 12px 22px;
  border-radius: 16px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.tt-val { font-size: 28px; font-weight: 800; color: var(--trn-amber); line-height: 1; }
.tt-label { font-size: 11px; color: var(--trn-text-dim); text-transform: uppercase; letter-spacing: 0.08em; }
.tcs-feats { list-style: none; padding: 0; margin: 0 auto 18px; display: inline-flex; flex-direction: column; gap: 8px; text-align: left; }
.tcs-feats li { display: flex; align-items: center; gap: 8px; color: var(--trn-text-secondary); font-size: 13px; }
.tcs-feats li svg { color: var(--trn-st-completed); flex-shrink: 0; }
.tcs-foundation { display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 999px;
  background: var(--trn-cert-active-soft); color: var(--trn-st-completed); font-size: 11.5px; font-weight: 600; }
@media (prefers-reduced-motion: reduce) {
  .ring.r2, .ring.r3, .tcs-orb .sweep, .tcs-orb .star { animation: none !important; }
}
</style>
