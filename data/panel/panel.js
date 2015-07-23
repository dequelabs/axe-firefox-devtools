/*global Handlebars */
(function(window) {
  var results, rule;

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
  function $id(id) {
    return document.getElementById(id);
  }
  var compiledRowTemplate = Handlebars.compile($id('rowTemplate').innerHTML),
    compiledTableTemplate = Handlebars.compile($id('tableTemplate').innerHTML),
    compiledRelatedListTemplate = Handlebars.compile($id('relatedListTemplate').innerHTML),
    compiledRelatedNodeTemplate = Handlebars.compile($id('relatedNodeTemplate').innerHTML),
    compiledFailureTemplate = Handlebars.compile($id('failureTemplate').innerHTML),
    compiledReasonsTemplate = Handlebars.compile($id('reasonsTemplate').innerHTML);

  function messageFromRelatedNodes(relatedNodes) {
    var retVal = '';
    if (relatedNodes.length) {
      var list = relatedNodes.map(function(node) {
        return {
          targetArrayString: JSON.stringify(node.target),
          targetString: node.target.join(' ')
        };
      });
      retVal += compiledRelatedListTemplate({
        relatedNodeList: list
      });
    }
    return retVal;
  }

  function messagesFromArray(nodes) {
    var list = nodes.map(function(failure) {
      return {
        message: failure.message,
        relatedNodesMessage: messageFromRelatedNodes(failure.relatedNodes)
      };
    });
    return compiledReasonsTemplate({
      reasonsList: list
    });
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


  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('related-node')) {
      window.postMessage({
        target: 'addon',
        command: 'highlight',
        node: JSON.parse(e.target.dataset.element)
      }, '*');
    }
    if (e.target.classList.contains('rule')) {
      details.classList.remove('empty');
      displayNodeList(parseInt(e.target.getAttribute('data-index'), 10));
      Array.prototype.slice.call(document.querySelectorAll('.rule.selected')).forEach(function(node) {
        node.classList.remove('selected');
        node.removeAttribute('title');
      });
      e.target.classList.add('selected');
      e.target.setAttribute('title', 'selected');
    }
  }, false);

  document.addEventListener('mouseover', function(e) {
    if (e.target.classList.contains('related-node')) {
      e.target.classList.add('highlighted');
    }
    if (e.target.classList.contains('rule')) {
      e.target.classList.add('highlighted');
    }
  }, false);

  document.addEventListener('mouseout', function(e) {
    if (e.target.classList.contains('related-node')) {
      e.target.classList.remove('highlighted');
    }
    if (e.target.classList.contains('rule')) {
      e.target.classList.remove('highlighted');
    }
  }, false);

  document.getElementById('actions').addEventListener('click', function(e) {
    if (!rule) {
      return;
    }
    var current = parseInt(document.getElementById('currentNode').textContent, 10) - 1;
    var max = parseInt(document.getElementById('nodeCount').textContent, 10);
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

  document.getElementById('detailsItem').addEventListener('click', function(e) {
    if (e.target.classList.contains('inspect')) {
      window.postMessage({
        command: 'inspect',
        target: 'addon',
        node: JSON.parse(e.target.parentNode.dataset.element)
      }, '*');
      e.stopPropagation();
    } else if (e.target.classList.contains('highlight')) {
      window.postMessage({
        command: 'highlight',
        target: 'addon',
        node: JSON.parse(e.target.parentNode.dataset.element)
      }, '*');
      e.stopPropagation();
    }
  }, false);

  var list = document.getElementById("list");
  var details = document.getElementById("details");

  function refresh(showMsg) {
    details.classList.add('empty');
    list.innerHTML = showMsg === true ? '<p>Click the "Analyze" button to analyze this page for accessibility violations.</p>' : '';
    results = null;
    //$id('analyze').focus();
  }

  function displayNodeList(index) {
    rule = results.violations[index];
    document.getElementById('nodeCount').textContent = rule.nodes.length;
    displayNodeDetails(0);
    document.getElementById('actions').querySelector('button').focus();
  }

  function displayNodeDetails(nodeNumber) {
    var node = rule.nodes[nodeNumber];
    document.getElementById('currentNode').textContent = nodeNumber + 1;
    document.getElementById('html').getElementsByTagName('td')[0].innerHTML = node.target[0].replace(/</gi, '&lt;').replace(/>/gi, '&gt;');
    document.getElementById('reason').getElementsByTagName('td')[0].innerHTML = summary(node);
    document.getElementById('html').getElementsByTagName('td')[1].dataset.element = JSON.stringify(node.target);
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
			list.innerHTML = '<p>Congratulations! No accessibility violations found. Now you should perform manual testing using assistive technologies like NVDA, VoiceOver and JAWS</p>';
		}
	}
  window.receive = receive;
  refresh();
})(this);
