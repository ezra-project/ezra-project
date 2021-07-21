# Ezra Bible App Technology

Ezra Bible App is a web-based Bible study app for desktop and tablet computers. On the desktop the application is based on [Electron](https://electronjs.org/). On Android tablets the application is based on [Cordova](https://cordova.apache.org/). It is programmed in JavaScript, uses [SQLite](https://www.sqlite.org) as its database and HTML with [jQuery UI](https://jqueryui.com/) for its frontend. Bible translation modules are managed using [node-sword-interface](https://github.com/ezra-project/node-sword-interface).

Furthermore, the following components are used (among others):
* [Sequelize](http://docs.sequelizejs.com) [ORM](https://en.wikipedia.org/wiki/Object-relational_mapping) for handling database access
* [Umzug](https://github.com/sequelize/umzug) Migration library for handling database schema upgrades
* [Pug](https://pugjs.org) template engine for rendering verse list
* [jQuery Steps](http://www.jquery-steps.com) for the bible translation assistant
* [CodeMirror](https://github.com/codemirror/CodeMirror) in-browser editor for note editing
* [Marked](https://github.com/markedjs/marked) Markdown parser/renderer for rendering markdown-based verse notes
* [Chart.js](https://www.chartjs.org) library for verse statistics charts (used for visualizing search results)
* [ISO-639-3](https://github.com/wooorm/iso-639-3) for turning bible translation language codes into readable language names
* [officegen](https://github.com/Ziv-Barber/officegen) for exporting tagged verse lists to Word documents
* [SpinKit](https://github.com/tobiasahlin/SpinKit) for CSS-animated loading spinners
* [I18next](https://www.i18next.com/) for internationalization
* [browserify](http://browserify.org/) for minifying the JavaScript code
* [fontawesome](https://fontawesome.com/) for the icon set
* [fuse.js](https://fusejs.io) for fuzzy (approximate) search algorithm

To test Ezra Bible App, the following components are used:
* [Cucumber.js](https://github.com/cucumber/cucumber-js)
* [Chai](https://www.chaijs.com/)
* [Spectron](https://www.electronjs.org/spectron)

To package Ezra Bible App, the following components are used:
* [electron-packager](https://github.com/electron/electron-packager)
* [electron-installer-windows](https://github.com/electron-userland/electron-installer-windows)
* [electron-installer-debian](https://github.com/electron-userland/electron-installer-debian)
* [electron-installer-redhat](https://github.com/electron-userland/electron-installer-redhat)
* [electron-installer-dmg](https://github.com/electron-userland/electron-installer-dmg)
* [electron-osx-sign](https://github.com/electron/electron-osx-sign)

Code metrics of Ezra Bible App are available [here][metrics].

[metrics]: https://github.com/ezra-bible-app/ezra-bible-app/blob/master/LOC_METRICS.md
