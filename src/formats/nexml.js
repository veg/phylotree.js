import { XMLParser } from "fast-xml-parser";

// Returns the values of all keys whose local name (the part after any
// namespace prefix) is ``name``, as a flat array of objects.
function childrenByLocalName(obj, name) {
  var result = [];
  if (obj === null || typeof obj !== "object") {
    return result;
  }
  Object.keys(obj).forEach(function(key) {
    if (key.split(":").pop() === name) {
      result = result.concat(obj[key]);
    }
  });
  return result.filter(d => d !== null && typeof d === "object");
}

var nexml_parser = function(xml_string, options) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseAttributeValue: true
  });

  var trees = [];

  try {
    const xml = parser.parse(xml_string);

    var nexml = childrenByLocalName(xml, "nexml")[0];
    if (!nexml) {
      return { json: null, error: "no nexml element" };
    }

    // OTU id -> label
    var otu_labels = {};
    childrenByLocalName(nexml, "otus").forEach(function(otus) {
      childrenByLocalName(otus, "otu").forEach(function(otu) {
        if (otu.label !== undefined) {
          otu_labels[otu.id] = String(otu.label);
        }
      });
    });

    childrenByLocalName(nexml, "trees").forEach(function(trees_block) {
      childrenByLocalName(trees_block, "tree").forEach(function(nexml_tree) {
        var node_list = childrenByLocalName(nexml_tree, "node"),
          edge_list = childrenByLocalName(nexml_tree, "edge");
        if (node_list.length === 0) {
          return;
        }
        var node_hash = node_list.reduce(function(a, b) {
            b.edges = [];
            b.name =
              b.otu !== undefined && b.otu in otu_labels
                ? otu_labels[b.otu]
                : String(b.id);
            a[b.id] = b;
            return a;
          }, {}),
          roots = node_list.filter(d => d.root),
          root_id = roots.length > 0 ? roots[0].id : node_list[0].id;
        node_hash[root_id].name = "root";

        edge_list.forEach(function(edge) {
          node_hash[edge.source].edges.push(edge);
        });

        function parseNexml(node, index) {
          if (node.edges) {
            node.children = node.edges
              .filter(edge => edge.target in node_hash)
              .map(function(edge) {
                var child = node_hash[edge.target];
                child.attribute =
                  edge.length === undefined ? "" : String(edge.length);
                return child;
              });
            node.children.forEach(parseNexml);
            node.annotation = "";
          }
        }

        parseNexml(node_hash[root_id]);
        trees.push(node_hash[root_id]);
      });
    });
  } catch (e) {
    return { json: null, error: "could not parse nexml" };
  }

  return {
    json: trees[0] || null,
    error: trees.length > 0 ? null : "no trees"
  };
};

export default nexml_parser;
