import { computed, ref, type ComputedRef, type Ref } from "vue";

// A word on the currently-visible page.
export interface PageWord {
  surah: number;
  ayah: number;
  wordIdxInAyah: number;
  globalIdx: number;
  lastInAyah: boolean;
  lineNumber: number;
}

export type InsertMode = "inline" | "mushaf";

export interface Endpoint {
  surah: number;
  ayah: number;
  word: number;
}

export type BlockedReason = "cross-surah-inline";

export interface UseQuranSelection {
  startIdx: Ref<number | null>;
  endIdx: Ref<number | null>;
  mode: Ref<InsertMode>;
  hasSelection: ComputedRef<boolean>;
  rangeLo: ComputedRef<number | null>;
  rangeHi: ComputedRef<number | null>;
  from: ComputedRef<Endpoint | null>;
  to: ComputedRef<Endpoint | null>;
  inlineAllowed: ComputedRef<boolean>;
  isCrossSurah: ComputedRef<boolean>;
  // Last rejected-tap reason, auto-clears after a few seconds. The UI can
  // display a transient hint to explain why nothing happened.
  blockedReason: Ref<BlockedReason | null>;
  tapWord(globalIdx: number): void;
  reset(): void;
  setMode(m: InsertMode): void;
}

/**
 * Selection state machine for the surah-browser mushaf view.
 *
 * Selections are always full-verse aligned — taps snap to verse boundaries.
 * Partial-word selection lives elsewhere (the single-verse slider step).
 *
 * Tap semantics:
 *   • First tap → select the tapped verse.
 *   • Tap a new verse before the current range → extend backward.
 *   • Tap a new verse after the current range → extend forward.
 *   • Tap a verse already inside the range → collapse to just that verse.
 *
 * Inline mode is allowed only when the selection stays within a single surah.
 * Mushaf mode has no extra restriction beyond same-page (enforced upstream).
 */
export function useQuranSelection(
  pageWords: Ref<PageWord[]>,
  initial?: { mode?: InsertMode }
): UseQuranSelection {
  const startIdx = ref<number | null>(null);
  const endIdx = ref<number | null>(null);
  const mode = ref<InsertMode>(initial?.mode ?? "inline");
  const blockedReason = ref<BlockedReason | null>(null);
  let blockedTimer: ReturnType<typeof setTimeout> | null = null;

  function flashBlocked(reason: BlockedReason) {
    blockedReason.value = reason;
    if (blockedTimer) clearTimeout(blockedTimer);
    blockedTimer = setTimeout(() => {
      blockedReason.value = null;
    }, 2500);
  }

  const hasSelection = computed(
    () => startIdx.value !== null && endIdx.value !== null
  );

  const rangeLo = computed(() => {
    if (startIdx.value === null || endIdx.value === null) return null;
    return Math.min(startIdx.value, endIdx.value);
  });
  const rangeHi = computed(() => {
    if (startIdx.value === null || endIdx.value === null) return null;
    return Math.max(startIdx.value, endIdx.value);
  });

  const from = computed<Endpoint | null>(() => {
    const i = rangeLo.value;
    if (i === null) return null;
    const w = pageWords.value[i];
    return w ? { surah: w.surah, ayah: w.ayah, word: w.wordIdxInAyah } : null;
  });
  const to = computed<Endpoint | null>(() => {
    const i = rangeHi.value;
    if (i === null) return null;
    const w = pageWords.value[i];
    return w ? { surah: w.surah, ayah: w.ayah, word: w.wordIdxInAyah } : null;
  });

  const isCrossSurah = computed(() => {
    if (!from.value || !to.value) return false;
    return from.value.surah !== to.value.surah;
  });

  const inlineAllowed = computed(() => !isCrossSurah.value);

  function verseBounds(idx: number): [number, number] | null {
    const w = pageWords.value[idx];
    if (!w) return null;
    let first = idx;
    let last = idx;
    for (let i = idx - 1; i >= 0; i--) {
      const x = pageWords.value[i];
      if (x && x.surah === w.surah && x.ayah === w.ayah) first = i;
      else break;
    }
    for (let i = idx + 1; i < pageWords.value.length; i++) {
      const x = pageWords.value[i];
      if (x && x.surah === w.surah && x.ayah === w.ayah) last = i;
      else break;
    }
    return [first, last];
  }

  function tapWord(i: number) {
    const bounds = verseBounds(i);
    if (!bounds) return;
    const [vStart, vEnd] = bounds;
    const tappedSurah = pageWords.value[vStart]?.surah;

    if (startIdx.value === null || endIdx.value === null) {
      startIdx.value = vStart;
      endIdx.value = vEnd;
      blockedReason.value = null;
      return;
    }

    // Inline mode is single-surah only. Reject taps that would extend the
    // selection into a different surah; the user can Reset first or switch
    // to mushaf mode if they want to cross.
    if (mode.value === "inline") {
      const currentSurah = pageWords.value[startIdx.value]?.surah;
      if (
        currentSurah !== undefined &&
        tappedSurah !== undefined &&
        currentSurah !== tappedSurah
      ) {
        flashBlocked("cross-surah-inline");
        return;
      }
    }
    blockedReason.value = null;

    const lo = Math.min(startIdx.value, endIdx.value);
    const hi = Math.max(startIdx.value, endIdx.value);

    if (vStart >= lo && vEnd <= hi) {
      // Tap inside existing range — collapse to just this verse.
      startIdx.value = vStart;
      endIdx.value = vEnd;
      return;
    }
    if (vEnd < lo) {
      // Extend backward.
      startIdx.value = vStart;
      endIdx.value = hi;
      return;
    }
    if (vStart > hi) {
      // Extend forward.
      startIdx.value = lo;
      endIdx.value = vEnd;
      return;
    }
    // Overlap — union.
    startIdx.value = Math.min(lo, vStart);
    endIdx.value = Math.max(hi, vEnd);
  }

  function reset() {
    startIdx.value = null;
    endIdx.value = null;
  }

  function setMode(m: InsertMode) {
    if (m === "inline" && isCrossSurah.value) {
      flashBlocked("cross-surah-inline");
      return;
    }
    mode.value = m;
  }

  return {
    startIdx,
    endIdx,
    mode,
    hasSelection,
    rangeLo,
    rangeHi,
    from,
    to,
    inlineAllowed,
    isCrossSurah,
    blockedReason,
    tapWord,
    reset,
    setMode,
  };
}
