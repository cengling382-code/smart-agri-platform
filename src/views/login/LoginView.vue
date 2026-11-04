<script setup>
/** 页面 1 · 登录页：图形验证码 + 记住密码 + 失败3次锁定（防暴力破解） */
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const form = reactive({ username: '', password: '', captcha: '' })
const remember = ref(false)
const loading = ref(false)
const failCount = ref(0)
const lockSeconds = ref(0)
let lockTimer = null
let canvasTimer = null

const FEATURES = [
  { icon: 'Cpu', title: '物联网感知', desc: '环境数据实时采集监测' },
  { icon: 'SwitchButton', title: '远程智控', desc: '设备策略自动化联动' },
  { icon: 'DataAnalysis', title: 'AI 分析', desc: '长势预测与产量预估' },
  { icon: 'Postcard', title: '一物一码', desc: '全链路农产品溯源' },
]
const DEMO = [
  { role: '系统管理员', u: 'admin' },
  { role: '园区管理员', u: 'manager' },
  { role: '农技人员', u: 'tech' },
  { role: '农户/工人', u: 'farmer' },
  { role: '监管人员', u: 'regulator' },
]

/* ---------- Canvas 图形验证码 ---------- */
const canvasRef = ref(null)
const captchaCode = ref('')
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function drawCaptcha() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = (canvas.width = 110)
  const h = (canvas.height = 40)
  ctx.clearRect(0, 0, w, h)
  // 背景
  ctx.fillStyle = '#eef4f0'
  ctx.fillRect(0, 0, w, h)
  // 验证码字符
  let code = ''
  const colors = ['#699C78', '#4C6983', '#E89552', '#38556A']
  for (let i = 0; i < 4; i++) {
    const ch = CHARS[Math.floor(Math.random() * CHARS.length)]
    code += ch
    ctx.save()
    ctx.font = `700 ${18 + Math.random() * 6}px Arial`
    ctx.fillStyle = colors[i % colors.length]
    ctx.translate(16 + i * 24, h / 2 + 6)
    ctx.rotate((Math.random() - 0.5) * 0.5)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  }
  captchaCode.value = code
  // 干扰线
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(100,140,110,${0.25 + Math.random() * 0.2})`
    ctx.beginPath()
    ctx.moveTo(Math.random() * w, Math.random() * h)
    ctx.lineTo(Math.random() * w, Math.random() * h)
    ctx.stroke()
  }
  // 噪点
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = 'rgba(80,110,90,.4)'
    ctx.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6)
  }
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function validateCaptcha() {
  if (form.captcha.trim().toUpperCase() !== captchaCode.value) {
    ElMessage.error('图形验证码不正确')
    drawCaptcha()
    form.captcha = ''
    return false
  }
  return true
}

async function handleLogin() {
  if (lockSeconds.value > 0) return
  if (!form.username || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  if (!validateCaptcha()) return
  loading.value = true
  try {
    await auth.login({ username: form.username, password: form.password })
    failCount.value = 0
    if (remember.value) auth.saveRemember(form.username, form.password)
    else auth.clearRemember()
    ElMessage.success(`欢迎回来，${auth.displayName}`)
    router.push(route.query.redirect || '/dashboard')
  } catch (e) {
    failCount.value++
    drawCaptcha()
    form.captcha = ''
    if (failCount.value >= 3) {
      lockSeconds.value = 30
      lockTimer = setInterval(() => {
        lockSeconds.value--
        if (lockSeconds.value <= 0) {
          clearInterval(lockTimer)
          failCount.value = 0
          drawCaptcha()
        }
      }, 1000)
      ElMessage.error('连续登录失败 3 次，账号已临时锁定 30 秒')
    } else {
      ElMessage.error(e.message || '登录失败')
    }
  } finally {
    loading.value = false
  }
}

function fillDemo(u) {
  form.username = u
  form.password = '123456'
}

onMounted(async () => {
  const saved = auth.loadRemember()
  if (saved) {
    form.username = saved.username
    form.password = saved.password
    remember.value = true
  }
  await nextTick()
  drawCaptcha()
  // 每 45s 自动换一张，防止前端缓存
  if (!reduced) canvasTimer = setInterval(drawCaptcha, 45000)
})
onBeforeUnmount(() => {
  clearInterval(lockTimer)
  clearInterval(canvasTimer)
})
</script>

<template>
  <div class="login-page">
    <!-- 左侧品牌区 -->
    <section class="brand" aria-hidden="true">
      <div class="brand-inner">
        <div class="brand-logo anim-up">
          <svg viewBox="0 0 48 48" class="logo-svg">
            <rect x="2" y="2" width="44" height="44" rx="12" fill="rgba(255,255,255,.14)" />
            <path d="M24 38c0-9 3-16 12-21 1 12-4 19-12 21zm0 0c0-7-2.5-12.5-9.5-16.5C13.6 30.5 18 36.2 24 38z" fill="#fff" />
          </svg>
          <div>
            <div class="brand-name">智慧农业综合管理平台</div>
            <div class="brand-en">SMART AGRICULTURE INTEGRATED PLATFORM</div>
          </div>
        </div>
        <h1 class="brand-slogan anim-up anim-delay-2">
          以「物联网 + 农业」，<br />让每一亩田地都被数字照亮。
        </h1>
        <div class="brand-features stagger">
          <div v-for="f in FEATURES" :key="f.title" class="feature">
            <el-icon :size="22"><component :is="f.icon" /></el-icon>
            <div>
              <div class="f-title">{{ f.title }}</div>
              <div class="f-desc">{{ f.desc }}</div>
            </div>
          </div>
        </div>
        <div class="brand-deco leaf1"></div>
        <div class="brand-deco leaf2"></div>
      </div>
    </section>

    <!-- 右侧表单区 -->
    <section class="panel">
      <div class="panel-inner">
        <h2 class="panel-title">欢迎登录</h2>
        <p class="panel-sub">请使用平台账号登录，进入数字农业管理空间</p>

        <el-form size="large" @submit.prevent="handleLogin">
          <el-form-item>
            <el-input v-model="form.username" placeholder="账号 / 用户名" :prefix-icon="'User'" autocomplete="username" aria-label="账号" />
          </el-form-item>
          <el-form-item>
            <el-input v-model="form.password" type="password" placeholder="密码" show-password :prefix-icon="'Lock'" autocomplete="current-password" aria-label="密码" @keyup.enter="handleLogin" />
          </el-form-item>
          <el-form-item>
            <div class="captcha-row">
              <el-input v-model="form.captcha" placeholder="图形验证码" :prefix-icon="'Key'" maxlength="4" aria-label="图形验证码" @keyup.enter="handleLogin" />
              <canvas ref="canvasRef" class="captcha" title="点击刷新验证码" role="img" aria-label="图形验证码，点击刷新" @click="drawCaptcha"></canvas>
            </div>
          </el-form-item>
          <div class="aux-row">
            <el-checkbox v-model="remember">记住密码</el-checkbox>
            <router-link class="aux-link" to="/forgot">忘记密码？</router-link>
          </div>
          <el-button type="primary" class="login-btn" :loading="loading" :disabled="lockSeconds > 0" native-type="submit">
            <span v-if="lockSeconds > 0">已锁定 · {{ lockSeconds }}s 后重试</span>
            <span v-else>登 录</span>
          </el-button>
        </el-form>

        <div class="register-tip">
          还没有账号？<router-link to="/register">立即注册</router-link>
        </div>

        <el-divider><span class="divider-text">演示账号（密码 123456）</span></el-divider>
        <div class="demo-accounts">
          <button v-for="d in DEMO" :key="d.u" class="demo-btn" @click="fillDemo(d.u)">
            <span class="demo-role">{{ d.role }}</span>
            <span class="demo-user">{{ d.u }}</span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(460px, 46%) 1fr;
}
/* 左品牌 */
.brand {
  position: relative;
  /* 决策依据：原为装饰性光斑与多段深色渐变，均不承载信息，按简约高级规范改为单一深色实底 */
  background: #1c2a3c;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.brand-inner {
  width: min(420px, 86%);
  color: #fff;
  position: relative;
  z-index: 2;
}
.brand-logo {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 40px;
}
.logo-svg {
  width: 46px;
  height: 46px;
}
.brand-name {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 2px;
}
.brand-en {
  font-size: 9px;
  letter-spacing: 2.6px;
  color: rgba(255, 255, 255, 0.5);
}
.brand-slogan {
  font-size: 28px;
  line-height: 1.55;
  font-weight: 700;
  margin: 0 0 36px;
  letter-spacing: 1px;
}
.brand-features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.feature {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(4px);
  border-radius: var(--ag-radius); /* 决策依据：卖点特性卡属卡片类，对齐卡片档 10px */
  padding: 14px;
  transition: transform 0.3s var(--ag-ease), background 0.3s;
}
.feature:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.12);
}
.feature :deep(.el-icon) {
  color: #7DC383;
  margin-top: 2px;
}
.f-title {
  font-size: 14px;
  font-weight: 600;
}
.f-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.62);
  margin-top: 2px;
}
/* 决策依据：leaf1/leaf2 为 blur(60px) 彩色光斑纯装饰元素（含 agFloat 无限浮动动画），
   按简约高级规范整体隐藏，模板中的空 div 保留不动 */
.leaf1,
.leaf2 {
  display: none;
}

/* 右表单 */
.panel {
  display: grid;
  place-items: center;
  /* 决策依据：原为装饰性光斑（radial-gradient 氛围光），按简约高级规范改为平底 */
  background: #fff;
}
.panel-inner {
  width: min(400px, 88%);
  animation: agFadeUp 0.6s var(--ag-ease) both;
}
.panel-title {
  font-size: 26px;
  margin: 0 0 6px;
  color: var(--ag-text-1);
}
.panel-sub {
  color: var(--ag-text-3);
  font-size: 13px;
  margin: 0 0 28px;
}
.captcha-row {
  display: flex;
  gap: 10px;
  width: 100%;
}
.captcha {
  width: 110px;
  height: 40px;
  border-radius: var(--ag-radius-sm); /* 决策依据：验证码输入属控件，对齐控件档 6px */
  cursor: pointer;
  flex: none;
  border: 1px solid var(--ag-border);
  transition: transform 0.2s;
}
/* 决策依据：hover 放大属装饰性动效，按简约高级规范移除，hover 仅保留其它属性（如有） */
.aux-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.aux-link {
  font-size: 13px;
}
.login-btn {
  width: 100%;
  height: 46px;
  font-size: 16px;
  letter-spacing: 6px;
  border-radius: var(--ag-radius-sm); /* 决策依据：登录按钮属控件，对齐控件档 6px */
}
.register-tip {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--ag-text-3);
}
.divider-text {
  font-size: 12px;
  color: var(--ag-text-4);
}
.demo-accounts {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.demo-btn {
  border: none;
  background: var(--ag-bg-page);
  border-radius: var(--ag-radius-sm); /* 演示账号按钮属小控件，对齐控件档 8px */
  padding: 7px 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: all 0.2s var(--ag-ease);
}
.demo-btn:hover {
  background: var(--ag-green-50);
  transform: translateY(-1px);
}
.demo-role {
  font-size: 11px;
  color: var(--ag-text-3);
  white-space: nowrap;
}
.demo-user {
  font-size: 12px;
  font-weight: 700;
  color: var(--ag-green-700);
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
  }
  .brand {
    display: none;
  }
}
</style>
