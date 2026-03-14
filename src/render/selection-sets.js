/**
 * Multi-set selection management for phylotree
 * @module render/selection-sets
 */

/**
 * Initialize multi-set selection mode.
 * Called automatically during render when selection-mode is 'multi-set'.
 *
 * @param {Array<{name: string, color: string}>} sets - Array of selection set definitions.
 * @private
 */
export function initializeSelectionSets(sets) {
  this._selectionSets = {};
  this._activeSetName = null;

  sets.forEach(set => {
    this._selectionSets[set.name] = {
      name: set.name,
      color: set.color,
      members: new Set()
    };
  });

  // Set first set as active by default
  if (sets.length > 0) {
    this._activeSetName = sets[0].name;
  }

  // Inject CSS for set colors
  this._injectSetStyles(sets);
}

/**
 * Inject dynamic CSS styles for selection set colors.
 *
 * @param {Array<{name: string, color: string}>} sets - Array of selection set definitions.
 * @private
 */
export function _injectSetStyles(sets) {
  const styleId = "phylotree-selection-set-styles";
  let styleEl = document.getElementById(styleId);

  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const css = sets.map(set => {
    const safeName = set.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    return `
      .phylotree-set-${safeName} path.branch {
        stroke: ${set.color} !important;
      }
      .phylotree-set-${safeName} .node circle {
        fill: ${set.color} !important;
      }
      .phylotree-set-branch-${safeName} {
        stroke: ${set.color} !important;
      }
    `;
  }).join('\n');

  styleEl.textContent = css;
}

/**
 * Set the active selection set. Clicks will add nodes to this set.
 *
 * @param {string} name - Name of the set to activate.
 * @returns {this} For chaining.
 * @example
 * tree.setActiveSet('foreground');
 */
export function setActiveSet(name) {
  if (this._selectionSets && this._selectionSets[name]) {
    this._activeSetName = name;
  } else {
    console.warn(`Selection set '${name}' not found`);
  }
  return this;
}

/**
 * Get the currently active selection set name.
 *
 * @returns {string|null} Active set name or null if not in multi-set mode.
 * @example
 * const activeSet = tree.getActiveSet(); // 'foreground'
 */
export function getActiveSet() {
  return this._activeSetName;
}

/**
 * Get all members (nodes) of a selection set.
 *
 * @param {string} setName - Name of the selection set.
 * @returns {Node[]} Array of nodes in the set.
 * @example
 * const foregroundNodes = tree.getSetMembers('foreground');
 */
export function getSetMembers(setName) {
  if (!this._selectionSets || !this._selectionSets[setName]) {
    return [];
  }

  const memberNames = this._selectionSets[setName].members;
  return this.phylotree.nodes.descendants()
    .filter(node => memberNames.has(node.data.name));
}

/**
 * Add a node to a selection set.
 *
 * @param {Node|string} node - Node object or node name.
 * @param {string} setName - Target set name.
 * @returns {this} For chaining.
 * @example
 * tree.addToSet('HUMAN', 'foreground');
 * tree.addToSet(nodeObject, 'background');
 */
export function addToSet(node, setName) {
  if (!this._selectionSets || !this._selectionSets[setName]) {
    console.warn(`Selection set '${setName}' not found`);
    return this;
  }

  const nodeName = typeof node === "string" ? node : node.data.name;
  const nodeObj = typeof node === "string"
    ? this.phylotree.getNodeByName(node)
    : node;

  if (nodeObj) {
    // Remove from all other sets (mutually exclusive)
    Object.keys(this._selectionSets).forEach(otherSet => {
      this._selectionSets[otherSet].members.delete(nodeName);
    });

    this._selectionSets[setName].members.add(nodeName);
    nodeObj._selectionSet = setName;

    this.emit("setChange", {
      action: "add",
      set: setName,
      node: nodeObj,
      allSets: this._getSetsSummary()
    });

    this.refresh();
    this.update();
  }

  return this;
}

/**
 * Remove a node from a selection set.
 *
 * @param {Node|string} node - Node object or node name.
 * @param {string} setName - Target set name.
 * @returns {this} For chaining.
 * @example
 * tree.removeFromSet('HUMAN', 'foreground');
 */
export function removeFromSet(node, setName) {
  if (!this._selectionSets || !this._selectionSets[setName]) {
    return this;
  }

  const nodeName = typeof node === "string" ? node : node.data.name;
  const nodeObj = typeof node === "string"
    ? this.phylotree.getNodeByName(node)
    : node;

  if (this._selectionSets[setName].members.has(nodeName)) {
    this._selectionSets[setName].members.delete(nodeName);
    if (nodeObj) {
      delete nodeObj._selectionSet;
    }

    this.emit("setChange", {
      action: "remove",
      set: setName,
      node: nodeObj,
      allSets: this._getSetsSummary()
    });

    this.refresh();
    this.update();
  }

  return this;
}

/**
 * Get a summary of all sets and their members.
 *
 * @returns {Object} Object with set names as keys and arrays of node names as values.
 * @private
 */
export function _getSetsSummary() {
  const summary = {};
  if (this._selectionSets) {
    Object.keys(this._selectionSets).forEach(setName => {
      summary[setName] = Array.from(this._selectionSets[setName].members);
    });
  }
  return summary;
}

/**
 * Handle click in multi-set mode.
 * Adds the clicked node to the active set.
 *
 * @param {Node} node - The clicked node.
 * @private
 */
export function handleMultiSetClick(node) {
  if (!this._activeSetName || !this._selectionSets) {
    return;
  }

  const nodeName = node.data.name;
  const currentSet = node._selectionSet;

  if (currentSet === this._activeSetName) {
    // Already in active set, remove it
    this.removeFromSet(node, this._activeSetName);
  } else {
    // Add to active set (removes from other sets automatically)
    this.addToSet(node, this._activeSetName);
  }
}

/**
 * Check if a node belongs to a specific set.
 *
 * @param {Node} node - The node to check.
 * @param {string} setName - The set name to check.
 * @returns {boolean} True if node is in the set.
 */
export function isInSet(node, setName) {
  if (!this._selectionSets || !this._selectionSets[setName]) {
    return false;
  }
  return this._selectionSets[setName].members.has(node.data.name);
}

/**
 * Get the set name a node belongs to.
 *
 * @param {Node} node - The node to check.
 * @returns {string|null} The set name or null if not in any set.
 */
export function getNodeSet(node) {
  return node._selectionSet || null;
}
