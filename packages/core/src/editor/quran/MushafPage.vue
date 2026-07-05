<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { mushafSvgUrl } from "@qirtaas/core/services/quran";
import type { PageWord } from "./useQuranSelection";

const props = defineProps<{
  page: number;
  rangeLo: number | null;
  rangeHi: number | null;
  startIdx: number | null;
  endIdx: number | null;
}>();

const emit = defineEmits<{
  wordTap: [globalIdx: number];
  pageLoaded: [words: PageWord[]];
}>();

const container = ref<HTMLDivElement | null>(null);
const loading = ref(false);
const error = ref(false);
const svgCache = new Map<number, string>();
let currentSvgEl: SVGSVGElement | null = null;
let words: PageWord[] = [];
// Indexed map from global word index → its <g> element, for fast highlight updates.
let wordEls: (SVGGElement | null)[] = [];
// Cached per-word bbox in SVG user units, used for coordinate-based hit testing
// in onClick. We don't mutate the SVG to enlarge tap targets — the click handler
// does the inflation by checking distance to each cached bbox.
let wordBboxes: ({ x: number; y: number; w: number; h: number } | null)[] = [];
let overlayEl: SVGGElement | null = null;
// Tap-target padding in SVG user units. Page is ~382 wide → ~460 CSS px,
// so 1 unit ≈ 1.2 CSS px. Words are ~15–25 units apart, lines ~30+ units.
const TAP_PAD_X = 5;
const TAP_PAD_Y = 12;

