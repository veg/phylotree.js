/**
 * Event emitter mixin for phylotree TreeRender
 * Provides on/off/emit pattern for tree events
 * @module render/event-emitter
 */

/**
 * Register an event listener
 * @param {string} eventName - Event name (nodeClick, branchClick, nodeHover,
 *                             contextMenu, rendered, selectionChange, collapsed, rerooted)
 * @param {Function} callback - Handler function
 * @returns {this} For chaining
 * @example
 * tree.on('nodeClick', (node, event) => console.log(node.data.name));
 * tree.on('selectionChange', (selectedNodes) => updatePanel(selectedNodes));
 */
export function on(eventName, callback) {
  if (!this._eventListeners) {
    this._eventListeners = {};
  }
  if (!this._eventListeners[eventName]) {
    this._eventListeners[eventName] = [];
  }
  this._eventListeners[eventName].push(callback);
  return this;
}

/**
 * Remove an event listener
 * @param {string} eventName - Event name
 * @param {Function} callback - Handler to remove (must be same reference)
 * @returns {this} For chaining
 * @example
 * const handler = (node) => console.log(node);
 * tree.on('nodeClick', handler);
 * tree.off('nodeClick', handler);
 */
export function off(eventName, callback) {
  if (this._eventListeners && this._eventListeners[eventName]) {
    this._eventListeners[eventName] = this._eventListeners[eventName]
      .filter(cb => cb !== callback);
  }
  return this;
}

/**
 * Emit an event to all registered listeners
 * @param {string} eventName - Event name
 * @param {...*} args - Arguments to pass to listeners
 * @returns {this} For chaining
 * @private
 */
export function emit(eventName, ...args) {
  if (this._eventListeners && this._eventListeners[eventName]) {
    this._eventListeners[eventName].forEach(callback => {
      try {
        callback.apply(this, args);
      } catch (e) {
        console.error(`Error in ${eventName} event handler:`, e);
      }
    });
  }
  return this;
}
