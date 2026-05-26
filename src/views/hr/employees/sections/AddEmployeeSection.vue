<template>
  <div class="add-section">
    <!-- Hero: large mission-control inspired card -->
    <section ref="heroRef" class="hero hr-spotlight">
      <div class="grid-bg" aria-hidden="true" />
      <div class="aurora-blob" aria-hidden="true" />

      <!-- Status strip (top) -->
      <div class="status-strip">
        <span class="status-dot" />
        <span class="status-text">ONBOARDING PIPELINE · READY</span>
        <span class="status-divider" />
        <span class="status-meta">{{ stepCount }} STEPS</span>
        <span class="status-divider" />
        <span class="status-meta">{{ fieldCount }} FIELDS</span>
      </div>

      <div class="hero-content">
        <!-- Left: title block -->
        <div class="hero-text">
          <span class="overline">EMPLOYEE · ONBOARDING</span>
          <h2 class="display-title">
            <span class="word w1">Onboard.</span>
            <span class="word w2">Configure.</span>
            <span class="word w3">Activate.</span>
          </h2>
          <p class="desc">
            Walk through four precision steps to bring a new hire into the system.
            Identity, contact, employment terms, and bank — captured once, audited forever.
          </p>

          <div class="action-row">
            <button
              ref="ctaRef"
              type="button"
              class="open-wizard-btn"
              @click="$emit('open-wizard')"
            >
              <span class="btn-content">
                <span class="btn-label">Open Wizard</span>
                <span class="btn-arrow">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="8" x2="13" y2="8" /><polyline points="9,4 13,8 9,12" />
                  </svg>
                </span>
              </span>
              <span class="btn-shine" aria-hidden="true" />
            </button>

            <div class="cmdk-hint">
              <kbd>⌘</kbd><kbd>N</kbd>
              <span class="hint-text">to open</span>
            </div>
          </div>
        </div>

        <!-- Right: animated step preview -->
        <div class="step-preview">
          <div class="preview-frame">
            <div class="preview-head">
              <span class="dot d-r" />
              <span class="dot d-y" />
              <span class="dot d-g" />
              <span class="preview-title">add_employee.flow</span>
            </div>
            <div class="preview-body">
              <div
                v-for="(s, i) in steps"
                :key="s.key"
                class="step-line"
                :class="{ active: i === activeStep }"
                :style="{ '--i': i }"
              >
                <span class="step-num">{{ String(i + 1).padStart(2, '0') }}</span>
                <span class="step-name">{{ s.label }}</span>
                <span class="step-fields">{{ s.fields }} fields</span>
                <span class="step-pulse" />
              </div>
            </div>
            <div class="preview-foot">
              <span class="progress-track">
                <span class="progress-fill" :style="{ width: progressPct + '%' }" />
              </span>
              <span class="progress-text">{{ activeStep + 1 }} / {{ steps.length }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Meta cards — what gets created / what you need ready -->
    <section class="meta-grid">
      <article class="meta-card" ref="card1Ref">
        <div class="meta-icon">
          <Sparkles :size="14" />
        </div>
        <h4>What gets created</h4>
        <ul class="meta-list">
          <li>
            <span class="bullet" />
            <span class="li-text">An <strong>Employee</strong> record with auto-assigned <code>EMP####</code> ID</span>
          </li>
          <li>
            <span class="bullet" />
            <span class="li-text">A linked <strong>User</strong> account (or link an existing one)</span>
          </li>
          <li>
            <span class="bullet" />
            <span class="li-text">A <code>HIRED</code> entry in the lifecycle history timeline</span>
          </li>
          <li>
            <span class="bullet" />
            <span class="li-text">An immutable audit-log entry</span>
          </li>
        </ul>
      </article>

      <article class="meta-card" ref="card2Ref">
        <div class="meta-icon">
          <CheckSquare :size="14" />
        </div>
        <h4>What you'll need ready</h4>
        <ul class="meta-list">
          <li><span class="bullet" /><span class="li-text">Email + Full Name (or existing user to link)</span></li>
          <li><span class="bullet" /><span class="li-text">Aadhaar number, PAN, and statutory IDs</span></li>
          <li><span class="bullet" /><span class="li-text">Department, Designation &amp; Joining date</span></li>
          <li><span class="bullet" /><span class="li-text">Bank details (Account No., IFSC, Tax Regime)</span></li>
        </ul>
      </article>

      <article class="meta-card link-card" ref="card3Ref" @click="$emit('open-wizard')">
        <div class="meta-icon">
          <Zap :size="14" />
        </div>
        <h4>Quick onboarding</h4>
        <p class="link-card-desc">Skip the prep — pick an existing user and we'll auto-fill everything we already know.</p>
        <span class="link-card-arrow">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="8" x2="13" y2="8" /><polyline points="9,4 13,8 9,12" />
          </svg>
        </span>
      </article>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Sparkles, CheckSquare, Zap } from 'lucide-vue-next'
