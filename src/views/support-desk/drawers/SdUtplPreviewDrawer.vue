<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && t" class="upd-ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.2 }" @mousedown.self="$emit('close')">
        <Motion class="upd" role="dialog" aria-modal="true" :aria-label="`Template — ${t.name}`"
          :style="{ '--acc': t.accent || 'var(--sd-utpl-core)' }"
          :initial="{ x: 60, opacity: 0 }" :animate="{ x: 0, opacity: 1 }" :exit="{ x: 40, opacity: 0 }"
          :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }">

          <!-- ── header ── -->
          <header class="upd-head">
            <span class="upd-ambient" aria-hidden="true" />
            <span class="upd-seal">
              <template v-if="isEmoji">{{ t.icon }}</template>
              <Film v-else :size="18" />
            </span>
            <div class="upd-id">
              <div class="upd-eyebrow sd-mono">
                TAPE · {{ visLabel }} · v{{ t.version || 1 }}
                <span class="upd-status" :data-status="status">{{ ribbon }}</span>
              </div>
              <h3>{{ t.name }}</h3>
              <p v-if="t.description">{{ t.description }}</p>
            </div>
            <div class="upd-headbtns">
              <span v-if="t.is_favorite" class="upd-star" title="One of your mixtapes"><Star :size="14" fill="currentColor" /></span>
              <button class="upd-x" title="Close" @click="$emit('close')"><X :size="16" /></button>
            </div>
          </header>

          <!-- ── quick telemetry ribbon ── -->
          <div class="upd-tele sd-mono">
            <div class="upd-tele-c"><Zap :size="13" /><b>{{ t.usage_count || 0 }}</b><i>play{{ (t.usage_count || 0) === 1 ? '' : 's' }}</i></div>
            <div class="upd-tele-c"><Clock3 :size="13" /><b>{{ t.last_used_at ? ago(t.last_used_at) : 'never' }}</b><i>last run</i></div>
            <div class="upd-tele-c"><GitBranch :size="13" /><b>v{{ t.version || 1 }}</b><i>{{ (detail?.revisions || []).length }} dub{{ (detail?.revisions || []).length === 1 ? '' : 's' }}</i></div>
            <div class="upd-tele-c"><CalendarDays :size="13" /><b>{{ t.created_at ? ago(t.created_at) : '—' }}</b><i>recorded</i></div>
          </div>

          <!-- ── projection toggle ── -->
          <div class="upd-toggle sd-mono" role="tablist">
            <button :class="{ on: mode === 'rendered' }" role="tab" @click="mode = 'rendered'">
              <Sparkles :size="11" /> PLAYBACK
            </button>
            <button :class="{ on: mode === 'raw' }" role="tab" @click="mode = 'raw'">
              <Braces :size="11" /> RAW TAPE
            </button>
            <span class="upd-hint">{{ mode === 'rendered' ? 'sample context — tokens resolve live at apply time' : 'stored text with moustache variables' }}</span>
          </div>

          <div class="upd-body">
            <!-- playback screen -->
            <Motion class="upd-screen" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="rev(0)">
              <span class="upd-scan" aria-hidden="true" />
              <div class="upd-reels" aria-hidden="true"><span class="upd-reel" /><span class="upd-reel" /></div>
              <div class="upd-sc-lb sd-mono">SUBJECT <button class="upd-copy" title="Copy subject" @click="copy(subjectShown, 'Subject')"><Copy :size="11" /></button></div>
              <div class="upd-sc-subject">{{ subjectShown || '—' }}</div>
              <div class="upd-sc-lb sd-mono">BODY <button class="upd-copy" title="Copy body" @click="copy(bodyShown, 'Body')"><Copy :size="11" /></button></div>
              <div class="upd-sc-body">{{ bodyShown || '—' }}</div>
            </Motion>

            <!-- variable resolution — WHERE each token's data comes from -->
            <Motion v-if="varRows.length || unknownTokens.length" class="upd-block" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="rev(1)">
              <div class="upd-lb sd-mono">VARIABLE RESOLUTION <i class="upd-lb-i">where each token fills from at apply time</i></div>
              <ul class="upd-vars">
                <li v-for="v in varRows" :key="v.token">
                  <span class="upd-vtoken sd-mono">{{ v.token }}</span>
                  <ArrowRight :size="12" class="upd-varrow" />
                  <span v-if="v.sample" class="upd-vval">{{ v.sample }}<em class="upd-vsample sd-mono">e.g.</em></span>
                  <span v-else class="upd-vval pending sd-mono">{{ v.ticketOnly ? 'fills when run on a ticket' : 'from live context' }}</span>
                  <span class="upd-vsrc">{{ v.hint }}</span>
                </li>
                <li v-for="u in unknownTokens" :key="u" class="unknown">
                  <span class="upd-vtoken sd-mono warn">⚠ {{ u }}</span>
                  <ArrowRight :size="12" class="upd-varrow" />
                  <span class="upd-vval pending sd-mono">stays visible in the output</span>
                  <span class="upd-vsrc">Unknown token — not in the documented set</span>
                </li>
              </ul>
            </Motion>

            <!-- prefills -->
            <Motion class="upd-block" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="rev(2)">
              <div class="upd-lb sd-mono">PREFILLS</div>
              <div class="upd-chips">
                <SdPill v-if="t.priority" kind="priority" :value="t.priority" />
                <span v-if="t.ticket_type" class="upd-kv"><Tag :size="10" /> {{ typeLabel(t.ticket_type) }}</span>
                <span v-if="catName" class="upd-kv"><FolderOpen :size="10" /> {{ catName }}</span>
                <span v-if="!t.priority && !t.ticket_type && !catName" class="upd-none">No field prefills — this tape only fills subject &amp; body.</span>
              </div>
              <div v-if="(t.tags || []).length" class="upd-chips upd-tagline">
                <span v-for="tag in t.tags" :key="tag" class="upd-hash">#{{ tag }}</span>
              </div>
            </Motion>

            <!-- checklist -->
            <Motion v-if="(t.checklist || []).length" class="upd-block" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="rev(3)">
              <div class="upd-lb sd-mono">CHECKLIST · {{ t.checklist.length }} <i class="upd-lb-i">appended to the ticket description</i></div>
              <ul class="upd-check">
                <li v-for="(c, i) in t.checklist" :key="i"><SquareCheck :size="12" /> {{ c.text || c }}</li>
              </ul>
            </Motion>

            <!-- provenance -->
            <Motion class="upd-block" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="rev(4)">
              <div class="upd-lb sd-mono">PROVENANCE</div>
              <div class="upd-prov">
                <div><i>Scope</i><b><component :is="visIcon" :size="11" /> {{ visLabel }}{{ mine ? ' · yours' : '' }}</b></div>
                <div><i>Recorded</i><b>{{ fmtDate(t.created_at) }}</b></div>
                <div v-if="t.updated_at"><i>Last dub</i><b>{{ fmtDate(t.updated_at) }}</b></div>
                <div v-if="t.pinned"><i>Desk pick</i><b class="hl"><Pin :size="11" /> pinned by admin</b></div>
              </div>
            </Motion>

            <!-- re-recordings -->
            <Motion class="upd-block" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="rev(5)">
              <div class="upd-lb sd-mono">RE-RECORDINGS</div>
              <div v-if="detailLoading" class="upd-revnote">Rewinding the master reel…</div>
              <div v-else-if="!(detail?.revisions || []).length" class="upd-revnote">No prior dubs — this is the original recording.</div>
              <ul v-else class="upd-revs">
                <li v-for="r in detail.revisions" :key="r.version" class="sd-mono">
                  <span class="upd-rev-v">v{{ r.version }}</span>
                  <span class="upd-rev-s">{{ r.subject || '—' }}</span>
                  <span class="upd-rev-t">{{ r.edited_at ? ago(r.edited_at) : '' }}</span>
                </li>
              </ul>
            </Motion>
          </div>

          <!-- ── footer CTAs ── -->
          <footer class="upd-foot">
            <Motion v-if="status !== 'archived'" as="button" class="upd-btn primary"
              :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }" @click="$emit('use', t)">
              <Play :size="14" /> Use — new ticket
            </Motion>
            <Motion v-if="status !== 'archived'" as="button" class="upd-btn" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="$emit('run', t)">
              <Zap :size="14" /> Run on ticket…
            </Motion>
            <Motion as="button" class="upd-btn ghost" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
              title="Clone into MY slides as a personal draft" @click="$emit('clone', t)">
              <CopyPlus :size="14" /> Clone to mine
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdUtplPreviewDrawer — the Cassette Exchange listening booth. Teleported
   right-side drawer with a telemetry ribbon, a scanline "playback screen"
   (PLAYBACK ⇄ RAW TAPE), a VARIABLE RESOLUTION table that shows what each token
   resolves to and where it fills from, prefills, checklist, provenance and the
   re-recordings reel (from the lazy detail fetch). Sections reveal on a stagger.
   Copy buttons use the clipboard + a toast. */
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  X, Film, Sparkles, Braces, Copy, FolderOpen, SquareCheck, Zap, Play, CopyPlus,
  Star, Clock3, GitBranch, CalendarDays, ArrowRight, Tag, Pin, Globe, Users, Lock,
} from 'lucide-vue-next'
import SdPill from '../components/SdPill.vue'
import { typeLabel } from '@/composables/useSupportDesk'
import { TEMPLATE_VARIABLES, SAMPLE_CONTEXT, substituteTemplate, detectUnknownTokens } from '../templateVariables'

