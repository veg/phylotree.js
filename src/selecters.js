import * as _ from "underscore";

import * as inspector from "./inspectors";
import { def_branch_length_accessor } from "./branches";
import { def_node_label } from "./nodes";

// List of all selecters that can be used with the restricted-selectable option
export var predefined_selecters = {
  all: d => {
    return true;
  },
  none: d => {
    return false;
  },
  "all-leaf-nodes": d => {
    return inspector.is_leafnode(d.target);
  },
  "all-internal-nodes": d => {
    return !inspector.is_leafnode(d.target);
  }
};

export function path_to_root(node) {
  let selection = [];
  while (node) {
    selection.push(node);
    node = node.parent;
  }
  return selection;
}

/**
 * Getter/setter for the selection callback. This function is called
 * every time the current selection is modified, and its argument is
 * an array of nodes that make up the current selection.
 *
 * @param {Function} callback (Optional) The selection callback function.
 * @returns The current ``selection_callback`` if getting, or the current ``this`` if setting.
 */
export function selection_callback(callback) {
  if (!callback) return this.selection_callback;
  this.selection_callback = callback;
  return this;
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

  this.sync_edge_labels();
  return this;
}

/**
 * Get or set branch length accessor.
 *
 * @param {Function} attr Empty if getting, or new branch length accessor if setting.
 * @returns {Object} The branch length accessor if getting, or the current this if setting.
 */
export function branch_length(attr) {
  if (!arguments.length) return this.branch_length_accessor;
  this.branch_length_accessor = attr ? attr : def_branch_length_accessor;
  return this;
}

/**
 * Get or set branch name accessor.
 *
 * @param {Function} attr (Optional) If setting, a function that accesses a branch name
 * from a node.
 * @returns The ``node_label`` accessor if getting, or the current ``this`` if setting.
 */
export function branch_name(attr) {
  if (!arguments.length) return this.node_label;
  this.node_label = attr ? attr : def_node_label;
  return this;
}
