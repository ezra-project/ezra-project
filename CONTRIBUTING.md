# Contributing to Ezra Bible App

:+1::tada: First off, thanks for taking the time to contribute! :tada::+1:

The following is a set of guidelines for contributing to Ezra Bible App. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Reporting Bugs

* When reporting bugs, please assign the bug 🐞 label.
* Include information about your operating system/platform.
* Include information about the sequence of steps to reproduce the issue.
* Include a screenshot if that helps to describe the issue.

## Suggesting Enhancements and New Features

`TODO`

## Pull Requests

If you want to make direct contributions to Ezra Bible App, please create a pull request based on your work. Once the pull request has been created the process is as follows:

1) A review takes place. The goal is to ensure good quality and style. You may need to rework your contribution based on review comments.
2) Once the pull request is considered good enough by the Ezra Bible App maintainer it will be merged to the main branch.

## New Translations

If you want to help with a new translation, these are the steps:

1) Clone the repository. If you are not a project member yet you may need to fork first and then clone your fork.

2) Take the English locale files as a base (`/locales/en`) and copy them to a new folder underneith `locales`, where the folder name shall match the two-letter ISO 639-1 language code of the new translation. Have a look at [this Wikipedia page](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) to find the language code for the new language.

3) The locale files are json files. You will have to translate the value of each `json key`. Consider the following extract. You will have to translate all the text on the right side of the colon. So for example within `"new tag": "New tag"` you will replace the text `"New tag"` with the respective translation.

```javascript
    "tags-toolbar": {
      "new-tag": "New tag",
      "tag-statistics": "Tag statistics",
      "assign-last-tag": "Assign last tag",
      "configure-translations": "Configure translations",
      "configure-dicts": "Configure dictionaries",
      "show-parallel-translations": "Compare translations",
      "compare": "Compare",
      "context": "Context"
    }
```
4) Once the translation is complete, it needs to be added to the white list in `/app/frontend/helpers/i18n_helper.js`. Here is an extract from that file:
```
const i18nextOptions = {
  debug: false,
  interpolation: {
    escapeValue: false
  },
  saveMissing: false,
  fallbackLng: 'en',
  whitelist: ['de', 'en', 'nl', 'fr', 'es', 'sk'],  <== Add the language
  react: {
    wait: false
  }
};
```

5) You can test the new translation by installing all dependencies (see BUILD.md) and starting the app using `npm start`.

6) Submit a pull request once you have a working draft.