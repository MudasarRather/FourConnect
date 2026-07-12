<template>
  <div class="br">
    <!-- ═══ instrument bar — slim console strip (the hero above owns the headline) ═══ -->
    <header class="br-bar">
      <span class="br-bar-sig sd-mono" title="Every lane is a blade in the desk's rack — load LEDs, tier plates, spill ports. Click a blade to open its console.">
        <Server :size="12" /> THE BLADE RACK
      </span>
      <span class="br-bar-note sd-mono">LANE TERMINALS · LIVE LOAD · SPILL PORTS</span>
      <span class="br-sp" />
      <span class="br-bar-tele sd-mono" aria-label="Rack telemetry">
        <em><b><SdCountUp :value="lanes.length" /></b> BLADES</em>
        <em class="on"><b><SdCountUp :value="onlineCount" /></b> ONLINE</em>
        <em class="hot"><b><SdCountUp :value="atCapCount" /></b> AT CAPACITY</em>
        <em class="load"><b><SdCountUp :value="totalOpen" /></b> OPEN LOAD</em>
      </span>
      <Motion as="button" class="br-cta ghost" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
        title="Run the routing chain over open tickets that predate these lanes" @click="$emit('backfill')">
        <Route :size="13" /> Route the backlog
      </Motion>
      <Motion as="button" class="br-cta" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.96 }" @click="$emit('new')">
        <Plus :size="13" /> Rack a blade
      </Motion>
    </header>

    <!-- ═══ sector selector ═══ -->
    <div class="br-sectors" role="tablist" aria-label="Rack sectors">
      <button v-for="(sec, i) in sectors" :key="sec.key" class="br-sec sd-mono" :style="{ '--i': i }"
        :class="{ on: sector === sec.key }" role="tab" :aria-selected="sector === sec.key"
        @click="sector = sec.key">
        {{ sec.label }} <b v-if="sec.count">{{ sec.count }}</b>
      </button>
    </div>

    <!-- ═══ the rack ═══ -->
    <div v-if="shown.length" class="br-rack">
      <TransitionGroup name="br-slot" tag="div" class="br-slots">
        <div v-for="(l, i) in shown" :key="l.id" class="br-slot" :style="{ '--i': i, '--lc': l.color }">
          <!-- U-rail -->
          <div class="br-u sd-mono" aria-hidden="true">
            <i class="scr" /><b>U{{ String(i + 1).padStart(2, '0') }}</b><i class="scr" />
          </div>

          <!-- the blade -->
          <article class="br-blade" :class="{ off: !l.isActive, hot: l.atCap, master: l.isDefault }"
            role="button" :title="`Open ${l.name}'s console`" @click="$emit('edit', l.id)">
            <span class="br-vents" aria-hidden="true" />
            <span v-if="l.atCap" class="br-heat" aria-hidden="true" />

            <!-- power cluster + light pipe -->
            <div class="br-power">
              <span class="br-lamp" :class="{ on: l.isActive }" :title="l.isActive ? 'Online' : 'Powered down'" aria-hidden="true" />
              <span class="br-pipe" aria-hidden="true" />
            </div>

            <!-- identity -->
            <div class="br-id">
              <div class="br-id-top">
                <b class="br-name">{{ l.name }}</b>
                <span v-if="l.isDefault" class="br-master-tag sd-mono" title="Default fallback lane — unmatched traffic lands here"><Crown :size="8" /> MASTER</span>
              </div>
              <span class="br-id-sub sd-mono">
                <i class="br-tier" :style="l.tierAccent ? { color: l.tierAccent, borderColor: 'color-mix(in srgb, ' + l.tierAccent + ' 45%, transparent)' } : {}">{{ l.tierLabel }}</i>
                <template v-if="l.code"> · {{ l.code }}</template>
              </span>
            </div>

            <!-- config chips -->
            <div class="br-cfg sd-mono">
              <span class="br-chip" :class="{ warn: l.autoNoCrew }" :title="l.autoNoCrew ? 'Auto-assign is on but no crew is wired — assignment fails open to manual' : 'Crew'">
                <Users :size="9" /> {{ l.teamName || 'no crew' }}</span>
              <span class="br-chip"><Repeat :size="9" /> {{ l.method }}</span>
              <span class="br-chip"><ListOrdered :size="9" /> {{ l.serve }}</span>
              <span v-if="l.slaName" class="br-chip sla" :title="'SLA policy: ' + l.slaName"><Timer :size="9" /> {{ l.slaName }}</span>
              <span v-if="l.skillNames.length" class="br-chip skill" :title="'Requires: ' + l.skillNames.join(', ')">
                <Sparkles :size="9" /> {{ l.skillNames.length }} skill{{ l.skillNames.length === 1 ? '' : 's' }}</span>
              <span class="br-chip dim" :title="`Drain priority ${l.drain}/100 — higher serves first`"><Gauge :size="9" /> drain {{ l.drain }}</span>
            </div>

            <!-- LED load meter -->
            <div class="br-load" :title="l.cap ? `${l.open} open of ${l.cap} capacity` : `${l.open} open · no capacity ceiling`">
              <div class="br-leds" aria-hidden="true">
                <i v-for="s in 12" :key="s" class="br-led" :class="[ledTone(s), { on: s <= l.lit, blink: l.atCap && s === 12 }]"
                  :style="{ '--ld': (i * 0.05 + s * 0.045) + 's' }" />
              </div>
              <span class="br-load-v sd-mono"><b>{{ l.open }}</b>{{ l.cap ? ` / ${l.cap}` : ' open' }}</span>
              <span v-if="l.atCap" class="br-cap-stamp sd-mono">AT CAPACITY</span>
            </div>

            <!-- spill port -->
            <div class="br-ports" @click.stop>
              <button v-if="l.overflow" class="br-port sd-mono" :class="{ dead: !l.overflow.active, live: l.atCap && l.overflow.active }"
                :title="l.overflow.active ? `Spills to ${l.overflow.name} — open that blade` : `Spill target ${l.overflow.name} is POWERED DOWN — the spill hop fails open and traffic stacks here`"
                @click="$emit('edit', l.overflow.id)">
                <span class="br-port-jack" aria-hidden="true"><i /><i /></span>
                SPILL → {{ l.overflow.name }}
                <TriangleAlert v-if="!l.overflow.active" :size="9" />
              </button>
              <span v-else-if="l.cap" class="br-port none sd-mono"
                title="Capacity is set but no spill path — at the ceiling, new traffic stacks in this lane anyway">
                <span class="br-port-jack" aria-hidden="true"><i /><i /></span>
                NO SPILL PATH
              </span>
            </div>

            <!-- actions -->
            <div class="br-acts" @click.stop>
              <button class="br-ic" title="Open the lane console" @click="$emit('edit', l.id)"><Pencil :size="12" /></button>
              <button class="br-ic danger" :disabled="l.isDefault"
                :title="l.isDefault ? 'The master blade can’t be pulled — crown another lane first' : 'Pull this blade'"
                @click="$emit('remove', l.id)"><Trash2 :size="12" /></button>
            </div>

            <span v-if="!l.isActive" class="br-down sd-mono" aria-hidden="true">POWERED DOWN — ROUTING SKIPS THIS BLADE</span>
          </article>
        </div>
      </TransitionGroup>
    </div>

    <!-- empty rack -->
    <div v-else class="br-empty">
      <div class="br-empty-slots" aria-hidden="true"><i /><i /><i /></div>
      <p class="sd-mono">{{ lanes.length ? 'NO BLADES IN THIS SECTOR' : 'THE RACK IS EMPTY' }}</p>
      <span>{{ lanes.length ? 'Flip back to ALL — or rack a blade into this sector.' : 'Traffic has nowhere to land. Rack the first lane and the routing engine lights up.' }}</span>
      <Motion v-if="!lanes.length" as="button" class="br-cta" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }" @click="$emit('new')">
        <Plus :size="13" /> Rack the first blade
      </Motion>
    </div>
  </div>
