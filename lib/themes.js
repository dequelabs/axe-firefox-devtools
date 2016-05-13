/* ! aXe-firefox-devtools
 * Copyright (c) 2015 Deque Systems, Inc.
 *
 * Your use of this Source Code Form is subject to the terms of the Mozilla
 * Public License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This entire copyright notice must appear in every copy of this file you
 * distribute or in any file that contains substantial portions of this source
 * code.
 */

"use strict";

const { onPrefChange, getTheme } = require("./utils");
var { Cu } = require("chrome");
const StylesheetUtils = require("sdk/stylesheet/utils");

/* global Services */
Cu.import("resource://gre/modules/Services.jsm");

function setTheme(win, id) {
  let theme = getTheme(id);
  theme.stylesheets.forEach(function (sheet) {
    StylesheetUtils.loadSheet(win, sheet, "author");
  });

  win.document.documentElement.className = theme.classList.join(" ");
}

function removeTheme(win, id) {
  let theme = getTheme(id);
  theme.stylesheets.forEach(function (sheet) {
    StylesheetUtils.removeSheet(win, sheet, "author");
  });

  win.document.documentElement.className = "";
}

exports.initialize = function (win) {
  let currTheme = Services.prefs.getCharPref("devtools.theme");
  setTheme(win, currTheme);
  onPrefChange(win, function (e, data) {
    if (data.pref === "devtools.theme") {
      removeTheme(win, data.oldValue);
      setTheme(win, data.newValue);
    }
  });
};
