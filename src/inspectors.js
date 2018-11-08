//TODO : move to render
export function item_selected(item, tag) {
  return item[tag] || false;
}

//TODO : move to render
export function node_visible(node) {
  return !(node.hidden || node.notshown || false);
}

//TODO : move to render
export function node_notshown(node) {
  return node.notshown;
}

//TODO : move to render
export function edge_visible(edge) {
  return !(edge.target.hidden || edge.target.notshown || false);
}

export function item_tagged(item) {
  return item.tag || false;
}

/**
 * Determine if a given node is a leaf node.
 *
 * @param {Node} A node in a tree.
 * @returns {Bool} Whether or not the node is a leaf node.
 */
export function is_leafnode(node) {
  return !(node.children && node.children.length);
}

export function has_hidden_nodes(node) {
  return node.has_hidden_nodes || false;
}

export function is_node_collapsed(node) {
  return node.collapsed || false;
}

export function node_css_selectors(css_classes) {

  return [
    css_classes["node"],
    css_classes["internal-node"],
    css_classes["collapsed-node"],
    css_classes["tagged-node"],
    css_classes["root-node"]
  ].reduce(function(p, c, i, a) {
    return (p += "g." + c + (i < a.length - 1 ? "," : ""));
  }, "");

}

export function edge_css_selectors(css_classes) {
  return [
    css_classes["branch"],
    css_classes["selected-branch"],
    css_classes["tagged-branch"]
  ].reduce(function(p, c, i, a) {
    return (p += "path." + c + (i < a.length - 1 ? "," : ""));
  }, "");
}

export function clade_css_selectors(css_classes) {
  return [css_classes["clade"]].reduce(function(p, c, i, a) {
    return (p += "path." + c + (i < a.length - 1 ? "," : ""));
  }, "");
}

export function rootpath(attr_name, store_name) {

  attr_name = attr_name || "attribute";
  store_name = store_name || "y_scaled";

  if ("parent" in this) {

    let my_value = parseFloat(this[attr_name]);

    this[store_name] =
      this.parent[store_name] + (isNaN(my_value) ? 0.1 : my_value);

  } else {

    this[store_name] = 0.0;

  }

  return this[store_name];

}

