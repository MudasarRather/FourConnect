# Repo Design Patterns — proven cinematic building blocks

Distilled from the Asset-module redesigns (Inventory, Allocations, Returns, Transfers, History, Damage, Maintenance, Audits, Disposal, Categories, Vendors). Reuse these so new work is consistent and **never repeats a sibling's signature**.

## 1. The Console hero (every section gets one)
A `<Motion as="section" class="*c">` with, in order:
- `.as-grain` + an aura (`var(--as-grad-hero)`) + `.as-blueprint-floor` + a slow-rotating ambient motif (a big faint lucide icon or SVG, ~80s spin).
- **Lead:** pill eyebrow (`<Icon/> SECTION · Control`), `clamp()` title with a gradient-clip accent word, sub, CTA row (`as-btn` primary/steel/ghost with `motion-v` `:whileHover="{y:-2,scale:1.02}" :whileTap="{scale:0.97}"`).
- **Telemetry lenses:** a `repeat(5, ...)` grid of clickable stat chips; each = icon tile + `AssetCountUp` value + label + bottom accent bar; `.on` reflects the active filter; status lenses emit `pick`, info lenses are `.stat` (no cursor).
- **A signature instrument** (the unique part — see §4).
- Emits `pick` / `new` / `go` / `focus`.

## 2. Cinematic entity card
Outer `.x-shell` runs the entrance (CSS `as-deal` with `animation-delay: calc(var(--i)*0.045s)`), inner `.x` holds the tilt so they never conflict:
```
usePointerSpotlight(cardEl)            // sets --mx/--my/--spot
.x:hover { transform: perspective(1100px)
  rotateX(calc((var(--my,.5) - .5) * -6deg))
  rotateY(calc((var(--mx,.5) - .5) *  8deg)) translateY(-2px); }
.x-glare { opacity: var(--spot,0); background: radial-gradient(...at calc(var(--mx)*100%) calc(var(--my)*100%)...); }
```
Plus: a status-colored left **spine**, a conic/gauge **ring** or meter, an inline **stepper** for lifecycle state, status `AsStamp`, action buttons (`motion-v` hover/tap), and any "live" pulse only while the row is active.

