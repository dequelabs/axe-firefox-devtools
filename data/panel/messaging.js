/*global receive */
(function (window, document) {

	window.addEventListener('message', function(e) {
		var data = e.data;
		if (!data || data.target !== 'panel') {
			return;
		}
    receive(e);
	}, false);

})(this, this.document);
