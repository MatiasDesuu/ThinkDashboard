/**
 * Language Module
 * Handles language selection and i18n
 */

class ConfigLanguage {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.availableLanguages = {
            'en': 'English',
            'es': 'Español',
            'jp': '日本語',
            'pl': 'Polski'
        };
    }

    /**
     * Load translations for a specific language
     * @param {string} lang - Language code
     */
    async loadTranslations(lang) {
        try {
            const response = await fetch(`/locales/${lang}.json`);
            if (response.ok) {
                this.translations = await response.json();
                this.currentLanguage = lang;
                this.applyTranslations();
            } else {
                console.error(`Failed to load translations for ${lang}`);
            }
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    }

    /**
     * Get translated text for a key
     * @param {string} key - Translation key (e.g., 'config.title')
     * @returns {string} Translated text or key if not found
     */
    t(key) {
        const keys = key.split('.');
        let value = this.translations;
        for (const k of keys) {
            value = value?.[k];
        }
        return value || key;
    }

    /**
     * Apply translations to elements with data-i18n attribute
     */
    applyTranslations() {
        // Handle standard data-i18n
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            if (element.hasAttribute('aria-label')) {
                element.setAttribute('aria-label', translation);
            } else {
                element.textContent = translation;
            }
        });

        // Handle data-i18n-placeholder
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            element.placeholder = translation;
        });
    }

    /**
     * Setup language selector
     */
    setupLanguageSelector() {
        const languageSelect = document.getElementById('language-select');
        if (!languageSelect) return;

        // Populate options
        languageSelect.innerHTML = '';
        Object.keys(this.availableLanguages).forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = this.availableLanguages[lang];
            languageSelect.appendChild(option);
        });

        // Set current value
        languageSelect.value = this.currentLanguage;

    }



    /**
     * Initialize with current language
     * @param {string} lang - Current language
     */
    async init(lang) {
        this.currentLanguage = lang;
        await this.loadTranslations(lang);
    }
}