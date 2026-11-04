<script setup>
/** 页面 5 · 修改密码：当前密码验证 + 新密码 + 确认密码 */
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { PageHeader } from '@/components/ui'
import { authApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)

const form = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
const rules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度 6-20 位', trigger: 'blur' },
    { validator: (_r, v, cb) => (v !== form.oldPassword ? cb() : cb(new Error('新密码不能与当前密码相同'))), trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: (_r, v, cb) => (v === form.newPassword ? cb() : cb(new Error('两次输入的密码不一致'))), trigger: 'blur' },
  ],
}

const strength = computed(() => {
  const p = form.newPassword
  let s = 0
  if (p.length >= 6) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
})

async function handleSubmit() {
  loading.value = true
  try {
    await authApi.changePassword({ ...form })
    ElMessage.success('密码修改成功，请重新登录')
    await auth.logout()
    router.push('/login')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <PageHeader title="修改密码" desc="建议定期更换密码（6-20 位，区分大小写）" />

    <div class="ag-card pwd-card anim-up">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" style="max-width: 480px">
        <el-form-item label="当前密码" prop="oldPassword">
          <el-input v-model="form.oldPassword" type="password" show-password placeholder="请输入当前登录密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="form.newPassword" type="password" show-password placeholder="6-20 位，建议字母+数字+符号" />
          <div v-if="form.newPassword" class="bars">
            <i v-for="i in 4" :key="i" :class="{ on: i <= strength, lv: strength }"></i>
          </div>
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" show-password placeholder="再次输入新密码" @keyup.enter="handleSubmit" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">确认修改</el-button>
          <el-button @click="router.back()">取 消</el-button>
        </el-form-item>
        <el-alert type="warning" :closable="false" show-icon title="修改成功后将强制退出登录，需使用新密码重新登录" />
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.pwd-card {
  padding: 30px;
  max-width: 640px;
}
.bars {
  display: flex;
  gap: 5px;
  width: 100%;
  margin-top: 6px;
}
.bars i {
  height: 4px;
  flex: 1;
  border-radius: 2px;
  background: var(--ag-border);
  transition: background 0.3s;
}
.bars i.on.lv-1 { background: #E84A5F; }
.bars i.on.lv-2 { background: #c9803e; }
.bars i.on.lv-3 { background: #4C6983; }
.bars i.on.lv-4 { background: #558162; }
</style>
