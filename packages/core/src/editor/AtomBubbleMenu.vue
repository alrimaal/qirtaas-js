<script setup lang="ts">
import { BubbleMenu } from "@tiptap/vue-3/menus";
import type { Editor } from "@tiptap/vue-3";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { useI18n } from "vue-i18n";
import Button from "primevue/button";

const props = defineProps<{
  editor: Editor;
  nodeTypes: string[];
}>();

const emit = defineEmits<{
  action: [nodeType: string, attrs: Record<string, unknown>];
}>();

const { t } = useI18n();

function shouldShow() {
  const { selection } = props.editor.state;
  if (!(selection instanceof NodeSelection)) return false;
  return props.nodeTypes.includes(selection.node.type.name);
}

function getSelectedAttrs() {
  const { selection } = props.editor.state;
  if (!(selection instanceof NodeSelection)) return null;
  return selection.node.attrs;
}

function dismiss() {
  const { selection } = props.editor.state;
  if (!(selection instanceof NodeSelection)) return;
  const pos = selection.$from.pos + selection.node.nodeSize;
  const tr = props.editor.state.tr.setSelection(
    TextSelection.create(props.editor.state.doc, pos)
  );
  props.editor.view.dispatch(tr);
}

function onAction() {
  const { selection } = props.editor.state;
  if (!(selection instanceof NodeSelection)) return;
  const nodeType = selection.node.type.name;
  const attrs = selection.node.attrs;
  dismiss();
  emit("action", nodeType, attrs);
}

function copyNode() {
  props.editor.view.focus();
  document.execCommand("copy");
  dismiss();
}

function deleteNode() {
  props.editor.chain().focus().deleteSelection().run();
}
</script>

<template>
  <BubbleMenu
    :editor="props.editor"
    :should-show="shouldShow"
    class="z-20"
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
      <slot name="action" :attrs="getSelectedAttrs()" :on-action="onAction" />
      <Button
        severity="secondary"
        text
        rounded
        size="small"
        :label="t('editor.atom.copy')"
        @click="copyNode"
      >
        <template #icon>
          <i class="pi pi-copy text-xs" />
        </template>
      </Button>
      <span class="w-px h-4 bg-border mx-0.5 shrink-0" />
      <Button
        v-tooltip.bottom="t('editor.atom.delete')"
        severity="danger"
        text
        rounded
        size="small"
        @click="deleteNode"
      >
        <i class="pi pi-trash text-xs" />
      </Button>
    </div>
  </BubbleMenu>
</template>
