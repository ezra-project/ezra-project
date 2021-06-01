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

const LanguageMapper = require('../../../lib/language_mapper.js');
const ModuleAssistantHelper = require('./module_assistant_helper.js');

/**
 * The RemoteModuleAssistant component implements the dialog that handles module removals.
 * 
 * @category Component
 */
class RemoveModuleAssistant {
  constructor() {
    this._helper = new ModuleAssistantHelper();
    this._moduleRemovalStatus = 'DONE';
    this.languageMapper = new LanguageMapper();

    var removeButton = $('#remove-modules-button');

    removeButton.bind('click', async () => {
      var currentModuleType = app_controller.install_module_assistant._currentModuleType;

      var modules = await app_controller.translation_controller.getInstalledModules(currentModuleType);
      if (modules.length > 0) {
        this.openRemoveModuleAssistant(currentModuleType);
      }
    });
  }

  init(onAllTranslationsRemoved, onTranslationRemoved) {
    this.onAllTranslationsRemoved = onAllTranslationsRemoved;
    this.onTranslationRemoved = onTranslationRemoved;
  }

  async openRemoveModuleAssistant(moduleType) {
    $('#module-settings-assistant-init').hide();
    this.initRemoveModuleAssistant(moduleType);
    $('#module-settings-assistant-remove').show();

    var wizardPage = $('#module-settings-assistant-remove-p-0');
    wizardPage.empty();

    var headerText = "";
    if (moduleType == 'BIBLE') {
      headerText = i18n.t("module-assistant.select-translations-to-be-removed");
    } else if (moduleType == 'DICT') {
      headerText = i18n.t("module-assistant.select-dictionaries-to-be-removed");
    }

    var header = "<p>" + headerText + "</p>";
    wizardPage.append(header);

    wizardPage.append("<div id='remove-module-list'></div>");
    var removeModuleList = $('#remove-module-list');

    var languages = await app_controller.translation_controller.getLanguages(moduleType);

    for (var i = 0; i < languages.length; i++) {
      var currentLang = languages[i];

      var newLanguageBox = "<div>" +
                           "<h2>" + currentLang.languageName + "</h2>" +
                           "<div id='remove-module-assistant-" + currentLang.languageCode + "-modules'></div>" +
                           "</div>";

      removeModuleList.append(newLanguageBox);
    }

    var modules = await ipcNsi.getAllLocalModules(moduleType);

    for (var module of modules) {
      var checkboxDisabled = '';
      var currentModuleClass = "class='label' ";
      var fixedDictionaries = [ "StrongsHebrew", "StrongsGreek" ];
      var moduleIsInUserDir = await ipcNsi.isModuleInUserDir(module.name);
      
      if (!moduleIsInUserDir ||
          (moduleType == "DICT" && fixedDictionaries.includes(module.name))) {

        checkboxDisabled = "disabled='disabled' ";
        currentModuleClass = "class='label disabled'";
      }

      var currentTranslationHtml = "<p><input type='checkbox'" + checkboxDisabled + ">" + 
                                    "<span " + currentModuleClass + " id='" + module.name + "'>";
      currentTranslationHtml += module.description + "&nbsp; [" + module.name + "]</span></p>";

      var languageBox = $('#remove-module-assistant-' + module.language + '-modules');
      languageBox.append(currentTranslationHtml);
    }

    this._helper.bindLabelEvents(wizardPage);
  }

