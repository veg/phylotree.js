/**
* Reroot the tree on the given node.
*
* @param {Node} node Node to reroot on.
* @param {fraction} if specified, partition the branch not into 0.5 : 0.5, but according to 
                   the specified fraction
                   
* @returns {Phylotree} The current ``phylotree``.
*/
export function reroot(node, fraction) {
  /** TODO add the option to root in the middle of a branch */

  fraction = fraction !== undefined ? fraction : 0.5;

  if (node.parent) {
    new_json = {
      name: "new_root",
      __mapped_bl: undefined,
      children: [node]
    };

    self.nodes.each(function(n) {
      n.__mapped_bl = branch_length_accessor(n);
    });

    phylotree.branch_length(function(n) {
      return n.__mapped_bl;
    });

    var remove_me = node,
      current_node = node.parent,
      stashed_bl = _.noop();

    var apportioned_bl =
      node.__mapped_bl === undefined
        ? undefined
        : node.__mapped_bl * fraction;
    stashed_bl = current_node.__mapped_bl;
    current_node.__mapped_bl =
      node.__mapped_bl === undefined
        ? undefined
        : node.__mapped_bl - apportioned_bl;
    node.__mapped_bl = apportioned_bl;

    var remove_idx;

    if (current_node.parent) {
      new_json.children.push(current_node);
      while (current_node.parent) {
        remove_idx = current_node.children.indexOf(remove_me);
        if (current_node.parent.parent) {
          current_node.children.splice(remove_idx, 1, current_node.parent);
        } else {
          current_node.children.splice(remove_idx, 1);
        }

        var t = current_node.parent.__mapped_bl;
        if (t !== undefined) {
          current_node.parent.__mapped_bl = stashed_bl;
          stashed_bl = t;
        }
        remove_me = current_node;
        current_node = current_node.parent;
      }
      remove_idx = current_node.children.indexOf(remove_me);
      current_node.children.splice(remove_idx, 1);
    } else {
      remove_idx = current_node.children.indexOf(remove_me);
      current_node.children.splice(remove_idx, 1);
      stashed_bl = current_node.__mapped_bl;
      remove_me = new_json;
    }

    // current_node is now old root, and remove_me is the root child we came up
    // the tree through

    if (current_node.children.length == 1) {
      if (stashed_bl) {
        current_node.children[0].__mapped_bl += stashed_bl;
      }
      remove_me.children = remove_me.children.concat(current_node.children);
    } else {
      var new_node = {
        name: "__reroot_top_clade"
      };
      new_node.__mapped_bl = stashed_bl;
      new_node.children = current_node.children.map(function(n) {
        return n;
      });

      remove_me.children.push(new_node);
    }

    phylotree.update_layout(new_json, true);
  }
  return phylotree;
};
