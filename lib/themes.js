
const { onPrefChange, getTheme } = require('./utils');
var { Cu } = require('chrome');
const StylesheetUtils = require("sdk/stylesheet/utils");

/*global Services */
Cu.import('resource://gre/modules/Services.jsm');

//TODO listen to pref change

function setTheme(win, id) {
  var theme = getTheme(id);
  theme.stylesheets.forEach(function (sheet) {
    StylesheetUtils.loadSheet(win, sheet, 'author');
  });

  win.document.documentElement.className = theme.classList.join(' ');
}

function removeTheme(win, id) {
  var theme = getTheme(id);
  theme.stylesheets.forEach(function (sheet) {
    StylesheetUtils.removeSheet(win, sheet, 'author');
  });

  win.document.documentElement.className = '';

}

exports.initialize = function (win) {
  let currTheme = Services.prefs.getCharPref("devtools.theme");
  setTheme(win, currTheme);
  onPrefChange(win, function (e, data) {
    if (data.pref === 'devtools.theme') {
      removeTheme(win, data.oldValue);
      setTheme(win, data.newValue);
    }
  });
};
