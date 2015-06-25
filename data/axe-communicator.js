/*
 * aXe communicator
 */
self.port.on('axe.analyze', function() {
	axe.a11yCheck(document, function (results) {
	    self.port.emit('axe.results', results);
	});
});
self.port.emit('axe.loaded', {});
