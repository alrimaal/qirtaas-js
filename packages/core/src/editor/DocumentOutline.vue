<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import type { TableOfContentDataItem } from "@tiptap/extension-table-of-contents";

const props = defineProps<{
  items: TableOfContentDataItem[];
  /** Bottom-sheet layout: no header, larger tap targets. */
  sheet?: boolean;
}>();
const emit = defineEmits<{ close: []; navigate: [] }>();
const { t } = useI18n();

// The title heading always counts, so a lone item means no real headings yet.
const empty = computed(() => props.items.length < 2);

// A picked heading stays highlighted until the user scrolls themselves, since
// headings already in view or near the end may not scroll at all.
const pickedId = ref<string | null>(null);
const activeId = computed(
  () =>
    pickedId.value ??
    (props.items.find((i) => i.isActive) ?? props.items[0])?.id
);

const USER_SCROLL_EVENTS = ["wheel", "touchmove", "keydown"] as const;
function clearPicked() {
  pickedId.value = null;
}
onMounted(() => {
  for (const e of USER_SCROLL_EVENTS)
    window.addEventListener(e, clearPicked, { passive: true });
});
onBeforeUnmount(() => {
  for (const e of USER_SCROLL_EVENTS)
    window.removeEventListener(e, clearPicked);
});

function jump(item: TableOfContentDataItem) {
  pickedId.value = item.id;
  item.dom.scrollIntoView({ behavior: "smooth", block: "start" });
  emit("navigate");
}
</script>

<template>
  <nav :aria-label="t('editor.outline.title')">
    <div
      v-if="!sheet"
      class="flex items-center justify-between gap-2 mb-3 ps-3.5 font-geist-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted"
    >
      <span>{{ t("editor.outline.title") }}</span>
      <button
        v-tooltip.bottom="t('editor.outline.hide')"
        class="grid place-items-center w-6 h-6 rounded-lg text-muted hover:bg-hover hover:text-ink cursor-pointer"
        @click="emit('close')"
      >
        <i class="pi pi-angle-double-left text-[13px] [html[dir=rtl]_&]:rotate-180" />
      </button>
    </div>
    <p
      v-if="empty"
      class="ps-3.5 pt-1 leading-normal text-muted"
      :class="sheet ? 'pb-3 text-sm' : 'max-w-[190px] text-[12.5px]'"
    >
      {{ t("editor.outline.empty") }}
    </p>
    <div
      v-else
      class="relative flex flex-col before:absolute before:inset-y-0 before:start-0 before:w-px before:bg-border"
      :class="!sheet && 'max-h-[calc(100vh-220px)] overflow-auto [scrollbar-width:none]'"
    >
      <button
        v-for="item in items"
        :key="item.id"
        dir="auto"
        class="relative block w-full pe-2 text-start leading-[1.35] rounded-e-md cursor-pointer transition-colors hover:bg-hover hover:text-ink before:absolute before:inset-y-1 before:start-0 before:w-0.5 before:rounded-sm"
        :class="[
          item.id === activeId
            ? 'text-primary font-medium before:bg-primary'
            : item.level === 1
              ? 'text-ink'
              : 'text-muted',
          item.level === 1 && 'font-medium mb-1',
          sheet ? 'py-3 min-h-11' : 'py-1.5',
          item.level >= 3
            ? sheet ? 'ps-8 text-sm' : 'ps-7 text-[12.5px]'
            : sheet ? 'ps-4 text-[15px]' : 'ps-3.5 text-[13px]',
        ]"
        @click="jump(item)"
      >
        {{ item.textContent }}
      </button>
    </div>
  </nav>
</template>
