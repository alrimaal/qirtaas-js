<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "primevue/button";
import MushafPage from "./MushafPage.vue";
import PagePicker from "./PagePicker.vue";
import {
  useQuranSelection,
  type Endpoint,
  type PageWord,
} from "./useQuranSelection";
import {
  getVerseRange,
  mushafClipUrl,
  MUSHAF_PAGES,
  SURAHS,
  type MushafPage as MushafPageData,
  type SurahMatch,
} from "@qirtaas/core/services/quran";

const { t } = useI18n();

const props = defineProps<{
  surah: SurahMatch;
  preselectVerse: number | null;
}>();

const emit = defineEmits<{
  back: [];
  insertMushaf: [
    payload: {
      page: number;
      lineStart: number;
      lineEnd: number;
      from: Endpoint;
      to: Endpoint;
      width: number;
      height: number;
    }
  ];
  insertInline: [
    payload: {
      surah: number;
      fromAyah: number;
      toAyah: number;
      surahNameArabic: string;
      surahNameEnglish: string;
      text: string;
    }
  ];
  refineWords: [
    payload: {
      surah: number;
      ayah: number;
      fromWord: number;
      toWord: number;
      surahNameArabic: string;
      surahNameEnglish: string;
      text: string;
    }
  ];
}>();

const pages = ref<MushafPageData[]>(MUSHAF_PAGES);
const activeIdx = ref(0);
const pageWords = ref<PageWord[]>([]);
const inserting = ref(false);

const sel = useQuranSelection(pageWords, { mode: "inline" });

const activePage = computed(() => pages.value[activeIdx.value]);

function findPageIdxForVerse(surah: number, ayah: number): number {
  // A page contains (surah, ayah) iff (first <= (s,a) <= last) lexicographically.
  const target: [number, number] = [surah, ayah];
  return pages.value.findIndex((p) => {
    const lo: [number, number] = [p.first.surah, p.first.ayah];
    const hi: [number, number] = [p.last.surah, p.last.ayah];
    return lexLte(lo, target) && lexLte(target, hi);
  });
}

function lexLte(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]);
}

onMounted(() => {
  if (props.preselectVerse != null) {
    const idx = findPageIdxForVerse(props.surah.number, props.preselectVerse);
    if (idx >= 0) {
      activeIdx.value = idx;
      return;
    }
  }
  // Default: land on the surah's first page.
  const info = SURAHS.find((s) => s.number === props.surah.number);
  if (info) {
    const idx = pages.value.findIndex((p) => p.page_number === info.first_page);
    if (idx >= 0) activeIdx.value = idx;
  }
});

watch(pageWords, (ws) => {
  if (props.preselectVerse == null || ws.length === 0) return;
  const matches = ws.filter(
    (w) => w.surah === props.surah.number && w.ayah === props.preselectVerse
  );
  if (matches.length === 0) return;
  sel.startIdx.value = matches[0]!.globalIdx;
  sel.endIdx.value = matches[matches.length - 1]!.globalIdx;
});

const selectionLabel = computed(() => {
  const f = sel.from.value;
  const tEnd = sel.to.value;
  if (!f || !tEnd) return "";
  if (f.surah !== tEnd.surah)
    return `${f.surah}:${f.ayah} – ${tEnd.surah}:${tEnd.ayah}`;
  if (f.ayah === tEnd.ayah) return `${f.surah}:${f.ayah}`;
  return `${f.surah}:${f.ayah}–${tEnd.ayah}`;
});

const statusText = computed(() => {
  if (!sel.hasSelection.value) return t("quran.tapVerseToSelect");
  return t("quran.selectedRef", { ref: selectionLabel.value });
});

const inlineDisabledReason = computed(() => {
  if (!sel.hasSelection.value) return null;
  if (sel.isCrossSurah.value) return t("quran.inlineNoCrossSurah");
  return null;
});

const inlineText = ref("");
const inlineLoading = ref(false);
const inlineError = ref(false);
let inlineFetchToken = 0;

watch(
  () =>
    [
      sel.from.value?.surah ?? null,
      sel.from.value?.ayah ?? null,
      sel.to.value?.ayah ?? null,
      sel.isCrossSurah.value,
    ] as const,
  async ([surah, fromAyah, toAyah, crossSurah]) => {
    if (
      surah == null ||
      fromAyah == null ||
      toAyah == null ||
      crossSurah
    ) {
      inlineText.value = "";
      inlineLoading.value = false;
      inlineError.value = false;
      return;
    }
    const token = ++inlineFetchToken;
    inlineLoading.value = true;
    inlineError.value = false;
    try {
      const r = await getVerseRange(surah, fromAyah, toAyah);
      if (token !== inlineFetchToken) return;
      inlineText.value = r.text;
    } catch {
      if (token !== inlineFetchToken) return;
      inlineError.value = true;
      inlineText.value = "";
    } finally {
      if (token === inlineFetchToken) inlineLoading.value = false;
    }
  },
  { immediate: true }
);

