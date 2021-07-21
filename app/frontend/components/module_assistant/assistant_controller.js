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

var state = {
  allRepositories: [],
  installedModules: [],
  selectedLanguages: new Set(),
  selectedRepositories: new Set(),
  selectedModules: new Set(),
  moduleType: null, 
  reposUpdated: null,
  languageRepositories: {},
};

const stateSetItems = new Set(['selectedLanguages', 'selectedRepositories', 'selectedModules']);

module.exports.initState = async function(moduleType) {
  if(moduleType !== 'BIBLE' && moduleType !== 'DICT') {
    console.log('ERROR: addModuleAssistant.initState: unable to recognize module type', moduleType);
    return false;
  }
  state.moduleType = moduleType;

  for(const item of stateSetItems) {
    state[item].clear();
  }

  state.installedModules = await app_controller.translation_controller.getInstalledModules(moduleType);

  const lastUpdate = await ipcSettings.get('lastSwordRepoUpdate', null);
  const repositoriesAvailable = lastUpdate && await ipcNsi.repositoryConfigExisting();

  if (repositoriesAvailable) {
    state.reposUpdated = new Date(Date.parse(lastUpdate));
  }
  this.resetRepositoryUpdateSubscribers();

  await restoreSelected('Languages');
  await restoreSelected('Repositories');
};


// *** Modify state functions ****************************

module.exports.get = (key) => state[key];

module.exports.init = (key, arr) => {
  if (key === 'installedModules') {
    state['installedModules'] = arr;
    return;
  } else if (key === 'languageRepositories') {
    state['languageRepositories'] = arr;
  }

  if (!stateSetItems.has(key)) {
    return;
  }
  state[key] = new Set(arr);
};

module.exports.add = (key, value) => {
  if (!stateSetItems.has(key)) {
    return;
  }
  state[key].add(value);
};

module.exports.remove = (key, value) => {
  if (!stateSetItems.has(key)) {
    return;
  }
  state[key].delete(value);
};


// *** Functions to restore/save selected state ****************************

async function restoreSelected(key) {
  key = `selected${key}`;
  state[key] = new Set(await ipcSettings.get(key, []));
}
async function saveSelected(key) {
  key = `selected${key}`;
  await ipcSettings.set(key, [...state[key]]);
}

var selectedLanguagesTemp;
var selectedRepositoriesTemp;
function preserveSelectedState() {
  selectedLanguagesTemp = state.selectedLanguages;
  state.selectedLanguages = new Set();
  selectedRepositoriesTemp = state.selectedRepositories;
  state.selectedRepositories = new Set();
}
function restoreSelectedState() {
  state.selectedLanguages = selectedLanguagesTemp;
  state.selectedRepositories = selectedRepositoriesTemp;
}

module.exports.saveSelectedLanguages = async () => saveSelected('Languages');
module.exports.saveSelectedRepositories = async () => saveSelected('Repositories');


// *** Functions to save and apply module unlock keys ****************************

var unlockKeys = {};
module.exports.setUnlockKey = (moduleId, unlockKey) => unlockKeys[moduleId] = unlockKey;

module.exports.applyUnlockKey = async (moduleId) => {
  // console.log("Module is locked ... saving unlock key");
  const unlockKey = unlockKeys[moduleId];
  await ipcNsi.saveModuleUnlockKey(moduleId, unlockKey);
  const moduleReadable = await ipcNsi.isModuleReadable(moduleId);
  return moduleReadable;
};


// *** Functions to track installation progress ****************************

var moduleInstallStatus = 'DONE';
module.exports.isInstallCompleted = () => moduleInstallStatus !== 'IN_PROGRESS'; 
module.exports.setInstallInProgress = () => moduleInstallStatus = 'IN_PROGRESS';
module.exports.setInstallDone = () => moduleInstallStatus = 'DONE';


// *** Functions to deal with repository data update ****************************

var updatingRepositoriesEvents;
module.exports.resetRepositoryUpdateSubscribers = function() {
  updatingRepositoriesEvents = {
    startUpdate: [],
    progressUpdate: [],
    completedUpdate: [
      async result => state.allRepositories = result == 0 ? await ipcNsi.getRepoNames() : []
    ],
  };
};

function addUpdateSubscriber(event, callback) {
  updatingRepositoriesEvents[event].push(callback);
}
async function notifySubscribers(event, payload=undefined) {
  for (let subscriberCallback of updatingRepositoriesEvents[event]) {
    if (typeof subscriberCallback === 'function') {
      await subscriberCallback(payload);
    }
  }
}
module.exports.onStartRepositoriesUpdate = callback => addUpdateSubscriber('startUpdate', callback);
module.exports.onProgressRepositoriesUpdate = callback => addUpdateSubscriber('progressUpdate', callback);
module.exports.onCompletedRepositoriesUpdate = callback => addUpdateSubscriber('completedUpdate', callback);

var updateInProgress = false;
module.exports.updateRepositories = async function() {
  if (updateInProgress) {
    return;
  }
  updateInProgress = true;
  
  preserveSelectedState();

  await notifySubscribers('startUpdate');
  const status = await ipcNsi.updateRepositoryConfig(process => notifySubscribers('progressUpdate', process));
  if (status == 0) {
    restoreSelectedState();
    const today = new Date();
    state.reposUpdated = today;
    await ipcSettings.set('lastSwordRepoUpdate', today);
  }
  await notifySubscribers('completedUpdate', status);

  updateInProgress = false;
};

module.exports.notifyRepositoriesAvailable = async () => {
  if (!updateInProgress) {
    notifySubscribers('completedUpdate', 0);
  }
};
