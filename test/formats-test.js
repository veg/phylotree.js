var fs = require("fs");
var _ = require("underscore");

var tape = require("tape"),
    phylotree = require("../build/phylotree");

tape("NEXUS parse", function(test) {

  let nwk = String(fs.readFileSync(__dirname + "/data/apternodus.tre"));
  let phylo = new phylotree.phylotree(nwk, { type: "nexus" });

  let annotation_file = __dirname + "/data/apternodus.chars.small.nexus";
  let annotations = String(fs.readFileSync(annotation_file));

  let anno = phylotree.parse_annotations(annotations);
  test.equal(_.keys(anno.matrix).length, 30);

  // load annotations
  phylotree.load_annotations(phylo, 'char', anno);

  //test.equal(max, 235);
  test.end();

});

tape("Annotated Newick parse", function(test) {
  let nwk = fs.readFileSync(__dirname + "/data/CD2-relax.new").toString();
  let phylo = new phylotree.phylotree(nwk);

  let test_leaves = ["Pig", "Cow", "Horse", "Cat"];
  test_leaves.forEach(function(leaf) {
    let node = phylo.get_node_by_name(leaf);
    test.equal(node.data.name, leaf);
    test.equal(node.data.annotation, "Test");
  });

  let reference_leaves = ["RhMonkey", "Baboon", "Human", "Chimp"];
  reference_leaves.forEach(function(leaf) {
    let node = phylo.get_node_by_name(leaf);
    test.equal(node.data.name, leaf);
    test.equal(node.data.annotation, "Reference");
  });

  test.assert(phylo.parsed_tags.length == 2);
  test.assert(phylo.parsed_tags.includes("Test"));
  test.assert(phylo.parsed_tags.includes("Reference"));

  test.end();
});