</template>

<script setup>
/*
  SdLaneBladeRack — "THE BLADE RACK", the Lanes panel as a datacenter rack
  elevation. Every lane is a live 1U blade: breathing power lamp (retired blades
  read POWERED DOWN with the routing consequence spelled out), lane-color light
  pipe, tier plate, MASTER tag on the default lane, config chips (crew / method /
  serve order / SLA / required skills / drain), a segmented LED load meter that
  ignites sequentially to the live open-vs-capacity ratio (overload LED blinks,
  heat-shimmer plays across a full blade), and a SPILL patch-port that jumps to
  the overflow blade — flagged dead when the target is powered down (the hop
  fails open) and replaced by a NO SPILL PATH notice when capacity has no escape.
  Blades rack themselves in with a staggered slide; sector tabs (ALL / FRONTLINE /
  L2 / L3 / OFFLINE) FLIP-filter the rack. Presentational only — display-ready
  lanes come in, new/edit/remove/backfill go out; writes stay in the section.
  Distinct from every sibling: the desk's only hardware-rack metaphor.
*/
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Server, Plus, Route, Crown, Users, Repeat, ListOrdered, Timer, Sparkles, Gauge,
  Pencil, Trash2, TriangleAlert,
} from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  /* display-ready lanes from the section:
     { id, name, code, color, isActive, isDefault, tierLabel, tierAccent, teamName,
       autoNoCrew, method, serve, slaName, skillNames[], drain, open, cap, lit,
       atCap, overflow: {id,name,active}|null } */
  lanes: { type: Array, default: () => [] },
})
defineEmits(['new', 'edit', 'remove', 'backfill'])