function selectionLineRange(): { lineStart: number; lineEnd: number } | null {
  if (sel.rangeLo.value === null || sel.rangeHi.value === null) return null;
  const loWord = pageWords.value[sel.rangeLo.value];
  const hiWord = pageWords.value[sel.rangeHi.value];
  if (!loWord || !hiWord) return null;
  const lo = Math.min(loWord.lineNumber, hiWord.lineNumber);
  const hi = Math.max(loWord.lineNumber, hiWord.lineNumber);
  return { lineStart: lo, lineEnd: hi };
}

async function onInsert() {
  if (!sel.from.value || !sel.to.value) return;
  inserting.value = true;
  try {
    if (sel.mode.value === "mushaf") {
      const lr = selectionLineRange();
      if (!lr || !activePage.value) return;
      const { width, height } = await measureClip();
      emit("insertMushaf", {
        page: activePage.value.page_number,
        lineStart: lr.lineStart,
        lineEnd: lr.lineEnd,
        from: sel.from.value,
        to: sel.to.value,
        width,
        height,
      });
    } else {
      if (!inlineText.value) return;
      emit("insertInline", {
        surah: sel.from.value.surah,
        fromAyah: sel.from.value.ayah,
        toAyah: sel.to.value.ayah,
        surahNameArabic: props.surah.name_arabic,
        surahNameEnglish: props.surah.name_english,
        text: inlineText.value,
      });
    }
  } finally {
    inserting.value = false;
  }
}

async function measureClip(): Promise<{ width: number; height: number }> {
  if (sel.rangeLo.value === null || sel.rangeHi.value === null) {
    return { width: 0, height: 0 };
  }
  const svg = document.querySelector(".mushaf-overlay")
    ?.parentElement as unknown as SVGSVGElement | null;
  if (!svg) return { width: 0, height: 0 };
  const groups = Array.from(
    svg.querySelectorAll<SVGGElement>('g[id^="md-word-"]')
  );
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = sel.rangeLo.value; i <= sel.rangeHi.value; i++) {
    const g = groups[i];
    if (!g) continue;
    try {
      const bb = g.getBBox();
      if (bb.x < minX) minX = bb.x;
      if (bb.y < minY) minY = bb.y;
      if (bb.x + bb.width > maxX) maxX = bb.x + bb.width;
      if (bb.y + bb.height > maxY) maxY = bb.y + bb.height;
    } catch {
      /* ignore */
    }
  }
  if (!isFinite(minX)) return { width: 0, height: 0 };
  const pad = 4;
  const w = Math.max(1, maxX - minX + 2 * pad);
  const h = Math.max(1, maxY - minY + 2 * pad);
  return { width: Math.round(w * 2), height: Math.round(h * 2) };
}

const previewClipUrl = computed(() => {
  if (sel.mode.value !== "mushaf") return null;
  const lr = selectionLineRange();
  if (!lr || !activePage.value) return null;
  return mushafClipUrl({
    page: activePage.value.page_number,
    lineStart: lr.lineStart,
    lineEnd: lr.lineEnd,
  });
});

function setMode(m: "inline" | "mushaf") {
  sel.setMode(m);
}

const canRefineWords = computed(() => {
  const f = sel.from.value;
  const t = sel.to.value;
  if (!f || !t) return false;
  if (f.surah !== t.surah || f.ayah !== t.ayah) return false;
  return !!inlineText.value;
});

