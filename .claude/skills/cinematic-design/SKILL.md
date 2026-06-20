---
name: cinematic-design
description: Ultra-modern, cinematic ("blender-level") UI design for this Vue 3 app — hero consoles, animated signature instruments, tilt/spotlight cards, redesigned modals, dark+light themes. Use whenever a task asks for "ultra modern", "cinematic", "blender-level", "highly animated", "unique/not repetitive" design, a page/section/modal redesign, or design inspiration/component ideas. Bundles a curated index of 21st.dev (+ Aceternity UI, Magic UI, shadcn) component libraries — React/Tailwind references to ADAPT into Vue + motion-v, never to npx-install — plus this repo's proven design-system tokens and patterns.
---

# Cinematic Design

Design playbook for producing **ultra-modern, cinematic, component-level-animated** UI in this repo, plus a curated index of external component libraries (led by **21st.dev**) to mine for inspiration.

## ⚠️ Read this first — the stack reality

This project is **Vue 3 (`<script setup>`) + Vite + `motion-v`**, with feature-scoped CSS-variable design systems (`--as-*` for Assets, `--hr-*` for HR). The big external libraries indexed here (21st.dev, Aceternity UI, Magic UI, shadcn/ui) are **React + Tailwind + Radix + Framer Motion**.

So they are **inspiration and reference, NOT drop-in dependencies**:

- **NEVER run `npx shadcn@latest add "https://21st.dev/r/..."`** in this repo — it pulls React/Tailwind files that don't belong here and will break the build.
- **Translate, don't import.** Read a 21st.dev/Aceternity/Magic UI component for the *idea* (layout, motion, the "wow" mechanic), then re-implement it as a Vue SFC using this repo's stack:
  - Framer Motion `motion.div` → `<Motion>` from `motion-v` (shorthands like `scaleX`/`y`/`scale`, not `transform:'...'` strings).
  - Tailwind classes → scoped CSS with the project's `--as-*` / `--hr-*` tokens (warm gold/amber brand; emerald=success, red=danger, steel=neutral).
  - Radix primitives (Dialog, Select, Popover) → the existing `AssetModal` / `AsSelect` / `HrDatePicker` / teleported-popover patterns.
  - 3D / shaders → the already-installed `three` + `@tresjs/core`, or pure CSS/conic-gradient/`@property` instruments.

If the user explicitly wants to *use* a React library directly, stop and confirm — that's a stack change, not a design task.

## When to use

Trigger on: "ultra modern", "cinematic", "blender-level / top-tier (Apple/Tesla/NASA) animation", "highly animated", "make it unique / not repetitive", any **page / section / modal / dropdown / calendar redesign**, or a request for **design ideas / component inspiration**.

## Workflow (how the asset-module redesigns were done — repeat it)

1. **Map the data + workflow first.** Read the section's `.vue`, its `useAssets`/composable fetchers, and the backend router/model/schema. Know every status, transition, and field before designing. List workflow **loopholes** (missing actions, fields the backend supports but the UI ignores, missing cross-links) — closing these is part of the deliverable.
2. **Pick a UNIQUE signature metaphor** that doesn't repeat sibling pages. Each asset tab owns one (see `references/patterns.md`): radar (allocations), re-entry horizon (returns), conveyor relay (transfers), chronicle spine (history), service-bay gears (maintenance), scanline muster matrix (audits), molten crucible (disposal), classification spectrum (categories). Don't reuse a sibling's motif.
3. **Mine the libraries** (`references/21st-dev-libraries.md`) for the relevant category (hero, card, gauge, dialog, background, text effect…) and adapt the strongest idea.
4. **Build the standard composition:**
   - a **Console hero** (eyebrow + gradient-accent title + sub + CTAs + clickable **telemetry lenses** + a **signature animated instrument**),
   - **cinematic cards** (status spine, conic/gauge ring, inline stepper, 3D pointer-tilt + spotlight glare, `as-deal` entrance),
   - a **redesigned modal** (live preview + segmented selectors + `AsSelect` dropdowns + `HrDatePicker` calendar), and where it helps, a **detail drawer**.
5. **Theme + a11y both:** every color via tokens with `[data-theme="light"]` correctness; guard every animation with `@media (prefers-reduced-motion: reduce)`.
6. **Wire connectivity:** `@go`/`@detail` cross-links between sibling sections; deep-link filters through the workspace.
7. **Verify:** `node ./node_modules/vite/bin/vite.js build --logLevel error` must be clean. Confirm icon names exist in this `lucide-vue-next` build (some differ, e.g. `FilePen` not `FileEdit`).

## Reference files

- **`references/21st-dev-libraries.md`** — the curated component-library index: 21st.dev categories + the libraries it aggregates (Aceternity UI, Magic UI, shadcn/ui, etc.), with URLs and what each is good for. Read this when looking for a pattern.
- **`references/patterns.md`** — this repo's proven cinematic building blocks (Console hero, signature instruments, tilt cards, modal recipe, the per-tab metaphor ledger, token cheatsheet, motion-v gotchas). Read this to stay consistent and avoid repeating motifs.

Keep both files current: when a new redesign lands or a new useful library/component is found, append it.
