/**
 * 溯源二维码公共工具
 *
 * 修复背景：原页面直接用 window.location.origin 拼二维码内容，
 * 本地调试时写入的是 http://127.0.0.1:5173/trace/xxx —— 手机扫码后
 * localhost 指向手机自身，链接根本打不开；且落地页数据不校验溯源码。
 *
 * 本工具统一负责：
 *  1. 二维码访问基址：环境变量 VITE_TRACE_BASE_URL > 用户在本页填写并保存的地址 > 当前 origin
 *  2. URL 拼接、本地地址识别
 *  3. 可扫描的二维码渲染（纯黑白 + M 级容错 + 4 模块静区）与高清 PNG 导出
 */
import QRCode from 'qrcode'

const STORAGE_KEY = 'agri_trace_base_url'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0'])

/** 规整地址：补协议、去尾斜杠，支持直接填 192.168.x.x:5173 或公网域名 */
export function normalizeBase(value) {
  let s = String(value || '').trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`
  return s
}

export function getConfiguredBase() {
  const env = String(import.meta.env?.VITE_TRACE_BASE_URL || '').trim()
  if (env) return normalizeBase(env)
  try {
    const saved = String(localStorage.getItem(STORAGE_KEY) || '').trim()
    if (saved) return normalizeBase(saved)
  } catch { /* 无 localStorage 环境 */ }
  return normalizeBase(window.location.origin)
}

export function setConfiguredBase(value) {
  try { localStorage.setItem(STORAGE_KEY, normalizeBase(value)) } catch { /* 忽略 */ }
}

/** 生成消费者扫码地址；SPA 部署在子路径时保留基址中的路径前缀 */
export function buildTraceUrl(code, base = getConfiguredBase()) {
  return `${normalizeBase(base)}/trace/${encodeURIComponent(String(code || '').trim())}`
}

/** 是否为仅本机可访问的地址（用于提示用户换成局域网 IP / 公网域名） */
export function isLocalBase(base) {
  try { return LOCAL_HOSTS.has(new URL(normalizeBase(base)).hostname) } catch { return false }
}

/** 统一渲染参数：纯黑白、M 级容错、4 模块静区，保证手机/微信可识别 */
export async function renderQr(canvas, text, { width = 256 } = {}) {
  if (!canvas) throw new Error('二维码画布未就绪，请重新打开弹窗')
  if (!text) throw new Error('二维码内容为空')
  await QRCode.toCanvas(canvas, text, {
    width,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  })
}

/** 按整倍数重绘导出，避免放大后边缘模糊导致扫不出 */
export function downloadQrPng(canvas, filename, scale = 3) {
  if (!canvas || !canvas.width) throw new Error('二维码尚未生成')
  const out = document.createElement('canvas')
  out.width = canvas.width * scale
  out.height = canvas.height * scale
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('浏览器不支持 Canvas 导出')
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(canvas, 0, 0, out.width, out.height)
  const a = document.createElement('a')
  a.download = filename
  a.href = out.toDataURL('image/png')
  a.click()
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(ta)
  if (!ok) throw new Error('复制失败，请手动选择文本复制')
}