const onlineCount = computed(() => props.lanes.filter(l => l.isActive).length)
const atCapCount = computed(() => props.lanes.filter(l => l.atCap).length)
const totalOpen = computed(() => props.lanes.reduce((s, l) => s + (l.open || 0), 0))

/* sector tabs — client-side rack filter */
const sector = ref('all')
const sectors = computed(() => [
  { key: 'all', label: 'ALL', count: props.lanes.length },
  { key: 'frontline', label: 'FRONTLINE', count: props.lanes.filter(l => l.isActive && !l.tier).length },
  { key: 'l2', label: 'L2', count: props.lanes.filter(l => l.isActive && l.tier === 2).length },
  { key: 'l3', label: 'L3', count: props.lanes.filter(l => l.isActive && l.tier === 3).length },
  { key: 'offline', label: 'OFFLINE', count: props.lanes.filter(l => !l.isActive).length },
])
const shown = computed(() => {
  if (sector.value === 'all') return props.lanes
  if (sector.value === 'offline') return props.lanes.filter(l => !l.isActive)
  if (sector.value === 'frontline') return props.lanes.filter(l => l.isActive && !l.tier)
  return props.lanes.filter(l => l.isActive && l.tier === (sector.value === 'l2' ? 2 : 3))
})

/* LED ladder: lane color → amber → red */
const ledTone = (s) => (s <= 8 ? 'lane' : s <= 10 ? 'warm' : 'red')
</script>

<style scoped>
/* ═══ shell — theme-aware instrument bay (the hero above owns the dark void) ═══ */
.br {
  position: relative; overflow: hidden; isolation: isolate;
  border: 1px solid var(--sd-border); border-radius: 18px;
  background: linear-gradient(180deg, var(--sd-qc-soft), transparent 130px), var(--sd-surface-elevated);
  padding: 0 18px 18px;
}
.br-sp { flex: 1; }

