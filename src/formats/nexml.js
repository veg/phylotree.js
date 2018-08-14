const parseString = require("xml2js").parseString;

/**
 * A parser for NexML. This is a separate function, since NeXML objects
 * can contain multiple trees. Results should be passed into a phylotree
 * object, as shown in the examples.
 *
 * @param {Object} nexml - A NeXML string.
 * @returns {Object} trees - An array of trees contained in the NeXML object.
 */
var nexml_parser = function(xml_string, options) {
  var trees;
  parseString(xml_string, function(error, xml) {
    trees = xml["nex:nexml"].trees[0].tree.map(function(nexml_tree) {
      console.log(nexml_tree);
      var node_list = nexml_tree.node.map(d => d.$),
        node_hash = node_list.reduce(function(a, b) {
          b.edges = [];
          b.name = b.id;
          a[b.id] = b;
          return a;
        }, {}),
        roots = node_list.filter(d => d.root),
        root_id = roots > 0 ? roots[0].id : node_list[0].id;
      node_hash[root_id].name = "root";

      nexml_tree.edge.map(d => d.$).forEach(function(edge) {
        node_hash[edge.source].edges.push(edge);
      });

      function parse_nexml(node, index) {
        if (node.edges) {
          var targets = _.pluck(node.edges, "target");
          node.children = _.values(_.pick(node_hash, targets));
          node.children.forEach(function(child, i) {
            child.attribute = node.edges[i].length || "";
          });
          node.children.forEach(parse_nexml);
          node.annotation = "";
        }
      }

      parse_nexml(node_hash[root_id]);
      console.log(node_hash);
      return node_hash[root_id];
    });
  });
  return trees;
};

module.exports = nexml_parser;
