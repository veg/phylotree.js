var fs = require("fs");

var tape = require("tape"),
    phylotree = require("../dist/phylotree");


tape("pairwise distances", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  let pairwise_distance = phylotree.pairwise_distances(phylo);
  test.equal(pairwise_distance, 274)
  test.end();

});

tape("center of tree", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  let center = phylotree.centerOfTree(phylo, 1);

  test.equal(center.breakpoint, 0)
  test.end();

});

tape("root to tip", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);

  phylotree.rootToTip(phylo);

  let tip = phylo.getNodeByName("Riyadh_2_2012_KF600652_human_2012-10-30");

  test.ok(Math.abs(tip.data.rootToTip - 0.0019604097) <= .0001)
  test.end();

});

tape("should compute midpoint", function(test) {

  let newick_string = String(fs.readFileSync(__dirname + "/data/MERS.txt"));
  let phylo = new phylotree.phylotree(newick_string);
  let midpoint = phylotree.computeMidpoint(phylo);

  test.equal(midpoint.location.data.name, 'D998_15_KX108943_camel_2015-04-23');
  test.end();

});

tape("should compute sackin's index", function(test) {

  let newick_string = "(a : 0.1, (b : 0.11, (c : 0.12, (d: 0.12, (e : 0.12, f : 0.13) : 0.14) : 0.15) : 0.16) : 0.16)";
  let phylo = new phylotree.phylotree(newick_string);

  test.equal(phylotree.sackin(phylo), 20);
  test.end();

});

tape("slatkin-maddison test", function(test) {

  let newick_string = "(a : 0.1, (b : 0.11, (c : 0.12, (d: 0.12, (e : 0.12, f : 0.13) : 0.14) : 0.15) : 0.16) : 0.16)";
  let phylo = new phylotree.phylotree(newick_string);

  test.equal(phylotree.sackin(phylo), 20);
  test.end();

});


tape("computeMidpoint resets state and honors the branch length accessor", function(test) {

  let phylo = new phylotree.phylotree("((A:1,B:2):3,(C:4,D:5):1,E:0.5);");
  phylo.normalizeBranchLengths();
  test.doesNotThrow(function() { phylotree.computeMidpoint(phylo); });

  let fresh = new phylotree.phylotree("((A:1,B:2):3,(C:4,D:5):1,E:0.5);");
  let first = phylotree.computeMidpoint(fresh);
  let second = phylotree.computeMidpoint(fresh);
  test.equal(first.location, second.location);
  test.equal(first.breakpoint, second.breakpoint);

  let t = new phylotree.phylotree("(A:1,B:1,C:1);");
  t.setBranchLength(function(n) { return n.data.name === "A" ? 10 : 1; });
  test.equal(phylotree.computeMidpoint(t).location.data.name, "A");

  // stale state: long lengths first, then shrink them and recompute
  let nwk = "((A:1,B:2):3,(C:4,D:5):1,E:0.5);";
  let scale = function(k) { return function(n) { return (n.data.attribute ? +n.data.attribute : 0) * k; }; };
  let stale = new phylotree.phylotree(nwk);
  stale.setBranchLength(scale(100));
  phylotree.computeMidpoint(stale);
  stale.setBranchLength(function(n) { return n.data.name === "E" ? 50 : (n.data.attribute ? +n.data.attribute : 0); });
  let got = phylotree.computeMidpoint(stale);
  let ref = new phylotree.phylotree(nwk);
  ref.setBranchLength(function(n) { return n.data.name === "E" ? 50 : (n.data.attribute ? +n.data.attribute : 0); });
  let want = phylotree.computeMidpoint(ref);
  test.equal(got.location.data.name || got.location.data.attribute, want.location.data.name || want.location.data.attribute);
  test.equal(got.breakpoint, want.breakpoint);
  test.end();

});

tape("centerOfTree on zero-length tree is not NaN", function(test) {

  let phylo = new phylotree.phylotree("(A:0,B:0);");
  let c = phylotree.centerOfTree(phylo);
  test.notOk(isNaN(c.breakpoint));
  test.end();

});

tape("pairwise distances guard bad input", function(test) {

  test.doesNotThrow(function() { phylotree.pairwise_distances(new phylotree.phylotree("A:1;")); });
  let phylo = new phylotree.phylotree("(A:1,B:2);");
  phylo.setBranchLength(function() { return NaN; });
  test.throws(function() { phylotree.pairwise_distances(phylo); });
  test.end();

});

