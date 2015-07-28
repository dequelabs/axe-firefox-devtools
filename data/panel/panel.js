/*global Handlebars */
/*jshint maxstatements: false */
(function(window) {
  var results, rule;

  function $id(id) {
    return document.getElementById(id);
  }

  var list = $id("list");
  var status = $id("status");
  var details = $id("details");

  // Setup handlebars templates
  var compiledListTemplate = Handlebars.compile($id('listTemplate').innerHTML),
    compiledDetailsTemplate = Handlebars.compile($id('detailsTemplate').innerHTML);

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
      status.innerHTML = 'Analyzing...';
      setTimeout(function () {
  			window.postMessage({
  				target: 'addon',
  				command: 'analyze'
  			}, '*');
      }, 0);
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
    } else if (e.target.classList.contains('inspect')) {
      window.postMessage({
        command: 'inspect',
        target: 'addon',
        node: JSON.parse(e.target.parentNode.dataset.element)
      }, '*');
    }
    displayNodeDetails(current);
    e.stopPropagation();
  }, false);

/*
  $id('detailsItem').addEventListener('click', function(e) {
    if (e.target.classList.contains('inspect')) {
      window.postMessage({
        command: 'inspect',
        target: 'addon',
        node: JSON.parse(e.target.parentNode.dataset.element)
      }, '*');
      e.stopPropagation();
      return;
    }
    if (e.target.classList.contains('highlight')) {
      window.postMessage({
        command: 'highlight',
        target: 'addon',
        node: JSON.parse(e.target.parentNode.dataset.element)
      }, '*');

      e.stopPropagation();
      return;
    }
  }, false);
*/
  function refresh(showMsg) {
    details.classList.add('empty');
    list.innerHTML = showMsg === true ? '<p>Click the "Analyze" button to analyze this page for accessibility violations.</p>' : '';
    results = null;
    //$id('analyze').focus();
  }

  function displayNodeList(index) {
    rule = results.violations[index];
    $id('nodeCount').textContent = rule.nodes.length;
    displayNodeDetails(0);
    $id('actions').querySelector('button').focus();
  }

  function displayNodeDetails(nodeNumber) {
    var node = rule.nodes[nodeNumber];
    $id('currentNode').textContent = nodeNumber + 1;
    $id('issue-details').innerHTML = compiledDetailsTemplate({
      rule: rule,
      node: node
    });
    /*
    $id('html').getElementsByTagName('td')[0].innerHTML = node.target[0].replace(/</gi, '&lt;').replace(/>/gi, '&gt;');
    $id('reason').getElementsByTagName('td')[0].innerHTML = summary(node);
    $id('html').getElementsByTagName('td')[1].dataset.element = JSON.stringify(node.target);
    */
    window.postMessage({
      "command": "highlight",
      "target": "addon",
      "node": node.target
    }, '*');
  }
	function receive(event) {
		if (event.data.command === 'refresh') {
      refresh(true);
			return;
		}
    refresh(false);
  	results = event.data.data;
		if (results.violations.length) {
			var total = results.violations.reduce(function (acc, rule) {
        return acc + rule.nodes.length;
			}, 0);
      status.innerHTML = total + ' violations found.';
			list.innerHTML = compiledListTemplate({ violations: results.violations });
		} else {
			details.classList.add('empty');
			list.innerHTML = '<p>Congratulations! No accessibility violations found. Now you should perform manual testing using assistive technologies like NVDA, VoiceOver and JAWS</p>';
		}
	}
  window.receive = receive;
  refresh();
})(this);
