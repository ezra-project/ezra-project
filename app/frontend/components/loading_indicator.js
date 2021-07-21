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

const { html } = require('../helpers/ezra_helper.js');

//FIXME: move styles from css/loader.css
const template = html`
<style>
</style>
 
<div class="loader" style="position: relative; float: right; display: block;">
  <div class="bounce1"></div>
  <div class="bounce2"></div>
  <div class="bounce3"></div>
</div>
`;

class LoadingIndicator extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = template.innerHTML;
  }

  show() {
    this.style.display = 'block';
  }

  hide() {
    this.style.display = 'none';
  }
}

customElements.define('loading-indicator', LoadingIndicator);
module.exports = LoadingIndicator;