<template>
  <div class="ssd-page" :data-theme-watch="themeKey">
    <!-- ════════════════════════ HERO ════════════════════════ -->
    <Motion as="header" class="ssd-hero"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }"
    >
      <!-- Three.js scene fills the right edge -->
      <div class="hero-scene-wrap" aria-hidden="true">
        <SsdHeroScene :reduced="reducedMotion" />
      </div>

      <div class="hero-text">
        <Motion as="span" class="hero-eyebrow"
          :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }"
        >
          <span class="hero-eyebrow-dot" />
          The Vault · Your Personal Document Archive
        </Motion>

        <Motion as="h1" class="hero-title"
          :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.65, delay: 0.22, ease: [0.22, 1, 0.36, 1] }"
        >
          <span class="hero-greet">Hi {{ firstName }},</span>
          <span class="hero-tag">here's your <em>vault.</em></span>
        </Motion>

        <Motion as="p" class="hero-sub"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.34, ease: [0.22, 1, 0.36, 1] }"
        >
          Every document HR has on file for you — KYC, contracts, certificates, letters, ID proofs — visible, downloadable,
          and yours. Upload missing originals, request new letters from HR, and re-submit anything that needs another look.
        </Motion>

        <!-- KPI strip -->
        <div class="hero-stats">
          <Motion v-for="(s, i) in heroStats" :key="s.key"
            as="div" class="hero-stat" :class="s.tone"
            :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4, delay: 0.40 + i * 0.06, ease: [0.22, 1, 0.36, 1] }"
            v-tilt="{ max: 4, scale: 1.015 }"
          >
            <span class="stat-icon"><component :is="s.icon" :size="14" /></span>
            <span class="stat-num">{{ s.value }}</span>
            <span class="stat-label">{{ s.label }}</span>
          </Motion>
        </div>

        <!-- CTAs — CSS-driven hover (gold-bar rise + letter-spacing kick + sheen) -->
        <div class="hero-ctas">
          <Motion as="button"
            class="cta primary"
            :whileTap="{ scale: 0.97 }"
            @click="openUpload()"
          >
            <UploadCloud :size="14" />
            <span>Upload Document</span>
          </Motion>
          <Motion as="button"
            class="cta ghost"
            :whileTap="{ scale: 0.97 }"
            @click="showRequest = true"
          >
            <Send :size="13" />
            <span>Request from HR</span>
          </Motion>
        </div>
      </div>
    </Motion>

    <!-- ════════════════════════ BODY ════════════════════════ -->
    <div class="ssd-body">
      <SsdJourneyRail
        :categories="DOC_CATEGORIES"
        :summary="summary"
        :active="activeCategory"
        :total-docs="summary?.total_documents || 0"
        @select="selectCategory"
        @request="showRequest = true"
      />

      <main class="ssd-content">
        <!-- ─── Loading state ─── -->
        <div v-if="loadingDocs && !documents.length" class="ssd-loading">
          <Motion as="div"
            v-for="i in 4" :key="'sk-' + i"
            class="skeleton-card"
            :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
            :transition="{ duration: 0.3, delay: 0.05 * i }"
          />
        </div>

        <!-- ─── Empty state ─── -->
        <Motion v-else-if="!documents.length && !loadingDocs"
          as="article"
          class="ssd-empty"
          :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
        >
          <span class="empty-orb" aria-hidden="true">
            <ArchiveX :size="36" />
          </span>
          <h3>Your vault is empty</h3>
          <p>You don't have any documents yet. Upload your first one or request a letter from HR to get started.</p>
          <div class="empty-actions">
            <button class="cta primary" @click="openUpload()">
              <UploadCloud :size="14" /> <span>Upload First Document</span>
            </button>
            <button class="cta ghost" @click="showRequest = true">
              <Send :size="13" /> <span>Request from HR</span>
            </button>
          </div>
        </Motion>

        <!-- ─── Per-category sections, each separated by an animated gradient rule ─── -->
        <template v-else>
          <template v-for="(group, gi) in groupedDocs" :key="group.key">
            <div v-if="gi > 0" class="section-sep" aria-hidden="true">
              <span class="sep-line" />
              <span class="sep-mark">
                <span class="sep-dot" />
                <span class="sep-dot" />
                <span class="sep-dot" />
              </span>
              <span class="sep-line" />
            </div>

            <Motion as="section"
              class="cat-section"
              :id="`cat-${group.key}`"
              :style="{ '--cat-tone': group.tone }"
              :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.05 * gi, ease: [0.22, 1, 0.36, 1] }"
            >
              <header class="cat-head">
                <span class="cat-icon">
                  <component :is="categoryIcon(group.icon)" :size="14" />
                  <span class="cat-icon-ring" />
                </span>
                <div class="cat-head-text">
                  <h3>{{ group.label }}</h3>
                  <span class="cat-sub">{{ group.docs.length }} {{ group.docs.length === 1 ? 'document' : 'documents' }}</span>
                </div>
                <span v-if="group.missingRequired" class="cat-missing">
                  <AlertCircle :size="11" />
                  Required document missing
                </span>
                <Motion as="button" class="cat-cta"
                  :whileTap="{ scale: 0.96 }"
                  @click="openUpload(group.key)"
                >
                  <Plus :size="12" /> <span>Add</span>
                </Motion>
              </header>

              <div class="card-grid">
                <SsdDocCard v-for="(d, idx) in group.docs" :key="d.id"
                  :doc="d" :index="idx"
                  @download="onDownload"
                  @preview="onPreview"
                  @resubmit="onResubmit"
                />
              </div>
            </Motion>
          </template>

          <!-- ─── Requests section ─── -->
          <div class="section-sep req-sep" aria-hidden="true">
            <span class="sep-line" />
            <span class="sep-mark">
              <span class="sep-dot" />
              <span class="sep-dot" />
              <span class="sep-dot" />
            </span>
            <span class="sep-line" />
          </div>
          <Motion as="section"
            class="cat-section req-section"
            id="cat-requests"
            :style="{ '--cat-tone': '#fb923c' }"
            :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.05 * groupedDocs.length, ease: [0.22, 1, 0.36, 1] }"
          >
            <header class="cat-head">
              <span class="cat-icon"><Send :size="14" /><span class="cat-icon-ring" /></span>
              <div class="cat-head-text">
                <h3>My Requests</h3>
                <span class="cat-sub">{{ requests.length }} outgoing {{ requests.length === 1 ? 'request' : 'requests' }}</span>
              </div>
              <Motion as="button" class="cat-cta"
                :whileTap="{ scale: 0.96 }"
                @click="showRequest = true"
              >
                <Plus :size="12" /> <span>New Request</span>
              </Motion>
            </header>

            <div v-if="!requests.length" class="reqs-empty">
              <Send :size="18" />
              <p>You haven't requested any documents yet. Ask HR for letters, certificates, NDAs, and more.</p>
            </div>
            <div v-else class="card-grid">
              <SsdRequestCard v-for="(r, idx) in requests" :key="r.id"
                :req="r" :index="idx"
                @cancel="onCancelRequest"
              />
            </div>
          </Motion>
        </template>
      </main>
    </div>

    <!-- ════════════════════════ MODALS ════════════════════════ -->
    <SsdUploadModal v-if="showUpload"
      :default-category="uploadDefaultCategory"
      @close="showUpload = false"
      @uploaded="onUploaded"
    />
    <SsdResubmitModal v-if="resubmitDoc"
      :doc="resubmitDoc"
      @close="resubmitDoc = null"
      @resubmitted="onResubmitted"
    />
    <SsdRequestModal v-if="showRequest"
      @close="showRequest = false"
      @submitted="onRequestSubmitted"
    />
    <SsdPreviewModal v-if="previewDoc"
      :doc="previewDoc"
      @close="previewDoc = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  UploadCloud, Send, Plus, AlertCircle, ArchiveX,
  IdCard, Fingerprint, FileSignature, GraduationCap, Award, Mail,
  ShieldCheck, Wallet, Folder,
  FileText, ClipboardCheck, CalendarClock, AlertTriangle,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'

