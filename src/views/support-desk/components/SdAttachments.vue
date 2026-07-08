<template>
  <!-- ░ Ultra-modern attachment strip — image thumbnails preview inline, everything else
       becomes a typed file card. Used wherever a ticket message / comment carries files
       (customer replies from the portal land here too). Staggered motion-v entrance. -->
  <div class="sda" :class="{ compact }">
    <Motion
      as="a" v-for="(f, i) in files" :key="f.key" class="sda-card" :class="[f.kind, { img: f.isImage }]"
      :href="f.url" target="_blank" rel="noopener"
      :style="{ '--ac': f.color }"
      :initial="{ opacity: 0, y: 8, scale: 0.96 }"
      :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ duration: 0.34, delay: 0.03 * i, ease: [0.16, 1, 0.3, 1] }"
      :whileHover="{ y: -3 }" :whileTap="{ scale: 0.97 }"
      :title="`${f.name}${f.sizeLabel ? ' · ' + f.sizeLabel : ''}`"
    >
      <!-- image tile: real thumbnail + hover-reveal overlay -->
      <template v-if="f.isImage">
        <span class="sda-thumb" :style="{ backgroundImage: `url(${f.url})` }" aria-hidden="true" />
        <span class="sda-shade" aria-hidden="true" />
        <span class="sda-imeta">
          <span class="sda-iname">{{ f.name }}</span>
          <span v-if="f.sizeLabel" class="sda-isize sd-mono">{{ f.sizeLabel }}</span>
        </span>
        <span class="sda-view"><Maximize2 :size="13" /></span>
      </template>

      <!-- file card: typed glyph + name + size + open cue -->
      <template v-else>
        <span class="sda-glyph"><component :is="f.icon" :size="17" /></span>
        <span class="sda-meta">
          <span class="sda-name">{{ f.name }}</span>
          <span class="sda-sub"><span class="sda-ext sd-mono">{{ f.ext || 'FILE' }}</span><span v-if="f.sizeLabel" class="sda-size">{{ f.sizeLabel }}</span></span>
        </span>
        <span class="sda-dl"><Download :size="14" /></span>
      </template>
    </Motion>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Download, Maximize2, FileText, FileSpreadsheet, FileArchive, FileImage,
  FileCode2, FileVideo, FileAudio, File as FileIcon,
} from 'lucide-vue-next'
import { API_BASE } from '@/utils/api'

const props = defineProps({
  attachments: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
})

