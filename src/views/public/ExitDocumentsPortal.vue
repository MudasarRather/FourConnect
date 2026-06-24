<template>
  <div class="xp">
    <span class="xp-aura" aria-hidden="true" />
    <span class="xp-grid" aria-hidden="true" />

    <Motion as="main" class="xp-card ex-grain"
      :initial="reduced ? false : { opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
      <span class="xp-sheen" aria-hidden="true" />

      <!-- brand header -->
      <header class="xp-head">
        <span class="xp-brand"><span class="xp-mark"><DoorOpen :size="17" /></span> Fourconnect</span>
        <span class="xp-tag"><ShieldCheck :size="12" /> Secure document portal</span>
      </header>

      <!-- loading -->
      <div v-if="loading" class="xp-skel">
        <span class="xp-seal-wrap"><ClearanceMotif kind="seal" tone="PENDING" :size="96" /></span>
        <div class="sk-line w60" /><div class="sk-line w40" />
        <div class="sk-row" /><div class="sk-row" />
      </div>

      <!-- expired link (security window elapsed) -->
      <div v-else-if="expired" class="xp-state">
        <span class="xp-emblem bad"><Clock :size="28" /></span>
        <h1 class="xp-h">This link has expired</h1>
        <p class="xp-sub">For your security, document links stay active for only <b>{{ ttlDays }} days</b> after your documents are issued. Please contact HR — they can send you a fresh link in seconds.</p>
      </div>

      <!-- invalid / unknown link -->
      <div v-else-if="error" class="xp-state">
        <span class="xp-emblem bad"><AlertTriangle :size="30" /></span>
        <h1 class="xp-h">This link isn't valid</h1>
        <p class="xp-sub">The document link is incorrect, expired, or has been replaced. If you reached this from an old message, ask HR for your current link.</p>
      </div>

      <!-- loaded -->
      <template v-else>
        <div class="xp-hero">
          <span class="xp-seal-wrap"><ClearanceMotif kind="seal" :tone="hasLetters ? 'CLEARED' : 'PENDING'" :size="104" /></span>
          <div class="xp-hero-tx">
            <span class="xp-eye"><FileText :size="12" /> {{ data.case_number }}</span>
            <h1 class="xp-h">{{ greeting }}</h1>
            <p class="xp-sub">{{ heroSub }}</p>
          </div>
        </div>

        <!-- security-window banner -->
        <div v-if="hasLetters && data.expires_at" class="xp-expiry">
          <Clock :size="14" />
          <span>For your security this link stays active until <b>{{ fmtDate(data.expires_at) }}</b> ({{ ttlDays }} days). Please download your documents before then — HR can re-send a fresh link if you need it later.</span>
        </div>

        <!-- letters -->
        <div v-if="hasLetters" class="xp-letters">
          <Motion v-for="(l, i) in data.letters" :key="l.slug" as="article" class="xp-letter"
            :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4, delay: 0.08 + i * 0.08, ease: [0.16, 1, 0.3, 1] }">
            <span class="xl-spine" />
            <span class="xl-ic"><ScrollText :size="20" /></span>
            <div class="xl-tx">
              <b>{{ l.title }}</b>
              <i v-if="l.issued_at">Issued {{ fmtDate(l.issued_at) }} · ready to download</i>
              <i v-else>Ready to download</i>
            </div>
            <Motion as="button" type="button" class="xl-dl" :disabled="dl === l.slug"
              :whileHover="reduced ? {} : { y: -2, scale: 1.03 }" :whileTap="{ scale: 0.96 }" @click="download(l)">
              <Loader2 v-if="dl === l.slug" :size="15" class="spin" /><Download v-else :size="15" /> Download
            </Motion>
          </Motion>
        </div>

        <!-- no letters yet -->
        <div v-else class="xp-empty">
          <span class="xp-emblem"><Hourglass :size="26" /></span>
          <h2 class="xp-h2">Your letters aren't ready yet</h2>
          <p class="xp-sub">Your relieving &amp; experience letters will appear here the moment HR issues them. <b>Bookmark this page.</b> Once issued, they'll be downloadable for <b>{{ ttlDays }} days</b> — so check back, and grab them promptly.</p>
        </div>
      </template>

      <footer class="xp-foot">
        <ShieldCheck :size="13" />
        <span>Each letter is digitally sealed with a QR authenticity code. This is your permanent link — keep it safe; anyone with it can view your letters.</span>
      </footer>
    </Motion>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Motion } from 'motion-v'
import { DoorOpen, ShieldCheck, FileText, ScrollText, Download, Loader2, AlertTriangle, Hourglass, Clock } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import '@/styles/exit-theme.css'
import ClearanceMotif from '@/views/hr/exit/components/ClearanceMotif.vue'
import { fetchExitPortal, portalDownloadUrl, fmtDate, errText } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const route = useRoute()
const toast = useToast()
const reduced = prefersReduced()

const token = computed(() => route.params.token)
const data = ref(null)
const loading = ref(true)
const error = ref(false)
const expired = ref(false)
const ttlDays = 5
const dl = ref('')

const hasLetters = computed(() => (data.value?.letters || []).length > 0)
const firstName = computed(() => (data.value?.employee_name || '').split(/\s+/)[0] || '')
const greeting = computed(() => firstName.value ? `Hello, ${firstName.value}` : 'Your exit documents')
const heroSub = computed(() => hasLetters.value
  ? 'Your final documents are ready. Download and keep them safe — you may need them for future employment.'
  : 'This is your personal document portal for your separation.')

