import * as d3 from "d3";
import * as _ from "underscore";

// These methods are part of the Phylotree object

function refreshHierarchy(root) {
  root.eachBefore(n => {
    n.depth = n.parent ? n.parent.depth + 1 : 0;
  });
  root.eachAfter(n => {
    n.height = n.children
      ? 1 + Math.max(...n.children.map(c => c.height))
      : 0;
  });
}

function lengthAttr(l) {
  return l === null || l === undefined ? null : String(l);
}

export function graftANode(graftAt, newChild, newParent, lengths) {

  let nodes = this.nodes.descendants();

  if (graftAt.parent) {

    let nodeIndex = nodes.indexOf(graftAt);

    if (nodeIndex >= 0) {

      let parentIndex = graftAt.parent.children.indexOf(graftAt);

      let newSplit = d3.hierarchy({
          name: newParent,
          attribute: lengths ? lengthAttr(lengths[2]) : null,
          original_child_order: graftAt.data["original_child_order"]
        }),
        newNode = d3.hierarchy({
          name: newChild,
          attribute: lengths ? lengthAttr(lengths[1]) : null,
          original_child_order: 2
        });

      newSplit.parent = graftAt.parent;
      newNode.parent = newSplit;
      newSplit["children"] = [graftAt, newNode];
      graftAt["parent"].children[parentIndex] = newSplit;
      graftAt.parent = newSplit;
      graftAt.data["attribute"] = lengths ? lengthAttr(lengths[0]) : null;
      graftAt.data["original_child_order"] = 1;

      this.update(this.nodes);
      refreshHierarchy(this.nodes);
    }
  }

  return this;

}

export function addChild(parent, child) {

  child.parent = parent;

  if(parent.children) {
    parent.children.push(child);
  } else {
    parent["children"] = [child];
  }

  return parent;

}

export function createNode(name, lengths) {

  return d3.hierarchy({
    name: name,
    attribute: lengths ? lengths[1] : null
  });

}

/**
 * Delete a given node.
 *
 * @param {Node} The node to be deleted, or the index of such a node.
 * @returns The current ``phylotree``.
 */
export function deleteANode(index) {
  let nodes = this.nodes.descendants();

  if (typeof index != "number") {
    return this.deleteANode(nodes.indexOf(index));
  }

  if (index > 0 && index < nodes.length) {
    let node = nodes[index];

    if (node.parent) {
      // can only delete nodes that are not the root
      let delete_me_idx = node.parent.children.indexOf(node);

      if (delete_me_idx >= 0) {
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
          let sibling = node.parent.children[1 - delete_me_idx];

          if (node.parent.parent) {
            node.parent.parent.children[
              node.parent.parent.children.indexOf(node.parent)
            ] = sibling;
            sibling.parent = node.parent.parent;
          } else {
            // the parent is the root: lift the sibling's children, or keep a
            // leaf sibling as the sole child
            let root = node.parent;
            if (!sibling) {
              delete root.children;
            } else if (sibling.children) {
              root.children = sibling.children;
              root.children.forEach(function(d) {
                d.parent = root;
              });
            } else {
              root.children = [sibling];
            }
          }
        }

        this.update(this.nodes);
        refreshHierarchy(this.nodes);
      }
    }
  }

  return this;
}

/**
 * Get the tips of the tree
 * @returns {Array} Nodes in the current ``phylotree``.
 * @example
 * // Get all leaf nodes from a tree
 * const tree = new Phylotree("((A:0.1,B:0.2):0.05,C:0.3);");
 * const tips = tree.getTips();
 * console.log(tips.map(tip => tip.data.name)); // ["A", "B", "C"]
 * 
 * @example
 * // Count the number of taxa in the tree
 * const numTaxa = tree.getTips().length;
 * console.log(`Tree has ${numTaxa} taxa`);
 */
export function getTips() {
  // get all nodes that have no nodes
  return _.filter(this.nodes.descendants(), n => {
    return !_.has(n, "children");
  });
}

/**
 * Get the internal nodes of the tree
 * @returns {Array} Nodes in the current ``phylotree``.
 */
export function getInternals() {
  // get all nodes that have no nodes
  return _.filter(this.nodes.descendants(), n => {
    return _.has(n, "children");
  });
}


