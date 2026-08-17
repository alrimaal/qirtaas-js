<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { AyahResult } from "@qirtaas/core/services/quran";
import { useQuranCollectionsHost } from "../runtime/context";

const { t } = useI18n();
const host = useQuranCollectionsHost();

const props = withDefaults(defineProps<{ active?: boolean }>(), {
  active: true,
});
const emit = defineEmits<{
  back: [];
  insertVerses: [
    payload: { verses: AyahResult[]; displayMode: "inline" | "card" }
  ];
}>();

type Mode = "list" | "verses";
const mode = ref<Mode>("list");

const collections = ref<{ id: string; name: string; count: number | null }[]>(
  []
);
const loadingList = ref(false);
const listError = ref("");
let listLoaded = false;

const selectedCollection = ref<{ id: string; name: string } | null>(null);
const verses = ref<AyahResult[]>([]);
const loadingVerses = ref(false);
const versesError = ref("");
// Verse keys ("surah:ayah") currently marked for import.
const selectedKeys = ref<Set<string>>(new Set());
const displayMode = ref<"inline" | "card">("inline");

const verseKey = (v: AyahResult) => `${v.surah.number}:${v.number}`;

const selectedCount = computed(() => selectedKeys.value.size);
const allSelected = computed(
  () => verses.value.length > 0 && selectedCount.value === verses.value.length
);

// Load the collection list the first time the step is shown.
watch(
  () => props.active,
  (isActive) => {
    if (isActive && !listLoaded) void loadCollections();
  },
  { immediate: true }
);

async function loadCollections() {
  loadingList.value = true;
  listError.value = "";
  try {
    collections.value = await host.listCollections();
    listLoaded = true;
  } catch {
    listError.value = t("quran.collectionsError");
  } finally {
    loadingList.value = false;
  }
}

async function openCollection(collection: { id: string; name: string }) {
  selectedCollection.value = collection;
  mode.value = "verses";
  verses.value = [];
  versesError.value = "";
  loadingVerses.value = true;
  try {
    const fetched = await host.getCollectionVerses(collection.id);
    verses.value = fetched;
    // Default to importing everything; the user unmarks what they don't want.
    selectedKeys.value = new Set(fetched.map(verseKey));
  } catch {
    versesError.value = t("quran.collectionVersesError");
  } finally {
    loadingVerses.value = false;
  }
}

