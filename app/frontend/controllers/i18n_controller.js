/* This file is part of Ezra Bible App.

   Copyright (C) 2019 - 2021 Ezra Bible App Development Team <contact@ezrabibleapp.net>

   Ezra Bible App is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 2 of the License, or
   (at your option) any later version.

   Ezra Bible App is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Bible App. See the file LICENSE.
   If not, see <http://www.gnu.org/licenses/>. */

/**
 * This controller initializes the app locale at startup and updates it on demand when changing the locale
 * @module i18nController
 * @category Controller
 */

const AVAILABLE_LOCALES = ['de', 'en', 'nl', 'fr', 'es', 'sk', 'uk', 'ru', 'ro'];
const FALLBACK_LOCALE = 'en';
const SETTINGS_KEY = 'appLocale';

const jqueryI18next = require('jquery-i18next');

const i18nextOptions = {
  debug: false,
  interpolation: {
    escapeValue: false,
    /** 
     * adds context and format to the interpolation
     * @example translation.json:
     * ...
     * term: "переклади Біблії",
     * term_locative: "перекладах Біблії",
     * ...
     * message: Інформація о {{term, locative}},
     * ...
     */
    format(value, format, lng) { 
      if (value instanceof Date) {
        return value.toLocaleDateString(lng);
      }
      
      var context = format;
      if (format) {
        const parts = format.split(',');
        if (parts.length > 1) {
          context = parts.shift().trim();
          format = parts.join(',').trim();
        } else if (format === 'capitalize' || format === 'title-case') {
          context = undefined;
        }
      }

      if (value == 'BIBLE') {
        value = "module-assistant.module-type-bible";
      } else if (value == 'DICT') {
        value = "module-assistant.module-type-dict";
      }

      value = i18n.t(value, {context});

      if (format === 'capitalize') {
        value = value.replace(/^\S/, (c) => c.toLocaleUpperCase());
      } else if (format === 'title-case') {
        value = value.replace(/\S*/g, (w) => (w.replace(/^\S/, (c) => c.toLocaleUpperCase())));
      }

      return value;
    }
  },
  saveMissing: false,
  fallbackLng: FALLBACK_LOCALE,
  whitelist: AVAILABLE_LOCALES,
  react: {
    wait: false
  }
};

var systemLocale;

module.exports.initI18N = async function() {
  window.i18n = require('i18next');
  const I18nIpcBackend = require('../ipc/i18n_ipc_backend.js');

  let LanguageDetector = null;

  if (platformHelper.isElectron()) {
    LanguageDetector = require('i18next-electron-language-detector');
  } else {
    const _LanguageDetector = require('../platform/i18next_browser_language_detector.js');
    LanguageDetector = new _LanguageDetector();
  }

  await i18n
    .use(LanguageDetector)
    .use(I18nIpcBackend)
    .init(i18nextOptions);

  systemLocale = this.getLocale();  

  jqueryI18next.init(i18n, $, {
    tName: 't', // --> appends $.t = i18next.t
    i18nName: 'i18n', // --> appends $.i18n = i18next
    handleName: 'localize', // --> appends $(selector).localize(opts);
    selectorAttr: 'i18n', // selector for translating elements
    targetAttr: 'i18n-target', // data-() attribute to grab target element to translate (if different than itself)
    optionsAttr: 'i18n-options', // data-() attribute that contains options, will load/set if useOptionsAttr = true
    useOptionsAttr: false, // see optionsAttr
    parseDefaultValueFromContent: true // parses default values from content ele.val or ele.text
  });

  if (platformHelper.isElectron()) {
    await this.initLocale();
  }
}

module.exports.initLocale = async function() {
  if (await ipcSettings.has(SETTINGS_KEY)) {
    let locale = await ipcSettings.get(SETTINGS_KEY, FALLBACK_LOCALE);

    console.log(`Using locale ${locale}`);
    await i18n.changeLanguage(locale);
  }

  // We need to save some locale strings separately, so that they are accessible at startup before i18next is available
  preserveStringsForStartup();

  if (platformHelper.isTest()) { // Use English for test mode
    await i18n.changeLanguage('en');
  }

  window.reference_separator = i18n.t('general.chapter-verse-separator');
};

function preserveStringsForStartup() {
  if (!window.localStorage) {
    return;
  } 
  
  const localeStorage = window.localStorage;
  const keys = ["general.loading", "cordova.starting-app", "cordova.init-i18n", "cordova.init-sword", "cordova.init-database", "cordova.init-user-interface"];
  for(const key of keys) {
    let translation = i18n.t(key);
    localeStorage.setItem(key, translation);
  }
}

module.exports.getStringForStartup = function(key, fallbackText) {
  const localizedText = window.localStorage && window.localStorage.getItem(key);
  return localizedText || fallbackText;
}

module.exports.changeLocale = async function(newLocale, saveSettings=true) {

  await i18n.changeLanguage(newLocale);
  preserveStringsForStartup();

  if (saveSettings) {
    await ipcSettings.set(SETTINGS_KEY, newLocale);
  }

  $(document).localize();
  window.reference_separator = i18n.t('general.chapter-verse-separator');
  await notifySubscribers(newLocale);
  
  // Since the new locale may require more or less space vertically we need to adjust
  // the height of the app container now.
  uiHelper.resizeAppContainer();
};

var localeSubscribers = [];
module.exports.addLocaleChangeSubscriber = function(subscriberCallback) {
  if (typeof subscriberCallback === 'function') {
    localeSubscribers.push(subscriberCallback);
  }
};

async function notifySubscribers(locale) {
  for (let subscriberCallback of localeSubscribers) {
    await subscriberCallback(locale);
  }
}

module.exports.detectLocale = async function() {
  await this.changeLocale(systemLocale || FALLBACK_LOCALE, false);
  await ipcSettings.delete(SETTINGS_KEY);
};

/** returns current app locale (2-letter language code) */
module.exports.getLocale = function() {
  var locale = i18n.language;
  return locale.slice(0, 2); // just in case we got language with the region code (i.e "en-US") we want only the language code ("en")
};

module.exports.getSystemLocale = () => systemLocale;

/** returns detected OS locale */
module.exports.getSystemLocale = () => systemLocale;

/** returns 2-letter language code list of all available locales for the app */
module.exports.getAvailableLocales = function() {
  return AVAILABLE_LOCALES.sort();
};
