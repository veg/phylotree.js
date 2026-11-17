const tape = require("tape"),
  phylotree = require("../dist/phylotree");

const tree = (nwk) => new phylotree.phylotree(nwk);

tape("graftANode creates hierarchy nodes", function (test) {
  const t = tree("(A:1,B:1);");
  t.graftANode(t.getNodeByName("A"), "X", "Y", [0.1, 0.2, 0.3]);
  const x = t.getNodeByName("X");
  test.ok(x, "grafted node is found");
  test.equal(x.parent.data.name, "Y");
  test.equal(x.data.attribute, "0.2");
  test.equal(t.getNodeByName("A").data.attribute, "0.1");
  test.equal(t.getNodeByName("Y").data.attribute, "0.3");
  test.equal(t.branch_length_accessor(x), 0.2, "length visible via accessor");
  test.ok(/X:0\.2/.test(t.getNewick()), "length in newick");
  test.equal(x.depth, 2);
  test.equal(t.getNodeByName("A").depth, 2);
  test.equal(t.getNodeByName("Y").depth, 1);
  test.equal(typeof x.descendants, "function", "is a d3 hierarchy node");
  test.end();
});

tape("neighborJoining returns a proper hierarchy", function (test) {
  const D = [
    [0, 5, 9, 9, 8],
    [5, 0, 10, 10, 9],
    [9, 10, 0, 8, 7],
    [9, 10, 8, 0, 3],
    [8, 9, 7, 3, 0],
  ];
  const nj = phylotree.neighborJoining(D, 5, ["A", "B", "C", "D", "E"]);
  test.ok(nj instanceof phylotree.phylotree);
  nj.getNodes().each((n) => {
    if (n.parent) {
      test.equal(n.depth, n.parent.depth + 1, "depth of " + n.data.name);
    }
  });
  test.ok(nj.getNodeByName("A").parent, "tips have parents");
  test.doesNotThrow(() => nj.getTips().map((n) => n.ancestors()));
  test.end();
});

tape("addChild sets the parent", function (test) {
  const t = tree("(A,B);");
  const c = t.createNode("C", [null, 1]);
  t.addChild(t.getNodeByName("A"), c);
  test.equal(c.parent.data.name, "A");
  test.end();
});

tape("deleteANode at the root", function (test) {
  let t = tree("((A,B),C);");
  t.deleteANode(t.getNodeByName("C"));
  test.deepEqual(t.getNodes().children.map((d) => d.data.name), ["A", "B"]);
  test.ok(t.getNodes().children.every((d) => d.parent === t.getNodes()));

  t = tree("(A,B);");
  t.deleteANode(t.getNodeByName("A"));
  test.deepEqual(t.getNodes().children.map((d) => d.data.name), ["B"]);
  test.equal(t.getNodeByName("A"), undefined);
  test.end();
});

tape("getTipLengths uses the branch length accessor", function (test) {
  const t = tree("(A:1,B:2);");
  t.setBranchLength((n) => 5);
  test.deepEqual(t.getTipLengths().map((d) => d.length), [5, 5]);
  test.end();
});

tape("leftChildRightSibling tolerates unary nodes", function (test) {
  const t = tree("((a)b,c);");
  test.doesNotThrow(() => phylotree.leftChildRightSibling(t.getNodes()));
  test.end();
});

tape("neighborJoining never joins a node with itself", function (test) {
  const Z = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const nwk = phylotree.neighborJoining(Z, 3, ["A", "B", "C"]).getNewick();
  test.notOk(/\(A:[^,]*,A:/.test(nwk), nwk);
  test.equal(nwk.match(/\bA\b/g).length, 1);
  test.end();
});

tape("getDistanceMatrix handles empty input and unequal lengths", function (test) {
  test.deepEqual(phylotree.getDistanceMatrix({}), {});
  const m = phylotree.getDistanceMatrix({ s1: "ACGT", s2: "AC" });
  test.deepEqual(m.s1, [0, 0]);
  test.deepEqual(m.s2, [0, 0]);
  const m2 = phylotree.getDistanceMatrix({ s1: "AC", s2: "ACGT" });
  test.deepEqual(m2.s1, [0, 0]);
  test.end();
});

tape("deleteANode refreshes depth", function (test) {
  const t = tree("((A,B),C);");
  t.deleteANode(t.getNodeByName("C"));
  test.equal(t.getNodeByName("A").depth, 1);
  test.equal(t.getNodeByName("B").depth, 1);
  test.end();
});
