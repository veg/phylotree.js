/**
 * Return Newick string representation of a phylotree.
 *
 * @param {Function} annotator - Function to apply to each node, determining
 * what label is written (optional).
 * @returns {String} newick - Phylogenetic tree serialized as a Newick string.
 */
export function get_newick(annotator) {

  if (!annotator) annotator = d => d.name;
  function escape_string(nn) {
    var need_escape = /[\s\[\]\,\)\(\:\'\"]/;
    var enquote = need_escape.test(nn);
    return enquote ? "'" + nn.replace("'", "''") + "'" : nn;
  }

  function node_display(n) {
    if (!inspector.is_leafnode(n)) {
      element_array.push("(");
      n.children.forEach(function(d, i) {
        if (i) {
          element_array.push(",");
        }
        node_display(d);
      });
      element_array.push(")");
    }

    element_array.push(escape_string(node_label(n)));
    element_array.push(annotator(n));

    let bl = branch_length_accessor(n);

    if (bl !== undefined) {
      element_array.push(":" + bl);
    }
  }

  let element_array = [];

  annotator = annotator || "";
  node_display(this.nodes);

  return element_array.join("");

};


