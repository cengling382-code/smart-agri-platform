<script setup>
/** 页面 3 · 忘记密码：手机验证码核验 → 重置密码 */
import { ref, reactive, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const countdown = ref(0)
let timer = null

const form = reactive({ phone: '', smsCode: '', password: '', confirmPassword: '' })

const rules = {
  phone: [
    { required: true, message: '请输入绑定手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  smsCode: [{ required: true, len: 6, message: '请输入 6 位验证码', trigger: 'blur' }],
  password: [
    { required: true, message: '请设置新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度 6-20 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: (_r, v, cb) => (v === form.password ? cb() : cb(new Error('两次输入不一致'))), trigger: 'blur' },
  ],
}

function sendSms() {
  if (!/^1[3-9]\d{9}$/.test(form.phone)) {
    ElMessage.warning('请先输入正确的手机号')
    return
  }
  ElMessage.success('验证码已发送（演示验证码：123456）')
  countdown.value = 60
  timer = setInterval(() => {
    if (--countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

async function handleReset() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await authApi.resetPassword({
      phone: form.phone,
      smsCode: form.smsCode,
      password: form.password,
    })
    ElMessage.success('密码重置成功，请使用新密码登录')
    router.push('/login')
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="forgot-page">
    <div class="forgot-card anim-zoom">
      <button class="back" aria-label="返回登录" @click="router.push('/login')">
        <el-icon><ArrowLeft /></el-icon> 返回登录
      </button>
      <h2 class="title">找回密码</h2>
      <p class="sub">通过绑定的手机号验证身份，即可重置登录密码</p>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large">
        <el-form-item label="绑定手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入 11 位手机号" :prefix-icon="'Iphone'" maxlength="11" />
        </el-form-item>
        <el-form-item label="短信验证码" prop="smsCode">
          <div class="sms-row">
            <el-input v-model="form.smsCode" placeholder="6 位验证码" maxlength="6" :prefix-icon="'Key'" />
            <el-button :disabled="countdown > 0" @click="sendSms">{{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}</el-button>
          </div>
        </el-form-item>
        <el-form-item label="新密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="6-20 位新密码" :prefix-icon="'Lock'" />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" show-password placeholder="再次输入新密码" :prefix-icon="'Lock'" @keyup.enter="handleReset" />
        </el-form-item>
        <el-button type="primary" size="large" class="reset-btn" :loading="loading" @click="handleReset">重置密码</el-button>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.forgot-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  /* 决策依据：原为装饰性光斑（两层 radial-gradient 氛围光），按简约高级规范改为平底 */
  background: var(--ag-bg-page);
  padding: 24px;
}
.forgot-card {
  width: min(440px, 100%);
  background: #fff;
  border-radius: var(--ag-radius-lg); /* 决策依据：找回密码卡片属大块面板，对齐浮层档 14px */
  box-shadow: var(--ag-shadow-lg);
  padding: 36px 38px 42px;
  position: relative;
}
.back {
  position: absolute;
  top: 18px;
  left: 18px;
  border: none;
  background: transparent;
  color: var(--ag-text-3);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  transition: color 0.2s;
}
.back:hover {
  color: var(--ag-green-600);
}
.title {
  margin: 14px 0 6px;
  font-size: 24px;
}
.sub {
  color: var(--ag-text-3);
  font-size: 13px;
  margin: 0 0 24px;
}
.sms-row {
  display: flex;
  gap: 10px;
  width: 100%;
}
.reset-btn {
  width: 100%;
  margin-top: 6px;
  letter-spacing: 4px;
}
</style>
