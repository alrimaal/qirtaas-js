<script setup lang="ts">
import { getOverlayAppendTo } from "../../mount/overlay";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import Button from "primevue/button";
import Popover from "primevue/popover";
import InputText from "primevue/inputtext";
import type { MushafPage } from "@qirtaas/core/services/quran";

const { t } = useI18n();

const props = defineProps<{
  pages: MushafPage[];
  activeIdx: number;
}>();

const emit = defineEmits<{ select: [idx: number] }>();

const popover = ref<InstanceType<typeof Popover> | null>(null);
const query = ref("");

const filtered = computed(() => {
  const q = query.value.trim();
  if (!q) return props.pages.map((p, i) => ({ p, idx: i }));
  return props.pages
    .map((p, i) => ({ p, idx: i }))
    .filter(
      ({ p }) =>
        String(p.page_number).startsWith(q) ||
        p.label.includes(q) ||
        `${p.first.surah}:${p.first.ayah}`.startsWith(q) ||
        `${p.last.surah}:${p.last.ayah}`.startsWith(q),
    );
});

const activePage = computed(() => props.pages[props.activeIdx]);

function toggle(e: Event) {
  popover.value?.toggle(e);
}

function pick(idx: number) {
  emit("select", idx);
  query.value = "";
  popover.value?.hide();
}

function prev() {
  if (props.activeIdx > 0) emit("select", props.activeIdx - 1);
}
function next() {
  if (props.activeIdx < props.pages.length - 1)
    emit("select", props.activeIdx + 1);
}
</script>

<template>
  <div class="flex items-center gap-1">
    <Button
      icon="pi pi-chevron-left"
      severity="secondary"
      text
      rounded
      size="small"
      :disabled="activeIdx === 0"
      :aria-label="t('quran.previousPage')"
      class="[html[dir=rtl]_&]:rotate-180"
      @click="prev"
    />
    <button
      type="button"
      class="inline-flex items-center gap-1.5 px-2.5 py-1 border border-border rounded-md bg-bg hover:border-primary text-sm font-medium text-ink font-[inherit] cursor-pointer"
      @click="toggle"
    >
      <span>{{ t("quran.page") }} {{ activePage?.page_number ?? "—" }}</span>
      <span class="text-muted font-normal">·</span>
      <span class="text-muted font-normal">{{ activePage?.label ?? "" }}</span>
      <i class="pi pi-chevron-down text-[10px] text-muted" />
    </button>
    <Button
      icon="pi pi-chevron-right"
      severity="secondary"
      text
      rounded
      size="small"
      :disabled="activeIdx >= pages.length - 1"
      :aria-label="t('quran.nextPage')"
      class="[html[dir=rtl]_&]:rotate-180"
      @click="next"
    />

    <Popover :append-to="getOverlayAppendTo()" ref="popover">
      <div class="flex flex-col gap-2 w-[300px]">
        <InputText
          v-model="query"
          :placeholder="t('quran.pagePickerPlaceholder')"
          class="!w-full"
          size="small"
          autofocus
        />
        <div class="max-h-[300px] overflow-y-auto -mx-2">
          <button
            v-for="{ p, idx } in filtered"
            :key="p.page_number"
            type="button"
            class="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded text-start hover:bg-bg-soft font-[inherit] cursor-pointer"
            :class="
              idx === activeIdx
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-ink'
            "
            @click="pick(idx)"
          >
            <span class="font-semibold min-w-[42px]">p.{{ p.page_number }}</span>
            <span class="text-muted text-xs flex-1 truncate">{{ p.label }}</span>
          </button>
          <div
            v-if="filtered.length === 0"
            class="text-center text-xs text-muted py-3"
          >
            {{ t("quran.noMatches") }}
          </div>
        </div>
      </div>
    </Popover>
  </div>
</template>
