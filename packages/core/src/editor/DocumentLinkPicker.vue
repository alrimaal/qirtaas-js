<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import {
  useDocumentLinkHost,
  type DocumentLinkDocMeta,
} from "./runtime/context";

const props = defineProps<{
  visible: boolean;
  /** The document being edited — excluded so a page can't link to itself. */
  excludeId?: string;
}>();
const emit = defineEmits<{
  "update:visible": [value: boolean];
  select: [doc: DocumentLinkDocMeta];
}>();

const { t } = useI18n();
const toast = useToast();
const host = useDocumentLinkHost();

const query = ref("");
const searchResults = ref<DocumentLinkDocMeta[] | null>(null);
const searching = ref(false);
const creating = ref(false);
const inputRef = ref<{ $el: HTMLInputElement } | null>(null);

const MIN_QUERY = 2;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      query.value = "";
      searchResults.value = null;
      nextTick(() => inputRef.value?.$el?.focus());
    }
  }
);

watch(query, (q) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  const trimmed = q.trim();
  if (trimmed.length < MIN_QUERY) {
    searchResults.value = null;
    searching.value = false;
    return;
  }
  searching.value = true;
  debounceTimer = setTimeout(async () => {
    try {
      const results = await host.searchDocuments(trimmed);
      // Ignore stale responses.
      if (query.value.trim() === trimmed) searchResults.value = results;
    } catch {
      searchResults.value = [];
    } finally {
      searching.value = false;
    }
  }, 250);
});

// Short queries show recent documents so the common "link to something I just
// wrote" case needs no typing at all.
const items = computed<DocumentLinkDocMeta[]>(() => {
  const base =
    searchResults.value ??
    [...host.documents.value].sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta;
    });
  return base.filter((d) => d.id !== props.excludeId).slice(0, 10);
});

function select(doc: DocumentLinkDocMeta) {
  emit("select", doc);
  emit("update:visible", false);
}

async function createAndLink() {
  creating.value = true;
  try {
    const doc = await host.createDocument();
    select(doc);
  } catch {
    toast.add({
      severity: "error",
      summary: t("editor.pageLink.createFailed"),
      life: 4000,
    });
  } finally {
    creating.value = false;
  }
}

function onEnter() {
  const first = items.value[0];
  if (first) select(first);
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="t('editor.pageLink.pickerTitle')"
    modal
    dismissableMask
    class="w-full max-w-md mx-4"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-2">
      <InputText
        ref="inputRef"
        v-model="query"
        :placeholder="t('editor.pageLink.searchPlaceholder')"
        class="w-full"
        @keydown.enter.prevent="onEnter"
      />

      <div class="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
        <div
          v-if="searching"
          class="px-3 py-2 text-sm"
          style="color: var(--color-muted)"
        >
          <i class="pi pi-spinner pi-spin text-xs" />
        </div>
        <template v-else>
          <button
            v-for="doc in items"
            :key="doc.id"
            class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-start transition-colors cursor-pointer hover:bg-accent/20"
            style="color: var(--color-ink)"
            @click="select(doc)"
          >
            <i
              class="pi pi-file text-xs shrink-0"
              style="color: var(--color-muted)"
            />
            <span class="truncate">
              {{ doc.title || t("editor.pageLink.untitled") }}
            </span>
          </button>
          <div
            v-if="items.length === 0"
            class="px-3 py-2 text-sm"
            style="color: var(--color-muted)"
          >
            {{ t("editor.pageLink.noResults") }}
          </div>
        </template>
      </div>

      <button
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-start transition-colors cursor-pointer hover:bg-accent/20 border-t"
        style="color: var(--color-accent); border-color: var(--color-border)"
        :disabled="creating"
        @click="createAndLink"
      >
        <i
          :class="['pi text-xs', creating ? 'pi-spinner pi-spin' : 'pi-plus']"
        />
        {{ t("editor.pageLink.createNew") }}
      </button>
    </div>
  </Dialog>
</template>
