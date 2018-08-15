/**
 * A parser for augur. This is a separate function
 * Compatible with augur schema v2
 * strain - name
 */
var augur_parser = function(json, options) {

  var tree = json.tree;

  // transformations
  // strain -> id
  // initial key needs to be id
  // strain -> label
  // strain -> name
  
  // iterate through each child and annotate
  function decorate_nodes(node, index) {

    node.annotation = "";
    node.id = node.strain;
    node.label = node.strain;
    node.name = node.strain;

    if (node.children) {
      node.children.forEach(decorate_nodes);
    }
  }

  decorate_nodes(tree);
  tree.root = "true";

  return {
    json: tree,
    error: null
  };

};

module.exports = augur_parser;
