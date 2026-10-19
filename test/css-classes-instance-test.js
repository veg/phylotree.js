// The "css-classes" option and css() must only affect the tree they are
// applied to; other trees on the same page keep the default class names.

const tape = require("tape"),
  { JSDOM } = require("jsdom"),
  phylotree = require("../dist/phylotree");

const NEWICK = "((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);";

function setupDom() {
  const dom = new JSDOM(
    '<!DOCTYPE html><div id="a"></div><div id="b"></div><div id="c"></div>'
  );
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

function renderInto(id, extra) {
  const tree = new phylotree.phylotree(NEWICK);
  const options = Object.assign(
    { container: "#" + id, brush: false }, // jsdom cannot drive d3-brush
    extra || {}
  );
  const display = tree.render(options);
  document.querySelector("#" + id).appendChild(display.show());
  return display;
}

function countIn(id, selector) {
  return document.querySelectorAll("#" + id + " " + selector).length;
}

tape("css-classes option does not leak between trees", function(test) {
  const env = setupDom();

  const a = renderInto("a");
  const b = renderInto("b", { "css-classes": { branch: "b-branch", node: "b-node" } });
  a.update();

  test.ok(countIn("b", "path.b-branch") > 0, "tree B uses its custom branch class");
  test.ok(countIn("b", "g.b-node") > 0, "tree B uses its custom node class");
  test.equal(countIn("a", ".b-branch"), 0, "tree A has no b-branch after update()");
  test.equal(countIn("a", ".b-node"), 0, "tree A has no b-node after update()");
  test.ok(countIn("a", "path.branch") > 0, "tree A keeps the default branch class");
  test.notEqual(a.css(), b.css(), "trees do not share one class map");
  test.equal(a.css().branch, "branch", "A.css().branch is the default");

  const c = renderInto("c");
  test.equal(c.css().branch, "branch", "a new tree C gets the default branch class");
  test.equal(countIn("c", ".b-branch"), 0, "tree C has no b-branch");
  test.ok(countIn("c", "path.branch") > 0, "tree C uses path.branch");

  env.restore();
  test.end();
});

tape("css() setter only changes its own tree", function(test) {
  const env = setupDom();

  const a = renderInto("a");
  const b = renderInto("b");
  b.css({ branch: "b-branch" });
  b.update();
  a.update();

  test.equal(b.css().branch, "b-branch", "B.css() reflects the change");
  test.equal(a.css().branch, "branch", "A.css() is unchanged");
  test.equal(countIn("a", ".b-branch"), 0, "tree A has no b-branch");
  test.equal(renderInto("c").css().branch, "branch", "a new tree gets the default");

  env.restore();
  test.end();
});

tape("css() overrides survive reroot()", function(test) {
  const env = setupDom();

  const tree = new phylotree.phylotree(NEWICK);
  const display = tree.render({
    container: "#a",
    brush: false, // jsdom cannot drive d3-brush
    "css-classes": { node: "opt-node" }
  });
  document.querySelector("#a").appendChild(display.show());
  display.css({ branch: "my-branch" });
  display.update();
  test.ok(countIn("a", "path.my-branch") > 0, "custom branch class before reroot");

  tree.reroot(tree.getNodeByName("C"));

  test.notEqual(tree.display, display, "reroot built a new TreeRender");
  test.equal(tree.display.css().branch, "my-branch", "css() override is kept");
  test.equal(tree.display.css().node, "opt-node", "option override is kept");
  test.ok(countIn("a", "path.my-branch") > 0, "custom branch class after reroot");
  test.equal(countIn("a", "path.branch"), 0, "no default branch class after reroot");
  test.ok(countIn("a", "g.opt-node") > 0, "option node class after reroot");

  env.restore();
  test.end();
});
