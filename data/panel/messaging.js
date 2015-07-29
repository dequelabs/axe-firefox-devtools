/*global receive */
window.addEventListener('message', function(e) {
	var data = e.data;
	if (!data || data.target !== 'panel') {
		return;
	}
  receive(e);
}, false);
