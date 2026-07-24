<template>
  <!-- ═══ CORRELATED POSITIONS — recurrence clusters. Same risk, re-struck: signature
       families scored over the window; covered families wear the problem chip,
       uncovered ones expose PROMOTE TO PROBLEM (the nominate intent). ═══ -->
  <section class="corr sd-card">
    <header class="corr-bar">
      <span class="corr-name-h sd-mono">CORRELATED POSITIONS — SAME RISK, RE-STRUCK</span>
      <button class="corr-refresh" type="button" title="Re-run the correlation sweep" @click="$emit('refresh')">
        <RefreshCw :size="13" :class="{ spin: loading }" />
      </button>
    </header>

    <!-- skeletons -->
    <div v-if="loading && !clusters.length" class="corr-skel" aria-hidden="true">
      <div v-for="n in 3" :key="n" class="skel-card" :style="{ '--i': n }">
        <span class="sk w60" /><span class="sk w40" /><span class="sk w80" />
      </div>
    </div>

    <!-- empty book -->
    <p v-else-if="!clusters.length" class="corr-empty sd-mono">
      NO CORRELATED EXPOSURE IN THE WINDOW — NO SIGNATURE HAS RE-STRUCK.
    </p>

    <div v-else class="corr-list">
      <article v-for="(c, i) in clusters" :key="sigKey(c)" class="corr-card" :style="{ '--i': Math.min(i, 7) }">
        <div class="corr-top">
          <div class="corr-id">
            <p class="corr-title">{{ c.suggested_problem_title || signatureLine(c) }}</p>
            <p class="corr-meta sd-mono">
              {{ (c.signature?.category_name || 'UNCLASSIFIED').toUpperCase() }}
              <template v-if="c.signature?.service"> · {{ String(c.signature.service).toUpperCase() }}</template>
              · {{ c.count }} STRIKES · {{ spanOf(c) }}
            </p>
            <div v-if="(c.signature?.keywords || []).length" class="corr-tags">
              <code v-for="k in c.signature.keywords.slice(0, 5)" :key="k" class="sd-mono">{{ k }}</code>
            </div>
          </div>
          <div class="corr-score sd-mono">
            <SdIncSevBadge :sev="c.sev_worst || 4" />
            <b>{{ Number(c.score || 0).toFixed(2) }}</b>
            <span>CORR</span>
          </div>
        </div>

        <div class="corr-meter" aria-hidden="true">
          <i :style="{ width: `${Math.min(100, Math.round((Number(c.score) || 0) * 100))}%` }" />
        </div>

        <div class="corr-members">
          <button v-for="t in (c.tickets || []).slice(0, 3)" :key="t.id" class="mem sd-mono"
            type="button" :title="t.subject" @click="$emit('open', t.id)">
            {{ t.ticket_number }}
          </button>
          <span v-if="(c.ticket_ids || []).length > 3" class="mem-more sd-mono">
            +{{ (c.ticket_ids || []).length - 3 }} MORE
          </span>
          <span v-if="c.rca_hint" class="hint-chip sd-mono" :title="c.rca_hint">HINT · {{ trunc(c.rca_hint, 42) }}</span>
        </div>

        <div class="corr-verbs">
          <span v-if="c.has_open_problem" class="covered sd-mono">
            ✓ COVERED · {{ c.open_problem_number || 'PROBLEM OPEN' }}
          </span>
          <button v-else class="promote sd-mono" type="button" @click="$emit('nominate', c)">
            <ArrowUpRight :size="12" /> PROMOTE TO PROBLEM
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
/*
  SdRcaRecurrencePanel — Clearinghouse "correlated positions" desk. Projection of
  /incidents/rca/clusters; emits nominate(cluster) / open(ticket_id) / refresh only —
  the section opens the nominate modal and owns promoteRcaCluster.
*/
import { RefreshCw, ArrowUpRight } from 'lucide-vue-next'
import SdIncSevBadge from './SdIncSevBadge.vue'

defineProps({
  clusters: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
defineEmits(['nominate', 'open', 'refresh'])

const sigKey = (c) =>
  `${c.signature?.category_id || 'x'}-${c.signature?.service || 'x'}-${(c.signature?.keywords || []).join('.')}`
const signatureLine = (c) => {
  const kw = (c.signature?.keywords || []).slice(0, 3).join(' / ')
  return kw || c.signature?.service || c.signature?.category_name || 'Unnamed signature family'
}
const fmtDay = (iso) => {
  const d = new Date(iso || '')
  return Number.isNaN(d.getTime()) ? '—'
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()
}
const spanOf = (c) => `${fmtDay(c.first_seen)} → ${fmtDay(c.last_seen)}`
const trunc = (s, n) => {
  const t = String(s || '')
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}
</script>

<style scoped>
.corr { display: flex; flex-direction: column; border-radius: 18px; padding: 14px 16px 16px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); min-width: 0; }
.corr-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px;
  border-bottom: 1px solid var(--sd-rcg-brd); padding-bottom: 9px; margin-bottom: 12px; }
.corr-name-h { font-size: 9.5px; letter-spacing: 0.24em; font-weight: 800; color: var(--sd-rcg-core); }
.corr-refresh { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px;
  cursor: pointer; background: transparent; border: 1px solid var(--sd-border);
  color: var(--sd-text-muted); transition: all 0.2s var(--sd-spring); }