const props = defineProps({
  open: { type: Boolean, default: false },
  t: { type: Object, default: null },
  detail: { type: Object, default: null },        // getTemplate() result (adds revisions)
  detailLoading: { type: Boolean, default: false },
  catName: { type: String, default: '' },
  mine: { type: Boolean, default: false },         // caller owns this personal tape
})
defineEmits(['close', 'use', 'run', 'clone'])

const toast = useToast()
const mode = ref('rendered')
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  && document.documentElement.dataset.cinematic !== 'on'
watch(() => props.t?.id, () => { mode.value = 'rendered' })

const isEmoji = computed(() => !!props.t?.icon && !/^[A-Za-z]/.test(props.t.icon))
const status = computed(() => props.t?.status || 'active')
const ribbon = computed(() => ({ active: 'LIVE', draft: 'DRAFT', archived: 'BOXED' }[status.value] || 'LIVE'))
const visLabel = computed(() => ({ personal: 'PERSONAL', team: 'TEAM', global: 'LIBRARY' }[props.t?.visibility || 'global']))
const visIcon = computed(() => ({ personal: Lock, team: Users, global: Globe }[props.t?.visibility || 'global']))

const subjectShown = computed(() => (mode.value === 'rendered'
  ? substituteTemplate(props.t?.subject, SAMPLE_CONTEXT) : props.t?.subject))
