<script setup>
/** 页面 2 · 注册页：账号注册 + 密码强度 + 手机/邮箱验证 */
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api'

const router = useRouter()
const step = ref(1) // 1 填写信息 → 2 验证 → 3 完成
const formRef = ref(null)
const loading = ref(false)
const smsCountdown = ref(0)
let smsTimer = null

const form = reactive({
  username: '', name: '', phone: '', email: '', smsCode: '',
  password: '', confirmPassword: '', agree: false,
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_]{3,15}$/, message: '4-16 位，字母开头，可含数字下划线', trigger: 'blur' },
  ],
  name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  password: [
    { required: true, message: '请设置密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度 6-20 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: (_r, v, cb) => (v === form.password ? cb() : cb(new Error('两次输入的密码不一致'))), trigger: 'blur' },
  ],
  smsCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码为 6 位数字', trigger: 'blur' },
  ],
}

const strength = computed(() => {
  const p = form.password
  let s = 0
  if (p.length >= 6) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
})
const strengthText = ['', '弱', '中', '较强', '强'][strength.value]
const strengthColor = ['', '#E84A5F', '#E89552', '#4C6983', '#699C78'][strength.value]

async function nextStep() {
  await formRef.value.validate()
  step.value = 2
  sendSms()
}
function sendSms() {
  ElMessage.success(`验证码已发送至 ${form.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}（演示验证码：123456）`)
  smsCountdown.value = 60
  smsTimer = setInterval(() => {
    if (--smsCountdown.value <= 0) clearInterval(smsTimer)
  }, 1000)
}
async function handleRegister() {
  if (form.smsCode !== '123456') {
    ElMessage.error('验证码不正确（演示验证码：123456）')
    return
  }
  loading.value = true
  try {
    await authApi.register({ username: form.username, password: form.password, name: form.name, phone: form.phone, email: form.email, dept: '种植一组' })
    step.value = 3
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    loading.value = false
  }
}
function goLogin() {
  router.push('/login')
}
onMounted(async () => {
  await nextTick()
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-card anim-zoom">
      <div class="auth-side">
        <svg viewBox="0 0 48 48" class="side-logo" aria-hidden="true">
          <rect x="2" y="2" width="44" height="44" rx="12" fill="rgba(255,255,255,.14)" />
          <path d="M24 38c0-9 3-16 12-21 1 12-4 19-12 21zm0 0c0-7-2.5-12.5-9.5-16.5C13.6 30.5 18 36.2 24 38z" fill="#fff" />
        </svg>
        <h2>加入智慧农业平台</h2>
        <p>注册后由系统管理员审核并分配角色权限</p>
        <el-steps direction="vertical" :active="step - 1" class="steps">
          <el-step title="填写基本信息" description="账号、姓名与联系方式" />
          <el-step title="身份验证" description="短信验证码核验" />
          <el-step title="注册完成" description="等待管理员分配权限" />
        </el-steps>
      </div>

      <div class="auth-main">
        <!-- 步骤 1 -->
        <el-form v-if="step === 1" ref="formRef" :model="form" :rules="rules" label-position="top" size="large">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="字母开头，4-16 位" :prefix-icon="'User'" />
          </el-form-item>
          <el-form-item label="真实姓名" prop="name">
            <el-input v-model="form.name" placeholder="用于工单派发与考勤统计" :prefix-icon="'Postcard'" />
          </el-form-item>
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" placeholder="接收告警与工单通知" :prefix-icon="'Iphone'" maxlength="11" />
          </el-form-item>
          <el-form-item label="邮箱（选填）" prop="email">
            <el-input v-model="form.email" placeholder="example@agri.com" :prefix-icon="'Message'" />
          </el-form-item>
          <el-form-item label="设置密码" prop="password">
            <el-input v-model="form.password" type="password" show-password placeholder="6-20 位" :prefix-icon="'Lock'" />
            <div v-if="form.password" class="strength">
              <span class="s-label">密码强度</span>
              <span class="s-bars">
                <i v-for="i in 4" :key="i" :style="{ background: i <= strength ? strengthColor : 'var(--ag-border)' }"></i>
              </span>
              <span class="s-text" :style="{ color: strengthColor }">{{ strengthText }}</span>
            </div>
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="form.confirmPassword" type="password" show-password placeholder="再次输入密码" :prefix-icon="'Lock'" />
          </el-form-item>
          <el-form-item>
            <el-checkbox v-model="form.agree">
              我已阅读并同意 <a>《平台用户协议》</a> 与 <a>《隐私政策》</a>
            </el-checkbox>
          </el-form-item>
          <el-button type="primary" size="large" class="w-full" :disabled="!form.agree" @click="nextStep">下一步：身份验证</el-button>
        </el-form>

        <!-- 步骤 2 -->
        <div v-else-if="step === 2" class="verify-box anim-up">
          <el-result icon="success" title="等待短信验证" :sub-title="`验证码已发送至 ${form.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}，演示验证码 123456`">
            <template #extra>
              <el-form size="large" @submit.prevent="handleRegister">
                <el-form-item prop="smsCode" :rules="rules.smsCode">
                  <el-input v-model="form.smsCode" placeholder="6 位验证码" maxlength="6" style="width: 240px">
                    <template #append>
                      <el-button :disabled="smsCountdown > 0" @click="sendSms">{{ smsCountdown > 0 ? `${smsCountdown}s` : '重新发送' }}</el-button>
                    </template>
                  </el-input>
                </el-form-item>
                <el-button type="primary" size="large" class="w-full" :loading="loading" native-type="submit">完成注册</el-button>
              </el-form>
            </template>
          </el-result>
        </div>

        <!-- 步骤 3 -->
        <div v-else class="verify-box anim-zoom">
          <el-result icon="success" title="注册成功！" sub-title="账号已创建，系统管理员审核通过并分配权限后即可登录">
            <template #extra>
              <el-button type="primary" size="large" @click="goLogin">前往登录</el-button>
            </template>
          </el-result>
        </div>

        <div class="to-login">已有账号？<router-link to="/login">直接登录</router-link></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  /* 决策依据：原为装饰性光斑（两层 radial-gradient 氛围光），按简约高级规范改为平底 */
  background: var(--ag-bg-page);
  padding: 26px;
}
.auth-card {
  width: min(880px, 100%);
  min-height: 620px;
  background: #fff;
  border-radius: var(--ag-radius-lg); /* 决策依据：注册主卡片属大块面板，对齐浮层档 14px */
  box-shadow: var(--ag-shadow-lg);
  display: grid;
  grid-template-columns: 340px 1fr;
  overflow: hidden;
}
.auth-side {
  /* 决策依据：原为装饰性光斑与多段深色渐变，均不承载信息，按简约高级规范改为单一深色实底 */
  background: #1c2a3c;
  color: #fff;
  padding: 36px 28px;
  display: flex;
  flex-direction: column;
}
.side-logo {
  width: 44px;
  height: 44px;
  margin-bottom: 20px;
}
.auth-side h2 {
  margin: 0 0 8px;
  font-size: 20px;
  letter-spacing: 1px;
}
.auth-side p {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 30px;
  line-height: 1.7;
}
.steps {
  --el-color-primary: #7DC383;
}
.auth-main {
  padding: 40px 44px;
  overflow-y: auto;
  max-height: 620px;
}
.strength {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 4px;
}
.s-label {
  font-size: 12px;
  color: var(--ag-text-3);
}
.s-bars {
  display: flex;
  gap: 4px;
}
.s-bars i {
  width: 34px;
  height: 4px;
  border-radius: 2px;
  transition: background 0.3s;
}
.s-text {
  font-size: 12px;
}
.verify-box {
  padding-top: 30px;
}
.w-full {
  width: 100%;
}
.to-login {
  margin-top: 18px;
  font-size: 13px;
  color: var(--ag-text-3);
  text-align: center;
}
@media (max-width: 820px) {
  .auth-card {
    grid-template-columns: 1fr;
  }
  .auth-side {
    display: none;
  }
}
</style>
