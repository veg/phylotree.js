export function graft_a_node(graft_at, new_child, new_parent, lengths) {

  if (graft_at.parent) {

    var node_index = self.nodes.indexOf(graft_at);
    if (node_index >= 0) {
      var parent_index = graft_at.parent.children.indexOf(graft_at);

      var new_split = {
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

      //phylotree.update_layout(self.nodes, true);
    }
  }

  return phylotree;

};

/**
 * Delete a given node.
 *
 * @param {Node} The node to be deleted, or the index of such a node.
 * @returns The current ``phylotree``.
 */
export function delete_a_node(index) {
  if (typeof index != "number") {
    return phylotree.delete_a_node(self.nodes.indexOf(index));
  }

  if (index > 0 && index < self.nodes.length) {
    var node = nodes[index];
    if (node.parent) {
      // can only delete nodes that are not the root
      var delete_me_idx = node.parent.children.indexOf(node);

      if (delete_me_idx >= 0) {
        self.nodes.splice(index, 1);
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
            self.nodes.splice(nodes.indexOf(node.parent), 1);
          } else {
            self.nodes.splice(0, 1);
            self.nodes.parent = null;
            delete self.nodes.data["attribute"];
            delete self.nodes.data["annotation"];
            delete self.nodes.data["original_child_order"];
            self.nodes.name = "root";
            self.nodes.data.name = "root";
          }
        }
        //phylotree.update_layout(self.nodes, true);
      }
    }
  }
  return phylotree;
};

export function update_has_hidden_nodes () {

  for (let k = self.nodes.length - 1; k >= 0; k -= 1) {
    if (inspector.is_leafnode(self.nodes[k])) {
      self.nodes[k].has_hidden_nodes = self.nodes[k].notshown;
    } else {
      self.nodes[k].has_hidden_nodes = self.nodes[k].children.reduce(function(
        p,
        c
      ) {
        return c.notshown || p;
      }, false);
    }
  }

  return phylotree;

};


