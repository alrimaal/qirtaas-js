<script setup lang="ts">
import { onMounted, onBeforeUnmount } from "vue";
import { BubbleMenu } from "@tiptap/vue-3/menus";
import type { Editor } from "@tiptap/vue-3";
import { useI18n } from "vue-i18n";
import Button from "primevue/button";

const props = defineProps<{ editor: Editor }>();
const { t } = useI18n();

// Plain variable, not a ref — BubbleMenu doesn't watch Vue reactivity, so we
// trigger re-evaluation manually by dispatching a no-op transaction.
let isTyping = false;
let typingTimeout: ReturnType<typeof setTimeout> | null = null;

function pokeBubbleMenu() {
  // Dispatch an empty transaction to force the BubbleMenu plugin to re-call
  // shouldShow on its next view.update tick.
  const view = props.editor.view;
  view.dispatch(view.state.tr.setMeta("tableBubbleMenuPoke", true));
}

function shouldShow() {
  return props.editor.isActive("table") && !isTyping;
}

function clearTypingTimeout() {
  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }
}

function onKeyDown(event: KeyboardEvent) {
  // Ignore pure modifier presses and navigation/escape — we only want to hide
  // when the user is actually entering text.
  if (
    event.key === "Escape" ||
    event.key === "Shift" ||
    event.key === "Control" ||
    event.key === "Alt" ||
    event.key === "Meta"
  ) {
    return;
  }
  isTyping = true;
  clearTypingTimeout();
  typingTimeout = setTimeout(() => {
    isTyping = false;
    typingTimeout = null;
    pokeBubbleMenu();
  }, 1500);
}

function onMouseDown() {
  if (isTyping) {
    isTyping = false;
    clearTypingTimeout();
    // Selection change from the click will re-evaluate shouldShow naturally,
    // but if the click lands in the same cell prosemirror won't dispatch a
    // selection tr — poke on the next tick to be safe.
    setTimeout(pokeBubbleMenu, 0);
  }
}

let mountedDom: HTMLElement | null = null;

onMounted(() => {
  try {
    mountedDom = props.editor.view.dom;
  } catch {
    return;
  }
  mountedDom.addEventListener("keydown", onKeyDown);
  mountedDom.addEventListener("mousedown", onMouseDown);
});

onBeforeUnmount(() => {
  clearTypingTimeout();
  if (!mountedDom) return;
  mountedDom.removeEventListener("keydown", onKeyDown);
  mountedDom.removeEventListener("mousedown", onMouseDown);
  mountedDom = null;
});
</script>

<template>
  <BubbleMenu
    :editor="props.editor"
    :should-show="shouldShow"
    :tippy-options="{
      maxWidth: 'none',
      placement: 'bottom',
      popperOptions: {
        modifiers: [
          { name: 'flip', options: { fallbackPlacements: ['top', 'bottom'] } },
        ],
      },
    }"
  >
    <div
      class="flex items-center gap-0.5 bg-bg border border-border rounded-lg shadow-md px-1 py-0.5"
    >
      <!-- Add row below -->
      <Button
        v-tooltip.bottom="t('editor.table.addRowAfter')"
        severity="secondary"
        text
        rounded
        size="small"
        @click="props.editor.chain().focus().addRowAfter().run()"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="1.5" y="1.5" width="13" height="7" rx="1" />
          <line x1="8" y1="1.5" x2="8" y2="8.5" />
          <line x1="5" y1="13.5" x2="11" y2="13.5" />
          <line x1="8" y1="10.5" x2="8" y2="16" />
        </svg>
      </Button>
      <!-- Delete row -->
      <Button
        v-tooltip.bottom="t('editor.table.deleteRow')"
        severity="secondary"
        text
        rounded
        size="small"
        :disabled="!props.editor.can().deleteRow()"
        @click="props.editor.chain().focus().deleteRow().run()"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="1.5" y="1.5" width="13" height="7" rx="1" />
          <line x1="8" y1="1.5" x2="8" y2="8.5" />
          <line x1="5" y1="11.5" x2="11" y2="15.5" />
          <line x1="11" y1="11.5" x2="5" y2="15.5" />
        </svg>
      </Button>
      <span class="w-px h-4 bg-border mx-0.5 shrink-0" />
      <!-- Add column after -->
      <Button
        v-tooltip.bottom="t('editor.table.addColAfter')"
        severity="secondary"
        text
        rounded
        size="small"
        @click="props.editor.chain().focus().addColumnAfter().run()"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="1.5" y="1.5" width="7" height="13" rx="1" />
          <line x1="1.5" y1="8" x2="8.5" y2="8" />
          <line x1="13.5" y1="5" x2="13.5" y2="11" />
          <line x1="10.5" y1="8" x2="16" y2="8" />
        </svg>
      </Button>
      <!-- Delete column -->
      <Button
        v-tooltip.bottom="t('editor.table.deleteCol')"
        severity="secondary"
        text
        rounded
        size="small"
        :disabled="!props.editor.can().deleteColumn()"
        @click="props.editor.chain().focus().deleteColumn().run()"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="1.5" y="1.5" width="7" height="13" rx="1" />
          <line x1="1.5" y1="8" x2="8.5" y2="8" />
          <line x1="11.5" y1="5" x2="15.5" y2="11" />
          <line x1="15.5" y1="5" x2="11.5" y2="11" />
        </svg>
      </Button>
      <span class="w-px h-4 bg-border mx-0.5 shrink-0" />
      <!-- Toggle header row -->
      <Button
        v-tooltip.bottom="t('editor.table.toggleHeader')"
        severity="secondary"
        text
        rounded
        size="small"
        @click="props.editor.chain().focus().toggleHeaderRow().run()"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect
            x="1.5"
            y="1.5"
            width="13"
            height="3.5"
            rx="0.5"
            fill="currentColor"
            fill-opacity="0.35"
            stroke="none"
          />
          <rect x="1.5" y="1.5" width="13" height="13" rx="1" />
          <line x1="1.5" y1="5" x2="14.5" y2="5" />
          <line x1="1.5" y1="9.75" x2="14.5" y2="9.75" />
          <line x1="8" y1="5" x2="8" y2="14.5" />
        </svg>
      </Button>
      <span class="w-px h-4 bg-border mx-0.5 shrink-0" />
      <!-- Delete table -->
      <Button
        v-tooltip.bottom="t('editor.table.deleteTable')"
        severity="danger"
        text
        rounded
        size="small"
        @click="props.editor.chain().focus().deleteTable().run()"
      >
        <i class="pi pi-trash text-xs" />
      </Button>
    </div>
  </BubbleMenu>
</template>