function onRefineWords() {
  const f = sel.from.value;
  const tEnd = sel.to.value;
  if (!f || !tEnd || !inlineText.value) return;
  emit("refineWords", {
    surah: f.surah,
    ayah: f.ayah,
    fromWord: f.word,
    toWord: tEnd.word,
    surahNameArabic: props.surah.name_arabic,
    surahNameEnglish: props.surah.name_english,
    text: inlineText.value,
  });
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center gap-2 mb-2">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        rounded
        size="small"
        :aria-label="t('quran.back')"
        class="[html[dir=rtl]_&]:rotate-180"
        @click="emit('back')"
      />
      <span class="text-sm font-semibold text-primary"
        >{{ surah.name_arabic }} — {{ surah.name_english }}</span
      >
    </div>

    <!-- Page nav -->
    <div
      class="flex items-center gap-2 px-2 py-2 mb-2 border border-border bg-bg-soft rounded-md"
    >
      <PagePicker
        v-if="pages.length > 0"
        :pages="pages"
        :active-idx="activeIdx"
        @select="
          (i) => {
            activeIdx = i;
            sel.reset();
          }
        "
      />
      <span class="flex-1" />
      <span class="text-[11px] text-muted">{{ statusText }}</span>
    </div>

    <!-- Mushaf -->
    <div
      class="flex justify-center bg-[#fbf8f0] rounded-md p-3 max-h-[380px] overflow-y-auto"
    >
      <MushafPage
        v-if="activePage"
        :page="activePage.page_number"
        :range-lo="sel.rangeLo.value"
        :range-hi="sel.rangeHi.value"
        :start-idx="sel.startIdx.value"
        :end-idx="sel.endIdx.value"
        @word-tap="sel.tapWord"
        @page-loaded="(ws) => (pageWords = ws)"
      />
    </div>

    <!-- Selection footer -->
    <div class="border-t border-border mt-3 pt-3 flex flex-col gap-2">
      <div class="flex items-center gap-2 flex-wrap">
        <span
          class="text-[11px] font-bold uppercase tracking-wider text-muted w-[76px]"
          >{{ t("quran.selection") }}</span
        >
        <span
          v-if="sel.hasSelection.value"
          class="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 rounded-full text-[11.5px] font-semibold text-primary whitespace-nowrap"
        >
          {{ selectionLabel }}
        </span>
        <button
          v-if="sel.hasSelection.value"
          type="button"
          class="text-[11.5px] text-muted underline underline-offset-2 hover:text-primary font-[inherit] cursor-pointer"
          @click="sel.reset"
        >
          {{ t("quran.reset") }}
        </button>
        <button
          v-if="canRefineWords"
          type="button"
          class="inline-flex items-center gap-1 px-2.5 py-1 border border-primary/30 rounded-full text-[11.5px] font-semibold text-primary bg-bg hover:bg-primary/5 hover:border-primary font-[inherit] cursor-pointer transition-colors whitespace-nowrap"
          @click="onRefineWords"
        >
          ✎ {{ t("quran.refineWords") }}
        </button>
        <span v-else class="text-xs text-muted">{{
          t("quran.tapVerseToSelectFull")
        }}</span>
      </div>

      <div v-if="sel.hasSelection.value" class="flex items-center gap-2 flex-wrap">
        <span
          class="text-[11px] font-bold uppercase tracking-wider text-muted w-[76px]"
          >{{ t("quran.insertAs") }}</span
        >
        <div
          class="inline-flex bg-bg-soft border border-border rounded-md p-0.5 gap-0.5"
        >
          <button
            type="button"
            class="px-2.5 py-1 rounded text-[11.5px] font-medium font-[inherit] cursor-pointer"
            :class="
              sel.mode.value === 'inline'
                ? 'bg-bg text-primary shadow-sm'
                : 'text-muted hover:text-ink'
            "
            :title="inlineDisabledReason ?? ''"
            @click="setMode('inline')"
          >
            ¶ {{ t("quran.inline") }}
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded text-[11.5px] font-medium font-[inherit] cursor-pointer"
            :class="
              sel.mode.value === 'mushaf'
                ? 'bg-bg text-primary shadow-sm'
                : 'text-muted hover:text-ink'
            "
            @click="setMode('mushaf')"
          >
            ⊞ {{ t("quran.mushaf") }}
          </button>
        </div>
        <span class="text-[11px] text-muted">
          {{
            sel.mode.value === "inline"
              ? t("quran.inlineDescription")
              : t("quran.mushafDescription")
          }}
        </span>
      </div>

      <div
        v-if="sel.blockedReason.value === 'cross-surah-inline'"
        class="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-[11.5px] text-amber-900"
      >
        <i class="pi pi-info-circle mt-0.5" />
        <span>{{ t("quran.crossSurahBlocked") }}</span>
      </div>

      <div v-if="sel.hasSelection.value" class="flex flex-col gap-1">
        <span
          class="text-[10.5px] font-bold uppercase tracking-wider text-muted"
          >{{ t("quran.preview") }}</span
        >
        <div
          class="border border-dashed border-border rounded-md bg-bg-soft p-3 max-h-[140px] overflow-hidden"
        >
          <img
            v-if="sel.mode.value === 'mushaf' && previewClipUrl"
            :src="previewClipUrl"
            alt=""
            class="max-h-[120px] mx-auto block"
          />
          <div
            v-else
            class="text-[15px] text-ink leading-[1.9] text-right line-clamp-3 font-quran"
            dir="rtl"
          >
            <span
              class="inline-block bg-bg border border-border rounded px-1.5 py-0.5 text-[10px] text-primary me-1.5 align-middle font-[inherit]"
              dir="ltr"
            >
              {{ selectionLabel }}
            </span>
            <span v-if="inlineLoading" class="text-muted text-[12px]">
              <i class="pi pi-spinner pi-spin me-1" />
            </span>
            <span v-else-if="inlineError" class="text-muted text-[12px]">
              {{ t("quran.previewError") }}
            </span>
            <template v-else>{{ inlineText }}</template>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-1">
        <Button
          :label="t('quran.cancel')"
          severity="secondary"
          text
          size="small"
          @click="emit('back')"
        />
        <Button
          :label="
            sel.mode.value === 'inline'
              ? t('quran.insertText')
              : t('quran.insertMushafImage')
          "
          icon="pi pi-check"
          size="small"
          class="!bg-primary !text-white hover:!opacity-90"
          :disabled="
            !sel.hasSelection.value ||
            inserting ||
            (sel.mode.value === 'inline' && (inlineLoading || !inlineText))
          "
          :loading="inserting || (sel.mode.value === 'inline' && inlineLoading)"
          @click="onInsert"
        />
      </div>
    </div>
  </div>
</template>
