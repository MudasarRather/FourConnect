<template>
  <Motion as="article" ref="rootRef" class="rc" :style="accentVars"
    :initial="reduced ? false : { opacity: 0, y: 20 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }"
    :whileHover="reduced ? {} : { y: -4 }">
    <span class="rc-spot trn-spotlight" aria-hidden="true" />

    <!-- magazine masthead -->
    <header class="rc-cover">
      <span class="rc-mega" aria-hidden="true">{{ issue }}</span>
      <span class="rc-crest">{{ crest }}</span>
      <span class="rc-issue trn-mono">REPORT // {{ issue }}</span>

      <!-- animated mini-instrument (mirrors the PDF cover motif) -->
      <svg class="rc-motif" :class="'m-' + report.motif" viewBox="0 0 120 60" aria-hidden="true">
        <!-- transcript / gauge arc -->
        <template v-if="report.motif === 'transcript'">
          <path d="M18 50 A36 36 0 0 1 102 50" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="7" stroke-linecap="round" />
          <path d="M18 50 A36 36 0 0 1 102 50" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"
            :stroke-dasharray="arcLen" :stroke-dashoffset="shown ? arcLen * 0.32 : arcLen" class="rc-arc" />
        </template>
        <!-- passport / radar pentagon -->
        <template v-else-if="report.motif === 'passport'">
          <polygon points="60,8 104,34 88,56 32,56 16,34" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.4" />
          <polygon points="60,20 90,36 80,52 40,52 30,36" :fill="'rgba(255,255,255,0.18)'" stroke="#fff" stroke-width="1.6"
            class="rc-poly" :style="{ transform: shown ? 'scale(1)' : 'scale(0.4)' }" />
        </template>
        <!-- portfolio / seals -->
        <template v-else-if="report.motif === 'portfolio'">
          <circle v-for="(cx, i) in [26,50,74,98]" :key="i" :cx="cx" cy="30" r="11"
            fill="rgba(255,255,255,0.9)" class="rc-seal" :style="{ transitionDelay: (i * 90) + 'ms', opacity: shown ? 1 : 0, transform: shown ? 'scale(1)' : 'scale(0.2)' }" />
        </template>
        <!-- journey / stations -->
        <template v-else>
          <line x1="18" y1="30" x2="102" y2="30" stroke="rgba(255,255,255,0.35)" stroke-width="2" />
          <line x1="18" y1="30" x2="102" y2="30" stroke="#fff" stroke-width="2.4" class="rc-track" :style="{ transform: shown ? 'scaleX(1)' : 'scaleX(0)' }" />
          <circle v-for="(cx, i) in [18,46,74,102]" :key="i" :cx="cx" cy="30" :r="i === 3 ? 7 : 5.5"
            fill="#fff" class="rc-stn" :style="{ transitionDelay: (i * 120) + 'ms', opacity: shown ? 1 : 0.3, transform: shown ? 'scale(1)' : 'scale(0.3)' }" />
        </template>
      </svg>
    </header>

    <div class="rc-body">
      <h4 class="rc-name">{{ report.name }}</h4>
      <p class="rc-tag">{{ report.tagline }}</p>
      <div class="rc-acts">
        <button class="rc-btn pdf" :disabled="!!busy" @click="$emit('download', report.key, 'pdf')">
          <Loader v-if="busy === 'pdf'" :size="13" class="spin" /><FileText v-else :size="13" /> PDF
        </button>
        <button class="rc-btn" :disabled="!!busy" @click="$emit('download', report.key, 'excel')">
          <Loader v-if="busy === 'excel'" :size="13" class="spin" /><Sheet v-else :size="13" /> Excel
        </button>
        <button class="rc-btn" :disabled="!!busy" @click="$emit('download', report.key, 'csv')">
          <Loader v-if="busy === 'csv'" :size="13" class="spin" /><Table2 v-else :size="13" /> CSV
        </button>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import { FileText, Sheet, Table2, Loader } from 'lucide-vue-next'
