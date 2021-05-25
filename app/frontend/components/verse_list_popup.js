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

const VerseBoxHelper = require('../helpers/verse_box_helper.js');
const VerseBox = require('../ui_models/verse_box.js');
const verseListTitleHelper = require('../helpers/verse_list_title_helper.js');

/**
 * The VerseListPopup component implements a dialog that shows a tagged verse list or a list of cross references.
 * 
 * @category Component
 */
class VerseListPopup {
  constructor() {
    this.verseBoxHelper = new VerseBoxHelper();
    this.dialogInitDone = false;
  }

  initVerseListPopup() {
    $('#verse-list-popup').dialog({
      width: 700,
      position: [200,200],
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    });

    var currentBookFilter = "";
    currentBookFilter = "<input type='checkbox' id='only-currentbook-tagged-verses' style='margin-right: 0.3em;'></input>" + 
                        `<label id='only-currentbook-tagged-verses-label' for='only-currentbook-tagged-verses'>${i18n.t('tags.only-currentbook-tagged-verses')}</label>` +
                        "<span id='current-book-tagged-verses-count'></span>";
    
    $('#verse-list-popup').prev().append(currentBookFilter);                       

    this.getCurrentBookFilterCheckbox().bind('click', () => {
      this.handleCurrentBookFilterClick();
    });

    this.getNewTabButton().bind('mousedown', () => {
      this.handleNewTabButtonClick();
    });

    uiHelper.configureButtonStyles('#verse-list-popup');
  }

  getNewTabButton() {
    return $('#open-verselist-in-new-tab-button');
  }

  getCurrentBookFilterCheckbox() {
    return $('#only-currentbook-tagged-verses');
  }

  getCurrentBookFilterCheckboxLabel() {
    return $('#only-currentbook-tagged-verses-label');
  }

  getCurrentBookTaggedVersesCountLabel() {
    return $('#current-book-tagged-verses-count');
  }

  getCurrentTextType() {
    var currentTextType = app_controller.tab_controller.getTab().getTextType();
    return currentTextType;
  }

  getCurrentBook() {
    var currentBook = app_controller.tab_controller.getTab().getBook();
    return currentBook;
  }

  getNumberOfVersesForCurrentBook() {
    var currentBook = this.getCurrentBook();
    var allVerses = document.getElementById('verse-list-popup-verse-list').querySelectorAll('.verse-box');
    var currentBookVerseCount = 0;

    for (var i = 0;  i < allVerses.length; i++) {
      var currentVerseBox = allVerses[i];
      var currentVerseBoxBook = new VerseBox(currentVerseBox).getBibleBookShortTitle();

      if (currentVerseBoxBook == currentBook) {
        currentBookVerseCount++;
      }
    }

    return currentBookVerseCount;
  }

  handleCurrentBookFilterClick() {
    var currentBook = this.getCurrentBook();
    var isChecked = this.getCurrentBookFilterCheckbox().prop('checked');

    var tagReferenceBox = document.getElementById('verse-list-popup');
    var bookHeaders = tagReferenceBox.querySelectorAll('.tag-browser-verselist-book-header');
    var verseBoxes = tagReferenceBox.querySelectorAll('.verse-box');

    for (var i = 0; i < bookHeaders.length; i++) {
      var currentHeaderBookName = bookHeaders[i].getAttribute('bookname');

      if (!isChecked || isChecked && currentHeaderBookName == currentBook) {
        $(bookHeaders[i]).show();
      } else {
        $(bookHeaders[i]).hide();
      }
    }

    for (var i = 0; i < verseBoxes.length; i++) {
      var currentVerseBox = verseBoxes[i];
      var currentVerseBoxBook = new VerseBox(currentVerseBox).getBibleBookShortTitle();

      if (!isChecked || isChecked && currentVerseBoxBook == currentBook) {
        $(currentVerseBox).show();
      } else {
        $(currentVerseBox).hide();
      }
    }
  }

  async handleNewTabButtonClick() {
    // 1) Close the popup
    $('#verse-list-popup').dialog("close");

    // 2) Open verse list in new tab
    await this.openVerseListInNewTab();
  }

  async openVerseListInNewTab() {
    // 1) Open a new tab
    var currentTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    app_controller.tab_controller.addTab(undefined, false, currentTranslationId);

    // 2) Load the verse list in the new tab
    if (this.currentReferenceType == 'TAGGED_VERSES') {

      app_controller.openTaggedVerses(this.currentTagId, this.currentTagTitle, this.currentReferenceVerseBox);

    } else if (this.currentReferenceType == 'XREFS') {

      app_controller.openXrefVerses(this.currentReferenceVerseBox, this.currentPopupTitle, this.currentXrefs);
    }

    // 3) Run the onTabSelected actions at the end, because we added a tab
    var ui = { 'index' : app_controller.tab_controller.getSelectedTabIndex() };
    await app_controller.onTabSelected(undefined, ui);
  }