/* ═══ instrument bar ═══ */
.br-bar {
  position: relative; z-index: 2; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin: 0 -18px 14px; padding: 11px 18px;
  border-bottom: 1px solid var(--sd-border);
  background: linear-gradient(90deg, var(--sd-qc-soft), transparent 60%);
}
.br-bar-sig {
  display: inline-flex; align-items: center; gap: 7px; cursor: help;
  font-size: 10px; font-weight: 900; letter-spacing: 0.22em; color: var(--sd-qc-core);
}
.br-bar-note { font-size: 8.5px; letter-spacing: 0.16em; color: var(--sd-text-muted); }
.br-bar-tele { display: inline-flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.br-bar-tele em { font-style: normal; font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.br-bar-tele em b { font-size: 13px; letter-spacing: 0; color: var(--sd-qc-hi); margin-right: 3px; }
.br-bar-tele em.on b { color: var(--sd-qc-go); }
.br-bar-tele em.hot b { color: var(--sd-qc-halt); }
.br-bar-tele em.load b { color: var(--sd-qc-core); }
.br-cta {
  display: inline-flex; align-items: center; gap: 6px; align-self: center;
  padding: 7px 13px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer;
  border: 1px solid transparent; color: #241703;
  background: var(--sd-qc-grad); box-shadow: var(--sd-qc-glow);
}
.br-cta.ghost { background: transparent; color: var(--sd-qc-core); border-color: var(--sd-qc-brd); box-shadow: none; }

/* ═══ sector selector ═══ */
.br-sectors { position: relative; z-index: 1; display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 12px; }
.br-sec {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px;
  font-size: 8.5px; font-weight: 900; letter-spacing: 0.16em; cursor: pointer; font-family: inherit;
  color: var(--sd-text-muted); background: transparent; border: 1px solid var(--sd-border);
  animation: br-sec-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i, 0) * 0.05s);
  transition: color 0.2s, border-color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s;
}
@keyframes br-sec-in { from { opacity: 0; transform: translateY(-6px); } }
.br-sec:hover { transform: translateY(-1px); }
.br-sec b { font-size: 9px; color: var(--sd-qc-hi); }
.br-sec.on {
  color: var(--sd-text); border-color: var(--sd-qc-brd); background: var(--sd-qc-soft);
  box-shadow: 0 0 14px color-mix(in srgb, var(--sd-qc-core) 16%, transparent);
}

/* ═══ the rack ═══ */
.br-rack { position: relative; z-index: 1; }
.br-slots { display: flex; flex-direction: column; gap: 9px; }
.br-slot {
  display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 8px; align-items: stretch;
  animation: br-rack-in 0.6s cubic-bezier(0.22, 1.2, 0.36, 1) both;
  animation-delay: calc(var(--i, 0) * 0.07s);
}
@keyframes br-rack-in { from { opacity: 0; transform: translateX(-26px); } 70% { transform: translateX(3px); } to { opacity: 1; transform: translateX(0); } }
/* FLIP on sector switch */
.br-slot-move { transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.br-slot-enter-active { transition: opacity 0.35s, transform 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
.br-slot-leave-active { position: absolute; width: 100%; transition: opacity 0.25s, transform 0.3s; }
.br-slot-enter-from { opacity: 0; transform: translateX(-18px); }
.br-slot-leave-to { opacity: 0; transform: translateX(14px); }

.br-u {
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  padding: 6px 0; border-radius: 8px;
  background: color-mix(in srgb, var(--sd-text-dim) 8%, transparent);
  border: 1px solid var(--sd-border);
}
.br-u b { font-size: 8px; letter-spacing: 0.08em; color: var(--sd-text-dim); writing-mode: vertical-rl; }
.br-u .scr {
  width: 7px; height: 7px; border-radius: 50%;
  background: radial-gradient(circle at 35% 32%, color-mix(in srgb, var(--sd-text-dim) 55%, transparent), color-mix(in srgb, var(--sd-text-dim) 20%, transparent));
  box-shadow: inset 0 0 2px rgba(0, 0, 0, 0.4);
}

/* ═══ the blade ═══ */
.br-blade {
  position: relative; overflow: hidden; cursor: pointer;
  display: grid; grid-template-columns: 26px minmax(150px, 190px) minmax(0, 1fr) 175px auto auto;
  gap: 12px; align-items: center; padding: 10px 12px 10px 8px; border-radius: 12px;
  border: 1px solid var(--sd-border); background: var(--sd-surface-elevated);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s, box-shadow 0.25s;
}
.br-blade:hover {
  transform: translateX(6px);
  border-color: color-mix(in srgb, var(--lc, var(--sd-qc-core)) 45%, transparent);
  box-shadow: 0 4px 18px color-mix(in srgb, var(--lc, var(--sd-qc-core)) 14%, transparent);
}
.br-blade.master { border-color: var(--sd-qc-brd); }
.br-blade.off { opacity: 0.62; }
.br-blade.off:hover { opacity: 0.85; }
.br-vents {
  position: absolute; right: 0; top: 0; bottom: 0; width: 84px; pointer-events: none; opacity: 0.5;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--sd-text-dim) 14%, transparent) 0 2px, transparent 2px 7px);
  mask-image: linear-gradient(90deg, transparent, #000 70%);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 70%);
}
.br-heat {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(90deg, transparent 55%, color-mix(in srgb, var(--sd-qc-halt) 9%, transparent) 78%, color-mix(in srgb, var(--sd-qc-halt) 16%, transparent));
  background-size: 220% 100%;
  animation: br-heat-drift 2.6s ease-in-out infinite alternate;
}
@keyframes br-heat-drift { from { background-position: 0% 0; opacity: 0.7; } to { background-position: 60% 0; opacity: 1; } }
.br-blade.hot { border-color: color-mix(in srgb, var(--sd-qc-halt) 45%, transparent); }

