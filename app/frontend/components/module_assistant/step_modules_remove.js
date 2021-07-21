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


const { html } = require('../../helpers/ezra_helper.js');
const assistantController = require('./assistant_controller.js');
const i18nHelper = require('../../helpers/i18n_helper.js');
const assistantHelper = require('./assistant_helper.js');
require('../loading_indicator.js');

const template = html`
<style>
  step-modules-remove .intro {
    margin: 0 5em 1em 5em;
  }
</style>

<loading-indicator></loading-indicator>
<p class="intro" i18n="module-assistant.remove.select-module-to-be-removed"></p>
<div id="remove-module-list"></div>
`;

/**
 * @module StepModulesRemove
 * component displays installed modules available to remove
 * @example
 * <step-modules-remove></step-modules-remove>
 * @category Component
 */
class StepModulesRemove extends HTMLElement {

  async connectedCallback() {
    this.appendChild(template.content.cloneNode(true));
    assistantHelper.localizeContainer(this, assistantController.get('moduleType'));

    this.addEventListener('itemChanged', (e) => this._handleCheckboxClick(e));
  }

  async listModules() {
    const installedModulesByLanguage = await getInstalledModulesByLanguage();
    const languages = Object.keys(installedModulesByLanguage).sort(assistantHelper.sortByText);
    assistantController.init('selectedModules', []);

    this.querySelector('loading-indicator').hide();

    const moduleList = this.querySelector('#remove-module-list');

    for (let languageName of languages) {
      const modules = installedModulesByLanguage[languageName];

      const langModuleSection = assistantHelper.listCheckboxSection(modules,
                                                                    assistantController.get('selectedModules'),
                                                                    languageName,
                                                                    { columns: 1, rowGap: '1.5em', extraIndent: true });
      moduleList.append(langModuleSection);
    }
  }

  _handleCheckboxClick(event) {
    const moduleId = event.detail.code;
    const checked = event.detail.checked;
    
    if (checked) {
      assistantController.add('selectedModules', moduleId);
    } else {
      assistantController.remove('selectedModules', moduleId);
    }
  }
}

customElements.define('step-modules-remove', StepModulesRemove);
module.exports = StepModulesRemove;

async function getInstalledModulesByLanguage() {
  const moduleType = assistantController.get('moduleType');
  const modules = await ipcNsi.getAllLocalModules(moduleType);

  var moduleList = {};
  const fixedDictionaries = [ "StrongsHebrew", "StrongsGreek" ];

  for (const swordModule of modules) {
    let moduleInfo = {
      code: swordModule.name,
      text: `${swordModule.description} [${swordModule.name}]`,
      description: `${i18n.t('general.module-version')}: ${swordModule.version}; ${i18n.t("general.module-size")}: ${Math.round(swordModule.size / 1024)} KB`,
    };

    const moduleIsInUserDir = await ipcNsi.isModuleInUserDir(swordModule.name);
    if (!moduleIsInUserDir ||
        (moduleType == "DICT" && fixedDictionaries.includes(swordModule.name))) {

      moduleInfo.disabled = true;
      moduleInfo.title = assistantHelper.localizeText("module-assistant.remove.disable-remove-note", moduleType);
    }

    const languageName = i18nHelper.getLanguageName(swordModule.language);

    moduleList[languageName] = moduleList[languageName] || new Map();

    moduleList[languageName].set(swordModule.description, moduleInfo);
  }

  return moduleList;
}