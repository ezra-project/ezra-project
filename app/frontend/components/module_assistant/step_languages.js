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


const { html, waitUntilIdle } = require('../../helpers/ezra_helper.js');
const assistantController = require('./assistant_controller.js');
const i18nController = require('../../controllers/i18n_controller.js');
const languageMapper = require('../../../lib/language_mapper.js');
const assistantHelper = require('./assistant_helper.js');
const swordModuleHelper = require('../../helpers/sword_module_helper.js');
require('./update_repositories.js');
require('../loading_indicator.js');
require('../generic/fuzzy_search.js');

const template = html`
<style>
  #language-step-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  #language-list-wrapper {
    border-radius: 5px;
    flex-grow: 1;
  }
  #language-list-wrapper .intro {
    margin: 0 3em 1em;
    text-align: center;
  }
  #language-list-wrapper .update-repository-data-failed {
    text-align: center;
  }

  #language-list-wrapper fuzzy-search {
    display: none;
    text-align: end;
    margin-top: 1.5em;
    margin-inline-end: 2em;
    font-size: 0.8em;
  }
  .language-extra-info-container {
    min-height: 3em;
  }
</style>

<div id="language-step-wrapper">
  <update-repositories></update-repositories>

  <div id="language-list-wrapper" class="scrollable">
    <p class="intro" i18n="module-assistant.step-languages.select-language"></p> 
    <p class="assistant-note" i18n="module-assistant.step-languages.total-modules-language"></p>

    <div class="language-extra-info-container">
    <fuzzy-search max-result="12" style="display: none;" title="search-menu.search" style="display: none;"></fuzzy-search>
    <div class="search-result"></div>
    
    <loading-indicator></loading-indicator>
    <p class="loading-text" i18n="module-assistant.step-languages.loading-languages"></p>
    <p class="update-repository-data-failed error" style="display: none" i18n="module-assistant.update-data.update-repository-data-failed"></p>
    </div>

    <div class="all-languages"></div>
  </div>

</div>
`;

/**
 * @module StepLanguages
 * component retrieves, sorts and displays all available languages for module installation
 * @example
 * <step-languages></step-languages>
 * @category Component
 */
class StepLanguages extends HTMLElement {
  
  constructor() {
    super();
    this._initialized = false;
  }

  connectedCallback() {
    if (this._initialized) {
      return;
    }

    this.appendChild(template.content.cloneNode(true));
    
    this._loading = this.querySelector('loading-indicator');
    this._loadingText = this.querySelector('.loading-text');
    this._errorText = this.querySelector('.update-repository-data-failed');
    /**@type {import('../generic/fuzzy_search')} */
    this._search = this.querySelector('fuzzy-search');
    this._searchResults = this.querySelector('.search-result');
    this._allLanguages = this.querySelector('.all-languages');

    this._localize();

    /** @type {import('./update_repositories')} */
    this.updateRepositories = this.querySelector('update-repositories');

    this.addEventListener('itemChanged', (e) => this._handleCheckboxClick(e));
    this.addEventListener('searchResultsReady', (e) => this._handleSearchResult(e));

    assistantController.onStartRepositoriesUpdate(async () => await this.resetView());
    assistantController.onCompletedRepositoriesUpdate(async status => {
      if (status == 0) {
        await this.listLanguages();
      } else {
        this._loadingText.style.display = 'none';
        this._loading.hide();
        this._errorText.style.display = 'block';
      }
    });

    this._initialized = true;
  }

  async resetView() {
    this._allLanguages.innerHTML = '';
    this._searchResults.innerHTML = '';
    this._search.style.display = 'none';
    this._errorText.style.display = 'none';
    
    this._loading.show();
    this._loadingText.style.display = 'block';
  }

