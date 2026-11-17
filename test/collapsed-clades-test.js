// Regression tests for collapsed clades (toggleCollapse + update()), in the
// radial and linear layouts, with and without transitions:
//
// 1. radial layout: every point of a collapsed clade's outline was NaN, because
//    placenodes() passed { x, y } to cartesianToPolar(), which reads `radius`;
// 2. a clade collapsed inside another collapsed clade kept its old outline,
//    which stayed drawn next to the outer clade's;
// 3. without transitions (the default above 300 nodes), the outline path was
//    cached in `collapsed_clade` and not redrawn while the clade stayed
//    collapsed, so it did not move when another clade was collapsed;
// 4. toggleCollapse() on a node inside a collapsed clade threw
//    "d.collapsed.map is not a function" (radial) or
//    "d.collapsed.forEach is not a function" (linear).
const tape = require("tape"),
  { JSDOM } = require("jsdom"),
  phylotree = require("../dist/phylotree");

// A caterpillar of 8 balanced clades of 8 tips each (64 tips, 127 nodes), so
// there are nested clades at several depths. Tips are T000, T001, ...
function fixtureNewick() {
  let next = 0;
  const balanced = function(depth) {
    if (depth === 0) {
      const name = "T" + String(next++).padStart(3, "0");
      return name + ":0." + ((next % 7) + 1);
    }
    return "(" + balanced(depth - 1) + "," + balanced(depth - 1) + "):0.0" + depth;
  };
  let tree = balanced(3);
  for (let i = 1; i < 8; i += 1) {
    tree = "(" + tree + "," + balanced(3) + "):0.01";
  }
  return tree + ";";
}

const NEWICK = fixtureNewick();

// Install a jsdom window/document as globals. jsdom has no SVG geometry, so
// getBBox() and getComputedTextLength() are stubbed (6 px per character).
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
  const proto = dom.window.SVGElement.prototype;
  proto.getBBox = function() {
    return { x: 0, y: 0, width: (this.textContent || "").length * 6, height: 10 };
  };
  proto.getComputedTextLength = function() {
    return (this.textContent || "").length * 6;
  };
  return function restore() {
    Object.keys(saved).forEach(function(name) {
      if (saved[name]) {
        Object.defineProperty(global, name, saved[name]);
      } else {
        delete global[name];
      }
    });
    dom.window.close();
  };
}

function renderTree(options) {
  const tree = new phylotree.phylotree(NEWICK);
  const display = tree.render(
    Object.assign(
      {
        container: "#tree",
        width: 900,
        height: 900,
        brush: false, // d3-brush needs SVG geometry that jsdom does not implement
        "show-menu": false
      },
      options
    )
  );
  document.querySelector("#tree").appendChild(display.show());
  return display;
}

function cladePaths() {
  return Array.prototype.slice.call(document.querySelectorAll("#tree path.clade"));
}

function pathFor(node) {
  return cladePaths().filter(function(p) {
    return p.__data__ === node;
  })[0];
}

// Internal nodes with exactly `tips` tips, in tree order.
function cladesWithTips(display, tips) {
  return display.phylotree.nodes.descendants().filter(function(n) {
    return n.children && n.leaves().length === tips;
  });
}

function hasNaN(path) {
  return (path.getAttribute("d") || "").indexOf("NaN") !== -1;
}

// The first point of a clade path, as [x, y].
function startPoint(path) {
  const m = /^M\s*(-?[\d.e+-]+)[ ,](-?[\d.e+-]+)/.exec(path.getAttribute("d") || "");
  return m ? [Number(m[1]), Number(m[2])] : null;
}

const LAYOUTS = [
  ["radial, aligned tips", { "is-radial": true, "align-tips": true }],
  ["radial", { "is-radial": true, "align-tips": false }],
  ["linear", { "is-radial": false, "align-tips": false }]
];

[false, true].forEach(function(transitions) {
  LAYOUTS.forEach(function(layout) {
    const label = layout[0] + (transitions ? ", transitions" : ", no transitions");
    const options = Object.assign({ transitions: transitions }, layout[1]);

    tape(label + ": a collapsed clade has a finite outline", function(test) {
      const restore = setupDom();
      const display = renderTree(options);
      const clade = cladesWithTips(display, 8)[0];
      display.toggleCollapse(clade).update();
      display.update();
      const paths = cladePaths();
      test.equal(paths.length, 1, "one clade path");
      test.notOk(paths.some(hasNaN), "no NaN in the clade path");
      display.toggleCollapse(clade).update();
      test.equal(cladePaths().length, 0, "no clade path after expanding");
      restore();
      test.end();
    });

    tape(label + ": collapsing a clade, then its parent, draws one shape", function(test) {
      const restore = setupDom();
      const display = renderTree(options);
      const parent = cladesWithTips(display, 8)[0];
      const child = parent.children[0];
      display.toggleCollapse(child).update();
      display.toggleCollapse(parent).update();
      test.equal(cladePaths().length, 1, "only the parent is drawn");
      test.ok(pathFor(parent), "the drawn path is the parent's");
      display.toggleCollapse(parent).update();
      test.ok(child.collapsed, "the child is still collapsed after expanding the parent");
      test.equal(cladePaths().length, 1, "only the child is drawn");
      test.ok(pathFor(child) && !hasNaN(pathFor(child)), "the child's path is finite");
      restore();
      test.end();
    });

    tape(label + ": collapsing inside a collapsed clade does not throw", function(test) {
      const restore = setupDom();
      const display = renderTree(options);
      const parent = cladesWithTips(display, 8)[0];
      const child = parent.children[1];
      display.toggleCollapse(parent).update();
      test.doesNotThrow(function() {
        display.toggleCollapse(child).update();
      }, "toggleCollapse(child).update() does not throw");
      test.equal(cladePaths().length, 1, "only the parent is drawn");
      display.toggleCollapse(parent).update();
      test.ok(child.collapsed, "the child is collapsed once the parent is expanded");
      test.equal(cladePaths().length, 1, "only the child is drawn");
      test.ok(pathFor(child) && !hasNaN(pathFor(child)), "the child's path is finite");
      display.toggleCollapse(child).update();
      test.equal(cladePaths().length, 0, "no clade path after expanding everything");
      restore();
      test.end();
    });

    tape(label + ": an outline follows its clade when another clade collapses", function(test) {
      const restore = setupDom();
      const display = renderTree(options);
      const clades = cladesWithTips(display, 8);
      const late = clades[0]; // drawn last
      const early = clades[clades.length - 1]; // drawn first
      display.toggleCollapse(late).update();
      display.toggleCollapse(early).update();
      // The spline maps an outline point [a, b] to (x = b, y = a).
      const expected = [late.collapsed[0][1], late.collapsed[0][0]];
      const actual = startPoint(pathFor(late));
      test.ok(
        actual &&
          Math.abs(actual[0] - expected[0]) < 0.01 &&
          Math.abs(actual[1] - expected[1]) < 0.01,
        "the path starts at the clade's current position (expected " +
          expected.join(",") +
          ", got " +
          actual +
          ")"
      );
      restore();
      test.end();
    });
  });
});
