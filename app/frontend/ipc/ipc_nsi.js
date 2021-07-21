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

const IpcRenderer = require('./ipc_renderer.js');
const PlatformHelper = require('../../lib/platform_helper.js');
const HierarchicalObjectCache = require('./hierarchical_object_cache.js');

class IpcNsi {
  constructor() {
    this._ipcRenderer = new IpcRenderer();
    var platformHelper = new PlatformHelper();
    this._isCordova = platformHelper.isCordova();
    this._bookChapterCountCache = new HierarchicalObjectCache();
    this._chapterVerseCountCache = new HierarchicalObjectCache();
    this._allChapterVerseCountCache = new HierarchicalObjectCache();
    this._bookListCache = new HierarchicalObjectCache();
    this._moduleBookStatusCache = new HierarchicalObjectCache();
  }

  async repositoryConfigExisting() {
    var returnValue = await this._ipcRenderer.call('nsi_repositoryConfigExisting');
    return returnValue;
  }

  async updateRepositoryConfig(progressCallback=undefined) {
    var returnValue = await this._ipcRenderer.callWithProgressCallback('nsi_updateRepositoryConfig',
                                                                       'nsi_updateRepoConfigProgress',
                                                                       progressCallback,
                                                                       60000);
    return returnValue;
  }

  async getRepoNames() {
    var returnValue = this._ipcRenderer.call('nsi_getRepoNames');
    return returnValue;
  }

  async getRepoLanguages(repositoryName, moduleType) {
    var timeoutMs = 10000;
    var returnValue = this._ipcRenderer.callWithTimeout('nsi_getRepoLanguages', timeoutMs, repositoryName, moduleType);
    return returnValue;
  }

  async getAllRepoModules(repositoryName, moduleType) {
    var timeoutMs = 10000;
    var returnValue = this._ipcRenderer.callWithTimeout('nsi_getAllRepoModules', timeoutMs, repositoryName, moduleType);
    return returnValue;
  }

  async getRepoModulesByLang(repositoryName,
                             language,
                             moduleType,
                             headersFilter,
                             strongsFilter,
                             hebrewStrongsKeys,
                             greekStrongsKeys) {

    var timeoutMs = 10000;
    var returnValue = this._ipcRenderer.callWithTimeout('nsi_getRepoModulesByLang',
                                                        timeoutMs,
                                                        repositoryName,
                                                        language,
                                                        moduleType,
                                                        headersFilter,
                                                        strongsFilter,
                                                        hebrewStrongsKeys,
                                                        greekStrongsKeys);
    return returnValue;
  }

  async getRepoModule(moduleCode) {
    var returnValue = this._ipcRenderer.call('nsi_getRepoModule', moduleCode);
    return returnValue;
  }

  async getAllLocalModules(moduleType='BIBLE') {
    var returnValue = this._ipcRenderer.call('nsi_getAllLocalModules', moduleType);
    return returnValue;
  }

  getAllLocalModulesSync(moduleType='BIBLE') {
    var returnValue = this._ipcRenderer.callSync('nsi_getAllLocalModulesSync', moduleType);
    return returnValue;
  }

  async getAllLanguageModuleCount(selectedRepos, languageCodeArray, moduleType='BIBLE') {
    var returnValue = this._ipcRenderer.call('nsi_getAllLanguageModuleCount', selectedRepos, languageCodeArray, moduleType);
    return returnValue;
  }

  async installModule(moduleCode, progressCallback=undefined) {
    var returnValue = this._ipcRenderer.callWithProgressCallback('nsi_installModule',
                                                                 'nsi_updateInstallProgress',
                                                                 progressCallback,
                                                                 120000,
                                                                 moduleCode);
    return returnValue;
  }

  installModuleSync(moduleCode) {
    var returnValue = this._ipcRenderer.callSync('nsi_installModuleSync', moduleCode);
    return returnValue;
  }

  async cancelInstallation() {
    var returnValue = this._ipcRenderer.call('nsi_cancelInstallation');
    return returnValue;
  }

  async uninstallModule(moduleCode) {
    var returnValue = this._ipcRenderer.call('nsi_uninstallModule', moduleCode);
    return returnValue;
  }

  resetNsi() {
    var returnValue = this._ipcRenderer.callSync('nsi_resetNsi');
    return returnValue;
  }

  async saveModuleUnlockKey(moduleCode, key) {
    var returnValue = this._ipcRenderer.call('nsi_saveModuleUnlockKey', moduleCode, key);
    return returnValue;
  }

  async isModuleReadable(moduleCode) {
    var returnValue = this._ipcRenderer.call('nsi_isModuleReadable', moduleCode);
    return returnValue;
  }

  async getRawModuleEntry(moduleCode, key) {
    var returnValue = this._ipcRenderer.call('nsi_getRawModuleEntry', moduleCode, key);
    return returnValue;
  }