import { useSpotlight } from '../../../../composables/useSpotlight'
import { useMagnetic } from '../../../../composables/useMagnetic'

defineEmits(['open-wizard'])

const heroRef = ref(null)
const ctaRef = ref(null)
const card1Ref = ref(null)
const card2Ref = ref(null)
const card3Ref = ref(null)

useSpotlight(heroRef)
useSpotlight(card1Ref)
useSpotlight(card2Ref)
useSpotlight(card3Ref)
useMagnetic(ctaRef, { strength: 0.18, maxOffset: 8 })

const steps = [
  { key: 'basic', label: 'Identity', fields: 13 },
  { key: 'contact', label: 'Contact', fields: 7 },
  { key: 'employment', label: 'Employment', fields: 12 },
  { key: 'bank', label: 'Bank & Salary', fields: 10 },
]
const stepCount = steps.length
const fieldCount = steps.reduce((s, x) => s + x.fields, 0)

const activeStep = ref(0)
let cycleTimer = null
const cycle = () => {
  activeStep.value = (activeStep.value + 1) % steps.length
}

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const progressPct = ref(0)
const tickProgress = () => {
  progressPct.value = ((activeStep.value + 1) / steps.length) * 100
}

onMounted(() => {
  tickProgress()
  if (reduceMotion) return
  cycleTimer = setInterval(() => {
    cycle()
    tickProgress()
  }, 2600)
})
onBeforeUnmount(() => { if (cycleTimer) clearInterval(cycleTimer) })
</script>

<style scoped>
.add-section { display: flex; flex-direction: column; gap: 18px; }

/* ──────────── Hero ──────────── */
.hero {
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  padding: 28px 32px 32px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background:
    linear-gradient(135deg,
      rgba(20, 20, 22, 0.85) 0%,
      rgba(14, 14, 16, 0.55) 100%);
  backdrop-filter: blur(28px) saturate(170%);
  -webkit-backdrop-filter: blur(28px) saturate(170%);
}

/* Subtle dot-grid background */
.grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 22px 22px;
  background-position: 0 0;
  opacity: 0.55;
  pointer-events: none;
  mask-image: radial-gradient(80% 60% at 50% 50%, black, transparent);
  -webkit-mask-image: radial-gradient(80% 60% at 50% 50%, black, transparent);
}

/* Animated warm aurora blob */
.aurora-blob {
  position: absolute;
  top: -120px;
  right: -100px;
  width: 480px;
  height: 480px;
  background: radial-gradient(closest-side,
    rgba(251, 146, 60, 0.30),
    rgba(251, 191, 36, 0.15) 50%,
    transparent 80%);
  pointer-events: none;
  filter: blur(40px);
  animation: hero-aurora-drift 18s ease-in-out infinite;
}

@keyframes hero-aurora-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-24px, 18px) scale(1.05); }
  66% { transform: translate(20px, -10px) scale(0.95); }
}

