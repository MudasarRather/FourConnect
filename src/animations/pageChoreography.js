/*
 * Page-level master timelines for the project module.
 *
 * Each project page has its own motion personality — no shared vocabulary:
 *   - ProjectsPage          "Atlas Forge"        (kept from first pass; CTA + grid)
 *   - AssignTeamPage        "Forge Assignment"   (kept from first pass; table)
 *   - CreateProjectPage     "Civic Forge"        (kept from first pass; sections)
 *   - ProjectDetailsPage    "Blueprint Reveal"   (clip-stroke, ribbon-first milestones)
 *   - ProjectFinancialsPage "Ledger Flow"        (horizontal tab slide, shimmer ribbon)
 *   - ProjectNotesPage      "Paper Drop"         (alternating rotation, paper-curl)
 *   - ArchivedProjectsPage  "Vault Materialize"  (scanline + blur unblur, cold)
 *   - CompletedProjectsPage "Trophy Showcase"    (3D Y-rotation, gold gleam)
 *
 * Status colors across project pages have been unified to orange/amber/yellow.
 * Where semantic distinction is critical (Accept vs Decline icon buttons on
 * invite rows) the green/red action affordance is intentionally preserved.
 */
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Flip } from 'gsap/Flip'
import { prefersReducedMotion } from '../composables/useGsapAnim'

const EASE_PRIMARY = 'expo.out'
const EASE_BOUNCE = 'back.out(1.4)'
const EASE_POP = 'back.out(2)'
const EASE_SOFT = 'sine.inOut'

function q(root, selector) {
  if (!root) return []
  return Array.from(root.querySelectorAll(selector))
}
function qOne(root, selector) {
  return root ? root.querySelector(selector) : null
}

/* ============================================================
 * Splitters
 * ============================================================ */
function setupSplitWords(el) {
  if (!el || el.dataset.splitDone === '1') return
  const text = el.textContent || ''
  const words = text.split(/\s+/)
  el.innerHTML = words
    .map((w) => `<span class="word-mask" style="display:inline-block;overflow:hidden;vertical-align:bottom;line-height:1;"><span class="word-inner" style="display:inline-block;will-change:transform,opacity;">${w}</span></span>`)
    .join(' ')
  el.dataset.splitDone = '1'
}

function setupSplitChars(el) {
  if (!el || el.dataset.splitDone === '1') return
  const text = el.textContent || ''
  const chars = Array.from(text).map((c) => {
    if (c === ' ') return '<span class="char-space">&nbsp;</span>'
    return `<span class="char-inner" style="display:inline-block;will-change:transform,opacity;">${c}</span>`
  }).join('')
  el.innerHTML = chars
  el.dataset.splitDone = '1'
}

/* ============================================================
 * Generic helpers (Atlas/Forge/Civic shared)
 * ============================================================ */
function heroEntry(root, tl, at = 0.1) {
  const heroEyebrow = qOne(root, '[data-anim="hero-eyebrow"]')
  const heroTitle = qOne(root, '[data-anim="hero-title"]')
  const heroSubtitle = qOne(root, '[data-anim="hero-subtitle"]')
  const heroCta = qOne(root, '[data-anim="hero-cta"]')

  if (heroEyebrow) tl.from(heroEyebrow, { scale: 0.6, y: -10, opacity: 0, duration: 0.65, ease: EASE_POP }, at)
  if (heroTitle) {
    setupSplitWords(heroTitle)
    const words = heroTitle.querySelectorAll('.word-inner')
    tl.from(words, { yPercent: 120, opacity: 0, duration: 0.75, ease: EASE_PRIMARY, stagger: 0.06 }, at + 0.08)
  }
  if (heroSubtitle) tl.from(heroSubtitle, { y: 20, opacity: 0, duration: 0.7, ease: EASE_PRIMARY }, at + 0.22)
  if (heroCta) tl.from(heroCta, { x: 40, opacity: 0, duration: 0.65, ease: EASE_PRIMARY }, at + 0.3)
}

function backdropEntry(root, tl) {
  const orbs = q(root, '[data-orb], .atlas-orb, .forge-orb, .atp-orb')
  if (orbs.length) {
    tl.from(orbs, { scale: 0.5, opacity: 0, duration: 1.4, ease: EASE_PRIMARY, stagger: 0.15 }, 0)
  }
  const baseLayer = qOne(root, '[data-anim="backdrop"]')
  if (baseLayer) tl.from(baseLayer, { opacity: 0, duration: 0.7, ease: 'sine.out' }, 0)
}

