<script setup>
/** 表单弹窗：统一「校验 + 提示 + 二次确认」交互 */
import { ref, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: [String, Number], default: 560 },
  rules: { type: Object, default: () => ({}) },
  model: { type: Object, default: () => ({}) },
  submitText: { type: String, default: '确 定' },
  submitLoading: { type: Boolean, default: false },
  hideFooter: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'submit'])

const formRef = ref(null)
const visible = ref(props.modelValue)

watch(() => props.modelValue, async (v) => {
  visible.value = v
  if (v) {
    await nextTick()
    formRef.value?.clearValidate()
  }
})
watch(visible, (v) => emit('update:modelValue', v))

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('请检查表单填写内容')
    return
  }
  emit('submit', { ...props.model })
}
defineExpose({ formRef })
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="width"
    destroy-on-close
    append-to-body
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="model" :rules="rules" label-width="100px" @submit.prevent>
      <slot />
    </el-form>
    <template v-if="!hideFooter" #footer>
      <el-button @click="visible = false">取 消</el-button>
      <el-button type="primary" :loading="submitLoading" @click="handleSubmit">{{ submitText }}</el-button>
    </template>
  </el-dialog>
</template>
