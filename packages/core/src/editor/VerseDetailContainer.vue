<script setup lang="ts">
import { computed, watch } from "vue";
import Drawer from "primevue/drawer";
import { useIsDark } from "./runtime/context";
import VerseDetailPanel from "./VerseDetailPanel.vue";
import HadithDetailPanel from "./HadithDetailPanel.vue";
import { useVerseDetail } from "@qirtaas/core/composables/useVerseDetail";
import { useHadithDetail } from "@qirtaas/core/composables/useHadithDetail";
import { useIsMobile } from "@qirtaas/core/composables/useIsMobile";

// `overlay`: always present the detail as the bottom drawer instead of the
// desktop side-dock. The dock is a flex-row child that only lays out inside the
// SPA's flex-row shell; the embed shells stack children in a plain block, so
// they pass `overlay` to get the host-layout-independent drawer.
const props = defineProps<{ overlay?: boolean }>();

const verseDetail = useVerseDetail();
const hadithDetail = useHadithDetail();
const { isMobile } = useIsMobile();

const isAnyOpen = computed(
  () => verseDetail.isOpen.value || hadithDetail.isOpen.value,
);

// Close the other panel when one opens
watch(
  () => verseDetail.isOpen.value,
  (open) => {
    if (open) hadithDetail.close();
  },
);
watch(
  () => hadithDetail.isOpen.value,
  (open) => {
    if (open) verseDetail.close();
  },
);

function closeAll() {
  verseDetail.close();
  hadithDetail.close();
}

const useDrawer = computed(() => isMobile.value || props.overlay);

const drawerVisible = computed({
  get: () => useDrawer.value && isAnyOpen.value,
  set: (v: boolean) => {
    if (!v) closeAll();
  },
});

// PrimeVue 4.5.4's Drawer (like Toast) builds its Portal with no props, so it
// ignores `appendTo` and always renders to <body> — outside our scope. In embed
// (overlay) mode we therefore stamp the scope + theme onto the drawer root so
// host CSS can't leak into the panel. (SPA keeps its global styles.)
const isDark = useIsDark();
const drawerRootClass = computed(() =>
  props.overlay ? ["qirtaas-scope", isDark.value ? "qirtaas-dark" : ""] : [],
);
// Height is set inline, NOT via a `!h-[75vh]` utility: the embed scopes every
// Tailwind utility as a descendant of `.qirtaas-scope` (`.qirtaas-scope .h-…`),
// but the drawer teleports to <body> with `qirtaas-scope` stamped on the root
// itself — so it has no scope *ancestor* and root-level utilities never match.
// An inline style sidesteps the descendant selector entirely.
</script>

<template>
  <!-- Desktop docked panel (animated) -->
  <Transition name="verse-panel">
    <aside
      v-if="!useDrawer && isAnyOpen"
      class="hidden md:flex w-[380px] shrink-0 overflow-hidden"
    >
      <VerseDetailPanel v-if="verseDetail.isOpen.value" class="w-full" />
      <HadithDetailPanel v-if="hadithDetail.isOpen.value" class="w-full" />
    </aside>
  </Transition>

  <!-- Mobile bottom sheet -->
  <Drawer
    v-model:visible="drawerVisible"
    position="bottom"
    :pt="{
      root: { class: drawerRootClass, style: 'height:75vh' },
      content: { class: '!p-0' },
      header: { class: '!hidden' },
    }"
  >
    <VerseDetailPanel v-if="verseDetail.isOpen.value" class="h-full" />
    <HadithDetailPanel v-if="hadithDetail.isOpen.value" class="h-full" />
  </Drawer>
</template>

<style scoped>
.verse-panel-enter-active,
.verse-panel-leave-active {
  transition: width 0.25s ease, opacity 0.25s ease;
}
.verse-panel-enter-from,
.verse-panel-leave-to {
  width: 0 !important;
  opacity: 0;
}
</style>