/* Status strip */
.status-strip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 5px 12px;
  border: 1px solid rgba(251, 191, 36, 0.16);
  background: rgba(0, 0, 0, 0.24);
  border-radius: 999px;
  margin-bottom: 28px;
  font-family: var(--hr-mono);
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.55);
  animation: status-pulse 2.2s ease-in-out infinite;
}
@keyframes status-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}
.status-text {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--hr-active);
  letter-spacing: 1.4px;
}
.status-meta {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--hr-text-muted);
  letter-spacing: 1px;
}
.status-divider {
  width: 1px;
  height: 10px;
  background: rgba(255, 255, 255, 0.1);
}

/* Hero content layout */
.hero-content {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 36px;
  align-items: center;
}
.hero-text { min-width: 0; }
.overline {
  display: inline-block;
  font-family: var(--hr-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--hr-orange);
  letter-spacing: 2px;
  margin-bottom: 12px;
}

/* Display headline */
.display-title {
  font-size: 42px;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.04em;
  margin: 0 0 14px;
  color: var(--hr-text);
}
.display-title .word {
  display: inline-block;
  opacity: 0;
  transform: translateY(8px);
  animation: word-rise 0.7s var(--hr-spring) forwards;
}
.display-title .w1 { animation-delay: 80ms; }
.display-title .w2 { animation-delay: 200ms; color: var(--hr-accent-gold); }
.display-title .w3 { animation-delay: 320ms; }

@keyframes word-rise {
  to { opacity: 1; transform: translateY(0); }
}

.desc {
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--hr-text-secondary);
  max-width: 480px;
  margin: 0 0 22px;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

/* CTA */
.open-wizard-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 46px;
  padding: 0 22px;
  background: linear-gradient(135deg, #fbbf24 0%, #fb923c 100%);
  border: 0;
  border-radius: 14px;
  color: #1a1a1c;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.2px;
  overflow: hidden;
  transition: transform 240ms var(--hr-spring);
  box-shadow: 0 10px 30px -8px rgba(251, 146, 60, 0.55);
  will-change: transform;
}
.btn-content {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.btn-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: rgba(0, 0, 0, 0.18);
  border-radius: 6px;
  transition: transform 280ms var(--hr-spring), background 280ms var(--hr-spring);
}
.open-wizard-btn:hover .btn-arrow {
  transform: translateX(3px);
  background: rgba(0, 0, 0, 0.28);
}
.btn-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.35) 50%, transparent 70%);
  transform: translateX(-120%);
  transition: transform 700ms var(--hr-spring);
  pointer-events: none;
}
.open-wizard-btn:hover .btn-shine { transform: translateX(120%); }
.open-wizard-btn:hover { box-shadow: 0 16px 40px -8px rgba(251, 146, 60, 0.75); }

.cmdk-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--hr-text-muted);
  font-size: 11.5px;
}
.cmdk-hint kbd {
  font-family: var(--hr-mono);
  font-size: 10px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom-width: 2px;
  border-radius: 5px;
  padding: 2px 6px;
  color: var(--hr-text-secondary);
}
.hint-text { margin-left: 4px; }

