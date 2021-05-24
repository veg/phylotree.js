import * as _ from "lodash";

export function postOrder(node, callback, backtrack) {

  let nodes = [node],
    next = [],
    children,
    i,
    n;

  while ((node = nodes.pop())) {
    if (!(backtrack && backtrack(node))) {
      next.push(node), (children = node.children);
      if (children)
        for (i = 0, n = children.length; i < n; ++i) {
          nodes.push(children[i]);
        }
    }
  }

  while ((node = next.pop())) {
    callback(node);
  }

  return node;

}

export function preOrder(node, callback, backtrack) {
  let nodes = [node],
    children,
    i;

  while ((node = nodes.pop())) {
    if (!(backtrack && backtrack(node))) {
      callback(node), (children = node.children);
      if (children)
        for (i = children.length - 1; i >= 0; --i) {
          nodes.push(children[i]);
        }
    }
  }

  return node;
}

export default function inOrder(node, callback, backtrack) {
  let current,
    next = [node],
    children,
    i,
    n;

  do {
    (current = next.reverse()), (next = []);
    while ((node = current.pop())) {
      if (!(backtrack && backtrack(node))) {
        callback(node), (children = node.children);
        if (children)
          for (i = 0, n = children.length; i < n; ++i) {
            next.push(children[i]);
          }
      }
    }
  } while (next.length);

  return node;
}

/**
 * Traverses a tree that represents left-child right-sibling
 * @param {Object} tree -- the phylotree.js tree object 
 * @return {Object} An edge list that represents the original multi-way tree
 *
 */
export function leftChildRightSibling(root) {

  let declareTrueParent = function(n) {

    if(n.children) {
      // left child is the child
      n.children[0].data.multiway_parent = n;

      // right child is the sibling
      n.children[1].data.multiway_parent = n.parent;
    }

  }

  // First decorate each node with its true parent node
  postOrder(root, declareTrueParent);

  // return edge list
  let edge_list = _.map(root.descendants(), n => { 

    let source = n.data.multiway_parent; 
    let name = "unknown";

    if(source) {
      name = source.data.name;
    }

    // In order to get the true name of the infector/infectee, we must traverse
    // the tree from the multiway_parents node.

    return {"source" : n.data.multiway_parent, "target" : n, "name": name } });

  // Construct edge list by new parent-child listing
  return edge_list;

}



