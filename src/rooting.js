import * as d3 from "d3";
import * as _ from "underscore";

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

  let nodes = this.nodes.descendants();

  fraction = fraction !== undefined ? fraction : 0.5;


  if (node.parent) {
    var new_json = d3.hierarchy({
      name: "new_root",
      //__mapped_bl: undefined,
      "children": [{
      	name : node.data.name
      }]
    });
    
    _.extendOwn (new_json.children[0], node);
    new_json.children[0].parent = new_json;
    

    nodes.forEach(n => {
      n.__mapped_bl = this.branch_length_accessor(n);
      n.data.__mapped_bl = this.branch_length_accessor(n);
    });

    this.set_branch_length(function(n) {
      return n.__mapped_bl || n.data.__mapped_bl;
    });


    let remove_me = node,
      current_node = node.parent,
      stashed_bl = _.noop();

    let apportioned_bl =
      node.__mapped_bl === undefined ? undefined : node.__mapped_bl * fraction;

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

        let t = current_node.parent.__mapped_bl;
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
      let new_node = new d3.hierarchy({ name: "__reroot_top_clade", __mapped_bl: stashed_bl });
      _.extendOwn (new_json.children[0], node);
      new_node.__mapped_bl = stashed_bl;
      new_node.children = current_node.children.map(function(n) {
        n.parent = new_node;
        return n;
      });
      new_node.parent = remove_me;
      remove_me.children.push(new_node);
     }
  }
  
  // need to traverse the nodes and update parents
  

  this.update(new_json);
  this.traverse_and_compute(n => {
    _.each (n.children, (c) => {c.parent = n;})
  }, "pre-order")
  return this;
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

export function path_to_root(node) {
  let selection = [];
  while (node) {
    selection.push(node);
    node = node.parent;
  }
  return selection;
}
