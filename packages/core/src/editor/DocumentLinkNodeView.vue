<script setup lang="ts">
import { computed } from "vue";
import { NodeViewWrapper } from "@tiptap/vue-3";
import { useI18n } from "vue-i18n";
import { useDocumentLinkHost } from "./runtime/context";

const props = defineProps<{
  node: { attrs: { targetDocId: string; label: string } };
}>();

const { t, locale } = useI18n();
const host = useDocumentLinkHost();

const liveDoc = computed(() =>
  host.documents.value.find((d) => d.id === props.node.attrs.targetDocId)
);

// Live title wins (renames propagate through the host's reactive list); the
// persisted label snapshot covers hosts without live data. A host with data
// but no match means the target was deleted.
const title = computed(
  () =>
    liveDoc.value?.title ||
    props.node.attrs.label ||
    t("editor.pageLink.untitled")
);

const isBroken = computed(
  () => host.enabled && host.documents.value.length > 0 && !liveDoc.value
);

const tooltip = computed(() => {
  if (isBroken.value) return t("editor.pageLink.deleted");
  const updated = liveDoc.value?.updated_at;
  if (!updated) return title.value;
  return new Date(updated).toLocaleDateString(
    locale.value === "ar" ? "ar-SA" : "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );
});

function open() {
  if (!host.enabled || isBroken.value) return;
  host.openDocument(props.node.attrs.targetDocId);
}
</script>

<template>
  <NodeViewWrapper as="span" class="inline" contenteditable="false">
    <span
      :class="[
        'document-link-chip',
        isBroken
          ? 'document-link-chip--broken'
          : host.enabled
            ? 'document-link-chip--active'
            : '',
      ]"
      :title="tooltip"
      @click="open"
    >
      <i class="pi pi-file document-link-chip__icon" />
      <span class="document-link-chip__label">{{ title }}</span>
    </span>
  </NodeViewWrapper>
</template>

<style scoped>
.document-link-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  max-width: 16em;
  padding: 0.05em 0.45em;
  border-radius: 0.375em;
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
  color: var(--color-ink);
  vertical-align: baseline;
  font-size: 0.925em;
  line-height: 1.5;
}

.document-link-chip--active {
  cursor: pointer;
}

.document-link-chip--active:hover {
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
}

.document-link-chip--broken {
  color: var(--color-muted);
  text-decoration: line-through;
  cursor: default;
}

.document-link-chip__icon {
  font-size: 0.75em;
  color: var(--color-accent);
  flex-shrink: 0;
}

.document-link-chip--broken .document-link-chip__icon {
  color: var(--color-muted);
}

.document-link-chip__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
