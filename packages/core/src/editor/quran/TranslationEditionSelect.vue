<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import Select from "primevue/select";
import { getOverlayAppendTo } from "../../mount/overlay";
import { EDITION_FILTER_FIELDS, groupByLanguage } from "./languageLabels";
import { useQuranEditions } from "@qirtaas/core/composables/useQuranEditions";
import { useTranslationEdition } from "@qirtaas/core/composables/useTranslationEdition";
import { localeToTafsirLanguage } from "@qirtaas/core/composables/useVerseDetail";

const props = withDefaults(
  defineProps<{
    variant: "pill" | "field" | "menu";
    /** `locale`: the reader's language leads, then English. */
    priority?: "default" | "locale";
    appendTo?: HTMLElement | string;
  }>(),
  { priority: "default" }
);

const emit = defineEmits<{ change: [id: number] }>();

const { t, locale } = useI18n();
const { selectedTranslationId, setSelectedTranslationId } =
  useTranslationEdition();
const { editions, loadEditions, defaultGroups } = useQuranEditions();
onMounted(loadEditions);

const groups = computed(() =>
  props.priority === "locale"
    ? groupByLanguage(editions.value, [
        localeToTafsirLanguage(locale.value),
        "english",
      ])
    : defaultGroups.value
);

const current = computed(() =>
  editions.value.find((r) => r.resource_id === selectedTranslationId.value)
);

const ready = computed(
  () => groups.value.length > 0 && (props.variant !== "pill" || !!current.value)
);

const PT = {
  pill: {
    label: {
      class:
        "!text-[0.65rem] !font-semibold !text-accent !py-0.5 !ps-2 !pe-0 truncate",
    },
    dropdown: { class: "!w-5 !text-accent" },
    overlay: { class: "text-sm" },
  },
  field: {
    label: { class: "!text-xs !py-1 !ps-2 !pe-0 truncate" },
    dropdown: { class: "!w-6" },
    overlay: { class: "text-sm" },
  },
  menu: { label: { class: "!text-sm truncate" } },
};

const CLASS = {
  pill: "max-w-[11rem] !rounded-full !bg-bg-soft !border-border hover:!border-accent/60",
  field: "min-w-0 max-w-[60%] !bg-bg !border-border hover:!border-accent/50",
  menu: "",
};

function onChange(id: number) {
  setSelectedTranslationId(id);
  emit("change", id);
}
</script>

<template>
  <Select
    v-if="ready"
    :size="variant === 'menu' ? undefined : 'small'"
    :model-value="selectedTranslationId"
    :options="groups"
    option-label="name"
    option-value="resource_id"
    option-group-label="label"
    option-group-children="resources"
    filter
    reset-filter-on-hide
    :filter-fields="EDITION_FILTER_FIELDS"
    :filter-placeholder="t('verseDetail.searchEditions')"
    :append-to="appendTo ?? getOverlayAppendTo()"
    :aria-label="t('verseDetail.translationEdition')"
    :title="current ? `${current.name} · ${current.language}` : undefined"
    :class="CLASS[variant]"
    :pt="PT[variant]"
    @update:model-value="onChange"
  />
</template>
