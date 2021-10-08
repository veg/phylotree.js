import * as d3 from "d3";
import * as _ from "underscore";
import * as events from "./events";
import { isLeafNode } from "../nodes";
import { isNodeCollapsed, hasHiddenNodes } from "./nodes";
import { predefined_selecters } from "./options";

let d3_layout_phylotree_context_menu_id = "d3_layout_phylotree_context_menu";

export function nodeDropdownMenu(node, container, phylotree, options) {
  let menu_object = d3
    .select(container)
    .select("#" + d3_layout_phylotree_context_menu_id);

  if (menu_object.empty()) {
    menu_object = d3
      .select(container)
      .append("div")
      .attr("id", d3_layout_phylotree_context_menu_id)
      .attr("class", "dropdown-menu")
      .attr("role", "menu");
  }

  menu_object.selectAll("a").remove();
  menu_object.selectAll("h6").remove();
  menu_object.selectAll("div").remove();

  if (node) {
    if (
      !_.some([
        Boolean(node.menu_items),
        options["hide"],
        options["selectable"],
        options["collapsible"]
      ]) ||
      !options["show-menu"]
    )
      return;
    if (!isLeafNode(node)) {
      if (options["collapsible"]) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text(isNodeCollapsed(node) ? "Expand Subtree" : "Collapse Subtree")
          .on("click", d => {
            menu_object.style("display", "none");
            this.toggleCollapse(node).update();
          });
        if (options["selectable"]) {
          menu_object.append("div").attr("class", "dropdown-divider");
          menu_object
            .append("h6")
            .attr("class", "dropdown-header")
            .text("Toggle selection");
        }
      }

      if (options["selectable"]) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("All descendant branches")
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree.modifySelection(
              phylotree.selectAllDescendants(node, true, true)
            );
          });

        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("All terminal branches")
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree.modifySelection(
              phylotree.selectAllDescendants(node, true, false)
            );
          });

        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("All internal branches")
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree.modifySelection(
              phylotree.selectAllDescendants(node, false, true)
            );
          });
      }
    }

    if (node.parent) {
      if (options["selectable"]) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("Incident branch")
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree.modifySelection([node]);
          });

        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("Path to root")
          .on("click", d => {
            menu_object.style("display", "none");
            this.modifySelection(this.phylotree.pathToRoot(node));
          });

        if (options["reroot"] || options["hide"]) {
          menu_object.append("div").attr("class", "dropdown-divider");
        }
      }

      if (options["reroot"]) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("Reroot on this node")
          .on("click", d => {
            menu_object.style("display", "none");
            this.phylotree.reroot(node);
            this.update();
          });
      }

      if (options["hide"]) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("Hide this " + (isLeafNode(node) ? "node" : "subtree"))
          .on("click", d => {
            menu_object.style("display", "none");
            this.modifySelection([node], "notshown", true, true)
              .updateHasHiddenNodes()
              .update();
          });
      }
    }

    if (hasHiddenNodes(node)) {
      menu_object
        .append("a")
        .attr("class", "dropdown-item")
        .attr("tabindex", "-1")
        .text("Show all descendant nodes")
        .on("click", function(d) {
          menu_object.style("display", "none");
          phylotree
            .modifySelection(
              phylotree.selectAllDescendants(node, true, true),
              "notshown",
              true,
              true,
              "false"
            )
            .updateHasHiddenNodes()
            .update();
        });
    }

    // now see if we need to add user defined menus

    var has_user_elements = [];
    if ("menu_items" in node && typeof node["menu_items"] === "object") {
      node["menu_items"].forEach(function(d) {
        if (d.length == 3) {
          if (!d[2] || d[2](node)) {
            has_user_elements.push([d[0], d[1]]);
          }
        }
      });
    }

    if (has_user_elements.length) {
      const show_divider_options = [
        options["hide"],
        options["selectable"],
        options["collapsible"]
      ];

      if (_.some(show_divider_options)) {
        menu_object.append("div").attr("class", "dropdown-divider");
      }

      has_user_elements.forEach(function(d) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text(constant(d[0])(node)) // eslint-disable-line
          .on("click", _.partial(d[1], node));
      });
    }

    let tree_container = $(container); // eslint-disable-line
    let coordinates = d3.mouse(tree_container[0]);

    menu_object
      .style("position", "absolute")
      .style("left", "" + (coordinates[0] + tree_container.position().left) + "px")
      .style("top", "" + (coordinates[1] + tree_container.position().top) + "px")
      .style("display", "block");
  } else {
    menu_object.style("display", "none");
  }

}