import SsdHeroScene    from './self-service-documents/components/SsdHeroScene.vue'
import SsdJourneyRail  from './self-service-documents/components/SsdJourneyRail.vue'
import SsdDocCard      from './self-service-documents/components/SsdDocCard.vue'
import SsdRequestCard  from './self-service-documents/components/SsdRequestCard.vue'
import SsdUploadModal   from './self-service-documents/modals/SsdUploadModal.vue'
import SsdResubmitModal from './self-service-documents/modals/SsdResubmitModal.vue'
import SsdRequestModal  from './self-service-documents/modals/SsdRequestModal.vue'
import SsdPreviewModal  from './self-service-documents/modals/SsdPreviewModal.vue'

import {
  useSelfServiceDocuments, DOC_CATEGORIES,
} from '@/composables/useSelfServiceDocuments'

defineOptions({ name: 'SelfServiceDocumentsPage' })

const toast = useToast()
const ssd = useSelfServiceDocuments()

// ─── State ──────────────────────────────────────────────────────────────
const documents = ref([])
const requests  = ref([])
const summary   = ref(null)
const loadingDocs = ref(true)
const activeCategory = ref('')

const showUpload = ref(false)
const showRequest = ref(false)
const uploadDefaultCategory = ref('KYC')
const resubmitDoc = ref(null)
const previewDoc = ref(null)

