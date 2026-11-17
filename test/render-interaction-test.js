// Regression tests for render-interaction fixes: modifySelection with
// attribute-list / restricted-selectable / selectable:false, element
// containers, selection sets surviving a reroot, reserved annotation names,
// and internal-names predicates / unnamed internal nodes.
const tape = require("tape"),
  { JSDOM } = require("jsdom"),
  phylotree = require("../dist/phylotree");

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
      if (saved[name]) Object.defineProperty(global, name, saved[name]);
      else delete global[name];
    });
    dom.window.close();
  };
}

function renderTree(tree, options) {
  const display = tree.render(
    Object.assign(
      { container: "#tree", width: 600, height: 400, brush: false, "show-menu": false },
      options
    )
  );
  document.querySelector("#tree").appendChild(display.show());
  return display;
}

const NEWICK = "((A:1,B:1)X1:1,(C:1,D:1)Y1:1)R;";

tape("attribute-list: assigning b elsewhere keeps a; same node is exclusive", function(t) {
  const restore = setupDom();
  try {
    [false, true].forEach(function(useFn) {
      const tree = new phylotree.phylotree(NEWICK);
      const display = renderTree(tree, {
        "binary-selectable": true,
        "attribute-list": ["a", "b"]
      });
      const A = tree.getNodeByName("A"), B = tree.getNodeByName("B");
      const sel = function(node) {
        return useFn ? function(d) { return d.target === node; } : [node];
      };
      display.modifySelection(sel(A), "a", false, true, "true");
      display.modifySelection(sel(B), "b", false, true, "true");
      const label = useFn ? " (function)" : " (array)";
      t.equal(A.a, true, "A.a kept when b assigned to B" + label);
      t.equal(B.b, true, "B.b set" + label);
      display.modifySelection(sel(A), "b", false, true, "true");
      t.equal(A.b, true, "A.b set" + label);
      t.notEqual(A.a, true, "A.a cleared when b assigned to A" + label);
    });
  } finally {
    restore();
  }
  t.end();
});

tape("restricted-selectable: modifySelection chains and hide works", function(t) {
  const restore = setupDom();
  try {
    const tree = new phylotree.phylotree(NEWICK);
    const display = renderTree(tree, { "restricted-selectable": ["all"] });
    const A = tree.getNodeByName("A");
    t.equal(display.modifySelection("not-a-selecter"), display, "unknown selecter returns display");
    t.equal(display.modifySelection([A], "notshown", false, true, "true"), display, "hide returns display");
    t.equal(A.notshown, true, "A is notshown");
  } finally {
    restore();
  }
  t.end();
});

tape("selectable:false: notshown still applies", function(t) {
  const restore = setupDom();
  try {
    const tree = new phylotree.phylotree(NEWICK);
    const display = renderTree(tree, { selectable: false });
    const A = tree.getNodeByName("A");
    display.modifySelection([A], "notshown", false, true, "true");
    t.equal(A.notshown, true, "A.notshown is true");
  } finally {
    restore();
  }
  t.end();
});

tape("node menu works with an element container", function(t) {
  const restore = setupDom();
  try {
    const tree = new phylotree.phylotree(NEWICK);
    const el = document.querySelector("#tree");
    const display = tree.render({
      container: el, width: 600, height: 400, brush: false, "show-menu": true
    });
    el.appendChild(display.show());
    const A = tree.getNodeByName("A");
    t.doesNotThrow(function() {
      display.nodeDropdownMenu(A, el, display, display.options, { clientX: 5, clientY: 5 });
    }, "menu opens");
  } finally {
    restore();
  }
  t.end();
});

tape("selection sets survive a reroot", function(t) {
  const restore = setupDom();
  try {
    const tree = new phylotree.phylotree(NEWICK);
    const display = renderTree(tree, {
      "selection-mode": "multi-set",
      "selection-sets": [{ name: "fg", color: "red" }, { name: "bg", color: "blue" }],
      "initial-sets": { fg: ["A"] }
    });
    display.setActiveSet("bg");
    display.removeFromSet("A", "fg");
    display.addToSet("B", "bg");
    tree.reroot(tree.getNodeByName("C"));
    const d2 = tree.display;
    t.deepEqual(d2.getSetMembers("bg").map(n => n.data.name), ["B"], "bg members persist");
    t.deepEqual(d2.getSetMembers("fg"), [], "initial-sets not re-applied");
    t.equal(d2.getActiveSet(), "bg", "active set restored");
  } finally {
    restore();
  }
  t.end();
});

tape("reserved annotation names do not corrupt nodes", function(t) {
  const restore = setupDom();
  try {
    const tree = new phylotree.phylotree("((A,B){children},C);", { bracket_annotations: true });
    t.doesNotThrow(function() { renderTree(tree, {}); }, "render does not throw");
    t.ok(Array.isArray(tree.nodes.children), "root children intact");
    const ab = tree.nodes.children[0];
    t.ok(Array.isArray(ab.children) && ab.children.length === 2, "annotated node children intact");
  } finally {
    restore();
  }
  t.end();
});

tape("internal-names predicate receives the hierarchy node", function(t) {
  const restore = setupDom();
  try {
    const tree = new phylotree.phylotree(NEWICK);
    let display;
    t.doesNotThrow(function() {
      display = renderTree(tree, { "internal-names": n => n.data.name.startsWith("X") });
    }, "renders");
    const X1 = tree.getNodeByName("X1");
    t.equal(display.nodeLabel().call(display, X1), "X1", "X1 has a label");
    t.equal(display.nodeLabel().call(display, tree.getNodeByName("Y1")), "", "Y1 has none");
  } finally {
    restore();
  }
  t.end();
});

tape("internal-names with unnamed internal nodes does not throw", function(t) {
  const restore = setupDom();
  try {
    const tree = new phylotree.phylotree({
      json: {
        name: "r",
        children: [{ children: [{ name: "A" }, { name: "B" }] }, { name: "C" }]
      }
    });
    t.doesNotThrow(function() { renderTree(tree, { "internal-names": true }); }, "renders");
  } finally {
    restore();
  }
  t.end();
});

tape("selection sets ignore malformed definitions", function(t) {
  const restore = setupDom();
  try {
    const tree = new phylotree.phylotree(NEWICK);
    let display;
    t.doesNotThrow(function() {
      display = renderTree(tree, {
        "selection-mode": "multi-set",
        "selection-sets": [null, {}, { name: "fg", color: "red" }],
        "initial-sets": { fg: ["A"] }
      });
    });
    t.deepEqual(display.getSetMembers("fg").map(n => n.data.name), ["A"]);
  } finally {
    restore();
  }
  t.end();
});

tape("initial-sets wait for set definitions", function(t) {
  const restore = setupDom();
  try {
    const tree = new phylotree.phylotree(NEWICK);
    renderTree(tree, { "selection-mode": "multi-set", "initial-sets": { fg: ["A"] } });
    const display = renderTree(tree, {
      "selection-mode": "multi-set",
      "selection-sets": [{ name: "fg", color: "red" }],
      "initial-sets": { fg: ["A"] }
    });
    t.deepEqual(display.getSetMembers("fg").map(n => n.data.name), ["A"], "applied on the first render that has sets");
  } finally {
    restore();
  }
  t.end();
});
