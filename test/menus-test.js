// Regression tests for src/render/menus.js:
//
// * The "Hide this subtree" context-menu item must hide the whole subtree,
//   not just the clicked node. Hiding only the clicked node left its
//   descendants drawn with stale coordinates that the layout scaling
//   multiplied on every update().
// * modifySelection() with the "binary-selectable" option used to throw
//   because two forEach callbacks lost `this`.

const tape = require("tape"),
  { JSDOM } = require("jsdom"),
  phylotree = require("../dist/phylotree");

const NEWICK = "((A:0.1,B:0.2)AB:0.3,(C:0.4,D:0.5)CD:0.6);";

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

function findNode(tree, name) {
  return tree.nodes.descendants().find(function(n) {
    return n.data.name === name;
  });
}

// Names of nodes that have a drawn <g> element.
function drawnNodeNames() {
  const names = [];
  document.querySelectorAll("#tree svg g").forEach(function(el) {
    const d = el.__data__;
    if (d && d.data && !("source" in d) && d.parent) {
      names.push(d.data.name);
    }
  });
  return names.sort();
}

// Names of branch targets that have a drawn <path class="branch">.
function drawnBranchTargets() {
  const names = [];
  document.querySelectorAll("#tree svg path.branch").forEach(function(el) {
    names.push(el.__data__.target.data.name);
  });
  return names.sort();
}

function nodeTransforms(names) {
  const transforms = {};
  document.querySelectorAll("#tree svg g").forEach(function(el) {
    const d = el.__data__;
    if (d && d.data && names.indexOf(d.data.name) >= 0) {
      transforms[d.data.name] = el.getAttribute("transform");
    }
  });
  return transforms;
}

function allFinite(transforms) {
  return Object.keys(transforms).every(function(k) {
    const nums = (transforms[k] || "").match(/-?[\d.]+(e[-+]?\d+)?/gi) || [];
    return (
      nums.length >= 2 &&
      nums.every(function(n) {
        return isFinite(parseFloat(n)) && Math.abs(parseFloat(n)) < 1e5;
      })
    );
  });
}

function clickMenuItem(display, node, label) {
  display.nodeDropdownMenu(node, display.container, display, display.options, {
    clientX: 0,
    clientY: 0
  });
  const item = Array.from(
    document.querySelectorAll("#tree .phylotree-menu-item")
  ).find(function(el) {
    return el.textContent === label;
  });
  if (!item) return false;
  item.dispatchEvent(new window.MouseEvent("click"));
  return true;
}

function checkHideSubtree(test, radial) {
  const env = setupDom();
  const tree = new phylotree.phylotree(NEWICK);
  const display = tree.render({
    container: "#tree",
    brush: false, // d3-brush needs SVG geometry that jsdom does not implement
    "is-radial": radial
  });
  document.querySelector("#tree").appendChild(display.show());

  test.deepEqual(
    drawnBranchTargets(),
    ["A", "AB", "B", "C", "CD", "D"],
    "all branches drawn initially"
  );

  test.ok(
    clickMenuItem(display, findNode(tree, "AB"), "Hide this subtree"),
    "menu offers 'Hide this subtree' for AB"
  );

  test.deepEqual(
    drawnNodeNames(),
    ["C", "CD", "D"],
    "no node drawn for A, B or AB after hiding AB"
  );
  test.deepEqual(
    drawnBranchTargets(),
    ["C", "CD", "D"],
    "no branch drawn for A, B or AB after hiding AB"
  );

  const visible = ["C", "CD", "D"];
  const first = nodeTransforms(visible);
  test.ok(allFinite(first), "remaining node coordinates are finite");

  for (let i = 0; i < 3; i++) display.update();
  test.deepEqual(
    nodeTransforms(visible),
    first,
    "remaining node coordinates are stable across update() calls"
  );

  test.ok(
    clickMenuItem(display, tree.getRootNode(), "Show all descendant nodes"),
    "root menu offers 'Show all descendant nodes'"
  );
  test.deepEqual(
    drawnBranchTargets(),
    ["A", "AB", "B", "C", "CD", "D"],
    "'Show all descendant nodes' restores every branch"
  );
  test.ok(
    allFinite(nodeTransforms(["A", "B", "AB", "C", "CD", "D"])),
    "restored node coordinates are finite"
  );

  test.deepEqual(env.listenerErrors.map(String), [], "no listener errors");
  env.restore();
  test.end();
}

tape("'Hide this subtree' hides the whole subtree (linear layout)", function(test) {
  checkHideSubtree(test, false);
});

tape("'Hide this subtree' hides the whole subtree (radial layout)", function(test) {
  checkHideSubtree(test, true);
});

