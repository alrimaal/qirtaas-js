<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import type { Editor } from "@tiptap/vue-3";
import type { SearchReplaceStorage } from "./extensions/SearchReplace";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CaseSensitive,
  X,
  Replace,
  ReplaceAll,
} from "lucide-vue-next";

const props = defineProps<{
  editor: Editor;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();

const searchTerm = ref("");
const replaceTerm = ref("");
const caseSensitive = ref(false);
const showReplace = ref(false);

const findInputRef = ref<InstanceType<typeof InputText> | null>(null);

const resultCount = ref(0);
const currentIndex = ref(0);

let transactionHandler: (() => void) | null = null;

function syncFromStorage() {
  const storage = (props.editor.storage as any).searchAndReplace as
    | SearchReplaceStorage
    | undefined;
  if (!storage) return;
  resultCount.value = storage.results.length;
  currentIndex.value = storage.resultIndex;
}

function scrollToCurrentMatch() {
  const storage = (props.editor.storage as any).searchAndReplace as
    | SearchReplaceStorage
    | undefined;
  if (!storage?.results.length) return;
  const result = storage.results[storage.resultIndex];
  if (!result) return;

  const { view } = props.editor;
  const domAtPos = view.domAtPos(result.from);
  const node =
    domAtPos.node instanceof HTMLElement
      ? domAtPos.node
      : domAtPos.node.parentElement;
  node?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function focusInput() {
  const input = (findInputRef.value as any)?.$el ?? findInputRef.value;
  if (input instanceof HTMLElement) {
    const el = input.tagName === "INPUT" ? input : input.querySelector("input");
    (el as HTMLInputElement | null)?.focus();
    (el as HTMLInputElement | null)?.select();
  }
}

defineExpose({ focus: focusInput });

onMounted(() => {
  transactionHandler = () => syncFromStorage();
  props.editor.on("transaction", transactionHandler);
  nextTick(focusInput);
});

onBeforeUnmount(() => {
  if (transactionHandler) {
    props.editor.off("transaction", transactionHandler);
  }
});

watch(searchTerm, (val) => {
  props.editor.commands.setSearchTerm(val);
});

watch(replaceTerm, (val) => {
  props.editor.commands.setReplaceTerm(val);
});

watch(caseSensitive, (val) => {
  props.editor.commands.setCaseSensitive(val);
});

function goNext() {
  props.editor.commands.nextSearchResult();
  nextTick(scrollToCurrentMatch);
}

function goPrevious() {
  props.editor.commands.previousSearchResult();
  nextTick(scrollToCurrentMatch);
}

function replaceOne() {
  props.editor.commands.replace();
  nextTick(scrollToCurrentMatch);
}

function replaceAllMatches() {
  props.editor.commands.replaceAll();
}

function close() {
  searchTerm.value = "";
  replaceTerm.value = "";
  props.editor.commands.setSearchTerm("");
  props.editor.commands.setReplaceTerm("");
  props.editor.commands.focus();
  emit("close");
}

function onFindKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    if (e.shiftKey) {
      goPrevious();
    } else {
      goNext();
    }
  } else if (e.key === "Escape") {
    e.preventDefault();
    close();
  }
}

function onReplaceKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    replaceOne();
  } else if (e.key === "Escape") {
    e.preventDefault();
    close();
  }
}
</script>

<template>
  <div class="border-t border-border bg-bg-soft px-4 py-2 flex flex-col gap-2">
    <!-- Find row -->
    <div class="flex items-center gap-2 flex-wrap max-w-4xl mx-auto w-full">
      <!-- Toggle replace -->
      <Button
        v-tooltip.bottom="t('editor.findReplace.replace')"
        severity="secondary"
        text
        rounded
        size="small"
        :class="{ '!bg-accent/10 !text-accent': showReplace }"
        @click="showReplace = !showReplace"
      >
        <component :is="showReplace ? ChevronDown : ChevronRight" :size="16" />
      </Button>
      <InputText
        ref="findInputRef"
        v-model="searchTerm"
        :placeholder="t('editor.findReplace.findPlaceholder')"
        size="small"
        class="!text-sm flex-1 min-w-32"
        dir="auto"
        @keydown="onFindKeydown"
      />
      <span class="text-xs text-muted whitespace-nowrap min-w-12 text-center">
        <template v-if="searchTerm && resultCount > 0">
          {{ currentIndex + 1 }} / {{ resultCount }}
        </template>
        <template v-else-if="searchTerm">
          {{ t("editor.findReplace.noResults") }}
        </template>
      </span>
      <div class="flex items-center gap-0.5">
        <Button
          v-tooltip.bottom="t('editor.findReplace.previous')"
          severity="secondary"
          text
          rounded
          size="small"
          :disabled="resultCount === 0"
          @click="goPrevious"
        >
          <ChevronUp :size="16" />
        </Button>
        <Button
          v-tooltip.bottom="t('editor.findReplace.next')"
          severity="secondary"
          text
          rounded
          size="small"
          :disabled="resultCount === 0"
          @click="goNext"
        >
          <ChevronDown :size="16" />
        </Button>
        <Button
          v-tooltip.bottom="t('editor.findReplace.caseSensitive')"
          severity="secondary"
          text
          rounded
          size="small"
          :class="{ '!bg-accent/10 !text-accent': caseSensitive }"
          @click="caseSensitive = !caseSensitive"
        >
          <CaseSensitive :size="16" />
        </Button>
        <Button
          v-tooltip.bottom="t('editor.findReplace.close')"
          severity="secondary"
          text
          rounded
          size="small"
          @click="close"
        >
          <X :size="16" />
        </Button>
      </div>
    </div>

    <!-- Replace row -->
    <div
      v-if="showReplace"
      class="flex items-center gap-2 flex-wrap max-w-4xl mx-auto w-full"
    >
      <!-- Spacer to align with find input (matching the toggle button width) -->
      <div class="w-[2.15rem] shrink-0" />
      <InputText
        v-model="replaceTerm"
        :placeholder="t('editor.findReplace.replacePlaceholder')"
        size="small"
        class="!text-sm flex-1 min-w-32"
        dir="auto"
        @keydown="onReplaceKeydown"
      />
      <div class="flex items-center gap-0.5">
        <Button
          v-tooltip.bottom="t('editor.findReplace.replace')"
          severity="secondary"
          text
          rounded
          size="small"
          :disabled="resultCount === 0"
          @click="replaceOne"
        >
          <Replace :size="16" />
        </Button>
        <Button
          v-tooltip.bottom="t('editor.findReplace.replaceAll')"
          severity="secondary"
          text
          rounded
          size="small"
          :disabled="resultCount === 0"
          @click="replaceAllMatches"
        >
          <ReplaceAll :size="16" />
        </Button>
      </div>
    </div>
  </div>
</template>
