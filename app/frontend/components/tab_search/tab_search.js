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

const VerseSearch = require('./verse_search.js');
const { waitUntilIdle } = require('../../helpers/ezra_helper.js');

/**
 * The TabSearch component implements the in-tab search functionality which is enabled with CTRL + f / CMD + f.
 * 
 * @category Component
 */
class TabSearch {
  constructor() {
  }

  init(parentTab,
       searchForm,
       searchInput,
       searchOccurancesElement,
       prevButton,
       nextButton,
       caseSensitiveCheckbox,
       searchTypeSelect,
       onSearchResultsAvailable,
       onSearchReset) {

    this.parentTab = parentTab;
    this.searchForm = parentTab.find(searchForm);
    this.inputField = parentTab.find(searchInput);
    this.searchOccurancesElement = parentTab.find(searchOccurancesElement);
    this.prevButton = parentTab.find(prevButton);
    this.nextButton = parentTab.find(nextButton);
    this.caseSensitiveCheckbox = parentTab.find(caseSensitiveCheckbox);
    this.searchTypeSelect = parentTab.find(searchTypeSelect);
    this.currentOccuranceIndex = 0;
    this.currentOccurancesCount = 0;
    this.allOccurances = [];
    this.previousOccuranceElement = null;
    this.currentOccuranceElement = null;
    this.onSearchResultsAvailable = onSearchResultsAvailable;
    this.onSearchReset = onSearchReset;
    this.lastSearchString = null;
    this.mouseTrapEvent = false;
    this.shiftKeyPressed = false;
    this.searchTimeoutMs = 400;
    if (platformHelper.isCordova()) {
      this.searchTimeoutMs = 800;
    }

    this.verseSearch = new VerseSearch();

    this.initInputField();
    this.initSearchOptionControls();
    this.initNavigationButtons();

    var currentVerseList = parentTab.find('.verse-list');
    this.setVerseList(currentVerseList);
  }

  initInputField() {
    this.inputField.bind('keydown', (e) => {
      if (e.key == 'Shift') {
        this.shiftKeyPressed = true;
        return;
      }
    });

    this.inputField.bind('keyup', (e) => {
      if (e.key == 'Shift') {
        this.shiftKeyPressed = false;
        return;
      }

      if (e.key == 'Escape') {
        this.resetSearch();
        return;
      }

      if (e.key == 'Enter') {
        if (this.mouseTrapEvent) { // We also catch keypresses with Mousetrap (globally, see AppController.initGlobalShortCuts)
                                   // To ensure that we do not process the key press twice we return immediately if we know
                                   // that a mouse trap event was fired previously.
          this.mouseTrapEvent = false;
          return;
        }

        this.jumpToNextOccurance(!this.shiftKeyPressed);
        return;
      }

      this.triggerDelayedSearch();
    });
  }

  blurInputField() {
    this.inputField.blur();
  }

  initSearchOptionControls() {
    this.caseSensitiveCheckbox.bind('change', () => {
      this.lastSearchString = null;
      this.triggerDelayedSearch();
    });

    this.searchTypeSelect.bind('change', () => {
      this.lastSearchString = null;
      this.triggerDelayedSearch();
    });
  }

  initNavigationButtons() {
    this.prevButton.bind('click', () => {
      this.jumpToNextOccurance(false);
    });

    this.nextButton.bind('click', () => {
      this.jumpToNextOccurance();
    });
  }

  show() {
    var verseListFrame = app_controller.getCurrentVerseListFrame();
    verseListFrame.addClass('tab-search-active');
    this.searchForm.css('display', 'flex');
    uiHelper.resizeVerseList();
  }

  hide() {
    var verseListFrame = app_controller.getCurrentVerseListFrame();
    verseListFrame.removeClass('tab-search-active');
    this.searchForm.hide();
    uiHelper.resizeVerseList();
  }

  focus() {
    this.inputField.focus();
  }

  setVerseList(verseList) {
    this.verseList = verseList;
  }

  getSearchType() {
    var selectedValue = this.searchTypeSelect[0].options[this.searchTypeSelect[0].selectedIndex].value;
    return selectedValue;
  }

  isCaseSensitive() {
    return this.caseSensitiveCheckbox.prop("checked");
  }

  triggerDelayedSearch() {
    clearTimeout(this.searchTimeout);

    var searchString = this.inputField.val();
    if (searchString.length < 3) {
      this.resetOccurances();
      return;
    }

    if (searchString == this.lastSearchString) {
      return;
    }

    this.searchTimeout = setTimeout(async () => {
      app_controller.verse_selection.clear_verse_selection(false);
      this.onSearchReset();
      this.lastSearchString = searchString;

      await this.doSearch(searchString);

      // This is necessary, beause the search "rewrites" the verse content and events
      // get lost by doing that, so we have to re-bind the xref events.
      app_controller.bindXrefEvents();

      if (!platformHelper.isCordova()) {
        this.focus();
      }
    }, this.searchTimeoutMs);
  }

  resetOccurances() {
    if (this.currentOccurancesCount > 0) {
      this.removeAllHighlighting();
    }
    
    this.allOccurances = [];
    this.currentOccurancesCount = 0;
    this.updateOccurancesLabel();
    this.onSearchReset();
  }

  resetSearch() {
    this.resetOccurances();

    if (!app_controller.optionsMenu._tabSearchOption.isChecked) {
      this.hide();
    }

    this.inputField[0].value = '';
    this.lastSearchString = null;
    this.mouseTrapEvent = false;
    this.shiftKeyPressed = false;
  }

