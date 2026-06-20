# Component Library Index — 21st.dev & friends

Curated catalog of external UI/animation component libraries to mine for **inspiration**.
All are **React + Tailwind + Framer Motion**. In this Vue repo: **read for ideas, re-implement as Vue SFCs with `motion-v` + `--as-*`/`--hr-*` tokens. Do NOT `npx shadcn add` them.** (See SKILL.md.)

---

## 21st.dev — primary source

**"npm for design engineers": the largest marketplace of shadcn/ui-based React + Tailwind components, blocks and hooks.** Community-published, browseable by category, library/author scope, and theme.

- Home / browse: https://21st.dev
- Community components (all categories): https://21st.dev/community/components
- GitHub (open source): https://github.com/serafimcloud/21st  · org: https://github.com/21st-dev
- Browse rails: **Featured · Newest · Best of the Week · Themes · Top Authors**
- Install pattern (React projects only): `npx shadcn@latest add "https://21st.dev/r/<author>/<component>"` — creates the component + deps, extends the Tailwind theme, adds global styles. **Not for this Vue repo — translate instead.**
- **Magic MCP** + **Component Libraries**: agents can install on-demand from a scoped library (publish from terminal, agent pulls UI when needed). Relevant only in a React/agent context.

### Categories to mine

**Marketing blocks** (great for hero/console design):
Announcements · Backgrounds · Borders · Calls to Action · Clients · Comparisons · Docks · Features · Footers · **Heroes** · Hooks · Images · Maps · Navigation Menus · Pricing Sections · Scroll Areas · **Shaders** · Testimonials · **Texts** (text effects) · Videos

**UI components** (great for cards/controls/modals):
Accordions · AI Chats · Alerts · Avatars · Badges · **Buttons** (~130) · **Calendars** · **Cards** · Carousels · Checkboxes · **Date Pickers** · **Dialogs/Modals** · **Dropdowns** · **Empty States** · File Trees · File Uploads · Forms · Icons · **Inputs** (~100) · Links · Menus · Notifications · **Numbers** (count-ups/odometers) · Paginations · **Popovers** · Radio Groups · **Selects** · Sidebars · Sign Ins · Sign Ups · Sliders · **Spinner Loaders** · **Tables** · **Tabs** · Tags · Text Areas · **Toasts** · **Toggles** · **Tooltips**

### Mapping 21st categories → this repo's components
| Need | 21st category to study | Re-implement with |
|---|---|---|
| Hero / section header | Heroes, Backgrounds, Shaders, Texts | a `*Console.vue` (lenses + signature instrument) |
| Stat / KPI chip | Numbers, Cards, Badges | telemetry **lens** + `AssetCountUp` |
| Entity card | Cards | `*Card.vue` w/ status spine + ring + 3D tilt (`usePointerSpotlight`) |
| Dropdown / select | Dropdowns, Selects, Popovers | `AsSelect.vue` (teleported, animated) |
| Date input | Date Pickers, Calendars | `HrDatePicker.vue` (the onboarding calendar) |
| Modal / wizard | Dialogs/Modals, Forms | `AssetModal.vue` + live-preview body |
| Side panel | Sidebars, Scroll Areas | a teleported slide-in drawer (e.g. `CategoryDetailDrawer.vue`) |
| Empty state | Empty States | `AssetEmptyState.vue` |
| Ambient background | Backgrounds, Shaders | CSS grain/blueprint/aura utilities or `@tresjs/core` |
| Text reveal/gradient | Texts | CSS gradient-clip title + `motion-v` stagger / `v-reveal` |

---

## Libraries 21st.dev aggregates (study directly)

- **shadcn/ui** — https://ui.shadcn.com — the base primitives most components extend (Dialog, Select, Popover, Tabs…). Maps to our `AssetModal`/`AsSelect`/teleported popovers.
- **Aceternity UI** — https://ui.aceternity.com — high-impact "wow" motion: spotlight cards, aurora/beams backgrounds, 3D card tilt, animated grids, sparkles, meteors, moving borders. Best source for **signature instruments & ambient backgrounds**.
- **Magic UI** — https://magicui.design — 150+ animated components: marquees, animated beams/lists, number tickers, shimmer/border-beam, particles, orbiting circles, bento grids. Best for **micro-interactions & count-ups** (compare to `AssetCountUp`).
- **bundui / Shadcn UI Kit** — https://21st.dev/community/bundui — Fusion of shadcn + Magic UI dashboard blocks.
- **Agent Elements** — agent UI primitives (React 19 + Tailwind v4 + Vercel AI SDK) — only relevant if building AI-chat UI.
- **awesome-shadcn-ui** (curated meta-list): https://github.com/birobirobiro/awesome-shadcn-ui · https://github.com/bytefer/awesome-shadcn-ui

## Other strong inspiration sources (not on 21st.dev)
- **Motion (Framer Motion docs)** — https://motion.dev — the canonical motion vocabulary; our `motion-v` mirrors its API.
- **Cult UI** / **Animata** / **Hover.dev** — additional animated-component galleries (React/Tailwind).
- **Dribbble / Mobbin** — for full-page cinematic dashboard references (the kind attached in design requests).

---

## How to use a found component (recipe)
1. Open the component on 21st.dev (or the source library) and read its JSX + motion config.
2. Extract: the **layout skeleton**, the **motion mechanic** (what animates, easing, stagger), and the **"wow" detail** (gradient, ring, beam, tilt).
3. Re-author as a Vue SFC: `<Motion>` for entrance/hover/tap, scoped CSS with `--as-*`/`--hr-*` tokens, teleport popovers, `@media (prefers-reduced-motion)` guard, `[data-theme="light"]` overrides.
4. Never copy Tailwind class strings or `npx`-install. Credit-worthy ideas only.

_Source: 21st.dev community registry (serafimcloud/21st), Aceternity UI, Magic UI, shadcn/ui — verified June 2026._