const IMG = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'heic']
const resolveUrl = (a) => {
  const u = (a && (a.url || a.file_url || a.path || a.href)) || ''
  return u.startsWith('http') || u.startsWith('data:') ? u : (u ? `${API_BASE}${u}` : '#')
}
const nameOf = (a, i) => a?.name || a?.filename || a?.title || (`Attachment ${i + 1}`)
const extOf = (name, url) => {
  const src = (name || url || '').split('?')[0]
  const m = src.match(/\.([a-z0-9]{1,6})$/i)
  return m ? m[1].toLowerCase() : ''
}
const sizeLabel = (a) => {
  const b = Number(a?.size ?? a?.bytes ?? a?.file_size)
  if (!b || Number.isNaN(b)) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${Math.round(b / 1024)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

// type → glyph + accent
const GLYPH = {
  pdf: { icon: FileText, color: 'var(--sd-danger)', kind: 'doc' },
  doc: { icon: FileText, color: 'var(--sd-st-progress)', kind: 'doc' }, docx: { icon: FileText, color: 'var(--sd-st-progress)', kind: 'doc' }, rtf: { icon: FileText, color: 'var(--sd-st-progress)', kind: 'doc' }, txt: { icon: FileText, color: 'var(--sd-text-muted)', kind: 'doc' },
  xls: { icon: FileSpreadsheet, color: 'var(--sd-success)', kind: 'sheet' }, xlsx: { icon: FileSpreadsheet, color: 'var(--sd-success)', kind: 'sheet' }, csv: { icon: FileSpreadsheet, color: 'var(--sd-success)', kind: 'sheet' },
  zip: { icon: FileArchive, color: 'var(--sd-amber-strong)', kind: 'zip' }, rar: { icon: FileArchive, color: 'var(--sd-amber-strong)', kind: 'zip' }, '7z': { icon: FileArchive, color: 'var(--sd-amber-strong)', kind: 'zip' },
  mp4: { icon: FileVideo, color: 'var(--sd-st-escalated)', kind: 'vid' }, mov: { icon: FileVideo, color: 'var(--sd-st-escalated)', kind: 'vid' }, webm: { icon: FileVideo, color: 'var(--sd-st-escalated)', kind: 'vid' },
  mp3: { icon: FileAudio, color: 'var(--sd-st-pending)', kind: 'aud' }, wav: { icon: FileAudio, color: 'var(--sd-st-pending)', kind: 'aud' },
  json: { icon: FileCode2, color: 'var(--sd-amber)', kind: 'code' }, log: { icon: FileCode2, color: 'var(--sd-amber)', kind: 'code' }, xml: { icon: FileCode2, color: 'var(--sd-amber)', kind: 'code' }, js: { icon: FileCode2, color: 'var(--sd-amber)', kind: 'code' },
}

const files = computed(() => (props.attachments || []).map((a, i) => {
  const url = resolveUrl(a)
  const name = nameOf(a, i)
  const ext = extOf(name, url)
  const mime = String(a?.content_type || a?.type || a?.mime || '')
  const isImage = mime.startsWith('image/') || IMG.includes(ext)
  const g = GLYPH[ext] || { icon: isImage ? FileImage : FileIcon, color: 'var(--sd-amber)', kind: 'gen' }
  return {
    key: a?.id || url + '#' + i,
    url, name, ext: ext.toUpperCase(), sizeLabel: sizeLabel(a),
    isImage, icon: g.icon, color: g.color, kind: g.kind,
  }
}))
</script>

<style scoped>
.sda { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 9px; }

/* ── shared card ── */
.sda-card { position: relative; display: inline-flex; align-items: center; gap: 9px; text-decoration: none; overflow: hidden;
  border-radius: 12px; border: 1px solid var(--sd-border); background: var(--sd-surface-glass);
  transition: border-color 0.2s var(--sd-spring), box-shadow 0.24s var(--sd-spring), background 0.2s; }
.sda-card:hover { border-color: color-mix(in srgb, var(--ac) 55%, transparent); box-shadow: 0 8px 20px color-mix(in srgb, var(--ac) 22%, transparent); background: var(--sd-surface); }

/* ── file card ── */
.sda-card:not(.img) { padding: 8px 12px 8px 9px; max-width: 240px; }
.sda-glyph { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0; color: var(--ac);
  background: color-mix(in srgb, var(--ac) 14%, transparent); border: 1px solid color-mix(in srgb, var(--ac) 26%, transparent); }
.sda-meta { display: flex; flex-direction: column; min-width: 0; }
.sda-name { font-size: 12px; font-weight: 650; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
.sda-sub { display: inline-flex; align-items: center; gap: 6px; margin-top: 2px; }
.sda-ext { font-size: 9px; font-weight: 800; letter-spacing: 0.06em; color: var(--ac); }
.sda-size { font-size: 10px; color: var(--sd-text-dim); }
.sda-dl { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; color: var(--sd-text-dim);
  background: var(--sd-surface); border: 1px solid var(--sd-border); transition: color 0.18s, transform 0.2s var(--sd-spring); }
.sda-card:not(.img):hover .sda-dl { color: var(--ac); transform: translateY(-1px); }

/* ── image tile ── */
.sda-card.img { width: 118px; height: 84px; padding: 0; border-color: var(--sd-border-strong); }
.sda-thumb { position: absolute; inset: 0; background-size: cover; background-position: center; transition: transform 0.5s var(--sd-spring); }
.sda-card.img:hover .sda-thumb { transform: scale(1.08); }
.sda-shade { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 38%, rgba(0,0,0,0.72)); }
.sda-imeta { position: absolute; left: 8px; right: 8px; bottom: 6px; display: flex; align-items: baseline; justify-content: space-between; gap: 6px; z-index: 1; }
.sda-iname { font-size: 10.5px; font-weight: 700; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
.sda-isize { font-size: 9px; color: rgba(255,255,255,0.82); flex-shrink: 0; }
.sda-view { position: absolute; top: 7px; right: 7px; z-index: 1; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px;
  color: #fff; background: rgba(12,12,14,0.5); backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.18);
  opacity: 0; transform: scale(0.8); transition: opacity 0.2s, transform 0.24s var(--sd-spring); }
.sda-card.img:hover .sda-view { opacity: 1; transform: scale(1); }

/* compact — tighter file cards for dense lists */
.sda.compact .sda-card:not(.img) { padding: 6px 10px 6px 7px; }
.sda.compact .sda-glyph { width: 28px; height: 28px; }
.sda.compact .sda-card.img { width: 96px; height: 70px; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sda-thumb { transition: none; }
}
</style>
