// Regression tests for the layout/render setup in src/render/draw.js:
// cladogram depth, undefined branch lengths, hidden tips in collapsed clades,
// unary internal nodes, single-node trees, node-span, zero branch lengths,
// stale links after topology changes, malformed selection options,
// right-to-left collapsed clades, font size accessors and style_edges(null).
const tape = require("tape"),
  { JSDOM } = require("jsdom"),
  phylotree = require("../dist/phylotree");

// Install a jsdom window/document as globals; getBBox() and
// getComputedTextLength() are stubbed (6 px per character).
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

function renderNewick(newick, options, prepare) {
  const tree = new phylotree.phylotree(newick);
  if (prepare) prepare(tree);
  const display = tree.render(
    Object.assign(
      {
        container: "#tree",
        width: 900,
        height: 900,
        brush: false,
        "show-menu": false
      },
      options
    )
  );
  document.querySelector("#tree").appendChild(display.show());
  return { tree: tree, display: display };
}

function node(tree, name) {
  return tree.getNodeByName(name);
}

function allFinite(tree) {
  return tree.nodes.descendants().every(function(n) {
    return Number.isFinite(n.x) && Number.isFinite(n.y);
  });
}

function branchPaths() {
  return document.querySelectorAll("#tree path.branch");
}

tape("render-layout: scaling:false places nodes by depth", function(test) {
  const restore = setupDom();
  const r = renderNewick("((((A,B),C),D),(E,F));", { scaling: false });
  r.tree.nodes.descendants().forEach(function(n) {
    if (n.children) {
      n.leaves().forEach(function(leaf) {
        test.ok(n.y < leaf.y, "internal node is left of its tip " + leaf.data.name);
      });
    }
  });
  const ys = r.tree.nodes.leaves().map(function(n) { return n.y; });
  test.ok(new Set(ys).size === 1, "all leaves aligned at the same depth");
  restore();
  test.end();
});

tape("render-layout: undefined branch length falls back to unscaled", function(test) {
  const restore = setupDom();
  const r = renderNewick("(((A,B),C),(D,E));", {}, function(tree) {
    tree.setBranchLength(function(n) {
      return n.data.name === "C" ? undefined : 1;
    });
  });
  test.ok(allFinite(r.tree), "all coordinates are finite");
  test.equal(r.display.do_scaling, false, "fell back to unscaled layout");
  r.tree.nodes.descendants().forEach(function(n) {
    if (n.parent) test.ok(n.parent.y < n.y, "parent left of child");
  });
  restore();
  test.end();
});

tape("render-layout: collapsed clade ignores hidden tips", function(test) {
  const restore = setupDom();
  const r = renderNewick("((A,B,C),(D,E));", {});
  r.display.modifySelection([node(r.tree, "B")], "notshown", true, true, "true");
  r.display.toggleCollapse(r.tree.nodes.children[0]).update();
  const path = document.querySelector("#tree path.clade");
  test.ok(path, "collapsed clade path exists");
  const d = path.getAttribute("d");
  test.notOk(/NaN/.test(d), "no NaN in outline");
  const outline = r.tree.nodes.children[0].collapsed;
  test.equal(outline.length, 2 + 4, "2 visible tips + 4 points");
  test.ok(
    outline.every(function(p) { return Number.isFinite(p[0]) && Number.isFinite(p[1]); }),
    "outline points are finite"
  );
  restore();
  test.end();
});

tape("render-layout: unary node with hidden child and internal names", function(test) {
  const restore = setupDom();
  const r = renderNewick("((A:1)u:1,B:1,C:1,D:1)r;", { "internal-names": true });
  r.display.modifySelection([node(r.tree, "A")], "notshown", true, true, "true");
  r.display.update();
  const x = function(name) { return node(r.tree, name).x; };
  const xs = { B: x("B"), D: x("D") };
  test.ok(
    [x("B"), x("C"), x("r"), x("D")].every(Number.isFinite),
    "finite"
  );
  // the unary node is not shown: B, C, r (the root) and D take consecutive rows
  test.ok(x("B") < x("C") && x("C") < x("r") && x("r") < x("D"), "tips in order");
  test.ok(
    Math.abs(x("C") - x("B") - (x("r") - x("C"))) < 1e-6 &&
      Math.abs(x("r") - x("C") - (x("D") - x("r"))) < 1e-6,
    "evenly spaced rows: " + [x("B"), x("C"), x("r"), x("D")].join(",")
  );
  restore();
  // the hidden unary node takes no row: same rows as a tree without it
  const restoreRef = setupDom();
  const ref = renderNewick("(B:1,C:1,D:1)root;", { "internal-names": true });
  test.equal(xs.B, node(ref.tree, "B").x, "B is on the first row");
  test.equal(xs.D, node(ref.tree, "D").x, "D is on the last row");
  restoreRef();
  test.end();
});