const themeKey = ref(Date.now())   // forces re-render of theme-aware children on theme toggle
const reducedMotion = computed(() =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
)

// ─── Derived ────────────────────────────────────────────────────────────
const firstName = computed(() => {
  const full = summary.value?.employee_name || ''
  return (full.split(' ')[0] || 'there').trim()
})

const heroStats = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { key: 'total',    label: 'Total documents',  value: s.total_documents,    icon: FileText,        tone: 'tone-gold'    },
    { key: 'verified', label: 'Verified',         value: s.verified_count,     icon: ClipboardCheck,  tone: 'tone-emerald' },
    { key: 'pending',  label: 'Pending review',   value: s.pending_count,      icon: AlertCircle,     tone: 'tone-amber'   },
    { key: 'expiring', label: 'Expiring soon',    value: s.expiring_soon_count, icon: CalendarClock,  tone: 'tone-orange'  },
    { key: 'attention',label: 'Need attention',   value: s.rejected_count,     icon: AlertTriangle,   tone: 'tone-red'     },
  ]
})

const groupedDocs = computed(() => {
  // Group documents by category in DOC_CATEGORIES order
  const byCat = new Map(DOC_CATEGORIES.map(c => [c.key, []]))
  for (const d of documents.value) {
    if (!byCat.has(d.category)) byCat.set(d.category, [])
    byCat.get(d.category).push(d)
  }
  const breakdownMap = new Map(((summary.value?.by_category) || []).map(b => [b.category, b]))
  return DOC_CATEGORIES.filter(c => (byCat.get(c.key) || []).length || breakdownMap.get(c.key)?.is_mandatory)
    .map(c => {
      const b = breakdownMap.get(c.key) || {}
      const docs = byCat.get(c.key) || []
      return {
        key: c.key,
        label: c.label,
        tone: c.tone,
        icon: c.icon,
        docs,
        missingRequired: !!(b.is_mandatory && (docs.length === 0 || (b.missing_required_types || []).length > 0)),
      }
    })
})

// ─── Lifecycle ──────────────────────────────────────────────────────────
const CATEGORY_ICONS = { IdCard, Fingerprint, FileSignature, GraduationCap, Award, Mail, ShieldCheck, Wallet, Folder }
const categoryIcon = (k) => CATEGORY_ICONS[k] || Folder

async function loadAll() {
  loadingDocs.value = true
  try {
    const [list, sum, reqs] = await Promise.all([
      ssd.listMine({ limit: 200 }).catch(() => ({ items: [] })),
      ssd.summaryMine().catch(() => null),
      ssd.listMyRequests({ limit: 100 }).catch(() => ({ items: [] })),
    ])
    documents.value = list.items || []
    requests.value = reqs.items || []
    summary.value = sum
  } catch (e) {
    toast.error('Could not load your documents.')
  } finally {
    loadingDocs.value = false
  }
}

