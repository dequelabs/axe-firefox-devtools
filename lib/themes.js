
const { getThemes, getTheme } = require('./utils');
var { Cu } = require('chrome');
const StylesheetUtils = require("sdk/stylesheet/utils");

/*global Services */
Cu.import('resource://gre/modules/Services.jsm');

//TODO listen to pref change

function setTheme(win, id) {
  var theme = getTheme(id);
  console.log(theme);
  theme.stylesheets.forEach(function (sheet) {
    StylesheetUtils.loadSheet(win, sheet, 'author');
  });

  win.document.documentElement.className = theme.classList.join(' ');
}

exports.initialize = function (win) {
  let currTheme = Services.prefs.getCharPref("devtools.theme");
  console.log('getting theme', currTheme);
  setTheme(win, currTheme);
};

exports.destroy = function (win) {

};

/*
unregisterTheme
      let data = {
        pref: "devtools.theme",
        newValue: "light",
        oldValue: currTheme
      };

      gDevTools.emit("pref-changed", data);

      this.emit("theme-unregistered", theme);
      gDevTools.emit("pref-changed", data);
 */
