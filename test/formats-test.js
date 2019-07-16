var fs = require("fs");
var _ = require("underscore");

var tape = require("tape"),
    phylotree = require("../build/phylotree");

function almost_equal(a, b) {
  return Math.abs(a-b) < 1e-12;
}

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

tape("BEAST newick parse", function(test) {
  let nwk = fs.readFileSync(__dirname + "/data/beast.new").toString();
  let phylo = new phylotree.phylotree(nwk, {type: "beast"});
  const beast_data = phylo.get_node_by_name('3').data.beast;

  // A few numeric values
  test.assert(almost_equal(beast_data.b_u_N_median, 0.0));
  test.assert(almost_equal(beast_data.height, 183.0));
  test.assert(almost_equal(beast_data.rate, 1.5534619045323535e-4));
  test.assert(almost_equal(beast_data.b_u_S, 0.4209532274191756));

  // A few range values
  test.assert(almost_equal(beast_data.length_range[0], 0.03853438110971297));
  test.assert(almost_equal(beast_data.length_range[1], 53.880386929648125));
  test.assert(almost_equal(beast_data.b_u_S_95_HPD[0], 0.0));
  test.assert(almost_equal(beast_data.b_u_S_95_HPD[1], 2.0));
  test.assert(almost_equal(beast_data.rate_range[0], 4.226667008668073E-6));
  test.assert(almost_equal(beast_data.rate_range[1], 0.0032956729455445935));
  test.assert(almost_equal(beast_data.b_u_N_range[0], 0.0));
  test.assert(almost_equal(beast_data.b_u_N_range[1], 10.0));
  test.end();
});
