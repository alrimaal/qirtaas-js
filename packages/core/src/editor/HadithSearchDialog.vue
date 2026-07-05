<script setup lang="ts">
import { getOverlayAppendTo } from "../mount/overlay";
import { ref, computed, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { searchHadith, type HadithResult } from "@qirtaas/core/services/hadith";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Button from "primevue/button";
import WordRangePicker from "./WordRangePicker.vue";
import DOMPurify from "dompurify";

const cleanText = (raw: string) =>
  DOMPurify.sanitize(raw ?? "", { ALLOWED_TAGS: [], KEEP_CONTENT: true });

// Backend-built excerpt: matched words are wrapped in <mark>. DOMPurify strips
// any other tags (same as cleanText), keeping only <mark> for the highlight.
const highlightedText = (raw: string) =>
  DOMPurify.sanitize(raw ?? "", { ALLOWED_TAGS: ["mark"], KEEP_CONTENT: true });

const { t } = useI18n();

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  "update:visible": [value: boolean];
  insert: [
    data: {
      collectionNameArabic: string;
      collectionNameEnglish: string;
      number: number | null;
      text: string;
    }
  ];
}>();

const query = ref("");
const results = ref<HadithResult[]>([]);
const loading = ref(false);
const error = ref("");
const selectedIndex = ref(0);
const selectedHadith = ref<HadithResult | null>(null);
const resultListEl = ref<HTMLElement | null>(null);
const insertBtnEl = ref<{ $el: HTMLElement } | null>(null);

// Word-level range selection, driven by the shared WordRangePicker.
type Selection = {
  fromWord: number;
  toWord: number;
  isFull: boolean;
  complete: boolean;
  text: string;
};
const selection = ref<Selection | null>(null);

const hadithText = computed(() =>
  selectedHadith.value ? cleanText(selectedHadith.value.text) : ""
);

// Reset selection when a hadith is picked; the picker re-emits its range.
watch(selectedHadith, (hadith) => {
  if (hadith) {
    selection.value = null;
    nextTick(() => {
      (insertBtnEl.value?.$el as HTMLElement)?.focus();
    });
  }
});

let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

watch(query, (val) => {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  error.value = "";
  selectedIndex.value = 0;

  const trimmed = val.trim();
  if (!trimmed) {
    results.value = [];
    return;
  }

  // Ref format: collection:number (e.g. bukhari:1)
  if (/^.+:\d+$/.test(trimmed)) {
    doSearch(trimmed);
    return;
  }

  debounceTimeout = setTimeout(() => doSearch(trimmed), 400);
});

async function doSearch(q: string) {
  loading.value = true;
  error.value = "";
  try {
    results.value = await searchHadith(q);
    selectedIndex.value = 0;
    if (results.value.length === 0) {
      error.value = t("hadith.noResults");
    }
  } catch {
    error.value = t("hadith.searchError");
    results.value = [];
  } finally {
    loading.value = false;
  }
}

function onSearchKeydown(event: KeyboardEvent) {
  if (results.value.length === 0) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % results.value.length;
    scrollToSelected();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    selectedIndex.value =
      (selectedIndex.value - 1 + results.value.length) % results.value.length;
    scrollToSelected();
  } else if (event.key === "Enter") {
    event.preventDefault();
    const item = results.value[selectedIndex.value];
    if (item) selectHadith(item);
  }
}

function scrollToSelected() {
  nextTick(() => {
    const el = resultListEl.value?.children[selectedIndex.value] as
      | HTMLElement
      | undefined;
    el?.scrollIntoView({ block: "nearest" });
  });
}

function selectHadith(hadith: HadithResult) {
  selectedHadith.value = hadith;
}

function insertHadith() {
  const hadith = selectedHadith.value;
  if (!hadith) return;

  emit("insert", {
    collectionNameArabic: hadith.collection_name_arabic,
    collectionNameEnglish: hadith.slug,
    number: hadith.number,
    text: selection.value?.text ?? hadithText.value,
  });
  close();
}

function back() {
  selectedHadith.value = null;
  selection.value = null;
}

function close() {
  emit("update:visible", false);
  query.value = "";
  results.value = [];
  error.value = "";
  selectedIndex.value = 0;
  selectedHadith.value = null;
  selection.value = null;
}
</script>

<template>
  <Dialog :append-to="getOverlayAppendTo()"
    :visible="props.visible"
    @update:visible="close"
    :header="t('hadith.dialogTitle')"
    modal
    :style="{ width: '32rem' }"
    :dismissableMask="true"
  >
    <!-- Search step -->
    <template v-if="!selectedHadith">
      <InputText
        v-model="query"
        :placeholder="t('hadith.searchPlaceholder')"
        class="!w-full mb-4"
        autofocus
        @keydown="onSearchKeydown"
      />

      <div v-if="loading" class="flex justify-center py-6">
        <i class="pi pi-spinner pi-spin text-xl text-muted" />
      </div>

      <div v-else-if="error" class="text-sm text-muted text-center py-4">
        {{ error }}
      </div>

      <div
        v-else
        ref="resultListEl"
        class="flex flex-col gap-1 max-h-80 overflow-y-auto"
      >
        <button
          v-for="(hadith, index) in results"
          :key="`${hadith.collection_name_english}:${hadith.number}`"
          class="flex flex-col gap-1 p-3 rounded-xl border hover:bg-bg-soft hover:border-border cursor-pointer text-start font-[inherit] transition-colors"
          :class="
            index === selectedIndex
              ? 'bg-bg-soft border-border'
              : 'bg-transparent border-transparent'
          "
          @click="selectHadith(hadith)"
          @mouseenter="selectedIndex = index"
        >
          <span class="text-xs text-muted">
            {{ hadith.collection_name_arabic }} ({{
              hadith.collection_name_english
            }}) — #{{ hadith.number }}
          </span>
          <span
            v-if="hadith.text_highlighted"
            class="text-sm text-ink line-clamp-3 hadith-excerpt"
            dir="rtl"
            v-html="highlightedText(hadith.text_highlighted)"
          />
          <span v-else class="text-sm text-ink line-clamp-2" dir="rtl">
            {{ cleanText(hadith.text) }}
          </span>
        </button>
      </div>
    </template>

    <!-- Selection step -->
    <template v-else>
      <div class="mb-3">
        <Button
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          rounded
          size="small"
          @click="back"
        />
      </div>

      <p class="text-xs text-muted mb-2">
        {{ selectedHadith.collection_name_arabic }} ({{
          selectedHadith.collection_name_english
        }}) — #{{ selectedHadith.number }}
      </p>

      <!-- Word-level range selection -->
      <WordRangePicker
        class="mb-3"
        :text="hadithText"
        @change="selection = $event"
      />

      <p class="text-xs text-muted mb-4">
        {{ t("hadith.selectionHint") }}
      </p>

      <div class="flex justify-end">
        <Button
          ref="insertBtnEl"
          :label="t('hadith.insert')"
          icon="pi pi-check"
          size="small"
          class="!bg-primary !text-white hover:!opacity-90"
          :disabled="!selection?.complete"
          @click="insertHadith"
          @keydown.enter.prevent="insertHadith"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.hadith-excerpt :deep(mark) {
  background-color: color-mix(in srgb, var(--color-primary) 18%, transparent);
  color: inherit;
  border-radius: 0.25rem;
  padding: 0 0.1em;
}
</style>
