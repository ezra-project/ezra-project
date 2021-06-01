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

class ModuleAssistantHelper {
  constructor() {
  }

  getSelectedSettingsAssistantElements(wizardPage) {
    var selectedElements = [];

    var allElements = $(wizardPage).find('p');
    for (var i = 0; i < allElements.length; i++) {
      var currentElement = $(allElements[i]);
      var currentCheckbox = currentElement.find('input');
      var isChecked = currentCheckbox.prop('checked');
      var isDisabled = currentCheckbox.prop('disabled');

      if (isChecked && !isDisabled) {
        var currentId = currentElement.find('span').attr('id');

        if (currentId != undefined) {
          selectedElements.push(currentId);
        }
      }
    }

    return selectedElements;
  }

  bindLabelEvents(wizardPage) {
    wizardPage.find('.label').bind('click', function() {
      var checkbox = $(this).prev();
      checkbox.click();
    });
  }

  lockDialogForAction(wizardId) {
    wizardId = '#' + wizardId;

    // Disable close button of dialog, at this point we don't allow the user to close the dialog any longer
    $('.module-assistant-dialog').find('.ui-dialog-titlebar-close').hide();

    // Disable the back button, there is no way back from here
    $($(wizardId).find('.actions').find('li')[0]).addClass('disabled');

    // Disable the finish button as long as we haven't finished
    $($(wizardId).find('.actions').find('li')[2]).addClass('disabled');
  }

  unlockDialog(wizardId) {
    wizardId = '#' + wizardId;
    
    // Enable the finish button
    $($(wizardId).find('.actions').find('li')[2]).removeClass('disabled');

    // Enable close button of dialog
    $('.module-assistant-dialog').find('.ui-dialog-titlebar-close').show();
  }

  sortBy(field) {
    return function(a, b) {
      if (a[field] < b[field]) {
        return -1;
      } else if (a[field] > b[field]) {
        return 1;
      }
      return 0;
    };
  }
}

module.exports = ModuleAssistantHelper;