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
  .update-repository-data-wrapper {
    padding: 5px 2.5%;
    height: 3em;
    box-sizing: border-box;
    display: grid;
    place-items: center;
    background: var(--widget-bg-color, #eee);
    border-radius: 5px;
    margin-bottom: 1em;
  }
  .update-repository-data-info {
    text-align: center;
  }
  .update-repository-data-info button {
    height: 2em;
    padding-left: 1em;
    padding-right: 1em;
    margin-left: 1em;
  }
  .update-repository-data-progress {
    width: 100%;
  }
  .update-repository-data-progress .progress-bar, .update-failed{
    margin: 0;
  }
</style>

<section class="update-repository-data-wrapper">
  
  <div class="update-repository-data-info">
    <span class="update-info"></span>
    <button class="update-repo-data fg-button ui-state-default ui-corner-all" i18n="module-assistant.update-data.update-now"></button>
  </div>
  
  <div class="update-repository-data-progress" style="display: none"> 
    <div class="repo-update-progress-bar progress-bar">
      <div class="progress-label" i18n="module-assistant.update-data.updating-repository-data"></div>
    </div>
  </div>  
  <p class="update-failed error" style="display: none" i18n="module-assistant.update-data.update-failed"></p>

</section>
`;

class UpdateRepositories extends HTMLElement {
  constructor() {
    super();
    this._initialized = false;
  }

  async connectedCallback() {
    if (this._initialized || !this.isConnected) {
      return;
    }

    this.appendChild(template.content.cloneNode(true));
    uiHelper.configureButtonStyles(this);

    this.querySelector('.update-repo-data').addEventListener('click', async () => await assistantController.updateRepositories());
    assistantController.onStartRepositoriesUpdate(() => this.prepareProgressBar());
    assistantController.onProgressRepositoriesUpdate(process => this.handleUpdateProgress(process));
    assistantController.onCompletedRepositoriesUpdate(status => this.updateDateInfo(status));
    
    assistantHelper.localizeContainer(this);

    this._initialized = true;

    if (!assistantController.get('reposUpdated')) {
      await assistantController.updateRepositories();
    } else {
      this._showUpdateInfo();
    }
  }

  _showUpdateInfo() {
    this._toggleViews('INFO');
    
    const date = assistantController.get('reposUpdated');

    if (date) {
      this.querySelector('.update-info').textContent = assistantHelper.localizeText("module-assistant.update-data.repo-data-last-updated", { date });
    }
  }

  prepareProgressBar() {
    this._toggleViews('UPDATE');
    uiHelper.initProgressBar($(this.querySelector('.repo-update-progress-bar')));
  }

  handleUpdateProgress(progress) {
    const progressBar = this.querySelector('.repo-update-progress-bar');
    const progressPercent = progress.totalPercent;
    $(progressBar).progressbar("value", progressPercent);
  }

  updateDateInfo(status) {
    if (status != 0) {
      console.log("Failed to update the repository configuration!");
      this._toggleViews('ERROR');
    }
    setTimeout(() => { this._showUpdateInfo(); }, status == 0 ? 500 : 5000);
  }

  _toggleViews(view='INFO') {
    const infoView = this.querySelector('.update-repository-data-info');
    const updateView = this.querySelector('.update-repository-data-progress');
    const errorView = this.querySelector('.update-failed');     
    if (view === 'UPDATE') {
      infoView.style.display = 'none';
      errorView.style.display = 'none';
      updateView.style.display = 'block';  
    } else if (view === 'ERROR') {
      updateView.style.display = 'none';
      infoView.style.display = 'none';
      errorView.style.display = 'block';
    } else {
      updateView.style.display = 'none';
      errorView.style.display = 'none';
      infoView.style.display = 'block';
    }
  }

}

customElements.define('update-repositories', UpdateRepositories);
module.exports = UpdateRepositories;
