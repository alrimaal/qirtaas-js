<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import { getOverlayAppendTo } from "../mount/overlay";
import { formatCombo } from "./keyboard";
import { useIsDark } from "./runtime/context";
import {
  filterCommands,
  type CommandGroup,
  type ResolvedCommand,
} from "./commands";

const props = defineProps<{
  commands: ResolvedCommand[];
  activeIds: Set<string>;
}>();
const visible = defineModel<boolean>("visible", { default: false });
const emit = defineEmits<{ run: [command: ResolvedCommand] }>();

const { t } = useI18n();
const isDark = useIsDark();
const query = ref("");
const selectedIndex = ref(0);
const listRef = ref<HTMLElement | null>(null);

const GROUP_ORDER: CommandGroup[] = [
  "insert",
  "honorifics",
  "format",
  "highlight",
  "tools",
];

const matches = computed(() => filterCommands(props.commands, query.value));

const ordered = computed(() =>
  GROUP_ORDER.flatMap((group) => matches.value.filter((c) => c.group === group)),
);

const groups = computed(() =>
  GROUP_ORDER.map((group) => ({
    group,
    items: matches.value.filter((c) => c.group === group),
  })).filter((g) => g.items.length > 0),
);

function indexOf(command: ResolvedCommand): number {
  return ordered.value.indexOf(command);
}

watch(query, () => {
  selectedIndex.value = 0;
});

let pending: ResolvedCommand | null = null;

function onShow() {
  query.value = "";
  selectedIndex.value = 0;
}

function onAfterHide() {
  const command = pending;
  pending = null;
  if (command) emit("run", command);
}

function scrollSelectedIntoView() {
  nextTick(() => {
    listRef.value
      ?.querySelector<HTMLElement>("[data-selected='true']")
      ?.scrollIntoView({ block: "nearest" });
  });
}

function move(delta: number) {
  const count = ordered.value.length;
  if (count === 0) return;
  selectedIndex.value = (selectedIndex.value + delta + count) % count;
  scrollSelectedIntoView();
}

function run(command: ResolvedCommand) {
  pending = command;
  visible.value = false;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    move(1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    move(-1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    const command = ordered.value[selectedIndex.value];
    if (command) run(command);
  }
}
</script>

<template>
  <Dialog
    :append-to="getOverlayAppendTo()"
    v-model:visible="visible"
    :modal="true"
    :draggable="false"
    :dismissable-mask="true"
    :close-on-escape="true"
    :show-header="false"
    :pt="{ content: { class: '!p-0 !rounded-lg overflow-hidden' } }"
    class="!w-[min(560px,92vw)]"
    @show="onShow"
    @after-hide="onAfterHide"
    @keydown="onKeydown"
  >
    <div class="flex items-center gap-2 border-b border-border px-3 py-2">
      <i class="pi pi-search text-xs text-muted" />
      <InputText
        autofocus
        v-model="query"
        :placeholder="t('editor.commandPalette.placeholder')"
        :aria-label="t('editor.commandPalette.placeholder')"
        class="!border-none !bg-transparent !shadow-none !px-0 !py-1 flex-1 !text-sm"
      />
    </div>

    <div ref="listRef" class="max-h-[min(60vh,22rem)] overflow-y-auto p-1">
      <template v-for="g in groups" :key="g.group">
        <h5
          class="px-3 pb-1 pt-2 text-[0.625rem] font-bold uppercase tracking-[0.09em] text-muted"
        >
          {{ t(`editor.commandPalette.groups.${g.group}`) }}
        </h5>
        <button
          v-for="item in g.items"
          :key="item.id"
          :data-selected="indexOf(item) === selectedIndex"
          :role="item.toggleable ? 'menuitemcheckbox' : 'option'"
          :aria-checked="item.toggleable ? activeIds.has(item.id) : undefined"
          class="flex w-full cursor-pointer items-center gap-2.5 rounded-md border-none px-3 py-2 text-start text-sm font-[inherit]"
          :class="[
            indexOf(item) === selectedIndex
              ? activeIds.has(item.id)
                ? 'bg-accent/[0.12] text-accent'
                : 'bg-accent/10 text-accent'
              : activeIds.has(item.id)
                ? 'bg-accent/[0.04] text-ink'
                : 'bg-transparent text-ink',
            activeIds.has(item.id) && 'font-semibold',
          ]"
          @click="run(item)"
          @mousemove="selectedIndex = indexOf(item)"
        >
          <span
            v-if="item.swatch"
            class="w-4 h-4 shrink-0 rounded-full border border-border"
            :style="{
              backgroundColor: isDark ? item.swatch.dark : item.swatch.light,
            }"
          />
          <span
            v-else-if="item.glyph"
            class="honorific-glyph w-4 text-center text-base leading-none"
            >{{ item.glyph }}</span
          >
          <i v-else :class="item.icon" class="w-4 text-center text-xs text-muted" />
          <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
          <span
            v-if="activeIds.has(item.id) && indexOf(item) === selectedIndex"
            class="whitespace-nowrap rounded-full bg-ink px-2 py-0.5 text-[0.65rem] font-semibold leading-normal text-bg"
          >
            ↵ {{ t("editor.commandPalette.turnOff") }}
          </span>
          <span
            v-else-if="activeIds.has(item.id)"
            class="whitespace-nowrap rounded-full bg-accent/[0.12] px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.06em] leading-normal text-accent"
          >
            {{ t("editor.commandPalette.on") }}
          </span>
          <kbd
            v-else-if="item.combo"
            class="whitespace-nowrap rounded-[5px] border border-b-2 border-border bg-bg px-[5px] py-px text-[0.65rem] font-semibold leading-normal text-muted"
          >
            {{ formatCombo(item.combo) }}
          </kbd>
          <span
            v-else-if="item.syntax"
            class="whitespace-nowrap font-mono text-[0.6875rem] text-muted"
          >
            {{ item.syntax }}
          </span>
        </button>
      </template>

      <div v-if="ordered.length === 0" class="px-3 py-6 text-center text-xs text-muted">
        {{ t("editor.commandPalette.empty") }}
      </div>
    </div>

    <p class="border-t border-border px-3 py-1.5 text-[0.6875rem] text-muted">
      {{ t("editor.commandPalette.hint") }}
    </p>
  </Dialog>
</template>

<style scoped>
.honorific-glyph {
  font-family: "Kitab", serif;
}
</style>