export function addCustomMenu(node, name, callback, condition) {
  if (!("menu_items" in node)) {
    node["menu_items"] = [];
  }
  if (
    !node["menu_items"].some(function(d) {
      return d[0] == name && d[1] == callback && d[2] == condition;
    })
  ) {
    node["menu_items"].push([name, callback, condition]);
  }
}

/**
 *
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
 * @returns The current ``this``.
 *
 */
export function modifySelection(
  node_selecter,
  attr,
  place,
  skip_refresh,
  mode
) {

  attr = attr || this.selection_attribute_name;
  mode = mode || "toggle";

  // check if node_selecter is a value of pre-defined selecters

  if (this.options["restricted-selectable"].length) {
    // the selection must be from a list of pre-determined selections
    if (_.contains(_.keys(predefined_selecters), node_selecter)) {
      node_selecter = predefined_selecters[node_selecter];
    } else {
      return;
    }
  }

  if (
    (this.options["restricted-selectable"] || this.options["selectable"]) &&
    !this.options["binary-selectable"]
  ) {
    var do_refresh = false;

    if (typeof node_selecter === "function") {
      this.links.forEach(function(d) {
        let select_me = node_selecter(d);
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

      this.links.forEach(function(d) {
        d[attr] = d.target[attr];
      });
    }

    var counts;

    if (do_refresh) {
      if (!skip_refresh) {
        events.triggerRefresh(this);
      }
      if (this.countHandler) {
        counts = {};
        counts[attr] = this.links.reduce(function(p, c) {
          return p + (c[attr] ? 1 : 0);
        }, 0);
        events.countUpdate(this, counts, this.countHandler);
      }

      if (place) {
        this.placenodes();
      }
    }
  } else if (this.options["binary-selectable"]) {
    if (typeof node_selecter === "function") {
      this.links.forEach(function(d) {
        var select_me = node_selecter(d);
        d[attr] = d[attr] || false;

        if (d[attr] != select_me) {
          d[attr] = select_me;
          do_refresh = true;
          d.target[attr] = select_me;
        }

        this.options["attribute-list"].forEach(function(type) {
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

      this.links.forEach(function(d) {
        d[attr] = d.target[attr];
        this.options["attribute-list"].forEach(function(type) {
          if (type != attr && d[attr] !== true) {
            d[type] = false;
            d.target[type] = false;
          }
        });
      });
    }

    if (do_refresh) {
      if (!skip_refresh) {
        events.triggerRefresh(this);
      }
      if (this.countHandler()) {
        counts = {};
        counts[attr] = this.links.reduce(function(p, c) {
          return p + (c[attr] ? 1 : 0);
        }, 0);
        this.countUpdate(this, counts, this.countHandler());
      }

      if (place) {
        this.placenodes();
      }
    }
  }

  if (this.selectionCallback && attr != "tag") {
    this.selectionCallback(this.getSelection());
  }

  this.refresh();
  this.update();
  return this;
}

/**
 * Get nodes which are currently selected.
 *
 * @returns {Array} An array of nodes that match the current selection.
 */
export function getSelection() {
  return this.nodes.filter(d => {
    return d[this.selection_attribute_name];
  });
}

/**
 * Select all descendents of a given node, with options for selecting
 * terminal/internal nodes.
 *
 * @param {Node} node The node whose descendents should be selected.
 * @param {Boolean} terminal Whether to include terminal nodes.
 * @param {Boolean} internal Whther to include internal nodes.
 * @returns {Array} An array of selected nodes.
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

/**
 * Getter/setter for the selection callback. This function is called
 * every time the current selection is modified, and its argument is
 * an array of nodes that make up the current selection.
 *
 * @param {Function} callback (Optional) The selection callback function.
 * @returns The current ``selectionCallback`` if getting, or the current ``this`` if setting.
 */
export function selectionCallback(callback) {
  if (!callback) return this.selectionCallback;
  this.selectionCallback = callback;
  return this;
}
