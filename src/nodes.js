import * as _ from "underscore";
import * as inspector from "./inspectors";
import * as accessors from "./accessors";

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
            node.parent.children[1 - delete_me_idx].parent =
              node.parent.parent;
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

export function update_has_hidden_nodes () {

  let nodes = this.nodes.descendants();

  for (let k = nodes.length - 1; k >= 0; k -= 1) {

    if (inspector.is_leafnode(nodes[k])) {
      nodes[k].has_hidden_nodes = nodes[k].notshown;
    } else {
      nodes[k].has_hidden_nodes = nodes[k].children.reduce(function(
        p,
        c
      ) {
        return c.notshown || p;
      }, false);
    }
  }

  return this;

}

export function def_node_label(_node) {

  _node = _node.data;

  if (inspector.is_leafnode(_node)) {
    return _node.name || "";
  }

  if (this.show_internal_name(_node)) {
    return _node.name;
  }

  return "";
}