  async listLanguages() {    
    const languageData = await getAvailableLanguagesFromRepos(); 

    assistantController.init('languageRepositories', languageData.languageRepositories);
    
    this._loadingText.style.display = 'none';

    this._initSearch(languageData.allLanguages);

    const selectedLanguages = assistantController.get('selectedLanguages');
    
    this._appendList(this._allLanguages, 
                     languageData.appSystemLanguages, 
                     selectedLanguages, 
                     i18n.t('module-assistant.step-languages.app-system-languages'));

    this._allLanguages.animate({opacity: [0, 1]}, 500);


    const languages = languageData.languages;

    const containerSmallList = document.createElement('div');
    for(const category of ['bible-languages', 'most-spoken-languages', 'historical-languages']) {      
      this._appendList(containerSmallList, 
                       languages[category], 
                       selectedLanguages, 
                       i18n.t(`module-assistant.step-languages.${category}`));
    }
      
    this._allLanguages.appendChild(containerSmallList);
    containerSmallList.animate({opacity: [0, 1]}, 500);
      
      
    // schedule other work for idle loop; browser should do layout and paint and be ready to interact with user
    await waitUntilIdle();    
    const languageModuleCount = await getLanguageCount([...languageData.allLanguages.keys()]); 
      
    await waitUntilIdle();
    const containerLongList = document.createElement('div');
    for(const category of ['iso6391-languages', 'iso6392T-languages', 'iso6393-languages', 'unknown-languages']) {      
      this._appendList(containerLongList, 
                       languages[category], 
                       selectedLanguages, 
                       category === 'iso6391-languages' ? i18n.t('module-assistant.step-languages.other-languages') : undefined);
    }

    await waitUntilIdle();
    this._updateLanguageCount(languageModuleCount, this._allLanguages);
    this._updateLanguageCount(languageModuleCount, containerLongList);
    
    await waitUntilIdle();
    this._allLanguages.appendChild(containerLongList);

    await waitUntilIdle();
    this._loading.hide();
  }

  _appendList(container, languageMap, selectedLanguages, sectionHeader) {
    if (languageMap.size > 0) {
      container.appendChild(assistantHelper.listCheckboxSection(languageMap, selectedLanguages, sectionHeader, {limitRows: true}));
    }
  }

  _updateLanguageCount(languageModuleCount, container) {
    container.querySelectorAll('assistant-checkbox').forEach(checkbox => {
      checkbox.count = languageModuleCount[checkbox.code];
    });
  }

  _initSearch(languages) {
    if (languages.size < 25) { // no need for search if language count is small
      return;
    }

    this._search.style.display = 'block';
    // this._search.animate([{transform: "translateY(-60%)", opacity: 0}, {transform: "translateY(0)", opacity: 1}], 200);

    this._search.init([...languages.values()], 
                      [{name: 'text', weight: 1}, 
                       {name: 'code', weight: 0.5}, 
                       {name: 'description', weight: 0.1}]);
  }

  _handleSearchResult(event) {
    const result = event.detail.results.map(r => r.item);

    this._searchResults.innerHTML = '';
    this._searchResults.append(assistantHelper.listCheckboxSection(result, 
                                                                   assistantController.get('selectedLanguages'), 
                                                                   i18n.t('module-assistant.step-languages.language-search-results')));
  }

  _handleCheckboxClick(event) {
    const languageCode = event.detail.code;
    const checked = event.detail.checked;

    this.querySelectorAll(`assistant-checkbox[code="${languageCode}"]`).forEach(checkbox => {
      if (checkbox !== event.target) {
        checkbox.checked = checked;
      }
    });
    
    if (checked) {
      assistantController.add('selectedLanguages', languageCode);
    } else {
      assistantController.remove('selectedLanguages', languageCode);
    }
  }

  _localize() {
    var title = this._search && this._search.getAttribute('title');
    if (title) {
      this._search.setAttribute('title', i18n.t(title));
    }

    assistantHelper.localizeContainer(this, assistantController.get('moduleType'));    
  }
}

customElements.define('step-languages', StepLanguages);
module.exports = StepLanguages;

