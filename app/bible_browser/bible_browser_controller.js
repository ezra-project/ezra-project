/* This file is part of Ezra Project.

   Copyright (C) 2019 Tobias Klein <contact@ezra-project.net>

   Ezra Project is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   Ezra Project is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with Ezra Project. See the file COPYING.
   If not, see <http://www.gnu.org/licenses/>. */

const TagSelectionMenu = require('./app/bible_browser/tag_selection_menu.js');
const ModuleSearch = require('./app/bible_browser/module_search.js');
const TranslationWizard = require('./app/bible_browser/translation_wizard.js');
const TranslationController = require('./app/bible_browser/translation_controller.js');
const BookSearch = require('./app/bible_browser/book_search.js');
const TabController = require('./app/bible_browser/tab_controller.js');
const NavigationPane = require('./app/bible_browser/navigation_pane.js');
const TextLoader = require('./app/bible_browser/text_loader.js');
const TaggedVerseExport = require('./app/bible_browser/tagged_verse_export.js');
const BibleBrowserCommunicationController = require('./app/bible_browser/bible_browser_communication_controller.js');
const LanguageMapper = require('./app/bible_browser/language_mapper.js');
const OptionsMenu = require('./app/bible_browser/options_menu.js');
const TranslationComparison = require('./app/bible_browser/translation_comparison.js');
const Mousetrap = require('mousetrap');
const { clipboard } = require('electron');

