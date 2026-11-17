// Regression tests for the unrooted (equal-angle) layout:
//
// 1. hidden (notshown) clades took up angle and extent, shrinking the tree;
// 2. a zero branch length was drawn as a unit length (`|| 1`);
// 3. a collapsed clade still took its full angular wedge;
// 4. a collapsed clade's outline was left in layout space, near the origin;
// 5. update() threw after collapsing a leaf (d.collapsed === true).
const tape = require("tape"),
  { JSDOM } = require("jsdom"),
  phylotree = require("../dist/phylotree");

const WIDTH = 900,
  HEIGHT = 900;

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

function renderTree(newick, options) {
  const tree = new phylotree.phylotree(newick);
  const display = tree.render(
    Object.assign(
      {
        container: "#tree",
        width: WIDTH,
        height: HEIGHT,
        brush: false,
        "show-menu": false,
        transitions: false
      },
      options || {}
    )
  );
  document.querySelector("#tree").appendChild(display.show());
  return display;
}

function byName(display, name) {
  return display.phylotree.nodes
    .descendants()
    .filter(n => n.data && n.data.name === name)[0];
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// 10 tips: clade H (4 tips) and 6 others
const TEN =
  "(((H1:1,H2:1):1,(H3:1,H4:1):1)H:1,((A:1,B:1):1,(C:1,D:1):1):1,(E:1,F:1):1);";

// 42 tips: a 32-tip balanced clade "BIG" and 10 others
function bigNewick() {
  const bal = (d, p) =>
    d === 0
      ? p + ":1"
      : "(" + bal(d - 1, p + "a") + "," + bal(d - 1, p + "b") + "):0.1";
  const small = [];
  for (let i = 0; i < 10; i++) small.push("S" + i + ":1");
  return (
    "((" + bal(4, "La") + "," + bal(4, "Lb") + ")BIG:1,(" + small.join(",") + "):1);"
  );
}
const BIG = bigNewick();

[
  ["unrooted", { "is-unrooted": true }],
  ["unrooted + radial option", { "is-unrooted": true, "is-radial": true }]
].forEach(function(o) {
  tape(o[0] + ": hidden clade does not shrink the visible tree", function(test) {
    const restore = setupDom();
    const display = renderTree(TEN, o[1]);
    byName(display, "H").notshown = true;
    display.update();
    const xs = display.phylotree.nodes
      .descendants()
      .filter(n => !n.children && !/^H/.test(n.data.name))
      .map(n => n.y);
    const span = Math.max.apply(null, xs) - Math.min.apply(null, xs);
    test.ok(span >= 0.5 * WIDTH, "shown x extent " + span + " >= 50% of width");
    restore();
    test.end();
  });
});

tape("unrooted: zero-length branch is drawn with zero length", function(test) {
  const restore = setupDom();
  const display = renderTree("((A:0,B:0.1):0,C:0.1);", { "is-unrooted": true });
  const root = display.phylotree.nodes;
  const inner = root.children[0];
  test.ok(
    dist(root, inner) < 1e-6,
    "internal node sits on the root: " + dist(root, inner)
  );
  restore();
  test.end();
});

tape("unrooted: zero-length internal branch keeps tips distinct", function(test) {
  const restore = setupDom();
  const display = renderTree(
    "((A:0.001,B:0.001):0,(C:0.001,D:0.001):0.001);",
    { "is-unrooted": true }
  );
  const A = byName(display, "A"),
    B = byName(display, "B");
  test.ok(dist(A, B) > 0, "A and B are distinct: " + dist(A, B));
  test.ok(
    dist(A.parent, display.phylotree.nodes) < 1e-6,
    "the zero-length clade root sits on the tree root"
  );
  test.ok(
    display.phylotree.nodes
      .descendants()
      .every(n => isFinite(n.x) && isFinite(n.y)),
    "all coordinates finite"
  );
  restore();
  test.end();
});

tape("unrooted: negative branch length does not go backwards", function(test) {
  const restore = setupDom();
  const display = renderTree("((A:1,B:1):-1,C:1);", { "is-unrooted": true });
  const root = display.phylotree.nodes;
  test.ok(dist(root, root.children[0]) < 1e-6, "negative length clamped to zero");
  restore();
  test.end();
});

tape("unrooted: collapsed clade gives its wedge back", function(test) {
  const restore = setupDom();
  const display = renderTree(BIG, { "is-unrooted": true });
  const big = byName(display, "BIG");
  test.equal(big.leaves().length, 32, "fixture clade has 32 tips");
  display.toggleCollapse(big).update();
  // the other clade's tips take the wedge the collapsed clade gave back
  const xs = display.phylotree.nodes
    .descendants()
    .filter(n => /^S/.test(n.data.name))
    .map(n => n.y);
  const span = Math.max.apply(null, xs) - Math.min.apply(null, xs);
  test.ok(span >= 0.3 * WIDTH, "x span " + span + " >= 30% of width");
  restore();
  test.end();
});

tape("unrooted: collapsed clade outline is in screen space at the node", function(test) {
  const restore = setupDom();
  const display = renderTree(BIG, { "is-unrooted": true });
  const big = byName(display, "BIG");
  display.toggleCollapse(big).update();
  const pts = big.collapsed;
  test.ok(Array.isArray(pts) && pts.length >= 3, "outline has points");
  test.deepEqual(pts[0], [big.x, big.y], "first point is the node, [x, y]");
  const size = display.size;
  test.ok(
    pts.every(p => p[0] >= 0 && p[0] <= size[0] && p[1] >= 0 && p[1] <= size[1]),
    "all points lie within the svg"
  );
  const paths = Array.prototype.slice.call(
    document.querySelectorAll("#tree path.clade")
  );
  test.equal(paths.length, 1, "one clade path");
  test.notOk(/NaN/.test(paths[0].getAttribute("d")), "no NaN");
  restore();
  test.end();
});

[false, true].forEach(function(transitions) {
  tape(
    "unrooted: collapsing a leaf does not throw (transitions " + transitions + ")",
    function(test) {
      const restore = setupDom();
      const display = renderTree(TEN, {
        "is-unrooted": true,
        transitions: transitions
      });
      const leaf = byName(display, "A");
      test.doesNotThrow(function() {
        display.toggleCollapse(leaf);
        display.update(true);
      }, "update after collapsing a tip");
      restore();
      test.end();
    }
  );
});
