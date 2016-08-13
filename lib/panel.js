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

var Promise = require("sdk/core/promise.js");
const self = require("sdk/self");
const { Class } = require("sdk/core/heritage");
const tabs = require("./tabs");
const { openDevTool, inspectDOMElement, highlightDOMElement } = require("./utils");
const themes = require("./themes");

const AxePanel = new Class({
  initialize: function (win, toolbox) {
    this.win = win;
    this.toolbox = toolbox;
    this.targetTabId = tabs.activeTab.id;
    this._onDevtoolPanelMessage = this._devtoolPanelMessage.bind(this);
    this._onTargetTabLoad = this._targetTabLoad.bind(this);
    this._onResults = this._results.bind(this);

    win.addEventListener("message", this._onDevtoolPanelMessage, false);
    tabs.on("attach", this._onTargetTabLoad);
    tabs.on("results", this._onResults);
    themes.initialize(win);
    return this;
  },
  destroy: function () {
    this.win.removeEventListener("message", this._onDevtoolPanelMessage, false);
    tabs.removeListener("attach", this._onTargetTabLoad);
    tabs.removeListener("results", this._onResults);
  },
  _devtoolPanelMessage: function (e) {
    let data = e.data;
    if (data && data.target !== "addon") {
      return;
    }

    if (data.command === "analyze") {
      tabs.sendToWorkersByTabId(this.targetTabId, "axe.analyze", true);
      return;
    }
    if (data.command === "inspect") {
      inspectDOMElement(this.toolbox, data.node, exports.tabDefinition.id);
      return;
    }

    if (data.command === "highlight") {
      highlightDOMElement(this.toolbox, data.node, exports.tabDefinition.id);
      return;
    }
  },
  _targetTabLoad: function ({
    tabId: tabId,
    worker: worker
  }) {
    // handle on reloads on the current activeTab and its iframes
    if (this.targetTabId !== tabId) {
      return;
    }
    this.win.postMessage({
      target: "panel",
      command: "refresh"
    }, "*");
  },
  _results: function (e) {
    this.win.postMessage({
      target: "panel",
      command: "results",
      data: e.data
    }, "*");
  }
});

exports.tabDefinition = {
  id: "axe-audit",
  icon: self.data.url("axe.svg"),
  invertIconForLightTheme: true,
  url: self.data.url("panel/index.html"),
  label: "Accessibility",
  tooltip: "aXe Accessibility Audit",
  isTargetSupported: function (target) {
    return target.isLocalTab;
  },
  build: function (iframeWindow, toolbox) {
    return Promise.resolve(new AxePanel(iframeWindow, toolbox));
  },
  _menuitem: {
    id: "axe-audit",
    menuid: "menuWebDeveloperPopup",
    label: "Accessibility Audit",
    onCommand: function () {
      openDevTool(exports.tabDefinition.id);
    },
    insertbefore: "menu_devToolbox"
  },
  _button: {
    id: "axe-audit",
    label: "Accessibility Audit",
    icon: self.data.url("axe-button.svg"),
    onClick: function () {
      openDevTool(exports.tabDefinition.id);
    },
  }
};
