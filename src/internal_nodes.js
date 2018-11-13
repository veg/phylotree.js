import * as _ from "underscore";
import * as inspector from "./inspectors";

export function internal_label (callback, respect_existing) {

  clear_internal_nodes(respect_existing);

  for (var i = self.nodes.length - 1; i >= 0; i--) {
    var d = self.nodes[i];
    if (
      !(
        inspector.is_leafnode(d) ||
        inspector.item_selected(d, selection_attribute_name)
      )
    ) {
      d[selection_attribute_name] = callback(d.children);
    }
  }

  this.modify_selection(function(d, callback) {
    if (inspector.is_leafnode(d.target)) {
      return d.target[selection_attribute_name];
    }
    return d.target[selection_attribute_name];
  });

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

export set_partitions = function(partitions) {
  this.partitions = partitions;
};

export get_partitions = function(attributes) {
  return this.partitions;
};


