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


const { html, sleep } = require('../../helpers/ezra_helper.js');
const assistantController = require('./assistant_controller.js');
const assistantHelper = require('./assistant_helper.js');

const template = html`
<style>
  #module-install-intro {
    margin-bottom: 2em;
  }
  .install-info-container {
    display: flex;
    margin-bottom: 1em;
  }
  .install-info-container > div {
    margin-right: 1em;
  }
  .install-info-container .install-description {
    font-style: italic;
  }
  .install-info-container :nth-child(3), .install-info-container :last-child {
    align-self: flex-end;
  }
  .install-info-container .install-status.error {
    color: red;
  }
  #progress-bar-container {
    display: flex;
  }
  #module-install-progress-bar {
    width: 80%; 
  }
  #module-install-progress-msg {
    width: 80%; 
    padding-top: 0.5em; 
    text-align: center;
  }
</style>

<h3 i18n="module-assistant.step-install.installing-modules"></h3>
<p id="module-install-intro" class="intro" i18n="module-assistant.step-install.it-takes-time-to-install"></p>
<div id="progress-bar-container">
  <div id="module-install-progress-bar" class="progress-bar">
    <div class="progress-label" i18n="module-assistant.step-install.installing"></div>
  </div>
  <button id='cancel-module-installation-button' class='fg-button ui-corner-all ui-state-default' i18n="general.cancel"></button>
</div>
<div id="module-install-progress-msg"></div>
`;

const templateInfoContainer = html`
  <div class="install-info-container">
    <div class="install-general-info" i18n="module-assistant.step-install.installing"></div>
    <div class="install-description"></div>
    <div>...</div> 
    <div class="install-status"></div>
  </div>
`;

class StepInstall extends HTMLElement {
  constructor() {
    super();

    this._moduleInstallationCancelled = false;
    
    /** @type {import('./unlock_dialog')} */
    this.unlockDialog = null;
  }

  async connectedCallback() {
    this.appendChild(template.content.cloneNode(true));
    assistantHelper.localizeContainer(this, assistantController.get('moduleType'));

    uiHelper.configureButtonStyles(this);

    this.querySelector('#cancel-module-installation-button').addEventListener('click', async (e) => await this._handleCancelClick(e));
  }

  async installSelectedModules() {
    assistantHelper.lockDialogForAction('module-settings-assistant-add');
    assistantController.setInstallInProgress();

    const selectedModules = assistantController.get('selectedModules');
    for (const currentModule of selectedModules) {
      let unlockFailed = true;
      this._moduleInstallationCancelled = false;
      this.querySelector('#cancel-module-installation-button').classList.remove('ui-state-disabled');

      while (unlockFailed) {
        try {
          unlockFailed = false;
          await this._installModule(currentModule);
        } catch (e) {
          if (e == "UnlockError") {
            unlockFailed = true;
          }
        }

        if (unlockFailed) {
          const swordModule = await ipcNsi.getRepoModule(currentModule);
          this.unlockDialog.show(swordModule.name, swordModule.unlockInfo);

          while (this.unlockDialog.opened) {
            await sleep(500);
          }

          if (this.unlockDialog.cancelled) {
            await ipcNsi.uninstallModule(currentModule);
            break;
          }
        }
      }
    }

    this.querySelector('#cancel-module-installation-button').classList.add('ui-state-disabled');
    assistantController.setInstallDone();
    assistantHelper.unlockDialog('module-settings-assistant-add');
  }

  async _installModule(moduleCode) {
    var swordModule = await ipcNsi.getRepoModule(moduleCode);

    this._appendInstallationInfo(swordModule.description);

    const $progressBar = $(this.querySelector('#module-install-progress-bar'));
    uiHelper.initProgressBar($progressBar);

    var installSuccessful = true;
    var unlockSuccessful = true;
    
    try {
      let moduleInstalled = false;
      const localModule = await ipcNsi.getLocalModule(moduleCode);
      if (localModule !== undefined && localModule !== null) {
        moduleInstalled = true;
      }

      if (!moduleInstalled) {
        this.querySelector('#module-install-progress-msg').innerHTML = '';
        await ipcNsi.installModule(moduleCode, progress => this._handleModuleInstallProgress(progress));
      }

      if (swordModule.locked) {
        unlockSuccessful = await assistantController.applyUnlockKey(moduleCode);
        if (!unlockSuccessful) {
          const errorMessage = "Locked module is not readable! Wrong unlock key?";
          throw errorMessage;
        }
      }

    } catch (e) {
      console.log("Error during installation: " + e);
      installSuccessful = false;
    }
    
    if (installSuccessful) {
      Sentry.addBreadcrumb({category: "app",
                            message: `Installed module ${moduleCode}`,
                            level: Sentry.Severity.Info});
      
      this._setInstallationInfoStatus();
      $progressBar.progressbar("value", 100);
      var strongsAvailable = await ipcNsi.strongsAvailable();
      
      // FIXME: Put this in a callback
      if (assistantController.get('moduleType') == 'BIBLE') {
        await app_controller.updateUiAfterBibleTranslationAvailable(moduleCode);
      }

      if (assistantController.get('moduleType') == 'BIBLE' && swordModule.hasStrongs && !strongsAvailable) {
        await this._installStrongsModules();
      }
    } else {
      let errorType = "";

      if (!unlockSuccessful) {
        errorType = "module-unlock-failed";
      } else {
        if (this._moduleInstallationCancelled) {
          errorType = "module-install-cancelled";
        } else {
          errorType = "module-install-failed";
        }
      }

      this._setInstallationInfoStatus(errorType);
    }

    if (swordModule.locked && !unlockSuccessful) {
      throw "UnlockError";
    }
  }