function toggleVerse(v: AyahResult) {
  const key = verseKey(v);
  const next = new Set(selectedKeys.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  selectedKeys.value = next;
}

function toggleAll() {
  selectedKeys.value = allSelected.value
    ? new Set()
    : new Set(verses.value.map(verseKey));
}

function backToList() {
  mode.value = "list";
  selectedCollection.value = null;
  verses.value = [];
  selectedKeys.value = new Set();
}

function onBack() {
  if (mode.value === "verses") backToList();
  else emit("back");
}

function importSelected() {
  const chosen = verses.value.filter((v) => selectedKeys.value.has(verseKey(v)));
  if (chosen.length === 0) return;
  emit("insertVerses", { verses: chosen, displayMode: displayMode.value });
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center gap-2 mb-3">
      <button
        type="button"
        class="inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-primary cursor-pointer font-[inherit]"
        @click="onBack"
      >
        <span class="[html[dir=rtl]_&]:rotate-180">←</span>
        {{ t("quran.back") }}
      </button>
      <span class="text-sm font-bold text-primary truncate">
        {{
          mode === "verses" && selectedCollection
            ? selectedCollection.name
            : t("quran.collectionsTitle")
        }}
      </span>
    </div>

    <!-- Collections list -->
    <template v-if="mode === 'list'">
      <div v-if="loadingList" class="flex justify-center py-8">
        <i class="pi pi-spinner pi-spin text-xl text-muted" />
      </div>
      <div v-else-if="listError" class="text-sm text-muted text-center py-6">
        {{ listError }}
        <div class="mt-3">
          <button
            type="button"
            class="text-[13px] font-semibold text-primary hover:underline cursor-pointer font-[inherit]"
            @click="loadCollections"
          >
            {{ t("quran.retry") }}
          </button>
        </div>
      </div>
      <!-- Empty / not-connected: reached only on purpose, so it explains itself -->
      <div
        v-else-if="collections.length === 0"
        class="px-3 py-9 text-center"
      >
        <div
          class="w-[38px] h-[38px] rounded-[11px] bg-bg-soft text-muted flex items-center justify-center mx-auto mb-2.5"
        >
          <i class="pi pi-bookmark text-[15px] opacity-70" />
        </div>
        <div class="text-[12.5px] text-muted leading-[1.7]">
          {{ t("quran.collectionsEmptyTitle") }}<br />
          {{ t("quran.collectionsEmptySub") }}
        </div>
      </div>
      <div v-else class="flex flex-col gap-0.5 max-h-80 overflow-y-auto">
        <button
          v-for="c in collections"
          :key="c.id"
          type="button"
          class="group flex items-center gap-3 p-3 rounded-[11px] border border-transparent bg-transparent hover:bg-bg-soft hover:border-border text-start font-[inherit] cursor-pointer transition-colors"
          @click="openCollection(c)"
        >
          <span
            class="w-[34px] h-[34px] rounded-[9px] bg-primary/[0.09] text-primary flex items-center justify-center shrink-0"
          >
            <i class="pi pi-bookmark text-sm" />
          </span>
          <span class="flex-1 min-w-0">
            <span class="block text-[13.5px] font-semibold text-ink truncate">{{
              c.name
            }}</span>
          </span>
          <span
            v-if="c.count != null"
            class="text-[11px] text-muted tabular-nums"
            >{{ c.count }}</span
          >
          <span
            class="text-[13px] text-muted opacity-50 group-hover:opacity-100 group-hover:text-primary [html[dir=rtl]_&]:rotate-180"
            >→</span
          >
        </button>
      </div>
    </template>

    <!-- Verse checklist -->
    <template v-else>
      <div v-if="loadingVerses" class="flex justify-center py-8">
        <i class="pi pi-spinner pi-spin text-xl text-muted" />
      </div>
      <div v-else-if="versesError" class="text-sm text-muted text-center py-6">
        {{ versesError }}
      </div>
      <div
        v-else-if="verses.length === 0"
        class="text-sm text-muted text-center py-8"
      >
        {{ t("quran.collectionsEmpty") }}
      </div>
      <template v-else>
        <!-- Selection bar: count + select-all, in one row above the list -->
        <div
          class="flex items-center justify-between gap-2 px-1 pb-2 mb-0.5 border-b border-border"
        >
          <span class="text-[12px] text-muted">
            <i18n-t keypath="quran.selectedOfTotal" tag="span">
              <template #count
                ><b class="text-ink font-semibold tabular-nums">{{
                  selectedCount
                }}</b></template
              >
              <template #total>{{ verses.length }}</template>
            </i18n-t>
          </span>
          <button
            type="button"
            class="text-[12px] font-semibold text-primary hover:bg-primary/[0.08] rounded-md px-1.5 py-0.5 cursor-pointer font-[inherit] transition-colors"
            @click="toggleAll"
          >
            {{ allSelected ? t("quran.selectNone") : t("quran.selectAll") }}
          </button>
        </div>

        <!-- Whole row toggles; unpicked verses dim instead of a checkbox -->
        <div class="flex flex-col max-h-72 overflow-y-auto -mx-1">
          <button
            v-for="v in verses"
            :key="verseKey(v)"
            type="button"
            class="flex items-start gap-3 p-2.5 rounded-[10px] bg-transparent hover:bg-bg-soft cursor-pointer text-start font-[inherit] transition-colors"
            @click="toggleVerse(v)"
          >
            <span
              class="w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 mt-0.5 transition-colors"
              :class="
                selectedKeys.has(verseKey(v))
                  ? 'bg-primary border-primary'
                  : 'border-border'
              "
            >
              <svg
                v-if="selectedKeys.has(verseKey(v))"
                class="w-2.5 h-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                stroke-width="3.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="4 12 9 17 20 6" />
              </svg>
            </span>
            <span
              class="flex flex-col flex-1 min-w-0 gap-1 transition-opacity"
              :class="selectedKeys.has(verseKey(v)) ? 'opacity-100' : 'opacity-50'"
            >
              <span class="text-[11px] text-muted font-medium">
                {{ v.surah.name_arabic }} · {{ v.surah.number }}:{{ v.number }}
              </span>
              <span
                class="text-[15px] text-ink leading-[1.8] line-clamp-2 font-quran"
                dir="rtl"
              >
                {{ v.text }}
              </span>
            </span>
          </button>
        </div>

        <!-- Fixed footer: insert style + primary action stay visible while the
             list scrolls. Bleeds to the dialog edges via negative margins. -->
        <div
          class="flex items-center justify-between gap-3 mt-2 -mx-5 -mb-5 px-5 pt-3 pb-4 border-t border-border bg-bg"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-[11.5px] text-muted whitespace-nowrap">{{
              t("quran.insertAs")
            }}</span>
            <div
              class="inline-flex gap-0.5 rounded-[9px] border border-border bg-bg-soft p-0.5"
            >
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] text-[12px] cursor-pointer font-[inherit] transition-colors"
                :class="
                  displayMode === 'inline'
                    ? 'bg-bg text-primary font-semibold shadow-sm'
                    : 'text-muted hover:text-ink font-medium'
                "
                @click="displayMode = 'inline'"
              >
                <i class="pi pi-align-left text-[11px]" />
                {{ t("quran.displayInline") }}
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] text-[12px] cursor-pointer font-[inherit] transition-colors"
                :class="
                  displayMode === 'card'
                    ? 'bg-bg text-primary font-semibold shadow-sm'
                    : 'text-muted hover:text-ink font-medium'
                "
                @click="displayMode = 'card'"
              >
                <i class="pi pi-id-card text-[11px]" />
                {{ t("quran.displayCard") }}
              </button>
            </div>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] bg-primary hover:bg-accent text-white text-[13px] font-semibold cursor-pointer font-[inherit] whitespace-nowrap transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
            :disabled="selectedCount === 0"
            @click="importSelected"
          >
            {{ t("quran.importSelected", { count: selectedCount }) }}
          </button>
        </div>
      </template>
    </template>
  </div>
</template>
