import * as _ from "underscore";

// These methods are part of the Phylotree object

export function graft_a_node(graft_at, new_child, new_parent, lengths) {
  let nodes = this.nodes.descendants();

  if (graft_at.parent) {
    let node_index = nodes.indexOf(graft_at);

    if (node_index >= 0) {
      let parent_index = graft_at.parent.children.indexOf(graft_at);

      let new_split = {
          name: new_parent,
          parent: graft_at.parent,
          attribute: lengths ? lengths[2] : null,
          original_child_order: graft_at["original_child_order"]
        },
        new_node = {
          name: new_child,
          parent: new_split,
          attribute: lengths ? lengths[1] : null,
          original_child_order: 2
        };

      new_split["children"] = [graft_at, new_node];
      graft_at["parent"].children[parent_index] = new_split;
      graft_at.parent = new_split;
      graft_at["attribute"] = lengths ? lengths[0] : null;
      graft_at["original_child_order"] = 1;
    }
  }

  return this;
}

/**
 * Delete a given node.
 *
 * @param {Node} The node to be deleted, or the index of such a node.
 * @returns The current ``phylotree``.
 */
export function delete_a_node(index) {
  let nodes = this.nodes.descendants();

  if (typeof index != "number") {
    return this.delete_a_node(nodes.indexOf(index));
  }

  if (index > 0 && index < nodes.length) {
    let node = nodes[index];

    if (node.parent) {
      // can only delete nodes that are not the root
      let delete_me_idx = node.parent.children.indexOf(node);

      if (delete_me_idx >= 0) {
        nodes.splice(index, 1);

        if (node.children) {
          node.children.forEach(function(d) {
            d["original_child_order"] = node.parent.children.length;
            node.parent.children.push(d);
            d.parent = node.parent;
          });
        }

        if (node.parent.children.length > 2) {
          node.parent.children.splice(delete_me_idx, 1);
        } else {
          if (node.parent.parent) {
            node.parent.parent.children[
              node.parent.parent.children.indexOf(node.parent)
            ] =
              node.parent.children[1 - delete_me_idx];
            node.parent.children[1 - delete_me_idx].parent = node.parent.parent;
            nodes.splice(nodes.indexOf(node.parent), 1);
          } else {
            nodes.splice(0, 1);
            nodes.parent = null;
            delete nodes.data["attribute"];
            delete nodes.data["annotation"];
            delete nodes.data["original_child_order"];
            nodes.name = "root";
            nodes.data.name = "root";
          }
        }
      }
    }
  }

  return this;
}

export function node_label(_node) {
  _node = _node.data;

  if (is_leafnode(_node)) {
    return _node.name || "";
  }

  return "";
}

/**
 * Get the tips of the tree
 * @returns {Array} Nodes in the current ``phylotree``.
 */
export function get_tips() {
  // get all nodes that have no nodes
  return _.filter(this.nodes.descendants(), n => {
    return !_.has(n, "children");
  });
}

/**
 * Get the root node.
 *
 * @returns the current root node of the ``phylotree``.
 */
export function get_root_node() {
  return this.nodes;
}

/**
 * Get an array of all nodes.
 * @returns {Array} Nodes in the current ``phylotree``.
 */
export function get_nodes() {
  return this.nodes;
}

/**
 * Get a node by name.
 *
 * @param {String} name Name of the desired node.
 * @returns {Node} Desired node.
 */
export function get_node_by_name(name) {
  return _.filter(this.nodes.descendants(), d => {
    return d.data.name == name;
  })[0];
}

/**
 * Add attributes to nodes. New attributes will be placed in the
 * ``annotations`` key of any nodes that are matched.
 *
 * @param {Object} attributes An object whose keys are the names of nodes
 * to modify, and whose values are the new attributes to add.
 */
export function assign_attributes(attributes) {
  //return nodes;
  // add annotations to each matching node
  _.each(this.nodes, function(d) {
    if (_.indexOf(_.keys(attributes), d.name) >= 0) {
      d["annotations"] = attributes[d.name];
    }
  });
}

/**
 * Determine if a given node is a leaf node.
 *
 * @param {Node} A node in a tree.
 * @returns {Bool} Whether or not the node is a leaf node.
 */
export function is_leafnode(node) {
  return !node.children;
}

/**
 * Update a given key name in each node.
 *
 * @param {String} old_key The old key name.
 * @param {String} new_key The new key name.
 * @returns The current ``this``.
 */
export function update_key_name(old_key, new_key) {
  this.nodes.each(function(n) {
    if (old_key in n) {
      if (new_key) {
        n[new_key] = n[old_key];
      }
      delete n[old_key];
    }
  });

  return this;
}