  getSelectedTagFromClickedElement(clickedElement) {
    var selected_tag = $(clickedElement).html().trim();
    selected_tag = selected_tag.replace(/&nbsp;/g, ' ');
    selected_tag = selected_tag.replace(/&amp;/g, '&');
    return selected_tag;
  }

  getTagIdFromVerseBox(verseBox, selectedTag) {
    var tag_id = null;

    var tag_info_list = verseBox.find('.tag-global');
    for (var i = 0; i < tag_info_list.length; i++) {
      var current_tag_info = $(tag_info_list[i]);
      var current_tag_title = current_tag_info.find('.tag-title').text();

      if (current_tag_title == selectedTag) {
        tag_id = current_tag_info.find('.tag-id').text();
        break;
      }
    }

    return tag_id;
  }

  initCurrentTag(clickedElement) {
    var selected_tag = this.getSelectedTagFromClickedElement(clickedElement);
    this.currentReferenceVerseBox = $(clickedElement).closest('.verse-box');
    this.currentTagId = this.getTagIdFromVerseBox(this.currentReferenceVerseBox, selected_tag);
    this.currentTagTitle = this.getSelectedTagFromClickedElement(clickedElement);
  }

  loadTaggedVerses(clickedElement, currentTabId, currentTabIndex) {
    this.initCurrentTag(clickedElement);

    if (this.getCurrentTextType() == 'book') {
      var bookTaggedVersesCountLabel = this.getCurrentBookTaggedVersesCountLabel();
      bookTaggedVersesCountLabel.empty();
    }

    setTimeout(() => {
      app_controller.text_controller.requestVersesForSelectedTags(
        currentTabIndex,
        currentTabId,
        this.currentTagId,
        (htmlVerses, verseCount) => { this.renderVerseListInPopup(htmlVerses, verseCount); },
        'html',
        false
      );
    }, 50);
  }

  async initCurrentXrefs(clickedElement) {
    this.currentPopupTitle = await this.getPopupTitle(clickedElement, "XREFS");
    var swordNote = $(clickedElement).closest('.sword-note');
    this.currentReferenceVerseBox = $(clickedElement).closest('.verse-box');
    this.currentXrefs = [];

    swordNote.find('reference').each(async (index, element) => {
      var osisRef = $(element).attr('osisref');

      if (osisRef.indexOf('-') != -1) {
        // We have gotten a range (like Gal.1.15-Gal.1.16)
        // We need to first turn into a list of individual references using node-sword-interface
        var referenceList = await ipcNsi.getReferencesFromReferenceRange(osisRef);

        referenceList.forEach((ref) => {
          this.currentXrefs.push(ref);
        });

      } else {
        // We have got one single verse reference
        this.currentXrefs.push(osisRef);
      }
    });
  }

  async loadXrefs(clickedElement, currentTabId, currentTabIndex) {
    await this.initCurrentXrefs(clickedElement);

    setTimeout(() => {
      app_controller.text_controller.requestVersesForXrefs(
        currentTabIndex,
        currentTabId,
        this.currentXrefs,
        (htmlVerses, verseCount) => { this.renderVerseListInPopup(htmlVerses, verseCount); },
        'html',
        false
      );
    }, 50);
  }

  toggleBookFilter(referenceType) {
    var currentTextType = this.getCurrentTextType();
    var bookFilterCheckbox = this.getCurrentBookFilterCheckbox();
    var bookFilterCheckboxLabel = this.getCurrentBookFilterCheckboxLabel();
    var bookTaggedVersesCount = this.getCurrentBookTaggedVersesCountLabel();

    if (currentTextType == 'book' && referenceType == 'TAGGED_VERSES') {
      bookFilterCheckbox.show();
      bookFilterCheckboxLabel.show();
      bookTaggedVersesCount.show();
    } else {
      bookFilterCheckbox.hide();
      bookFilterCheckboxLabel.hide();
      bookTaggedVersesCount.hide();
    }

    bookFilterCheckbox.prop('checked', false);
  }

  async getPopupTitle(clickedElement, referenceType) {
    var popupTitle = "";
    var verseBox = $(clickedElement).closest('.verse-box');
    var localizedReference = await this.verseBoxHelper.getLocalizedVerseReference(verseBox[0]);

    if (referenceType == "TAGGED_VERSES") {

      var selectedTag = this.getSelectedTagFromClickedElement(clickedElement);
      popupTitle = verseListTitleHelper.getTaggedVerseListTitle(localizedReference, selectedTag);

    } else if (referenceType == "XREFS") {

      popupTitle = verseListTitleHelper.getXrefsVerseListTitle(localizedReference);
    }

    return popupTitle;
  }

