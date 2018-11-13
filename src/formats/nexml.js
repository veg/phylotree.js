import * as _ from "underscore";
import {parseString} from 'xml2js';

var nexml_parser = function(xml_string, options) {
  var trees;
  parseString(xml_string, function(error, xml) {
    trees = xml["nex:nexml"].trees[0].tree.map(function(nexml_tree) {
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
      return node_hash[root_id];
    });
  });
  return trees;
};

export default nexml_parser;
