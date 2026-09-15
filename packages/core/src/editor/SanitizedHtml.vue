<script lang="ts">
import type { Config } from "dompurify";

const POLICIES = {
  // Sidebar panels: a full block of prose, structure and all.
  block: {
    ALLOWED_TAGS: [
      "p",
      "br",
      "b",
      "i",
      "em",
      "strong",
      "sup",
      "sub",
      "span",
      "div",
      "h1",
      "h2",
      "h3",
      "h4",
      "ol",
      "ul",
      "li",
    ],
    ALLOWED_ATTR: ["dir", "class"],
  },
  // Node-view strips. The wrapper is a <span> inside contenteditable, so this
  // stays close to inline — <p> is the one exception, kept because hadith
  // translations arrive as paragraphs and flattening them runs the text
  // together.
  inline: {
    ALLOWED_TAGS: ["p", "br", "b", "i", "em", "strong", "sup", "sub", "span"],
    ALLOWED_ATTR: ["dir", "class"],
  },
  // Hadith card/inline quote: `inline` minus what breaks a one-line quote —
  // footnote markers and line breaks.
  compact: {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "sub", "span"],
    ALLOWED_ATTR: ["dir", "class"],
  },
  // Backend-built search excerpt: matched words arrive wrapped in <mark>.
  highlight: {
    ALLOWED_TAGS: ["mark"],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },
} satisfies Record<string, Config>;

export type SanitizePolicy = keyof typeof POLICIES;
</script>

<script setup lang="ts">
import { computed } from "vue";
import DOMPurify from "dompurify";

const props = withDefaults(
  defineProps<{
    html: string | null | undefined;
    policy?: SanitizePolicy;
    /** Root tag. Defaults to the one that nests legally for the policy. */
    as?: string;
  }>(),
  { policy: "block", as: undefined }
);

const tag = computed(
  () => props.as ?? (props.policy === "block" ? "div" : "span")
);

const clean = computed(() =>
  props.html ? DOMPurify.sanitize(props.html, POLICIES[props.policy]) : ""
);
</script>

<template>
  <component :is="tag" v-html="clean" />
</template>
