<script setup lang="ts">
import { getOverlayAppendTo } from "../mount/overlay";
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Editor } from "@tiptap/vue-3";
import { useIsDark } from "./runtime/context";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Popover from "primevue/popover";
import SplitButton from "primevue/splitbutton";
import { Search, ListCollapse, ListOrdered, Highlighter } from "lucide-vue-next";
import { HONORIFICS, isHonorificType } from "./honorifics";
import { HIGHLIGHT_COLORS, insertToggleList, setAlign } from "./commands";
import { trackHonorificInserted } from "./extensions/Honorific";
import {
  TEXT_COLORS,
  textColorVar,
  type TextColorName,
} from "./extensions/TextColor";

const props = withDefaults(
  defineProps<{
    editor: Editor | undefined;
    /** When false, the image button is hidden. */
    images?: boolean;
  }>(),
  { images: true }
);
const emit = defineEmits<{
  "open-quran": [];
  "open-hadith": [];
  "insert-table": [];
  "open-find-replace": [];
  "insert-image": [file: File];
}>();

const imageInput = ref<HTMLInputElement | null>(null);

function pickImage() {
  imageInput.value?.click();
}

function onImageChosen(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) emit("insert-image", file);
  target.value = "";
}
const { t, locale } = useI18n();
const isDark = useIsDark();

// Honorifics offered in the Insert menu, from the shared registry.
const honorificItems = computed(() =>
  HONORIFICS.map((h) => ({
    label: locale.value === "ar" ? h.ar : h.en,
    glyph: h.glyph,
    command: () => insertHonorific(h.id),
  }))
);

const alignments = computed(() => {
  const items = [
    { value: "left" as const, icon: "pi pi-align-left" },
    { value: "center" as const, icon: "pi pi-align-center" },
    { value: "right" as const, icon: "pi pi-align-right" },
  ];
  return locale.value === "ar" ? [...items].reverse() : items;
});

const headingPopover = ref();
const alignPopover = ref();
const highlightPopover = ref();
const textColorPopover = ref();
const linkPopover = ref();
const linkUrl = ref("");

const highlightColors = HIGHLIGHT_COLORS;

const activeHeadingLabel = computed(() => {
  const e = props.editor;
  if (!e) return "H";
  for (const level of [1, 2, 3] as const) {
    if (e.isActive("heading", { level })) return `H${level}`;
  }
  return "H";
});

const activeAlignIcon = computed(() => {
  const e = props.editor;
  if (!e) return "pi pi-align-left";
  if (e.isActive({ textAlign: "center" })) return "pi pi-align-center";
  if (e.isActive({ textAlign: "right" })) return "pi pi-align-right";
  return "pi pi-align-left";
});

const hasAlign = computed(() =>
  (["left", "center", "right"] as const).some((a) =>
    props.editor?.isActive({ textAlign: a })
  )
);

function toggleHeadingPopover(event: Event) {
  headingPopover.value.toggle(event);
}

function toggleAlignPopover(event: Event) {
  alignPopover.value.toggle(event);
}

function onInsertToggleList() {
  insertToggleList(props.editor!);
}

function insertHonorific(type: string) {
  props
    .editor!.chain()
    .focus()
    .insertContent({ type: "honorific", attrs: { type } })
    .run();
  if (isHonorificType(type)) trackHonorificInserted(type, "toolbar");
}

function toggleHighlightPopover(event: Event) {
  highlightPopover.value.toggle(event);
}

function applyHighlight(color: string) {
  props.editor!.chain().focus().toggleHighlight({ color }).run();
  highlightPopover.value.hide();
}

function removeHighlight() {
  props.editor!.chain().focus().unsetHighlight().run();
  highlightPopover.value.hide();
}

// Current text colour, for the button's underline swatch.
const activeTextColor = computed<TextColorName | null>(
  () => props.editor?.getAttributes("textColor").color ?? null
);

function applyTextColor(color: TextColorName | null) {
  const chain = props.editor!.chain().focus();
  (color ? chain.setTextColor(color) : chain.unsetTextColor()).run();
  textColorPopover.value.hide();
}

function toggleLinkPopover(event: Event) {
  const existing = props.editor!.getAttributes("link").href;
  linkUrl.value = existing || "";
  linkPopover.value.toggle(event);
}

function applyLink() {
  const url = linkUrl.value.trim();
  if (url) {
    props.editor!.chain().focus().setLink({ href: url }).run();
  } else {
    props.editor!.chain().focus().unsetLink().run();
  }
  linkPopover.value.hide();
}

function removeLink() {
  props.editor!.chain().focus().unsetLink().run();
  linkPopover.value.hide();
}
</script>