  initRemoveModuleAssistant() {
    if (this._removeModuleAssistantOriginalContent != undefined) {
      $('#module-settings-assistant-remove').steps("destroy");
      $('#module-settings-assistant-remove').html(this._removeModuleAssistantOriginalContent);
    } else {
      this._removeModuleAssistantOriginalContent = $('#module-settings-assistant-remove').html();
    }

    $('.module-settings-assistant-section-header-module-type').html(app_controller.install_module_assistant._moduleTypeText);

    $('#module-settings-assistant-remove').steps({
      headerTag: "h3",
      bodyTag: "section",
      contentContainerTag: "module-settings-assistant-remove",
      autoFocus: true,
      stepsOrientation: 1,
      onStepChanging: (event, currentIndex, newIndex) => this.removeModuleAssistantStepChanging(event, currentIndex, newIndex),
      onStepChanged: (event, currentIndex, priorIndex) => this.removeModuleAssistantStepChanged(event, currentIndex, priorIndex),
      onFinishing: (event, currentIndex) => this.removeModuleAssistantFinishing(event, currentIndex),
      onFinished: async (event, currentIndex) => this.removeModuleAssistantFinished(event, currentIndex),
      labels: {
        cancel: i18n.t("general.cancel"),
        finish: i18n.t("general.finish"),
        next: i18n.t("general.next"),
        previous: i18n.t("general.previous")
      }
    });
  }

  removeModuleAssistantStepChanging(event, currentIndex, newIndex) {
    if (currentIndex == 0 && newIndex == 1) { // Changing from Translations (1) to Removal (2)
      var wizardPage = "#module-settings-assistant-remove-p-0";
      var selectedLanguages = this._helper.getSelectedSettingsAssistantElements(wizardPage);
      return (selectedLanguages.length > 0);
    } else if (currentIndex == 1 && newIndex != 1) {
      return false;
    }

    return true;
  }

  async removeModuleAssistantStepChanged(event, currentIndex, priorIndex) {
    if (priorIndex == 0) {
      this._helper.lockDialogForAction('module-settings-assistant-remove');

      // Bible modules have been selected
      var modulesPage = "#module-settings-assistant-remove-p-0";
      this._uninstallModules = this._helper.getSelectedSettingsAssistantElements(modulesPage);

      this._moduleRemovalStatus = 'IN_PROGRESS';

      var removalPage = $("#module-settings-assistant-remove-p-1");
      removalPage.empty();

      var currentModuleType = app_controller.install_module_assistant._currentModuleType;
      var removingModules = "";
      if (currentModuleType == 'BIBLE') {
        removingModules = i18n.t("module-assistant.removing-translations");
      } else if (currentModuleType == 'DICT') {
        removingModules = i18n.t("module-assistant.removing-dictionaries");
      }

      removalPage.append('<h3>' + removingModules + '</h3>');

      setTimeout(async () => {
        for (var i = 0; i < this._uninstallModules.length; i++) {
          var moduleCode = this._uninstallModules[i];
          var localModule = await ipcNsi.getLocalModule(moduleCode);
          var moduleName = localModule.description;

          removalPage.append('<span>' + i18n.t("module-assistant.removing") + ' <i>' + moduleName + '</i> ... </span>');
          
          Sentry.addBreadcrumb({category: "app",
                                message: `Removing module ${moduleCode}`,
                                level: Sentry.Severity.Info});

          await ipcNsi.uninstallModule(moduleCode);

          var currentBibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();

          if (currentBibleTranslationId == moduleCode) {
            var modules = await app_controller.translation_controller.getInstalledModules('BIBLE');

            if (modules.length > 0) {
              // FIXME: Also put this in a callback
              app_controller.tab_controller.setCurrentBibleTranslationId(modules[0]);
              app_controller.onBibleTranslationChanged();
              await app_controller.navigation_pane.updateNavigation();
            } else {
              this.onAllTranslationsRemoved();
            }

            await this.onTranslationRemoved(moduleCode);
          }

          removalPage.append('<span>' + i18n.t("general.done") + '.</span>');
          removalPage.append('<br/><br/>');
        }

        this._moduleRemovalStatus = 'DONE';
        this._helper.unlockDialog('module-settings-assistant-remove');
      }, 800);
    }
  }

  removeModuleAssistantFinishing(event, currentIndex) {
    return this._moduleRemovalStatus != 'IN_PROGRESS';
  }

  async removeModuleAssistantFinished(event, currentIndex) {
    $('#module-settings-assistant').dialog('close');
    this._installedTranslations = await app_controller.translation_controller.getInstalledModules('BIBLE');
    await app_controller.translation_controller.initTranslationsMenu();
  }
}

module.exports = RemoveModuleAssistant;