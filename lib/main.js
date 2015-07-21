// Bootstrap the extension
let { Cu } = require('chrome');
let { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm");

const { Panel } = require("dev/panel");
const { Disposable, setup } = require("sdk/core/disposable");
const { Class } = require("sdk/core/heritage");
const pageMod = require("sdk/page-mod");
const self = require("sdk/self");
const { MessageChannel } = require("sdk/messaging");
const tabs = require("sdk/tabs");
const { each, pairs, values } = require("sdk/util/sequence");

const workers = []; // for communicating with the Web pages under test

function detachWorker(worker, workerArray) {
	for (var index = 0; index < workerArray.length; index++) {
		if (workerArray[index].worker === worker) {
			break;
		}
	}
	if (index < workerArray.length) {
		// TODO: memory leak?
		workerArray[index].worker = undefined;
		workerArray[index].addonSide = undefined;
		workerArray[index].panelSide = undefined;

	}
}

function matchWorker(worker, workerArray) {
	for (var index = 0; index < workerArray.length; index++) {
		if (workerArray[index].worker === worker) {
			break;
		}
	}
	if (index < workerArray.length) {
		return workerArray[index];
	}
	return undefined;
}

function matchTabId(tabId, workerArray) {
	for (var index = 0; index < workerArray.length; index++) {
		if (workerArray[index].tabId === tabId) {
			break;
		}
	}
	if (index < workerArray.length) {
		return workerArray[index];
	}
	return undefined;

}

// Inject aXe into every frame
pageMod.PageMod({
	include: "*",
	contentScriptFile: self.data.url("axe.js"),
	attachTo: ['existing', 'frame']
});

// Inject aXe and the Web page communicator into the top frame
pageMod.PageMod({
	include: "*",
	contentScriptFile: [
		self.data.url("axe.js"),
		self.data.url("axe-communicator.js")
	],
	attachTo: ['existing', 'top'],
	onAttach: function(worker) {
		// Set up the channel for communicatig with our panel UI
		var channel = new MessageChannel();
		var workerEntry = matchTabId(worker.tab.id, workers);
		// messages from the panel arrive here
		channel.port1.onmessage = function(event) {
			let message = JSON.parse(event.data);
			switch (message.command) {
				case 'analyze':
					// console.log('analyze');
					worker.port.emit("axe.analyze");
					break;
				case 'highlight':
				case 'inspect':
					// TODO: frames
					let workerEntry = matchTabId(worker.tab.id, workers);
					let toolbox = workerEntry.panel.toolbox;
					let toolpanels = toolbox.getToolPanels();
					let inspector = toolpanels.get('inspector');
					inspector = toolpanels.get('inspector');
					let walker = inspector.inspector.walker;
					walker.querySelector(walker.rootNode, message.target[0])
						.then(function (result) {
							var depth = 1, contentDocument;
							while(result.nodeName === 'IFRAME' && message.target.length > depth) {
								contentDocument = result.rawNode().contentDocument;
								result = walker.frontForRawNode(contentDocument.querySelector(message.target[depth]));
								depth += 1;
							}
							if (message.command === 'inspect') {
								toolbox.selection.setNodeFront(result);
								toolbox.selectTool('inspector');
							} else {
								toolbox.highlighterUtils.highlightNodeFront(result);
							}
							// console.log('inspector.inspector walker selector result: ' + result.nodeName);
						});
					break;
			}
		};
		if (!workerEntry) {
			workers.push({
				worker: worker,
				tabId: worker.tab.id,
				addonSide: channel.port1,
				panelSide: channel.port2
			});
			worker.tab.on('pageshow', function () {
				// Called when the page content is shown, whether from the cache or from the network
				if (!worker || !worker.tab) {
					return;
				}
				var workerEntry = matchTabId(worker.tab.id, workers);
				if (workerEntry) {
					// if the content is from the cache, the refresh message will stay
					workerEntry.addonSide.postMessage({refresh:true});
				}
			});
		} else {
			workerEntry.addonSide = channel.port1;
			workerEntry.panelSide = channel.port2;
			workerEntry.worker = worker;
			if (workerEntry.panel) {
				workerEntry.panel.postMessage("init", [workerEntry.panelSide]);
			}
		}
		worker.on ('detach', function () {
			detachWorker(worker, workers);
		});
		worker.port.on("axe.results", function(results) {
			// Post the results form the document back to the panel for display
			var workerEntry = matchWorker(worker, workers);
			if (workerEntry) {
				workerEntry.addonSide.postMessage(results);
			}
		});
		worker.port.on("axe.loaded", function(results) {
			// when the new document loads, clear the panel results
			var workerEntry = matchWorker(worker, workers);
			if (workerEntry) {
				// content is not from the cache, inform user to click analyze
				workerEntry.addonSide.postMessage({loaded:true});
			}
		});
	}
});


// define a AxePanel class
// that inherits from dev/panel
const AxePanel = Class({
	extends: Panel,
	label: "Accessibility Audit",
	tooltip: "aXe Accessibility Audit",
	icon: self.data.url("axe.png"),
	url: self.data.url("axe-panel.html"),
	// when the panel is created,
	// take a reference to the debuggee
	setup: function(options) {
		this.debuggee = options.debuggee;
	},
	dispose: function() {
		this.debuggee = null;
	},
	// when the panel's script is ready,
	// send it a message containing
	// the debuggee
	onReady: function() {
		this.debuggee.start();
		// TODO: is the active tab the only way we can do this?
		var workerEntry = matchTabId(tabs.activeTab.id, workers);
		workerEntry.panel = this;
		this.postMessage("init", [workerEntry.panelSide]);
	},
	initialize: function(toolbox) {
		this.toolbox = toolbox;
	}
});
exports.AxePanel = AxePanel;

// create a new tool,
// initialized with the
// AxePanel's constructor

// this code is adapted from http://mxr.mozilla.org/mozilla-central/source/addon-sdk/source/lib/dev/toolbox.js?raw=1
// only difference is passing the toolbox into the constructor and removing the themes

const Tool = Class({
  extends: Disposable,
  setup: function(params) {
    const { panels } = params;

    this.panels = panels;

    each(([key, Panel]) => {
      const { url, label, tooltip, icon } = Panel.prototype;
      const { id } = Panel.prototype;

      gDevTools.registerTool({
        id: id,
        url: "about:blank",
        label: label,
        tooltip: tooltip,
        icon: icon,
        isTargetSupported: target => target.isLocalTab,
        build: (window, toolbox) => {
          const panel = new Panel(toolbox);
          setup(panel, { window: window,
                         toolbox: toolbox,
                         url: url });

          return panel.ready();
        }
      });
    }, pairs(panels));
  },
  dispose: function() {
    each(Panel => gDevTools.unregisterTool(Panel.prototype.id),
         values(this.panels));
  }
});

const axeTool = new Tool({
	panels: { axeMain: AxePanel }
});

// this code sucks, but we have to select the inspector when the toolbox inits or else we cannot get hold of the inspector
gDevTools.on('toolbox-ready', function (eventId, toolbox) {
	var toolpanels = toolbox.getToolPanels();
	var inspector = toolpanels.get('inspector');
	toolbox.selectTool('inspector');
});


// console.log('bootstrapped: ');
