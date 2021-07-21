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
require('./step_languages.js');
require('./step_repositories.js');
require('./step_modules.js');
require('./step_install.js');
require('./unlock_dialog.js');

const template = html`
<style>
  #module-settings-assistant-add {
    height: 100%;
  }
  #module-settings-assistant-add .content {
    min-height: calc(100% - 4em);
    background: transparent;
    border-radius: unset;
  }
</style>

<div id="module-settings-assistant-add" style="display: none;"></div>
<!-- <div id="module-settings-assistant-add-wrapper" style="display: none;">
  <div id="module-assistant-add-info">
  </div>

</div> -->

<unlock-dialog></unlock-dialog>
`;

const templateAddSteps = html`
  <h3 i18n="module-assistant.languages"></h3>
  <section id="module-languages" class="module-assistant-step">
    <!-- <step-languages></step-languages> -->
  </section>

  <h3 i18n="module-assistant.repositories"></h3>
  <section id="module-repositories" class="module-assistant-step">
    <!-- <step-repositories></step-repositories> -->
  </section>

  <h3 i18n="{{module_type, title-case}}"></h3>
  <section id="module-list" class="module-assistant-step">
    <!-- <step-modules></step-modules> -->
  </section>

  <h3 i18n="module-assistant.installation"></h3>
  <section id="install" class="module-assistant-step scrollable">
    <!-- <step-install></step-install> -->
  </section>
`;

const LANGUAGES_INDEX = 0;
const REPOSITORIES_INDEX = LANGUAGES_INDEX + 1;
const MODULES_INDEX = REPOSITORIES_INDEX + 1;
const INSTALL_INDEX = MODULES_INDEX + 1;


class AssistantStepsAddModules extends HTMLElement {
  constructor() {
    super();
    this._initialized = false;
    this._jQueryStepsInitialized = false;
  }

  async connectedCallback() {
    if (!this._initialized) {
      this.appendChild(template.content);
      this._initialized = true;
    }
  }

  show() {
    this.querySelector('#module-settings-assistant-add').style.display = 'block';
  }

  hide() {
    this.querySelector('#module-settings-assistant-add').style.display = 'none';
  }

  async startModuleAssistantSteps() {
    this.show();
    this._resetModuleAssistantContent();

    var addModuleAssistantContainer = this.querySelector('#module-settings-assistant-add');
    var $addModuleAssistantContainer = $(addModuleAssistantContainer);

    var events = this._jQueryStepsInitialized ? {} : {
      onStepChanging: (event, currentIndex, newIndex) => this._addModuleAssistantStepChanging(event, currentIndex, newIndex),
      onStepChanged: async (event, currentIndex, priorIndex) => this._addModuleAssistantStepChanged(event, currentIndex, priorIndex),
      onFinishing: () => assistantController.isInstallCompleted(),
      onFinished: () => this._addModuleAssistantFinished(),
    };
  
    $addModuleAssistantContainer.steps({
      ...events,
      headerTag: "h3",
      bodyTag: "section",
      contentContainerTag: "module-settings-assistant-add",
      autoFocus: true,
      stepsOrientation: 1,
      labels: {
        cancel: i18n.t("general.cancel"),
        finish: i18n.t("general.finish"),
        next: i18n.t("general.next"),
        previous: i18n.t("general.previous")
      }
    });
    this._jQueryStepsInitialized = true;

    // jQuery.steps() is messing up with DOM :( we need to reassign step components
    this._setupSteps(addModuleAssistantContainer);

    if (assistantController.get('reposUpdated')) {
      await assistantController.notifyRepositoriesAvailable();
    }
  }

  _resetModuleAssistantContent() {
    assistantController.resetRepositoryUpdateSubscribers();

    var moduleAssistantStepsContainer = this.querySelector('#module-settings-assistant-add');
    moduleAssistantStepsContainer.innerHTML = '';

    moduleAssistantStepsContainer.appendChild(templateAddSteps.content.cloneNode(true));
    assistantHelper.localizeContainer(moduleAssistantStepsContainer, assistantController.get('moduleType'));
  }

  _addModuleAssistantStepChanging(event, currentIndex, newIndex) {
    if (currentIndex == LANGUAGES_INDEX && newIndex == REPOSITORIES_INDEX) { // Changing from Languages to Repositories
      return assistantController.get('selectedLanguages').size > 0;
    } else if (currentIndex == REPOSITORIES_INDEX && newIndex == MODULES_INDEX) { // Changing from Repositories to Modules 
      return assistantController.get('selectedRepositories').size > 0;
    } else if (currentIndex == MODULES_INDEX && newIndex == INSTALL_INDEX) { // Changing from Modules to Installation
      return assistantController.get('selectedModules').size > 0;
    } else if (currentIndex == INSTALL_INDEX && newIndex != INSTALL_INDEX) {
      return false;
    }

    return true;
  }

  async _addModuleAssistantStepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == LANGUAGES_INDEX) {
      assistantController.saveSelectedLanguages();
    } else if (priorIndex == REPOSITORIES_INDEX) {
      assistantController.saveSelectedRepositories();
    } 

    const container = this.querySelector('#module-settings-assistant-add');
    if (currentIndex == REPOSITORIES_INDEX) {
      this._initPage(this.repositoriesStep, REPOSITORIES_INDEX, container);
      await this.repositoriesStep.listRepositories();
    } else if (currentIndex == MODULES_INDEX) {
      this._initPage(this.modulesStep, MODULES_INDEX, container);
      await this.modulesStep.listModules();
    } else if (currentIndex == INSTALL_INDEX) {
      this._initPage(this.installStep, INSTALL_INDEX, container);
      await this.installStep.installSelectedModules();
    }
  }

  async _addModuleAssistantFinished() {
    $('#module-settings-assistant').dialog('close');
    assistantController.init('installedModules', await app_controller.translation_controller.getInstalledModules());

    if (assistantController.get('moduleType') == 'BIBLE') {
      await app_controller.translation_controller.initTranslationsMenu();
      await tags_controller.updateTagUiBasedOnTagAvailability();
    }
  }

  _setupSteps(container) {
    /** @type {import('./step_languages')} */
    // this.languagesStep = container.querySelector('step-languages');
    this.languagesStep = document.createElement('step-languages');
    this._initPage(this.languagesStep, LANGUAGES_INDEX, container);

    /** @type {import('./step_repositories')} */
    // this.repositoriesStep = container.querySelector('step-repositories');
    this.repositoriesStep = document.createElement('step-repositories');

    /** @type {import('./step_modules')} */
    // this.modulesStep = container.querySelector('step-modules');
    this.modulesStep = document.createElement('step-modules');

    /** @type {import('./step_install')} */
    // this.installStep = container.querySelector('step-install');
    this.installStep = document.createElement('step-install');

    /** @type {import('./unlock_dialog')*/
    this.unlockDialog = this.querySelector('unlock-dialog');

    this.modulesStep.unlockDialog = this.unlockDialog;
    this.installStep.unlockDialog = this.unlockDialog;
  }

  _initPage(component, pageIndex, container=null) {
    if (component.isConnected) {
      return;
    }
    container = container || this;
    const stepsPage = container.querySelector('#module-settings-assistant-add-p-'+pageIndex);
    stepsPage.appendChild(component);
  }
}

customElements.define('assistant-steps-add-modules', AssistantStepsAddModules);
module.exports = AssistantStepsAddModules;
