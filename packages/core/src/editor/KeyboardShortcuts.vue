<script setup lang="ts">
import { getOverlayAppendTo } from "../mount/overlay";
import { useI18n } from "vue-i18n";
import Dialog from "primevue/dialog";

const visible = defineModel<boolean>("visible", { default: false });
const { t } = useI18n();

// StarterKit binds formatting to Mod (⌘ on macOS, Ctrl elsewhere).
const isMac =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().includes("MAC");

type Combo = { mods: ("mod" | "shift" | "alt")[]; key: string };

function fmt({ mods, key }: Combo): string {
  const glyphs = isMac
    ? { mod: "⌘", shift: "⇧", alt: "⌥" }
    : { mod: "Ctrl", shift: "Shift", alt: "Alt" };
  return [...mods.map((m) => glyphs[m]), key].join(isMac ? "" : "+");
}

const mod = (key: string): Combo => ({ mods: ["mod"], key });
const modShift = (key: string): Combo => ({ mods: ["mod", "shift"], key });

// Syntax rows (mono hint) — things you type inline.
const inlineRows = [
  { label: t("editor.shortcuts.inline.commands"), syntax: "/" },
  { label: t("editor.shortcuts.inline.verse"), syntax: "#24:30" },
  { label: t("editor.shortcuts.inline.hadith"), syntax: "/hadith" },
  { label: t("editor.shortcuts.inline.pageLink"), syntax: "/page" },
  { label: t("editor.shortcuts.inline.honorific"), syntax: ":saw:" },
];

const formatRows = [
  { label: t("editor.shortcuts.format.bold"), combo: mod("B") },
  { label: t("editor.shortcuts.format.italic"), combo: mod("I") },
  { label: t("editor.shortcuts.format.underline"), combo: mod("U") },
  { label: t("editor.shortcuts.format.strikethrough"), combo: modShift("S") },
];

// Markdown-style syntax typed at the start of a line, plus Tab-based nesting
// (a keypress, so rendered as a kbd rather than a typed hint).
type BlockRow = { label: string; syntax?: string; combo?: Combo };
const blockRows: BlockRow[] = [
  { label: t("editor.shortcuts.blocks.heading1"), syntax: "#" },
  { label: t("editor.shortcuts.blocks.heading2"), syntax: "##" },
  { label: t("editor.shortcuts.blocks.heading3"), syntax: "###" },
  { label: t("editor.shortcuts.blocks.bulletList"), syntax: "* or -" },
  { label: t("editor.shortcuts.blocks.numberedList"), syntax: "1." },
  { label: t("editor.shortcuts.blocks.blockquote"), syntax: ">" },
  { label: t("editor.shortcuts.blocks.nestItem"), combo: { mods: [], key: "Tab" } },
  {
    label: t("editor.shortcuts.blocks.unnestItem"),
    combo: { mods: ["shift"], key: "Tab" },
  },
];

const toolRows = [
  { label: t("editor.shortcuts.tools.palette"), combo: mod("K") },
  { label: t("editor.shortcuts.tools.findReplace"), combo: mod("F") },
];
</script>

<template>
  <Dialog
    :append-to="getOverlayAppendTo()"
    v-model:visible="visible"
    :modal="true"
    :draggable="false"
    :dismissable-mask="true"
    :close-on-escape="true"
    :header="t('editor.shortcuts.title')"
    class="!w-[min(620px,92vw)]"
  >
    <p class="-mt-1 mb-4 text-xs text-muted">
      {{ t("editor.shortcuts.subtitle", { key: fmt(mod("K")) }) }}
    </p>

    <div
      class="grid gap-x-6 gap-y-5 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]"
    >
      <!-- Type it inline -->
      <section>
        <h5
          class="mb-[0.4rem] text-[0.625rem] font-bold uppercase tracking-[0.09em] text-muted"
        >
          {{ t("editor.shortcuts.groups.inline") }}
        </h5>
        <div
          v-for="row in inlineRows"
          :key="row.label"
          class="flex items-center gap-2.5 border-b border-border/55 py-1 text-[0.8125rem] text-ink"
        >
          <span class="min-w-0 flex-1">{{ row.label }}</span>
          <span class="whitespace-nowrap font-mono text-[0.6875rem] text-muted">
            {{ row.syntax }}
          </span>
        </div>
        <p class="mt-2 text-[0.6875rem] text-muted">
          {{ t("editor.shortcuts.honorificHint") }}
        </p>
      </section>

      <!-- Format -->
      <section>
        <h5
          class="mb-[0.4rem] text-[0.625rem] font-bold uppercase tracking-[0.09em] text-muted"
        >
          {{ t("editor.shortcuts.groups.format") }}
        </h5>
        <div
          v-for="row in formatRows"
          :key="row.label"
          class="flex items-center gap-2.5 border-b border-border/55 py-1 text-[0.8125rem] text-ink"
        >
          <span class="min-w-0 flex-1">{{ row.label }}</span>
          <kbd
            class="whitespace-nowrap rounded-[5px] border border-b-2 border-border bg-bg px-[5px] py-px text-[0.65rem] font-semibold leading-normal text-muted"
          >
            {{ fmt(row.combo) }}
          </kbd>
        </div>
      </section>

      <!-- Headings & lists -->
      <section>
        <h5
          class="mb-[0.4rem] text-[0.625rem] font-bold uppercase tracking-[0.09em] text-muted"
        >
          {{ t("editor.shortcuts.groups.blocks") }}
        </h5>
        <div
          v-for="row in blockRows"
          :key="row.label"
          class="flex items-center gap-2.5 border-b border-border/55 py-1 text-[0.8125rem] text-ink"
        >
          <span class="min-w-0 flex-1">{{ row.label }}</span>
          <kbd
            v-if="row.combo"
            class="whitespace-nowrap rounded-[5px] border border-b-2 border-border bg-bg px-[5px] py-px text-[0.65rem] font-semibold leading-normal text-muted"
          >
            {{ fmt(row.combo) }}
          </kbd>
          <span
            v-else
            class="whitespace-nowrap font-mono text-[0.6875rem] text-muted"
          >
            {{ row.syntax }}
          </span>
        </div>
      </section>

      <!-- Tools -->
      <section>
        <h5
          class="mb-[0.4rem] text-[0.625rem] font-bold uppercase tracking-[0.09em] text-muted"
        >
          {{ t("editor.shortcuts.groups.tools") }}
        </h5>
        <div
          v-for="row in toolRows"
          :key="row.label"
          class="flex items-center gap-2.5 border-b border-border/55 py-1 text-[0.8125rem] text-ink"
        >
          <span class="min-w-0 flex-1">{{ row.label }}</span>
          <kbd
            class="whitespace-nowrap rounded-[5px] border border-b-2 border-border bg-bg px-[5px] py-px text-[0.65rem] font-semibold leading-normal text-muted"
          >
            {{ fmt(row.combo) }}
          </kbd>
        </div>
      </section>
    </div>
  </Dialog>
</template>