const bodyShown = computed(() => (mode.value === 'rendered'
  ? substituteTemplate(props.t?.body, SAMPLE_CONTEXT) : props.t?.body))

const usedTokens = computed(() => {
  const text = `${props.t?.subject || ''}\n${props.t?.body || ''}`
  return TEMPLATE_VARIABLES.filter((v) => text.includes(v.token))
})
const unknownTokens = computed(() => detectUnknownTokens(`${props.t?.subject || ''}\n${props.t?.body || ''}`))
// Each used token → its sample resolution + source hint (answers "how do these fill?").
const varRows = computed(() => usedTokens.value.map((v) => {
  const key = v.token.slice(2, -2)
  return { token: v.token, label: v.label, hint: v.hint, sample: SAMPLE_CONTEXT[key] ?? null, ticketOnly: key.startsWith('ticket.') }
}))

// staggered section reveal
const rev = (i) => ({ duration: reduced ? 0 : 0.42, delay: reduced ? 0 : 0.06 + i * 0.07, ease: [0.16, 1, 0.3, 1] })

const ago = (d) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}
const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}
const copy = async (text, what) => {
  try { await navigator.clipboard.writeText(text || ''); toast.success(`${what} copied`) }
  catch { toast.error('Clipboard unavailable') }
}
</script>

<style scoped>
.upd-ov {
  position: fixed; inset: 0; z-index: 4000; display: flex; justify-content: flex-end;
  background: rgba(4, 5, 6, 0.55); backdrop-filter: blur(8px) saturate(130%);
}
[data-theme="light"] .upd-ov { background: rgba(60, 45, 20, 0.28); }
.upd {
  width: min(500px, 96vw); height: 100%; display: flex; flex-direction: column;
  background: var(--sd-panel, #14110c); border-left: 1px solid var(--sd-utpl-brd);
  box-shadow: -24px 0 70px rgba(0, 0, 0, 0.5);
}
[data-theme="light"] .upd { background: rgba(255, 250, 240, 0.97); }

.upd-head {
  position: relative; overflow: hidden;
  display: flex; gap: 12px; align-items: flex-start;
  padding: 18px 18px 15px; border-bottom: 1px solid var(--sd-border);
  background: linear-gradient(180deg, color-mix(in srgb, var(--acc) 13%, transparent), transparent);
}
.upd-ambient {
  position: absolute; top: -40px; right: -30px; width: 160px; height: 160px; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--acc) 22%, transparent), transparent 70%);
  opacity: 0.7;
}
.upd-seal {
  position: relative; flex: 0 0 auto; width: 42px; height: 42px; display: grid; place-items: center;
  border-radius: 12px; font-size: 20px;
  background: color-mix(in srgb, var(--acc) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc) 40%, transparent);
  color: var(--acc); box-shadow: inset 0 1px 5px color-mix(in srgb, var(--acc) 25%, transparent);
}
.upd-id { position: relative; flex: 1; min-width: 0; }
.upd-eyebrow { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 8.5px; letter-spacing: 0.2em; color: color-mix(in srgb, var(--acc) 85%, var(--sd-text)); margin-bottom: 5px; }
.upd-status { padding: 1.5px 7px; border-radius: 5px; font-weight: 800; letter-spacing: 0.16em; }
.upd-status[data-status="active"] { background: var(--sd-utpl-soft); color: var(--sd-utpl-hi); }
[data-theme="light"] .upd-status[data-status="active"] { color: var(--sd-utpl-deep); }
.upd-status[data-status="draft"] { background: var(--sd-utpl-ink-soft); color: var(--sd-utpl-ink); }
.upd-status[data-status="archived"] { background: var(--sd-utpl-arch-soft); color: var(--sd-utpl-arch); }
.upd-id h3 { margin: 0 0 3px; font-size: 17.5px; font-weight: 800; color: var(--sd-text); line-height: 1.2; }
.upd-id p { margin: 0; font-size: 12px; color: var(--sd-text-muted); line-height: 1.5; }
.upd-headbtns { position: relative; display: flex; align-items: center; gap: 7px; }
.upd-star { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--sd-utpl-fav); background: var(--sd-utpl-fav-soft); }
.upd-x {
  width: 30px; height: 30px; display: grid; place-items: center; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted);
}
.upd-x:hover { color: var(--sd-text); border-color: var(--sd-utpl-brd); }

