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

const template = html`
<style>
  #unlock-failed-msg {
    color: red;
  }
  #unlock-key-input {
    width: 20em;
  }
</style>
 
<div id="module-settings-assistant-unlock-dialog" style="display: none;">
  <p id="dialog-unlock-info" class="external"></p>
  <p id="unlock-failed-msg" style="display: none;" i18n="module-assistant.unlock.unlock-failed"></p>
  <span id="unlock-key-label" i18n="module-assistant.unlock.unlock-key"></span>: <input id="unlock-key-input" type="text" maxlength="255" />
</div>
`;

class UnlockDialog extends HTMLElement {
  get opened() {
    return this._unlockDialogOpened;
  }

  get cancelled() {
    return this._unlockCancelled;
  }

  constructor() {
    super();

    this._unlockDialogOpened = false;
    this._unlockCancelled = false;
  }

  connectedCallback() {  
    this.appendChild(template.content);
    assistantHelper.localizeContainer(this);
  }

  show(moduleId, unlockInfo="", checkbox=undefined) {
    if (this._unlockDialogOpened) {
      return;
    }

    const unlockDialog = document.querySelector('#module-settings-assistant-unlock-dialog');
    const unlockFailedMsg = unlockDialog.querySelector('#unlock-failed-msg');
    const unlockInfoElement = unlockDialog.querySelector('#dialog-unlock-info');
    const inputElement = unlockDialog.querySelector('#unlock-key-input');
    inputElement.value = "";

    if (unlockInfo.trim() != "") {
      unlockInfoElement.innerHTML = unlockInfo;
    }


    if (checkbox === undefined) {
      unlockFailedMsg.style.display = 'block';
    } else {
      unlockFailedMsg.style.display = 'none';
    }

    var unlockDialogOptions = {
      modal: true,
      title: i18n.t("module-assistant.unlock.enter-unlock-key", { moduleId }),
      dialogClass: 'ezra-dialog',
      width: 450,
      minHeight: 200
    };

    unlockDialogOptions.buttons = {};    
    unlockDialogOptions.buttons[i18n.t("general.cancel")] = () => {
      $(unlockDialog).dialog("close");
      this._unlockDialogOpened = false;
      this._unlockCancelled = true;
      if (checkbox !== undefined) {
        checkbox.checked = false; 
      }
    };

    unlockDialogOptions.buttons[i18n.t("general.ok")] = () => {
      const unlockKey = inputElement.value.trim();

      if (unlockKey.length > 0) {
        assistantController.setUnlockKey(moduleId, unlockKey);
      } else {
        if (checkbox !== undefined) {
          checkbox.checked = false;
        }
      }
      $(unlockDialog).dialog("close");
      this._unlockDialogOpened = false;
    };
    
    $(unlockDialog).dialog(unlockDialogOptions);
    this._unlockDialogOpened = true;
    
    inputElement.focus();
  }

  resetKey(moduleId) {
    assistantController.setUnlockKey(moduleId, '');
  }
}

customElements.define('unlock-dialog', UnlockDialog);
module.exports = UnlockDialog;