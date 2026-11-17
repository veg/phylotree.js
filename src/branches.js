import * as _ from "underscore";

// These methods are part of the Phylotree object

export function setPartitions(partitions) {
  this.partitions = partitions;
}

export function getPartitions(attributes) {
  return this.partitions;
}

/**
 * Returns T/F whether every branch in the tree has a branch length
 *
 * @returns {Object} true if  every branch in the tree has a branch length
 */
export default function hasBranchLengths() {

  let bl = this.branch_length_accessor;

  if (bl) {
    return _.every(this.nodes.descendants(), function(node) {
      return !node.parent || !_.isUndefined(bl(node));
    });

  }

  return false;
}

/**
 * Returns branch lengths
 *
 * @returns {Array} array of branch lengths
 */
export function getBranchLengths() {

  let bl = this.branch_length_accessor;
  // the root has no branch; its parsed length, if any, is not a branch length
  return _.map(this.nodes.descendants(), node => { return node.parent ? bl(node) : undefined});

}


export function defBranchLengthAccessor(_node, new_length) {

  let _node_data = _node.data;

  let attribute = _node_data["attribute"];

  if (
    typeof attribute === "number" ||
    ((typeof attribute === "string" || Array.isArray(attribute)) &&
      attribute.length)
  ) {

    if(new_length !== undefined && new_length !== null && isFinite(new_length)) {
      _node_data["attribute"] = String(new_length);
    }

    let bl = parseFloat(_node_data["attribute"]);

    if (!isNaN(bl)) {
      return Math.max(0, bl);
    }

  }

  // Allow for empty branch length at root
  if(_node_data.name == "root") {
    return 0;
  }

  console.warn('Undefined branch length at ' + _node_data.name + '!');

  return undefined;

}

/**
 * Get or set branch length accessor.
 *
 * @param {Function} attr Empty if getting, or new branch length accessor if setting.
 * @returns {Object} The branch length accessor if getting, or the current this if setting.
 * @example
 * // Set a custom branch length accessor
 * const tree = new Phylotree(newick);
 * tree.setBranchLength(function(node) {
 *   // Use a transformed branch length
 *   return Math.log(node.data.attribute + 1);
 * });
 * 
 * @example
 * // Set all branch lengths to 1 (equal branch lengths)
 * tree.setBranchLength(function(node) {
 *   return 1;
 * });
 * 
 * @example
 * // Get the current branch length accessor
 * const currentAccessor = tree.setBranchLength();
 */
export function setBranchLength(attr) {
  if (!arguments.length) return this.branch_length_accessor;
  this.branch_length_accessor = attr ? attr : defBranchLengthAccessor;
  this.branch_length = this.branch_length_accessor;
  return this;
}

/**
 * Normalizes branch lengths to range [0,1]
 * @returns {Phylotree} The current phylotree instance
 * @example
 * // Normalize all branch lengths to 0-1 range
 * const tree = new Phylotree(newick);
 * tree.normalizeBranchLengths();
 * // Now all branch lengths are between 0 and 1
 * 
 * @example
 * // Useful for comparing trees with different scales
 * const tree1 = new Phylotree(newick1).normalizeBranchLengths();
 * const tree2 = new Phylotree(newick2).normalizeBranchLengths();
 * // Both trees now have comparable branch length scales
 */
export function normalize(attr) {

  let lengths = finiteBranchLengths.call(this);

  const values = _.map(lengths, (d) => d[1]);
  const max_bl = _.max(values);
  const min_bl = _.min(values);

  let scaler = function (x) {
    if (max_bl === min_bl) {
      return max_bl === 0 ? 0 : 1;
    }
    return (x - min_bl)/(max_bl - min_bl);
  }

  return writeBranchLengths.call(this, lengths, scaler);

}

// [node, length] for every non-root node with a finite branch length
function finiteBranchLengths() {

  let bl = this.branch_length_accessor;

  return _.filter(
    _.map(this.nodes.descendants(), (node) => [node, node.parent ? bl(node) : undefined]),
    (d) => d[0].parent && Number.isFinite(d[1])
  );

}

// Store scaler(length) in each node's attribute. Lengths a custom accessor
// reads cannot be written back through it, so they are materialised and the
// default accessor is restored.
function writeBranchLengths(lengths, scaler) {

  let custom = this.branch_length_accessor !== defBranchLengthAccessor;

  _.each(lengths, (d) => {
    let len = scaler(d[1]);
    d[0].data.attribute = String(Number.isFinite(len) ? len : d[1]);
  });

  if (custom) {
    this.setBranchLength(defBranchLengthAccessor);
  }

  return this;

}


/**
 * Scales branch lengths using a custom transformation function
 *
 * @param {Function} scale_by Function that transforms each branch length
 * @returns {Phylotree} The current phylotree instance
 * @example
 * // Scale all branch lengths by a constant factor
 * const tree = new Phylotree(newick);
 * tree.scaleBranchLengths(function(length) {
 *   return length * 2; // Double all branch lengths
 * });
 * 
 * @example
 * // Apply logarithmic transformation
 * tree.scaleBranchLengths(function(length) {
 *   return Math.log10(length + 1);
 * });
 * 
 * @example
 * // Convert to time units (assuming substitutions per site)
 * const mutationRate = 1e-8;
 * tree.scaleBranchLengths(function(length) {
 *   return length / mutationRate; // Convert to years
 * });
 */
export function scale(scale_by) {

  return writeBranchLengths.call(this, finiteBranchLengths.call(this), scale_by);

}

/**
 * Get or set branch name accessor.
 *
 * @param {Function} attr (Optional) If setting, a function that accesses a branch name
 * from a node.
 * @returns The ``nodeLabel`` accessor if getting, or the current ``this`` if setting.
 */
export function branchName(attr) {
  if (!arguments.length) return this.nodeLabel;
  this.nodeLabel = attr;
  return this;
}
