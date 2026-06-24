<template>
  <div class="xv">
    <span class="xv-aura" aria-hidden="true" />
    <span class="xv-grid" aria-hidden="true" />

    <Motion as="main" class="xv-card ex-grain"
      :initial="reduced ? false : { opacity: 0, y: 22, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
      <span class="xv-sheen" aria-hidden="true" />

      <header class="xv-head">
        <span class="xv-brand"><span class="xv-mark"><DoorOpen :size="17" /></span> Fourconnect</span>
        <span class="xv-tag"><ShieldCheck :size="12" /> Document authenticity</span>
      </header>

      <div v-if="loading" class="xv-body">
        <span class="xv-seal"><ClearanceMotif kind="seal" tone="PENDING" :size="120" /></span>
        <p class="xv-sub">Verifying…</p>
      </div>

      <div v-else class="xv-body">
        <span class="xv-seal"><ClearanceMotif kind="seal" :tone="result.valid ? 'CLEARED' : 'BLOCKED'" :size="124" /></span>
        <span class="xv-pill" :class="result.valid ? 'ok' : 'bad'">
          <component :is="result.valid ? BadgeCheck : XCircle" :size="14" />
          {{ result.valid ? 'Authentic & issued' : (result.revoked ? 'Revoked' : 'Not valid') }}
        </span>
        <h1 class="xv-h">{{ headline }}</h1>
        <div v-if="result.employee_name || result.doc_type || result.issued_at" class="xv-facts">
          <div v-if="result.doc_type"><span class="fk">Document</span><span class="fv">{{ docLabel }}</span></div>
          <div v-if="result.employee_name"><span class="fk">Issued to</span><span class="fv">{{ result.employee_name }}</span></div>
          <div v-if="result.issued_at"><span class="fk">Issued on</span><span class="fv">{{ fmtDate(result.issued_at) }}</span></div>
        </div>
        <p class="xv-sub">{{ result.message || (result.valid ? 'This document was issued by Fourconnect and has not been revoked.' : 'No issued document matches this code.') }}</p>
      </div>

      <footer class="xv-foot"><ShieldCheck :size="13" /><span>This page confirms a letter's authenticity only — it does not expose any other personal data.</span></footer>
    </Motion>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Motion } from 'motion-v'
import { DoorOpen, ShieldCheck, BadgeCheck, XCircle } from 'lucide-vue-next'
import '@/styles/exit-theme.css'
import ClearanceMotif from '@/views/hr/exit/components/ClearanceMotif.vue'
import { verifyExitLetter, fmtDate } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const route = useRoute()
const reduced = prefersReduced()
const loading = ref(true)
const result = ref({ valid: false })

const docLabel = computed(() => ({
  RELIEVING_LETTER: 'Relieving Letter', EXPERIENCE_LETTER: 'Experience Letter',
}[result.value.doc_type] || result.value.doc_type || '—'))
const headline = computed(() => {
  if (result.value.valid) return 'This document is genuine'
  if (result.value.revoked) return 'This document has been revoked'
  return 'Could not verify this document'
})

onMounted(async () => {
  try { result.value = await verifyExitLetter(route.params.code) }
  catch { result.value = { valid: false, message: 'Verification service is unavailable. Try again later.' } }
  finally { loading.value = false }
})
</script>

<style scoped>
.xv { position: relative; min-height: 100vh; display: grid; place-items: center; padding: 28px 18px; overflow: hidden; background: var(--ex-canvas); color: var(--ex-text); }
.xv-aura { position: fixed; inset: -30% 30% 50% -10%; pointer-events: none;
  background: radial-gradient(50% 60% at 30% 20%, color-mix(in srgb, var(--ex-violet) 20%, transparent), transparent 70%); animation: ex-aura-drift 13s ease-in-out infinite; }
.xv-grid { position: fixed; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px); background-size: 34px 34px;
  -webkit-mask: radial-gradient(120% 90% at 50% 0%, #000, transparent 75%); mask: radial-gradient(120% 90% at 50% 0%, #000, transparent 75%); }
[data-theme="light"] .xv-grid { background-image: linear-gradient(rgba(120, 53, 15, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 53, 15, 0.05) 1px, transparent 1px); }

.xv-card { position: relative; overflow: hidden; width: min(460px, 100%); border-radius: 26px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow); }
.xv-sheen { position: absolute; inset: 0 0 auto; height: 2px; pointer-events: none; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-violet) 70%, transparent), transparent); }
.xv-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 22px; border-bottom: 1px solid var(--ex-border); }
.xv-brand { display: inline-flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 850; }
.xv-mark { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.xv-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 750; color: var(--ex-text-muted); }

.xv-body { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 26px 26px 8px; }
.xv-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; padding: 5px 13px; border-radius: 999px; }
.xv-pill.ok { color: var(--ex-cleared); background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 32%, transparent); }
.xv-pill.bad { color: var(--ex-blocked); background: var(--ex-blocked-soft); border: 1px solid color-mix(in srgb, var(--ex-blocked) 32%, transparent); }
.xv-h { font-size: 21px; font-weight: 870; margin: 4px 0 2px; color: var(--ex-text); }
.xv-sub { font-size: 12.5px; line-height: 1.55; color: var(--ex-text-muted); margin: 0; max-width: 360px; }
.xv-facts { display: flex; flex-direction: column; gap: 6px; width: 100%; margin: 6px 0; }
.xv-facts > div { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 13px; border-radius: 11px; background: var(--ex-panel); }
.fk { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ex-text-dim); }
.fv { font-size: 13px; font-weight: 750; color: var(--ex-text); }
.xv-foot { display: flex; align-items: flex-start; gap: 8px; margin: 14px 22px 20px; padding: 11px 14px; border-radius: 13px; font-size: 11px; line-height: 1.5; color: var(--ex-text-muted); background: var(--ex-panel); border: 1px solid var(--ex-border); }
.xv-foot svg { color: var(--ex-cleared); flex-shrink: 0; margin-top: 1px; }
@media (prefers-reduced-motion: reduce) { .xv-aura { animation: none; } }
</style>
