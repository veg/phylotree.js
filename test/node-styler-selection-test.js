// Characterization test for https://github.com/veg/phylotree.js/issues/526
//
// A user-supplied "node-styler" must be re-applied to every visible node after
// a selection change. refresh() does not do this itself: modifySelection()
// always calls update() right after refresh(), and update() redraws every
// visible node through drawNode(), which calls the node-styler. This pins that
// behaviour, so the dead node_styler block in refresh() can be deleted safely.

const tape = require("tape"),
  { JSDOM } = require("jsdom"),
  phylotree = require("../dist/phylotree");

const NEWICK = "((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);";

// Default css_classes["node"] and css_classes["internal-node"] (src/render/options.js).
const NODE_SELECTOR = "#tree g.node, #tree g.internal-node";

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

function isSvgGroup(node) {
  return Boolean(node) && node.nodeName === "g";
}

tape("node-styler is re-applied to every visible node after a selection change", function(test) {
  const env = setupDom();
  const received = [];
  const tree = new phylotree.phylotree(NEWICK);
  const tip = tree.getTips()[0];

  const display = tree.render({
    container: "#tree",
    brush: false, // d3-brush needs SVG geometry that jsdom does not implement
    "node-styler": function(element, node) {
      received.push({
        element: element.node(),
        node: node,
        selected: Boolean(node.selected)
      });
      element.attr("data-styled", "yes");
    }
  });

  document.querySelector("#tree").appendChild(display.show());

  // Only look at what happens after the initial render.
  received.length = 0;
  document.querySelectorAll(NODE_SELECTOR).forEach(function(element) {
    element.removeAttribute("data-styled");
  });

  test.doesNotThrow(function() {
    display.modifySelection([tip]);
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
    received.length > 0 && received.every(function(call) {
      return isSvgGroup(call.element);
    }),
    "node-styler only receives SVG <g> elements"
  );

  const nodeElements = Array.from(document.querySelectorAll(NODE_SELECTOR));

  test.ok(
    nodeElements.length > 0 && nodeElements.every(function(element) {
      return element.getAttribute("data-styled") === "yes";
    }),
    "every visible node is styled again after the selection change"
  );

  test.ok(
    received.some(function(call) {
      return call.node === tip && call.selected;
    }),
    "node-styler sees the newly selected node with selected === true"
  );

  env.restore();
  test.end();
});
