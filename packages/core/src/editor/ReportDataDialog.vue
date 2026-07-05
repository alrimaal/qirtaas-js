<script setup lang="ts">
import { getOverlayAppendTo } from "../mount/overlay";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";
import * as Sentry from "@sentry/vue";
import Dialog from "primevue/dialog";
import Textarea from "primevue/textarea";
import Button from "primevue/button";

const props = defineProps<{
  visible: boolean;
  kind: "quran" | "hadith";
  reference: string;
}>();
const emit = defineEmits<{ "update:visible": [value: boolean] }>();

const { t } = useI18n();
const toast = useToast();

const message = ref("");
const submitting = ref(false);

watch(
  () => props.visible,
  (open) => {
    if (open) {
      message.value = "";
      submitting.value = false;
    }
  }
);

function close() {
  emit("update:visible", false);
}

function submit() {
  const text = message.value.trim();
  if (!text || submitting.value) return;
  submitting.value = true;
  try {
    Sentry.captureFeedback({
      message: text,
      tags: { kind: props.kind, reference: props.reference },
      source: "report-data-dialog",
    });
    toast.add({
      severity: "success",
      summary: t("reportData.success"),
      life: 3000,
    });
    close();
  } catch (e) {
    console.error(e);
    toast.add({
      severity: "error",
      summary: t("reportData.error"),
      life: 4000,
    });
    submitting.value = false;
  }
}
</script>

<template>
  <Dialog :append-to="getOverlayAppendTo()"
    :visible="props.visible"
    @update:visible="close"
    :header="t('reportData.title')"
    modal
    :style="{ width: '28rem' }"
    :dismissableMask="true"
  >
    <div class="space-y-3">
      <p class="text-xs text-muted">
        {{ t("reportData.referenceLabel") }}
        <span class="font-mono text-ink">{{ props.reference }}</span>
      </p>
      <Textarea
        v-model="message"
        :placeholder="t('reportData.placeholder')"
        rows="5"
        autofocus
        class="!w-full"
      />
    </div>

    <template #footer>
      <Button
        :label="t('reportData.cancel')"
        severity="secondary"
        text
        @click="close"
      />
      <Button
        :label="t('reportData.submit')"
        icon="pi pi-send"
        :disabled="!message.trim() || submitting"
        :loading="submitting"
        @click="submit"
      />
    </template>
  </Dialog>
</template>