tape("root to tip uses accessor and handles degenerate input", function(test) {

  let phylo = new phylotree.phylotree("(A:1,B:1);");
  phylo.setBranchLength(function(n) { return n.data.name === "A" ? 5 : 1; });
  phylotree.rootToTip(phylo);
  test.equal(phylo.getNodeByName("A").data.rootToTip, 5);

  let one = new phylotree.phylotree("(A_2020-01-01:1,B:1);");
  phylotree.extractDates(one);
  let fit;
  test.doesNotThrow(function() { fit = phylotree.fitRootToTip(one); });
  test.equal(fit.root, one.getRootNode());

  let none = new phylotree.phylotree("A:1;");
  test.doesNotThrow(function() { phylotree.rootToTip(none); });
  test.end();

});

tape("sackin uses current depth after reroot", function(test) {

  let phylo = new phylotree.phylotree("((a,b),(c,(d,e)))");
  test.equal(phylotree.sackin(phylo), 12);
  phylo.reroot(phylo.getNodeByName("d"));
  test.equal(phylotree.sackin(phylo), 14);
  test.end();

});

tape("extractDates default getter", function(test) {

  let phylo = new phylotree.phylotree("(A_2020-03-15:1,B_2019-01-02:1,C:1);");
  phylotree.extractDates(phylo);
  test.ok(phylo.getNodeByName("A_2020-03-15").data.decimal_date_value > 2020);
  test.ok(phylo.getNodeByName("B_2019-01-02").data.decimal_date_value > 2019);
  test.equal(phylo.getNodeByName("C").data.date_value, null);
  test.end();

});

tape("fitRootToTip returns a null fit when the dates cannot support one", function(test) {

  let undated = new phylotree.phylotree("(A:1,B:2);");
  let result = phylotree.fitRootToTip(undated);
  test.equal(result.root, undated.getRootNode());
  test.equal(result.fit, null, "no dates");

  let same = new phylotree.phylotree("(A:1,B:2);");
  same.getTips().forEach(function(tip) { tip.data.decimal_date_value = 2020; });
  test.equal(phylotree.fitRootToTip(same).fit, null, "identical dates");

  let dated = new phylotree.phylotree("(A:1,B:2);");
  dated.getNodeByName("A").data.decimal_date_value = 2019;
  dated.getNodeByName("B").data.decimal_date_value = 2020;
  let fit = phylotree.fitRootToTip(dated).fit;
  test.ok(fit && Number.isFinite(fit.slope), "a real fit has a finite slope");
  test.end();

});

tape("fitRootToTip accepts numeric-string dates and rejects degenerate distances", function(test) {

  let strings = new phylotree.phylotree("(A:1,B:2);");
  strings.getNodeByName("A").data.decimal_date_value = "2019";
  strings.getNodeByName("B").data.decimal_date_value = "2020";
  let fit = phylotree.fitRootToTip(strings).fit;
  test.ok(fit && Number.isFinite(fit.slope), "string dates are coerced");

  let zeros = new phylotree.phylotree("(A:0,B:0);");
  zeros.getNodeByName("A").data.decimal_date_value = 2019;
  zeros.getNodeByName("B").data.decimal_date_value = 2020;
  let result = phylotree.fitRootToTip(zeros);
  test.ok(result.fit === null || Number.isFinite(result.fit.slope), "no non-finite fit is reported");
  test.end();

});

tape("fitRootToTip keeps a perfect current root and ignores non-date values", function(test) {

  let perfect = new phylotree.phylotree("(A:1,B:2,C:3);");
  [["A", 2020], ["B", 2021], ["C", 2022]].forEach(function(d) {
    perfect.getNodeByName(d[0]).data.decimal_date_value = d[1];
  });
  let result = phylotree.fitRootToTip(perfect);
  test.equal(result.root, perfect.getRootNode(), "the current root is already the best");
  test.equal(result.fit.slope, 1);

  let zeros = new phylotree.phylotree("(A:0,B:0);");
  zeros.getNodeByName("A").data.decimal_date_value = 2019;
  zeros.getNodeByName("B").data.decimal_date_value = 2020;
  test.equal(phylotree.fitRootToTip(zeros).fit, null, "identical distances give no fit");

  [" ", false, true].forEach(function(bad) {
    let one = new phylotree.phylotree("(A:1,B:2);");
    one.getNodeByName("A").data.decimal_date_value = 2019;
    one.getNodeByName("B").data.decimal_date_value = bad;
    test.equal(phylotree.fitRootToTip(one).fit, null, JSON.stringify(bad) + " is not a date");
  });
  test.end();

});
