<script setup lang="ts">
import { getOverlayAppendTo } from "../mount/overlay";
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import {
  requestUploadUrl,
  uploadToPresignedUrl,
  confirmUpload,
} from "@qirtaas/core/services/images";

const props = defineProps<{ file: File | null }>();

const emit = defineEmits<{
  uploaded: [imageId: string];
  cancel: [];
}>();

const { t } = useI18n();

const visible = ref(false);
const errored = ref(false);
let aborted = false;

watch(
  () => props.file,
  (file) => {
    if (file) {
      visible.value = true;
      errored.value = false;
      aborted = false;
      void run(file);
    } else {
      visible.value = false;
    }
  },
);

async function run(file: File) {
  errored.value = false;
  try {
    const ticket = await requestUploadUrl(file.name, file.type);
    if (aborted) return;
    await uploadToPresignedUrl(ticket.upload_url, file);
    if (aborted) return;
    await confirmUpload(ticket.image_id);
    if (aborted) return;
    visible.value = false;
    emit("uploaded", ticket.image_id);
  } catch {
    if (!aborted) errored.value = true;
  }
}

function retry() {
  if (props.file) void run(props.file);
}

function cancel() {
  aborted = true;
  visible.value = false;
  emit("cancel");
}
</script>

<template>
  <Dialog :append-to="getOverlayAppendTo()"
    v-model:visible="visible"
    :modal="true"
    :closable="true"
    :draggable="false"
    :show-header="false"
    :dismissable-mask="false"
    :close-on-escape="true"
    class="!w-[min(420px,90vw)]"
    @hide="cancel"
  >
    <div class="flex flex-col items-center gap-4 py-6 px-4 text-center">
      <template v-if="!errored">
        <i class="pi pi-spin pi-spinner text-3xl text-accent" />
        <div class="flex flex-col gap-1">
          <p class="text-ink font-semibold">
            {{ t("editor.image.uploading") }}
          </p>
          <p class="text-muted text-sm break-all">
            {{ props.file?.name ?? "" }}
          </p>
        </div>
        <Button
          size="small"
          severity="secondary"
          text
          :label="t('editor.image.cancel')"
          @click="cancel"
        />
      </template>
      <template v-else>
        <i class="pi pi-exclamation-triangle text-3xl text-red-500" />
        <div class="flex flex-col gap-1">
          <p class="text-ink font-semibold">
            {{ t("editor.image.uploadFailed") }}
          </p>
          <p class="text-muted text-sm break-all">
            {{ props.file?.name ?? "" }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Button
            size="small"
            severity="secondary"
            :label="t('editor.image.cancel')"
            @click="cancel"
          />
          <Button
            size="small"
            icon="pi pi-refresh"
            class="!bg-primary !text-white hover:!opacity-90"
            :label="t('editor.image.retry')"
            @click="retry"
          />
        </div>
      </template>
    </div>
  </Dialog>
</template>
