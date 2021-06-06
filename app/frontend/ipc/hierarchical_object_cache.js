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

/**
 * This class implements a hierarchical cache that establishes multiple levels of a cached hierarchy
 * where the number of hierarchy levels depends on the number of arguments provided.
 */
class HierarchicalObjectCache {
  constructor() {
    this._cache = {};
    this._hierarchyEstablished = false;
  }

  async fetch(fetchFunction, ...args) {
    this._establishHierarchy(...args);
    
    var value = null;
    var cache = this._getCache(...args);
    var key = arguments[args.length];

    if (this._valueMissing(...args)) {
      value = await fetchFunction();
      cache[key] = value;
    } else {
      value = cache[key];
    }

    return value;
  }

  _establishHierarchy(...args) {
    var levelsNeeded = arguments.length - 1;
    if (levelsNeeded < 1) {
      return;
    }

    var cache = this._cache;

    for (let i = 0; i < levelsNeeded; i++) {
      if (cache[arguments[i]] === undefined) {
        cache[arguments[i]] = {};
      }

      cache = cache[arguments[i]];
    }
  }

  _getCache(...args) {
    var cache = this._cache;

    if (args.length > 1) {
      for (let i = 0; i < args.length - 1; i++) {
        cache = cache[arguments[i]];
      }
    }

    return cache;
  }

  _valueMissing(...args) {
    var cache = this._getCache(...args);
    var value = arguments[args.length - 1];
    return !(value in cache);
  }
}

module.exports = HierarchicalObjectCache;