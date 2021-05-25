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

const Mousetrap = require('mousetrap');
const VerseBox = require('../ui_models/verse_box.js');

const VerseBoxHelper = require("../helpers/verse_box_helper.js");
const VerseSelection = require("../components/verse_selection.js");
const VerseListPopup = require("../components/verse_list_popup.js");
const TagSelectionMenu = require("../components/tags/tag_selection_menu.js");
const TagAssignmentMenu = require("../components/tags/tag_assignment_menu.js");
const AssignLastTagButton = require("../components/tags/assign_last_tag_button.js");
const TagStatistics = require("../components/tags/tag_statistics.js");
const TaggedVerseExport = require("../components/tags/tagged_verse_export.js");
const ModuleSearchController = require("./module_search_controller.js");
const TranslationController = require("./translation_controller.js");
const InstallModuleAssistant = require("../components/module_assistant/install_module_assistant.js");
const RemoveModuleAssistant = require("../components/module_assistant/remove_module_assistant.js");
const TextController = require("./text_controller.js");
const VerseContextController = require("./verse_context_controller.js");
const TabSearch = require("../components/tab_search/tab_search.js");
const TabController = require("./tab_controller.js");
const OptionsMenu = require("../components/options_menu.js");
const NavigationPane = require("../components/navigation_pane.js");
const TranslationComparison = require("../components/translation_comparison.js");
const BookSelectionMenu = require("../components/book_selection_menu.js");
const DictionaryController = require("./dictionary_controller.js");
const NotesController = require("./notes_controller.js");
const SwordNotes = require("../components/sword_notes.js");
const InfoPopup = require("../components/info_popup.js");
const TextSizeSettings = require("../components/text_size_settings.js");
const VerseStatisticsChart = require('../components/verse_statistics_chart.js');
const { waitUntilIdle } = require('../helpers/ezra_helper.js');
const i18nHelper = require('../helpers/i18n_helper.js');

/**
 * AppController is Ezra Bible App's main controller class which initiates all other controllers and components.
 * It is only instantiated once and an instance is available at `global.app_controller`.
 * 
 * @category Controller
 */
class AppController {
  constructor() {
    this.book_menu_is_opened = false;
    this.current_cr_verse_id = null;
  }

  /**
   * This function is a "macro" for instantiating a component as a member of AppController.
   * 
   * @param {String} componentClassName The class name of the component 
   * @param {String} componentName The variable name that this component shall get within the AppController instance
   * @param {String} componentPath The path to the component js file
   */
  init_component(componentClassName, componentName) {
    var expression = "";
    expression += "this." + componentName + " = new " + componentClassName + "();";
    eval(expression);
  }

  async init() {
    this.tabHtmlTemplate = $($('.verse-list-container')[0]).html();

    if (platformHelper.isElectron()) {
      this.settings = require('electron-settings');
    } else {
      this.settings = {
        has: function() { return false; },
        get: function() { return null; },
        set: function() { return; },
        delete: function() { return; }
      };
    }

    this.init_component("VerseBoxHelper", "verse_box_helper");
    this.init_component("VerseSelection", "verse_selection");
    this.init_component("TagSelectionMenu", "tag_selection_menu");
    this.init_component("TagAssignmentMenu", "tag_assignment_menu");
    this.init_component("TaggedVerseExport", "taggedVerseExport");
    this.init_component("TagStatistics", "tag_statistics");
    this.init_component("AssignLastTagButton", "assign_last_tag_button");
    this.init_component("ModuleSearchController", "module_search_controller");
    this.init_component("TranslationController", "translation_controller");
    this.init_component("InstallModuleAssistant", "install_module_assistant");
    this.init_component("RemoveModuleAssistant", "remove_module_assistant");
    this.init_component("TextController", "text_controller");
    this.init_component("VerseContextController", "verse_context_controller");
    this.init_component("TabController", "tab_controller");
    this.init_component("OptionsMenu", "optionsMenu");
    this.init_component("NavigationPane", "navigation_pane");
    this.init_component("TranslationComparison", "translationComparison");
    this.init_component("BookSelectionMenu", "book_selection_menu");
    this.init_component("VerseListPopup", "verse_list_popup");
    this.init_component("DictionaryController", "dictionary_controller");
    this.init_component("NotesController", "notes_controller");
    this.init_component("SwordNotes", "sword_notes");
    this.init_component("InfoPopup", "info_popup");
    this.init_component("TextSizeSettings", "textSizeSettings");
    this.init_component("VerseStatisticsChart", "verse_statistics_chart");

    this.initGlobalShortCuts();

    this.translation_controller.init(async (oldBibleTranslationId, newBibleTranslationId) => {
      await this.onBibleTranslationChanged(oldBibleTranslationId, newBibleTranslationId);
    });

    this.remove_module_assistant.init(async () => { await this.onAllTranslationsRemoved(); },
                                      async (translationId) => { await this.onTranslationRemoved(translationId); });

    await this.book_selection_menu.init();

    var bibleTranslations = await ipcNsi.getAllLocalModules();
    var defaultBibleTranslationId = null;

    if (bibleTranslations != null && bibleTranslations.length > 0) {
      var defaultBibleTranslationId = bibleTranslations[0].name;
    }

    this.tab_controller.init('verse-list-tabs',
                             'verse-list-container',
                             'add-tab-button',
                             this.settings,
                             this.tabHtmlTemplate,
                             (event = undefined, ui = { 'index' : 0}) => { this.onTabSelected(event, ui); },
                             async (previousTabIndex, tabIndex) => { await this.onTabAdded(previousTabIndex, tabIndex); },
                             defaultBibleTranslationId);
  }

