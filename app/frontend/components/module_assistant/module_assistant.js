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
const assistantHelper = require('./assistant_helper.js');
const StepUpdateRepositories = require('./step_update_repositories.js');
const StepLanguages = require('./step_languages.js');
const StepRepositories = require('./step_repositories.js');
const StepModules = require('./step_modules.js');
const StepInstall = require('./step_install.js');
const UnlockDialog = require('./unlock_dialog.js');

const template = html`
<style>
</style>

<div id="module-settings-assistant-add" style="display: none;">
  <h3 i18n="module-assistant.update-repository-data"></h3>
  <section id="module-update-repositories" class="scrollable">
    <step-update-repositories></step-update-repositories>
  </section>

  <h3 i18n="module-assistant.languages"></h3>
  <section id="module-languages" class="scrollable">
    <step-languages></step-languages>
  </section>

  <h3 i18n="module-assistant.repositories"></h3>
  <section id="module-repositories" class="scrollable">
    <step-repositories></step-repositories>
  </section>

  <h3 class="module-settings-assistant-section-header-module-type"></h3>
  <section id="module-list">
    <step-modules></step-modules>
  </section>

  <h3 i18n="module-assistant.installation"></h3>
  <section id="install" class="scrollable">
    <step-install></step-install>
  </section>
</div>

<unlock-dialog></unlock-dialog>
`;

const UPDATE_REPOSITORIES_INDEX = 0;
const LANGUAGES_INDEX = 1;
const REPOSITORIES_INDEX = 2;
const MODULES_INDEX = 3;
const INSTALL_INDEX = 4;


class ModuleAssistant extends HTMLElement {
  constructor() {
    super();
    console.log('ASSISTANT: step constructor');
    this._jQueryStepsInitialized = false;
  }

  async connectedCallback() {
    this.appendChild(template.content);
    this._localize();
    console.log('ASSISTANT: started connectedCallback');

    /** @type {StepUpdateRepositories} */
    this.updateConfigStep = this.querySelector('step-update-repositories');
    /** @type {StepLanguages} */
    this.languagesStep = this.querySelector('step-languages');
    /** @type {StepRepositories} */
    this.repositoriesStep = this.querySelector('step-repositories');
    /** @type {StepModules} */
    this.modulesStep = this.querySelector('step-modules');
    /** @type {StepInstall} */
    this.installStep = this.querySelector('step-install');
    /** @type {UnlockDialog} */
    this.unlockDialog = this.querySelector('unlock-dialog');

    this.modulesStep.unlockDialog = this.unlockDialog;
    this.installStep.unlockDialog = this.unlockDialog;
  }

  async initAddModuleAssistant() {
    console.log('ASSISTANT: initAddModuleAssistant');
    if (this._jQueryStepsInitialized) {
      $('#module-settings-assistant-add').steps("destroy");
    } else {
      this._jQueryStepsInitialized = true;
    }

    $(this.querySelector('#module-settings-assistant-add')).steps({
      headerTag: "h3",
      bodyTag: "section",
      contentContainerTag: "module-settings-assistant-add",
      autoFocus: true,
      stepsOrientation: 1,
      onStepChanging: (event, currentIndex, newIndex) => this._addModuleAssistantStepChanging(event, currentIndex, newIndex),
      onStepChanged: async (event, currentIndex, priorIndex) => this._addModuleAssistantStepChanged(event, currentIndex, priorIndex),
      onFinishing: () => assistantController.isInstallCompleted(),
      onFinished: () => this._addModuleAssistantFinished(),
      labels: {
        cancel: i18n.t("general.cancel"),
        finish: i18n.t("general.finish"),
        next: i18n.t("general.next"),
        previous: i18n.t("general.previous")
      }
    });

    await this.languagesStep.init();
    await this.updateConfigStep.init();
  }

  _addModuleAssistantStepChanging(event, currentIndex, newIndex) {
    if (currentIndex == UPDATE_REPOSITORIES_INDEX && newIndex == LANGUAGES_INDEX) {
      return assistantController.get('allRepositories').length > 0;
    } else if (currentIndex == LANGUAGES_INDEX && newIndex == REPOSITORIES_INDEX) { // Changing from Languages to Repositories
      const selectedLanguages = this.languagesStep.languages;
      assistantController.set('selectedLanguages', selectedLanguages);
      return selectedLanguages.length > 0;
    } else if (currentIndex == REPOSITORIES_INDEX && newIndex == MODULES_INDEX) { // Changing from Repositories to Modules 
      const selectedRepositories = this.repositoriesStep.repositories;
      assistantController.set('selectedRepositories', selectedRepositories);
      return selectedRepositories.length > 0;
    } else if (currentIndex == MODULES_INDEX && newIndex == INSTALL_INDEX) { // Changing from Modules to Installation
      const selectedModules = this.modulesStep.modules;
      assistantController.set('selectedModules', selectedModules);
      return selectedModules.length > 0;
    } else if (currentIndex == INSTALL_INDEX && newIndex != INSTALL_INDEX) {
      return false;
    }

    return true;
  }

  async _addModuleAssistantStepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == UPDATE_REPOSITORIES_INDEX && currentIndex == LANGUAGES_INDEX) {
      await this.languagesStep.listLanguages();
    } else if (priorIndex == LANGUAGES_INDEX && currentIndex == REPOSITORIES_INDEX) {
      await this.repositoriesStep.listRepositories();
    } else if (priorIndex == REPOSITORIES_INDEX && currentIndex == MODULES_INDEX) {
      await this.modulesStep.listModules();
    } else if (currentIndex == INSTALL_INDEX) {
      await this.installStep.installSelectedModules();
    }
  }

  async _addModuleAssistantFinished() {
    $('#module-settings-assistant').dialog('close');
    assistantController.set('installedModules', await app_controller.translation_controller.getInstalledModules());

    if (assistantController.get('moduleType') == 'BIBLE') {
      await app_controller.translation_controller.initTranslationsMenu();
      await tags_controller.updateTagUiBasedOnTagAvailability();
    }
  }

  async initInstallPage() {
    // Bible modules have been selected
    this.installStep = document.createElement('step-install');

    const wizardPage = $('#module-settings-assistant-add-p-'+INSTALL_INDEX);
    wizardPage.empty();

    wizardPage.append(this.installStep);
  }

  _localize() {
    var moduleTypeText = "";
    const moduleType = assistantController.get('moduleType');
    if (moduleType == 'BIBLE') {
      moduleTypeText = i18n.t("module-assistant.module-type-bible");
    } else if (moduleType == 'DICT') {
      moduleTypeText = i18n.t("module-assistant.module-type-dict");
    }

    this.querySelector('.module-settings-assistant-section-header-module-type').textContent = moduleTypeText;

    assistantHelper.localize(this);
  }
}

customElements.define('module-assistant', ModuleAssistant);
module.exports = ModuleAssistant;