/* ──────────── Step preview (terminal-style) ──────────── */
.step-preview { position: relative; }
.preview-frame {
  position: relative;
  background: rgba(8, 8, 10, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 12px 14px 14px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02), 0 18px 40px -22px rgba(0, 0, 0, 0.55);
}
.preview-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  margin-bottom: 10px;
}
.preview-head .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.preview-head .d-r { background: #ef4444; }
.preview-head .d-y { background: #fbbf24; }
.preview-head .d-g { background: #34d399; }
.preview-title {
  margin-left: 8px;
  font-family: var(--hr-mono);
  font-size: 10px;
  color: var(--hr-text-muted);
  letter-spacing: 0.5px;
}

.preview-body { display: flex; flex-direction: column; gap: 4px; }
.step-line {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 7px 10px;
  border-radius: 8px;
  font-family: var(--hr-mono);
  font-size: 11px;
  color: var(--hr-text-muted);
  transition: all 320ms var(--hr-spring);
  opacity: 0;
  transform: translateX(-6px);
  animation: line-in 0.5s var(--hr-spring) forwards;
  animation-delay: calc(var(--i, 0) * 80ms + 200ms);
}
.step-line .step-num { color: var(--hr-text-dim); }
.step-line .step-name { color: var(--hr-text-secondary); font-weight: 500; font-family: inherit; }
.step-line .step-fields { color: var(--hr-text-dim); font-size: 10px; }
.step-line.active {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.12), transparent 80%);
  color: var(--hr-accent-gold);
}
.step-line.active .step-num { color: var(--hr-orange); }
.step-line.active .step-name { color: var(--hr-text); font-weight: 600; }
.step-line.active .step-fields { color: var(--hr-accent-gold); }
.step-pulse {
  position: absolute;
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--hr-accent-gold);
  opacity: 0;
  transition: opacity 220ms;
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.6);
}
.step-line.active .step-pulse {
  opacity: 1;
  animation: pulse-step 1.4s ease-in-out infinite;
}
@keyframes pulse-step {
  0%, 100% { transform: translateY(-50%) scale(1); }
  50% { transform: translateY(-50%) scale(1.4); }
}
@keyframes line-in {
  to { opacity: 1; transform: translateX(0); }
}

.preview-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}
.progress-track {
  flex: 1;
  height: 3px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  overflow: hidden;
}
.progress-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--hr-accent-gold), var(--hr-orange));
  border-radius: 999px;
  transition: width 380ms var(--hr-spring);
}
.progress-text {
  font-family: var(--hr-mono);
  font-size: 10px;
  font-weight: 600;
  color: var(--hr-text-muted);
  letter-spacing: 0.5px;
}

/* ──────────── Meta cards ──────────── */
.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}
.meta-card {
  position: relative;
  background: rgba(20, 20, 22, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 18px 20px 20px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transition: border-color 240ms var(--hr-spring),
              transform 240ms var(--hr-spring);
}
.meta-card:hover {
  border-color: rgba(251, 191, 36, 0.18);
  transform: translateY(-2px);
}

.meta-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(251, 191, 36, 0.10);
  color: var(--hr-accent-gold);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}
.meta-card h4 {
  font-size: 10.5px;
  font-weight: 800;
  color: var(--hr-text);
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 1.4px;
}

.meta-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.meta-list li {
  position: relative;
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 8px;
  align-items: flex-start;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--hr-text-secondary);
}
.li-text {
  /* Single grid cell that lets <strong> and <code> chips wrap inline with the
     surrounding text instead of becoming their own grid items. */
  min-width: 0;
  display: block;
  word-wrap: break-word;
}
.li-text code {
  display: inline-block;
  vertical-align: baseline;
}
.bullet {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: var(--hr-orange);
  border-radius: 50%;
  margin-top: 6px;
  box-shadow: 0 0 6px rgba(251, 146, 60, 0.45);
}
.meta-list strong { color: var(--hr-text); font-weight: 600; }
.meta-list code {
  font-family: var(--hr-mono);
  font-size: 10.5px;
  background: rgba(251, 191, 36, 0.08);
  color: var(--hr-accent-gold);
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid rgba(251, 191, 36, 0.12);
}

.link-card {
  cursor: pointer;
  display: flex;
  flex-direction: column;
}
.link-card-desc {
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--hr-text-secondary);
  margin: 0 0 14px;
}
.link-card-arrow {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.18);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--hr-accent-gold);
  margin-top: auto;
  align-self: flex-end;
  transition: all 240ms var(--hr-spring);
}
.link-card:hover .link-card-arrow {
  transform: translateX(3px);
  background: rgba(251, 191, 36, 0.18);
}

@media (max-width: 920px) {
  .hero-content { grid-template-columns: 1fr; }
  .step-preview { display: none; }
  .display-title { font-size: 32px; }
}
@media (prefers-reduced-motion: reduce) {
  .aurora-blob, .step-pulse, .status-dot { animation: none; }
  .display-title .word { opacity: 1; transform: none; animation: none; }
  .step-line { animation: none; opacity: 1; transform: none; }
}