  async onTabSearchResultsAvailable(occurances) {
    // We need to re-initialize the Strong's event handlers, because the search function rewrote the verse html elements
    await this.dictionary_controller.bindAfterBibleTextLoaded();

    var currentVerseListFrame = this.getCurrentVerseListFrame();
    var bookHeaders = currentVerseListFrame.find('.tag-browser-verselist-book-header');

    var bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    var separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);

    // Highlight occurances in navigation pane
    for (var i = 0; i < occurances.length; i++) {
      var currentOccurance = $(occurances[i]);
      var verseBox = currentOccurance.closest('.verse-box');
      var currentTab = this.tab_controller.getTab();
      var currentTextType = currentTab.getTextType();

      if (currentTextType == 'book') {
        // Highlight chapter if we are searching in a book

        var verseReferenceContent = verseBox.find('.verse-reference-content').text();
        var chapter = this.getChapterFromReference(verseReferenceContent, separator);
        this.navigation_pane.highlightSearchResult(chapter);

      } else {

        // Highlight bible book if we are searching in a tagged verses list
        var currentBibleBookShortName = new VerseBox(verseBox[0]).getBibleBookShortTitle();
        var currentBookName = await ipcDb.getBookTitleTranslation(currentBibleBookShortName);

        var bibleBookNumber = this.getVerseListBookNumber(currentBookName, bookHeaders);
        if (bibleBookNumber != -1) {
          this.navigation_pane.highlightSearchResult(bibleBookNumber, "OTHER");
        }
      }
    }
  }

  onTabSearchReset() {
    this.navigation_pane.clearHighlightedSearchResults();

    // We need to re-initialize the Strong's event handlers, because the search function rewrote the verse html elements
    this.dictionary_controller.bindAfterBibleTextLoaded();
  }

  async onTabSelected(event = undefined, ui = { 'index' : 0}) {
    await waitUntilIdle();

    // Cancel any potentially ongoing module search
    await this.module_search_controller.cancelModuleSearch();

    var metaTab = this.tab_controller.getTab(ui.index);

    if (metaTab != null && metaTab.selectCount >= 2) {
      // Only perform the following actions from the 2nd select (The first is done when the tab is created)

      this.hideAllMenus();
      this.book_selection_menu.clearSelectedBookInMenu();
    }

    // Refresh the view based on the options selected
    this.optionsMenu.refreshViewBasedOnOptions(ui.index);

    // When switching tabs we need to end any note editing.
    this.notes_controller.restoreCurrentlyEditedNotes();

    // Re-configure tab search
    var currentVerseList = this.getCurrentVerseList(ui.index);
    if (metaTab.tab_search != null) {
      metaTab.tab_search.setVerseList(currentVerseList);
    }

    // Clear verse selection
    this.verse_selection.clear_verse_selection();

    // Refresh tags view
    // Assume that verses were selected before, because otherwise the checkboxes may not be properly cleared
    tags_controller.verses_were_selected_before = true;
    await tags_controller.updateTagsView(ui.index);

    // Refresh tags selection menu (It's global!)
    await this.tag_selection_menu.updateTagSelectionMenu(ui.index);

    // Update available books for current translation
    await this.book_selection_menu.updateAvailableBooks(ui.index);

    // Refresh translations menu
    await this.translation_controller.initTranslationsMenu(-1, ui.index);

    // Highlight currently selected book (only in book mode)
    if (metaTab != null) {
      var textType = metaTab.getTextType();
      if (textType == 'book') this.book_selection_menu.highlightCurrentlySelectedBookInMenu(ui.index);
    }

    // Toggle book statistics
    this.tag_statistics.toggleBookTagStatisticsButton(ui.index);

    // Populate search menu based on last search (if any)
    this.module_search_controller.populateSearchMenu(ui.index);

    // Hide elements present from previous tab's usage
    this.dictionary_controller.hideStrongsBox();
    this.verse_context_controller.hide_verse_expand_box();

    uiHelper.resizeVerseList(ui.index);
    uiHelper.configureButtonStyles('.verse-list-menu');
  }

  async onTabAdded(previousTabIndex, tabIndex=0) {
    this.hideAllMenus();

    // Cancel any potentially ongoing module search
    await this.module_search_controller.cancelModuleSearch();

    // Refresh the view based on the options selected
    this.optionsMenu.refreshViewBasedOnOptions(tabIndex);
    uiHelper.resizeVerseList(tabIndex);
    
    await this.initCurrentVerseListMenu(tabIndex);
    this.tag_selection_menu.init(tabIndex);
    this.tag_assignment_menu.init(tabIndex);
    this.module_search_controller.initModuleSearch(tabIndex);
    await this.translation_controller.initTranslationsMenu(previousTabIndex, tabIndex);
    this.info_popup.initAppInfoButton();
    this.textSizeSettings.init(tabIndex);
    
    var currentTab = this.tab_controller.getTab(tabIndex);

    if (currentTab) {
      const currentBibleTranslationId = currentTab.getBibleTranslationId();
      if (currentBibleTranslationId != null) {
        this.info_popup.enableCurrentAppInfoButton(tabIndex);
      }

      const verseListContainer = this.getCurrentVerseListFrame(tabIndex).parent();

      currentTab.tab_search = new TabSearch();
      currentTab.tab_search.init(
        verseListContainer,
        '.tab-search',
        '.tab-search-input',
        '.tab-search-occurances',
        '.tab-search-previous',
        '.tab-search-next',
        '.tab-search-is-case-sensitive',
        '.tab-search-type',
        async (occurances) => { await this.onTabSearchResultsAvailable(occurances); },
        () => { this.onTabSearchReset(); }
      );
  
    }

    this.optionsMenu.initCurrentOptionsMenu(tabIndex);
    this.book_selection_menu.clearSelectedBookInMenu();

    // We need to refresh the last used tag button, because the button is not yet initialized in the tab html template
    app_controller.assign_last_tag_button.onLatestUsedTagChanged(undefined, undefined);
  }

  async onBibleTranslationChanged(oldBibleTranslationId, newBibleTranslationId) {
    var currentTab = this.tab_controller.getTab();

    // The tab search is not valid anymore if the translation is changing. Therefore we reset it.
    currentTab.tab_search.resetSearch();

    if (currentTab.getTextType() == 'search_results') {
      await this.text_controller.prepareForNewText(true, true);
      this.module_search_controller.startSearch(null, this.tab_controller.getSelectedTabIndex(), currentTab.getSearchTerm());
    } else {
      if (!this.tab_controller.isCurrentTabEmpty()) {
        await this.text_controller.prepareForNewText(false, false);
        await this.text_controller.requestTextUpdate(this.tab_controller.getSelectedTabId(),
                                                 currentTab.getBook(),
                                                 currentTab.getTagIdList(),
                                                 null,
                                                 null,
                                                 null,
                                                 currentTab.getXrefs());

        if (currentTab.getReferenceVerseElementId() != null) {
          await this.updateReferenceVerseTranslation(oldBibleTranslationId, newBibleTranslationId);
        }
      }
    }
  }

  // Re-init application to state without Bible translations
  async onAllTranslationsRemoved() {
    await this.tab_controller.reset();
    this.resetVerseListView();
    this.hideVerseListLoadingIndicator();
    this.getCurrentVerseList().append("<div class='help-text'>" + i18n.t("help.help-text-no-translations") + "</div>");
    this.info_popup.disableCurrentAppInfoButton();
    this.verse_selection.clear_verse_selection();
    $('.book-select-value').text(i18n.t("menu.book"));
  }

  async onTranslationRemoved(translationId) {
    $("select#bible-select").empty();
    await this.translation_controller.initTranslationsMenu();
    await tags_controller.updateTagUiBasedOnTagAvailability();
    var installedTranslations = await this.translation_controller.getInstalledModules();
    this.tab_controller.onTranslationRemoved(translationId, installedTranslations);
  }

  async loadSettings() {
    try {
      var tagListWidthAvailable = await ipcSettings.has('tagListWidth');

      if (tagListWidthAvailable) {
        var tagListWidth = await ipcSettings.get('tagListWidth');

        $('#bible-browser-toolbox').css('width', tagListWidth);
        uiHelper.resizeAppContainer();
      }

      if (this.tab_controller.getTab().isValid() && await ipcDb.getTagCount() > 0) {
        tags_controller.showTagListLoadingIndicator();
      }

      await this.tab_controller.loadTabConfiguration();
      await this.translation_controller.loadSettings();
    } catch (e) {
      console.error("Failed to load settings ... got exception: " + e);
    }
    
    this.tab_controller.bindEvents();
  }

  async initCurrentVerseListMenu(tabIndex=undefined) {
    var currentVerseListMenu = this.getCurrentVerseListMenu(tabIndex);

    currentVerseListMenu.find('.fg-button').removeClass('events-configured');
    var bookSelectButton = currentVerseListMenu.find('.book-select-button');
    var moduleSearchButton = currentVerseListMenu.find('.module-search-button');

    var bibleTranslations = await ipcNsi.getAllLocalModules();
    if (bibleTranslations.length > 0) {
      bookSelectButton.removeClass('ui-state-disabled');
      moduleSearchButton.removeClass('ui-state-disabled');
    } else {
      bookSelectButton.addClass('ui-state-disabled');
      moduleSearchButton.addClass('ui-state-disabled');
    }

    bookSelectButton.bind('click', (event) => {
      this.book_selection_menu.handleBookMenuClick(event);
    });

    currentVerseListMenu.find('.new-standard-tag-button').bind('click', function() {
      tags_controller.handleNewTagButtonClick($(this), "standard");
    });

    this.assign_last_tag_button.init(tabIndex);
    this.translationComparison.initButtonEvents();
    this.verse_context_controller.initButtonEvents();

    var tabId = this.tab_controller.getSelectedTabId(tabIndex);
    if (tabId !== undefined) {
      uiHelper.configureButtonStyles('#' + tabId);
    }

    await this.navigation_pane.updateNavigation();
  }

  initGlobalShortCuts() {
    var shortCut = 'ctrl+c';
    if (platformHelper.isMac()) {
      shortCut = 'command+c';
    }

    Mousetrap.bind(shortCut, () => {
      this.copySelectedVersesToClipboard();
      return false;
    });

    if (platformHelper.isWin() || platformHelper.isLinux()) {
      Mousetrap.bind('f11', () => {
        this.toggleFullScreen();
      });
    }

    var searchShortCut = 'ctrl+f';
    if (platformHelper.isMac()) {
      searchShortCut = 'command+f';
    }

    Mousetrap.bind(searchShortCut, () => {
      var currentTab = app_controller.tab_controller.getTab();
      currentTab.tab_search.show();
      currentTab.tab_search.focus();
      return false;
    });

    Mousetrap.bind('esc', () => {
      var currentTab = app_controller.tab_controller.getTab();
      currentTab.tab_search.resetSearch();
      return false;
    });

    Mousetrap.bind('enter', () => {
      var currentTab = app_controller.tab_controller.getTab();
      // We need to notify the TabSearch component that there has been a mouse trap event.
      // This is to avoid double event processing, because the TabSearch also listens for key press events.
      currentTab.tab_search.mouseTrapEvent = true;
      currentTab.tab_search.jumpToNextOccurance();
      return false;
    });

    Mousetrap.bind('shift+enter', () => {
      var currentTab = app_controller.tab_controller.getTab();
      // We need to notify the TabSearch component that there has been a mouse trap event.
      // This is to avoid double event processing, because the TabSearch also listens for key press events.
      currentTab.tab_search.mouseTrapEvent = true;
      currentTab.tab_search.shiftKeyPressed = true;
      currentTab.tab_search.jumpToNextOccurance(false);
      return false;
    });
  }

  toggleFullScreen() {
    var platform = null;

    if (platformHelper.isElectron()) {

      platform = electronPlatform;

    } else if (platformHelper.isAndroid()) {

      platform = cordovaPlatform;

    }

    platform.toggleFullScreen();

    const fullScreenButton = document.getElementById('app-container').querySelector('.fullscreen-button');

    if (platform.isFullScreen()) {
      fullScreenButton.setAttribute('title', i18n.t('menu.exit-fullscreen'));
      fullScreenButton.firstElementChild.classList.add('fa-compress');
      fullScreenButton.firstElementChild.classList.remove('fa-expand');
    } else {
      fullScreenButton.setAttribute('title', i18n.t('menu.fullscreen'));
      fullScreenButton.firstElementChild.classList.add('fa-expand');
      fullScreenButton.firstElementChild.classList.remove('fa-compress');
    }
  }
  
  getLineBreak() {
    if (process.platform === 'win32') {
      return "\r\n";
    } else {
      return "\n";
    }
  }

  async copySelectedVersesToClipboard() {
    const { clipboard } = require('electron');
    var bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    var separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);
    
    var selectedVerseBoxes = app_controller.verse_selection.selected_verse_box_elements;
    
    var selectedText = "";
    var multipleVerses = selectedVerseBoxes.length > 1;

    for (var i = 0; i < selectedVerseBoxes.length; i++) {
      var currentVerseBox = $(selectedVerseBoxes[i]);
      var verseReferenceContent = currentVerseBox.find('.verse-reference-content').text();
      var currentVerseNr = verseReferenceContent.split(separator)[1];
      
      var currentText = currentVerseBox.find('.verse-text').clone();
      currentText.find('.sword-markup').remove();

      if (multipleVerses) {
        selectedText += currentVerseNr + " ";
      }

      selectedText += currentText.text().trim() + " ";
    }

    selectedText = selectedText.trim();
    selectedText += " " + this.getLineBreak() + this.verse_selection.getSelectedVersesLabel().text();

    clipboard.writeText(selectedText);
  }

  getCurrentVerseListTabs(tabIndex=undefined) {
    var selectedTabId = this.tab_controller.getSelectedTabId(tabIndex);
    var currentVerseListTabs = $('#' + selectedTabId);
    return currentVerseListTabs;
  }

  getCurrentVerseListMenu(tabIndex=undefined) {
    var currentVerseListTabs = this.getCurrentVerseListTabs(tabIndex);
    var currentVerseListMenu = currentVerseListTabs.find('.verse-list-menu');
    return currentVerseListMenu;
  }

  getCurrentVerseListFrame(tabIndex=undefined) {
    var currentVerseListTabs = this.getCurrentVerseListTabs(tabIndex);
    var currentVerseListFrame = currentVerseListTabs.find('.verse-list-frame');
    return currentVerseListFrame;
  }

  getCurrentReferenceVerse(tabIndex=undefined) {
    var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
    var referenceVerse = currentVerseListFrame.find('.reference-verse');
    return referenceVerse;
  }

  async getLocalizedReferenceVerse(tabIndex=undefined) {
    var currentReferenceVerse = this.getCurrentReferenceVerse(tabIndex);
    var currentReferenceVerseBox = currentReferenceVerse[0].querySelector('.verse-box');
    var localizedReferenceVerse = "";

    if (currentReferenceVerseBox != null) {
      localizedReferenceVerse = await this.verse_box_helper.getLocalizedVerseReference(currentReferenceVerseBox);
    }

    return localizedReferenceVerse;
  }

  getCurrentVerseList(tabIndex=undefined) {
    var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
    var verseList = currentVerseListFrame.find('.verse-list');
    return verseList;
  }

  getCurrentVerseListHeader(tabIndex=undefined) {
    var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
    var verseListHeader = currentVerseListFrame.find('.verse-list-header');
    return verseListHeader;
  }

  getCurrentVerseListLoadingIndicator(tabIndex=undefined) {
    var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
    var loadingIndicator = currentVerseListFrame.find('.verse-list-loading-indicator');
    return loadingIndicator;
  }

  getCurrentSearchProgressBar(tabIndex=undefined) {
    var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
    var searchProgressBar = currentVerseListFrame.find('.search-progress-bar');
    return searchProgressBar;
  }

  getCurrentSearchCancelButtonContainer(tabIndex=undefined) {
    var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
    var searchCancelButton = currentVerseListFrame.find('.cancel-module-search-button-container');
    return searchCancelButton;
  }

  showVerseListLoadingIndicator(tabIndex=undefined, message=undefined, withLoader=true) {
    var loadingIndicator = this.getCurrentVerseListLoadingIndicator(tabIndex);
    var loadingText = loadingIndicator.find('.verse-list-loading-indicator-text');
    if (message === undefined) {
      message = i18n.t("bible-browser.loading-bible-text");
    }

    loadingText.html(message);

    if (withLoader) {
      loadingIndicator.find('.loader').show();
    } else {
      loadingIndicator.find('.loader').hide();
    }

    loadingIndicator.show();
  }

  hideVerseListLoadingIndicator(tabIndex=undefined) {
    var loadingIndicator = this.getCurrentVerseListLoadingIndicator(tabIndex);
    loadingIndicator.hide();
  }

  hideSearchProgressBar(tabIndex=undefined) {
    var searchProgressBar = this.getCurrentSearchProgressBar(tabIndex);
    searchProgressBar.hide();

    var cancelSearchButtonContainer = this.getCurrentSearchCancelButtonContainer(tabIndex);
    cancelSearchButtonContainer.hide();
  }

  handleBodyClick(event) {
    if($(this).hasClass('verse-selection-menu')) {
      event.stopPropagation();
      return;
    }
    
    app_controller.hideAllMenus();
    app_controller.notes_controller.restoreCurrentlyEditedNotes();

    var currentTab = app_controller.tab_controller.getTab();
    currentTab.tab_search.blurInputField();
  }

  hideAllMenus() {
    this.book_selection_menu.hideBookMenu();
    this.tag_selection_menu.hideTagMenu();
    this.tag_assignment_menu.hideTagAssignmentMenu();
    this.module_search_controller.hideSearchMenu();
    this.optionsMenu.hideDisplayMenu();
    this.textSizeSettings.hideTextSizeMenu();
  }
  
  async handleReferenceClick(event) {
    var currentTab = this.tab_controller.getTab();
    var currentTextType = currentTab.getTextType();
    var verseBox = $(event.target).closest('.verse-box');
    var isReferenceVerse = verseBox.parent().hasClass('reference-verse');
    var isXrefMarker = event.target.classList.contains('sword-xref-marker');
    var isTag = event.target.classList.contains('tag');

    if (isReferenceVerse &&
      ((currentTextType == 'xrefs') || (currentTextType == 'tagged_verses'))
    ) {
      if (isXrefMarker) {
        await this.verse_list_popup.initCurrentXrefs(event.target);

        this.openXrefVerses(this.verse_list_popup.currentReferenceVerseBox,
                            this.verse_list_popup.currentPopupTitle,
                            this.verse_list_popup.currentXrefs);

      } else if (isTag) {

        this.verse_list_popup.initCurrentTag(event.target);

        this.openTaggedVerses(this.verse_list_popup.currentTagId,
                              this.verse_list_popup.currentTagTitle,
                              this.verse_list_popup.currentReferenceVerseBox);

      }
    } else {
      if (isXrefMarker) {
        var referenceType = "XREFS";

        if (app_controller.optionsMenu._verseListNewTabOption.isChecked) {
          this.verse_list_popup.currentReferenceType = referenceType;
          await this.verse_list_popup.initCurrentXrefs(event.target);
          this.verse_list_popup.openVerseListInNewTab();
        } else {
          await this.verse_list_popup.openVerseListPopup(event, referenceType);
        }
      } else if (isTag) {
        var referenceType = "TAGGED_VERSES";

        if (app_controller.optionsMenu._verseListNewTabOption.isChecked) {
          this.verse_list_popup.currentReferenceType = referenceType;
          this.verse_list_popup.initCurrentTag(event.target);
          this.verse_list_popup.openVerseListInNewTab();
        } else {
          await this.verse_list_popup.openVerseListPopup(event, referenceType);
        }
      }
    }
  }

  bindXrefEvents(tabIndex=undefined) {
    var verseList = this.getCurrentVerseList(tabIndex);
    var xref_markers = verseList.find('.sword-xref-marker');
    
    xref_markers.bind('mousedown', async (event) => {
      await this.handleReferenceClick(event);
    }).addClass('events-configured');
  }

  async bindEventsAfterBibleTextLoaded(tabIndex=undefined, preventDoubleBinding=false, verseList=undefined) {
    if (verseList == undefined) {
      verseList = this.getCurrentVerseList(tabIndex);
    }

    var tagBoxes = verseList.find('.tag-box');
    var tags = verseList.find('.tag');
    var xref_markers = verseList.find('.sword-xref-marker');

    if (preventDoubleBinding) {
      tagBoxes = tagBoxes.filter(":not('.tag-events-configured')");
      tags = tags.filter(":not('.tag-events-configured')");
      xref_markers = xref_markers.filter(":not('.events-configured')");
    }

    tagBoxes.bind('mousedown', tags_controller.clear_verse_selection).addClass('tag-events-configured');

    tags.bind('mousedown', async (event) => {
      await this.handleReferenceClick(event);
    }).addClass('tag-events-configured');

    xref_markers.bind('mousedown', async (event) => {
      await this.handleReferenceClick(event);
    }).addClass('events-configured');

    verseList.find('.verse-box').bind('mouseover', (e) => { this.onVerseBoxMouseOver(e); });
    this.dictionary_controller.bindAfterBibleTextLoaded(tabIndex);
    this.verse_context_controller.init_verse_expand_box(tabIndex);
  }

  getVerseListBookNumber(bibleBookLongTitle, bookHeaders=undefined) {
    var bibleBookNumber = -1;

    if (bookHeaders === undefined) {
      var currentVerseListFrame = this.getCurrentVerseListFrame();
      bookHeaders = currentVerseListFrame.find('.tag-browser-verselist-book-header');
    }

    for (var i = 0; i < bookHeaders.length; i++) {
      var currentBookHeader = $(bookHeaders[i]);
      var currentBookHeaderText = currentBookHeader.text();

      if (currentBookHeaderText.includes(bibleBookLongTitle)) {
        bibleBookNumber = i + 1;
        break;
      }
    }

    return bibleBookNumber;
  }

  onVerseBoxMouseOver(event) {
    var focussedElement = event.target;
    this.navigation_pane.updateNavigationFromVerseBox(focussedElement);
  }

  async updateReferenceVerseTranslation(oldBibleTranslationId, newBibleTranslationId) {
    var currentVerseListFrame = this.getCurrentVerseListFrame();
    var currentTab = this.tab_controller.getTab();
    var currentBibleTranslationId = currentTab.getBibleTranslationId();
    var referenceVerseContainer = currentVerseListFrame[0].querySelector('.reference-verse');
    var referenceVerseBox = new VerseBox(referenceVerseContainer.querySelector('.verse-box'));
    var bookShortTitle = referenceVerseBox.getBibleBookShortTitle();
    var mappedAbsoluteVerseNumber = await referenceVerseBox.getMappedAbsoluteVerseNumber(oldBibleTranslationId, newBibleTranslationId);

    try {
      var verses = await ipcNsi.getBookText(currentBibleTranslationId, bookShortTitle, mappedAbsoluteVerseNumber, 1);
      var verseText = referenceVerseContainer.querySelector('.verse-text');
      verseText.innerHTML = verses[0].content;
      this.sword_notes.initForContainer(referenceVerseContainer);
      this.bindEventsAfterBibleTextLoaded(undefined, false, $(referenceVerseContainer));
    } catch (e) {
      console.warn('Could not update translation for reference verse: ' + e);
    }
  }

  clearReferenceVerse(tabIndex=undefined) {
    var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
    var referenceVerseContainer = currentVerseListFrame[0].querySelector('.reference-verse');

    referenceVerseContainer.innerHTML = '';
  }

  async renderReferenceVerse(verseBox, tabIndex=undefined) {
    if (verseBox == null || verseBox.length != 1) return;

    var currentVerseListFrame = this.getCurrentVerseListFrame(tabIndex);
    var currentVerseList = this.getCurrentVerseList(tabIndex);
    var referenceVerseContainer = currentVerseListFrame[0].querySelector('.reference-verse');

    var classList = currentVerseList[0].classList;
    for (var i = 0; i < classList.length; i++) {
      var currentClass = classList[i];

      if (currentClass != "verse-list") {
        referenceVerseContainer.classList.add(currentClass);
      }
    }

    var clonedVerseBox = verseBox[0].cloneNode(true);
    var header = await this.verse_box_helper.getLocalizedVerseReference(verseBox[0]);
    var referenceVerseHeader = "<div class='reference-header'>" + header + "</div>";
    referenceVerseContainer.innerHTML = referenceVerseHeader;
    referenceVerseContainer.appendChild(clonedVerseBox);
    referenceVerseContainer.innerHTML += "<br/><hr/>";

    var currentTab = this.tab_controller.getTab(tabIndex);
    var textType = currentTab.getTextType();
    var textTypeHeader = "";

    if (textType == 'xrefs') {
      textTypeHeader = `<span i18n="general.module-xrefs">${i18n.t('general.module-xrefs')}</span>`;
    } else if (textType == 'tagged_verses') {
      textTypeHeader = `<span i18n="tags.verses-tagged-with">${i18n.t('tags.verses-tagged-with')}</span> <i>${currentTab.getTagTitleList()}</i>`;
    }

    referenceVerseContainer.innerHTML += "<div class='reference-verse-list-header'><h2>" + textTypeHeader + "</h2></div>";
    this.bindEventsAfterBibleTextLoaded(undefined, false, $(referenceVerseContainer));
  }

  async openXrefVerses(referenceVerseBox, xrefTitle, xrefs) {
    var xrefVerseReferenceId = this.verse_box_helper.getVerseReferenceId(referenceVerseBox);
    var currentTab = this.tab_controller.getTab();

    currentTab.setTextType('xrefs');
    currentTab.setXrefs(xrefs);
    currentTab.setReferenceVerseElementId(xrefVerseReferenceId);

    app_controller.tab_controller.setCurrentTabXrefTitle(xrefTitle);

    // Set book, search term and tag id list to null, since we just switched to xrefs
    currentTab.setBook(null, null, null);
    currentTab.setSearchTerm(null);
    currentTab.setTagIdList("");

    await this.renderReferenceVerse(referenceVerseBox);
    await this.getXrefVerses(xrefs);
  }

  showReferenceContainer() {
    if (this.tab_controller.getTab().hasReferenceVerse()) {
      var currentVerseListFrame = this.getCurrentVerseListFrame();
      var referenceVerseContainer = currentVerseListFrame[0].querySelector('.reference-verse');
      $(referenceVerseContainer).show();
    }
  }

  async openTaggedVerses(tagIdList, tagTitleList, referenceVerseBox=undefined) {
    var currentTab = this.tab_controller.getTab();
    currentTab.setTextType('tagged_verses');
    currentTab.setTagIdList(tagIdList);
    var localizedVerseReference = null;

    if (referenceVerseBox != null) {
      localizedVerseReference = await this.verse_box_helper.getLocalizedVerseReference(referenceVerseBox[0]);
      var verseReferenceId = this.verse_box_helper.getVerseReferenceId(referenceVerseBox);
      currentTab.setReferenceVerseElementId(verseReferenceId);
    } else {
      currentTab.setReferenceVerseElementId(null);
    }

    app_controller.tab_controller.setCurrentTagTitleList(tagTitleList, localizedVerseReference);

    // Set book, search term and xrefs to null, since we just switched to a tag
    currentTab.setBook(null, null, null);
    currentTab.setSearchTerm(null);
    currentTab.setXrefs(null);
    
    this.module_search_controller.resetSearch();
    
    if (tagIdList != "") {
      setTimeout(() => {
        this.tag_selection_menu.hideTagMenu();
      }, 700);
    }

    if (referenceVerseBox != undefined) {
      await this.renderReferenceVerse(referenceVerseBox);
    } else {
      this.clearReferenceVerse();
    }

    await this.getTaggedVerses();
  }

  async getXrefVerses(xrefs) {
    var currentTabId = this.tab_controller.getSelectedTabId();
    var currentVerseList = this.getCurrentVerseList();

    var currentTab = this.tab_controller.getTab();
    currentTab.tab_search.setVerseList(currentVerseList);

    if (xrefs.length > 0) {
      // Only reset the view if the current text type is not xrefs.
      // So, in case of xrefs we just "refresh" the view.
      var resetView = this.tab_controller.getTab().getTextType() != 'xrefs';

      await this.text_controller.prepareForNewText(resetView, false);
      this.text_controller.requestTextUpdate(currentTabId, null, null, null, null, null, xrefs);
    }
  }

  async getTaggedVerses() {
    var currentTab = this.tab_controller.getTab();
    var currentTagIdList = currentTab.getTagIdList();
    var currentTabId = this.tab_controller.getSelectedTabId();
    var currentVerseList = this.getCurrentVerseList();

    currentTab.tab_search.setVerseList(currentVerseList);

    if (currentTagIdList != "") {
      // Only reset the view if the current text type is not tagged_verses.
      // So, in case of tagged_verses we just "refresh" the view.
      // FIXME: This leads to weird visual effects when switching from bible text
      var resetView = this.tab_controller.getTab().getTextType() != 'tagged_verses';

      await this.text_controller.prepareForNewText(resetView, false);
      this.text_controller.requestTextUpdate(currentTabId,
                                         null,
                                         currentTagIdList,
                                         null,
                                         null,
                                         null,
                                         null);
      await waitUntilIdle();
      tags_controller.updateTagList();
    }
  }

  resetVerseListView() {
    var textType = this.tab_controller.getTab().getTextType();
    if (textType != 'xrefs' && textType != 'tagged_verses') {
      var currentReferenceVerse = this.getCurrentVerseListFrame().find('.reference-verse');
      currentReferenceVerse[0].innerHTML = "";
    }

    var currentVerseList = this.getCurrentVerseList()[0];
    if (currentVerseList != undefined) {
      currentVerseList.innerHTML = "";
    }

    this.navigation_pane.resetNavigationPane();
    this.taggedVerseExport.disableTaggedVersesExportButton();
  }

  async initApplicationForVerseList(tabIndex=undefined) {
    var selectedTabIndex = this.tab_controller.getSelectedTabIndex();
    var tabIsCurrentTab = false;

    if (tabIndex == selectedTabIndex) {
      tabIsCurrentTab = true;
    }

    if (tabIndex === undefined) {
      var tabIndex = selectedTabIndex;
    }

    if (tabIsCurrentTab) {
      this.tag_statistics.toggleBookTagStatisticsButton(tabIndex);
    }

    this.verse_selection.init(tabIndex);
    this.optionsMenu.showOrHideHeaderNavigationBasedOnOption(tabIndex);
    await this.navigation_pane.updateNavigation(tabIndex);
    this.notes_controller.initForTab(tabIndex);
    this.sword_notes.initForTab(tabIndex);
    await this.translation_controller.toggleTranslationsBasedOnCurrentBook(tabIndex);

    this.bindEventsAfterBibleTextLoaded(tabIndex);
  }

  async updateUiAfterBibleTranslationAvailable(translationCode) {
    var currentBibleTranslationId = this.tab_controller.getTab().getBibleTranslationId();
    if (currentBibleTranslationId == "" || 
        currentBibleTranslationId == null) { // Update UI after a Bible translation becomes available

      this.tab_controller.setCurrentBibleTranslationId(translationCode);
      await this.book_selection_menu.updateAvailableBooks();
      this.info_popup.enableCurrentAppInfoButton();
    }
  }

  openModuleSettingsAssistant(moduleType) {
    this.optionsMenu.hideDisplayMenu();
    this.install_module_assistant.openAssistant(moduleType);
  }

  getChapterFromReference(reference, separator=reference_separator) {
    var chapter = Number(reference.split(separator)[0]);
    return chapter;
  }

  getVerseFromReference(reference, separator=reference_separator) {
    var verse = Number(reference.split(separator)[1]);
    return verse;
  }

  getBibleBookStatsFromVerseList(tabIndex) {
    var bibleBookStats = {};    
    var currentVerseList = this.getCurrentVerseList(tabIndex)[0];
    var verseBoxList = currentVerseList.querySelectorAll('.verse-box');

    for (var i = 0; i < verseBoxList.length; i++) {
      var currentVerseBox = verseBoxList[i];
      var bibleBookShortTitle = new VerseBox(currentVerseBox).getBibleBookShortTitle();

      if (bibleBookStats[bibleBookShortTitle] === undefined) {
        bibleBookStats[bibleBookShortTitle] = 1;
      } else {
        bibleBookStats[bibleBookShortTitle] += 1;
      }
    }

    return bibleBookStats;
  }

/*
  jumpToReference(reference, highlight) {
    var currentTabId = this.tab_controller.getSelectedTabId();
    var chapter = this.getChapterFromReference(reference);
    var verse = this.getVerseFromReference(reference);

    var uniqueReference = '#' + currentTabId + ' ' + chapter + ':' + verse;

    if (chapter == 1 && verse < 5) {
      var currentVerseListComposite = this.getCurrentVerseListComposite();
      currentVerseListComposite[0].scrollTop = 0;
    } else {
      window.location = uniqueReference;
    }

    this.navigation_pane.highlightNavElement(chapter);
  }
*/

}

module.exports = AppController;