  /**
   * @param event The click event
   * @param referenceType The type of references (either "TAGGED_VERSES" or "XREFS")
   */
  async openVerseListPopup(event, referenceType) {
    if (!this.dialogInitDone) {
      this.dialogInitDone = true;

      this.initVerseListPopup();
    }

    this.currentReferenceType = referenceType;
    this.currentPopupTitle = await this.getPopupTitle(event.target, referenceType);

    var verse_box = $(event.target).closest('.verse-box');
    var currentTabId = app_controller.tab_controller.getSelectedTabId();
    var currentTabIndex = app_controller.tab_controller.getSelectedTabIndex();

    if (referenceType == "TAGGED_VERSES") {
      this.loadTaggedVerses(event.target, currentTabId, currentTabIndex);
    } else if (referenceType == "XREFS") {
      await this.loadXrefs(event.target, currentTabId, currentTabIndex);
    }

    var width = uiHelper.getMaxDialogWidth();
    var box_position = this.getOverlayVerseBoxPosition(verse_box);

    $('#verse-list-popup').dialog({
      width: width,
      position: [box_position.left, box_position.top],
      title: this.currentPopupTitle
    });

    this.toggleBookFilter(referenceType);

    this.getNewTabButton().removeClass('ui-state-active');
    this.getNewTabButton().hide();
    $('#verse-list-popup-verse-list').hide();
    $('#verse-list-popup-verse-list').empty();
    $('#verse-list-popup-loading-indicator').find('.loader').show();
    $('#verse-list-popup-loading-indicator').show();
    $('#verse-list-popup').dialog("open");
  }

  getOverlayVerseBoxPosition(verse_box) {
    var currentVerseListFrame = app_controller.getCurrentVerseListFrame();

    var verse_box_position = verse_box.offset();
    var verse_box_class = verse_box.attr('class');
    var verse_nr = parseInt(verse_box_class.match(/verse-nr-[0-9]*/)[0].split('-')[2]);
    var next_verse_nr = verse_nr + 1;

    var next_verse_box = currentVerseListFrame.find('.verse-nr-' + next_verse_nr);
    var next_verse_box_position = next_verse_box.offset();
    if (next_verse_box_position == undefined) {
      next_verse_box_position = verse_box.offset();
    }
    var verse_list_height = currentVerseListFrame.height();
    var verse_list_position = currentVerseListFrame.offset();
    var screen_bottom = verse_list_position.top + verse_list_height;
    var cross_reference_box_height = 240;
    var overlay_box_position = null;

    var appContainerWidth = $(window).width();
    var offsetLeft = appContainerWidth - 700;

    if ((next_verse_box_position.top + cross_reference_box_height) <
        screen_bottom) {
      // The box does fit in the screen space between the beginning
      // of the next verse box and the bottom of the screen
      overlay_box_position = {
        top: next_verse_box_position.top + 7,
        left: offsetLeft
      };
    } else {
      // The box does NOT fit in the screen space between the beginning
      // of the next verse box and the bottom of the screen
      overlay_box_position = {
        top: verse_box_position.top - cross_reference_box_height - 120,
        left: offsetLeft
      };
    }

    return overlay_box_position;
  }

  renderVerseListInPopup(htmlVerses, verseCount) {
    $('#verse-list-popup-loading-indicator').hide();
    this.getNewTabButton().show();
    var tagReferenceBoxTitle = $('#verse-list-popup').dialog('option', 'title');
    tagReferenceBoxTitle += ' (' + verseCount + ')';

    $('#verse-list-popup').dialog({ title: tagReferenceBoxTitle });

    if (!app_controller.optionsMenu._xrefsOption.isChecked) {
      $('#verse-list-popup-verse-list').addClass('verse-list-without-xrefs');
    }

    if (!app_controller.optionsMenu._footnotesOption.isChecked) {
      $('#verse-list-popup-verse-list').addClass('verse-list-without-footnotes');
    }

    $('#verse-list-popup-verse-list').html(htmlVerses);

    if (this.getCurrentTextType() == 'book') {
      var currentBookVerseCount = this.getNumberOfVersesForCurrentBook();
      var bookTaggedVersesCountLabel = this.getCurrentBookTaggedVersesCountLabel();
      bookTaggedVersesCountLabel.text(` (${currentBookVerseCount})`);
    }

    app_controller.sword_notes.initForContainer(document.getElementById('verse-list-popup-verse-list'));
    $('#verse-list-popup-verse-list').show();
  }
}

module.exports = VerseListPopup;