.corr-refresh:hover { color: var(--sd-rcg-core); border-color: var(--sd-rcg-brd); }
.spin { animation: sd-spin-slow 1.1s linear infinite; }

.corr-list { display: flex; flex-direction: column; gap: 11px; }
.corr-card { border: 1px solid var(--sd-border); border-radius: 12px; padding: 12px 14px;
  background: var(--sd-surface-elevated);
  animation: corr-in 0.5s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.06s);
  transition: transform 0.2s var(--sd-spring), border-color 0.2s; }
.corr-card:hover { transform: translateY(-2px); border-color: var(--sd-rcg-brd); }
@keyframes corr-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

.corr-top { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.corr-id { min-width: 0; }
.corr-title { margin: 0; font-size: 12.5px; font-weight: 700; color: var(--sd-text); line-height: 1.4; }
.corr-meta { margin: 3px 0 0; font-size: 8.5px; letter-spacing: 0.08em; color: var(--sd-text-muted); }
.corr-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
.corr-tags code { font-size: 9px; color: var(--sd-rcg-core); border-radius: 3px; padding: 2px 6px;
  background: var(--sd-rcg-soft); border: 1px solid color-mix(in srgb, var(--sd-rcg-core) 25%, transparent); }
.corr-score { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex: 0 0 auto; }
.corr-score b { font-size: 21px; font-weight: 200; color: var(--sd-rcg-core); font-variant-numeric: tabular-nums; }
.corr-score span { font-size: 7px; letter-spacing: 0.22em; color: var(--sd-text-muted); }

.corr-meter { height: 4px; border-radius: 2px; overflow: hidden; background: var(--sd-rcg-soft); margin: 10px 0; }
.corr-meter i { display: block; height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, var(--sd-rcg-core), var(--sd-rcg-hi));
  transition: width 1.1s var(--sd-spring) 0.3s; }

.corr-members { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 10px; }
.mem { font-size: 9.5px; font-weight: 700; color: var(--sd-rcg-core); cursor: pointer; border-radius: 4px;
  padding: 3px 8px; background: transparent;
  border: 1px solid color-mix(in srgb, var(--sd-rcg-core) 30%, transparent);
  transition: background 0.18s, transform 0.18s var(--sd-spring); font-variant-numeric: tabular-nums; }
.mem:hover { background: var(--sd-rcg-soft); transform: translateY(-1px); }
.mem-more { font-size: 8.5px; letter-spacing: 0.1em; color: var(--sd-text-muted); }
.hint-chip { font-size: 8.5px; letter-spacing: 0.06em; color: var(--sd-rcg-warn); border-radius: 4px;
  padding: 3px 8px; background: var(--sd-rcg-warn-soft);
  border: 1px dashed color-mix(in srgb, var(--sd-rcg-warn) 40%, transparent);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

.corr-verbs { display: flex; justify-content: flex-end; }
.covered { font-size: 9px; font-weight: 800; letter-spacing: 0.12em; color: var(--sd-rcg-core);
  border: 1px solid color-mix(in srgb, var(--sd-rcg-core) 40%, transparent); border-radius: 5px;
  background: var(--sd-rcg-soft); padding: 6px 12px; }
.promote { display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--sd-rcg-hi); cursor: pointer; border-radius: 5px; padding: 7px 13px;
  background: var(--sd-rcg-hi-soft); border: 1px solid color-mix(in srgb, var(--sd-rcg-hi) 45%, transparent);
  transition: transform 0.18s var(--sd-spring), background 0.2s, box-shadow 0.2s; }
[data-theme="light"] .promote { color: var(--sd-rcg-deep);
  border-color: color-mix(in srgb, var(--sd-rcg-deep) 45%, transparent); }
.promote:hover { transform: translateY(-1px); background: var(--sd-rcg-soft); box-shadow: var(--sd-rcg-glow); }
.promote:active { transform: scale(0.95); }

.corr-empty { margin: 4px 0 0; padding: 20px 6px; text-align: center; font-size: 9px;
  letter-spacing: 0.18em; color: var(--sd-text-muted); }

/* skeletons */
.corr-skel { display: flex; flex-direction: column; gap: 11px; }
.skel-card { border: 1px solid var(--sd-border); border-radius: 12px; padding: 14px;
  display: flex; flex-direction: column; gap: 9px; }
.sk { display: block; height: 10px; border-radius: 4px;
  background: linear-gradient(90deg, var(--sd-rcg-soft) 25%, color-mix(in srgb, var(--sd-rcg-core) 22%, transparent) 50%, var(--sd-rcg-soft) 75%);
  background-size: 200% 100%; animation: corr-shimmer 1.4s linear infinite; animation-delay: calc(var(--i) * 0.1s); }
.sk.w60 { width: 60%; } .sk.w40 { width: 40%; } .sk.w80 { width: 80%; }
@keyframes corr-shimmer { to { background-position: -200% 0; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .corr-card { animation: none !important; }
  html:not([data-cinematic="on"]) .spin,
  html:not([data-cinematic="on"]) .sk { animation: none !important; }
  html:not([data-cinematic="on"]) .corr-meter i { transition: none; }
}
</style>