## 3. Modal recipe (`AssetModal` shell)
- Body opens with a **live preview** card that fills as fields complete (DRAFT→READY stamp, blueprint grid, the section's motif).
- Fields animate in with staggered `motion-v` (`fT(i) = {duration:.4, delay:.05+i*.06, ease:[.16,1,.3,1]}`).
- **Dropdowns** = `AsSelect` (teleported, animated, supports `{value,label,icon?,dot?}`); prepend a `{value:'', label:'(none/All …)'}` to keep it resettable.
- **Enum pickers** = segmented icon buttons (not a plain select) when ≤6 options.
- **Dates** = `HrDatePicker` (the onboarding add-asset calendar — z-5000 teleport, month-slide). The user repeatedly asks for "the onboarding assets purchase-date calendar" → that is `@/components/hr/forms/HrDatePicker.vue`.
- Confirm button shows a `Loader` spinner while saving; disable on invalid.
- Destructive/decision actions get their own confirm modal (tone-morph + reason note).

## 4. Signature-instrument ledger — DO NOT REPEAT
Each asset tab owns one mechanic; pick a fresh one for new pages:
| Tab | Metaphor / instrument |
|---|---|
| Inventory | "Fleet Bay" — pulse strip + manifest, scanline deal |
| Allocations | "Deployment Console" — **radar** sweep + deployment pipeline |
| Returns | "Re-entry Control" — **horizon timeline** w/ overdue zone + NOW gate |
| Transfers | "Transit Relay" — **conveyor** w/ packet-riding stations |
| History | "Chronicle" — **spine timeline** + tape reel |
| Maintenance | "Service Bay" — interlocking **rotating gears** (`MaintGear`) + service line |
| Audits | "Census Deck" — **sweeping scanline over a muster matrix** (`AuditScanGrid`) + recon donut |
| Disposal | "Decommission Foundry" — **molten crucible** gauge (embers, heat-haze) |
| Categories | "Taxonomy Atlas" — **proportional classification spectrum** + fleet-share rings |
| Vendors | "Supply Constellation" — **orbital node map** w/ supply-inflow beams |
| Audit Logs | "Forensic Ledger" — **activity-pulse equalizer ribbon** (`LedgerPulseRibbon`, sweeping read-head) + **integrity seal** conic gauge + hash-stamped ledger rows w/ from→to morph + expand diff (distinct from Audits' muster matrix and History's black-box spine) |
| Dashboard | "Fleet Command Deck" — **concentric multi-ring Status Reactor** (`DashReactor`, nested status arcs + utilization core, hover-to-inspect) + **semicircular Health gauge** (`DashHealthGauge`, needle + condition zones + weighted score) + animated type-composition bars + module-launchpad deck (keeps the 3D `HangarHero`). Multi-ring reactor ≠ allocations' radar sweep / audits' single recon donut. |

Fresh ideas to mine from libraries (§ `21st-dev-libraries.md`): aurora/beams background, sonar ping grid, ticker odometer, bento mosaic, marquee ribbon, orbiting circles, depth parallax stack, waveform/equalizer, ismetric stack, flow-field particles.

## 5. Reusable components & helpers (import, don't rebuild)
- `components/AssetModal.vue` — teleported glass modal (aura + sheen edge).
- `components/AsSelect.vue` — the module's modern dropdown (teleported popover, dot/icon options).
- `components/AssetField.vue` — labeled input that delegates `type="select"` → AsSelect.
- `components/AssetCountUp.vue` — eased count-up, in-view gated.
- `components/AssetEmptyState.vue`, `AsStamp.vue` (status pills), `AssetStatusStamp` / `AssetTypeBadge`.
- `@/components/hr/forms/HrDatePicker.vue` — the calendar; `HrSelect.vue` for HR-scoped forms.
- Reusable instruments worth generalizing: `MaintGear.vue` (procedural cog), `AuditScanGrid.vue` (muster matrix), `AuditReconRing.vue` / `DisposalCrucible` (conic gauges), `VendorConstellation` (orbital map).
- `@/composables/useShiftMotion.js` → `prefersReduced()`, `useInView(elRef)`, `usePointerSpotlight(elRef)`, `seededWave()`.
- Workspace wiring: sections emit `@go` (`selectTab`, accepts `{tab, filter}`) + `@detail` (`openHistory(assetId)`); deep-link filters flow `selectTab {tab,filter}` → `:initial-filter` → `@consumed` one-shot.

## 6. Tokens (warm gold/amber brand)
Assets `--as-*` (see `src/styles/asset-theme.css`): `--as-canvas/dome`, `--as-surface[-elevated]`, `--as-panel`, `--as-border-soft/strong`, `--as-amber/-bright/-strong`, `--as-ember[-deep]`, `--as-steel[-dim/-dark/-hi]`, status `--as-st-{available|allocated|reserved|maintenance|retired}[-soft]`, condition `--as-cond-*`, `--as-grad-hero/-rail`, `--as-card-shadow[-hover]`, `--as-glass[-deep]`, `--as-spring`/`--as-ease`, `.as-mono`. HR uses `--hr-*` (`hr-theme.css`).
Semantics: **warm gold/amber = brand**, emerald = success, red = danger, steel/grey = neutral. **No blue/purple/indigo/teal accents.**

## 7. Gotchas (all learned the hard way)
- **`motion-v`** animates transform **shorthands** (`scaleX`, `y`, `scale`, `rotate`) — NOT `transform:'scaleX(0)'` strings. Import `{ Motion, AnimatePresence as Presence }` from `'motion-v'` (it's `AnimatePresence`, not `Presence`). Never import from bare `'motion'`.
- **`@property --p { syntax:'<angle>'; inherits:false; initial-value:0deg }`** is required for a conic-gradient angle to *transition* smoothly; declare it in any component whose ring tweens, and set `--p` inline on the owning element.
- **3D tilt + entrance conflict:** entrance transform on an OUTER shell, tilt transform on the INNER element — never both on one node (CSS `animation` fill / `motion-v` inline transform will fight `:hover`).
- **Teleported popovers** (AsSelect/HrDatePicker) sit above the modal (z 5000–5200 vs overlay ~1440) — good; if a popover lives inside a `v-click-outside` parent add `@mousedown.stop`.
- **lucide-vue-next** in this repo: some names differ — `FilePen` (not `FileEdit`), `FilterX` works as a named export even though no `filter-x.js` file, `ChartPie` (not `PieChart`). Verify with `ls node_modules/lucide-vue-next/dist/esm/icons/<kebab>.js` before importing exotic icons.
- **Light theme is not optional:** every hardcoded color needs a `[data-theme="light"]` path; prefer tokens so it's automatic. Test the toggle.
- **Reduced motion:** wrap every keyframe/loop in `@media (prefers-reduced-motion: reduce)`; `prefersReduced()` gates JS-driven motion.
- **Verify build:** `node ./node_modules/vite/bin/vite.js build --logLevel error` (no `lint`/`test` scripts exist). Backend is Vue-agnostic; most redesigns need **no backend change** — confirm before editing Python.