  _handleModuleInstallProgress(progress) {
    const {totalPercent, message} = progress;

    const $progressBar = $(document.querySelector('#module-install-progress-bar'));
    $progressBar.progressbar("value", totalPercent);

    const progressMessage = this.querySelector('#module-install-progress-msg');
    if (message != '') {
      progressMessage.textContent = localizeModuleInstallProgressMessage(message);
    }
    
    if (totalPercent == 100) {
      progressMessage.innerHTML = '';
    }
  }

  async _installStrongsModules() {
    this._appendInstallationInfo(i18n.t("general.installing-strongs"), true);

    var strongsInstallSuccessful = true;

    try {
      var hebrewStrongsAvailable = await ipcNsi.hebrewStrongsAvailable();
      var greekStrongsAvailable = await ipcNsi.greekStrongsAvailable();

      if (!hebrewStrongsAvailable) {
        await ipcNsi.installModule("StrongsHebrew", (progress) => { this._handleModuleInstallProgress(progress); });
      }

      if (!greekStrongsAvailable) {
        await ipcNsi.installModule("StrongsGreek", (progress) => { this._handleModuleInstallProgress(progress); });
      }
    } catch (e) {
      strongsInstallSuccessful = false;
    }

    if (strongsInstallSuccessful) {
      app_controller.dictionary_controller.runAvailabilityCheck();
      this._setInstallationInfoStatus();
    } else {
      this._setInstallationInfoStatus("module-install-failed");
    }
  }

  _appendInstallationInfo(description, hideGeneralInfo=false) {
    const infoContainer = templateInfoContainer.content.cloneNode(true);
    infoContainer.querySelector('.install-description').textContent = description;
    if (!hideGeneralInfo) {
      const generalInfo = infoContainer.querySelector('.install-general-info');
      generalInfo.textContent = i18n.t(generalInfo.getAttribute('i18n'));
    }

    var progressContainer = this.querySelector('#progress-bar-container');
    progressContainer.parentElement.insertBefore(infoContainer, progressContainer);
  }

  _setInstallationInfoStatus(errorType="") {
    const infoContainer = this.querySelector('#progress-bar-container').previousElementSibling;
    var infoStatus = infoContainer.querySelector('.install-status');
    const i18nKey = errorType === "" ? this._moduleInstallationCancelled ? "module-install-cancelled" : "done" : errorType;
    infoStatus.textContent = i18n.t(`general.${i18nKey}`);
    if (errorType !== "") {
      infoStatus.classList.add('error');
    }
  }

  async _handleCancelClick(event) {
    event.target.classList.add('ui-state-disabled');
    this._moduleInstallationCancelled = true;
    await ipcNsi.cancelInstallation();
  }
}

customElements.define('step-install', StepInstall);
module.exports = StepInstall;

function localizeModuleInstallProgressMessage(rawMessage) {
  // rawMessage: Downloading (1 of 6): nt.bzz
  rawMessage = rawMessage.replace("Downloading ", "");
  var splittedMessage = rawMessage.split(": ");

  var partOfTotal = splittedMessage[0];
  partOfTotal = partOfTotal.replace("(", "");
  partOfTotal = partOfTotal.replace(")", "");
  var fileName = splittedMessage[1];

  var splittedPartOfTotal = partOfTotal.split(" of ");
  var part = splittedPartOfTotal[0];
  var total = splittedPartOfTotal[1];

  var localizedMessage = i18n.t("module-assistant.step-install.downloading") + " (" + part + " " + i18n.t("module-assistant.step-install.part-of-total") + " " + total + "): " + fileName;

  return localizedMessage;
}
