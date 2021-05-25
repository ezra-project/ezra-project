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
const i18nHelper = require('../helpers/i18n_helper.js');

/**
 * The NavigationPane class implements the update and event handling of the
 * navigation pane that is shown left of the bible text pane.
 * 
 * @category Component
 */
class NavigationPane {
  constructor() {
    this.currentNavigationPane = null;
    this.verse_box_helper = new VerseBoxHelper();
    this.verseListFrameNoChapterNavCss = 'no-chapter-nav';
  }

  getCurrentNavigationPane(tabIndex=undefined) {
    var currentVerseListTabs = app_controller.getCurrentVerseListTabs(tabIndex);
    var navigationPane = currentVerseListTabs.find('.navigation-pane');
    return navigationPane;
  };

  show(tabIndex) {
    var verseListFrame = app_controller.getCurrentVerseListFrame(tabIndex);
    verseListFrame.removeClass(this.verseListFrameNoChapterNavCss);
    this.getCurrentNavigationPane(tabIndex).show();
  }

  hide(tabIndex) {
    var verseListFrame = app_controller.getCurrentVerseListFrame(tabIndex);
    verseListFrame.addClass(this.verseListFrameNoChapterNavCss);
    this.getCurrentNavigationPane(tabIndex).hide();
  }

  async initNavigationPaneForCurrentView(tabIndex=undefined) {
    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    var currentBook = currentTab.getBook();
    var currentTranslationId = currentTab.getBibleTranslationId();
    var currentTagTitleList = currentTab.getTagTitleList();
    var currentXrefs = currentTab.getXrefs();
    var currentTextType = currentTab.getTextType();
    var navigationPane = this.getCurrentNavigationPane(tabIndex);
    var headerNavOption = app_controller.optionsMenu._headerNavOption;

    if (currentTextType == 'book' && currentBook != null) { // Book text mode

      navigationPane.removeClass('navigation-pane-books');

      const swordModuleHelper = require('../helpers/sword_module_helper.js');
      var hasHeaders = await swordModuleHelper.moduleHasHeaders(currentTranslationId);

      if (headerNavOption.isChecked && hasHeaders) {
        
        navigationPane.removeClass('navigation-pane-chapters');
        navigationPane.addClass('navigation-pane-headers');
      } else {
        navigationPane.removeClass('navigation-pane-headers');
        navigationPane.addClass('navigation-pane-chapters');
      }

    } else if (currentTextType == 'tagged_verses' && currentTagTitleList != null ||
               currentTextType == 'xrefs' && currentXrefs != null) { // Verse list mode

      navigationPane.removeClass('navigation-pane-chapters');
      navigationPane.removeClass('navigation-pane-headers');
      navigationPane.addClass('navigation-pane-books');

    } else if (currentTextType == 'search_results') {

      navigationPane.removeClass('navigation-pane-chapters');
      navigationPane.removeClass('navigation-pane-headers');
      navigationPane.addClass('navigation-pane-books');
    }
    
    navigationPane.bind('mouseover', app_controller.verse_context_controller.hide_verse_expand_box);
  }

  enableHeaderNavigation(tabIndex=undefined) {
    var navigationPane = this.getCurrentNavigationPane(tabIndex);
    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    var currentTranslationId = currentTab.getBibleTranslationId();
    const swordModuleHelper = require('../helpers/sword_module_helper.js');
    
    if (swordModuleHelper.moduleHasHeaders(currentTranslationId)) {

      navigationPane.addClass('navigation-pane-headers');
    }
  }

  disableHeaderNavigation() {
    var navigationPane = this.getCurrentNavigationPane();
    navigationPane.removeClass('navigation-pane-headers');
  }

  highlightSectionHeaderByTitle(title) {
    this.currentNavigationPane = this.getCurrentNavigationPane();

    var allHeaderLinks = this.currentNavigationPane[0].querySelectorAll('.header-link');
    for (var i = 0; i < allHeaderLinks.length; i++) {
      var currentTitle = allHeaderLinks[i].innerText;

      if (currentTitle == title) {
        this.highlightNavElement(i + 1, false, "HEADER");
        break;
      }
    }
  }

