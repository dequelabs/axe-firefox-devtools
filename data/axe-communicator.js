
(function () {
	if (document.defaultView.top != document.defaultView) {
		return;
	}

	/*
	 * aXe communicator
	 */
	self.port.on('axe.analyze', function() {
		axe.a11yCheck(document, function (results) {
		    self.port.emit('results', results);
		});
	});
	self.port.emit('attach', {});

}());