<template>
  <div
    v-if="props.editor"
    class="flex items-center gap-1 px-0 py-2 overflow-x-auto flex-nowrap scrollbar-hide"
  >
    <!-- Quran / Hadith -->
    <Button
      size="small"
      severity="secondary"
      class="shrink-0 !bg-primary !text-on-accent !border-primary hover:!opacity-90"
      @click="emit('open-quran')"
    >
      <i class="pi pi-book text-xs" />
      <span class="text-xs font-medium">{{ t("editor.insertQuran") }}</span>
    </Button>
    <Button
      size="small"
      severity="secondary"
      class="shrink-0 !bg-primary !text-on-accent !border-primary hover:!opacity-90"
      @click="emit('open-hadith')"
    >
      <span class="font-[Noto_Naskh_Arabic,serif] text-base leading-none">ح</span>
      <span class="text-xs font-medium">{{ t("editor.insertHadith") }}</span>
    </Button>
    <!-- Honorifics: ﷺ inserts directly, the dropdown offers the rest -->
    <SplitButton
      v-tooltip.bottom="t('editor.insert')"
      :model="honorificItems"
      :append-to="getOverlayAppendTo()"
      severity="secondary"
      text
      size="small"
      class="shrink-0"
      @click="insertHonorific('saw')"
    >
      <span class="honorific-glyph text-base leading-none">ﷺ</span>
      <template #item="{ item, props: itemProps }">
        <a v-bind="itemProps.action" class="flex items-center gap-2">
          <span class="honorific-glyph w-5 text-center text-base leading-none">
            {{ item.glyph }}
          </span>
          <span>{{ item.label }}</span>
        </a>
      </template>
    </SplitButton>

    <span class="w-px h-5 bg-border mx-1 shrink-0" />

    <!-- Undo / Redo -->
    <Button
      v-tooltip.bottom="t('editor.tooltips.undo')"
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :disabled="!props.editor!.can().undo()"
      @click="props.editor!.chain().focus().undo().run()"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="16"
        viewBox="0 -960 960 960"
        width="16"
        fill="currentColor"
      >
        <path
          d="M280-200v-80h284q63 0 109.5-40T720-420q0-60-46.5-100T564-560H312l104 104-56 56-200-200 200-200 56 56-104 104h252q97 0 166.5 63T800-420q0 94-69.5 157T564-200H280Z"
        />
      </svg>
    </Button>
    <Button
      v-tooltip.bottom="t('editor.tooltips.redo')"
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :disabled="!props.editor!.can().redo()"
      @click="props.editor!.chain().focus().redo().run()"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="16"
        viewBox="0 -960 960 960"
        width="16"
        fill="currentColor"
      >
        <path
          d="M396-200q-97 0-166.5-63T160-420q0-94 69.5-157T396-640h252L544-744l56-56 200 200-200 200-56-56 104-104H396q-63 0-109.5 40T240-420q0 60 46.5 100T396-280h284v80H396Z"
        />
      </svg>
    </Button>

    <span class="w-px h-5 bg-border mx-1 shrink-0" />

    <!-- Text formatting -->
    <Button
      v-tooltip.bottom="t('editor.tooltips.bold')"
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :class="{ '!bg-accent/10 !text-accent': props.editor!.isActive('bold') }"
      @click="props.editor!.chain().focus().toggleBold().run()"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="16"
        viewBox="0 -960 960 960"
        width="16"
        fill="currentColor"
      >
        <path
          d="M272-200v-560h221q65 0 120 40t55 111q0 51-23 78.5T602-491q25 11 55.5 41t30.5 90q0 89-65 124.5T501-200H272Zm121-112h104q48 0 58.5-24.5T566-372q0-11-10.5-35.5T494-432H393v120Zm0-228h93q33 0 48-17t15-38q0-24-17-39t-44-15h-95v109Z"
        />
      </svg>
    </Button>
    <Button
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :class="{ '!bg-accent/10 !text-accent': props.editor!.isActive('italic') }"
      v-tooltip.bottom="t('editor.tooltips.italic')"
      @click="props.editor!.chain().focus().toggleItalic().run()"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="16"
        viewBox="0 -960 960 960"
        width="16"
        fill="currentColor"
      >
        <path
          d="M200-200v-100h160l120-360H320v-100h400v100H580L460-300h140v100H200Z"
        />
      </svg>
    </Button>
    <Button
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :class="{ '!bg-accent/10 !text-accent': props.editor!.isActive('underline') }"
      v-tooltip.bottom="t('editor.tooltips.underline')"
      @click="props.editor!.chain().focus().toggleUnderline().run()"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="16"
        viewBox="0 -960 960 960"
        width="16"
        fill="currentColor"
      >
        <path
          d="M200-120v-80h560v80H200Zm123-223q-56-63-56-167v-330h103v336q0 56 28 91t82 35q54 0 82-35t28-91v-336h103v330q0 104-56 167t-157 63q-101 0-157-63Z"
        />
      </svg>
    </Button>
    <Button
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :class="{ '!bg-accent/10 !text-accent': props.editor!.isActive('strike') }"
      v-tooltip.bottom="t('editor.tooltips.strikethrough')"
      @click="props.editor!.chain().focus().toggleStrike().run()"
    >
      <span class="text-sm line-through">S</span>
    </Button>

    <!-- Link -->
    <Button
      v-tooltip.bottom="t('editor.tooltips.link')"
      icon="pi pi-link"
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :class="{ '!bg-accent/10 !text-accent': props.editor!.isActive('link') }"
      @click="toggleLinkPopover"
    />
    <Popover :append-to="getOverlayAppendTo()" ref="linkPopover">
      <div class="flex items-center gap-2 p-1">
        <InputText
          v-model="linkUrl"
          placeholder="https://..."
          size="small"
          class="!text-sm !w-56"
          @keydown.enter="applyLink"
        />
        <Button
          icon="pi pi-check"
          size="small"
          class="!bg-primary !text-on-accent hover:!opacity-90"
          @click="applyLink"
        />
        <Button
          icon="pi pi-times"
          severity="secondary"
          text
          size="small"
          :disabled="!props.editor!.isActive('link')"
          @click="removeLink"
        />
      </div>
    </Popover>

    <!-- Highlight -->
    <Button
      v-tooltip.bottom="t('editor.tooltips.highlight')"
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :class="{ '!bg-accent/10 !text-accent': props.editor!.isActive('highlight') }"
      @click="toggleHighlightPopover"
    >
      <Highlighter :size="16" />
    </Button>
    <Popover :append-to="getOverlayAppendTo()" ref="highlightPopover">
      <div class="flex items-center gap-2 p-1">
        <button
          v-for="c in highlightColors"
          :key="c.id"
          class="w-6 h-6 rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
          :class="props.editor!.isActive('highlight', { color: c.light }) ? 'border-accent' : 'border-transparent'"
          :style="{ backgroundColor: isDark ? c.dark : c.light }"
          :title="t(`editor.highlights.${c.id}`)"
          @click="applyHighlight(c.light)"
        />
        <button
          class="w-6 h-6 rounded-full border-2 border-border cursor-pointer flex items-center justify-center bg-transparent hover:bg-bg-soft"
          title="Remove"
          @click="removeHighlight"
        >
          <i class="pi pi-times text-[0.6rem] text-muted" />
        </button>
      </div>
    </Popover>

    <!-- Text colour -->
    <Button
      v-tooltip.bottom="t('editor.tooltips.textColor')"
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :class="{ '!bg-accent/10 !text-accent': activeTextColor }"
      @click="textColorPopover.toggle($event)"
    >
      <span class="flex flex-col items-center leading-none">
        <span class="text-sm font-semibold">A</span>
        <span
          class="mt-0.5 h-[3px] w-3.5 rounded-full"
          :style="{
            background: activeTextColor
              ? textColorVar(activeTextColor)
              : 'var(--color-ink)',
          }"
        />
      </span>
    </Button>
    <Popover :append-to="getOverlayAppendTo()" ref="textColorPopover">
      <div class="grid grid-cols-6 gap-2 p-1">
        <button
          class="w-6 h-6 rounded-full border-2 border-border cursor-pointer flex items-center justify-center bg-transparent hover:bg-bg-soft"
          :title="t('editor.tooltips.defaultTextColor')"
          @mousedown.prevent
          @click="applyTextColor(null)"
        >
          <i class="pi pi-times text-[0.6rem] text-muted" />
        </button>
        <button
          v-for="c in TEXT_COLORS"
          :key="c"
          class="w-6 h-6 rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
          :class="activeTextColor === c ? 'border-accent' : 'border-transparent'"
          :style="{ backgroundColor: textColorVar(c) }"
          :title="t(`editor.textColors.${c}`)"
          @mousedown.prevent
          @click="applyTextColor(c)"
        />
      </div>
    </Popover>

    <span class="w-px h-5 bg-border mx-1 shrink-0" />

    <!-- Headings dropdown -->
    <Button
      v-tooltip.bottom="t('editor.tooltips.heading')"
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :class="{ '!bg-accent/10 !text-accent': props.editor!.isActive('heading') }"
      @click="toggleHeadingPopover"
    >
      <span class="text-xs font-semibold">{{ activeHeadingLabel }}</span>
      <i class="pi pi-chevron-down text-[0.5rem] ms-1" />
    </Button>
    <Popover :append-to="getOverlayAppendTo()" ref="headingPopover">
      <div class="flex flex-col min-w-32 p-1">
        <button
          v-for="level in [1, 2, 3] as const"
          :key="level"
          class="flex items-center gap-2 w-full py-2 px-3 rounded-md text-start bg-transparent text-ink hover:bg-accent/10 hover:text-accent cursor-pointer border-none font-[inherit]"
          :class="{ '!bg-accent/10 !text-accent': props.editor!.isActive('heading', { level }) }"
          @click="
            props.editor!.chain().focus().toggleHeading({ level }).run();
            headingPopover.hide();
          "
        >
          <span
            class="font-semibold"
            :class="
              level === 1 ? 'text-base' : level === 2 ? 'text-sm' : 'text-xs'
            "
            >H{{ level }}</span
          >
        </button>
      </div>
    </Popover>

    <span class="w-px h-5 bg-border mx-1 shrink-0" />

    <!-- Alignment dropdown -->
    <Button
      v-tooltip.bottom="t('editor.tooltips.align')"
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :class="{ '!bg-accent/10 !text-accent': hasAlign }"
      @click="toggleAlignPopover"
    >
      <i :class="activeAlignIcon" class="text-sm" />
      <i class="pi pi-chevron-down text-[0.5rem] ms-1" />
    </Button>
    <Popover :append-to="getOverlayAppendTo()" ref="alignPopover">
      <div class="flex items-center gap-1 p-1">
        <Button
          v-for="align in alignments"
          :key="align.value"
          :icon="align.icon"
          severity="secondary"
          text
          rounded
          size="small"
          :class="{ '!bg-accent/10 !text-accent': props.editor!.isActive({ textAlign: align.value }) }"
          @click="
            setAlign(props.editor!, align.value);
            alignPopover.hide();
          "
        />
      </div>
    </Popover>

    <span class="w-px h-5 bg-border mx-1 shrink-0" />

    <!-- Block elements -->
    <Button
      v-tooltip.bottom="t('editor.tooltips.bulletList')"
      icon="pi pi-list"
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :class="{ '!bg-accent/10 !text-accent': props.editor!.isActive('bulletList') }"
      @click="props.editor!.chain().focus().toggleBulletList().run()"
    />
    <Button
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :class="{ '!bg-accent/10 !text-accent': props.editor!.isActive('orderedList') }"
      v-tooltip.bottom="t('editor.tooltips.orderedList')"
      @click="props.editor!.chain().focus().toggleOrderedList().run()"
    >
      <ListOrdered :size="16" />
    </Button>
    <Button
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :class="{ '!bg-accent/10 !text-accent': props.editor!.isActive('blockquote') }"
      v-tooltip.bottom="t('editor.tooltips.blockquote')"
      @click="props.editor!.chain().focus().toggleBlockquote().run()"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="16"
        viewBox="0 -960 960 960"
        width="16"
        fill="currentColor"
      >
        <path
          d="m228-240 92-160q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 23-5.5 42.5T458-480L320-240h-92Zm360 0 92-160q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 23-5.5 42.5T818-480L680-240h-92ZM362.5-517.5Q380-535 380-560t-17.5-42.5Q345-620 320-620t-42.5 17.5Q260-585 260-560t17.5 42.5Q295-500 320-500t42.5-17.5Zm360 0Q740-535 740-560t-17.5-42.5Q705-620 680-620t-42.5 17.5Q620-585 620-560t17.5 42.5Q655-500 680-500t42.5-17.5ZM680-560Zm-360 0Z"
        />
      </svg>
    </Button>
    <!-- Toggle list -->
    <Button
      v-tooltip.bottom="t('editor.insertToggleList')"
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      :class="{ '!bg-accent/10 !text-accent': props.editor!.isActive('details') }"
      @click="onInsertToggleList()"
    >
      <ListCollapse :size="16" />
    </Button>
    <Button
      v-tooltip.bottom="t('editor.insertTable')"
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      @click="emit('insert-table')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        height="16"
        viewBox="0 -960 960 960"
        width="16"
        fill="currentColor"
      >
        <path
          d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h160v-200H200v200Zm240 0h160v-200H440v200Zm240 0h80v-200H680v200ZM200-480h160v-200H200v200Zm240 0h160v-200H440v200Zm240 0h80v-200H680v200Z"
        />
      </svg>
    </Button>
    <Button
      v-if="images"
      v-tooltip.bottom="t('editor.insertImage')"
      icon="pi pi-image"
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0"
      @click="pickImage"
    />
    <input
      ref="imageInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onImageChosen"
    />
    <!-- Find & Replace -->
    <Button
      v-tooltip.bottom="t('editor.findReplace.title')"
      severity="secondary"
      text
      rounded
      size="small"
      class="shrink-0 ms-auto"
      @click="emit('open-find-replace')"
    >
      <Search :size="16" />
    </Button>
  </div>
</template>

<style scoped>
/* Insert-menu honorific glyphs: newer code points are tofu in the default font,
   so Kitab (@font-face declared in HonorificView, unicode-range scoped to
   honorific glyphs) renders them. */
.honorific-glyph {
  font-family: "Kitab", serif;
}
</style>
