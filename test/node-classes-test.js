// Node <g> elements must carry node-selected / node-collapsed classes that
// track the current state on every update(), not only when first drawn.

const tape = require("tape"),
  { JSDOM } = require("jsdom"),
  phylotree = require("../dist/phylotree");

const NEWICK = "((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);";

function setupDom() {
  const dom = new JSDOM('<!DOCTYPE html><div id="tree"></div>');
  const saved = {};

  ["window", "document", "CustomEvent"].forEach(function(name) {
    saved[name] = Object.getOwnPropertyDescriptor(global, name);
    Object.defineProperty(global, name, {
      value: name === "window" ? dom.window : dom.window[name],
      configurable: true,
      writable: true
    });
  });

  return {
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

function renderTree() {
  const tree = new phylotree.phylotree(NEWICK);
  const display = tree.render({
    container: "#tree",
    brush: false // d3-brush needs SVG geometry that jsdom does not implement
  });
  document.querySelector("#tree").appendChild(display.show());
  return { tree: tree, display: display };
}

function classOf(display, node) {
  let found = null;
  display.svg.selectAll("g").each(function(d) {
    if (d === node) found = this.getAttribute("class");
  });
  return found;
}

function hasClass(cls, name) {
  return (cls || "").split(/\s+/).indexOf(name) >= 0;
}

tape("selected node <g> gets node-selected, and loses it on deselect", function(test) {
  const env = setupDom();
  const { tree, display } = renderTree();
  const tip = tree.getTips()[0];

  display.modifySelection([tip]); // calls update() itself
  test.ok(tip.selected, "tip is selected");
  test.ok(hasClass(classOf(display, tip), "node-selected"), "selected tip has node-selected");
  test.equal(display.svg.selectAll(".node-selected").size(), 1, "exactly one .node-selected");

  display.modifySelection([tip]); // toggle off
  test.notOk(tip.selected, "tip is deselected");
  test.notOk(hasClass(classOf(display, tip), "node-selected"), "deselected tip lost node-selected");
  test.equal(display.svg.selectAll(".node-selected").size(), 0, "no .node-selected left");

  env.restore();
  test.end();
});

tape("collapsed node <g> gets node-collapsed, and loses it on expand", function(test) {
  const env = setupDom();
  const { tree, display } = renderTree();
  const internal = tree.getTips()[0].parent;

  display.toggleCollapse(internal).update();
  const collapsedClass = classOf(display, internal);
  test.ok(hasClass(collapsedClass, "internal-node"), "collapsed node keeps internal-node");
  test.ok(hasClass(collapsedClass, "node-collapsed"), "collapsed node has node-collapsed");

  display.toggleCollapse(internal).update();
  test.notOk(hasClass(classOf(display, internal), "node-collapsed"), "expanded node lost node-collapsed");
  test.equal(display.svg.selectAll(".node-collapsed").size(), 0, "no .node-collapsed left");

  env.restore();
  test.end();
});
