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
const Fuse = require('fuse.js');

const ICON_SEARCH = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!-- Font Awesome Free 5.15.3 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"/></svg>
`;

// animation inspired by https://codepen.io/takaneichinose/pen/ErGwPZ?editors=0100
const template = html`
<style>
#search-box {
  margin: auto 0 auto auto;
  display: inline-block;
  position: relative;
  border-radius: 2.5em;
  height: 2.5em;
  background: var(--widget-bg-color, white);
  z-index: 1;
}
#search-box__input {
  font-size: 1em;
  color: var(--text-color, currentColor);
  /* width: 2.5em; */
  height: 2.5em;
  padding: 0.25em 1.2em;
  border: solid 1px var(--text-color, currentColor);
  background: #0000;
  z-index: 1;
  box-sizing: border-box;
  /* border-radius: 2em; */
  /* transition: width 800ms cubic-bezier(0.68, -0.55, 0.27, 1.55), border-radius 800ms ease-in; */
  -webkit-appearance: none;
  /* cursor: pointer; */
  width: 15em;
  padding-right: 2.25em;
  padding-left: 0.75em;
  border-radius: 5px;
  cursor: text;
}
#search-box__input::-webkit-search-decoration {
	-webkit-appearance: none;
}
#search-box__input:focus {
  outline: none;          
}
/* #search-box__input:focus,
#search-box__input:not(:placeholder-shown) {
  width: 15em;
  padding-right: 2.25em;
  padding-left: 0.75em;
  border-radius: 5px;
  cursor: text;
} */

#search-box__button {
  font-size: 0.6em;
  background-color: transparent;
  width: 2em;
  height: 2em;
  border: 0;
  padding: 0;
  outline: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  bottom: calc(50% - 1em);
  right: 1em;
  z-index: -1;
}
#search-box__button svg {
  width: 100%;
  fill: var(--text-color, currentColor);
}
</style>
<form id="search-box">
  <input id="search-box__input" type="search" placeholder=" ">
  <button id="search-box__button" type="reset">${ICON_SEARCH}</button>
</form>
`;

/**
 * @module FuzzySearch
 * component displays search input field; when initialized with data by init method 
 * it will trigger custom 'searchResultsReady' event with "fuzzy" (approximate) search results.
 * Component internally uses fuse.js (https://fusejs.io) and 
 * shape of results returned in 'searchResultsReady' event.detail.results reflects 
 * results returned by fuse.js (https://fusejs.io/examples.html)
 * 
 * <fuzzy-search></fuzzy-search> will generate only search input field. Providing data to search in and getting results of 
 * the search should be done with 'init' method and handling of 'searchResultsReady' event respectively
 * 
 * @example
 * <fuzzy-search max-result="10" distance="30"></fuzzy-search>
 * 
 * @prop {number} [minLength=2] min-length attribute is limiting minimal length of the input value to perform a search
 * @prop {number} [maxResult=100] max-result attribute is limiting the amount of result items returned
 * @prop {number} [searchDelay=200] search-delay attribute is number of ms between triggering search with 'input' event of the input field
 * @prop {number} [threshold=0.6] threshold param for the search (https://fusejs.io/api/options.html#threshold)
 * @prop {number} [distance=20] distance param for the search (https://fusejs.io/api/options.html#distance)
 * @category Component
 */
class FuzzySearch extends HTMLElement {

  constructor() {
    super();

    /**@type {Fuse} */
    this._fuse = null;
    this._searchTimeout = undefined;

    this.minLength = 2;
    this.maxResult = 100;
    this.searchDelay = 200;
    this.threshold = 0.6;
    this.distance = 20;

    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.shadowRoot.querySelector('#search-box__input').addEventListener('input', (e) => this._handleInput(e));
  }

  async connectedCallback() {
    if (this.hasAttribute('min-length')) {
      this.minLength = parseInt(this.getAttribute('min-length'));
    }
    if (this.hasAttribute('max-result')) {
      this.maxResult = parseInt(this.getAttribute('max-result'));
    }
    if (this.hasAttribute('search-delay')) {
      this.searchDelay = parseInt(this.getAttribute('search-delay'));
    }
    if (this.hasAttribute('threshold')) {
      this.threshold = parseInt(this.getAttribute('threshold'));
    }
    if (this.hasAttribute('distance')) {
      this.distance = parseInt(this.getAttribute('distance'));
    }
  }

  /**
   * Initializes search with data
   * @param {Array} dataArr array of strings or objects with string values to make search in (https://fusejs.io/examples.html#search-string-array)
   * @param {Array} keys list of keys that will be searched. That supports nested paths and weighted search (https://fusejs.io/api/options.html#keys) 
   */
  init(dataArr, keys=[]) {
    this._fuse = new Fuse(dataArr, { includeScore: true,  threshold: this.threshold, distance: this.distance, minMatchCharLength: 2, keys });
  }

  _handleInput(event) {
    clearTimeout(this._searchTimeout);

    if (!this._fuse) {
      return;
    }

    const value = event.target.value.trim();
    this._searchTimeout = setTimeout(() => {
      const searchResults = value.length < this.minLength ? [] : this._fuse.search(value, {limit: this.maxResult});

      this.dispatchEvent(new CustomEvent("searchResultsReady", {
        bubbles: true,
        detail: { 
          results: searchResults,
        }
      }));
    }, this.searchDelay);
  }
}

customElements.define('fuzzy-search', FuzzySearch);
module.exports = FuzzySearch;