import { useInView, usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  report: { type: Object, required: true },
  index: { type: Number, default: 0 },
  issue: { type: String, default: '' },
  busy: { type: [String, Boolean], default: false },
})
defineEmits(['download'])

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)
const { visible } = useInView(rootRef, { threshold: 0.3 })
const shown = computed(() => visible.value)
const arcLen = 132

const accentVars = computed(() => ({
  '--rc-a': props.report.accent || 'var(--trn-amber)',
  '--rc-d': props.report.accent_deep || 'var(--trn-amber-strong)',
}))

// distinct crest glyph per motif (matches the PDF cover crest)
const MOTIF_CREST = { transcript: 'R', passport: 'S', portfolio: 'C', journey: 'Q' }
const crest = computed(() => props.report.icon || MOTIF_CREST[props.report.motif] || (props.report.name?.[0] || 'R'))
</script>

<style scoped>
.rc { position: relative; overflow: hidden; border-radius: 18px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); display: flex; flex-direction: column;
  transition: border-color 0.3s, box-shadow 0.3s; }
.rc:hover { border-color: color-mix(in srgb, var(--rc-a) 36%, transparent); box-shadow: var(--trn-card-shadow-hover); }
.rc-spot { z-index: 0; }

.rc-cover { position: relative; overflow: hidden; height: 112px; padding: 12px 14px;
  background: linear-gradient(140deg, var(--rc-a), var(--rc-d)); }
.rc-mega { position: absolute; right: -6px; bottom: -34px; font-size: 92px; font-weight: 900; line-height: 1;
  color: rgba(255,255,255,0.14); letter-spacing: -4px; }
.rc-crest { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 9px;
  background: rgba(255,255,255,0.92); color: var(--rc-d); font-weight: 900; font-size: 15px; }
.rc-issue { position: absolute; top: 16px; right: 14px; font-size: 9px; font-weight: 700; letter-spacing: 0.12em; color: rgba(255,255,255,0.9); }
.rc-motif { position: absolute; left: 14px; bottom: 8px; width: 130px; height: 56px; }
.rc-arc { transition: stroke-dashoffset 1.1s var(--trn-spring); }
.rc-poly { transform-origin: 60px 36px; transition: transform 0.8s var(--trn-spring); }
.rc-seal { transform-origin: center; transform-box: fill-box; transition: transform 0.5s var(--trn-spring), opacity 0.5s ease; }
.rc-track { transform-origin: 18px 30px; transition: transform 0.9s var(--trn-spring); }
.rc-stn { transform-origin: center; transform-box: fill-box; transition: transform 0.5s var(--trn-spring), opacity 0.5s ease; }

.rc-body { position: relative; z-index: 1; padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
.rc-name { margin: 0; font-size: 15px; font-weight: 800; color: var(--trn-text); letter-spacing: -0.01em; }
.rc-tag { margin: 0; font-size: 12px; line-height: 1.5; color: var(--trn-text-muted); flex: 1; }
.rc-acts { display: flex; gap: 7px; margin-top: 8px; }
.rc-btn { display: inline-flex; align-items: center; gap: 5px; flex: 1; justify-content: center; font-size: 11.5px; font-weight: 700;
  padding: 7px 8px; border-radius: 9px; cursor: pointer; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surface); color: var(--trn-text-secondary); transition: all 0.2s; }
.rc-btn:hover:not(:disabled) { color: var(--trn-text); background: var(--trn-surface-elevated); transform: translateY(-1px); }
.rc-btn.pdf { color: var(--rc-a); border-color: color-mix(in srgb, var(--rc-a) 32%, transparent); background: color-mix(in srgb, var(--rc-a) 9%, transparent); }
.rc-btn.pdf:hover:not(:disabled) { background: color-mix(in srgb, var(--rc-a) 16%, transparent); }
.rc-btn:disabled { opacity: 0.55; cursor: progress; }
.spin { animation: rc-spin 0.8s linear infinite; }
@keyframes rc-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .rc-arc, .rc-poly, .rc-seal, .rc-track, .rc-stn { transition: none !important; }
}
</style>
