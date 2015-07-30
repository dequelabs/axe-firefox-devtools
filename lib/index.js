const { registerDevTool, unregisterDevTool } = require('./utils');
const { tabDefinition } = require('./panel');

function startup() {
	registerDevTool(tabDefinition);
}
startup();

function shutdown() {
	unregisterDevTool(tabDefinition);
}

exports.onUnload = function() {
	shutdown();
};
