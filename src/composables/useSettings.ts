import { ref } from 'vue'

export type AppLocale = 'zh-CN' | 'en-US'

export interface LocaleOption {
  label: string
  value: AppLocale
  description: string
}

const UI_LOCALE_KEY = 'ui_locale'
const AI_LOCALE_KEY = 'ai_locale'

const uiLocale = ref<AppLocale>((localStorage.getItem(UI_LOCALE_KEY) as AppLocale) || 'zh-CN')
const aiLocale = ref<AppLocale>((localStorage.getItem(AI_LOCALE_KEY) as AppLocale) || 'zh-CN')

const localeOptions: LocaleOption[] = [
  {
    label: '简体中文',
    value: 'zh-CN',
    description: '适合当前中文界面和中文输出场景。',
  },
  {
    label: 'English',
    value: 'en-US',
    description: '适合英文界面和英文脚本输出场景。',
  },
]

export function useSettings() {
  function setUiLocale(locale: AppLocale) {
    uiLocale.value = locale
    localStorage.setItem(UI_LOCALE_KEY, locale)
  }

  function setAiLocale(locale: AppLocale) {
    aiLocale.value = locale
    localStorage.setItem(AI_LOCALE_KEY, locale)
  }

  return {
    uiLocale,
    aiLocale,
    localeOptions,
    setUiLocale,
    setAiLocale,
  }
}
