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
require('./update_repositories.js');
require('../loading_indicator.js');

const template = html`
<style>
  #repo-step-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  #repo-list-wrapper {
    border-radius: 5px;
    flex-grow: 1;
  }
  #repo-list-wrapper .intro {
    margin: 0 3em 1em;
    text-align: center;
  }
  #repo-list-wrapper .update-repository-data-failed {
    text-align: center;
  }
  #repo-list-wrapper .repository-list {
    min-width: 2em;
  }
  .more-info {
    margin-top: 2em;
  }
</style>

<div id="repo-step-wrapper">
  <update-repositories></update-repositories>

  <div id="repo-list-wrapper" class="scrollable">
    
    <p class="intro" i18n="module-assistant.step-repositories.select-repository"></p>   
    <p class="assistant-note" i18n="module-assistant.step-repositories.total-modules-repo"></p>
    <p class="repository-explanation assistant-note" i18n="module-assistant.step-repositories.what-is-repository"></p>
    
    <loading-indicator></loading-indicator>
    <p class="loading-repos" i18n="module-assistant.step-repositories.loading-repositories"></p>
    <p class="update-repository-data-failed error" style="display: none" i18n="module-assistant.update-data.update-repository-data-failed"></p>
    <div class="repository-list"></div>

    <p class="more-info" i18n="module-assistant.step-repositories.more-repo-information-needed" style="display: none;"></p>
  </div>
  
</div>  
`;

/**
 * @module StepRepositories
 * component retrieves, sorts and displays all available repositories for module installation
 * @example
 * <step-repositories></step-repositories>
 * @category Component
 */
class StepRepositories extends HTMLElement {

  constructor() {
    super();
  }

  async connectedCallback() {
    this.appendChild(template.content.cloneNode(true));
    assistantHelper.localizeContainer(this, assistantController.get('moduleType'));

    assistantController.onStartRepositoriesUpdate(async () => await this.resetView());
    assistantController.onCompletedRepositoriesUpdate(async status => {
      if (status == 0) {
        await this.listRepositories();
      } else {
        this.querySelector('.loading-repos').style.display = 'none';
        this.querySelector('loading-indicator').hide();
        this.querySelector('.update-repository-data-failed').style.display = 'block';
      }
    });

    this.addEventListener('itemChanged', (e) => this._handleCheckboxClick(e));
  }
  
  async resetView() {
    this.querySelector('loading-indicator').show();
    this.querySelector('.loading-repos').style.display = 'block';
    this.querySelector('.more-info').style.display = 'none';
    this.querySelector('.update-repository-data-failed').style.display = 'none';
    
    this.querySelector('.repository-list').innerHTML = '';
  }

  async listRepositories() {
    this.querySelector('.loading-repos').style.display = 'none';

    const languageRepos = assistantController.get('languageRepositories');
    for(const language of assistantController.get('selectedLanguages')) {
      if (languageRepos[language] && languageRepos[language].length === 1) { // if only that language is in only one repository
        const onlyRepoWithLanguage = languageRepos[language][0];
        assistantController.add('selectedRepositories', onlyRepoWithLanguage); // preselect that repository
      }
    }

    const repositoryMap = await getRepoModuleDetails(assistantController.get('allRepositories'));

    const container = this.querySelector('.repository-list');
    const shouldAnimateIn = container.childElementCount === 0;
    
    container.innerHTML = '';
    container.appendChild(assistantHelper.listCheckboxSection(repositoryMap, 
                                                              assistantController.get('selectedRepositories'), 
                                                              "", 
                                                              {rowGap: '1.5em', extraIndent: true}));
    
    if (shouldAnimateIn) {
      container.animate({opacity: [0, 1]}, 200);
    }  
    
    this.querySelector('.more-info').style.display = 'block';
    this.querySelector('loading-indicator').hide();
  }

  _handleCheckboxClick(event) {
    const repoName = event.detail.code;
    const checked = event.detail.checked;
    
    if (checked) {
      assistantController.add('selectedRepositories', repoName);
    } else {
      assistantController.remove('selectedRepositories', repoName);
    }
  }

}

customElements.define('step-repositories', StepRepositories);
module.exports = StepRepositories;

async function getRepoModuleDetails(repos) {
  const moduleType = assistantController.get('moduleType');
  const selectedLanguages = assistantController.get('selectedLanguages');
  
  var repoData = new Map();

  for(const repo of repos) {
    const allRepoModules = await ipcNsi.getAllRepoModules(repo, moduleType);

    let repoLanguageCodes = new Set();
    let count = 0;

    for (const module of allRepoModules) {
      if (selectedLanguages.has(module.language)) {
        count++;
        repoLanguageCodes.add(module.language);
      }
    }

    const repoLanguages = [...repoLanguageCodes].map(lang => i18nHelper.getLanguageName(lang)).sort(assistantHelper.sortByText);

    var repoInfo = {
      code: repo,
      description: repoLanguages.join(', '),
      count,
    };
    if (repo === "CrossWire" || repo === "eBible.org") {
      repoInfo['icon'] = 'star';
      repoInfo['title'] = i18n.t("module-assistant.step-repositories.repo-recommended");
    }
    repoData.set(repo, repoInfo);
  }
  
  return repoData;
}
