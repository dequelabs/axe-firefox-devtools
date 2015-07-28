/*global XPCOMUtils, gDevTools, gDevToolsBrowser */
var { Cu } = require('chrome');
const { Menuitem } = require('menuitem');
const { getMostRecentBrowserWindow } = require('sdk/window/utils');

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'gDevTools', 'resource:///modules/devtools/gDevTools.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'gDevToolsBrowser', 'resource:///modules/devtools/gDevTools.jsm');

exports.getThemes = function () {
  return gDevTools.getThemeDefinitionArray();
};

exports.getTheme = function (id) {
  return gDevTools.getThemeDefinition(id);
};

exports.onPrefChange = function (win, fn) {
  gDevTools.on('pref-changed', fn);
  win.addEventListener('unload', function() {
    gDevTools.off('pref-changed', fn);
  });
};

exports.registerDevTool = function (toolDef) {
  gDevTools.registerTool(toolDef);
  if (toolDef._menuitem) {
    //jshint -W064
    Menuitem(toolDef._menuitem);
  }
};

exports.unregisterDevTool = function (toolDef) {
  gDevTools.unregisterTool(toolDef);
};

exports.openDevTool = function(toolId) {
  let activeBrowserWindow = getMostRecentBrowserWindow();
  let { gBrowser } = activeBrowserWindow;
  return gDevToolsBrowser.selectToolCommand(gBrowser, toolId);
};


exports.inspectDOMElement = function (toolbox, selectorArray) {
  return gDevTools.showToolbox(toolbox._target, 'inspector').then(toolbox => {
    let { walker } = toolbox.getCurrentPanel();
    walker.querySelector(walker.rootNode, selectorArray[0])
      .then(function (result) {
        var depth = 1, contentDocument;
        while(result.nodeName === 'IFRAME' && selectorArray.length > depth) {
          contentDocument = result.rawNode().contentDocument;
          result = walker.frontForRawNode(contentDocument.querySelector(selectorArray[depth]));
          depth += 1;
        }
        toolbox.selection.setNodeFront(result);
      });
  });
};
exports.highlightDOMElement = function (toolbox, selectorArray) {
  toolbox.loadTool('inspector').then(function () {
    let { walker } = toolbox.getPanel('inspector');
    walker.querySelector(walker.rootNode, selectorArray[0])
      .then(function (result) {
        var depth = 1, contentDocument;
        while(result.nodeName === 'IFRAME' && selectorArray.length > depth) {
          contentDocument = result.rawNode().contentDocument;
          result = walker.frontForRawNode(contentDocument.querySelector(selectorArray[depth]));
          depth += 1;
        }
        toolbox.highlighterUtils.highlightNodeFront(result);
      });
  });
};
