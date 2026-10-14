// Regression test for https://github.com/veg/phylotree.js/issues/522
//
// TreeRender.refresh() must hand the user-supplied "edge-styler" a D3
// selection wrapping the edge's SVG <path>, not the TreeRender instance.
// refresh() runs after every selection change (edge click, context-menu
// selection items, brush), so a styler that calls .attr() or .style() used
// to throw there.

const tape = require("tape"),
  { JSDOM } = require("jsdom"),
  phylotree = require("../dist/phylotree");

const NEWICK = "((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);";

// Install a jsdom window/document as globals, collecting errors thrown inside
// event listeners (refresh() is also invoked from a document event listener,
// where exceptions are reported instead of propagated).
function setupDom() {
  const dom = new JSDOM('<!DOCTYPE html><div id="tree"></div>');
  const saved = {};
  const listenerErrors = [];

  ["window", "document", "CustomEvent"].forEach(function(name) {
    saved[name] = Object.getOwnPropertyDescriptor(global, name);
    Object.defineProperty(global, name, {
      value: name === "window" ? dom.window : dom.window[name],
      configurable: true,
      writable: true
    });
  });

  dom.window.addEventListener("error", function(event) {
    listenerErrors.push(event.error);
    event.preventDefault();
  });

  return {
    listenerErrors: listenerErrors,
    restore: function() {
      Object.keys(saved).forEach(function(name) {
        if (saved[name]) {
          Object.defineProperty(global, name, saved[name]);
        } else {
          delete global[name];
        }
      });
      dom.window.close();
    }
  };
}

function isSvgPath(node) {
  return Boolean(node) && node.nodeName === "path";
}

function checkStylerAfterSelectionChange(test, applyStyle) {
  const env = setupDom();
  const received = [];
  const tree = new phylotree.phylotree(NEWICK);

  const display = tree.render({
    container: "#tree",
    brush: false, // d3-brush needs SVG geometry that jsdom does not implement
    "edge-styler": function(element, edge) {
      received.push(element.node());
      applyStyle(element);
    }
  });

  document.querySelector("#tree").appendChild(display.show());
  received.length = 0; // only look at calls made after the initial render

  test.doesNotThrow(function() {
    display.modifySelection([tree.getTips()[0]]);
  }, "modifySelection() does not throw");

  test.doesNotThrow(function() {
    display.refresh();
  }, "refresh() does not throw");

  test.deepEqual(
    env.listenerErrors.map(String),
    [],
    "no errors thrown from the refresh event listener"
  );

  test.ok(
    received.length > 0 && received.every(isSvgPath),
    "edge-styler only receives SVG <path> elements"
  );

  env.restore();
  test.end();
}

tape("edge-styler using .attr() survives refresh() after a selection change", function(test) {
  checkStylerAfterSelectionChange(test, function(element) {
    element.attr("stroke", "red");
  });
});

tape("edge-styler using .style() survives refresh() after a selection change", function(test) {
  checkStylerAfterSelectionChange(test, function(element) {
    element.style("stroke", "red");
  });
});