async function getAvailableLanguagesFromRepos() {
  var appSystemLanguageCodes = new Set([i18nController.getLocale(), i18nController.getSystemLocale(), ...(await getInstalledLanguages())]);
  var bibleLanguages = new Set(['grc', 'hbo']);
  var mostSpeakingLanguages = new Set(['en', 'zh', 'hi', 'es', 'ar', 'bn', 'fr', 'ru', 'pt', 'ur']); // source: https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers
  const historicalLanguageTypes = new Set(['ancient', 'extinct', 'historical']);

  var appSystemLanguages = new Map();
  var languages = {
    'bible-languages': new Map(),
    'most-spoken-languages': new Map(),
    'historical-languages': new Map(),
    'iso6391-languages': new Map(),
    'iso6392T-languages': new Map(),
    'iso6393-languages': new Map(),
    'unknown-languages': new Map(),
  };
  
  var allLanguages = new Map();
  var languageRepositories = {};

  const repositories = assistantController.get('allRepositories');

  for (const currentRepo of repositories) {
    var repoLanguages = await ipcNsi.getRepoLanguages(currentRepo, assistantController.get('moduleType'));

    for (const currentLanguageCode of repoLanguages) {
      const languageInfo = languageMapper.getLanguageDetails(currentLanguageCode, i18nController.getLocale());

      let starred = false;

      if (appSystemLanguageCodes.has(languageInfo.languageCode)) {
        starred = true;
        addLanguage(appSystemLanguages, languageInfo, currentLanguageCode, starred);
      } 
      
      if (bibleLanguages.has(languageInfo.languageCode)) {
        addLanguage(languages['bible-languages'], languageInfo, currentLanguageCode, starred);
      } else if (mostSpeakingLanguages.has(languageInfo.languageCode)) {
        addLanguage(languages['most-spoken-languages'], languageInfo, currentLanguageCode, starred);
      } else if (historicalLanguageTypes.has(languageInfo.type)) {
        addLanguage(languages['historical-languages'], languageInfo, currentLanguageCode, starred);
      } else if (languageInfo.iso6391) {
        addLanguage(languages['iso6391-languages'], languageInfo, currentLanguageCode, starred);
      } else if (languageInfo.iso6392T) {
        addLanguage(languages['iso6392T-languages'], languageInfo, currentLanguageCode, starred);
      } else if (languageInfo.iso6393) {
        addLanguage(languages['iso6393-languages'], languageInfo, currentLanguageCode, starred);
      } else {
        console.log("Unknown lang:", currentLanguageCode, languageInfo);
        addLanguage(languages['unknown-languages'], languageInfo, currentLanguageCode, starred);          
      }

      addLanguage(allLanguages, languageInfo, currentLanguageCode, false, false); 

      languageRepositories[currentLanguageCode] = languageRepositories[currentLanguageCode] || [];
      languageRepositories[currentLanguageCode].push(currentRepo);
  
    }
  }

  return {
    appSystemLanguages,
    languages,
    allLanguages,
    languageRepositories,
  };
}

function addLanguage(languageMap, info, fullLanguageCode, starred=false, keyAsLanguageName=true) {
  var descriptionArr = [];
  if (info.languageRegion) {
    descriptionArr.push(info.languageRegion);
  }
  if (info.languageScript) {
    descriptionArr.push(info.languageScript);
  }

  const checkboxInfo = {
    code: fullLanguageCode,
    text: info.languageName,
    description: descriptionArr.join(' – ') 
  };
  if (starred) {
    checkboxInfo.icon = 'star';
  }
  
  const key = keyAsLanguageName ? info.languageName + (info.languageScript || '') + (info.languageRegion || '') : fullLanguageCode;
  languageMap.set(key, checkboxInfo);
}

async function getInstalledLanguages() {
  const installedModules = assistantController.get('installedModules');
  return Promise.all(installedModules.map(async moduleId => await swordModuleHelper.getModuleLanguage(moduleId)));
}

async function getLanguageCount(allLanguageCodes) {
  const repositories = assistantController.get('allRepositories');

  return ipcNsi.getAllLanguageModuleCount(repositories, 
                                          allLanguageCodes, 
                                          assistantController.get('moduleType'));
}