// List of all selecters that can be used with the restricted-selectable option
predefined_selecters = {
  all: d => {
    return true;
  },
  none: d => {
    return false;
  },
  "all-leaf-nodes": d => {
    return inspector.is_leafnode(d.target);
  },
  "all-internal-nodes": d => {
    return !inspector.is_leafnode(d.target);
  }
};

/**
 * Modify the current selection, via functional programming.
 *
 * @param {Function} node_selecter A function to apply to each node, which
 * determines whether they become part of the current selection. Alternatively,
 * if ``restricted-selectable`` mode is enabled, a string describing one of
 * the pre-defined restricted-selectable options.
 * @param {String} attr (Optional) The selection attribute to modify.
 * @param {Boolean} place (Optional) Whether or not ``placenodes`` should be called.
 * @param {Boolean} skip_refresh (Optional) Whether or not a refresh is called.
 * @param {String} mode (Optional) Can be ``"toggle"``, ``"true"``, or ``"false"``.
 * @returns The current ``phylotree``.
 */
export function modify_selection(
  node_selecter,
  attr,
  place,
  skip_refresh,
  mode
) {

  attr = attr || selection_attribute_name;
  mode = mode || "toggle";

  // check if node_selecter is a value of pre-defined selecters

  if (options["restricted-selectable"].length) {
    // the selection must be from a list of pre-determined selections
    if (_.contains(_.keys(predefined_selecters), node_selecter)) {
      node_selecter = predefined_selecters[node_selecter];
    } else {
      return;
    }
  }

  if (
    (options["restricted-selectable"] || options["selectable"]) &&
    !options["binary-selectable"]
  ) {

    var do_refresh = false;

    if (typeof node_selecter === "function") {
      links.forEach(function(d) {
        var select_me = node_selecter(d);
        d[attr] = d[attr] || false;
        if (d[attr] != select_me) {
          d[attr] = select_me;
          do_refresh = true;
          d.target[attr] = select_me;
        }
      });
    } else {
      node_selecter.forEach(function(d) {
        var new_value;
        switch (mode) {
          case "true":
            new_value = true;
            break;
          case "false":
            new_value = false;
            break;
          default:
            new_value = !d[attr];
            break;
        }

        if (d[attr] != new_value) {
          d[attr] = new_value;
          do_refresh = true;
        }
      });

      links.forEach(function(d) {
        d[attr] = d.target[attr];
      });
    }

    var counts;

    if (do_refresh) {
      if (!skip_refresh) {
        d3_phylotree_trigger_refresh(phylotree);
      }
      if (phylotree.count_handler()) {
        counts = {};
        counts[attr] = links.reduce(function(p, c) {
          return p + (c[attr] ? 1 : 0);
        }, 0);
        d3_phylotree_trigger_count_update(
          phylotree,
          counts,
          phylotree.count_handler()
        );
      }

      if (place) {
        phylotree.placenodes();
      }
    }
  } else if (options["binary-selectable"]) {
    if (typeof node_selecter === "function") {
      links.forEach(function(d) {
        var select_me = node_selecter(d);
        d[attr] = d[attr] || false;

        if (d[attr] != select_me) {
          d[attr] = select_me;
          do_refresh = true;
          d.target[attr] = select_me;
        }

        options["attribute-list"].forEach(function(type) {
          if (type != attr && d[attr] === true) {
            d[type] = false;
            d.target[type] = false;
          }
        });
      });
    } else {
      node_selecter.forEach(function(d) {
        var new_value;
        new_value = !d[attr];

        if (d[attr] != new_value) {
          d[attr] = new_value;
          do_refresh = true;
        }
      });

      links.forEach(function(d) {
        d[attr] = d.target[attr];
        options["attribute-list"].forEach(function(type) {
          if (type != attr && d[attr] !== true) {
            d[type] = false;
            d.target[type] = false;
          }
        });
      });
    }

    if (do_refresh) {
      if (!skip_refresh) {
        d3_phylotree_trigger_refresh(phylotree);
      }
      if (phylotree.count_handler()) {
        counts = {};
        counts[attr] = links.reduce(function(p, c) {
          return p + (c[attr] ? 1 : 0);
        }, 0);
        d3_phylotree_trigger_count_update(
          phylotree,
          counts,
          phylotree.count_handler()
        );
      }

      if (place) {
        phylotree.placenodes();
      }
    }
  }
  if (selection_callback && attr != "tag") {
    selection_callback(phylotree.get_selection());
  }
  return phylotree;

};

/**
 * Select all descendents of a given node, with options for selecting
 * terminal/internal nodes.
 *
 * @param {Node} node The node whose descendents should be selected.
 * @param {Boolean} terminal Whether to include terminal nodes.
 * @param {Boolean} internal Whther to include internal nodes.
 * @returns {Array} An array of selected nodes.
 */
export function select_all_descendants (node, terminal, internal) {
  let selection = [];

  function sel(d) {
    if (inspector.is_leafnode(d)) {
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
};

export function path_to_root(node) {
  let selection = [];
  while (node) {
    selection.push(node);
    node = node.parent;
  }
  return selection;
};

/**
 * Getter/setter for the selection callback. This function is called
 * every time the current selection is modified, and its argument is
 * an array of nodes that make up the current selection.
 *
 * @param {Function} callback (Optional) The selection callback function.
 * @returns The current ``selection_callback`` if getting, or the current ``phylotree`` if setting.
 */
export function selection_callback(callback) {
  if (!callback) return selection_callback;
  selection_callback = callback;
  return phylotree;
};