onMounted(() => {
  loadAll()
  // Re-render motion-v + chart-style colour-dependent elements on theme switch.
  const observer = new MutationObserver(() => { themeKey.value = Date.now() })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

// ─── Actions ────────────────────────────────────────────────────────────
function selectCategory(catKey) {
  activeCategory.value = catKey
  nextTick(() => {
    const el = document.getElementById(`cat-${catKey}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function openUpload(category) {
  uploadDefaultCategory.value = category || 'KYC'
  showUpload.value = true
}

async function onDownload(doc) {
  try {
    const url = await ssd.downloadUrlMine(doc.id)
    // Open in a new tab — the signed-token endpoint streams the file with
    // the original filename via Content-Disposition (server FileResponse).
    window.open(url, '_blank', 'noopener')
  } catch (e) {
    toast.error('Could not generate download link.')
  }
}

function onPreview(doc) { previewDoc.value = doc }
function onResubmit(doc) { resubmitDoc.value = doc }

function onUploaded(_) { toast.success('Document added'); loadAll() }
function onResubmitted(_) { toast.success('Resubmitted'); loadAll() }
function onRequestSubmitted(_) { loadAll() }

async function onCancelRequest(req) {
  try {
    await ssd.cancelRequest(req.id)
    toast.success('Request cancelled')
    loadAll()
  } catch (e) {
    toast.error('Could not cancel request.')
  }
}

</script>

<!-- Unscoped: register the page's CSS custom properties globally on :root.
     A `<style scoped>` block applies `[data-v-XX]` to every selector including
     `:root` — which never matches <html>, so every `var(--ssd-*)` would resolve
     to `unset` and the page would render invisibly. Loading the tokens here
     scopes the registration to the file but the rules themselves stay global. -->
<style>
@import '../../styles/self-service-documents-theme.css';
</style>

<style scoped>
/* ════════════════════════════════════════════════════════════════════════════
   PAGE SHELL
   ════════════════════════════════════════════════════════════════════════════ */
.ssd-page {
  position: relative;
  min-height: calc(100vh - 52px);
  padding: 28px 32px 64px;
  /* Sit directly on the layout body — no extra background, no overlays.
     Every interactive surface (hero, rail, cards) carries its own. */
  background: transparent;
  color: var(--hr-text);
  /* No `isolation: isolate` here — keeping it default lets the layout
     background show through cleanly without spawning a stacking context
     that would force the aurora layer to repaint on every scroll. */
  overflow-x: clip;
}

/* ════════════════════════════════════════════════════════════════════════════
   HERO
   ════════════════════════════════════════════════════════════════════════════ */
.ssd-hero {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  padding: 38px 42px;
  border-radius: 28px;
  background:
    radial-gradient(80% 70% at 0% 0%, rgba(251, 191, 36, 0.18), transparent 65%),
    radial-gradient(80% 60% at 100% 100%, rgba(234, 88, 12, 0.16), transparent 65%),
    rgba(20, 15, 12, 0.72);
  border: 1px solid rgba(251, 191, 36, 0.24);
  box-shadow:
    0 30px 70px -30px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(251, 191, 36, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  margin-bottom: 22px;
  overflow: hidden;
  isolation: isolate;
  /* GPU-promote so the heavy gradients + ring don't repaint on parent scroll. */
  transform: translateZ(0);
  animation: ssd-vault-open 0.9s var(--ssd-spring) both;
}
[data-theme="light"] .ssd-hero {
  background:
    radial-gradient(80% 70% at 0% 0%, rgba(251, 191, 36, 0.22), transparent 65%),
    radial-gradient(80% 60% at 100% 100%, rgba(234, 88, 12, 0.16), transparent 65%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.26);
  box-shadow:
    0 28px 60px -28px rgba(120, 53, 15, 0.30),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
}
/* Static conic-gradient border ring — animates only on hover so it never
   causes scroll repaints. Same Apple-tier look, none of the GPU cost. */
.ssd-hero::before {
  content: ''; position: absolute; inset: 0; z-index: -1;
  border-radius: inherit;
  padding: 1px;
  background: conic-gradient(
    from 220deg,
    rgba(251, 191, 36, 0.0) 0%,
    rgba(251, 191, 36, 0.55) 20%,
    rgba(251, 146, 60, 0.85) 35%,
    rgba(251, 191, 36, 0.55) 50%,
    rgba(251, 191, 36, 0.0) 70%,
    rgba(251, 191, 36, 0.0) 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  opacity: 0.85;
  pointer-events: none;
  transition: transform 1.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.ssd-hero:hover::before { transform: rotate(360deg); }
.ssd-hero::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.14) 50%, transparent 65%);
  animation: ssd-foil-sweep 2.4s var(--ssd-quint) 0.5s 1 forwards;
  transform: translateX(-110%);
}
@media (max-width: 980px) { .ssd-hero { grid-template-columns: 1fr; } }

.hero-scene-wrap {
  position: relative;
  min-height: 320px;
  border-radius: 20px;
  overflow: hidden;
  isolation: isolate;
}
.hero-scene-wrap::before {
  content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background: radial-gradient(50% 50% at 50% 50%, transparent 60%, rgba(20, 14, 10, 0.45) 100%);
}
[data-theme="light"] .hero-scene-wrap::before {
  background: radial-gradient(50% 50% at 50% 50%, transparent 60%, rgba(255, 250, 240, 0.45) 100%);
}
.hero-fallback {
  position: absolute; inset: 0;
  background:
    radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.30), transparent 70%),
    radial-gradient(80% 80% at 50% 50%, rgba(234, 88, 12, 0.18), transparent 70%);
  animation: edoc-aurora-drift 24s ease-in-out infinite;
}

.hero-text {
  display: flex; flex-direction: column; gap: 14px;
  position: relative; z-index: 2;
}
.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.8px; text-transform: uppercase;
  color: var(--ssd-cream-100);
  width: max-content;
}
[data-theme="light"] .hero-eyebrow { color: var(--ssd-amber-600); }
.hero-eyebrow-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #fb923c; box-shadow: 0 0 8px rgba(251, 146, 60, 0.7);
  animation: ssd-eyebrow-pulse 2.4s ease-in-out infinite;
}
.hero-title {
  margin: 0;
  font-size: clamp(32px, 5vw, 54px);
  font-weight: 800; letter-spacing: -0.03em;
  line-height: 1.05;
  display: flex; flex-direction: column; gap: 4px;
}
.hero-greet { color: var(--hr-text); }
.hero-tag {
  background: var(--ssd-gradient-display);
  background-size: 200% 200%;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ssd-title-shimmer 7s ease-in-out infinite;
}
.hero-tag em { font-style: italic; font-weight: 800; }
.hero-sub {
  margin: 0;
  font-size: 13.5px; line-height: 1.55;
  color: var(--hr-text-muted);
  max-width: 540px;
}
[data-theme="light"] .hero-sub { color: #6b5840; }

.hero-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-top: 6px;
}
.hero-stat {
  position: relative;
  display: flex; flex-direction: column; gap: 4px;
  padding: 14px 14px 12px 18px;
  border-radius: 14px;
  background: rgba(40, 30, 22, 0.55);
  border: 1px solid rgba(251, 191, 36, 0.20);
  overflow: hidden;                /* clip accent rail to rounded corners */
  isolation: isolate;
  transition: border-color .35s var(--ssd-spring), transform .35s var(--ssd-spring), box-shadow .35s;
}
[data-theme="light"] .hero-stat { background: rgba(255, 250, 240, 0.85); border-color: rgba(180, 83, 9, 0.20); }
.hero-stat:hover {
  border-color: color-mix(in srgb, var(--hero-stat-tone) 55%, transparent);
  box-shadow: 0 16px 32px -18px color-mix(in srgb, var(--hero-stat-tone) 60%, transparent);
}
.hero-stat::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--hero-stat-tone, #fbbf24);
}
.hero-stat::after {
  /* Glow that pulses out of the accent rail on hover */
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 3px; height: 0%;
  background: var(--hero-stat-tone, #fbbf24);
  filter: blur(6px);
  opacity: 0;
  transition: height .45s var(--ssd-spring), opacity .45s;
}
.hero-stat:hover::after { height: 80%; opacity: 0.85; }
.hero-stat.tone-gold    { --hero-stat-tone: #fbbf24; }
.hero-stat.tone-emerald { --hero-stat-tone: #0d9488; }
.hero-stat.tone-amber   { --hero-stat-tone: #ca8a04; }
.hero-stat.tone-orange  { --hero-stat-tone: #ea580c; }
.hero-stat.tone-red     { --hero-stat-tone: #b91c1c; }

.stat-icon {
  width: 24px; height: 24px;
  border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--hero-stat-tone) 22%, transparent);
  color: var(--hero-stat-tone);
  border: 1px solid color-mix(in srgb, var(--hero-stat-tone) 38%, transparent);
}
.stat-num {
  font-size: 22px; font-weight: 800; letter-spacing: -0.02em;
  color: var(--hr-text);
  font-variant-numeric: tabular-nums;
  animation: ssd-num-pop 0.6s var(--ssd-bouncy) 0.6s both;
}
.stat-label {
  font-size: 9.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
  color: var(--hr-text-muted);
}
[data-theme="light"] .stat-label { color: #6b5840; }

.hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
.cta {
  position: relative;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 22px;
  border-radius: 14px;
  font: inherit; font-size: 13px; font-weight: 800; letter-spacing: 0.4px;
  border: 1px solid;
  cursor: pointer;
  overflow: hidden; isolation: isolate;
  transition: letter-spacing .35s var(--ssd-spring),
              box-shadow .35s,
              border-color .35s;
}
/* Inner content shifts subtly on hover — text and icon slide right, no card lift */
.cta > * { transition: transform .45s var(--ssd-spring); }
.cta:hover > * { transform: translateX(2px); }
.cta:hover { letter-spacing: 0.7px; }

/* Magnetic gold bar that sweeps up from beneath on hover (replaces the
   "rise" lift). Provides directional feedback without bobbing the element. */
.cta::before {
  content: ''; position: absolute; left: 0; right: 0; bottom: 0;
  height: 0;
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--cta-bar, #fbbf24) 55%, transparent),
    color-mix(in srgb, var(--cta-bar, #fbbf24) 0%, transparent));
  z-index: -2;
  transition: height .42s var(--ssd-spring);
}
.cta:hover::before { height: 100%; }

/* Diagonal sheen ALWAYS sweeping through (subtle ambient) */
.cta::after {
  content: ''; position: absolute; inset: 0; z-index: -1;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.18) 50%, transparent 70%);
  transform: translateX(-110%);
  transition: transform .8s var(--ssd-quint);
}
.cta:hover::after { transform: translateX(110%); }

.cta.primary {
  --cta-bar: #ffffff;
  color: #1f1408;
  background:
    radial-gradient(120% 100% at 0% 50%, rgba(255, 255, 255, 0.25), transparent 60%),
    linear-gradient(135deg, #fde68a 0%, #fbbf24 35%, #f59e0b 70%, #fb923c 100%);
  background-size: 200% 200%;
  border-color: rgba(251, 191, 36, 0.60);
  box-shadow:
    0 14px 28px -12px rgba(251, 146, 60, 0.60),
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    inset 0 -1px 0 rgba(180, 83, 9, 0.30);
}
.cta.primary:hover {
  box-shadow:
    0 22px 44px -14px rgba(251, 146, 60, 0.80),
    inset 0 1px 0 rgba(255, 255, 255, 0.70),
    inset 0 -1px 0 rgba(180, 83, 9, 0.40);
  border-color: rgba(251, 146, 60, 0.85);
}
[data-theme="light"] .cta.primary {
  color: #fff;
  background: linear-gradient(135deg, #fbbf24, #f59e0b 55%, #ea580c);
}

.cta.ghost {
  --cta-bar: #fbbf24;
  background: rgba(40, 30, 22, 0.55);
  color: var(--hr-text);
  border-color: rgba(251, 191, 36, 0.30);
}
.cta.ghost:hover {
  border-color: rgba(251, 146, 60, 0.65);
  color: #fef3c7;
}
[data-theme="light"] .cta.ghost {
  background: rgba(255, 250, 240, 0.85);
  color: var(--hr-text);
  border-color: rgba(180, 83, 9, 0.28);
}
[data-theme="light"] .cta.ghost:hover {
  color: var(--ssd-orange-700);
  border-color: rgba(194, 65, 12, 0.55);
}

/* ════════════════════════════════════════════════════════════════════════════
   BODY — rail + content
   ════════════════════════════════════════════════════════════════════════════ */
.ssd-body {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 40px;
  align-items: flex-start;
}
@media (max-width: 1020px) {
  .ssd-body { grid-template-columns: 1fr; gap: 20px; }
}

.ssd-content {
  display: flex; flex-direction: column; gap: 20px;
  min-width: 0;
}

.ssd-loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.skeleton-card {
  height: 220px;
  border-radius: 18px;
  background:
    linear-gradient(110deg, rgba(40, 30, 22, 0.50) 30%, rgba(251, 191, 36, 0.10) 50%, rgba(40, 30, 22, 0.50) 70%);
  background-size: 200% 100%;
  border: var(--ssd-glass-stroke);
  animation: ssd-pending-scan 1.8s linear infinite;
}
[data-theme="light"] .skeleton-card {
  background:
    linear-gradient(110deg, rgba(255, 250, 240, 0.85) 30%, rgba(251, 191, 36, 0.30) 50%, rgba(255, 250, 240, 0.85) 70%);
  background-size: 200% 100%;
}

/* ─── Empty state ─── */
.ssd-empty {
  padding: 48px 32px;
  border-radius: 22px;
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(251, 191, 36, 0.14), transparent 60%),
    var(--ssd-glass);
  border: 1px dashed rgba(251, 191, 36, 0.32);
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
[data-theme="light"] .ssd-empty { border-color: rgba(180, 83, 9, 0.32); }
.empty-orb {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fde68a, #fbbf24, #f59e0b);
  color: #1f1408;
  display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 22px 50px -20px rgba(251, 146, 60, 0.55);
}
.ssd-empty h3 { margin: 4px 0 0; font-size: 18px; font-weight: 800; color: var(--hr-text); }
.ssd-empty p { margin: 0; font-size: 13px; color: var(--hr-text-muted); max-width: 460px; line-height: 1.5; }
.empty-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 6px; }

/* ════════════════════════════════════════════════════════════════════════════
   SECTION SEPARATOR — animated tri-dot rule between category sections
   ════════════════════════════════════════════════════════════════════════════ */
.section-sep {
  display: flex; align-items: center; gap: 14px;
  padding: 4px 0;
  margin: 4px 0;
}
.sep-line {
  flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(251, 191, 36, 0.32) 50%, transparent 100%);
}
[data-theme="light"] .sep-line {
  background: linear-gradient(90deg, transparent 0%, rgba(180, 83, 9, 0.32) 50%, transparent 100%);
}
.sep-mark {
  display: inline-flex; align-items: center; gap: 4px;
}
.sep-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.55);
  animation: ssd-sep-pulse 2.6s ease-in-out infinite;
}
.sep-dot:nth-child(2) { animation-delay: 0.15s; }
.sep-dot:nth-child(3) { animation-delay: 0.30s; }
@keyframes ssd-sep-pulse {
  0%, 100% { opacity: 0.45; transform: scale(0.85); }
  50%      { opacity: 1; transform: scale(1.15); }
}
[data-theme="light"] .sep-dot {
  background: linear-gradient(135deg, #f59e0b, #ea580c);
  box-shadow: 0 0 6px rgba(217, 119, 6, 0.55);
}

/* ════════════════════════════════════════════════════════════════════════════
   CATEGORY SECTION
   ════════════════════════════════════════════════════════════════════════════ */
.cat-section {
  display: flex; flex-direction: column; gap: 14px;
  --cat-tone: #fbbf24;
}

.cat-head {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 4px 4px;
}

.cat-icon {
  position: relative;
  width: 38px; height: 38px;
  border-radius: 11px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--cat-tone) 35%, transparent),
    color-mix(in srgb, var(--cat-tone) 6%, transparent));
  color: var(--cat-tone);
  border: 1px solid color-mix(in srgb, var(--cat-tone) 42%, transparent);
  box-shadow: 0 6px 14px -8px color-mix(in srgb, var(--cat-tone) 70%, transparent);
  flex-shrink: 0;
}
.cat-icon-ring {
  position: absolute; inset: -5px;
  border-radius: 50%;
  border: 1px dashed color-mix(in srgb, var(--cat-tone) 38%, transparent);
  pointer-events: none;
  opacity: 0;
  animation: ssd-glow-orbit 14s linear infinite;
  animation-play-state: paused;        /* paused until hovered to avoid scroll repaints */
  transition: opacity .35s var(--ssd-spring);
}
.cat-head:hover .cat-icon-ring {
  opacity: 1;
  animation-play-state: running;
}
.cat-head-text {
  display: flex; flex-direction: column; gap: 1px;
}
.cat-head h3 {
  margin: 0;
  font-size: 19px; font-weight: 800; letter-spacing: -0.018em;
  color: var(--hr-text);
  line-height: 1.1;
}
.cat-sub {
  font-size: 11px; font-weight: 700;
  color: var(--hr-text-muted);
  letter-spacing: 0.2px;
}
[data-theme="light"] .cat-sub { color: #786c5c; }

.cat-missing {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.18), rgba(220, 38, 38, 0.08));
  color: #fca5a5;
  border: 1px solid rgba(220, 38, 38, 0.45);
  animation: ssd-missing-blink 2.4s ease-in-out infinite;
}
[data-theme="light"] .cat-missing { color: #b91c1c; background: linear-gradient(135deg, rgba(254, 226, 226, 0.95), rgba(254, 226, 226, 0.65)); }

.cat-cta {
  margin-left: auto;
  position: relative;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 7px 14px;
  border-radius: 10px;
  font: inherit; font-size: 11px; font-weight: 800; letter-spacing: 0.4px;
  color: #1f1408;
  background:
    radial-gradient(120% 100% at 0% 50%, rgba(255, 255, 255, 0.30), transparent 60%),
    linear-gradient(135deg, #fde68a 0%, #fbbf24 40%, #f59e0b 80%, #fb923c 100%);
  background-size: 200% 200%;
  border: 1px solid rgba(251, 191, 36, 0.60);
  cursor: pointer;
  box-shadow:
    0 10px 20px -10px rgba(251, 146, 60, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  overflow: hidden; isolation: isolate;
  transition: letter-spacing .35s var(--ssd-spring), box-shadow .35s, border-color .35s;
}
.cat-cta::after {
  content: ''; position: absolute; inset: 0; z-index: -1;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.35) 50%, transparent 70%);
  transform: translateX(-110%);
  transition: transform .7s var(--ssd-quint);
}
.cat-cta:hover {
  letter-spacing: 0.7px;
  box-shadow:
    0 16px 32px -12px rgba(251, 146, 60, 0.82),
    inset 0 1px 0 rgba(255, 255, 255, 0.70);
  border-color: rgba(251, 146, 60, 0.85);
}
.cat-cta:hover::after { transform: translateX(110%); }
[data-theme="light"] .cat-cta { color: #fff; background: linear-gradient(135deg, #fbbf24, #f59e0b 55%, #ea580c); }

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

/* ─── Requests section ─── */
.req-section { margin-top: 4px; }
.reqs-empty {
  padding: 32px 24px;
  border-radius: 18px;
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(251, 146, 60, 0.10), transparent 60%),
    var(--ssd-glass);
  border: 1px dashed rgba(251, 146, 60, 0.32);
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  color: var(--hr-text-muted);
}
.reqs-empty svg { color: #fb923c; }
.reqs-empty p { margin: 0; font-size: 12.5px; color: var(--hr-text-muted); max-width: 420px; line-height: 1.55; }
[data-theme="light"] .reqs-empty {
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(251, 146, 60, 0.14), transparent 60%),
    rgba(255, 250, 240, 0.85);
  border-color: rgba(194, 65, 12, 0.36);
}
[data-theme="light"] .reqs-empty svg { color: #ea580c; }

/* ════════════════════════════════════════════════════════════════════════════
   ssd-num-pop / accent shimmer keyframes referenced above (legacy)
   ════════════════════════════════════════════════════════════════════════════ */
@keyframes ssd-missing-blink {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.30); }
  50%      { box-shadow: 0 0 10px 2px rgba(220, 38, 38, 0.50); }
}
</style>