  scrollNavElementIntoView(navElementIndex, allNavElements) {
    var scrollToNavElementIndex = navElementIndex;
    if (navElementIndex < allNavElements.length - 3) {
      scrollToNavElementIndex += 3;
    } else {
      scrollToNavElementIndex += (allNavElements.length - 1 - navElementIndex);
    }
    
    var scrollToNavElement = allNavElements[scrollToNavElementIndex];
    scrollToNavElement.scrollIntoView(false);
  }

  highlightNavElement(navElementNumber, onClick=false, navElementType='CHAPTER') {
    this.currentNavigationPane = this.getCurrentNavigationPane();
    var navElementTypeClass = null;

    if (navElementType == 'CHAPTER') {
      navElementTypeClass = '.chapter-link';      
    } else if (navElementType == 'HEADER') {
      navElementTypeClass = '.header-link';
    } else {
      navElementTypeClass = '.navigation-link';
    }

    this.allNavElementLinks = this.currentNavigationPane.find(navElementTypeClass);

    var navElementIndex = navElementNumber - 1;
    var lastHighlightedNavElementIndex = app_controller.tab_controller.getLastHighlightedNavElementIndex(navElementType=='HEADER');

    if ((this.allNavElementLinks.length - 1) >= navElementIndex &&
        (this.allNavElementLinks.length - 1) >= lastHighlightedNavElementIndex) {

      var lastHighlightedNavElementLink = $(this.allNavElementLinks[lastHighlightedNavElementIndex]);
      var highlightedNavElementLink = $(this.allNavElementLinks[navElementIndex]);
    
      lastHighlightedNavElementLink.removeClass('hl-nav-element');
      highlightedNavElementLink.addClass('hl-nav-element');

      if (!onClick) {
        this.scrollNavElementIntoView(navElementIndex, this.allNavElementLinks);
      }
    }

    app_controller.tab_controller.setLastHighlightedNavElementIndex(navElementIndex, navElementType=='HEADER');
  }

  highlightSearchResult(navElementNumber, navElementType='BOOK') {
    var navElementTypeClass = 'chapter-link';
    if (navElementType == 'OTHER') {
      navElementTypeClass = 'navigation-link';
    }

    if (this.currentNavigationPane == null) {
      this.currentNavigationPane = this.getCurrentNavigationPane();
    }

    // This may be slow, because it's executed every time we search!
    this.allNavElementLinks = this.currentNavigationPane.find('.' + navElementTypeClass);

    var navElementIndex = navElementNumber - 1;
    var highlightedLink = $(this.allNavElementLinks[navElementIndex]);
    highlightedLink.addClass('hl-search-result');
  }

  clearHighlightedSearchResults() {
    var currentNavigationPane = this.getCurrentNavigationPane();
    var allHighlightedLinks = currentNavigationPane.find('.hl-search-result');

    for (var i=0; i < allHighlightedLinks.length; i++) {
      var currentLink = $(allHighlightedLinks[i]);
      currentLink.removeClass('hl-search-result');
    }
  }

  async updateChapterNavigation(tabIndex) {
    var navigationPane = this.getCurrentNavigationPane(tabIndex);
    var currentTab = app_controller.tab_controller.getTab(tabIndex);

    if (currentTab == null) {
      return;
    }

    var currentTranslation = currentTab.getBibleTranslationId();
    var currentBook = currentTab.getBook();

    if (currentTranslation == null || currentBook == null) {
      return;
    }

    var chapterCount = await ipcNsi.getBookChapterCount(currentTranslation, currentBook);
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);

    var query = '.sword-section-title:not([subtype="x-Chapter"]):not([type="chapter"]):not([type="psalm"]):not([type="scope"]):not([type="acrostic"])';
    var sectionTitleElements = currentVerseList.find(query);

    var navigationHeader = document.createElement('div');
    navigationHeader.classList.add('nav-pane-header');
    navigationHeader.textContent = i18n.t('bible-browser.chapter-header');
    navigationHeader.setAttribute('i18n', 'bible-browser.chapter-header');
    navigationPane.append(navigationHeader);

    var cachedVerseListTabId = this.getCachedVerseListTabId(tabIndex);
    var sectionHeaderNumber = 1;

