// Regression tests for the tree model: constructor input handling, mrca(),
// update(), reroot(), setBranchLength() and normalize/scale of branch lengths.
const tape = require("tape"),
  { JSDOM } = require("jsdom"),
  phylotree = require("../dist/phylotree");

const Phylotree = phylotree.phylotree;

tape("setBranchLength keeps branch_length and branch_length_accessor in sync", function (test) {
  const tree = new Phylotree("((A:0.1,B:0.2):0.3,C:0.4);");
  test.equal(tree.branch_length, tree.branch_length_accessor, "default");
  const fn = () => 2;
  tree.setBranchLength(fn);
  test.equal(tree.branch_length_accessor, fn);
  test.equal(tree.branch_length, tree.branch_length_accessor, "custom");

  const rerooted = new Phylotree("((A:0.1,B:0.2):0.3,C:0.4);");
  rerooted.reroot(rerooted.getNodeByName("A"));
  test.equal(rerooted.branch_length, rerooted.branch_length_accessor, "after reroot");
  test.end();
});

tape("constructor throws a clear error on unparseable input", function (test) {
  test.throws(() => new Phylotree("((("), /Unexpected|parse/i, "malformed newick");
  test.throws(() => new Phylotree(null), /parse|tree/i, "null");
  test.throws(() => new Phylotree(undefined), /parse|tree/i, "undefined");
  test.end();
});

tape("constructor accepts a JSON object without children and normalises names", function (test) {
  const tree = new Phylotree({ name: "solo", attribute: "0.1" });
  test.equal(tree.nodes.descendants().length, 1);

  const json = new Phylotree({
    children: [{ name: 5, attribute: "0.1" }, { attribute: "0.2", bootstrap_values: "" }],
  });
  const names = json.nodes.descendants().map((n) => n.data.name);
  test.deepEqual(names, ["", "5", ""], "undefined to '' and numbers to strings");
  test.equal(json.nodes.children[1].data.bootstrap_values, undefined);
  test.end();
});

tape("constructor routes PhyloXML strings to the phyloxml parser", function (test) {
  const dom = new JSDOM("");
  const had = global.DOMParser;
  global.DOMParser = dom.window.DOMParser;
  const xml =
    '<?xml version="1.0"?><phyloxml><phylogeny rooted="true"><clade><clade><name>A</name><branch_length>0.1</branch_length></clade><clade><name>B</name><branch_length>0.2</branch_length></clade></clade></phylogeny></phyloxml>';
  try {
    const tree = new Phylotree(xml);
    const tips = tree.getTips().map((n) => n.data.name).sort();
    test.deepEqual(tips, ["A", "B"]);
  } finally {
    if (had === undefined) delete global.DOMParser;
    else global.DOMParser = had;
  }
  test.end();
});

tape("mrca does not cache between calls", function (test) {
  const tree = new Phylotree("(((A,B)X,(C,D)Y)Z,E)R;");
  test.equal(tree.mrca(["A", "B"]).data.name, "X");
  test.equal(tree.mrca(["C", "D"]).data.name, "Y");
  test.equal(tree.mrca(["A", "C"]).data.name, "Z");
  test.equal(tree.mrca(["A", "E"]), tree.nodes);
  test.equal(tree.mrca(["A", "A", "B"]).data.name, "X", "duplicate names");
  test.equal(tree.mrca(["A"]).data.name, "A");
  test.end();
});

tape("update refreshes links, parents and depths", function (test) {
  const tree = new Phylotree("(((A:1,B:1):1,(C:1,D:1):1):1,E:1);");
  tree.reroot(tree.getNodeByName("C"));
  const nodes = tree.nodes.descendants();
  test.equal(tree.links.length, nodes.length - 1);
  nodes.forEach((n) => {
    (n.children || []).forEach((c) => {
      test.equal(c.parent, n);
      test.equal(c.depth, n.depth + 1);
    });
  });
  test.equal(tree.nodes.depth, 0);
  test.equal(
    tree.nodes.height,
    Math.max(...tree.getTips().map((t) => t.depth))
  );
  test.end();
});

