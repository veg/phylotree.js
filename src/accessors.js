export function internal_names = function(attr) {
  if (!arguments.length) return options["internal-names"];
  options["internal-names"] = attr;
  return this;
};

export function radial(attr) {
  if (!arguments.length) return options["is-radial"];
  options["is-radial"] = attr;
  return this;
};

export function show_internal_name (node) {

  const i_names = this.internal_names();

  if (i_names) {
    if (typeof i_names === "function") {
      return i_names(node);
    }
    return i_names;
  }

  return false;

};

export function align_tips = function(attr) {
  if (!arguments.length) return options["align-tips"];
  options["align-tips"] = attr;
  return phylotree;
};

/**
 * Return the bubble size of the current node.
 *
 * @param {Node} A node in the phylotree.
 * @returns {Float} The size of the bubble associated to this node.
 */
export function node_bubble_size = function(node) {
  return options["draw-size-bubbles"]
    ? relative_node_span(node) * scales[0] * 0.5
    : 0;
};


export function shift_tip = function(d) {
  if (options["is-radial"]) {
    return [
      (d.text_align == "end" ? -1 : 1) * (radius_pad_for_bubbles - d.radius),
      0
    ];
  }
  if (options["right-to-left"]) {
    return [right_most_leaf - d.screen_x, 0];
  }
  return [right_most_leaf - d.screen_x, 0];
};

/**
 * Get nodes which are currently selected.
 *
 * @returns {Array} An array of nodes that match the current selection.
 */
export function get_selection() {
  return this.nodes.filter(function(d) {
    return d[selection_attribute_name];
  });
};

export function count_handler(attr) {
  if (!arguments.length) return count_listener_handler;
  count_listener_handler = attr;
  return phylotree;
};

export function layout_handler(attr) {
  if (!arguments.length) return layout_listener_handler;
  layout_listener_handler = attr;
  return phylotree;
};

/**
 * Get or set the current node span. If setting, the argument should
 * be a function of a node which returns a number, so that node spans
 * can be determined dynamically. Alternatively, the argument can be the
 * string ``"equal"``, to give all nodes an equal span.
 *
 * @param {Function} attr Optional; if setting, the node_span function.
 * @returns The ``node_span`` if getting, or the current ``phylotree`` if setting.
 */
export function node_span (attr) {
  if (!arguments.length) return node_span;
  if (typeof attr == "string" && attr == "equal") {
    node_span = function(d) {
      return 1;
    };
  } else {
    node_span = attr;
  }
  return phylotree;
};

export function set_partitions(partitions) {
  this.partitions = partitions;
};

export function get_partitions(attributes) {
  return this.partitions;
};

/**
 * Return tags that were read when parsing the original Newick string.
 *
 * @returns An array of strings, comprising each tag that was read.
 */
export function get_parsed_tags() {
  return parsed_tags;
};

/**
 * Get the tips of the tree
 * @returns {Array} Nodes in the current ``phylotree``.
 */
export function get_tips() {
  // get all nodes that have no nodes
  return _.filter(self.nodes, n => {
    return !_.has(n, "children");
  });
};

/**
 * Get the root node.
 *
 * @returns the current root node of the ``phylotree``.
 */
export function get_root_node() {
  // TODO
  return self.nodes[0];
}

/**
 * Get an array of all nodes.
 * @returns {Array} Nodes in the current ``phylotree``.
 */
export function get_nodes() {
  return this.nodes;
};


/**
 * Get a node by name.
 *
 * @param {String} name Name of the desired node.
 * @returns {Node} Desired node.
 */
export function get_node_by_name (name) {
  // TODO
  return _.findWhere(self.nodes, { name: name });
};

/**
 * Add attributes to nodes. New attributes will be placed in the
 * ``annotations`` key of any nodes that are matched.
 *
 * @param {Object} attributes An object whose keys are the names of nodes
 * to modify, and whose values are the new attributes to add.
 */
export function assign_attributes (attributes) {
  //return nodes;
  // add annotations to each matching node
  _.each(self.nodes, function(d) {
    if (_.indexOf(_.keys(attributes), d.name) >= 0) {
      d["annotations"] = attributes[d.name];
    }
  });
};

export function reclass_node (node) {

  var class_var =
    css_classes[inspector.is_leafnode(node) ? "node" : "internal-node"];

  if (inspector.item_tagged(node)) {
    class_var += " " + css_classes["tagged-node"];
  }

  if (inspector.item_selected(node, selection_attribute_name)) {
    class_var += " " + css_classes["selected-node"];
  }

  if (!node["parent"]) {
    class_var += " " + css_classes["root-node"];
  }

  if (inspector.is_node_collapsed(node) || inspector.has_hidden_nodes(node)) {
    class_var += " " + css_classes["collapsed-node"];
  }

  return class_var;

};

export function reclass_edge(edge) {

  let class_var = css_classes["branch"];

  if (inspector.item_tagged(edge)) {
    class_var += " " + css_classes["tagged-branch"];
  }

  if (inspector.item_selected(edge, selection_attribute_name)) {
    class_var += " " + css_classes["selected-branch"];
  }

  return class_var;

};

/**
 * Getter/setter for the selection label. Useful when allowing
 * users to make multiple selections.
 *
 * @param {String} attr (Optional) If setting, the new selection label.
 * @returns The current selection label if getting, or the current ``phylotree`` if setting.
 */
export function selection_label(attr) {
  if (!arguments.length) return selection_attribute_name;
  selection_attribute_name = attr;
  phylotree.sync_edge_labels();
  return phylotree;
};

export function sync_edge_labels() {

  links.forEach(function(d) {
    d[selection_attribute_name] = d.target[selection_attribute_name] || false;
    d.tag = d.target.tag || false;
  });

  d3_phylotree_trigger_refresh(phylotree);

  if (this.count_handler()) {
    let counts = {};

    counts[selection_attribute_name] = links.reduce(function(p, c) {
      return p + (c[selection_attribute_name] ? 1 : 0);
    }, 0);

    counts["tagged"] = links.reduce(function(p, c) {
      return p + (inspector.item_tagged(c) ? 1 : 0);
    }, 0);

    d3_phylotree_trigger_count_update(
      phylotree,
      counts,
      phylotree.count_handler()
    );
  }
};

