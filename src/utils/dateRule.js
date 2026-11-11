/* 表单日期规则：
 * 统一「今天」与日期字符串的比较口径，避免各页面日期可倒置或可倒签。
 * 全部按本地时区处理，不使用 new Date('YYYY-MM-DD') 的 UTC 解析。
 */

/** Date → YYYY-MM-DD（本地时区） */
export const toDateStr = (d) => {
  const dt = d instanceof Date ? d : new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/** 今天的 YYYY-MM-DD */
export const todayStr = () => toDateStr(new Date())

/** 日期选择器：禁止选择今天之前的日期 */
export const disabledPastDate = (d) => toDateStr(d) < todayStr()

/** 日期选择器：禁止选择今天之后的日期 */
export const disabledFutureDate = (d) => toDateStr(d) > todayStr()

/** 结束日期不得早于开始日期（同一天允许） */
export const rangeValidator = (getStart, message = '结束日期不能早于开始日期') => ({
  validator: (rule, value, callback) => {
    const start = getStart()
    if (value && start && String(value) < String(start)) callback(new Error(message))
    else callback()
  },
  trigger: 'change',
})

/** 日期不得早于今天（空值放行，适合可选项） */
export const notPastValidator = (message = '日期不能早于今天') => ({
  validator: (rule, value, callback) => {
    if (value && String(value) < todayStr()) callback(new Error(message))
    else callback()
  },
  trigger: 'change',
})

/** 日期不得晚于今天（空值放行，适合可选项） */
export const notFutureValidator = (message = '日期不能晚于今天') => ({
  validator: (rule, value, callback) => {
    if (value && String(value) > todayStr()) callback(new Error(message))
    else callback()
  },
  trigger: 'change',
})