/* ═════════ LIGHT THEME OVERRIDES — warm cream + amber palette ═════════
   Keep the orange/amber/golden accents vivid; only neutrals invert.
   Frosted-glass feel is preserved with translucent cream surfaces. */
[data-theme="light"] .hero {
  background: linear-gradient(135deg,
    rgba(255, 250, 240, 0.85) 0%,
    rgba(255, 244, 220, 0.62) 100%);
  border-color: rgba(217, 119, 6, 0.16);
  box-shadow: 0 14px 36px -18px rgba(40, 25, 10, 0.22);
}
[data-theme="light"] .grid-bg {
  background-image: radial-gradient(rgba(217, 119, 6, 0.18) 1px, transparent 1px);
  opacity: 0.32;
}
[data-theme="light"] .aurora-blob {
  background: radial-gradient(closest-side,
    rgba(251, 146, 60, 0.32),
    rgba(251, 191, 36, 0.18) 50%,
    transparent 80%);
}
[data-theme="light"] .status-strip {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .status-text { color: #047857; }
[data-theme="light"] .status-meta { color: #6b5840; }
[data-theme="light"] .status-divider { background: rgba(40, 25, 10, 0.18); }
[data-theme="light"] .overline { color: #d97706; }
[data-theme="light"] .display-title { color: #1a1410; }
[data-theme="light"] .display-title .w2 { color: #b45309; }
[data-theme="light"] .desc { color: #44362a; }
[data-theme="light"] .cmdk-hint { color: #6b5840; }
[data-theme="light"] .cmdk-hint kbd {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(40, 25, 10, 0.18);
  color: #44362a;
}
/* Terminal-style step preview — recoloured for cream so the surface blends
   with the hero. The amber active state still pops. */
[data-theme="light"] .preview-frame {
  background: rgba(255, 244, 220, 0.78);
  border-color: rgba(40, 25, 10, 0.10);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45),
              0 14px 32px -22px rgba(40, 25, 10, 0.28);
}
[data-theme="light"] .preview-head {
  border-bottom-color: rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .preview-title { color: #6b5840; }
[data-theme="light"] .step-line { color: #6b5840; }
[data-theme="light"] .step-line .step-num { color: #8d7b62; }
[data-theme="light"] .step-line .step-name { color: #44362a; }
[data-theme="light"] .step-line .step-fields { color: #8d7b62; }
[data-theme="light"] .step-line.active {
  background: linear-gradient(90deg, rgba(217, 119, 6, 0.18), transparent 80%);
  color: #b45309;
}
[data-theme="light"] .step-line.active .step-num { color: #c2410c; }
[data-theme="light"] .step-line.active .step-name { color: #1a1410; }
[data-theme="light"] .step-line.active .step-fields { color: #b45309; }
[data-theme="light"] .preview-foot {
  border-top-color: rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .progress-track { background: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .progress-text { color: #6b5840; }

[data-theme="light"] .meta-card {
  background: rgba(255, 250, 240, 0.72);
  border-color: rgba(40, 25, 10, 0.10);
  box-shadow: 0 10px 28px -18px rgba(40, 25, 10, 0.20);
}
[data-theme="light"] .meta-card:hover {
  border-color: rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .meta-icon {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}
[data-theme="light"] .meta-card h4 { color: #1a1410; }
[data-theme="light"] .meta-list li { color: #44362a; }
[data-theme="light"] .meta-list strong { color: #1a1410; }
[data-theme="light"] .meta-list code {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.28);
}
[data-theme="light"] .link-card-desc { color: #44362a; }
[data-theme="light"] .link-card-arrow {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.32);
  color: #b45309;
}
[data-theme="light"] .link-card:hover .link-card-arrow {
  background: rgba(217, 119, 6, 0.22);
}
</style>
