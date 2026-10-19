// Regression test: in selection-mode 'multi-set', set membership must be keyed
// by node identity, not node.data.name. Unnamed internal nodes all share the
// name "", so tagging one used to make isInSet()/getSetMembers() report every
// unnamed internal node as a member while only the clicked one was coloured.

const tape = require("tape"),
  { JSDOM } = require("jsdom"),
  phylotree = require("../dist/phylotree");

// Install a jsdom window/document as globals, collecting errors thrown inside
// event listeners.
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
    window: dom.window,
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

function renderMultiSet(newick) {
  const tree = new phylotree.phylotree(newick);
  const display = tree.render({
    container: "#tree",
    brush: false, // d3-brush needs SVG geometry that jsdom does not implement
    "selection-mode": "multi-set",
    "selection-sets": [
      { name: "fg", color: "red" },
      { name: "bg", color: "blue" }
    ]
  });
  document.querySelector("#tree").appendChild(display.show());
  return { tree: tree, display: display };
}

function branchPathFor(node) {
  return Array.from(document.querySelectorAll("path.branch")).find(function(el) {
    return el.__data__ && el.__data__.target === node;
  });
}

function click(env, el) {
  el.dispatchEvent(new env.window.MouseEvent("click", { bubbles: true }));
}

tape("multi-set: clicking one unnamed internal branch tags only that node", function(test) {
  const env = setupDom();
  const { tree, display } = renderMultiSet("((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);");

  const internals = tree.getInternals().filter(function(n) {
    return n.parent;
  });
  test.equal(internals.length, 2, "two non-root internal nodes");
  const [tagged, other] = internals;

  const path = branchPathFor(tagged);
  test.ok(path, "found the <path> for the internal branch");
  click(env, path);

  test.deepEqual(env.listenerErrors.map(String), [], "no listener errors");
  test.equal(display.getSetMembers("fg").length, 1, "getSetMembers('fg') has one member");
  test.equal(display.getSetMembers("fg")[0], tagged, "the member is the clicked node");
  test.ok(display.isInSet(tagged, "fg"), "clicked node is in the set");
  test.notOk(display.isInSet(other, "fg"), "other unnamed internal node is not in the set");
  test.equal(
    document.querySelectorAll(".phylotree-set-branch-fg").length,
    display.getSetMembers("fg").length,
    "API agrees with the rendered colouring"
  );

  // Clicking again toggles it back out.
  click(env, branchPathFor(tagged));
  test.equal(display.getSetMembers("fg").length, 0, "second click removes the node");

  env.restore();
  test.end();
});

tape("multi-set: duplicate-named nodes do not share membership", function(test) {
  const env = setupDom();
  const { tree, display } = renderMultiSet("((X:0.1,B:0.2):0.3,(X:0.4,D:0.5):0.6);");

  const dups = tree.getTips().filter(function(n) {
    return n.data.name === "X";
  });
  test.equal(dups.length, 2, "two tips named X");

  click(env, branchPathFor(dups[1]));
  test.deepEqual(display.getSetMembers("fg"), [dups[1]], "only the clicked X is a member");
  test.notOk(display.isInSet(dups[0], "fg"), "the other X is not in the set");

  // Moving a node to another set removes it from the first one only.
  display.addToSet(dups[0], "bg");
  test.deepEqual(display.getSetMembers("bg"), [dups[0]], "bg holds the first X");
  test.deepEqual(display.getSetMembers("fg"), [dups[1]], "fg still holds the second X");

  // Name-based API still works for uniquely named nodes.
  display.addToSet("B", "fg");
  test.ok(display.isInSet(tree.getNodeByName("B"), "fg"), "addToSet accepts a name");
  display.removeFromSet("B", "fg");
  test.notOk(display.isInSet(tree.getNodeByName("B"), "fg"), "removeFromSet accepts a name");

  env.restore();
  test.end();
});
