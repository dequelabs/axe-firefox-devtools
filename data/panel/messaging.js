/*global receive */
(function (window, document) {

	window.addEventListener('message', function(e) {
		var data = e.data;
		if (!data || data.target !== 'panel') {
			return;
		}
		console.log('ok, we gots data? ', e);
    receive(e);
	}, false);

	document.getElementById('analyze').addEventListener('click', function () {
		window.postMessage({
			target: 'addon',
			command: 'analyze'
		}, '*');
	}, false);
})(this, this.document);
