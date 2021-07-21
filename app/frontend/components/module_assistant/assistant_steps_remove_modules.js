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
require('./step_modules_remove.js');
require('./step_remove.js');

const template = html`
<style>
  #module-settings-assistant-remove .content {
    min-height: calc(100% - 4em);
    background: var(--widget-bg-color);
  }
  #module-settings-assistant-remove {
    height: 100%;
  }
</style>

<div id="module-settings-assistant-remove" style="display: none;"></div>
`;

const templateSteps = html`
  <h3 i18n="{{module_type, title-case}}"></h3>
  <section id="module-list" class="scrollable">
    <!-- <step-module-remove></step-module-remove> -->
  </section>

  <h3 i18n="module-assistant.removal"></h3>
  <section id="uninstall" class="scrollable">
    <!-- <step-remove></step-remove> -->
  </section>
`;

const MODULES_INDEX = 0;
const REMOVE_INDEX = MODULES_INDEX + 1;


class AssistantStepsRemoveModules extends HTMLElement {
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

  initCallbacks(onAllTranslationsRemoved, onTranslationRemoved) {
    this.onAllTranslationsRemoved = onAllTranslationsRemoved;
    this.onTranslationRemoved = onTranslationRemoved;
  }

  show() {
    this.querySelector('#module-settings-assistant-remove').style.display = 'block';
  }

  hide() {
    this.querySelector('#module-settings-assistant-remove').style.display = 'none';
  }

  async startModuleAssistantSteps() {
    this.show();
    this._resetModuleAssistantContent();

    var moduleAssistantStepsContainer = this.querySelector('#module-settings-assistant-remove');
    var $moduleStepsAssistantContainer = $(moduleAssistantStepsContainer);

    var events = this._jQueryStepsInitialized ? {} : {
      onStepChanging: (event, currentIndex, newIndex) => this._stepChanging(event, currentIndex, newIndex),
      onStepChanged: async (event, currentIndex, priorIndex) => this._stepChanged(event, currentIndex, priorIndex),
      onFinishing: () => assistantController.isInstallCompleted(),
      onFinished: () => this._finished(),
    };

    $moduleStepsAssistantContainer.steps({
      ...events,
      headerTag: "h3",
      bodyTag: "section",
      contentContainerTag: "module-settings-assistant-remove",
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
    this._setupSteps(moduleAssistantStepsContainer);

    await this.modulesStep.listModules();
  }

  _resetModuleAssistantContent() {
    var moduleAssistantStepsContainer = this.querySelector('#module-settings-assistant-remove');    
    moduleAssistantStepsContainer.innerHTML = '';
    
    moduleAssistantStepsContainer.appendChild(templateSteps.content.cloneNode(true));
    assistantHelper.localizeContainer(moduleAssistantStepsContainer, assistantController.get('moduleType'));
  }

  _stepChanging(event, currentIndex, newIndex) {
    if (currentIndex == MODULES_INDEX && newIndex == REMOVE_INDEX) { 
      return assistantController.get('selectedModules').size > 0;
    } else if (currentIndex == REMOVE_INDEX && newIndex != REMOVE_INDEX) {
      return false;
    }

    return true;
  }

  async _stepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == MODULES_INDEX) {
      await this.removeStep.uninstallSelectedModules(this.onAllTranslationsRemoved, this.onTranslationRemoved);
    }
  }

  async _finished() {
    $('#module-settings-assistant').dialog('close');

    assistantController.init('installedModules', await app_controller.translation_controller.getInstalledModules());

    if (assistantController.get('moduleType') == 'BIBLE') {
      await app_controller.translation_controller.initTranslationsMenu();
    }
  }

  _setupSteps(container) {
    /** @type {import('./step_modules_remove')} */
    // this.modulesStep = container.querySelector('step-modules-remove');
    this.modulesStep = document.createElement('step-modules-remove');
    this._initPage(this.modulesStep, MODULES_INDEX, container);

    /** @type {import('./step_remove')} */
    // this.installStep = container.querySelector('step-remove');
    this.removeStep = document.createElement('step-remove');
    this._initPage(this.removeStep, REMOVE_INDEX, container);
  }

  _initPage(component, pageIndex, container=null) {
    container = container || this;
    const stepsPage = container.querySelector('#module-settings-assistant-remove-p-'+pageIndex);
    stepsPage.appendChild(component);
  }
}

customElements.define('assistant-steps-remove-modules', AssistantStepsRemoveModules);
module.exports = AssistantStepsRemoveModules;