const load = async () => {
  loading.value = true; error.value = false; expired.value = false
  try { data.value = await fetchExitPortal(token.value) }
  catch (e) {
    if (e?.response?.status === 410) expired.value = true
    else error.value = true
  }
  finally { loading.value = false }
}

const download = async (l) => {
  dl.value = l.slug
  try {
    const res = await fetch(portalDownloadUrl(token.value, l.slug))
    if (!res.ok) throw new Error()
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${l.slug}.pdf`; document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  } catch (e) { toast.error(errText(e, 'Could not download — the letter may have been revoked.')) }
  finally { dl.value = '' }
}

onMounted(load)
</script>

<style scoped>
.xp { position: relative; min-height: 100vh; display: grid; place-items: center; padding: 28px 18px; overflow: hidden;
  background: var(--ex-canvas); color: var(--ex-text); }
.xp-aura { position: fixed; inset: -30% 30% 50% -10%; pointer-events: none;
  background: radial-gradient(50% 60% at 30% 20%, color-mix(in srgb, var(--ex-violet) 22%, transparent), transparent 70%); animation: ex-aura-drift 13s ease-in-out infinite; }
.xp-grid { position: fixed; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px); background-size: 34px 34px;
  -webkit-mask: radial-gradient(120% 90% at 50% 0%, #000, transparent 75%); mask: radial-gradient(120% 90% at 50% 0%, #000, transparent 75%); }
[data-theme="light"] .xp-grid { background-image: linear-gradient(rgba(120, 53, 15, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 53, 15, 0.05) 1px, transparent 1px); }

.xp-card { position: relative; overflow: hidden; width: min(560px, 100%); border-radius: 26px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow); }
.xp-sheen { position: absolute; inset: 0 0 auto; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-violet) 70%, transparent), transparent); }

.xp-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 22px; border-bottom: 1px solid var(--ex-border); }
.xp-brand { display: inline-flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 850; color: var(--ex-text); }
.xp-mark { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; color: var(--ex-violet);
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.xp-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 750; color: var(--ex-cleared); }

.xp-hero { display: flex; align-items: center; gap: 16px; padding: 22px 22px 8px; }
.xp-seal-wrap { flex-shrink: 0; }
.xp-eye { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ex-violet);
  padding: 3px 9px; border-radius: 999px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.xp-h { font-size: clamp(20px, 4vw, 26px); font-weight: 880; margin: 9px 0 4px; line-height: 1.1; color: var(--ex-text); }
.xp-h2 { font-size: 16px; font-weight: 820; margin: 4px 0; color: var(--ex-text); }
.xp-sub { font-size: 13px; line-height: 1.55; color: var(--ex-text-muted); margin: 0; }
.xp-sub b { color: var(--ex-text-secondary); font-weight: 750; }

.xp-expiry { display: flex; align-items: flex-start; gap: 8px; margin: 14px 22px 0; padding: 11px 13px; border-radius: 13px; font-size: 11.5px; line-height: 1.5;
  color: var(--ex-amber-strong); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.xp-expiry svg { flex-shrink: 0; margin-top: 1px; }
.xp-expiry b { font-weight: 800; }

.xp-letters { display: flex; flex-direction: column; gap: 10px; padding: 14px 22px 4px; }
.xp-letter { position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; padding: 14px 15px 14px 18px; border-radius: 16px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.25s, transform 0.25s; }
.xp-letter:hover { border-color: var(--ex-violet-border); }
.xl-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--ex-cleared); box-shadow: 0 0 10px var(--ex-cleared); }
.xl-ic { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; color: var(--ex-violet);
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.xl-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.xl-tx b { font-size: 14px; font-weight: 800; color: var(--ex-text); }
.xl-tx i { font-style: normal; font-size: 11.5px; color: var(--ex-text-muted); }
.xl-dl { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; padding: 9px 15px; border-radius: 11px; cursor: pointer; font-family: inherit;
  font-size: 12.5px; font-weight: 760; border: none; background: var(--ex-grad-hero); color: #1a1206; box-shadow: var(--ex-violet-glow); }
.xl-dl:disabled { opacity: 0.6; cursor: not-allowed; }

.xp-empty, .xp-state { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 9px; padding: 30px 28px 14px; }
.xp-emblem { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; color: var(--ex-violet);
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.xp-emblem.bad { color: var(--ex-blocked); background: var(--ex-blocked-soft); border-color: color-mix(in srgb, var(--ex-blocked) 30%, transparent); }

.xp-skel { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 26px 22px; }
.sk-line { height: 14px; border-radius: 7px; background: var(--ex-panel); }
.sk-line.w60 { width: 60%; } .sk-line.w40 { width: 40%; }
.sk-row { width: 100%; height: 64px; border-radius: 16px; background: var(--ex-panel); }

.xp-foot { display: flex; align-items: flex-start; gap: 8px; margin: 14px 22px 20px; padding: 12px 14px; border-radius: 13px;
  font-size: 11px; line-height: 1.5; color: var(--ex-text-muted); background: var(--ex-panel); border: 1px solid var(--ex-border); }
.xp-foot svg { color: var(--ex-cleared); flex-shrink: 0; margin-top: 1px; }

.spin { animation: ex-spin-slow 0.8s linear infinite; }
@media (prefers-reduced-motion: reduce) { .xp-aura, .spin { animation: none; } .xp-letter { transition: none; } }
</style>
