(function (window) {
	var results, rule, compiledRowTemplate, compiledTableTemplate;

	function helperItemIterator(items, template) {
		var out = '';
		if (items) {
			for (var i = 0; i < items.length; i++) {
				out += template(items[i]);
			}
		}
		return out;		
	}
	Handlebars.registerHelper('violations', function(items) {
		return helperItemIterator(items, compiledRowTemplate);
	});
	Handlebars.registerHelper('related', function(items) {
		return helperItemIterator(items, compiledRelatedNodeTemplate);
	});
	Handlebars.registerHelper('reasons', function(items) {
		return helperItemIterator(items, compiledFailureTemplate);
	});

	// Setup handlebars templates

	compiledRowTemplate = Handlebars.compile(rowTemplate.innerHTML);
	compiledTableTemplate = Handlebars.compile(tableTemplate.innerHTML);
	compiledRelatedListTemplate = Handlebars.compile(relatedListTemplate.innerHTML);
	compiledRelatedNodeTemplate = Handlebars.compile(relatedNodeTemplate.innerHTML);
	compiledFailureTemplate = Handlebars.compile(failureTemplate.innerHTML);
	compiledReasonsTemplate = Handlebars.compile(reasonsTemplate.innerHTML);

	function messageFromRelatedNodes(relatedNodes) {
		var retVal = '';
		if (relatedNodes.length) {
			var list = relatedNodes.map(function (node) {
				return {
					targetArrayString: JSON.stringify(node.target),
					targetString: node.target.join(' ')
				};
			});
			retVal += compiledRelatedListTemplate({relatedNodeList: list});
		}
		return retVal;
	}

	function messagesFromArray(nodes) {
		var list = nodes.map(function (failure) {
			return {
				message: failure.message,
				relatedNodesMessage: messageFromRelatedNodes(failure.relatedNodes)
			}
		});
		return compiledReasonsTemplate({reasonsList: list});
	}

	function summary(node) {
		var retVal = '';
		if (node.any.length) {
			retVal += '<h3 class="error-title">Fix any of the following</h3>';
			retVal += messagesFromArray(node.any);
		}

		var all = node.all.concat(node.none);
		if (all.length) {
			retVal += '<h3 class="error-title">Fix all of the following</h3>';
			retVal += messagesFromArray(all);
		}
		return retVal;
	}

	window.addEventListener("message", function(event) {
	  window.port = event.ports[0];
	  window.port.start();
	  window.port.onmessage = receive;
	}, false);

	document.addEventListener('click', function(e) {
		if (e.target.classList.contains('related-node')) {
			window.port.postMessage('{"command": "highlight", "target": ' + 
				e.target.getAttribute('data-element') + '}');
		}
		if (e.target.classList.contains('rule')) {
			details.classList.remove('empty');
			displayNodeList(parseInt(e.target.getAttribute('data-index'), 10));
			Array.prototype.slice.call(document.querySelectorAll('.rule.selected')).forEach(function (node) {
				node.classList.remove('selected');
				node.removeAttribute('title');
			});
			e.target.classList.add('selected');
			e.target.setAttribute('title', 'selected');
		}
	}, false);

	document.addEventListener('mouseover', function (e) {
		if (e.target.classList.contains('related-node')) {
			e.target.classList.add('highlighted');
		}
		if (e.target.classList.contains('rule')) {
			e.target.classList.add('highlighted');
		}
	}, false);

	document.addEventListener('mouseout', function (e) {
		if (e.target.classList.contains('related-node')) {
			e.target.classList.remove('highlighted');
		}
		if (e.target.classList.contains('rule')) {
			e.target.classList.remove('highlighted');
		}
	}, false);

	document.getElementById('actions').addEventListener('click', function (e) {
		var current, max;
		if (!rule) return;
		current = parseInt(document.getElementById('currentNode').textContent, 10) - 1;
		max = parseInt(document.getElementById('nodeCount').textContent, 10);
		if (e.target.classList.contains('prev')) {
			if (current > 0) {
				current -= 1;
			}
		} else if (e.target.classList.contains('next')) {
			if (current < (max - 1)) {
				current += 1;
			}
		} else if (e.target.classList.contains('inspect')) {
			window.port.postMessage('{"command": "inspect", "target": ' + e.target.parentNode.getAttribute('data-element') + '}');
		}
		displayNodeDetails(current);
		e.stopPropagation();
	}, false);

	document.getElementById('detailsItem').addEventListener('click', function (e) {
		if (e.target.classList.contains('inspect')) {
			window.port.postMessage('{"command": "inspect", "target": ' + e.target.parentNode.getAttribute('data-element') + '}');
			e.stopPropagation();
		} else if (e.target.classList.contains('highlight')) {
			window.port.postMessage('{"command": "highlight", "target": ' + e.target.parentNode.getAttribute('data-element') + '}');
			e.stopPropagation();
		}
	}, false);

	var request = document.getElementById("analyze");
	var list = document.getElementById("list");
	var details = document.getElementById("details");

	request.addEventListener("click", function () {
		window.port.postMessage('{"command": "analyze"}');
	}, false);

	function receive(event) {
		results = event.data;
		if (typeof results.loaded !== 'undefined') {
			details.classList.add('empty');
			list.innerHTML = '<p>Click the "Analyze" button to analyze this page for accessibility violations.</p>';
			return;
		} else if (typeof results.refresh !== 'undefined') {
			details.classList.add('empty');
			list.innerHTML = '<p>Refresh the page</p>';
			return;
		}
		if (results.violations.length) {
			var violations = results.violations.map(function (rule, i) {
				return {
					impact: rule.impact,
					help: rule.help.replace(/</gi, '&lt;').replace(/>/gi, '&gt;'),
					bestpractice: (rule.tags.indexOf('best-practice') !== -1),
					helpUrl: rule.helpUrl,
					count: rule.nodes.length,
					index: i
				};
			});

			list.innerHTML = compiledTableTemplate({violationList: violations});
		} else {
			details.classList.add('empty');
			list.innerHTML += '<p>Congratulations! No accessibility violations found. Now you should perform manual testing using assistive technologies like NVDA, VoiceOver and JAWS</p>';
		}
	}

	function displayNodeList(index) {
		rule = results.violations[index];
		document.getElementById('nodeCount').textContent = rule.nodes.length;
		displayNodeDetails(0);
		document.getElementById('actions').querySelector('button').focus();
	}

	function displayNodeDetails(nodeNumber) {
		var node = rule.nodes[nodeNumber];
		document.getElementById('currentNode').textContent = nodeNumber+1;
		document.getElementById('html').getElementsByTagName('td')[0].innerHTML = node.target[0].replace(/</gi, '&lt;').replace(/>/gi, '&gt;');
		document.getElementById('reason').getElementsByTagName('td')[0].innerHTML = summary(node);
		document.getElementById('html').getElementsByTagName('td')[1].setAttribute('data-element', JSON.stringify(node.target));
		window.port.postMessage('{"command": "highlight", "target": ' + JSON.stringify(node.target) + '}');
	}
})(this);
