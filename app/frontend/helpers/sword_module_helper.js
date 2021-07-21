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

/**
 * This module offers sword module related functionality
 * @module sword_module_helper
 * @category Helper
 */

const i18nHelper = require('./i18n_helper.js');

var _moduleVersificationCache = {};

module.exports.getModuleDescription = async function(moduleId, isRemote=false) {
  var moduleInfo = "No info available!";

  try {
    var swordModule = null;

    if (isRemote) {
      swordModule = await ipcNsi.getRepoModule(moduleId);
    } else {
      swordModule = await ipcNsi.getLocalModule(moduleId);
    }
    
    var moduleInfo = "";
    
    if (isRemote) {
      moduleInfo += "<b>" + swordModule.description + "</b><br><br>";
    }

    moduleInfo += "<p class='external'>";
    var about = swordModule.about.replace(/\\pard/g, "").replace(/\\par/g, "<br>");
    moduleInfo += about;
    moduleInfo += "</p>";

  } catch (ex) {
    console.error("Got exception while trying to get module description: " + ex);
  }

  return moduleInfo;
}

module.exports.getModuleInfo = async function(moduleId, isRemote=false, includeModuleDescription=true) {
  var moduleInfo = "No info available!";

  try {
    var swordModule = null;

    if (isRemote) {
      swordModule = await ipcNsi.getRepoModule(moduleId);
    } else {
      swordModule = await ipcNsi.getLocalModule(moduleId);
    }
    
    var moduleInfo = "";

    if (includeModuleDescription) {
      if (isRemote) {
        moduleInfo += "<b>" + swordModule.description + "</b><br><br>";
      }

      moduleInfo += "<p class='external'>";
      var about = swordModule.about.replace(/\\pard/g, "").replace(/\\par/g, "<br>");
      moduleInfo += about;
      moduleInfo += "</p>";
    }
    
    var moduleSize = Math.round(swordModule.size / 1024) + " KB";

    var yes = i18n.t("general.yes");
    var no = i18n.t("general.no");

    if (includeModuleDescription) {
      moduleInfo += `<p style='margin-top: 1em; padding-top: 1em; border-top: 1px solid grey; font-weight: bold'>${i18n.t("general.sword-module-info")}</p>`;
    }

    moduleInfo += "<table>";
    moduleInfo += "<tr><td style='width: 11em;'>" + i18n.t("general.module-name") + ":</td><td>" + swordModule.name + "</td></tr>";
    moduleInfo += "<tr><td>" + i18n.t("general.module-version") + ":</td><td>" + swordModule.version + "</td></tr>";
    moduleInfo += "<tr><td>" + i18n.t("general.module-language") + ":</td><td>" + i18nHelper.getLanguageName(swordModule.language) + "</td></tr>";
    moduleInfo += "<tr><td>" + i18n.t("general.module-license") + ":</td><td>" + swordModule.distributionLicense + "</td></tr>";

    if (swordModule.type == 'Biblical Texts') {
      moduleInfo += "<tr><td>" + i18n.t("general.module-strongs") + ":</td><td>" + (swordModule.hasStrongs ? yes : no) + "</td></tr>";
      moduleInfo += "<tr><td>" + i18n.t("general.module-headings") + ":</td><td>" + (swordModule.hasHeadings ? yes : no) + "</td></tr>";
      moduleInfo += "<tr><td>" + i18n.t("general.module-footnotes") + ":</td><td>" + (swordModule.hasFootnotes ? yes : no) + "</td></tr>";
      moduleInfo += "<tr><td>" + i18n.t("general.module-xrefs") + ":</td><td>" + (swordModule.hasCrossReferences ? yes : no) + "</td></tr>";
      moduleInfo += "<tr><td>" + i18n.t("general.module-redletter") + ":</td><td>" + (swordModule.hasRedLetterWords ? yes : no) + "</td></tr>";
    }

    moduleInfo += "<tr><td>" + i18n.t("general.module-size") + ":</td><td>" + moduleSize + "</td></tr>";
    if (!isRemote) {
      moduleInfo += "<tr><td>" + i18n.t("general.module-location") + ":</td><td>" + swordModule.location + "</td></tr>";
    }

    moduleInfo += "</table>";

    if (isRemote && swordModule.locked && swordModule.unlockInfo != "") {
      moduleInfo += "<p style='margin-top: 1em; padding-top: 1em; border-top: 1px solid grey; font-weight: bold'>" + i18n.t("general.sword-unlock-info") + "</p>";
      moduleInfo += "<p class='external'>" + swordModule.unlockInfo + "</p>";
    }
  } catch (ex) {
    console.error("Got exception while trying to get module info: " + ex);
  }

  return moduleInfo;
}

module.exports.getSwordModule = async function(moduleId) {
  if (moduleId == null) {
    return null;
  }

  var swordModule = null;

  try {
    swordModule = await ipcNsi.getLocalModule(moduleId);
  } catch (e) {
    console.log("Could not get local sword module for " + moduleId);
  }

  return swordModule;
}

module.exports.moduleHasStrongs = async function(moduleId) {
  var swordModule = await this.getSwordModule(moduleId);

  if (swordModule != null) {
    return swordModule.hasStrongs;
  } else {
    return false;
  }
}

module.exports.moduleHasHeaders = async function(moduleId) {
  var swordModule = await this.getSwordModule(moduleId);

  if (swordModule != null) {
    return swordModule.hasHeadings;
  } else {
    return false;
  }
}

module.exports.getVersification = async function(moduleId) {
  if (moduleId == null) {
    return null;
  }

  if (moduleId in _moduleVersificationCache) {
    return _moduleVersificationCache[moduleId];
  }

  var versification = null;
  var psalm3Verses = [];
  var revelation12Verses = [];

  try {
    psalm3Verses = await ipcNsi.getChapterText(moduleId, 'Psa', 3);
  } catch (e) {
    console.log("TranslationController.getVersification: Could not retrieve chapter text for Psalm 3 of " + moduleId);
  }

  try {
    revelation12Verses = await ipcNsi.getChapterText(moduleId, 'Rev', 12);
  } catch (e) {
    console.log("TranslationController.getVersification: Could not retrieve chapter text for Revelation 12 of " + moduleId);
  }

  if (psalm3Verses.length == 8 || revelation12Verses.length == 17) { // ENGLISH versification
    versification = "ENGLISH";

  } else if (psalm3Verses.length == 9 || revelation12Verses.length == 18) { // HEBREW versification
    versification = "HEBREW";

  } else { // Unknown versification

    versification = "UNKNOWN"

    /*console.log("Unknown versification!");
    console.log("Psalm 3 has " + psalm3Verses.length + " verses.");
    console.log("Revelation 12 has " + revelation12Verses.length + " verses.");*/
  }

  _moduleVersificationCache[moduleId] = versification;
  return versification;
}

module.exports.getThreeLetterVersification = async function(moduleId) {
  var versification = (await this.getVersification(moduleId) == 'ENGLISH' ? 'eng' : 'heb');
  return versification;
}

module.exports.getModuleLanguage = async function(moduleId) {
  var swordModule = await this.getSwordModule(moduleId);

  if (swordModule != null) {
    return swordModule.language;
  } else {
    return false;
  }
}
