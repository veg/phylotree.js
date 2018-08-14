var phyloxml_parser = function(xml_string, options) {
  function parse_phyloxml(node, index) {
    if (node.clade) {
      node.clade.forEach(parse_phyloxml);
      node.children = node.clade;
      delete node.clade;
    }
    node.original_child_order = index + 1;

    if (node.branch_length) {
      node.attribute = node.branch_length[0];
    }
    if (node.taxonomy) {
      node.name = node.taxonomy[0].scientific_name[0];
    }
    node.annotation = "";
  }

  var tree_json;

  parseString(xml_string, function(error, xml) {
    tree_json = xml.phyloxml.phylogeny[0].clade[0];
    tree_json.name = "root";
    parse_phyloxml(tree_json);
  });

  return {
    json: tree_json,
    error: null
  };
};

module.exports = phyloxml_parser;