/* power cluster */
.br-power { display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; }
.br-lamp {
  width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
  background: var(--sd-text-dim); opacity: 0.5;
}
.br-lamp.on {
  opacity: 1; background: var(--sd-qc-go);
  box-shadow: 0 0 9px var(--sd-qc-go);
  animation: br-lamp-breathe 2.4s ease-in-out infinite;
}
@keyframes br-lamp-breathe { 50% { box-shadow: 0 0 16px var(--sd-qc-go); } }
.br-pipe {
  flex: 1; width: 4px; border-radius: 3px; min-height: 22px;
  background: linear-gradient(180deg, var(--lc, var(--sd-qc-core)), color-mix(in srgb, var(--lc, var(--sd-qc-core)) 35%, transparent));
  box-shadow: 0 0 8px color-mix(in srgb, var(--lc, var(--sd-qc-core)) 45%, transparent);
}
.br-blade.off .br-pipe { box-shadow: none; opacity: 0.4; }

/* identity */
.br-id { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.br-id-top { display: flex; align-items: center; gap: 7px; min-width: 0; }
.br-name { font-size: 13px; font-weight: 800; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.br-master-tag {
  display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0;
  font-size: 7px; font-weight: 900; letter-spacing: 0.14em; padding: 2px 6px; border-radius: 999px;
  color: #241703; background: var(--sd-qc-grad);
}
.br-id-sub { display: inline-flex; align-items: center; gap: 5px; font-size: 8.5px; letter-spacing: 0.1em; color: var(--sd-text-muted); }
.br-tier {
  font-style: normal; font-size: 7.5px; font-weight: 900; letter-spacing: 0.14em;
  padding: 1.5px 6px; border-radius: 5px; color: var(--sd-qc-core);
  border: 1px solid var(--sd-qc-brd); background: var(--sd-qc-soft);
}

/* config chips */
.br-cfg { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; min-width: 0; }
.br-chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 2.5px 8px; border-radius: 999px;
  font-size: 8px; font-weight: 700; letter-spacing: 0.08em; white-space: nowrap;
  color: var(--sd-text-secondary); background: color-mix(in srgb, var(--sd-text-dim) 10%, transparent);
  border: 1px solid var(--sd-border);
}
.br-chip.sla { color: var(--sd-qc-warn); background: var(--sd-qc-warn-soft); border-color: color-mix(in srgb, var(--sd-qc-warn) 35%, transparent); }
.br-chip.skill { color: var(--sd-qc-go); background: var(--sd-qc-go-soft); border-color: color-mix(in srgb, var(--sd-qc-go) 32%, transparent); }
.br-chip.warn { color: var(--sd-qc-halt); background: var(--sd-qc-halt-soft); border-color: color-mix(in srgb, var(--sd-qc-halt) 40%, transparent); cursor: help; }
.br-chip.dim { color: var(--sd-text-muted); }

/* LED load meter */
.br-load { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
.br-leds { display: flex; gap: 3px; }
.br-led {
  width: 9px; height: 14px; border-radius: 2.5px;
  background: color-mix(in srgb, var(--sd-text-dim) 16%, transparent);
  transition: background 0.3s, box-shadow 0.3s;
}
.br-led.on { animation: br-led-ignite 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: var(--ld, 0s); }
.br-led.on.lane { background: var(--lc, var(--sd-qc-core)); box-shadow: 0 0 6px color-mix(in srgb, var(--lc, var(--sd-qc-core)) 55%, transparent); }
.br-led.on.warm { background: var(--sd-qc-warn); box-shadow: 0 0 6px color-mix(in srgb, var(--sd-qc-warn) 55%, transparent); }
.br-led.on.red { background: var(--sd-qc-halt); box-shadow: 0 0 7px color-mix(in srgb, var(--sd-qc-halt) 60%, transparent); }
@keyframes br-led-ignite { from { transform: scaleY(0.2); opacity: 0; } }
.br-led.blink { animation: br-led-ignite 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both, br-led-blink 0.9s steps(2, start) 0.5s infinite; }
@keyframes br-led-blink { to { opacity: 0.25; } }
.br-load-v { font-size: 8.5px; letter-spacing: 0.1em; color: var(--sd-text-muted); }
.br-load-v b { font-size: 11.5px; color: var(--sd-text); }
.br-cap-stamp {
  font-size: 6.5px; font-weight: 900; letter-spacing: 0.18em; padding: 2px 6px; border-radius: 4px;
  color: var(--sd-qc-halt); background: var(--sd-qc-halt-soft);
  border: 1px solid color-mix(in srgb, var(--sd-qc-halt) 45%, transparent);
  transform: rotate(-1.5deg);
}

/* spill port */
.br-ports { display: flex; align-items: center; }
.br-port {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-family: inherit;
  font-size: 7.5px; font-weight: 900; letter-spacing: 0.12em; padding: 6px 9px; border-radius: 8px;
  color: var(--sd-qc-core); background: var(--sd-qc-soft); border: 1px solid var(--sd-qc-brd);
  transition: transform 0.2s, box-shadow 0.2s;
  max-width: 170px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.br-port:hover { transform: translateY(-2px); box-shadow: var(--sd-qc-glow); }
.br-port.live { animation: br-port-pulse 1.6s ease-in-out infinite; }
@keyframes br-port-pulse { 50% { box-shadow: 0 0 16px color-mix(in srgb, var(--sd-qc-core) 45%, transparent); } }
.br-port.dead { color: var(--sd-qc-halt); background: var(--sd-qc-halt-soft); border-color: color-mix(in srgb, var(--sd-qc-halt) 45%, transparent); }
.br-port.none { color: var(--sd-text-dim); background: transparent; border-style: dashed; cursor: help; }
.br-port-jack { display: inline-flex; flex-direction: column; gap: 2px; }
.br-port-jack i { width: 8px; height: 2px; border-radius: 1px; background: currentColor; opacity: 0.65; }

/* actions */
.br-acts { display: flex; align-items: center; gap: 5px; }
.br-ic {
  display: grid; place-items: center; width: 27px; height: 27px; border-radius: 8px; cursor: pointer;
  color: var(--sd-text-muted); background: transparent; border: 1px solid var(--sd-border);
  transition: color 0.2s, border-color 0.2s, transform 0.2s;
}
.br-ic:hover:not(:disabled) { color: var(--sd-qc-core); border-color: var(--sd-qc-brd); transform: translateY(-1px); }
.br-ic.danger:hover:not(:disabled) { color: var(--sd-qc-halt); border-color: color-mix(in srgb, var(--sd-qc-halt) 45%, transparent); }
.br-ic:disabled { opacity: 0.35; cursor: not-allowed; }

.br-down {
  grid-column: 2 / -1; font-size: 7px; font-weight: 900; letter-spacing: 0.2em; color: var(--sd-text-dim);
}

/* ═══ empty rack ═══ */
.br-empty {
  position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 40px 20px 36px; text-align: center; border-radius: 14px;
  border: 1px dashed var(--sd-qc-brd);
  background: radial-gradient(90% 120% at 50% 0%, var(--sd-qc-soft), transparent 55%);
}
.br-empty-slots { display: flex; flex-direction: column; gap: 6px; width: min(300px, 70%); margin-bottom: 6px; }
.br-empty-slots i {
  height: 18px; border-radius: 6px; border: 1px dashed color-mix(in srgb, var(--sd-qc-core) 35%, transparent);
  animation: br-empty-breathe 2.8s ease-in-out infinite;
}
.br-empty-slots i:nth-child(2) { animation-delay: 0.4s; }
.br-empty-slots i:nth-child(3) { animation-delay: 0.8s; }
@keyframes br-empty-breathe { 50% { opacity: 0.35; } }
.br-empty p { margin: 0; font-size: 10.5px; font-weight: 900; letter-spacing: 0.24em; color: var(--sd-qc-core); }
.br-empty > span { font-size: 11.5px; color: var(--sd-text-muted); max-width: 420px; line-height: 1.6; }

/* ═══ responsive ═══ */
@media (max-width: 1150px) {
  .br-blade { grid-template-columns: 26px minmax(140px, 170px) minmax(0, 1fr) auto; }
  .br-load { grid-column: 2; }
  .br-ports { grid-column: 3; }
  .br-acts { grid-column: 4; }
}
@media (max-width: 760px) {
  .br-blade { grid-template-columns: 26px minmax(0, 1fr); }
  .br-cfg, .br-load, .br-ports, .br-acts, .br-down { grid-column: 2; }
  .br-acts { justify-self: end; }
  .br-vents { display: none; }
}

/* ═══ reduced motion — ambient loops off unless cinematic mode forces them on ═══ */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .br-sec,
  html:not([data-cinematic="on"]) .br-slot,
  html:not([data-cinematic="on"]) .br-lamp.on,
  html:not([data-cinematic="on"]) .br-heat,
  html:not([data-cinematic="on"]) .br-port.live,
  html:not([data-cinematic="on"]) .br-empty-slots i,
  html:not([data-cinematic="on"]) .br-led.on { animation: none; }
  html:not([data-cinematic="on"]) .br-led.blink { animation: none; }
  html:not([data-cinematic="on"]) .br-blade:hover { transform: none; }
  html:not([data-cinematic="on"]) .br-slot-move,
  html:not([data-cinematic="on"]) .br-slot-enter-active,
  html:not([data-cinematic="on"]) .br-slot-leave-active { transition: none; }
}

/* ═══ light theme — deepen what reads too pale on cream ═══ */
[data-theme="light"] .br { background: linear-gradient(180deg, var(--sd-qc-soft), transparent 130px), var(--sd-surface-elevated); }
[data-theme="light"] .br-blade { box-shadow: 0 2px 8px rgba(60, 42, 8, 0.04); }
[data-theme="light"] .br-led { background: rgba(60, 45, 20, 0.12); }
[data-theme="light"] .br-u { background: rgba(60, 45, 20, 0.05); }
[data-theme="light"] .br-chip { background: rgba(60, 45, 20, 0.06); }
</style>