/* telemetry ribbon */
.upd-tele {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px;
  background: var(--sd-border); border-bottom: 1px solid var(--sd-border);
}
.upd-tele-c {
  display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 11px 6px;
  background: var(--sd-panel, #14110c);
}
[data-theme="light"] .upd-tele-c { background: rgba(255, 250, 240, 0.97); }
.upd-tele-c svg { color: var(--acc); }
.upd-tele-c b { font-size: 13.5px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.upd-tele-c i { font-style: normal; font-size: 8px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--sd-text-muted); }

.upd-toggle {
  display: flex; align-items: center; gap: 6px; padding: 10px 18px;
  border-bottom: 1px solid var(--sd-border);
}
.upd-toggle button {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.14em; cursor: pointer;
  padding: 6px 11px; border-radius: 8px;
  background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted);
}
.upd-toggle button.on {
  color: var(--sd-utpl-hi); border-color: var(--sd-utpl-brd);
  background: var(--sd-utpl-soft); box-shadow: 0 0 14px color-mix(in srgb, var(--sd-utpl-core) 14%, transparent);
}
[data-theme="light"] .upd-toggle button.on { color: var(--sd-utpl-deep); }
.upd-hint { margin-left: auto; font-size: 9px; letter-spacing: 0.04em; color: var(--sd-text-muted); text-align: right; }

.upd-body { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 16px; }

/* playback screen */
.upd-screen {
  position: relative; overflow: hidden;
  padding: 15px 15px 16px; border-radius: 15px;
  background: var(--sd-utpl-stage);
  border: 1px solid color-mix(in srgb, var(--acc) 40%, var(--sd-utpl-brd));
  box-shadow: inset 0 0 34px color-mix(in srgb, var(--acc) 9%, transparent), 0 0 22px color-mix(in srgb, var(--acc) 8%, transparent);
}
.upd-scan {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.03) 0 1px, transparent 1px 4px);
  animation: upd-scan 3.6s linear infinite;
}
@keyframes upd-scan { to { transform: translateY(4px); } }
.upd-reels { position: absolute; top: 12px; right: 13px; display: flex; gap: 8px; opacity: 0.5; }
.upd-reel {
  width: 15px; height: 15px; border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--acc) 55%, transparent); border-top-color: transparent;
  animation: upd-spin 2.6s linear infinite;
}
.upd-reel:nth-child(2) { animation-duration: 3.4s; }
@keyframes upd-spin { to { transform: rotate(360deg); } }
.upd-sc-lb { display: flex; align-items: center; gap: 8px; font-size: 8px; letter-spacing: 0.2em; color: var(--sd-text-muted); margin-bottom: 5px; }
.upd-sc-lb:not(:first-child) { margin-top: 13px; }
.upd-sc-subject { position: relative; font-size: 13.5px; font-weight: 700; color: color-mix(in srgb, var(--acc) 60%, var(--sd-text)); line-height: 1.4; }
.upd-sc-body { position: relative; font-size: 12px; line-height: 1.6; color: var(--sd-text-secondary); white-space: pre-wrap; max-height: 210px; overflow-y: auto; }