tape("render-layout: single-node tree renders", function(test) {
  const restore = setupDom();
  test.doesNotThrow(function() {
    renderNewick("A;", {});
    test.notOk(/NaN/.test(document.querySelector("#tree").innerHTML), "no NaN");
    test.equal(document.querySelectorAll("#tree g.node").length, 1, "one node element");
  });
  restore();
  test.end();
});

tape("render-layout: rescale_nodeSpan is the minimum over all tips", function(test) {
  let restore = setupDom();
  let r = renderNewick("(C:1,D:1,(A:1,B:1):1);", { "node-span": function() { return 5; } });
  test.equal(r.display.rescale_nodeSpan, 5, "constant span");
  restore();
  restore = setupDom();
  const spans = { A: 0.5, C: 2 };
  r = renderNewick("(C:1,D:1,(A:1,B:1):1);", {
    "node-span": function(n) { return spans[n.data.name] || 4; }
  });
  test.equal(r.display.rescale_nodeSpan, 0.5, "nested tip with smallest span");
  restore();
  test.end();
});

tape("render-layout: zero branch lengths give no NaN", function(test) {
  const restore = setupDom();
  renderNewick("(A:0,B:0,C:0);", {});
  test.notOk(/NaN/.test(document.querySelector("#tree").innerHTML), "no NaN in svg");
  restore();
  test.end();
});

tape("render-layout: update() redraws links after topology change", function(test) {
  const restore = setupDom();
  const r = renderNewick("((A,B),(C,D));", {});
  r.tree.deleteANode(node(r.tree, "A"));
  r.display.update();
  test.equal(
    branchPaths().length,
    r.tree.nodes.links().length,
    "one path per current link"
  );
  restore();
  test.end();
});

tape("render-layout: malformed selection options do not throw", function(test) {
  const restore = setupDom();
  test.doesNotThrow(function() {
    renderNewick("((A,B),C);", { "selection-mode": "multi-set", "selection-sets": null });
  }, "null selection-sets");
  test.doesNotThrow(function() {
    renderNewick("((A,B),C);", {
      "selection-mode": "multi-set",
      "selection-sets": [{ name: "x", color: "#f00" }],
      "initial-sets": { x: "A" }
    });
  }, "non-array initial-sets entry");
  test.doesNotThrow(function() {
    renderNewick("((A,B),C);", { "initial-selection": "A" });
  }, "non-array initial-selection");
  restore();
  test.end();
});

tape("render-layout: right-to-left collapsed clade starts at its node", function(test) {
  const restore = setupDom();
  const r = renderNewick("((A,B),(C,D),E);", { layout: "right-to-left", transitions: false });
  const clade = r.tree.nodes.children[0];
  r.display.toggleCollapse(clade).update();
  test.ok(Array.isArray(clade.collapsed), "outline computed");
  test.ok(
    Math.abs(clade.collapsed[0][0] - clade.x) < 1e-6 &&
      Math.abs(clade.collapsed[0][1] - clade.y) < 1e-6,
    "first outline point equals the node position"
  );
  restore();
  test.end();
});

tape("render-layout: fontSize and scaleBarFontSize accessors", function(test) {
  const restore = setupDom();
  const d = renderNewick("((A,B),C);", {}).display;
  test.equal(d.fontSize(20), d, "fontSize setter returns display");
  test.equal(d.fontSize(), 20, "fontSize getter");
  test.equal(d.font_size, 20, "font_size field");
  test.equal(d.shown_font_size, 20, "shown_font_size updated");
  test.equal(d.scaleBarFontSize(15), d, "scaleBarFontSize setter returns display");
  test.equal(d.scaleBarFontSize(), 15, "scaleBarFontSize getter");
  test.equal(d.scale_bar_font_size, 15, "scale_bar_font_size field");
  restore();
  test.end();
});

tape("render-layout: style_edges(null) clears the styler", function(test) {
  const restore = setupDom();
  const d = renderNewick("((A,B),C);", {}).display;
  d.style_edges(function() {});
  let result;
  test.doesNotThrow(function() { result = d.style_edges(null); });
  test.equal(result, d, "returns the display");
  test.equal(d.style_edges(), null, "styler cleared");
  restore();
  test.end();
});