    for (var i = 1; i <= chapterCount; i++) {
      var href = `javascript:app_controller.navigation_pane.goToChapter(${i})`;
      var chapterLinkHtml = `<a href='${href}' class='navigation-link chapter-link'>${i}</a>`;
      navigationPane.append(chapterLinkHtml);

      if (cachedVerseListTabId != null) {
        sectionHeaderNumber = this.addHeaderNavLinksForChapter(cachedVerseListTabId, navigationPane, sectionTitleElements, i, sectionHeaderNumber);
      }
    }
  }

  getUnixSectionHeaderId(tabId, chapter, sectionHeader) {
    var unixSectionHeader = sectionHeader.trim().toLowerCase();
    unixSectionHeader = unixSectionHeader.replace(/ /g, "-").replace(/['`().,;:!?]/g, "");
    var unixSectionHeaderId = tabId + ' ' + chapter + ' ' + 'section-header-' + unixSectionHeader;
    return unixSectionHeaderId;
  }

  addHeaderNavLinksForChapter(cachedVerseListTabId, navigationPane, sectionTitleElements, chapter, sectionHeaderNumber=1) {
    var chapterSectionHeaderIndex = 0;

    for (var i = 0; i < sectionTitleElements.length; i++) {
      var sectionTitleElement = sectionTitleElements[i];
      var currentChapter = null;
      
      try {
        currentChapter = parseInt(sectionTitleElement.getAttribute('chapter'));
      } catch (exc) {}

      if (currentChapter != null && currentChapter == chapter) {
        var sectionHeader = sectionTitleElement.textContent;
        var chapter = sectionTitleElement.getAttribute('chapter');
        var sectionHeaderId = this.getUnixSectionHeaderId(cachedVerseListTabId, chapter, sectionHeader);

        var currentHeaderLink = document.createElement('a');
        currentHeaderLink.setAttribute('class', 'navigation-link header-link');
        var sectionHeaderLink = `javascript:app_controller.navigation_pane.goToSection('${sectionHeaderId}', ${sectionHeaderNumber}, ${chapter})`;
        currentHeaderLink.setAttribute('href', sectionHeaderLink);
        $(currentHeaderLink).html(sectionHeader);
        if (chapterSectionHeaderIndex == 0) {
          $(currentHeaderLink).addClass('header-link-first');
        }

        navigationPane.append(currentHeaderLink);
        chapterSectionHeaderIndex++;
        sectionHeaderNumber++;
      }
    };

    return sectionHeaderNumber;
  }

  updateBookNavigation(tabIndex) {
    var navigationPane = this.getCurrentNavigationPane(tabIndex);
    var currentVerseListFrame = app_controller.getCurrentVerseListFrame(tabIndex);
    var bookHeaders = currentVerseListFrame.find('.tag-browser-verselist-book-header');
    var navigationPaneHtml = "";

    for (var i = 0; i < bookHeaders.length; i++) {
      var bookNumber = i + 1;
      var currentBookHeader = $(bookHeaders[i]);
      var currentBookHeaderText = currentBookHeader.text();
      var currentBook = currentBookHeader.attr("bookname");

      var href = `javascript:app_controller.navigation_pane.goToBook('${currentBook}','${bookNumber}')`;
      var link = `<a class='navigation-link' href="${href}">${currentBookHeaderText}</a>`;
      navigationPaneHtml += link;
    }

    navigationPane[0].innerHTML = navigationPaneHtml;
  }

  resetNavigationPane(tabIndex) {
    this.currentNavigationPane = this.getCurrentNavigationPane(tabIndex);
    this.currentNavigationPane[0].innerHTML = "";

    app_controller.optionsMenu.showOrHideBookChapterNavigationBasedOnOption(tabIndex);
  }

  async updateNavigation(tabIndex=undefined) {
    if (tabIndex === undefined) {
      var tabIndex = app_controller.tab_controller.getSelectedTabIndex();
    }

    this.resetNavigationPane(tabIndex);

    var currentTab = app_controller.tab_controller.getTab(tabIndex);
    var currentTagIdList = null;
    var currentXrefs = null;
    var currentTextType = null;

    if (currentTab != null) {
      currentTagIdList = currentTab.getTagIdList();
      currentXrefs = currentTab.getXrefs();
      currentTextType = currentTab.getTextType();
    }

    if (currentTextType == 'book') { // Update navigation based on book chapters

      await this.updateChapterNavigation(tabIndex);

    } else if (currentTextType == 'tagged_verses' && currentTagIdList != null) { // Update navigation based on tagged verses books

      this.updateBookNavigation(tabIndex);

    } else if (currentTextType == 'search_results') {

      this.updateBookNavigation(tabIndex);

    } else if (currentTextType == 'xrefs' && currentXrefs != null) {

      this.updateBookNavigation(tabIndex);
    }

    this.allNavElementLinks = this.currentNavigationPane.find('.navigation-link');
  }

  getCachedVerseListTabId(tabIndex=undefined) {
    var currentVerseList = app_controller.getCurrentVerseList(tabIndex);
    var cachedVerseListTabId = null;

    try {
      var firstLink = currentVerseList[0].querySelector('a.nav');
      var cachedVerseListTabId = null;
      
      if (firstLink !== null) {
        cachedVerseListTabId = firstLink.getAttribute('name').split(' ')[0];
      }
    } catch (e) {
      console.log("NavigationPane: Could not get cached verse list tab id!");s
    }

    return cachedVerseListTabId;
  }

  goToChapter(chapter) {
    this.highlightNavElement(chapter, true);

    var reference = '#top';

    if (chapter > 1 || app_controller.optionsMenu._bookIntroOption.isChecked) {
      var cachedVerseListTabId = this.getCachedVerseListTabId();
      reference = '#' + cachedVerseListTabId + ' ' + chapter;
      window.location = reference;
    } else {
      var currentVerseListFrame = app_controller.getCurrentVerseListFrame();
      currentVerseListFrame[0].scrollTop = 0;
    }
  }

  goToSection(sectionHeaderId, sectionHeaderNumber, chapter) {
    this.highlightNavElement(chapter, true);
    this.highlightNavElement(sectionHeaderNumber, true, "HEADER");

    var reference = '#' + sectionHeaderId;
    window.location = reference;
  }

  goToBook(book, bookNr) {
    this.highlightNavElement(bookNr, true, "OTHER");

    var cachedVerseListTabId = this.getCachedVerseListTabId();
    var reference = '#' + cachedVerseListTabId + ' ' + book;
    window.location = reference;
  }

  async updateNavigationFromVerseBox(focussedElement, verseBox=undefined) {
    if (verseBox == undefined) {
      verseBox = focussedElement.closest('.verse-box');
    }

    var bibleTranslationId = app_controller.tab_controller.getTab().getBibleTranslationId();
    var separator = await i18nHelper.getReferenceSeparator(bibleTranslationId);

    var currentTab = app_controller.tab_controller.getTab();
    var currentBook = currentTab.getBook();
    var currentTextType = currentTab.getTextType();

    if (currentTextType == 'book' && currentBook != null) {

      var verseReferenceContent = verseBox.querySelector('.verse-reference-content').innerText;
      var currentChapter = app_controller.getChapterFromReference(verseReferenceContent, separator);
      this.highlightNavElement(currentChapter);

      var sectionTitle = "";
      if (focussedElement.classList.contains('sword-section-title')) {
        sectionTitle = focussedElement.innerText;
      } else {
        sectionTitle = this.verse_box_helper.getSectionTitleFromVerseBox(verseBox);
      }

      if (sectionTitle != null) {
        this.highlightSectionHeaderByTitle(sectionTitle);
      }

    } else if (currentTab.isVerseList()) {

      var bibleBookShortTitle = new VerseBox(verseBox).getBibleBookShortTitle();
      var currentBookName = await ipcDb.getBookTitleTranslation(bibleBookShortTitle);
      
      var bibleBookNumber = app_controller.getVerseListBookNumber(currentBookName);
      if (bibleBookNumber != -1) {
        this.highlightNavElement(bibleBookNumber, false, "OTHER");
      }
    }
  }
}

module.exports = NavigationPane;