function statsEntry(root, tl) {
  const tiles = q(root, '[data-anim="stat-tile"]')
  if (!tiles.length) return
  tl.from(tiles, {
    scale: 0.92, opacity: 0, y: 16, filter: 'blur(8px)',
    duration: 0.75, ease: EASE_PRIMARY, stagger: 0.08,
    clearProps: 'filter'
  }, 0.5)
}

function commandBarEntry(root, tl, at = 0.8) {
  const bar = qOne(root, '[data-anim="command-bar"]')
  if (!bar) return
  tl.from(bar, { y: 20, opacity: 0, duration: 0.7, ease: EASE_PRIMARY }, at)
}

function gridBatchReveal(selector, options = {}) {
  if (prefersReducedMotion()) {
    document.querySelectorAll(selector).forEach((el) => { el.style.opacity = '1' })
    return
  }
  ScrollTrigger.batch(selector, {
    once: true,
    start: 'top 92%',
    onEnter: (batch) => {
      gsap.from(batch, {
        y: options.y ?? 32,
        opacity: 0,
        scale: options.scale ?? 1,
        duration: options.duration ?? 0.7,
        ease: EASE_PRIMARY,
        stagger: options.stagger ?? 0.07,
        clearProps: 'transform'
      })
    }
  })
}

/* ============================================================
 * 1. ProjectsPage — kept (Atlas)
 * ============================================================ */
export function projectsPageEntry(root) {
  if (!root) return null
  const tl = gsap.timeline()
  backdropEntry(root, tl)
  heroEntry(root, tl)
  statsEntry(root, tl)
  commandBarEntry(root, tl, 0.85)
  setTimeout(() => gridBatchReveal('[data-anim="project-card"]', { stagger: 0.06, y: 30 }), 0)
  return tl
}

/* ============================================================
 * 2. AssignTeamPage — kept (Forge)
 * ============================================================ */
export function assignTeamEntry(root) {
  if (!root) return null
  const tl = gsap.timeline()
  backdropEntry(root, tl)
  heroEntry(root, tl)
  statsEntry(root, tl)
  const filterBar = qOne(root, '[data-anim="filter-bar"]')
  if (filterBar) tl.from(filterBar, { y: 18, opacity: 0, duration: 0.6, ease: EASE_PRIMARY }, 0.75)
  const tableShell = qOne(root, '[data-anim="table"]')
  if (tableShell) tl.from(tableShell, { y: 24, opacity: 0, duration: 0.7, ease: EASE_PRIMARY }, 0.9)
  setTimeout(() => gridBatchReveal('[data-anim="row"]', { stagger: 0.035, y: 14, duration: 0.55 }), 0)
  return tl
}

/* ============================================================
 * 3. CreateProjectPage — kept (Civic)
 * ============================================================ */
export function createProjectEntry(root) {
  if (!root) return null
  const tl = gsap.timeline()
  backdropEntry(root, tl)
  heroEntry(root, tl)
  const orderNotice = qOne(root, '[data-anim="order-notice"]')
  if (orderNotice) tl.from(orderNotice, { y: -20, opacity: 0, duration: 0.65, ease: EASE_PRIMARY }, 0.15)
  const sections = q(root, '[data-anim="section"]')
  if (sections.length) {
    sections.forEach((s, i) => {
      if (i < 2) {
        tl.from(s, { x: -40, opacity: 0, scale: 0.98, duration: 0.75, ease: EASE_PRIMARY, clearProps: 'transform' }, 0.5 + i * 0.12)
      } else if (!prefersReducedMotion()) {
        gsap.from(s, {
          scrollTrigger: { trigger: s, start: 'top 82%', once: true },
          x: -40, opacity: 0, scale: 0.98, duration: 0.7, ease: EASE_PRIMARY, clearProps: 'transform'
        })
      }
    })
  }
  const previewCard = qOne(root, '[data-anim="preview-card"]')
  if (previewCard) tl.from(previewCard, { x: 60, opacity: 0, scale: 0.95, duration: 0.85, ease: EASE_PRIMARY }, 0.55)

  if (!prefersReducedMotion()) {
    const orb1 = qOne(root, '[data-orb="1"], .forge-orb-1')
    const orb2 = qOne(root, '[data-orb="2"], .forge-orb-2')
    if (orb1) gsap.to(orb1, { xPercent: -8, yPercent: 8, scale: 1.06, duration: 12, ease: EASE_SOFT, yoyo: true, repeat: -1 })
    if (orb2) gsap.to(orb2, { xPercent: 10, yPercent: -7, scale: 1.05, duration: 14, ease: EASE_SOFT, yoyo: true, repeat: -1 })
  }
  return tl
}