  async getChapterText(moduleCode, bookCode, chapter) {
    var returnValue = this._ipcRenderer.call('nsi_getChapterText', moduleCode, bookCode, chapter);
    return returnValue;
  }

  async getBookText(moduleCode, bookCode, startVerseNr=-1, verseCount=-1) {
    var timeoutMs = 30000;
    var returnValue = this._ipcRenderer.callWithTimeout('nsi_getBookText', timeoutMs, moduleCode, bookCode, startVerseNr, verseCount);
    return returnValue;
  }

  async getVersesFromReferences(moduleCode, references) {
    var returnValue = this._ipcRenderer.call('nsi_getVersesFromReferences', moduleCode, references);
    return returnValue;
  }

  async getReferencesFromReferenceRange(referenceRange) {
    var returnValue = this._ipcRenderer.call('nsi_getReferencesFromReferenceRange', referenceRange);
    return returnValue;
  }

  async getBookList(moduleCode) {
    return await this._bookListCache.fetch(async () => {
      return await this._ipcRenderer.call('nsi_getBookList', moduleCode);
    }, moduleCode);
  }

  async getBookChapterCount(moduleCode, bookCode) {
    return await this._bookChapterCountCache.fetch(async () => {
      return await this._ipcRenderer.call('nsi_getBookChapterCount', moduleCode, bookCode);
    }, moduleCode, bookCode);
  }

  async getChapterVerseCount(moduleCode, bookCode, chapter) {
    return await this._chapterVerseCountCache.fetch(async () => {
      return await this._ipcRenderer.call('nsi_getChapterVerseCount', moduleCode, bookCode, chapter);
    }, moduleCode, bookCode, chapter);
  }

  async getAllChapterVerseCounts(moduleCode, bookCode) {
    return await this._allChapterVerseCountCache.fetch(async () => {
      return await this._ipcRenderer.call('nsi_getAllChapterVerseCounts', moduleCode, bookCode);
    }, moduleCode, bookCode);
  }

  async getBookIntroduction(moduleCode, bookCode) {
    var returnValue = this._ipcRenderer.call('nsi_getBookIntroduction', moduleCode, bookCode);
    return returnValue;
  }

  async moduleHasBook(moduleCode, bookCode) {
    var returnValue = this._ipcRenderer.call('nsi_moduleHasBook', moduleCode, bookCode);
    return returnValue;
  }

  async getModuleBookStatus(bookCode) {
    return await this._moduleBookStatusCache.fetch(async () => {
      return await this._ipcRenderer.call('nsi_getModuleBookStatus', bookCode);
    }, bookCode);
  }

  async getModuleSearchResults(progressCB,
                               moduleCode,
                               searchTerm,
                               searchType,
                               isCaseSensitive,
                               useExtendedVerseBoundaries) {

    var returnValue = this._ipcRenderer.callWithProgressCallback('nsi_getModuleSearchResults',
                                                                 'nsi_updateSearchProgress',
                                                                 progressCB,
                                                                 60000,
                                                                 moduleCode,
                                                                 searchTerm,
                                                                 searchType,
                                                                 isCaseSensitive,
                                                                 useExtendedVerseBoundaries);
    return returnValue;
  }

  async terminateModuleSearch() {
    var returnValue = this._ipcRenderer.call('nsi_terminateModuleSearch');
    return returnValue;
  }

  async hebrewStrongsAvailable() {
    var returnValue = this._ipcRenderer.call('nsi_hebrewStrongsAvailable');
    return returnValue;
  }

  async greekStrongsAvailable() {
    var returnValue = this._ipcRenderer.call('nsi_greekStrongsAvailable');
    return returnValue;
  }

  async strongsAvailable() {
    var returnValue = this._ipcRenderer.call('nsi_strongsAvailable');
    return returnValue;
  }

  async getStrongsEntry(strongsKey) {
    var returnValue = this._ipcRenderer.call('nsi_getStrongsEntry', strongsKey);
    return returnValue;
  }

  async getLocalModule(moduleCode) {
    var module = this._ipcRenderer.call('nsi_getLocalModule', moduleCode);
    return module;
  }

  async isModuleInUserDir(moduleCode) {
    var returnValue = this._ipcRenderer.call('nsi_isModuleInUserDir', moduleCode);
    return returnValue;
  }

  async getSwordTranslation(originalString, localeCode) {
    var returnValue = this._ipcRenderer.call('nsi_getSwordTranslation', originalString, localeCode);
    return returnValue;
  }

  async getBookAbbreviation(moduleCode, bookCode, localeCode) {
    var returnValue = this._ipcRenderer.call('nsi_getBookAbbreviation', moduleCode, bookCode, localeCode);
    return returnValue;
  }

  async getSwordVersion() {
    var returnValue = this._ipcRenderer.call('nsi_getSwordVersion');
    return returnValue;
  }
}

module.exports = IpcNsi;