tape("reroot on the root is a no-op", function (test) {
  const nwk = "((A:0.1,B:0.2):0.3,C:0.4);";
  const tree = new Phylotree(nwk);
  const before = tree.getNewick();
  tree.reroot(tree.nodes);
  test.equal(tree.getNewick(), before);
  test.equal(tree.getTips().length, 3);
  test.end();
});

tape("reroot never produces NaN branch lengths", function (test) {
  const tree = new Phylotree("(((A:1,B:1):1,C:1):1,(D:1,E:1):1);");
  tree.reroot(tree.getNodeByName("A"));
  test.notOk(/NaN/.test(tree.getNewick()), "newick has no NaN");
  tree.getBranchLengths().forEach((l) => test.ok(l === undefined || !isNaN(l)));

  // a node without __mapped_bl that receives a stashed length
  const t2 = new Phylotree("((A:1,B:1):2,C:1);");
  t2.reroot(t2.getNodeByName("C"));
  test.notOk(/NaN/.test(t2.getNewick()));
  test.end();
});

tape("defBranchLengthAccessor accepts numeric attributes and zero", function (test) {
  const tree = new Phylotree({
    name: "root",
    children: [
      { name: "A", attribute: 0.1 },
      { name: "B", attribute: "0.2" },
    ],
  });
  const a = tree.getNodeByName("A");
  test.equal(tree.branch_length_accessor(a), 0.1);
  test.equal(tree.branch_length_accessor(tree.nodes), 0, "root");
  tree.branch_length_accessor(a, 0);
  test.equal(tree.branch_length_accessor(a), 0, "zero is written");
  test.equal(a.data.attribute, "0");
  tree.branch_length_accessor(a, NaN);
  test.equal(tree.branch_length_accessor(a), 0, "non-finite ignored");
  test.end();
});

tape("normalizeBranchLengths maps shortest to 0 and longest to 1", function (test) {
  const tree = new Phylotree("((A:0.1,B:0.2):0.3,C:0.4);");
  tree.normalizeBranchLengths();
  const get = (n) => tree.branch_length_accessor(tree.getNodeByName(n));
  test.equal(get("A"), 0);
  test.equal(get("C"), 1);
  test.ok(Math.abs(get("B") - 1 / 3) < 1e-12);
  test.end();
});

tape("normalizeBranchLengths handles equal lengths", function (test) {
  const tree = new Phylotree("(A:1,B:1,C:1);");
  tree.normalizeBranchLengths();
  tree.getBranchLengths().forEach((l) => test.ok(Number.isFinite(l)));
  test.equal(tree.branch_length_accessor(tree.getNodeByName("A")), 1);

  const zeros = new Phylotree("(A:0,B:0,C:0);");
  zeros.normalizeBranchLengths();
  zeros.getBranchLengths().forEach((l) => test.equal(l, 0));
  test.end();
});

tape("normalize and scale materialise a custom accessor", function (test) {
  const tree = new Phylotree("((A:0.1,B:0.2):0.3,C:0.4);");
  tree.setBranchLength((n) => (n.parent ? 2 : 0));
  tree.normalizeBranchLengths();
  test.equal(tree.branch_length_accessor, tree.branch_length);
  const a = tree.getNodeByName("A");
  test.equal(tree.branch_length_accessor(a), 1, "equal custom lengths");
  test.equal(a.data.attribute, "1");

  const t2 = new Phylotree("((A:0.1,B:0.2):0.3,C:0.4);");
  t2.setBranchLength((n) => (n.parent ? 4 : 0));
  t2.scaleBranchLengths((x) => x / 2);
  test.equal(t2.getNodeByName("A").data.attribute, "2");
  test.equal(t2.branch_length_accessor(t2.getNodeByName("A")), 2);
  test.end();
});

tape("scaleBranchLengths applies the transform with the default accessor", function (test) {
  const tree = new Phylotree("((A:0.1,B:0.2):0.3,C:0.4);");
  tree.scaleBranchLengths((x) => x * 10);
  test.equal(tree.getNodeByName("A").data.attribute, "1");
  test.equal(tree.getNodeByName("C").data.attribute, "4");

  const logged = new Phylotree("((A:2,B:4):8,C:16);");
  logged.scaleBranchLengths(Math.log);
  test.equal(logged.getNodeByName("A").data.attribute, String(Math.log(2)));
  test.end();
});
