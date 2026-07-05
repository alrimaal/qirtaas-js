import { ref, onMounted, onBeforeUnmount } from "vue";

const MOBILE_QUERY = "(max-width: 767px)";

export function useIsMobile() {
  const isMobile = ref(false);
  let mq: MediaQueryList | null = null;

  function onMqChange(e: MediaQueryListEvent) {
    isMobile.value = e.matches;
  }

  onMounted(() => {
    mq = window.matchMedia(MOBILE_QUERY);
    isMobile.value = mq.matches;
    mq.addEventListener("change", onMqChange);
  });

  onBeforeUnmount(() => {
    mq?.removeEventListener("change", onMqChange);
  });

  return { isMobile };
}