/* ============================================================
 * 4. ProjectDetailsPage — "Blueprint Reveal"
 * ============================================================ */
export function projectDetailsEntry(root) {
  if (!root) return null
  const reduced = prefersReducedMotion()
  const tl = gsap.timeline()

  // Breadcrumb slides in from left
  const breadcrumb = qOne(root, '[data-anim="breadcrumb"]')
  if (breadcrumb) tl.from(breadcrumb, { x: -30, opacity: 0, duration: 0.55, ease: EASE_PRIMARY }, 0)

  // Header icon: clip-path line reveals from left-to-right, then scales up
  const headerIcon = qOne(root, '[data-anim="header-icon"]')
  if (headerIcon) {
    tl.fromTo(headerIcon,
      { clipPath: 'inset(0 100% 0 0)', opacity: 0, scale: 0.6 },
      { clipPath: 'inset(0 0% 0 0)', opacity: 1, scale: 1, duration: 0.65, ease: EASE_PRIMARY },
      0.1
    )
  }

  // Title — word reveal with orange underline that draws under each word
  const heroTitle = qOne(root, '[data-anim="hero-title"]')
  if (heroTitle) {
    setupSplitWords(heroTitle)
    const words = heroTitle.querySelectorAll('.word-inner')
    tl.from(words, { yPercent: 120, opacity: 0, duration: 0.75, stagger: 0.07, ease: EASE_PRIMARY }, 0.2)
    // Per-word underline stroke
    if (!reduced) {
      words.forEach((w, i) => {
        const underline = document.createElement('span')
        underline.className = 'bp-underline'
        underline.style.cssText = 'display:block;height:1px;background:linear-gradient(90deg,transparent,#f97316,transparent);transform-origin:left center;transform:scaleX(0);margin-top:2px;'
        w.parentNode.appendChild(underline)
        gsap.to(underline, { scaleX: 1, duration: 0.45, ease: EASE_PRIMARY, delay: 0.2 + (i * 0.07) + 0.5 })
      })
    }
  }

  // Status badge — clip-path inset reveal
  const statusBadge = qOne(root, '[data-anim="status-badge"]')
  if (statusBadge) {
    tl.fromTo(statusBadge,
      { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
      { clipPath: 'inset(0 0% 0 0)', opacity: 1, duration: 0.55, ease: EASE_PRIMARY },
      0.45
    )
  }

  // Completed watermark — dramatic stamp from top
  const watermark = qOne(root, '[data-anim="watermark"]')
  if (watermark) {
    tl.from(watermark, {
      scale: 2.4, rotation: 8, opacity: 0,
      duration: 0.9, ease: 'back.out(1.2)'
    }, 0.55)
  }

  // Sidebar cards — diagonal blueprint stroke (top-down clip reveal)
  setTimeout(() => {
    const cards = Array.from(root.querySelectorAll('[data-anim="detail-card"]'))
    if (cards.length && !reduced) {
      cards.forEach((card, i) => {
        ScrollTrigger.create({
          trigger: card,
          start: 'top 92%',
          once: true,
          onEnter: () => {
            gsap.fromTo(card,
              { clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)', opacity: 0, x: 24 },
              {
                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                opacity: 1, x: 0,
                duration: 0.85, ease: EASE_PRIMARY, delay: i * 0.06,
                clearProps: 'clipPath,transform'
              }
            )
          }
        })
      })
    } else if (cards.length) {
      gsap.set(cards, { opacity: 1 })
    }

    // Milestone rows — ribbon scales first, then content fades
    const milestones = Array.from(root.querySelectorAll('[data-anim="milestone"]'))
    if (milestones.length && !reduced) {
      ScrollTrigger.batch(milestones, {
        once: true,
        start: 'top 92%',
        onEnter: (batch) => {
          batch.forEach((row, i) => {
            // Inject ribbon if missing
            if (!row.querySelector('.bp-ribbon')) {
              const ribbon = document.createElement('span')
              ribbon.className = 'bp-ribbon'
              ribbon.style.cssText = 'position:absolute;left:0;top:8px;bottom:8px;width:2px;background:linear-gradient(180deg,#f59e0b,#f97316);transform-origin:top center;border-radius:2px;'
              row.style.position = row.style.position || 'relative'
              row.appendChild(ribbon)
            }
            const ribbon = row.querySelector('.bp-ribbon')
            const tlRow = gsap.timeline({ delay: i * 0.04 })
            tlRow.fromTo(ribbon,
              { scaleY: 0, opacity: 0 },
              { scaleY: 1, opacity: 1, duration: 0.4, ease: EASE_PRIMARY }
            )
            tlRow.from(row, { y: 12, opacity: 0, duration: 0.5, ease: EASE_PRIMARY }, '-=0.25')
          })
        }
      })
    } else if (milestones.length) {
      gsap.set(milestones, { opacity: 1 })
    }

    // Budget bar — draw width 0 → target
    const bar = root.querySelector('[data-anim="budget-bar"]')
    if (bar && !reduced) {
      const target = bar.dataset.fill || bar.style.width || '0%'
      gsap.fromTo(bar, { width: '0%' }, { width: target, duration: 1.2, ease: EASE_PRIMARY, delay: 0.4 })
    }
  }, 0)

  return tl
}

/* ============================================================
 * 5. ProjectFinancialsPage — "Ledger Flow"
 * ============================================================ */
export function projectFinancialsEntry(root) {
  if (!root) return null
  const reduced = prefersReducedMotion()
  const tl = gsap.timeline()

  // Header — project icon pops, identity slides from left
  const header = qOne(root, '[data-anim="page-header"]')
  if (header) {
    const iconBox = header.querySelector('.project-icon-box')
    const text    = header.querySelector('.identity-text')
    if (iconBox) tl.from(iconBox, { scale: 0.55, opacity: 0, duration: 0.65, ease: 'back.out(2)' }, 0)
    if (text)    tl.from(text,    { x: -28, opacity: 0, duration: 0.6, ease: EASE_PRIMARY }, 0.1)
    else         tl.from(header,  { y: 18, opacity: 0, duration: 0.6, ease: EASE_PRIMARY }, 0)
  }

  // Tabs dock — each tab slides in left-to-right
  const tabs = qOne(root, '[data-anim="tabs-dock"]')
  if (tabs) {
    const items = tabs.querySelectorAll('.dock-item')
    if (items.length) {
      tl.from(items, { x: -24, opacity: 0, duration: 0.55, ease: 'power3.out', stagger: 0.05 }, 0.22)
    } else {
      tl.from(tabs, { y: 14, opacity: 0, duration: 0.55, ease: EASE_PRIMARY }, 0.22)
    }
  }

  // Canvas — horizontal slide in from right
  const canvas = qOne(root, '[data-anim="tab-canvas"]')
  if (canvas) {
    tl.fromTo(canvas,
      { x: 30, opacity: 0, filter: 'blur(6px)' },
      { x: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7, ease: EASE_PRIMARY, clearProps: 'filter' },
      0.35
    )
  }

  // Mini-metric bar shimmer — looping subtle shimmer to suggest money flow
  if (!reduced) {
    setTimeout(() => {
      const bar = root.querySelector('.bar-fill')
      if (bar && !bar.dataset.shimmerOn) {
        bar.dataset.shimmerOn = '1'
        bar.classList.add('ledger-shimmer')
      }
    }, 600)
  }

  return tl
}

/* ============================================================
 * 6. ProjectNotesPage — "Paper Drop"
 * ============================================================ */
export function projectNotesEntry(root) {
  if (!root) return null
  const reduced = prefersReducedMotion()
  const tl = gsap.timeline()

  const header = qOne(root, '[data-anim="page-header"]')
  if (header) tl.from(header, { y: 14, opacity: 0, duration: 0.5, ease: EASE_PRIMARY }, 0)

  const tabs = qOne(root, '[data-anim="tabs-dock"]')
  if (tabs) {
    const items = tabs.querySelectorAll('.dock-item')
    if (items.length) {
      tl.from(items, { y: 10, opacity: 0, duration: 0.45, ease: EASE_PRIMARY, stagger: 0.04 }, 0.18)
    } else {
      tl.from(tabs, { y: 12, opacity: 0, duration: 0.5, ease: EASE_PRIMARY }, 0.18)
    }
    // Active-glow underline animation handled in CSS now (no position-jitter)
  }

  const toolbar = qOne(root, '[data-anim="toolbar"]')
  if (toolbar) {
    const search = toolbar.querySelector('.search-input')
    if (search) tl.fromTo(search, { width: '60%', opacity: 0 }, { width: '100%', opacity: 1, duration: 0.5, ease: EASE_PRIMARY, clearProps: 'width' }, 0.3)
    else tl.from(toolbar, { y: 12, opacity: 0, duration: 0.5, ease: EASE_PRIMARY }, 0.3)
  }

  // Note cards — alternating rotation drop
  setTimeout(() => {
    const cards = Array.from(root.querySelectorAll('[data-anim="note-card"]'))
    if (!cards.length) return
    if (reduced) {
      gsap.set(cards, { opacity: 1 })
      return
    }
    ScrollTrigger.batch(cards, {
      once: true,
      start: 'top 92%',
      onEnter: (batch) => {
        gsap.from(batch, {
          y: -22,
          rotation: (i) => (i % 2 === 0 ? -3.5 : 3.5),
          scale: 0.92,
          opacity: 0,
          duration: 0.65,
          ease: 'back.out(1.3)',
          stagger: 0.07,
          clearProps: 'transform'
        })
      }
    })
  }, 0)

  return tl
}

/* ============================================================
 * 7. ArchivedProjectsPage — "Vault Materialize"
 * ============================================================ */
export function archivedProjectsEntry(root) {
  if (!root) return null
  const reduced = prefersReducedMotion()
  const tl = gsap.timeline()

  // Header — blur unblur. No motion.
  const header = qOne(root, '[data-anim="page-header"]')
  if (header) {
    tl.fromTo(header,
      { filter: 'blur(10px)', opacity: 0 },
      { filter: 'blur(0px)', opacity: 1, duration: 0.9, ease: EASE_SOFT, clearProps: 'filter' },
      0
    )
  }

  const filterBar = qOne(root, '[data-anim="filter-bar"]')
  if (filterBar) tl.from(filterBar, { opacity: 0, duration: 0.55, ease: 'sine.out' }, 0.2)

  const tableShell = qOne(root, '[data-anim="table"]')
  if (tableShell) {
    tl.fromTo(tableShell,
      { filter: 'blur(8px)', opacity: 0 },
      { filter: 'blur(0px)', opacity: 1, duration: 0.85, ease: EASE_SOFT, clearProps: 'filter' },
      0.35
    )
  }

  // Rows — scanline materialize (clip from middle horizontal line)
  setTimeout(() => {
    const rows = Array.from(root.querySelectorAll('[data-anim="archive-row"]'))
    if (!rows.length) return
    if (reduced) { gsap.set(rows, { opacity: 1 }); return }
    ScrollTrigger.batch(rows, {
      once: true,
      start: 'top 95%',
      onEnter: (batch) => {
        gsap.fromTo(batch,
          {
            clipPath: 'polygon(0 50%, 100% 50%, 100% 50%, 0 50%)',
            opacity: 0
          },
          {
            clipPath: 'polygon(0 0%, 100% 0%, 100% 100%, 0 100%)',
            opacity: 1,
            duration: 0.55,
            ease: 'power2.out',
            stagger: 0.04,
            clearProps: 'clipPath'
          }
        )
      }
    })
  }, 0)

  return tl
}

/* ============================================================
 * 8. CompletedProjectsPage — "Trophy Showcase"
 * ============================================================ */
export function completedProjectsEntry(root) {
  if (!root) return null
  const reduced = prefersReducedMotion()
  const tl = gsap.timeline()

  // Header title typed in character by character (capped at 60 chars)
  const header = qOne(root, '[data-anim="page-header"]')
  if (header) {
    const titleEl = header.querySelector('h1')
    if (titleEl && (titleEl.textContent || '').length <= 60) {
      setupSplitChars(titleEl)
      const chars = titleEl.querySelectorAll('.char-inner')
      tl.from(chars, { y: 10, opacity: 0, duration: 0.5, ease: EASE_PRIMARY, stagger: 0.025 }, 0)
    } else {
      tl.from(header, { y: 14, opacity: 0, duration: 0.6, ease: EASE_PRIMARY }, 0)
    }
  }

  const filterBar = qOne(root, '[data-anim="filter-bar"]')
  if (filterBar) {
    tl.from(filterBar, { y: 12, opacity: 0, duration: 0.55, ease: EASE_PRIMARY }, 0.3)
    // Stats pill gleam — single sweep on entry
    if (!reduced) {
      const pill = filterBar.querySelector('.stats-pill')
      if (pill && !pill.dataset.gleamed) {
        pill.dataset.gleamed = '1'
        pill.classList.add('trophy-gleam')
        setTimeout(() => pill.classList.remove('trophy-gleam'), 900)
      }
    }
  }

  // Cards — 3D Y-rotation flip in
  setTimeout(() => {
    const cards = Array.from(root.querySelectorAll('[data-anim="completed-card"]'))
    if (!cards.length) return
    if (reduced) { gsap.set(cards, { opacity: 1 }); return }
    ScrollTrigger.batch(cards, {
      once: true,
      start: 'top 92%',
      onEnter: (batch) => {
        gsap.from(batch, {
          rotationY: -25,
          scale: 0.85,
          opacity: 0,
          transformPerspective: 900,
          transformOrigin: 'left center',
          duration: 0.8,
          ease: EASE_PRIMARY,
          stagger: 0.08,
          clearProps: 'transform,rotationY,scale'
        })
      }
    })

    // Status pill (100%) infinite glow pulse
    const pills = root.querySelectorAll('.status-pill-compact.success-glass')
    pills.forEach((pill) => {
      gsap.to(pill, {
        boxShadow: '0 0 20px rgba(245, 158, 11, 0.55)',
        duration: 1.6,
        ease: EASE_SOFT,
        yoyo: true,
        repeat: -1
      })
    })
  }, 0)

  return tl
}

/* === Helpers exported for page use === */

export function flipTabPill(state, options = {}) {
  if (prefersReducedMotion()) return
  Flip.from(state, {
    duration: options.duration ?? 0.45,
    ease: options.ease ?? EASE_PRIMARY,
    absolute: true
  })
}

export function focusGlow(el, color = 'rgba(245,158,11,0.22)') {
  if (!el || prefersReducedMotion()) return
  gsap.to(el, { boxShadow: `0 0 0 4px ${color}`, duration: 0.25, ease: 'power2.out' })
}
export function blurGlow(el) {
  if (!el) return
  gsap.to(el, { boxShadow: '0 0 0 0px rgba(245,158,11,0)', duration: 0.25, ease: 'power2.out' })
}

export function errorShake(el) {
  if (!el || prefersReducedMotion()) return
  gsap.fromTo(el, { x: 0 }, { x: -6, duration: 0.06, repeat: 5, yoyo: true, clearProps: 'x' })
}

export function pulseScale(el, options = {}) {
  if (!el || prefersReducedMotion()) return
  gsap.fromTo(el,
    { scale: 1 },
    { scale: options.scale ?? 1.015, duration: options.duration ?? 0.18, yoyo: true, repeat: 1, ease: EASE_SOFT }
  )
}

export function modalOpen(backdropEl, contentEl, fromRect = null) {
  const tl = gsap.timeline()
  if (backdropEl) {
    tl.fromTo(backdropEl,
      { opacity: 0, backdropFilter: 'blur(0px)' },
      { opacity: 1, backdropFilter: 'blur(14px)', duration: 0.4, ease: 'sine.out' },
      0
    )
  }
  if (contentEl) {
    if (fromRect) {
      const state = Flip.getState(contentEl)
      gsap.set(contentEl, { x: 0, y: 0, scale: 1, opacity: 1 })
      Flip.from(state, { duration: 0.6, ease: EASE_BOUNCE })
    } else {
      tl.fromTo(contentEl,
        { scale: 0.88, y: 28, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.55, ease: EASE_BOUNCE },
        0.05
      )
    }
  }
  return tl
}

export function modalClose(backdropEl, contentEl) {
  const tl = gsap.timeline()
  if (contentEl) {
    tl.to(contentEl, { scale: 0.92, y: 16, opacity: 0, duration: 0.28, ease: 'power2.in' }, 0)
  }
  if (backdropEl) {
    tl.to(backdropEl, { opacity: 0, backdropFilter: 'blur(0px)', duration: 0.3, ease: 'sine.in' }, 0.05)
  }
  return tl
}
