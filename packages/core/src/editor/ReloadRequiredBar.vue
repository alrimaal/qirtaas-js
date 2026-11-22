<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "primevue/button";

const { t } = useI18n();
const reload = () => window.location.reload();
</script>

<template>
  <div
    role="alert"
    class="flex items-center gap-3 rounded-lg border border-border bg-raise px-3 py-2 text-sm shadow-sm"
  >
    <i class="pi pi-refresh shrink-0 text-muted" />
    <span class="flex-1 min-w-0">{{ t("errors.reloadRequired") }}</span>
    <Button
      :label="t('errors.reload')"
      size="small"
      @click="reload"
    />
  </div>
</template>