  async jumpToNextOccurance(forward=true) {
    if (this.currentOccurancesCount == 0) {
      return;
    }

    this.previousOccuranceElement = this.allOccurances[this.currentOccuranceIndex];

    var increment = 1;
    if (!forward) {
      increment = -1;
    }

    var inBounds = false;
    if (forward && (this.currentOccuranceIndex < (this.allOccurances.length - 1))) {
      inBounds = true;
    }

    if (!forward && (this.currentOccuranceIndex > 0)) {
      inBounds = true;
    }

    if (inBounds) {
      this.currentOccuranceIndex += increment;
    } else {
      if (forward) { // jump to the beginning when going forward at the end
        this.currentOccuranceIndex = 0;
      } else { // jump to the end when going backwards in the beginning
        this.currentOccuranceIndex = this.allOccurances.length - 1;
      }
    }

    this.jumpToCurrentOccurance();
    await this.highlightCurrentOccurance();

    if (!platformHelper.isCordova()) {
      this.focus();
    }

    await waitUntilIdle();
  }

  jumpToCurrentOccurance() {
    // Jump to occurance in window
    this.currentOccuranceElement = this.allOccurances[this.currentOccuranceIndex];
    var currentOccuranceVerseBox = this.currentOccuranceElement.closest('.verse-box');
    var currentOccuranceAnchor = '#' + currentOccuranceVerseBox.querySelector('a').getAttribute('name');
    window.location = currentOccuranceAnchor;
  }

  async highlightCurrentOccurance() {
    // Remove previous element's highlighting
    if (this.previousOccuranceElement != null) {
      this.previousOccuranceElement.classList.remove('current-hl');
      let closestVerseBox = this.previousOccuranceElement.closest('.verse-box')
      if (closestVerseBox != null) closestVerseBox.querySelector('.verse-text').classList.remove('ui-selected');
      app_controller.verse_selection.clear_verse_selection(false);
    }

    // Highlight current element
    if (this.currentOccuranceElement != null) {
      this.currentOccuranceElement.classList.add('current-hl');
      let verseBox = this.currentOccuranceElement.closest('.verse-box');

      if (verseBox != null) {
        verseBox.querySelector('.verse-text').classList.add('ui-selected');
        app_controller.verse_selection.updateSelected();
        app_controller.verse_selection.updateViewsAfterVerseSelection();
        await app_controller.navigation_pane.updateNavigationFromVerseBox(this.currentOccuranceElement, verseBox);
      }
    }

    this.updateOccurancesLabel();
  }

  updateOccurancesLabel() {
    var occurancesString = "";

    if (this.currentOccurancesCount > 0) {
      let currentOccuranceNumber = this.currentOccuranceIndex + 1;
      occurancesString = currentOccuranceNumber + '/' + this.currentOccurancesCount;
    }

    this.searchOccurancesElement[0].innerHTML = occurancesString;
  }

  async doSearch(searchString) {
    if (this.verseList == null) {
      return;
    }

    var searchType = this.getSearchType();
    var caseSensitive = this.isCaseSensitive();

    var allVerses = this.verseList[0].querySelectorAll('.verse-text');

    this.currentOccuranceIndex = 0;
    this.currentOccurancesCount = 0;
    this.allOccurances = [];

    //console.log("Found " + allVerses.length + " verses to search in.");

    this.removeHighlightingFromVerses(allVerses);

    allVerses.forEach((currentVerse) => {
      this.currentOccurancesCount += this.verseSearch.doVerseSearch(currentVerse, searchString, searchType, caseSensitive);
    });

    this.allOccurances = this.verseList[0].querySelectorAll('.search-hl.first');
    this.currentOccuranceElement = this.allOccurances[this.currentOccuranceIndex];

    if (this.allOccurances.length > 0) {
      this.jumpToCurrentOccurance();
      this.highlightCurrentOccurance();
    } else {
      this.resetOccurances();
    }

    await this.onSearchResultsAvailable(this.allOccurances);
  }

  removeAllHighlighting() {
    if (this.verseList != null) {
      for (let i = 0; i < this.allOccurances.length; i++) {
        let currentOccuranceVerseBox = this.allOccurances[i].closest('.verse-text');
        this.removeHighlightingFromVerses([currentOccuranceVerseBox]);
      }
    }
  }

  removeHighlightingFromVerses(verseElements) {
    if (verseElements == null) {
      return;
    }
    
    var searchHl = $(verseElements).find('.search-hl, .current-hl');

    for (let i = 0; i < searchHl.length; i++) {
      let highlightedText = $(searchHl[i])[0];
      let text = document.createTextNode(highlightedText.innerText);

      if (highlightedText.parentNode.nodeName == 'SPAN') {
        highlightedText.parentNode.replaceWith(highlightedText.parentNode.innerText);
      } else {
        highlightedText.replaceWith(text);
      }
    }

    verseElements.forEach((element) => {
      if (element != null) {
        let verseElementHtml = element.innerHTML;

        /* Remove line breaks between strings, that resulted from inserting the 
          search-hl / current-hl elements before. If these linebreaks are not removed
          the search function would afterwards not work anymore.
    
        State with highlighting:
        <span class="search-hl">Christ</span>us
    
        State after highlighting element was removed (see code above)
        "Christ"
        "us"
    
        State after line break was removed: (intention of code below)
        "Christus"
    
        */
        verseElementHtml = verseElementHtml.replace("\"\n\"", "");
        element.innerHTML = verseElementHtml;
      }
    });
  }
}

module.exports = TabSearch;