async function loadPage(page: number) {
  loading.value = true;
  error.value = false;
  try {
    let svgText = svgCache.get(page);
    if (!svgText) {
      const res = await fetch(mushafSvgUrl(page));
      if (!res.ok) throw new Error(`svg ${page} ${res.status}`);
      svgText = await res.text();
      svgCache.set(page, svgText);
    }
    inject(svgText);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

function inject(svgText: string) {
  if (!container.value) return;
  container.value.innerHTML = svgText;
  const svg = container.value.querySelector("svg") as SVGSVGElement | null;
  if (!svg) {
    error.value = true;
    return;
  }
  currentSvgEl = svg;
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  svg.style.width = "100%";
  svg.style.height = "auto";
  svg.style.display = "block";

  // Build the flat word list + element map.
  const groups = Array.from(
    svg.querySelectorAll<SVGGElement>('g[id^="md-word-"]')
  );
  words = [];
  wordEls = [];
  const byAyahCount: Map<string, number> = new Map();
  for (const g of groups) {
    const s = Number(g.getAttribute("data-surah"));
    const a = Number(g.getAttribute("data-aya"));
    const wRaw = g.getAttribute("data-word-index-in-ayah");
    if (!s || !a || wRaw == null) continue;
    const wordIdxInAyah = Number(wRaw) - 1; // source is 1-based
    const key = `${s}:${a}`;
    byAyahCount.set(key, Math.max(byAyahCount.get(key) ?? -1, wordIdxInAyah));
    words.push({
      surah: s,
      ayah: a,
      wordIdxInAyah,
      globalIdx: words.length,
      lastInAyah: false,
      lineNumber: Number(g.getAttribute("data-line-number") ?? 0),
    });
    wordEls.push(g);
    g.style.cursor = "pointer";
  }
  for (const w of words) {
    w.lastInAyah = w.wordIdxInAyah === byAyahCount.get(`${w.surah}:${w.ayah}`);
  }

  // Cache each word's bbox once for coordinate-based hit testing in onClick.
  // If getBBox fails or returns zero, we'll retry on the first click that
  // doesn't find a hit (covers the rare case where the SVG isn't fully laid
  // out yet at inject time).
  wordBboxes = wordEls.map(captureBbox);

  // Overlay layer for highlights — appended last so it paints above the glyphs.
  overlayEl = document.createElementNS("http://www.w3.org/2000/svg", "g");
  overlayEl.setAttribute("class", "mushaf-overlay");
  overlayEl.setAttribute("pointer-events", "none");
  svg.appendChild(overlayEl);

  emit("pageLoaded", words);
  redrawOverlay();
}

function redrawOverlay() {
  if (!overlayEl) return;
  while (overlayEl.firstChild) overlayEl.removeChild(overlayEl.firstChild);
  const lo = props.rangeLo;
  const hi = props.rangeHi;
  if (lo === null || hi === null) return;
  for (let i = lo; i <= hi; i++) {
    const el = wordEls[i];
    if (!el) continue;
    try {
      const bb = el.getBBox();
      const isEndpoint = i === props.startIdx || i === props.endIdx;
      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      );
      rect.setAttribute("x", String(bb.x - 1));
      rect.setAttribute("y", String(bb.y - 1));
      rect.setAttribute("width", String(bb.width + 2));
      rect.setAttribute("height", String(bb.height + 2));
      rect.setAttribute("rx", "1.5");
      rect.setAttribute(
        "fill",
        isEndpoint ? "rgba(93, 29, 61, 0.85)" : "rgba(93, 29, 61, 0.18)"
      );
      rect.setAttribute("mix-blend-mode", isEndpoint ? "normal" : "multiply");
      overlayEl.appendChild(rect);
    } catch {
      /* getBBox can fail on detached nodes; ignore */
    }
  }
}

function captureBbox(
  g: SVGGElement | null,
): { x: number; y: number; w: number; h: number } | null {
  if (!g) return null;
  try {
    const bb = g.getBBox();
    if (bb.width <= 0 || bb.height <= 0) return null;
    return { x: bb.x, y: bb.y, w: bb.width, h: bb.height };
  } catch {
    return null;
  }
}

function clientToSvg(e: MouseEvent): { x: number; y: number } | null {
  if (!currentSvgEl) return null;
  const pt = currentSvgEl.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = currentSvgEl.getScreenCTM();
  if (!ctm) return null;
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

function onClick(e: MouseEvent) {
  const svgPt = clientToSvg(e);
  if (!svgPt) return;

  // Find the nearest word whose padded bbox contains the click. Among ties
  // (overlapping padded boxes), the one whose center is closest wins.
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < wordEls.length; i++) {
    let bb = wordBboxes[i];
    if (!bb) {
      bb = captureBbox(wordEls[i] ?? null);
      wordBboxes[i] = bb;
      if (!bb) continue;
    }
    const x1 = bb.x - TAP_PAD_X;
    const y1 = bb.y - TAP_PAD_Y;
    const x2 = bb.x + bb.w + TAP_PAD_X;
    const y2 = bb.y + bb.h + TAP_PAD_Y;
    if (svgPt.x < x1 || svgPt.x > x2 || svgPt.y < y1 || svgPt.y > y2) continue;
    const cx = bb.x + bb.w / 2;
    const cy = bb.y + bb.h / 2;
    const dist = Math.hypot(svgPt.x - cx, svgPt.y - cy);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  if (bestIdx >= 0) emit("wordTap", bestIdx);
}

watch(
  () => props.page,
  (p) => {
    void loadPage(p);
  },
  { immediate: true }
);

watch(
  () => [props.rangeLo, props.rangeHi, props.startIdx, props.endIdx],
  () => redrawOverlay()
);

onBeforeUnmount(() => {
  currentSvgEl = null;
  wordEls = [];
  wordBboxes = [];
  overlayEl = null;
});
</script>

<template>
  <div class="w-full">
    <div
      v-if="loading"
      class="flex justify-center items-center h-[380px] text-muted text-sm"
    >
      <i class="pi pi-spinner pi-spin me-2" /> Loading mushaf page…
    </div>
    <div
      v-else-if="error"
      class="flex justify-center items-center h-[380px] text-muted text-sm"
    >
      Failed to load page {{ page }}.
    </div>
    <div
      v-show="!loading && !error"
      ref="container"
      class="w-full max-w-[460px] mx-auto bg-[#fffef8] border border-[#e8e0c8] rounded-md px-4 py-5 shadow-sm"
      @click="onClick"
    />
  </div>
</template>

<style scoped>
:deep(g[id^="md-word-"]):hover {
  filter: brightness(0.85);
}
</style>
