/*global JST */
/*jshint maxstatements: false */
/*! aXe-firefox-devtools
 * Copyright (c) 2015 Deque Systems, Inc.
 *
 * Your use of this Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This entire copyright notice must appear in every copy of this file you
 * distribute or in any file that contains substantial portions of this source
 * code.
 */

(function(window) {
	var violations, rule;

	function $id(id) {
		return document.getElementById(id);
	}

	var list = $id('list');
	var status = $id('status');
	var details = $id('details');

	document.addEventListener('click', function(e) {
		var target = e.target;
		if (target.classList.contains('related-node')) {
			window.postMessage({
				target: 'addon',
				command: 'highlight',
				node: JSON.parse(target.dataset.element)
			}, '*');
			return;
		}

		if (target.classList.contains('help')) {
			target = target.parentNode;
		}

		if (target.classList.contains('rule')) {
			details.classList.remove('empty');
			displayNodeList(parseInt(target.getAttribute('data-index'), 10));
			Array.prototype.slice.call(document.querySelectorAll('.selected')).forEach(function(node) {
				node.classList.remove('selected');
				node.removeAttribute('title');
			});
			target.parentNode.classList.add('selected');
			target.setAttribute('title', 'selected');
			return;
		}

		if (e.target.classList.contains('axe-analyze-button')) {
			status.textContent = 'Analyzing...';
			setTimeout(function() {
				window.postMessage({
					target: 'addon',
					command: 'analyze'
				}, '*');
			}, 1);
			e.stopPropagation();
			return;
		}
	}, false);

	$id('issue-details').addEventListener('click', function(e) {
		var target = e.target;
		if (target.classList.contains('inspect')) {
			window.postMessage({
				command: 'inspect',
				target: 'addon',
				node: JSON.parse(target.dataset.element)
			}, '*');
			e.stopPropagation();
			return;
		}
		if (target.classList.contains('highlight')) {
			window.postMessage({
				command: 'highlight',
				target: 'addon',
				node: JSON.parse(target.dataset.element)
			}, '*');

			e.stopPropagation();
			return;
		}
	}, false);

	$id('actions').addEventListener('click', function(e) {
		if (!rule) {
			return;
		}
		var current = parseInt($id('currentNode').textContent, 10) - 1;
		var max = parseInt($id('nodeCount').textContent, 10);
		if (e.target.classList.contains('prev')) {
			if (current > 0) {
				current -= 1;
			}
		} else if (e.target.classList.contains('next')) {
			if (current < (max - 1)) {
				current += 1;
			}
		}
		displayNodeDetails(current);
		e.stopPropagation();
	}, false);



	function bindButtons() {
		$id('details-buttons').addEventListener('click', function(e) {
			var target = e.target;
			if (target.classList.contains('inspect')) {
				window.postMessage({
					command: 'inspect',
					target: 'addon',
					node: JSON.parse(target.dataset.element)
				}, '*');
				e.stopPropagation();
				return;
			}
			if (target.classList.contains('highlight')) {
				window.postMessage({
					command: 'highlight',
					target: 'addon',
					node: JSON.parse(target)
				}, '*');

				e.stopPropagation();
				return;
			}
		}, false);
	}

	function refresh(showMsg) {
		details.classList.add('empty');
		list.innerHTML = '';
		status.innerHTML = '';
		$id('issue-details').innerHTML = '';
		if (showMsg) {
			$id('wrap').classList.add('init');
			$id('splash').querySelector('button').focus();
		}
		violations = [];
	}

	function displayNodeList(index) {
		rule = violations[index];
		$id('nodeCount').textContent = rule.nodes.length;
		displayNodeDetails(0);
		$id('actions').querySelector('button').focus();
	}

	function displayNodeDetails(nodeNumber) {
		var node = rule.nodes[nodeNumber];
		var impact = $id('impact');
		$id('currentNode').textContent = nodeNumber + 1;
		impact.textContent = node.impact.charAt(0).toUpperCase() + node.impact.slice(1);
		impact.className = node.impact;
		$id('issue-details').innerHTML = JST.details({
			rule: rule,
			node: node
		});
		bindButtons(node.target);
		window.postMessage({
			command: 'highlight',
			target: 'addon',
			node: node.target
		}, '*');
	}

	function receive(event) {
		if (event.data.command === 'refresh') {
			refresh(true);
			return;
		}
		refresh(false);
		var results = event.data.data;
		$id('wrap').classList.remove('init');
		if (results.violations.length) {
			details.classList.remove('no-violations');
			var total = 0;
			violations = results.violations.map(function(rule) {
				total += rule.nodes.length;
				return {
					help: rule.help,
					description: rule.description,
					helpUrl: rule.helpUrl,
					tags: rule.tags,
					nodes: rule.nodes.map(function(node) {
						return {
							impact: node.impact,
							target: node.target,
							html: node.html.replace(/\t/g, '  '),
							any: node.any,
							all: node.all.concat(node.none)
						};
					})
				};
			}, 0);
			status.textContent = total + ' violations found.';
			list.innerHTML = JST.sidebar({
				violations: violations
			});
		} else {
			details.classList.add('no-violations');
			status.textContent = 'No violations found.';
			$id('issue-details').innerHTML = JST.congrats();
		}
	}
	window.receive = receive;
	refresh(true);
})(this);
