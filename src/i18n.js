import { createI18n } from 'vue-i18n'

async function loadLocaleMessages() {
    const en = await import('locales/en.json')
    const es = await import('locales/es.json')
    const locales = [{ en: en }, { es: es }]
    const messages = {}
    locales.forEach((lang) => {
        const key = Object.keys(lang)
        messages[key] = lang[key]
    })
    return messages
}

export default createI18n({
    locale: 'en',
    fallbackLocale: 'en',
    legacy: false,
    messages: loadLocaleMessages(),
})