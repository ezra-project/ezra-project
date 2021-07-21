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

module.exports.lockDialogForAction = function (elementId) {
  elementId = '#' + elementId;

  // Disable close button of dialog, at this point we don't allow the user to close the dialog any longer
  $('.module-assistant-dialog').find('.ui-dialog-titlebar-close').hide();

  // Disable the back button, there is no way back from here
  $($(elementId).find('.actions').find('li')[0]).addClass('disabled');

  // Disable the finish button as long as we haven't finished
  $($(elementId).find('.actions').find('li')[2]).addClass('disabled');
};

module.exports.unlockDialog = function (elementId) {
  elementId = '#' + elementId;

  // Enable the finish button
  $($(elementId).find('.actions').find('li')[2]).removeClass('disabled');

  // Enable close button of dialog
  $('.module-assistant-dialog').find('.ui-dialog-titlebar-close').show();
};

module.exports.sortByText = function(strA, strB) {
  return strA.localeCompare(strB);
};

/**
 * Generates an HTML fragment with title and checkboxes from array of items
 * @param {[]} arr array of items
 * @param {Set<string>} selected array of values that will be shown as checked
 * @param {string=} sectionTitle Section title
 * @param {object} options additional options for the layout
 * @param {number} [options.columns='auto-fill'] number of columns
 * @param {boolean} [options.info=false] display info icon and generate event on click
 * @param {boolean} [options.extraIndent=false] add extra indent to make sure that all item icons will be visible
 * @param {string} [options.rowGap="0.5em"] CSS size for the gap between the rows
 * @param {boolean} [options.limitRows=false] Explicity set grid rows height (for performance)
 * @returns {DocumentFragment} HTML fragment with appropriate <assistant-checkbox> elements for each item
 */
module.exports.listCheckboxSection = function (arr, selected, sectionTitle="", options={}) {
  if (arr.length === 0) {
    return '';
  }

  options = {
    columns: 'auto-fill',
    info: false,
    extraIndent: false,
    rowGap: '0.5em',
    ...options
  };

  var checkboxes = [];
  if (arr instanceof Map) {
    const sortedKeys = [...arr.keys()].sort(this.sortByText);
    for(const key of sortedKeys) {
      const item = arr.get(key);
      if (item.count === undefined || item.count && item.count !== 0) {
        if (options.info) {
          checkboxes.push('<div style="display: flex; align-items: center">');
        }
        checkboxes.push(generateCheckbox(item, selected.has(typeof item === 'string' ? item : item.code), options));
        if (options.info) {
          checkboxes.push(generateInfoButton());
          checkboxes.push('</div>');
        }
      }
    }
  } else {
    for (const item of arr) {
      if (item.count === undefined || item.count && item.count !== 0) {
        checkboxes.push(generateCheckbox(item, selected.has(typeof item === 'string' ? item : item.code), options));
      }
    }
  }

  const paddingLeft = options.extraIndent ? '1em' : '0';
  const rowHight = options.limitRows ? '1.8em' : 'auto';

  const template = html`
    <h3 style="margin: 1em 0 0;">${sectionTitle}</h3>
    <div style="display: grid; grid-template-columns: repeat(${options.columns}, minmax(15em, 1fr)); grid-row-gap: ${options.rowGap}; grid-column-gap: 1em; grid-auto-flow: dense; padding: 0.5em 0 0.5em ${paddingLeft}; grid-auto-rows:${rowHight};">
      ${checkboxes}
    </div>`;
  return template.content;
};

function generateCheckbox(item, checked, options) {
  if (typeof item === 'string') {
    return `<assistant-checkbox code="${item}" ${checked ? 'checked' : ''}>${item}</assistant-checkbox>`;
  } else {
    const {code, text, description, count, disabled, ...rest} = item;

    const style = text && text.length > 22 && (options.columns === 'auto-fill' || options.columns > 1) ? 'style="grid-column-end: span 2"' : '';

    const extraAttr = Object.entries(rest).map(([attr, val]) => `${attr}="${val}"`);

    /**@type {import('./assistant_checkbox')} */
    const checkbox = `
      <assistant-checkbox 
        ${style}
        code="${code}" 
        ${checked ? 'checked' : ''}
        ${disabled ? 'disabled' : ''}
        ${count ? `count="${count}"` : ''}
        ${description ? `description="${description}"` : ''}
        ${extraAttr.join(' ')}>
        ${text ? text : code}
      </assistant-checkbox>`;

    return checkbox;
  }

}

function generateInfoButton() {
  return `<a href="#" class="module-info-button" title="${i18n.t("module-assistant.step-modules.show-module-info")}" style="margin-inline-start: 0.7em;margin-top: 0.5em;"><svg style="height: 1.2em; fill: var(--accent-color, gray);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!-- Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z"/></svg></a>`;
}

module.exports.localizeContainer = function(container, module_type) {
  container.querySelectorAll('[i18n]').forEach(element => {
    element.innerHTML = i18n.t(element.getAttribute('i18n'), {module_type,
                                                              interpolation: {
                                                                alwaysFormat: true,
                                                              }});
  });
};

module.exports.localizeText = function(key, data) {
  data = typeof data === 'string' ? {module_type: data} : data;
  return i18n.t(key, {...data,
                      interpolation: {
                        alwaysFormat: true,
                      }});
};