.upd-block { display: flex; flex-direction: column; gap: 8px; }
.upd-lb { display: flex; align-items: center; gap: 8px; font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-text-muted); }
.upd-lb-i { font-style: normal; letter-spacing: 0.02em; text-transform: none; opacity: 0.8; }
.upd-copy {
  display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; cursor: pointer;
  background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted);
}
.upd-copy:hover { color: var(--sd-utpl-hi); border-color: var(--sd-utpl-brd); }

/* variable resolution table */
.upd-vars { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.upd-vars li {
  display: grid; grid-template-columns: auto auto 1fr; align-items: center; gap: 8px 9px;
  padding: 9px 11px; border-radius: 10px;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
}
.upd-vars li.unknown { border-color: color-mix(in srgb, var(--sd-utpl-risk) 35%, transparent); background: color-mix(in srgb, var(--sd-utpl-risk) 6%, transparent); }
.upd-vtoken { font-size: 10.5px; padding: 3px 8px; border-radius: 6px; background: var(--sd-utpl-soft); color: var(--sd-utpl-hi); border: 1px solid color-mix(in srgb, var(--sd-utpl-core) 34%, transparent); white-space: nowrap; }
[data-theme="light"] .upd-vtoken { color: var(--sd-utpl-deep); }
.upd-vtoken.warn { background: var(--sd-utpl-risk-soft); color: var(--sd-utpl-risk); border-color: color-mix(in srgb, var(--sd-utpl-risk) 35%, transparent); }
.upd-varrow { color: var(--sd-text-muted); flex: 0 0 auto; }
.upd-vval { font-size: 12px; font-weight: 700; color: var(--sd-text); display: inline-flex; align-items: center; gap: 6px; }
.upd-vval.pending { font-weight: 500; font-size: 10.5px; color: var(--sd-text-muted); letter-spacing: 0.02em; }
.upd-vsample { font-size: 8px; letter-spacing: 0.12em; padding: 1px 5px; border-radius: 4px; color: var(--sd-utpl-use); background: var(--sd-utpl-use-soft); }
.upd-vsrc { grid-column: 1 / -1; font-size: 10.5px; line-height: 1.45; color: var(--sd-text-muted); }

.upd-chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.upd-tagline { margin-top: 2px; }
.upd-kv {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 6px;
  color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border);
}
.upd-none { font-size: 11.5px; color: var(--sd-text-muted); }
.upd-hash { font-size: 11px; color: color-mix(in srgb, var(--acc) 80%, var(--sd-text)); }

.upd-check { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.upd-check li { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--sd-text-secondary); }
.upd-check li svg { color: var(--sd-utpl-use); flex: 0 0 auto; }

/* provenance grid */
.upd-prov { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.upd-prov > div { display: flex; flex-direction: column; gap: 3px; padding: 9px 11px; border-radius: 10px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.upd-prov i { font-style: normal; font-size: 8px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--sd-text-muted); }
.upd-prov b { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: var(--sd-text); }
.upd-prov b.hl { color: var(--sd-utpl-hi); }
[data-theme="light"] .upd-prov b.hl { color: var(--sd-utpl-core); }

.upd-revnote { font-size: 11.5px; color: var(--sd-text-muted); }
.upd-revs { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.upd-revs li {
  display: flex; align-items: center; gap: 10px; font-size: 10.5px;
  padding: 7px 10px; border-radius: 9px;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
}
.upd-rev-v { color: var(--sd-utpl-hi); font-weight: 800; }
[data-theme="light"] .upd-rev-v { color: var(--sd-utpl-core); }
.upd-rev-s { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--sd-text-secondary); }
.upd-rev-t { color: var(--sd-text-muted); }

.upd-foot {
  display: flex; gap: 8px; padding: 14px 18px; flex-wrap: wrap;
  border-top: 1px solid var(--sd-border);
  background: color-mix(in srgb, var(--sd-utpl-stage) 30%, transparent);
}
.upd-btn {
  flex: 1; min-width: 120px; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  padding: 11px 10px; border-radius: 11px; cursor: pointer;
  font-size: 12px; font-weight: 800;
  border: 1px solid var(--sd-utpl-brd); background: var(--sd-surface); color: var(--sd-text);
}
.upd-btn.primary { border: none; background: var(--sd-utpl-grad); color: #1b0f04; box-shadow: var(--sd-utpl-glow); }
[data-theme="light"] .upd-btn.primary { color: #fff7e9; }
.upd-btn.ghost { color: var(--sd-text-secondary); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .upd-scan,
  html:not([data-cinematic="on"]) .upd-reel { animation: none; }
}
</style>