tape("modifySelection works with binary-selectable", function(test) {
  const env = setupDom();
  const tree = new phylotree.phylotree(NEWICK);
  const display = tree.render({
    container: "#tree",
    brush: false,
    "binary-selectable": true,
    "attribute-list": ["selected", "foreground"]
  });
  document.querySelector("#tree").appendChild(display.show());

  const counts = [];
  display.countHandler(function(c) {
    counts.push(c);
  });

  const tipA = findNode(tree, "A");

  test.doesNotThrow(function() {
    display.modifySelection([tipA]);
  }, "modifySelection([tip]) does not throw");
  test.equal(tipA.selected, true, "tip is selected");
  display.links.forEach(function(l) {
    if (l.target === tipA) test.equal(l.selected, true, "tip branch is selected");
  });

  test.doesNotThrow(function() {
    display.modifySelection(function(l) {
      return l.target.data.name === "C";
    });
  }, "modifySelection(fn) does not throw");
  const selected = display.links
    .filter(function(l) {
      return l.selected;
    })
    .map(function(l) {
      return l.target.data.name;
    });
  test.deepEqual(selected, ["C"], "function selection sets the expected branch");
  test.equal(findNode(tree, "C").selected, true, "selected node attribute is set");

  test.ok(
    counts.length > 0 &&
      counts.every(function(c) {
        return c.selected === 1;
      }),
    "count handler receives the selection counts"
  );

  test.deepEqual(env.listenerErrors.map(String), [], "no listener errors");
  env.restore();
  test.end();
});

tape("binary-selectable: hide/show menu items honour their mode", function(test) {
  const env = setupDom();
  const tree = new phylotree.phylotree(NEWICK);
  const display = tree.render({
    container: "#tree",
    brush: false,
    "binary-selectable": true,
    "attribute-list": ["selected"]
  });
  document.querySelector("#tree").appendChild(display.show());

  display.modifySelection([findNode(tree, "C")]);
  test.equal(findNode(tree, "C").selected, true, "C is selected");

  test.ok(
    clickMenuItem(display, findNode(tree, "A"), "Hide this node"),
    "menu offers 'Hide this node' for A"
  );
  test.deepEqual(drawnNodeNames(), ["AB", "B", "C", "CD", "D"], "A is hidden");
  test.equal(findNode(tree, "C").selected, true, "hiding a node keeps the selection");

  test.ok(
    clickMenuItem(display, findNode(tree, "AB"), "Hide this subtree"),
    "menu offers 'Hide this subtree' for AB"
  );
  test.deepEqual(
    drawnNodeNames(),
    ["C", "CD", "D"],
    "hiding AB keeps the already hidden A hidden"
  );
  ["A", "B", "AB"].forEach(function(name) {
    test.equal(findNode(tree, name).notshown, true, name + " is notshown");
  });
  test.ok(allFinite(nodeTransforms(["C", "CD", "D"])), "coordinates are finite");

  test.ok(
    clickMenuItem(display, tree.getRootNode(), "Show all descendant nodes"),
    "root menu offers 'Show all descendant nodes'"
  );
  test.deepEqual(
    drawnBranchTargets(),
    ["A", "AB", "B", "C", "CD", "D"],
    "'Show all descendant nodes' shows every branch"
  );
  ["A", "B", "AB", "C", "CD", "D"].forEach(function(name) {
    test.notOk(findNode(tree, name).notshown, name + " is shown");
  });
  test.equal(findNode(tree, "C").selected, true, "C is still selected");

  test.deepEqual(env.listenerErrors.map(String), [], "no listener errors");
  env.restore();
  test.end();
});

tape("binary-selectable: modifySelection honours mode 'true'/'false'", function(test) {
  const env = setupDom();
  const tree = new phylotree.phylotree(NEWICK);
  const display = tree.render({
    container: "#tree",
    brush: false,
    "binary-selectable": true,
    "attribute-list": ["selected"]
  });
  document.querySelector("#tree").appendChild(display.show());

  const tips = tree.getTips();
  display.modifySelection(tips, "tag", false, true, "true");
  display.modifySelection(tips, "tag", false, true, "true");
  test.ok(tips.every(function(n) { return n.tag === true; }), "'true' twice keeps tags set");
  display.modifySelection(tips, "tag", false, true, "false");
  display.modifySelection(tips, "tag", false, true, "false");
  test.ok(tips.every(function(n) { return n.tag === false; }), "'false' twice keeps tags cleared");
  display.modifySelection([tips[0]], "tag", false, true);
  test.equal(tips[0].tag, true, "default mode toggles");

  env.restore();
  test.end();
});
