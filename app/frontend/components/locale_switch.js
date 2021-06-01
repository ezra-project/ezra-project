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

const { html, waitUntilIdle } = require('../helpers/ezra_helper.js');
const i18nController = require('../controllers/i18n_controller.js');
const i18nHelper = require('../helpers/i18n_helper.js');
const locales = i18nController.getAvailableLocales();

const LOCALE_SELECT_WIDTH = '170px'; // FIXME: magic number that works with jQuery UI is not reliable way for constructing stable layout

const template = html`
  <style>
    #locale-switch-box {
      margin-top: 4em;
    }
    .locale-switch-container {
      width: 100%;
      display: flex;
    }
    .locale-detect {
      line-height: 2.1em;
      padding: 0 0.8em;
      display: flex;
      align-items: center;
      justify-content: center;
      width: calc(100% - ${LOCALE_SELECT_WIDTH});
    }
    .locale-detect i.fas+[i18n] {
      margin-left: 0.8em;
    }
    .locale-switch-container .ui-selectmenu {
      border-bottom-right-radius: 0;
      border-top-right-radius: 0;
      width: auto;
    }
    #locale-switch-box .locale-switch-container .ui-selectmenu-menu-dropdown {
      font-size: 1em;
      text-align: left;
      background-color: #deedf7;
      width: 240px !important;
      box-shadow: 2px 2px 3px #a0a0a088;
    }
    .darkmode--activated #locale-switch-box .locale-switch-container .ui-selectmenu-menu-dropdown {
      background-color: #1e1e1e;
    }
  </style>

  <div id="locale-switch-box" class="switch-box">
  <div class="options-header"></div>
    <div class="locale-switch-container">
      <select name="locale-select" class="locale-select">
        ${locales.map(code => `<option value="${code}">${i18nHelper.getLanguageName(code, true)}</option>`)}
      </select>
      <div class="fg-button locale-detect ui-state-default ui-corner-right" i18n="[title]general.detect-locale-hint">
        <i class="fas fa-globe"></i><span i18n="general.detect-locale"></span>
      </div>    
    </div>
  </div>
  `;

class LocaleSwitch extends HTMLElement {
  constructor() {
    super();

    this.innerHTML = template.innerHTML;

    this.selectEl = this.querySelector('.locale-select');

    this.localize();

    this.querySelector('.locale-detect').addEventListener('click', () => this.handleDetectClick());

    this.setSelected(i18nController.getLocale());

    $(this.selectEl).selectmenu({
      appendTo: this.querySelector('.locale-switch-container'),
      width: LOCALE_SELECT_WIDTH,
      change: () => this.handleChange(),
    });

    i18nController.addLocaleChangeSubscriber(locale => this.updateOptions(locale));
  }

  updateOptions(localeCode) {
    for (let i = 0; i < this.selectEl.children.length; i++) {
      let option = this.selectEl.children[i];
      const code = option.getAttribute('value');
      option.textContent = i18nHelper.getLanguageName(code, true, localeCode);
      option.removeAttribute('selected');
    }

    this.setSelected(localeCode);

    $(this.selectEl).selectmenu();
  }

  setSelected(localeCode) {
    let selected = this.selectEl.querySelector(`[value="${localeCode}"]`);
    if (selected) {
      selected.setAttribute('selected', '');
    }
  }

  async handleChange() {
    await waitUntilIdle();

    this.dispatchEvent(new CustomEvent("localeChanged", {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail: { 
        locale: this.selectEl.value,
        postCallback: () => this.updateOptions()
      }
    }));
  }

  handleDetectClick() {
    this.dispatchEvent(new CustomEvent("localeDetectClicked", {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail: {
        postCallback: () => this.updateOptions()
      }
    }));
  }

  localize() {
    var i18nId = this.getAttribute('label');
    var labelEl = this.querySelector('.options-header');
    labelEl.innerText = i18n.t(i18nId);
    labelEl.setAttribute('i18n', i18nId);
  }

  get value() {
    return this.selectEl.value;
  }

}

customElements.define('locale-switch', LocaleSwitch);
module.exports = LocaleSwitch;