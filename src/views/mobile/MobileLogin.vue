<script setup>
/** 页面 58 · 移动端登录页：账号密码/验证码登录、记住密码 */
import { reactive, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const mode = ref('password') // password | sms
const loading = ref(false)
const form = reactive({ username: '', password: '', phone: '', smsCode: '', captcha: '' })
const smsCd = ref(0)
let timer = null
const canvasRef = ref(null)
const captchaCode = ref('')

function drawCaptcha() {
  const c = canvasRef.value
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  c.width = 96
  c.height = 34
  ctx.fillStyle = '#f3f4f6'
  ctx.fillRect(0, 0, 96, 34)
  let code = ''
  for (let i = 0; i < 4; i++) {
    const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
    code += ch
    ctx.save()
    ctx.font = `700 ${16 + Math.random() * 4}px Arial`
    ctx.fillStyle = ['#063cb4', '#4c6983', '#c9803e'][i % 3]
    ctx.translate(12 + i * 21, 22)
    ctx.rotate((Math.random() - 0.5) * 0.4)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  }
  captchaCode.value = code
}

async function sendSms() {
  if (!/^1[3-9]\d{9}$/.test(form.phone)) return ElMessage.warning('请输入正确手机号')
  ElMessage.success('验证码已发送（演示：123456）')
  smsCd.value = 60
  timer = setInterval(() => smsCd.value-- <= 1 && clearInterval(timer), 1000)
}

async function login() {
  loading.value = true
  try {
    if (mode.value === 'password') {
      if (form.captcha.trim().toUpperCase() !== captchaCode.value) throw new Error('图形验证码不正确')
      await auth.login({ username: form.username, password: form.password })
    } else {
      if (!/^1[3-9]\d{9}$/.test(form.phone)) throw new Error('请输入正确的手机号')
      await auth.login({ phone: form.phone, smsCode: form.smsCode })
    }
    ElMessage.success(`欢迎，${auth.displayName}`)
    // 未登录跳转登录页时携带的 redirect 仅接受 /m/ 内部路径
    const redirect = route.query.redirect
    const target = typeof redirect === 'string' && redirect.startsWith('/m/') ? redirect : '/m/home'
    router.replace(target)
  } catch (e) {
    ElMessage.error(e.message)
    drawCaptcha()
    form.captcha = ''
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await nextTick()
  drawCaptcha()
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="m-login">
    <div class="ml-hero">
      <svg viewBox="0 0 48 48" class="ml-logo" aria-hidden="true">
        <rect x="2" y="2" width="44" height="44" rx="12" fill="rgba(255,255,255,.16)" />
        <path d="M24 38c0-9 3-16 12-21 1 12-4 19-12 21zm0 0c0-7-2.5-12.5-9.5-16.5C13.6 30.5 18 36.2 24 38z" fill="#fff" />
      </svg>
      <h1>智慧农业</h1>
      <p>移动端 · 农户/管理员工作台</p>
    </div>

    <div class="ml-card">
      <div class="ml-tabs">
        <button :class="{ on: mode === 'password' }" @click="mode = 'password'">账号登录</button>
        <button :class="{ on: mode === 'sms' }" @click="mode = 'sms'">验证码登录</button>
      </div>

      <template v-if="mode === 'password'">
        <div class="m-field">
          <el-icon><User /></el-icon>
          <input v-model="form.username" placeholder="请输入账号" autocomplete="username" maxlength="64" aria-label="账号" />
        </div>
        <div class="m-field">
          <el-icon><Lock /></el-icon>
          <input v-model="form.password" type="password" placeholder="请输入密码" aria-label="密码" @keyup.enter="login" />
        </div>
        <div class="m-field captcha">
          <el-icon><Key /></el-icon>
          <input v-model="form.captcha" placeholder="图形验证码" maxlength="4" aria-label="图形验证码" @keyup.enter="login" />
          <canvas ref="canvasRef" class="m-captcha" @click="drawCaptcha" title="点击刷新" aria-label="验证码，点击刷新"></canvas>
        </div>
      </template>

      <template v-else>
        <div class="m-field">
          <el-icon><Iphone /></el-icon>
          <input v-model="form.phone" placeholder="请输入手机号" maxlength="11" aria-label="手机号" />
        </div>
        <div class="m-field">
          <el-icon><Key /></el-icon>
          <input v-model="form.smsCode" placeholder="短信验证码" maxlength="6" aria-label="短信验证码" @keyup.enter="login" />
          <button class="sms-btn" :disabled="smsCd > 0" @click="sendSms">{{ smsCd > 0 ? `${smsCd}s` : '发送' }}</button>
        </div>
      </template>

      <button class="m-btn m-btn-primary login-btn" :disabled="loading" @click="login">{{ loading ? '登录中…' : '登 录' }}</button>
      <div class="ml-aux">
        <span>演示账号 farmer / 123456</span>
        <router-link to="/login">桌面端 →</router-link>
      </div>
    </div>

    <p class="ml-foot">登录即代表同意《用户协议》与《隐私政策》</p>
  </div>
</template>

<style scoped>
.m-login {
  min-height: 100%;
  /* 决策依据：深色面板多段渐变属纯装饰、不承载信息，按简约高级规范改为单一深色实底 */
  background: #1c2a3c;
  padding: 0 22px 30px;
  display: flex;
  flex-direction: column;
}
.ml-hero {
  color: #fff;
  text-align: center;
  padding: 52px 0 30px;
}
.ml-logo {
  width: 54px;
  height: 54px;
  margin-bottom: 12px;
}
.ml-hero h1 {
  margin: 0;
  color: #fff;
  font-family: var(--ag-font-display);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 4px;
}
.ml-hero p {
  margin: 6px 0 0;
  font-size: var(--ag-fs-micro);
  letter-spacing: 1px;
  opacity: 0.65;
}
/* 登录卡：与 PC 登录表单卡同形（白卡 + 12px 圆角 + 1px 边） */
.ml-card {
  background: var(--ag-bg-surface);
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-radius);
  padding: var(--ag-space-5) var(--ag-space-4);
  box-shadow: var(--ag-shadow-lg);
  animation: agFadeUp 0.4s var(--ag-ease) both;
}
.ml-tabs {
  display: flex;
  margin-bottom: var(--ag-space-4);
  border-bottom: 1px solid var(--ag-border-light);
}
.ml-tabs button {
  flex: 1;
  min-height: 44px;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--ag-fs-body);
  color: var(--ag-text-3);
  padding: 0;
  cursor: pointer;
  position: relative;
  -webkit-tap-highlight-color: transparent;
}
.ml-tabs button.on {
  color: var(--ag-green-600);
  font-weight: 600;
}
.ml-tabs button.on::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 30%;
  right: 30%;
  height: 2px;
  border-radius: 2px;
  background: var(--ag-green-600);
}
/* 输入框间距复用全局 .m-field 形制，这里只补充图标与行距 */
.m-field {
  margin-bottom: var(--ag-space-3);
}
.m-field :deep(.el-icon) {
  color: var(--ag-text-4);
}
.m-captcha {
  width: 84px;
  height: 30px;
  border-radius: var(--ag-radius-sm); /* 决策依据：验证码小图属控件，token 化为控件档 6px（值不变） */
  cursor: pointer;
}
.sms-btn {
  border: none;
  background: var(--ag-green-50);
  color: var(--ag-green-700);
  font-size: 12px;
  border-radius: var(--ag-radius-sm); /* 决策依据：获取验证码小按钮属控件，对齐控件档 6px */
  padding: 6px 10px;
  cursor: pointer;
  flex: none;
}
.sms-btn:disabled {
  color: var(--ag-text-4);
}
/* 登录主按钮：沿用全局 .m-btn-primary（accent 实底），只放大到登录场景尺寸 */
.login-btn {
  width: 100%;
  min-height: 48px;
  margin-top: var(--ag-space-1);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 4px;
}
.login-btn:active {
  transform: scale(0.99);
}
.ml-aux {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  font-size: 11px;
  color: var(--ag-text-4);
}
.ml-foot {
  margin-top: auto;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
  padding-top: 20px;
}
</style>
