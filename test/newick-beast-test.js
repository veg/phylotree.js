var tape = require("tape"),
  phylotree = require("../dist/phylotree");

const newickParser = phylotree.newickParser;

// drop the root's own branch length, which the accessor may default
const noRootLength = (s) => s.replace(/:[\d.]+;$/, ";");

tape("nhx type parses bracket annotations", function(test) {
  const t = new phylotree.phylotree("(A[&&NHX:S=x:name=foo],B);", { type: "nhx" });
  const a = t.getNodeByName("A");
  test.equal(a.data.S, "x");
  test.equal(a.data.nhx_name, "foo");
  test.equal(a.data.name, "A");
  test.equal(a.data.annotation, "");
  test.end();
});

tape("getNewick omits hidden children cleanly", function(test) {
  const t = new phylotree.phylotree("((A:1,B:1)X:1,(C:1,D:1)Y:1,E:1);");
  t.getNodeByName("A").notshown = true;
  test.equal(noRootLength(t.getNewick()), "((B:1)X:1,(C:1,D:1)Y:1,E:1);");
  t.getNodeByName("B").notshown = true;
  test.equal(noRootLength(t.getNewick()), "((C:1,D:1)Y:1,E:1);");
  test.end();
});

tape("getNewick keeps taxon named root and handles unnamed nodes", function(test) {
  const t = new phylotree.phylotree("(root,B,C);");
  test.equal(noRootLength(t.getNewick().replace(/:1/g, "")), "(root,B,C);");
  const t2 = new phylotree.phylotree("((A,B),C);");
  t2.nodes.children[0].data.name = undefined;
  test.doesNotThrow(() => t2.getNewick());
  test.end();
});

tape("newick parser rejects empty input and keeps root label", function(test) {
  test.equal(newickParser(null).json, null);
  test.ok(newickParser(undefined).error);
  const r = newickParser("(A,B)R:0.5;");
  test.equal(r.json.name, "R");
  test.equal(r.json.attribute, "0.5");
  const t = new phylotree.phylotree("(A:1,B:1)R:0.5;");
  test.equal(t.nodes.data.name, "R");
  test.equal(t.getNewick(), "(A:1,B:1)R:0.5;");
  test.end();
});

tape("unlabeled internal nodes have no bootstrap_values", function(test) {
  const r = newickParser("((A,B),C);");
  test.equal(r.json.children[0].bootstrap_values, undefined);
  const r2 = newickParser("((A,B)90,C);");
  test.equal(r2.json.children[0].bootstrap_values, "90");
  test.end();
});

tape("beast parser does not mutate options or crash on bad input", function(test) {
  const opts = { type: "beast" };
  const t = new phylotree.phylotree("(A[&rate=1.5]:1,B:1);", opts);
  test.equal(t.getNodeByName("A").data.beast.rate, 1.5);
  test.deepEqual(opts, { type: "beast" });
  try {
    new phylotree.phylotree(null, { type: "beast" });
  } catch (e) {
    test.notOk(/annotation|null|undefined/.test(e.message), "no null-deref: " + e.message);
  }
  test.end();
});
