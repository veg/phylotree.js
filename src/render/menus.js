import * as _ from "underscore";
import * as inspector from '../inspectors';

let d3_layout_phylotree_context_menu_id = "d3_layout_phylotree_context_menu";

export function node_dropdown_menu(node, container, phylotree, options) {

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
    if (!inspector.is_leafnode(node)) {
      if (options["collapsible"]) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text(
            inspector.is_node_collapsed(node)
              ? "Expand Subtree"
              : "Collapse Subtree"
          )
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree.toggle_collapse(node).update();
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
            phylotree.modify_selection(
              phylotree.select_all_descendants(node, true, true)
            );
          });

        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("All terminal branches")
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree.modify_selection(
              phylotree.select_all_descendants(node, true, false)
            );
          });

        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("All internal branches")
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree.modify_selection(
              phylotree.select_all_descendants(node, false, true)
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
            phylotree.modify_selection([node]);
          });

        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text("Path to root")
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree.modify_selection(phylotree.path_to_root(node));
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
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree.reroot(node).update();
          });
      }

      if (options["hide"]) {
        menu_object
          .append("a")
          .attr("class", "dropdown-item")
          .attr("tabindex", "-1")
          .text(
            "Hide this " +
              (inspector.is_leafnode(node) ? "node" : "subtree")
          )
          .on("click", function(d) {
            menu_object.style("display", "none");
            phylotree
              .modify_selection([node], "notshown", true, true)
              .update_has_hidden_nodes()
              .update();
          });
      }
    }

    if (inspector.has_hidden_nodes(node)) {
      menu_object
        .append("a")
        .attr("class", "dropdown-item")
        .attr("tabindex", "-1")
        .text("Show all descendant nodes")
        .on("click", function(d) {
          menu_object.style("display", "none");
          phylotree
            .modify_selection(
              phylotree.select_all_descendants(node, true, true),
              "notshown",
              true,
              true,
              "false"
            )
            .update_has_hidden_nodes()
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
          .text(constant(d[0])(node))
          .on("click", _.partial(d[1], node));
      });

    }

    let tree_container = $(container);
    let coordinates = d3.mouse(tree_container[0]);

    menu_object
      .style("position", "absolute")
      .style("left", "" + coordinates[0] + "px")
      .style("top", "" + coordinates[1] + "px")
      .style("display", "block");

  } else {
    menu_object.style("display", "none");
  }

}

export function add_custom_menu(node, name, callback, condition) {

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

