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

const { Given, When, Then } = require("cucumber");
const { assert, expect } = require("chai");
const spectronHelper = require('../helpers/spectron_helper.js');
const nsiHelper = require("../helpers/nsi_helper.js");
const uiHelper = require("../helpers/ui_helper.js");

async function clickCheckbox(checkboxCodeAttr, parentSelector='#module-settings-assistant-add') {
  var parent = await spectronHelper.getWebClient().$(parentSelector);
  var checkbox = await parent.$(`[code="${checkboxCodeAttr}"]`);
  await spectronHelper.getWebClient().waitUntil(async () => { return await checkbox.isExisting(); }, { timeout: 40000 });
  // click in the shadow
  spectronHelper.getWebClient().execute((p, c) => document.querySelector(`${p} [code="${c}"]`).shadowRoot.querySelector('#label').click(), parentSelector, checkboxCodeAttr);
}

async function getNavLinks(moduleSettingsDialogId='#module-settings-assistant-add') {
  var moduleSettingsAssistantAdd = await spectronHelper.getWebClient().$(moduleSettingsDialogId);
  var actionsDiv = await moduleSettingsAssistantAdd.$('.actions');
  var navLinks = await actionsDiv.$$('a');
  return navLinks;
}

async function clickNext(moduleSettingsDialogId='#module-settings-assistant-add') {
  var navLinks = await getNavLinks(moduleSettingsDialogId);
  var nextButton = navLinks[1];
  await nextButton.click();
}

Given('I open the module installation assistant', {timeout: 40 * 1000}, async function () {
  var verseListTabs = await spectronHelper.getWebClient().$('#verse-list-tabs-1');
  var displayOptionsButton = await verseListTabs.$('.display-options-button');
  var translationSettingsButton = await spectronHelper.getWebClient().$('#show-translation-settings-button');

  await displayOptionsButton.click();
  await spectronHelper.sleep();
  await translationSettingsButton.click();
  await spectronHelper.sleep();
});

Given('I choose to add translations', async function () {
  var addModulesButton = await spectronHelper.getWebClient().$('#add-modules-button');
  await addModulesButton.click();
});

Given('I choose to remove translations', async function () {
  var removeModulesButton = await spectronHelper.getWebClient().$('#remove-modules-button');
  await removeModulesButton.click();
});

Given('the repository update date matches today', {timeout: 40 * 1000}, async function () {
  var updateInfo = await spectronHelper.getWebClient().$('update-repositories .update-info');
  await spectronHelper.getWebClient().waitUntil(async () => { return await updateInfo.getText() !== ""; }, { timeout: 40000 });

  const today = (new Date()).toLocaleDateString('en');
  expect(await updateInfo.getText(), "Date doesn't match today's date").to.equal(`Repository data was last updated on ${today}.`);
});

Given('I select the CrossWire repository', {timeout: 40 * 1000}, async function () {
  await clickCheckbox('CrossWire');
  await clickNext();
});

Given('I select the English language', {timeout: 40 * 1000}, async function () {
  await clickCheckbox('en');
  await clickNext();
});

Given('I select the ASV module for installation', {timeout: 40 * 1000}, async function () {
  await clickCheckbox('ASV');
  await clickNext();
});

Given('I select the ASV module for removal', {timeout: 40 * 1000}, async function () {
  await clickCheckbox('ASV', '#module-settings-assistant-remove');
  await clickNext('#module-settings-assistant-remove');
});

async function finishOnceProcessCompleted(moduleSettingsDialogId='#module-settings-assistant-add') {

  var navLinks = await getNavLinks(moduleSettingsDialogId);
  var finishButton = navLinks[2];
  var finishButtonLi = await finishButton.$('..');

  await spectronHelper.getWebClient().waitUntil(async () => {
    var finishbuttonLiClass = await finishButtonLi.getAttribute('class');
    return finishbuttonLiClass != 'disabled';
  }, { timeout: 120000 });

  await finishButton.click();
}

When('the installation is completed', {timeout: 100 * 1000}, async function () {
  await finishOnceProcessCompleted();
  await nsiHelper.backupSwordDir();
});

When('the removal is completed', {timeout: 5 * 1000}, async function () {
  await finishOnceProcessCompleted('#module-settings-assistant-remove');
});

Then('the ASV is available as a local module', async function () {
  var asvModule = await nsiHelper.getLocalModule('ASV');
  assert(asvModule != null, "Got null when checking for the ASV module!");
});

Then('the ASV is no longer available as a local module', async function () {
  var asvModule = await nsiHelper.getLocalModule('ASV');
  assert(asvModule == null, "ASV should no longer be available, but it is!");
});

Then('the ASV is selected as the current translation', async function () {
  var asvModule = await nsiHelper.getLocalModule('ASV');

  var verseListTabs = await spectronHelper.getWebClient().$('#verse-list-tabs-1');
  var bibleSelectBlock = await verseListTabs.$('.bible-select-block');
  var selectMenuStatus = await bibleSelectBlock.$('.ui-selectmenu-status');
  var selectMenuStatusText = await selectMenuStatus.getText();

  await selectMenuStatusText.should.equal(asvModule.description);
});

Then('the relevant buttons in the menu are enabled', async function() {
  var verseListTabs = await spectronHelper.getWebClient().$('#verse-list-tabs-1');
  var bookSelectButton = await verseListTabs.$('.book-select-button');
  var moduleSearchButton = await verseListTabs.$('.module-search-button');
  var appInfoButton = await verseListTabs.$('.app-info-button');
  await uiHelper.buttonIsEnabled(bookSelectButton);
  await uiHelper.buttonIsEnabled(moduleSearchButton);
  await uiHelper.buttonIsEnabled(appInfoButton);
});