/**
 * Get the root node.
 *
 * @returns the current root node of the ``phylotree``.
 */
export function getRootNode() {
  return this.nodes;
}

/**
 * Get an array of all nodes.
 * @returns {Array} Nodes in the current ``phylotree``.
 */
export function getNodes() {
  return this.nodes;
}

/**
 * Get a node by name.
 *
 * @param {String} name Name of the desired node.
 * @returns {Node} Desired node.
 * @example
 * // Find a specific node by name
 * const tree = new Phylotree("((A:0.1,B:0.2):0.05,C:0.3);");
 * const nodeA = tree.getNodeByName("A");
 * console.log(nodeA.data.name); // "A"
 * 
 * @example
 * // Check if a node exists and get its branch length
 * const nodeB = tree.getNodeByName("B");
 * if (nodeB) {
 *   console.log(`Node B has branch length: ${nodeB.data.attribute}`);
 * }
 */
export function getNodeByName(name) {
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
 * @example
 * // Add species information to nodes
 * const tree = new Phylotree(newick);
 * tree.assignAttributes({
 *   "Human": { species: "Homo sapiens", host: "human" },
 *   "Chimp": { species: "Pan troglodytes", host: "chimpanzee" }
 * });
 * 
 * @example
 * // Add selection categories for visualization
 * tree.assignAttributes({
 *   "foreground_1": { category: "foreground", color: "red" },
 *   "foreground_2": { category: "foreground", color: "red" },
 *   "background_1": { category: "background", color: "blue" }
 * });
 */
export function assignAttributes(attributes) {
  //return nodes;
  // add annotations to each matching node
  _.each(this.nodes.descendants(), function(d) {
    if (d.data && (d.data.name in attributes)) {
      d["annotations"] = attributes[d.data.name];
    }
  });
}

/**
 * Determine if a given node is a leaf node.
 *
 * @param {Node} A node in a tree.
 * @returns {Bool} Whether or not the node is a leaf node.
 */
export function isLeafNode(node) {
  return !_.has(node, "children")
}

/**
 * Update a given key name in each node.
 *
 * @param {String} old_key The old key name.
 * @param {String} new_key The new key name.
 * @returns The current ``this``.
 */
export function updateKeyName(old_key, new_key) {
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

export function clearInternalNodes(respect) {
  if (!respect) {
    this.nodes.each(d => {
      if (!isLeafNode(d)) {

        // TODO: Move away from storing attribute data as root (BREAKS occasionally with d3>3)
        d[this.selection_attribute_name] = false;

        if(!d.data.traits) {
          d.data.traits = {};
        }
        d.data.traits[this.selection_attribute_name] = d[this.selection_attribute_name];

      }
    });
  }
}

/**
 * Select all descendents of a given node, with options for selecting
 * terminal/internal nodes.
 *
 * @param {Node} node The node whose descendents should be selected.
 * @param {Boolean} terminal Whether to include terminal nodes.
 * @param {Boolean} internal Whther to include internal nodes.
 * @returns {Array} An array of selected nodes.
 * @example
 * // Select all descendants of an internal node
 * const tree = new Phylotree("(((A,B)AB,(C,D)CD)ABCD,E);");
 * const internalNode = tree.getNodeByName("ABCD");
 * const allDescendants = tree.selectAllDescendants(internalNode, true, true);
 * console.log(allDescendants.map(n => n.data.name)); // ["AB", "A", "B", "CD", "C", "D"]
 * 
 * @example
 * // Select only terminal descendants (tips in a clade)
 * const cladeTips = tree.selectAllDescendants(internalNode, true, false);
 * console.log(cladeTips.map(n => n.data.name)); // ["A", "B", "C", "D"]
 * 
 * @example
 * // Select only internal descendants
 * const cladeInternals = tree.selectAllDescendants(internalNode, false, true);
 * console.log(cladeInternals.map(n => n.data.name)); // ["AB", "CD"]
 */
export function selectAllDescendants(node, terminal, internal) {

  let selection = [];

  function sel(d) {
    if (isLeafNode(d)) {
      if (terminal) {
        if (d != node) selection.push(d);
      }
    } else {
      if (internal) {
        if (d != node) selection.push(d);
      }
      d.children.forEach(sel);
    }
  }

  sel(node);
  return selection;
}