function BibleBrowserController() {
  this.book_menu_is_opened = false;
  this.current_cr_verse_id = null;
  this.communication_controller = new BibleBrowserCommunicationController();

  this.get_book_short_title = function(book_long_title) {
    for (var i = 0; i < bible_books.length; i++) {
      var current_book = bible_books[i];
      if (current_book.long_title == book_long_title) {
        return current_book.short_title;
      }
    }

    return -1;
  };

  this.get_book_long_title = function(book_short_title) {
    for (var i = 0; i < bible_books.length; i++) {
      var current_book = bible_books[i];
      if (current_book.short_title == book_short_title) {
        return current_book.long_title;
      }
    }

    return -1;
  };

  this.init = async function() {
    this.verse_list_menu_template = $($('.verse-list-menu')[0]).html();
    this.verse_list_composite_template = $($('.verse-list-composite')[0]).html();

    this.settings = require('electron-settings');

    this.tag_selection_menu = new TagSelectionMenu();
    this.module_search = new ModuleSearch();

    this.translation_controller = new TranslationController();
    this.translation_controller.init(bible_browser_controller.onBibleTranslationChanged);
    this.translation_wizard = new TranslationWizard();
    this.translation_wizard.init(bible_browser_controller.onAllTranslationsRemoved,
                                 bible_browser_controller.onTranslationRemoved);

    this.text_loader = new TextLoader();

    this.book_search = new BookSearch();
    this.book_search.init('#book-search',
                          '#book-search-input',
                          '#book-search-occurances',
                          '#book-search-previous',
                          '#book-search-next',
                          bible_browser_controller.onSearchResultsAvailable,
                          bible_browser_controller.onSearchReset);

    var tabHtmlTemplate = bible_browser_controller.getTabHtmlTemplate();

    var bibleTranslations = await models.BibleTranslation.findAndCountAll();
    var defaultBibleTranslationId = null;
    if (bibleTranslations.rows.length > 0) {
      var defaultBibleTranslationId = bibleTranslations.rows[0].id;
    }

    this.tab_controller = new TabController();
    this.tab_controller.init('verse-list-tabs',
                             'verse-list-container',
                             'add-tab-button',
                             this.settings,
                             tabHtmlTemplate,
                             bible_browser_controller.onTabSelected,
                             bible_browser_controller.onTabAdded,
                             defaultBibleTranslationId);

    this.optionsMenu = new OptionsMenu();
    this.navigation_pane = new NavigationPane();
    this.taggedVerseExport = new TaggedVerseExport();
    this.translationComparison = new TranslationComparison();

    this.init_book_selection_menu();
    this.init_tag_reference_box();
    this.init_bible_translation_info_box();
    this.init_bible_sync_box();
    this.initGlobalShortCuts();
  };

  this.onSearchResultsAvailable = function(occurances) {
    for (var i = 0; i < occurances.length; i++) {
      var currentOccurance = $(occurances[i]);
      var verseBox = currentOccurance.closest('.verse-box');
      var currentTab = bible_browser_controller.tab_controller.getTab();
      var currentBook = currentTab.getBook();
      var currentTagIdList = currentTab.getTagIdList();

      if (currentBook != null) {
        // Highlight chapter if we are searching in a book

        var verseReferenceContent = verseBox.find('.verse-reference-content').text();
        var chapter = bible_browser_controller.getChapterFromReference(verseReferenceContent);
        bible_browser_controller.navigation_pane.highlightSearchResult(chapter);

      } else if (currentTagIdList != null) {

        // Highlight bible book if we are searching in a tagged verses list
        var book = verseBox.find('.verse-bible-book-short').text();
        var bibleBookLongTitle = bible_browser_controller.get_book_long_title(book);
        
        var bibleBookNumber = bible_browser_controller.getTaggedVerseListBookNumber(bibleBookLongTitle);
        if (bibleBookNumber != -1) {
          bible_browser_controller.navigation_pane.highlightSearchResult(bibleBookNumber);
        }
      }

    }
  };

  this.onSearchReset = function() {
    bible_browser_controller.navigation_pane.clearHighlightedSearchResults();
  };

  this.onTabSelected = function(event = undefined, ui = { 'index' : 0}) {
    // Refresh tags view
    bible_browser_controller.updateTagsView(ui.index);

    // Refresh tags selection menu (It's global!)
    bible_browser_controller.tag_selection_menu.updateTagSelectionMenu(ui.index);

    // Re-configure book search for current verse list
    var currentVerseList = bible_browser_controller.getCurrentVerseList(ui.index);
    bible_browser_controller.book_search.setVerseList(currentVerseList);

    // Update available books for current translation
    bible_browser_controller.translation_controller.updateAvailableBooks(ui.index);

    // Highlight currently selected book (only in book mode)
    bible_browser_controller.clearSelectedBookInMenu();
    var textType = bible_browser_controller.tab_controller.getTab(ui.index).getTextType();
    if (textType == 'book') {
      bible_browser_controller.highlightCurrentlySelectedBookInMenu(ui.index);
    }

    // Toggle book statistics
    bible_browser_controller.toggle_book_tags_statistics_button(ui.index);

    // Populate search menu based on last search (if any)
    bible_browser_controller.module_search.populateSearchMenu(ui.index);

    // Refresh the view based on the options selected
    bible_browser_controller.optionsMenu.refreshViewBasedOnOptions(ui.index);
  };

  this.onTabAdded = function(tabIndex=0) {
    resize_app_container();
    bible_browser_controller.tag_selection_menu.init_tag_selection_menu(tabIndex);
    bible_browser_controller.module_search.init_module_search_menu(tabIndex);
    bible_browser_controller.init_current_verse_list_menu(tabIndex);
    bible_browser_controller.translation_controller.initTranslationsMenu(tabIndex);
    bible_browser_controller.translation_controller.initBibleTranslationInfoButton();
    bible_browser_controller.optionsMenu.initCurrentOptionsMenu(tabIndex);

    var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab(tabIndex).getBibleTranslationId();
    if (currentBibleTranslationId != null) {
      bible_browser_controller.translation_controller.enableCurrentTranslationInfoButton(tabIndex);
    }

    bible_browser_controller.clearSelectedBookInMenu();
  };

  this.onBibleTranslationChanged = function() {
    var currentTab = bible_browser_controller.tab_controller.getTab();
    var currentBook = currentTab.getBook();
    var currentTagIdList = currentTab.getTagIdList();
    var currentTextType = currentTab.getTextType();
    var currentBibleTranslationId = currentTab.getBibleTranslationId();
    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
    var currentTabIndex = bible_browser_controller.tab_controller.getSelectedTabIndex();
    bible_browser_controller.tab_controller.refreshBibleTranslationInTabTitle(currentBibleTranslationId);

    if (currentTextType == 'search_results') {
      var currentSearchTerm = currentTab.getSearchTerm();
      bible_browser_controller.text_loader.prepareForNewText(true);
      bible_browser_controller.module_search.start_search(null, currentTabIndex, currentSearchTerm);
    } else {
      if (!bible_browser_controller.tab_controller.isCurrentTabEmpty()) {
        bible_browser_controller.text_loader.prepareForNewText(false);
        bible_browser_controller.text_loader.requestTextUpdate(currentTabId,
                                                               currentBook,
                                                               currentTagIdList,
                                                               null);
      }
    }
  };

  // Re-init application to state without Bible translations
  this.onAllTranslationsRemoved = function() {
    bible_browser_controller.tab_controller.removeAllExtraTabs();
    bible_browser_controller.tab_controller.setCurrentBibleTranslationId(null);
    bible_browser_controller.tab_controller.getTab().setTagIdList("");
    bible_browser_controller.tab_controller.setCurrentTabBook(null, "");
    bible_browser_controller.tab_controller.resetCurrentTabTitle();
    bible_browser_controller.tab_controller.deleteTabConfiguration();

    bible_browser_controller.resetVerseListView();

    var currentVerseListLoadingIndicator = bible_browser_controller.getCurrentVerseListLoadingIndicator();
    currentVerseListLoadingIndicator.hide();

    var currentVerseList = bible_browser_controller.getCurrentVerseList();
    currentVerseList.append("<div class='help-text'>To start using Ezra Project, select a book or a tag from the menu above.</div>");
    bible_browser_controller.translation_controller.disableCurrentTranslationInfoButton();
    
    $('.book-select-value').text("Select book");
  };

  this.onTranslationRemoved = function() {
    $("select#bible-select").empty();
    bible_browser_controller.translation_controller.initTranslationsMenu();
    tags_controller.updateTagUiBasedOnTagAvailability();
  };

  this.getTabHtmlTemplate = function() {
    var tabHtmlTemplate = "";

    tabHtmlTemplate += "<div class='verse-list-menu'>";
    tabHtmlTemplate += bible_browser_controller.verse_list_menu_template;
    tabHtmlTemplate += "</div>";

    tabHtmlTemplate += "<div class='verse-list-composite'>";
    tabHtmlTemplate += bible_browser_controller.verse_list_composite_template;
    tabHtmlTemplate += "</div>";

    return tabHtmlTemplate;
  };

  this.loadSettings = async function() {
    if (await models.Tag.getTagCount() > 0) {
      tags_controller.showTagListLoadingIndicator();
    }

    bible_browser_controller.optionsMenu.loadDisplayOptions();

    await this.tab_controller.loadTabConfiguration();
    await bible_browser_controller.translation_controller.loadSettings();
    this.tab_controller.bindEvents();

    if (bible_browser_controller.settings.get('tag_list_width') &&
        bible_browser_controller.settings.get('tag_list_width') != null) {

      $('#bible-browser-toolbox').css('width', bible_browser_controller.settings.get('tag_list_width'));
    }
  };

  this.init_book_selection_menu = function() {
    var menu = $('#app-container').find('#book-selection-menu');
    var links = menu.find('a');

    menu.bind('click', bible_browser_controller.handle_body_click);

    for (var i = 0; i < links.length; i++) {
      var current_link = $(links[i]);
      var current_link_href = current_link.attr('href');
      var current_book_title = current_link.html();
      var new_link_href = "javascript:bible_browser_controller.select_bible_book('" + 
                          current_link_href + "','" + current_book_title + "')";

      current_link.attr('href', new_link_href);
    }
  };

  this.init_current_verse_list_menu = function(tabIndex=undefined) {
    //console.log("init_current_verse_list_menu " + tabIndex);
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    var bookSelectButton = currentVerseListMenu.find('.book-select-button');
    bookSelectButton.bind('click', bible_browser_controller.handle_book_menu_click);
    $('.verse-list-menu').find('.fg-button').removeClass('events-configured');
    configure_button_styles('.verse-list-menu');
    bible_browser_controller.navigation_pane.updateNavigation();
  };

  this.init_tag_reference_box = function() {
    $('#tag-reference-box').dialog({
      width: 620,
      position: [200,200],
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    });
  };

  this.init_bible_translation_info_box = function() {
    $('#bible-translation-info-box').dialog({
      width: 800,
      height: 500,
      autoOpen: false,
      dialogClass: 'ezra-dialog'
    });
  };

  this.init_bible_sync_box = function() {
    $('#bible-sync-box').dialog({
      width: 600,
      height: 300,
      autoOpen: false,
      title: i18n.t("module-sync.module-sync-header"),
      dialogClass: 'bible-sync-dialog'
    });
  };

  this.initGlobalShortCuts = function() {
    Mousetrap.bind('ctrl+c', () => {
      bible_browser_controller.copySelectedVersesToClipboard();
      return false;
    });
  };

  this.copySelectedVersesToClipboard = function() {
    var selectedVerseBoxes = tags_controller.selected_verse_boxes;
    
    var selectedText = "";

    for (var i = 0; i < selectedVerseBoxes.length; i++) {
      var currentVerseBox = $(selectedVerseBoxes[i]);
      var verseReferenceContent = currentVerseBox.find('.verse-reference-content').text();
      var currentVerseNr = verseReferenceContent.split(reference_separator)[1];
      
      var currentText = currentVerseBox.find('.verse-text').clone();
      currentText.find('.sword-markup').remove();

      selectedText += currentVerseNr + " " + currentText.text().trim() + " ";
    }

    selectedText = selectedText.trim();
    selectedText += " " + getLineBreak() + $('#selected-verses').text();

    clipboard.writeText(selectedText);
  };

  this.getCurrentVerseListTabs = function(tabIndex=undefined) {
    var selectedTabId = bible_browser_controller.tab_controller.getSelectedTabId(tabIndex);
    var currentVerseListTabs = $('#' + selectedTabId);
    return currentVerseListTabs;
  };

  this.getCurrentVerseListMenu = function(tabIndex=undefined) {
    var currentVerseListTabs = bible_browser_controller.getCurrentVerseListTabs(tabIndex);
    var currentVerseListMenu = currentVerseListTabs.find('.verse-list-menu');
    return currentVerseListMenu;
  };

  this.getCurrentVerseListComposite = function(tabIndex=undefined) {
    var currentVerseListTabs = bible_browser_controller.getCurrentVerseListTabs(tabIndex);
    var currentVerseListComposite = currentVerseListTabs.find('.verse-list-composite');
    return currentVerseListComposite;
  };

  this.getCurrentVerseListFrame = function(tabIndex=undefined) {
    var currentVerseListComposite = bible_browser_controller.getCurrentVerseListComposite(tabIndex);
    var currentVerseListFrame = currentVerseListComposite.find('.verse-list-frame');
    return currentVerseListFrame;
  };

  this.getCurrentVerseList = function(tabIndex=undefined) {
    var currentVerseListFrame = bible_browser_controller.getCurrentVerseListFrame(tabIndex);
    var verseList = currentVerseListFrame.find('.verse-list');
    return verseList;
  };

  this.highlightCurrentlySelectedBookInMenu = function(tabIndex=undefined) {
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    var bookCode = currentTab.getBook();
    if (bookCode != null) {
      bible_browser_controller.highlightSelectedBookInMenu(bookCode);
    }
  };

  this.clearSelectedBookInMenu = function() {
    // Remove highlighting for previously selected book
    $('.book-selected').removeClass('book-selected');
  };

  this.highlightSelectedBookInMenu = function(book_code) {
    var bookId = '.book-' + book_code;

    bible_browser_controller.clearSelectedBookInMenu();
    
    // Highlight the newly selected book
    $('#book-selection-menu').find(bookId).addClass('book-selected');
  };

  this.select_bible_book = function(book_code, book_title) {
    bible_browser_controller.highlightSelectedBookInMenu(book_code);

    var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab().getBibleTranslationId();
    models.BibleTranslation.getBookList(currentBibleTranslationId).then(books => {
      if (!books.includes(book_code)) {
        return;
      }

      bible_browser_controller.hide_book_menu();
      bible_browser_controller.tag_selection_menu.hide_tag_menu();
      bible_browser_controller.tag_selection_menu.reset_tag_menu();
      bible_browser_controller.module_search.hide_search_menu();
      bible_browser_controller.module_search.reset_search();

      // Not needed at the moment
      //$('#outline-content').empty();

      // Set selected tags to null, since we just switched to a book
      var currentTab = bible_browser_controller.tab_controller.getTab();
      currentTab.setTextType('book');
      currentTab.setTagIdList(null);
      bible_browser_controller.tab_controller.setCurrentTabBook(book_code, book_title);

      var currentVerseList = bible_browser_controller.getCurrentVerseList();
      bible_browser_controller.book_search.setVerseList(currentVerseList);
      var currentTab = bible_browser_controller.tab_controller.getTab();

      var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
      var currentBook = currentTab.getBook();

      bible_browser_controller.text_loader.prepareForNewText(true);
      bible_browser_controller.text_loader.requestTextUpdate(currentTabId, currentBook, null, null);
      tags_controller.communication_controller.request_tags();
    });
  };

  this.getCurrentVerseListLoadingIndicator = function() {
    var currentVerseListComposite = bible_browser_controller.getCurrentVerseListComposite();
    var loadingIndicator = currentVerseListComposite.find('.verse-list-loading-indicator');
    return loadingIndicator;
  };

  this.showVerseListLoadingIndicator = function() {
    var loadingIndicator = bible_browser_controller.getCurrentVerseListLoadingIndicator();
    loadingIndicator.find('.loader').show();
    loadingIndicator.show();
  };

  this.hideVerseListLoadingIndicator = function() {
    var loadingIndicator = bible_browser_controller.getCurrentVerseListLoadingIndicator();
    loadingIndicator.hide();
  };

  this.hide_book_menu = function() {
    if (bible_browser_controller.book_menu_is_opened) {
      $('#app-container').find('#book-selection-menu').hide();
      bible_browser_controller.book_menu_is_opened = false;

      var book_button = $('#app-container').find('.book-select-button');
      book_button.removeClass('ui-state-active');
    }
  };

  this.updateTagsView = function(tabIndex) {
    tags_controller.showTagListLoadingIndicator();
    tags_controller.clear_verse_selection();
    var currentTab = bible_browser_controller.tab_controller.getTab(tabIndex);
    var currentTabBook = currentTab.getBook();
    var currentTagIdList = currentTab.getTagIdList();
    if ((currentTabBook != undefined && currentTabBook != null) || currentTagIdList != null) {
      setTimeout(() => {
        tags_controller.communication_controller.request_tags(currentTabBook);
      }, 200);
    }
  };

  this.handle_body_click = function(event) {
    if($(this).hasClass('verse-selection-menu')) {
      event.stopPropagation();
      return;
    }
    
    bible_browser_controller.hide_book_menu();
    bible_browser_controller.tag_selection_menu.hide_tag_menu();
    bible_browser_controller.module_search.hide_search_menu();
    bible_browser_controller.optionsMenu.hideDisplayMenu();

    if ($('#currently-edited-notes').length > 0) {
      notes_controller.restore_currently_edited_notes();
    }
  };

  this.handle_book_menu_click = function(event) {
    if ($('.book-select-button').hasClass('ui-state-disabled')) {
      return;
    }

    if (bible_browser_controller.book_menu_is_opened) {
      bible_browser_controller.handle_body_click();
    } else {
      bible_browser_controller.tag_selection_menu.hide_tag_menu();
      bible_browser_controller.module_search.hide_search_menu();
      bible_browser_controller.optionsMenu.hideDisplayMenu();
      var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
      var book_button = currentVerseListMenu.find('.book-select-button');
      book_button.addClass('ui-state-active');

      var book_button_offset = book_button.offset();
      var menu = $('#app-container').find('#book-selection-menu');
      var top_offset = book_button_offset.top + book_button.height() + 12;
      var left_offset = book_button_offset.left;

      menu.css('top', top_offset);
      menu.css('left', left_offset);

      $('#app-container').find('#book-selection-menu').slideDown();
      bible_browser_controller.book_menu_is_opened = true;
      event.stopPropagation();
    }
  };

  this.bind_events_after_bible_text_loaded = async function(tabIndex=undefined) {
    var currentVerseList = bible_browser_controller.getCurrentVerseList(tabIndex);

    currentVerseList.find('.tag-box').filter(":not('.tag-events-configured')").bind('click', tags_controller.clear_verse_selection).addClass('tag-events-configured');
    currentVerseList.find('.tag').filter(":not('.tag-events-configured')").bind('click', bible_browser_controller.handle_tag_reference_click).addClass('tag-events-configured');
    currentVerseList.find('.verse-box').bind('mouseover', bible_browser_controller.onVerseBoxMouseOver);
  };

  this.getTaggedVerseListBookNumber = function(bibleBookLongTitle) {
    var bibleBookNumber = -1;
    var currentVerseListFrame = bible_browser_controller.getCurrentVerseListFrame();
    var bookHeaders = currentVerseListFrame.find('.tag-browser-verselist-book-header');

    for (var i = 0; i < bookHeaders.length; i++) {
      var currentBookHeader = $(bookHeaders[i]);
      var currentBookHeaderText = currentBookHeader.text();

      if (currentBookHeaderText == bibleBookLongTitle) {
        bibleBookNumber = i + 1;
        break;
      }
    }

    return bibleBookNumber;
  };

  this.onVerseBoxMouseOver = function() {
    var currentTab = bible_browser_controller.tab_controller.getTab();
    var currentBook = currentTab.getBook();
    var currentTagIdList = currentTab.getTagIdList();
    var currentTextType = currentTab.getTextType();

    if (currentTextType == 'book' && currentBook != null) {

      var verseReferenceContent = $(this).find('.verse-reference-content').text();
      var mouseOverChapter = bible_browser_controller.getChapterFromReference(verseReferenceContent);
      bible_browser_controller.navigation_pane.highlightNavElement(mouseOverChapter);

    } else if (currentTextType == 'tagged_verses' && currentTagIdList != null || currentTextType == 'search_results') {

      var mouseOverBook = $(this).find('.verse-bible-book-short').text();
      var bibleBookLongTitle = bible_browser_controller.get_book_long_title(mouseOverBook);
      
      var bibleBookNumber = bible_browser_controller.getTaggedVerseListBookNumber(bibleBookLongTitle);
      if (bibleBookNumber != -1) {
        bible_browser_controller.navigation_pane.highlightNavElement(bibleBookNumber);
      }
    }
  };

  this.get_overlay_verse_box_position = function(verse_box) {
    var currentVerseListComposite = bible_browser_controller.getCurrentVerseListComposite();

    var verse_box_position = verse_box.offset();
    var verse_box_class = verse_box.attr('class');
    var verse_nr = parseInt(verse_box_class.match(/verse-nr-[0-9]*/)[0].split('-')[2]);
    var next_verse_nr = verse_nr + 1;

    var next_verse_box = currentVerseListComposite.find('.verse-nr-' + next_verse_nr);
    var next_verse_box_position = next_verse_box.offset();
    if (next_verse_box_position == undefined) {
      next_verse_box_position = verse_box.offset();
    }
    var verse_list_height = currentVerseListComposite.height();
    var verse_list_position = currentVerseListComposite.offset();
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
        top: verse_box_position.top - cross_reference_box_height,
        left: offsetLeft
      };
    }

    return overlay_box_position;
  };

  this.handle_tag_reference_click = function(event) {
    var position = $(this).offset();
    var verse_box = $(this).closest('.verse-box');
    var verse_id = verse_box.find('.verse-id').text();
    var selected_tag = $(this).html().trim();
    selected_tag = selected_tag.replace(/&nbsp;/g, ' ');
    var tag_id = null;

    var tag_info_list = verse_box.find('.tag-global');
    for (var i = 0; i < tag_info_list.length; i++) {
      var current_tag_info = $(tag_info_list[i]);
      var current_tag_title = current_tag_info.find('.tag-title').text();

      if (current_tag_title == selected_tag) {
        tag_id = current_tag_info.find('.tag-id').text();
        break;
      }
    }

    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
    var currentTabIndex = bible_browser_controller.tab_controller.getSelectedTabIndex();

    bible_browser_controller.communication_controller.request_verses_for_selected_tags(
      currentTabIndex,
      currentTabId,
      tag_id,
      bible_browser_controller.render_tagged_verse_list_in_reference_box,
      render_type='html',
      renderVerseMetaInfo=false
    );

    var box_position = bible_browser_controller.get_overlay_verse_box_position(verse_box);
    var title = i18n.t("tags.verses-tagged-with") + ' "' + selected_tag + '"';

    $('#tag-reference-box').dialog({
      position: [box_position.left, box_position.top],
      title: title
    });
    $('#tag-reference-box-verse-list').empty();
    $('#tag-reference-box').dialog("open");
  };

  this.render_tagged_verse_list_in_reference_box = function(htmlVerses, verseCount) {
    var tagReferenceBoxTitle = $('#tag-reference-box').dialog('option', 'title');
    tagReferenceBoxTitle += ' (' + verseCount + ')';
    $('#tag-reference-box').dialog({ title: tagReferenceBoxTitle });
    $('#tag-reference-box-verse-list').html(htmlVerses);
  };

  this.get_tagged_verses = function() {
    var currentTagIdList = bible_browser_controller.tab_controller.getTab().getTagIdList();
    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
    var currentVerseList = bible_browser_controller.getCurrentVerseList();

    bible_browser_controller.book_search.setVerseList(currentVerseList);

    if (currentTagIdList != "") {
      bible_browser_controller.text_loader.prepareForNewText(true);
      bible_browser_controller.text_loader.requestTextUpdate(currentTabId, null, currentTagIdList, null);
      tags_controller.communication_controller.request_tags();
      // PORTING DISABLED
      //tags_controller.communication_controller.request_meta_tags();
    }
  };

  this.resetVerseListView = function() {
    var currentVerseList = bible_browser_controller.getCurrentVerseList()[0];
    if (currentVerseList != undefined) {
      while(currentVerseList.firstChild) {
        currentVerseList.removeChild(currentVerseList.firstChild);
      }
    }

    bible_browser_controller.navigation_pane.resetNavigationPane();
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu();
    currentVerseListMenu.find('.export-tagged-verses-button').addClass('ui-state-disabled');
  };

  this.wrap_book_with_html = function(book_title) {
    return "<div class='tag-browser-verselist-book-header'>" + book_title + "</div>";
  };

  this.enable_toolbox = function() {
    $('#bible-browser-toolbox').find('.ui-tabs-nav').find('li').removeClass('ui-state-disabled');
  };

  this.enable_tagging_toolbox_only = function() {
    var menu_items = $('#bible-browser-toolbox').find('.ui-tabs-nav').find('li');
    for (var i = 0; i < menu_items.length; i++) {
      var current_item = $(menu_items[i]);
      if (current_item.find('a').attr('href') == '#tags-view') {
        current_item.removeClass('ui-state-disabled');
      } else {
        current_item.addClass('ui-state-disabled');
      }
    }
    $('#bible-browser-toolbox').tabs('select', 1);
  };

  this.disable_toolbox = function() {
    $('#bible-browser-toolbox').find('.ui-tabs-nav').find('li').addClass('ui-state-disabled');
  };

  this.initApplicationForVerseList = function(tabIndex=undefined) {
    if (tabIndex === undefined) {
      var tabIndex = bible_browser_controller.tab_controller.getSelectedTabIndex();
    }

    // Disabled notes controller
    //notes_controller.init();
    tags_controller.init(tabIndex);
    bible_browser_controller.navigation_pane.updateNavigation(tabIndex);
    bible_browser_controller.optionsMenu.showOrHideSectionTitlesBasedOnOption(tabIndex);
    bible_browser_controller.bind_events_after_bible_text_loaded(tabIndex);
    bible_browser_controller.toggle_book_tags_statistics_button(tabIndex);
    tags_controller.bind_tag_events();
  };

  this.toggle_book_tags_statistics_button = async function(index=undefined) {
    var book_tag_statistics_button = $('#show-book-tag-statistics-button');
    if (index === undefined) {
      index = bible_browser_controller.tab_controller.getSelectedTabIndex();
    }

    if (bible_browser_controller.tab_controller.getTab(index).getTextType() == 'book') {
      var tagsCount = await models.Tag.getTagCount();

      if (tagsCount > 0) {
        book_tag_statistics_button.removeClass('ui-state-disabled');
        book_tag_statistics_button.removeClass('events-configured');
      }

      book_tag_statistics_button.bind('click', function() {
        bible_browser_controller.open_book_tag_statistics(); 
      });
      book_tag_statistics_button.show();
    } else {
      book_tag_statistics_button.unbind()
      book_tag_statistics_button.addClass('ui-state-disabled');
      book_tag_statistics_button.addClass('events-configured');
    }

    configure_button_styles('#tags-header');
  };

  this.open_book_tag_statistics = function() {
    var currentVerseList = bible_browser_controller.getCurrentVerseList();
    var verse_list_position = currentVerseList.offset();
    var currentTab = bible_browser_controller.tab_controller.getTab();
    var currentBook = currentTab.getBook();
    var currentBookName = bible_browser_controller.get_book_long_title(currentBook);

    $('#book-tag-statistics-box').dialog({
      dialogClass: 'ezra-dialog',
      position: [verse_list_position.left + 50, verse_list_position.top + 50],
      width: 350,
      title: currentBookName + ' - ' + i18n.t("bible-browser.tag-statistics")
    });
  };

  this.sync_sword_modules = async function() {
    var currentVerseList = bible_browser_controller.getCurrentVerseList();
    var verse_list_position = currentVerseList.offset();
    $('#bible-sync-box').dialog({
      position: [verse_list_position.left + 50, verse_list_position.top + 30]
    });

    if (!bible_browser_controller.translation_controller.nodeSwordInterface.repositoryConfigExisting()) {
      $('#bible-sync-box').dialog("open");
      $('#bible-sync-box').append('<p>' + i18n.t('translation-wizard.updating-repository-data') + '</p>');

      await bible_browser_controller.translation_controller.nodeSwordInterface.updateRepositoryConfig();
    }

    var modulesNotInDb = await bible_browser_controller.translation_controller.getLocalModulesNotYetAvailableInDb();
    var notInstalledButAvailableModules = await bible_browser_controller.translation_controller.getNotInstalledButAvailableModules();

    if (modulesNotInDb.length > 0 || notInstalledButAvailableModules.length > 0) {
      $('#bible-sync-box').dialog("open");
      await bible_browser_controller.translation_controller.sleep(200);
    }

    if (modulesNotInDb.length > 0) {
      await bible_browser_controller.translation_controller.syncDbWithSwordModules($('#bible-sync-box'));
    }

    if (notInstalledButAvailableModules.length > 0) {
      await bible_browser_controller.translation_controller.syncSwordInstallationWithDb($('#bible-sync-box'));
    }

    if (modulesNotInDb.length > 0 || notInstalledButAvailableModules.length > 0) {
      await bible_browser_controller.translation_controller.sleep(2000);
    }

    $('#bible-sync-box').dialog("close");
  };

  this.updateUiAfterBibleTranslationAvailable = function(translationCode) {
    var currentBibleTranslationId = bible_browser_controller.tab_controller.getTab().getBibleTranslationId();
    if (currentBibleTranslationId == "" || 
        currentBibleTranslationId == null) { // Update UI after a Bible translation becomes available

      bible_browser_controller.tab_controller.setCurrentBibleTranslationId(translationCode);
      bible_browser_controller.translation_controller.updateAvailableBooks();
      bible_browser_controller.translation_controller.enableCurrentTranslationInfoButton();
    }
  };

  this.open_translation_settings_wizard = function() {
    bible_browser_controller.optionsMenu.hideDisplayMenu();
    bible_browser_controller.translation_wizard.openWizard();
  };

  this.getChapterFromReference = function(reference) {
    var chapter = Number(reference.split(reference_separator)[0]);
    return chapter;
  };

  this.getVerseFromReference = function(reference) {
    var verse = Number(reference.split(reference_separator)[1]);
    return verse;
  };

  this.jump_to_reference = function(reference, highlight) {
    var currentTabId = bible_browser_controller.tab_controller.getSelectedTabId();
    var chapter = bible_browser_controller.getChapterFromReference(reference);
    var verse = bible_browser_controller.getVerseFromReference(reference);

    var uniqueReference = '#' + currentTabId + ' ' + chapter + ':' + verse;

    if (chapter == 1 && verse < 5) {
      var currentVerseListComposite = bible_browser_controller.getCurrentVerseListComposite();
      currentVerseListComposite[0].scrollTop = 0;
    } else {
      window.location = uniqueReference;
    }

    bible_browser_controller.navigation_pane.highlightNavElement(chapter);

    /*if (highlight) { // FIXME
      original_verse_box.glow();
    }*/
  };

  this.enableTaggedVersesExportButton = function(tabIndex) {
    var currentVerseListMenu = bible_browser_controller.getCurrentVerseListMenu(tabIndex);
    var exportButton = currentVerseListMenu.find('.export-tagged-verses-button');
    exportButton.removeClass('ui-state-disabled');
    exportButton.unbind('click');
    exportButton.bind('click', function() {
      bible_browser_controller.taggedVerseExport.runExport();
    });
    exportButton.show();
    exportButton.removeClass('events-configured');
    configure_button_styles('.verse-list-menu');
  };
}
 
