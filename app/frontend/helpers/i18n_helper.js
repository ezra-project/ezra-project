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

const localeController = require('../controllers/locale_controller.js');

async function getSwordTranslation(originalString) {
  return await ipcNsi.getSwordTranslation(originalString, i18n.language);
}

async function getBookAbbreviation(bookCode) {
  var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
  return await ipcNsi.getBookAbbreviation(currentBibleTranslationId, bookCode, localeController.getLocale());
}

async function getSpecificTranslation(lang, key) {
  var specificTranslation = i18n.t(key, { lng: lang }); // https://www.i18next.com/translation-function/essentials

  return specificTranslation;
}

async function getChapterTranslation(lang) {
  var locale = lang || localeController.getLocale();

  return await this.getSpecificTranslation(locale, 'bible-browser.chapter');
}

async function getPsalmTranslation(lang) {
  var language = lang || localeController.getLocale();

  return await localeController.getSpecificTranslation(language, 'bible-browser.psalm');
}

function getLocalizedDate(timestamp) {
  var locale = localeController.getLocale();
  return new Date(Date.parse(timestamp)).toLocaleDateString(locale);
}

function getLocaleName(code, includeNativeName = false, currentLocale = null) {
  currentLocale = currentLocale || localeController.getLocale();
  const localeName = (new Intl.DisplayNames(currentLocale, { type: 'language' })).of(code);
  const titleCased = localeName.slice(0, 1).toLocaleUpperCase() + localeName.slice(1);

  const langNative = includeNativeName && code !== currentLocale ? ` (${(new Intl.DisplayNames(code, { type: 'language' })).of(code)})` : '';
  return titleCased + langNative;
}

module.exports.getSwordTranslation = getSwordTranslation;
module.exports.getBookAbbreviation = getBookAbbreviation;
module.exports.getSpecificTranslation = getSpecificTranslation;
module.exports.getChapterTranslation = getChapterTranslation;
module.exports.getPsalmTranslation = getPsalmTranslation;
module.exports.getLocalizedDate = getLocalizedDate;
module.exports.getLocaleName = getLocaleName;
