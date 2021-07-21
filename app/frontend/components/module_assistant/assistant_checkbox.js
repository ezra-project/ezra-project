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

const ICONS = {
  star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!-- Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"/></svg>`,
  lock: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!-- Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"/></svg>',
};

const template = html`
<style>
  #label-wrapper {
    position: relative;
    display: flex;
    padding-inline-start: 1.75em;
  }
  #label {
    cursor: pointer;
    text-indent: -1.75em;
    line-height: 1.2em;
  }
  #label.disabled {
    color: gray;
  }
  #label-icon {
    position: absolute;
    left: 0.8em;
    top: 0.15em;
    height: 0.8em;
    width: 0.8em;
    fill: var(--accent-color, currentColor);
  }
  #count {
    opacity: 0.8;
  }
  #description {
    font-size: 0.8em;
    opacity: 0.8;
    margin-bottom: -0.5em;
    margin-inline-start: 2.2em;
    line-height: 1em;
  }
</style>
 
<div id="label-wrapper">
  <label id="label">  
    <input type="checkbox" id="checkbox">
    <span id="label-icon"></span>
    <slot>No text provided</slot>
    <span id="count"></span>
  </label>
</div>
<div id="description"></div>
`;

class AssistantCheckbox extends HTMLElement {
  static get observedAttributes() {
    return ['count', 'checked'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this._checked = false;
    this._disabled = false;
    this.code = "";
  }
  
  connectedCallback() {  
    this.shadowRoot.querySelector('#checkbox').addEventListener('change', () => this.handleCheckboxChecked());
    this.code = this.getAttribute('code');

    if (this.hasAttribute('description')) {
      this.shadowRoot.querySelector('#description').textContent = this.getAttribute('description');
    }
    
    this._disabled = this.hasAttribute('disabled');
    if (this._disabled) {
      this.shadowRoot.querySelector('#checkbox').setAttribute('disabled', '');
      this.shadowRoot.querySelector('label').classList.add('disabled');
    }

    if (this.hasAttribute('icon')) {
      this.shadowRoot.querySelector('#label-icon').innerHTML = ICONS[this.getAttribute('icon')];
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name.startsWith('co') && newValue) { // count
      this.updateCount(name, newValue);
    } else if (name.startsWith('ch')) { // checked
      this.handleCheckedAttr(oldValue, newValue);
    }
  }

  set count(n) {
    if (n) {
      this.setAttribute('count', n);
    } else {
      this.removeAttribute('count');
    }
  }

  set checked(isChecked) {
    if (isChecked) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }
  }

  handleCheckedAttr(oldValue, newValue) {
    this._checked = newValue !== null;
    this.shadowRoot.querySelector('#checkbox').checked = this._checked;
  }

  handleCheckboxChecked() {
    if (this._disabled) {
      return;
    }

    this._checked = this.shadowRoot.querySelector('#checkbox').checked;
    if (this._checked) {
      this.setAttribute('checked', '');
    } else {
      this.removeAttribute('checked');
    }

    this.dispatchEvent(new CustomEvent("itemChanged", {
      bubbles: true,
      detail: { 
        code: this.code,
        checked: this._checked
      }
    }));  
  }

  updateCount(elementId, value) {
    const element = this.shadowRoot.querySelector(`#${elementId}`);
    if (value) {
      element.textContent = ` (${value})`;
      element.animate({opacity: [0, 0.8]}, 300);
    } else {
      element.textContent = '';
    }
  }

}

customElements.define('assistant-checkbox', AssistantCheckbox);
module.exports = AssistantCheckbox;