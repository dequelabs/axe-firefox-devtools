// @see https://github.com/emberjs/ember-inspector/blob/master/skeleton_firefox/lib/tomster-tabs.js

"use strict";

const { Class } = require("sdk/core/heritage");
const { data } = require("sdk/self");
const { PageMod } = require("sdk/page-mod");
const { emit } = require("sdk/event/core");
const { EventTarget } = require("sdk/event/target");

const tabs = require("sdk/tabs");

// track attached workers and ember libraries detected by tab.id
let workers = new Set();
let workersByTabId = new Map();
let libraries = new Map();

// simplified tabs tracker class
const Tabs = Class({
  extends: EventTarget,
  get activeTab() {
    return tabs.activeTab;
  },
  attachExistentWorkersByTabId: function (tabId) {
    let selectedWorkers = workersByTabId.get(tabId);
    if (selectedWorkers) {
      selectedWorkers.forEach((w) => {
        emit(this, "emberAttach", {
          tabId: tabId,
          worker: w
        });
      });
    }
  },
  hasWorkersByTabId: function (tabId) {
    let selectedWorkers = workersByTabId.get(tabId);
    if (!!selectedWorkers && selectedWorkers.size) {
      return true;
    }

    return false;
  },
  sendToWorkersByTabId: function (tabId, name, msg) {
    let selectedWorkers = workersByTabId.get(tabId);
    if (selectedWorkers) {
      selectedWorkers.forEach((w) => {
        try {
          w.port.emit(name, msg);
        } catch (e) {
          console.error("EXCEPTION", e);
        }
      });
    }
  },
  getLibrariesByTabId: function (tabId) {
    return libraries.get(tabId);
  },
  destroy: function () {
    // NOTE: prevents leaks ("can"t access dead object" exceptions
    // from "sdk/tabs/tab-firefox:104" after disabling the addon
    [...workers]
    .map((w) => w.tab)
      .filter((tab) => !!tab)
      .sort()
      .filter((tab, i, a) => (i === a.indexOf(tab)))
      .forEach((tab) => {
        tab.destroy();
      });
  }
});

// exports tab tracker instance
var tomsterTabs = Tabs();
module.exports = tomsterTabs;

function attachWorker(worker) {
  function createRoute(name) {
    return function (msg) {
      // filter workers without an associated tab
      if (!worker.tab) {
        return;
      }
      emit(tomsterTabs, name, {
        tabId: worker.tab.id,
        worker: worker,
        url: worker.url,
        data: msg
      });
    };
  }

  let routeResults = createRoute("results");
  let routeAttach = createRoute("attach");
  worker.port.on("results", routeResults);
  worker.port.on("attach", routeAttach);

  worker.once("detach", () => {
    worker.port.removeListener("results", routeResults);
    worker.port.removeListener("attach", routeAttach);
  });
}

// create a page monitor to check ember versions and route
// ember debug messages when needed
PageMod({
  include: ["*", "file://*"],
  attachTo: ["top", "frame", "existing"],
  contentScriptFile: [data.url("axe-communicator.js"), data.url("axe.js")],
  contentScriptWhen: "start",
  onAttach: (worker) => {
    workers.add(worker);
    let tabId = worker.tab.id;
    let workersSet = workersByTabId.get(tabId);
    if (!workersSet) {
      workersSet = new Set();
      workersByTabId.set(tabId, workersSet);
    }

    workersSet.add(worker);

    attachWorker(worker);
    worker.on("pagehide", () => {
      workersSet.delete(worker);
    });
    worker.on("pageshow", () => {
      workersSet.add(worker);
    });

    worker.once("detach", () => {
      workersSet.delete(worker);
      workers.delete(worker);
      libraries.delete(tabId);
    });
  }
});

// route open/active/ready events (needed by tomster-locationbar-button)
let emitTomsterTabsOpen = (tab) => emit(tomsterTabs, "open", tab);
let emitTomsterTabsActivate = (tab) => emit(tomsterTabs, "activate", tab);
let emitTomsterTabsReady = (tab) => emit(tomsterTabs, "ready", tab);

tabs.on("open", emitTomsterTabsOpen);
tabs.on("activate", emitTomsterTabsActivate);
tabs.on("ready", emitTomsterTabsReady);
