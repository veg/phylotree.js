var d3_layout_phylotree_event_id = "d3.layout.phylotree.event",
    d3_layout_phylotree_context_menu_id = "d3_layout_phylotree_context_menu";


d3.layout.phylotree = function(container) {

    var self = new Object,
        d3_hierarchy = d3.layout.hierarchy().sort(null).value(null),
        size = [1, 1],
        phylo_attr = [1, 1],
        newick_string = null,
        separation = function(_node, _previos) {
            return 0;
        },
        node_span = function(_node) {
            return 1;
        },
        relative_node_span = function(_node) {
            return node_span(_node) / rescale_node_span
        },
        def_branch_length_accessor = function(_node) {
            if ("attribute" in _node && _node["attribute"] && _node["attribute"].length) {
                var bl = parseFloat(_node["attribute"]);
                if (!isNaN(bl)) {
                    return Math.max(0, bl);
                }
            }
            //console.log ("No branch length for ", _node.name);
            return undefined;
        },
        branch_length_accessor = def_branch_length_accessor,
        def_node_label = function(_node) {
            if (options['internal-names'] || d3_phylotree_is_leafnode(_node)) {
                return _node.name || "";
            }
            return "";
        },
        node_label = def_node_label,
        length_attribute = null,
        scale_attribute = "y_scaled",
        needs_redraw = true,
        svg = null,

        options = {
            'layout': 'left-to-right',
            'branches': 'step',
            'scaling': true,
            'bootstrap': false,
            'color-fill': true,
            'internal-names': false,
            'selectable': true,
            'collapsible': true,
            'left-right-spacing': 'fixed-step', //'fit-to-size',
            'top-bottom-spacing': 'fixed-step',
            'left-offset': 0,
            'show-scale': 'top',
            // currently not implemented to support any other positioning
            'draw-size-bubbles': false,
            'binary-selectable': false,
            'is-radial': false,
            'attribute-list': [],
            'max-radius': 768,
            'annular-limit': 0.38196601125010515,
            'compression': 0.2,
            'align-tips': false,
            'maximim-per-node-spacing': 100,
            'minimum-per-node-spacing': 2,
            'maximim-per-level-spacing': 100,
            'minimum-per-level-spacing': 10,
            'node_circle_size': d3.functor(3),
            'transitions': null
        },

        css_classes = {
            'tree-container': 'phylotree-container',
            'tree-scale-bar': 'tree-scale-bar',
            'node': 'node',
            'internal-node': 'internal-node',
            'tagged-node': 'node-tagged',
            'selected-node': 'node-selected',
            'collapsed-node': 'node-collapsed',
            'branch': 'branch',
            'selected-branch': 'branch-selected',
            'tagged-branch': 'branch-tagged',
            'tree-selection-brush': 'tree-selection-brush',
            'branch-tracer': 'branch-tracer',
            'clade': 'clade',
        },

        nodes = [],
        links = [],
        partitions = [],
        x_coord = function(d) {
            return d.y
        },
        y_coord = function(d) {
            return d.x
        },
        scales = [1, 1],
        fixed_width = [15, 20],
        font_size = 12,
        scale_bar_font_size = 12,
        offsets = [0, font_size],

        draw_line = d3.svg.line()
        .x(function(d) {
            return x_coord(d);
        })
        .y(function(d) {
            return y_coord(d);
        })
        .interpolate("step-before"),

        draw_arc = function(points) {
            var start = radial_mapper(points[0].radius, points[0].angle),
                end = radial_mapper(points[0].radius, points[1].angle);

            return "M " + x_coord(start) + "," + y_coord(start) + " A " + points[0].radius + "," + points[0].radius +
                " 0,0, " + (points[1].angle > points[0].angle ? 1 : 0) + " " + x_coord(end) + "," + y_coord(end) +
                " L " + x_coord(points[1]) + "," + y_coord(points[1]);

        };

    draw_branch = draw_line,
        draw_scale_bar = null,
        rescale_node_span = 1,
        count_listener_handler = undefined,
        node_styler = undefined,
        edge_styler = undefined,
        shown_font_size = font_size,
        selection_attribute_name = 'selected',
        popover_displayed = null,
        right_most_leaf = 0,
        label_width = 0,
        radial_center = 0,
        radius = 1,
        radius_pad_for_bubbles = 0,
        radial_mapper = function(r, a) {
            return {
                'x': radial_center + r * Math.sin(a),
                'y': radial_center + r * Math.cos(a)
            };
        },
        cartesian_mapper = function(x, y) {
            return polar_to_cartesian(x - radial_center, y - radial_center);
        },
        cartesian_to_polar = function(node, radius, radial_root_offset) {

            node.x *= scales[0];
            node.y *= scales[1];
            node.radius = radius * (node.y / size[1] + radial_root_offset);
 
            if (!node.angle) {
                node.angle = 2 * Math.PI * node.x * scales[0] / size[0];
            }

            var radial = radial_mapper(node.radius, node.angle);

            node.x = radial.x;
            node.y = radial.y;

            return node;
        },
        polar_to_cartesian = function(x, y) {
            r = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
            a = Math.atan2(y, x);
            return [r, a];
        };

    self.container = container || "body";


    /*--------------------------------------------------------------------------------------*/

    phylotree.placenodes = function() {

        var x = 0.,
            _extents = [
                [0, 0],
                [0, 0]
            ],
            last_node = null,
            last_span = 0,
            save_x = x,
            save_span = last_span * 0.5;

        var do_scaling = options["scaling"],
            undef_BL = false,
            is_under_collapsed_parent = false,
            max_depth = 1,
            leaf_counter = 0;

        function process_internal_node(a_node) {
            var count_undefined = 0;
            a_node.x = a_node.children.map(tree_layout).reduce(function(a, b) {
                if (typeof b == "number") return a + b;
                count_undefined += 1;
                return a;
            }, 0.0);
            if (count_undefined == a_node.children.length) {
                a_node.notshown = true;
                a_node.x = undefined;
                return;
            } else {
                a_node.x /= (a_node.children.length - count_undefined);
            }
        }

        function tree_layout(a_node) {
            if (d3_phylotree_node_notshown(a_node)) {
                return undefined;
            }

            var is_leaf = d3_phylotree_is_leafnode(a_node);

            a_node.text_angle = null;
            a_node.text_align = null;
            a_node.radius = null;
            a_node.angle = null;


            if (a_node['parent']) {
                if (do_scaling) {
                    if (undef_BL) {
                        return 0;
                    }
                    a_node.y = branch_length_accessor(a_node);
                    if (typeof a_node.y === 'undefined') {
                        undef_BL = true;
                        return 0;
                    }
                    a_node.y += a_node.parent.y;
                } else {
                    a_node.y = is_leaf ? max_depth : a_node.depth;
                }
            } else {
                x = 0.;
                _extents = [
                    [0, 0],
                    [0, 0]
                ];
                last_node = null;
                last_span = 0;
                a_node.y = 0.;
            }


            if (is_leaf) {

                var _node_span = node_span(a_node) / rescale_node_span;

                x = a_node.x = x + separation(last_node, a_node) + (last_span + _node_span) * 0.5;

                _extents[1][1] = Math.max(_extents[1][1], a_node.y);
                _extents[1][0] = Math.min(_extents[1][0], a_node.y - _node_span * 0.5);

                if (is_under_collapsed_parent) {
                    _extents[0][1] = Math.max(_extents[0][1], (save_x + (a_node.x - save_x) * options['compression'] + save_span) + (_node_span * 0.5 + separation(last_node, a_node)) * options['compression']);
                } else {
                    _extents[0][1] = Math.max(_extents[0][1], x + _node_span * 0.5 + separation(last_node, a_node));
                }

                last_node = a_node;
                last_span = _node_span;

            } else {

                var count_undefined = 0;
                if (d3_phylotree_is_node_collapsed(a_node) && !is_under_collapsed_parent) {

                    save_x = x;
                    save_span = last_span * 0.5;

                    is_under_collapsed_parent = true;
                    process_internal_node(a_node);
                    is_under_collapsed_parent = false;
                    if (typeof a_node.x === "number") {

                        a_node.x = save_x + (a_node.x - save_x) * options['compression'] + save_span;
                        a_node.collapsed = [
                            [a_node.x, a_node.y]
                        ];

                        function map_me(n) {
                            n.hidden = true;
                            if (d3_phylotree_is_leafnode(n)) {
                                x = n.x = save_x + (n.x - save_x) * options['compression'] + save_span;
                                a_node.collapsed.push([n.x, n.y]);
                            } else {
                                n.children.map(map_me);
                            }
                        }

                        x = save_x;
                        map_me(a_node);

                        a_node.collapsed.splice(1, 0, [save_x, a_node.y]);
                        a_node.collapsed.push([x, a_node.y]);
                        a_node.collapsed.push([a_node.x, a_node.y]);
                        a_node.hidden = false;
                    }

                } else {
                    process_internal_node(a_node);
                }
            }

            return a_node.x;
        }

        rescale_node_span = nodes.map(function(d) {
            return node_span(d);
        }).reduce(function(p, c) {
            return Math.min(c, p || 1e200)
        }, null) || 1;

        nodes[0].x = tree_layout(nodes[0], do_scaling);

        max_depth = d3.max(nodes, (function(n) {
            return n.depth;
        }));

        if (do_scaling && undef_BL) {
            do_scaling = false;
            nodes[0].x = tree_layout(nodes[0]);
        }

        var at_least_one_dimension_fixed = false;

        draw_scale_bar = options['show-scale'] && do_scaling;
        // this is a hack so that phylotree.pad_height would return ruler spacing

        if (options['top-bottom-spacing'] == 'fixed-step') {
            offsets[1] = Math.max(font_size, -_extents[1][0] * fixed_width[0]);
            size[0] = _extents[0][1] * fixed_width[0];
            scales[0] = fixed_width[0];
        } else {
            scales[0] = (size[0] - phylotree.pad_height()) / _extents[0][1];
            at_least_one_dimension_fixed = true;
        }

        shown_font_size = Math.min(font_size, scales[0]);

        function do_lr() {

            if (phylotree.radial() && at_least_one_dimension_fixed) {
                offsets[1] = 0;
            }

            if (options['left-right-spacing'] == 'fixed-step') {
                size[1] = max_depth * fixed_width[1];
                scales[1] = (size[1] - offsets[1] - options["left-offset"]) / _extents[1][1];
                label_width = phylotree._label_width(shown_font_size);
            } else {
                label_width = phylotree._label_width(shown_font_size);
                at_least_one_dimension_fixed = true;

                var available_width = size[1] - offsets[1] - options["left-offset"];
                if (available_width * 0.5 < label_width) {
                    shown_font_size *= available_width * 0.5 / label_width;
                    label_width = available_width * 0.5;
                }

                scales[1] = (size[1] - offsets[1] - options["left-offset"] - label_width) / _extents[1][1];
                
            }
        }

        if (phylotree.radial()) { // map the nodes to polar coordinates

            draw_branch = draw_arc;

            var last_child_angle = null,
                last_circ_position = null,
                last_child_radius = null,
                min_radius = 0,
                zero_length = null,
                effective_span = _extents[0][1] * scales[0];

            function compute_distance(r1, r2, a1, a2, annular_shift) {
                annular_shift = annular_shift || 0;
                return Math.sqrt((r2 - r1) * (r2 - r1) + 2 * (r1 + annular_shift) * (r2 + annular_shift) * (1 - Math.cos(a1 - a2)));
            }


            var max_r = 0;

            nodes.forEach(function(d) {
                var my_circ_position = d.x * scales[0];
                d.angle = 2 * Math.PI * my_circ_position / effective_span;
                d.text_angle = (d.angle - Math.PI / 2);
                d.text_angle = d.text_angle > 0 && d.text_angle < Math.PI;
                d.text_align = d.text_angle ? "end" : "start";
                d.text_angle = (d.text_angle ? 180 : 0) + d.angle * 180 / Math.PI;
                d.radius = d.y * scales[1] / size[1];
                max_r = Math.max (max_r, d.radius);
            });

            do_lr();


            var annular_shift = 0,
                do_tip_offset = phylotree.align_tips() && !options['draw-size-bubbles'];


            nodes.forEach(function(d) {
                if (!d.children) {
                    var my_circ_position = d.x * scales[0];
                    if (!(last_child_angle === null)) {
                        var required_spacing = my_circ_position - last_circ_position,
                            radial_dist = compute_distance(d.radius, last_child_radius, d.angle, last_child_angle, annular_shift);

                        var local_mr = radial_dist > 0 ? required_spacing / radial_dist : 10 * options['max-radius'];

                        if (local_mr > options['max-radius']) { // adjust the annular shift
                            var dd = required_spacing / options['max-radius'],
                                b = d.radius + last_child_radius,
                                c = d.radius * last_child_radius - (dd * dd - (last_child_radius - d.radius) * (last_child_radius - d.radius)) / 2 / (1 - Math.cos(last_child_angle - d.angle)),
                                st = Math.sqrt(b * b - 4 * c);

                            annular_shift = Math.min(options['annular-limit'] * max_r, (-b + st) / 2);
                            min_radius = options['max-radius'];
                        } else {
                            min_radius = local_mr;
                        }
                    }

                    last_child_angle = d.angle;
                    last_circ_position = my_circ_position;
                    last_child_radius = d.radius;
                }
            });

            radius = Math.min(options['max-radius'], Math.max(effective_span / 2 / Math.PI, min_radius));
        
            if (annular_shift) {
                var scaler = 1;
                
                 nodes.forEach(function(d) {
                    d.radius = d.y*scales[1]/size[1] + annular_shift;
                    scaler = Math.max (scaler, d.radius);
                    
                });
                
                
                if (scaler > 1) {
                    scales[0] /= scaler;
                    scales[1] /= scaler;
                    annular_shift /= scaler;
                }
             }


            if (at_least_one_dimension_fixed) {
                radius = Math.min(radius, (Math.min(effective_span, _extents[1][1] * scales[1]) - label_width) * 0.5 - radius * annular_shift);
            }

            radial_center = radius_pad_for_bubbles = radius;

            nodes.forEach(function(d) {

                cartesian_to_polar(d, radius, annular_shift);


                if (options['draw-size-bubbles']) {
                    radius_pad_for_bubbles = Math.max(radius_pad_for_bubbles, d.radius + phylotree.node_bubble_size(d));
                } else {
                    radius_pad_for_bubbles = Math.max(radius_pad_for_bubbles, d.radius);
                }


                if (d.collapsed) {
                    d.collapsed = d.collapsed.map(function(p) {
                        var z = {};
                        z.x = p[0];
                        z.y = p[1];
                        z = cartesian_to_polar(z, radius, annular_shift);
                        return [z.x, z.y];
                    });

                    var last_point = d.collapsed[1];
                    d.collapsed = d.collapsed.filter(function(p, i) {
                        if (i < 3 || i > d.collapsed.length - 4) return true;
                        if (Math.sqrt(Math.pow(p[0] - last_point[0], 2) + Math.pow(p[1] - last_point[1], 2)) > 3) {
                            last_point = p;
                            return true;
                        }
                        return false;
                    });
                }
            });

            size[0] = radial_center + radius;
            size[1] = radial_center + radius;
        } else {

            do_lr();

            draw_branch = draw_line;
            right_most_leaf = 0;
            nodes.forEach(function(d) {

                d.x *= scales[0];
                d.y *= scales[1];

                if (d3_phylotree_is_leafnode(d)) {
                    right_most_leaf = Math.max(right_most_leaf, d.y + phylotree.node_bubble_size(d));
                }


                if (d.collapsed) {
                    d.collapsed.map(function(p) {
                        return [p[0] *= scales[0], p[1] *= scales[1]];
                    });
                    var last_x = d.collapsed[1][0];
                    d.collapsed = d.collapsed.filter(function(p, i) {
                        if (i < 3 || i > d.collapsed.length - 4) return true;
                        if (p[0] - last_x > 3) {
                            last_x = p[0];
                            return true;
                        }
                        return false;
                    });
                }
            });
        }

        if (draw_scale_bar) {

            var domain_limit,
                range_limit;

            if (phylotree.radial()) {
                range_limit = Math.min(radius / 5, 50);
                domain_limit = Math.pow(10, Math.ceil(Math.log(_extents[1][1] * range_limit / radius) / Math.log(10)));
                range_limit = domain_limit * (radius / _extents[1][1]);
                if (range_limit < 30) {
                    var stretch = Math.ceil(30 / range_limit);
                    //console.log (stretch, domain_limit, radius, _extents[1][1], range_limit, domain_limit);
                    range_limit *= stretch;
                    domain_limit *= stretch;
                }

            } else {
                domain_limit = _extents[1][1];
                range_limit = (size[1] - offsets[1] - options["left-offset"]);
            }



            var scale = d3.scale.linear()
                .domain([0, domain_limit])
                .range([shown_font_size, shown_font_size + range_limit]),
                scaleTickFormatter = d3.format(".2g");
            draw_scale_bar = d3.svg.axis().scale(scale).orient("top")
                .tickFormat(function(d) {
                    if (d == 0) {
                        return ""
                    };
                    return scaleTickFormatter(d);
                });

            if (phylotree.radial()) {
                draw_scale_bar.tickValues([domain_limit]);
            } else {
                var my_ticks = scale.ticks();
                my_ticks = my_ticks.length > 1 ? my_ticks[1] : my_ticks[0];
                draw_scale_bar.ticks(Math.min(10, d3.round(range_limit / (shown_font_size * scaleTickFormatter(my_ticks).length * 0.8), 0)));
            }


            //_extentsconsole.log (scale.domain(), scale.range());
        } else {
            draw_scale_bar = null;
        }

        return phylotree;
    };

    function phylotree(nwk, bootstrap_values) {

        d3_phylotree_add_event_listener();


        var _node_data = (typeof nwk == "string") ? d3_phylotree_newick_parser(nwk, bootstrap_values) : nwk;
        // this builds children and links;

        if (!_node_data['json']) {
            nodes = [];
        } else {
            newick_string = nwk;
            nodes = d3_hierarchy.call(this, _node_data.json);
        }

        phylotree.placenodes();
        links = phylotree.links(nodes);
        return phylotree;
    }

    phylotree.size = function(attr) {
        if (arguments.length) {
          phylo_attr = attr;
        }

        if (options['top-bottom-spacing'] != 'fixed-step') {
            size[0] = phylo_attr[0];
        }
        if (options['left-right-spacing'] != 'fixed-step') {
            size[1] = phylo_attr[1];
        }

        if (!arguments.length) {
          return size;
        }

        return phylotree;
    };

    phylotree.pad_height = function() {
        if (draw_scale_bar) {
            return scale_bar_font_size + 25;
        }
        return 0;
    }

    phylotree.pad_width = function() {
        return offsets[1] + options["left-offset"] + label_width;
    }

    phylotree.descendants = function(n) {
        var desc = [];

        function recurse_d(nd) {
            if (d3_phylotree_is_leafnode(nd)) {
                desc.push(nd);
            } else {
                nd.children.forEach(recurse_nd);
            }
        }
        recurse_d(n);
        return desc;
    }

    phylotree.collapse_node = function(n) {
        if (!d3_phylotree_is_node_collapsed(n)) {
            n.collapsed = true;
        }
    }

    phylotree.separation = function(attr) {
        if (!arguments.length) return separation;
        separation = attr;
        return phylotree;
    };

    phylotree.selection_label = function(attr) {
        if (!arguments.length) return selection_attribute_name;
        selection_attribute_name = attr;
        phylotree.sync_edge_labels();
        return phylotree;
    };

    phylotree.handle_node_click = function(node) {

        var menu_object = d3.select(self.container).select("#" + d3_layout_phylotree_context_menu_id);


        if (menu_object.empty()) {
            menu_object = d3.select(self.container).append("ul")
                .attr("id", d3_layout_phylotree_context_menu_id)
                .attr("class", "dropdown-menu")
                .attr("role", "menu");
        }



        menu_object.selectAll("li").remove();
        if (node) {
            if (!d3_phylotree_is_leafnode(node)) {
                if (options["collapsible"]) {
                    menu_object.append("li").append("a")
                        .attr("tabindex", "-1")
                        .text(d3_phylotree_is_node_collapsed(node) ? "Expand Subtree" : "Collapse Subtree")
                        .on("click", function(d) {
                            menu_object.style("display", "none");
                            phylotree.toggle_collapse(node).update();
                        });
                    menu_object.append("li").attr("class", "divider");
                    menu_object.append("li").attr("class", "dropdown-header").text("Toggle selection");
                }

                if (options["selectable"]) {
                    menu_object.append("li").append("a")
                        .attr("tabindex", "-1")
                        .text("All descendant branches")
                        .on("click", function(d) {
                            menu_object.style("display", "none");
                            phylotree.modify_selection(phylotree.select_all_descendants(node, true, true));
                        });

                    menu_object.append("li").append("a")
                        .attr("tabindex", "-1")
                        .text("All terminal branches")
                        .on("click", function(d) {
                            menu_object.style("display", "none");
                            phylotree.modify_selection(phylotree.select_all_descendants(node, true, false));
                        });

                    menu_object.append("li").append("a")
                        .attr("tabindex", "-1")
                        .text("All internal branches")
                        .on("click", function(d) {
                            menu_object.style("display", "none");
                            phylotree.modify_selection(phylotree.select_all_descendants(node, false, true));
                        });
                }
            }

            if (node.parent) {

                if (options["selectable"]) {
                    menu_object.append("li").append("a")
                        .attr("tabindex", "-1")
                        .text("Incident branch")
                        .on("click", function(d) {
                            menu_object.style("display", "none");
                            phylotree.modify_selection([node]);
                        });

                    menu_object.append("li").append("a")
                        .attr("tabindex", "-1")
                        .text("Path to root")
                        .on("click", function(d) {
                            menu_object.style("display", "none");
                            phylotree.modify_selection(phylotree.path_to_root(node));
                        });

                    menu_object.append("li").attr("class", "divider");
                }

                menu_object.append("li").append("a")
                    .attr("tabindex", "-1")
                    .text("Reroot on this node")
                    .on("click", function(d) {
                        menu_object.style("display", "none");
                        phylotree.reroot(node).update();
                    });

                menu_object.append("li").attr("class", "divider");

                menu_object.append("li").append("a")
                    .attr("tabindex", "-1")
                    .text("Hide this " + (d3_phylotree_is_leafnode(node) ? "node" : "subtree"))
                    .on("click", function(d) {
                        menu_object.style("display", "none");
                        phylotree.modify_selection([node], "notshown", true, true).update_has_hidden_nodes().update();
                    });



            }

            if (d3_phylotree_has_hidden_nodes(node)) {
                menu_object.append("li").append("a")
                    .attr("tabindex", "-1")
                    .text("Show all descendant nodes")
                    .on("click", function(d) {
                        menu_object.style("display", "none");
                        phylotree.modify_selection(phylotree.select_all_descendants(node, true, true), "notshown", true, true, "false").update_has_hidden_nodes().update();
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
                menu_object.append("li").attr("class", "divider");
                has_user_elements.forEach(function(d) {
                    menu_object.append("li").append("a")
                        .attr("tabindex", "-1")
                        .text(d[0](node))
                        .on("click", d[1]);
                });
            }

            var tree_container = $(self.container);
            var coordinates = d3.mouse(tree_container[0]);
            menu_object.style("position", "absolute")
                .style("left", "" + (coordinates[0]) + "px")
                .style("top", "" + (coordinates[1]) + "px")
                .style("display", "block");

        } else {
            menu_object.style("display", "none");
        }
    };

    phylotree.style_nodes = function(attr) {
        if (!arguments.length) return node_styler;
        node_styler = attr;
        return phylotree;
    };

    phylotree.style_edges = function(attr) {
        if (!arguments.length) return edge_styler;
        edge_styler = attr.bind(this);
        return phylotree;
    };

    phylotree.get_newick = function(annotator) {

        function escape_string(nn) {

            var need_escape = /[\s\[\]\,\)\(\:\'\"]/;
            var enquote = need_escape.test(nn);
            return enquote ? "'" + nn.replace("'", "''") + "'" : nn;
        }

        function node_display(n) {
            if (!d3_phylotree_is_leafnode(n)) {
                element_array.push("(");
                n.children.forEach(function(d, i) {
                    if (i) {
                        element_array.push(",");
                    }
                    node_display(d);
                });
                element_array.push(")");
            }

            element_array.push(escape_string(node_label(n)));
            element_array.push(annotator(n));

            var bl = branch_length_accessor(n);
            if (bl !== undefined) {
                element_array.push(":" + bl);
            }

        }

        var element_array = [],
            annotator = annotator || "";
        node_display(nodes[0]);
        return element_array.join("");

    }

    phylotree.update_layout = function(new_json, do_hierarchy) {

        if (do_hierarchy) {
            nodes = d3_hierarchy.call(this, new_json);
            nodes.forEach(function(d) {
                d.id = null;
            });
        }
        phylotree.placenodes();
        links = phylotree.links(nodes);
        phylotree.sync_edge_labels();

    }

    phylotree.sync_edge_labels = function() {

        links.forEach(function(d) {
            d[selection_attribute_name] = d.target[selection_attribute_name] || false;
            d.tag = d.target.tag || false;
        });

        d3_phylotree_trigger_refresh(phylotree);

        if (phylotree.count_handler()) {
            var counts = {};
            counts[selection_attribute_name] = links.reduce(function(p, c) {
                return p + (c[selection_attribute_name] ? 1 : 0);
            }, 0);
            counts['tagged'] = links.reduce(function(p, c) {
                return p + (d3_phylotree_item_tagged(c) ? 1 : 0);
            }, 0);

            d3_phylotree_trigger_count_update(phylotree,
                counts, phylotree.count_handler());
        }

    };

    phylotree.modify_selection = function(callback, attr, place, skip_refresh, mode) {

        attr = attr || selection_attribute_name;
        mode = mode || "toggle";

        if (options["selectable"] && !options["binary-selectable"]) {

            var do_refresh = false;

            if (typeof callback === 'function') {
                links.forEach(function(d) {
                    var select_me = callback(d);
                    d[attr] = d[attr] || false;
                    if (d[attr] != select_me) {

                        d[attr] = select_me;
                        do_refresh = true;
                        d.target[attr] = select_me;
                    }
                });

            } else {

                callback.forEach(function(d) {
                    var new_value;
                    switch (mode) {
                        case 'true':
                            new_value = true;
                            break;
                        case 'false':
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

            if (do_refresh) {
                if (!skip_refresh) {
                    d3_phylotree_trigger_refresh(phylotree);
                }
                if (phylotree.count_handler()) {
                    var counts = {};
                    counts[attr] = links.reduce(function(p, c) {
                        return p + (c[attr] ? 1 : 0);
                    }, 0);
                    d3_phylotree_trigger_count_update(phylotree,
                        counts,
                        phylotree.count_handler());
                }

                if (place) {
                    phylotree.placenodes();
                }
            }

        } else if (options['binary-selectable']) {

            if (typeof callback === 'function') {
                links.forEach(function(d) {

                    var select_me = callback(d);
                    d[attr] = d[attr] || false;


                    if (d[attr] != select_me) {
                        d[attr] = select_me;
                        do_refresh = true;
                        d.target[attr] = select_me;
                    }

                    options['attribute-list'].forEach(function(type) {
                        if (type != attr && d[attr] == true) {
                            d[type] = false;
                            d.target[type] = false;
                        }

                    });

                });

            } else {

                callback.forEach(function(d) {

                    var new_value;
                    new_value = !d[attr];

                    if (d[attr] != new_value) {
                        d[attr] = new_value;
                        do_refresh = true;
                    }

                });

                links.forEach(function(d) {
                    d[attr] = d.target[attr];
                    options['attribute-list'].forEach(function(type) {
                        if (type != attr && d[attr] == true) {
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
                    var counts = {};
                    counts[attr] = links.reduce(function(p, c) {
                        return p + (c[attr] ? 1 : 0);
                    }, 0);
                    d3_phylotree_trigger_count_update(phylotree,
                        counts,
                        phylotree.count_handler());
                }

                if (place) {
                    phylotree.placenodes();
                }
            }

        }

        return phylotree;
    }

    phylotree.radial = function(attr) {
        if (!arguments.length) return options['is-radial'];
        options['is-radial'] = attr;
        return phylotree;
    }

    phylotree.align_tips = function(attr) {
        if (!arguments.length) return options['align-tips'];
        options['align-tips'] = attr;
        return phylotree;
    }

    phylotree.node_bubble_size = function(node) {
        return options['draw-size-bubbles'] ? relative_node_span(node) * scales[0] * 0.5 : 0;
    }

    phylotree.shift_tip = function(d) {

        if (options['is-radial']) {
            return [(d.text_align == "end" ? -1 : 1) * (radius_pad_for_bubbles - d.radius), 0];
        }

        return [right_most_leaf - d.screen_x, 0];
    }


    phylotree.get_selection = function() {
        return nodes.filter(function(d) {
            return d[selection_attribute_name];
        });
    }

    phylotree.count_handler = function(attr) {
        if (!arguments.length) return count_listener_handler;
        count_listener_handler = attr;
        return phylotree;
    }

    phylotree.internal_label = function(callback, respect_existing) {
        phylotree.clear_internal_nodes(respect_existing);

        for (var i = nodes.length - 1; i >= 0; i--) {
            var d = nodes[i];
            if (!(d3_phylotree_is_leafnode(d) || d3_phylotree_item_selected(d, selection_attribute_name))) {
                d[selection_attribute_name] = callback(d.children);
                //console.log (d[selection_attribute_name]);
            }
        }

        phylotree.modify_selection(function(d, callback) {
            if (d3_phylotree_is_leafnode(d.target)) {
                return d.target[selection_attribute_name];
            }
            return d.target[selection_attribute_name];
        });
    }

    phylotree.max_parsimony = function(respect_existing) {

        phylotree.clear_internal_nodes(respect_existing);

        function populate_mp_matrix(d) {
            d.mp = [
                [0, 0], // score for parent selected / not selected
                [false, false]
            ]; // selected or not

            if (d3_phylotree_is_leafnode(d)) {
                d.mp[1][0] = d.mp[1][1] = d[selection_attribute_name] || false;
                d.mp[0][0] = d.mp[1][0] ? 1 : 0;
                d.mp[0][1] = 1 - d.mp[0][0];
            } else {
                d.children.forEach(populate_mp_matrix);

                var s0 = d.children.reduce(function(p, n) {
                    return n.mp[0][0] + p;
                }, 0);
                // cumulative children score if this node is 0
                var s1 = d.children.reduce(function(p, n) {
                    return n.mp[0][1] + p;
                }, 0);
                // cumulative children score if this node is 1

                // parent = 0

                if (d[selection_attribute_name]) {
                    // respect selected
                    d.mp[0][0] = s1 + 1;
                    d.mp[1][0] = true;
                    d.mp[0][1] = s1;
                    d.mp[1][1] = true;
                } else {
                    if (s0 < s1 + 1) {
                        d.mp[0][0] = s0;
                        d.mp[1][0] = false;
                    } else {
                        d.mp[0][0] = s1 + 1;
                        d.mp[1][0] = true;
                    }

                    // parent = 1

                    if (s1 < s0 + 1) {
                        d.mp[0][1] = s1;
                        d.mp[1][1] = true;
                    } else {
                        d.mp[0][1] = s0 + 1;
                        d.mp[1][1] = false;
                    }
                }
            }
        }


        populate_mp_matrix(nodes[0]);
        nodes.forEach(function(d) {
            if (d.parent) {
                d.mp = d.mp[1][d.parent.mp ? 1 : 0];
            } else {
                d.mp = d.mp[1][d.mp[0][0] < d.mp[0][1] ? 0 : 1];
            }
        });

        phylotree.modify_selection(function(d, callback) {
            if (d3_phylotree_is_leafnode(d.target)) {
                return d.target[selection_attribute_name];
            }
            return d.target.mp;
        });

    }

    phylotree.node_span = function(attr) {
        if (!arguments.length) return node_span;
        if (typeof attr == "string" && attr == 'equal') {
            node_span = function(d) {
                return 1;
            };
        } else {
            node_span = attr;
        }
        return phylotree;
    };

    /*phylotree.reroot = function (node) {

    }*/

    phylotree.resort_children = function(comparator) {
        function sort_children(node) {
            if (node.children) {
                for (var k = 0; k < node.children.length; k++) {
                    sort_children(node.children[k]);
                }
                node.children.sort(comparator);
            }
        }

        sort_children(nodes[0]);
        phylotree.update_layout(nodes);
        phylotree.update();
    }

    phylotree.graft_a_node = function(graft_at, new_child, new_parent, lengths) {
        if (graft_at.parent) {
            var node_index = nodes.indexOf(graft_at);
            if (node_index >= 0) {
                var parent_index = graft_at.parent.children.indexOf(graft_at);

                var new_split = {
                        "name": new_parent,
                        "parent": graft_at.parent,
                        "attribute": lengths ? lengths[2] : null,
                        "original_child_order": graft_at["original_child_order"]
                    },

                    new_node = {
                        "name": new_child,
                        "parent": new_split,
                        "attribute": lengths ? lengths[1] : null,
                        "original_child_order": 2
                    };

                new_split["children"] = [graft_at, new_node];
                graft_at["parent"].children[parent_index] = new_split;
                graft_at.parent = new_split;
                graft_at["attribute"] = lengths ? lengths[0] : null;
                graft_at["original_child_order"] = 1;


                phylotree.update_layout(nodes[0], true);
            }
        }
        return phylotree;
    }

    phylotree.delete_a_node = function(index) {
        if (typeof index != "number") {
            return phylotree.delete_a_node(nodes.indexOf(index));
        }

        if (index > 0 && index < nodes.length) {
            var node = nodes[index];
            if (node.parent) { // can only delete nodes that are not the root
                var delete_me_idx = node.parent.children.indexOf(node);

                //console.log (delete_me_idx, node, index);

                if (delete_me_idx >= 0) {
                    nodes.splice(index, 1);
                    if (node.children) {
                        node.children.forEach(function(d) {
                            d['original_child_order'] = node.parent.children.length;
                            node.parent.children.push(d);
                            d.parent = node.parent;
                        });
                    }

                    if (node.parent.children.length > 2) {
                        node.parent.children.splice(delete_me_idx, 1);
                    } else {
                        if (node.parent.parent) {
                            node.parent.parent.children[node.parent.parent.children.indexOf(node.parent)] = node.parent.children[1 - delete_me_idx];
                            node.parent.children[1 - delete_me_idx].parent = node.parent.parent;
                            nodes.splice(nodes.indexOf(node.parent), 1);
                        } else {
                            nodes.splice(0, 1);
                            nodes[0].parent = null;
                            delete nodes[0]['attribute'];
                            delete nodes[0]['annotation'];
                            delete nodes[0]['original_child_order'];
                            nodes[0].name = 'root';
                        }
                    }
                    phylotree.update_layout(nodes[0], true);

                }
            }
        }
        return phylotree;
    }


    phylotree.traverse_and_compute = function(callback, traversal_type) {
        traversal_type = traversal_type || "post-order";

        function post_order(node) {
            if (node.children) {
                for (var k = 0; k < node.children.length; k++) {
                    post_order(node.children[k]);
                }
            }
            callback(node);
        }

        if (traversal_type == 'post-order') {
            traversal_type = post_order;
        }

        traversal_type(nodes[0]);
    }

    phylotree.reroot = function(node) {
        if (node.parent) {

            new_json = {
                'name': 'new_root',
                '__mapped_bl': undefined,
                'children': [node]
            };

            nodes.forEach(function(n) {
                n.__mapped_bl = branch_length_accessor(n);
            });
            phylotree.branch_length(function(n) {
                return n.__mapped_bl;
            });

            var remove_me = node,
                current_node = node.parent,
                parent_length = current_node.__mapped_bl,
                stashed_bl = undefined;


            if (current_node.parent) {
                node.__mapped_bl = node.__mapped_bl === undefined ? undefined : node.__mapped_bl * 0.5;
                stashed_bl = current_node.__mapped_bl;
                current_node.__mapped_bl = node.__mapped_bl;
                new_json.children.push(current_node);
                while (current_node.parent) {
                    var remove_idx = current_node.children.indexOf(remove_me);
                    if (current_node.parent.parent) {
                        current_node.children.splice(remove_idx, 1, current_node.parent);
                    } else {
                        current_node.children.splice(remove_idx, 1);
                    }

                    var t = current_node.parent.__mapped_bl;
                    if (!(t === undefined)) {
                        current_node.parent.__mapped_bl = stashed_bl;
                        stashed_bl = t;
                    }
                    remove_me = current_node;
                    current_node = current_node.parent;
                }
                var remove_idx = current_node.children.indexOf(remove_me);
                current_node.children.splice(remove_idx, 1);
            } else {
                var remove_idx = current_node.children.indexOf(remove_me);
                current_node.children.splice(remove_idx, 1);
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
                    "name": "__reroot_top_clade"
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

    phylotree.update_key_name = function(old_key, new_key) {
        nodes.forEach(function(n) {
            if (old_key in n) {
                if (new_key) {
                    n[new_key] = n[old_key];
                }
                delete n[old_key];
            }
        });
        phylotree.sync_edge_labels();
    };

    phylotree.spacing_x = function(attr, skip_render) {
        if (!arguments.length) return fixed_width[0];
        if (fixed_width[0] != attr && attr >= options['minimum-per-node-spacing'] && attr <= options['maximim-per-node-spacing']) {
            fixed_width[0] = attr;
            if (!skip_render) {
                phylotree.placenodes();
            }
        }
        return phylotree;
    };

    phylotree.spacing_y = function(attr, skip_render) {
        if (!arguments.length) return fixed_width[1];
        if (fixed_width[1] != attr && attr >= options['minimum-per-level-spacing'] && attr <= options['maximim-per-level-spacing']) {
            fixed_width[1] = attr;
            if (!skip_render) {
                phylotree.placenodes();
            }
        }
        return phylotree;
    };

    phylotree.toggle_collapse = function(node) {

        if (node.collapsed) {
            node.collapsed = false;

            function unhide(n) {
                if (!d3_phylotree_is_leafnode(n)) {
                    if (!n.collapsed) {
                        n.children.forEach(unhide);
                    }
                }
                n.hidden = false;
            }

            unhide(node);

        } else {
            node.collapsed = true;
        }

        phylotree.placenodes();
        return phylotree;
    };

    phylotree.update_has_hidden_nodes = function() {

        for (k = nodes.length - 1; k >= 0; k -= 1) {
            if (d3_phylotree_is_leafnode(nodes[k])) {
                nodes[k].has_hidden_nodes = nodes[k].notshown;
            } else {
                nodes[k].has_hidden_nodes = nodes[k].children.reduce(function(p, c) {
                    return c.notshown || p;
                }, false);
            }
        }

        return phylotree;
    };

    phylotree.branch_length = function(attr) {
        if (!arguments.length) return branch_length_accessor;
        branch_length_accessor = attr ? attr : def_branch_length_accessor;
        return phylotree;
    };

    phylotree.branch_name = function(attr) {
        if (!arguments.length) return node_label;
        node_label = attr ? attr : def_node_label;
        return phylotree;
    };

    phylotree.length = function(attr) {
        if (!arguments.length) return default_length_attribute;
        if (default_length_attribute != attr) {
            default_length_attribute = attr;
            needs_redraw = true;
        }
        return phylotree;
    }

    phylotree._label_width = function(_font_size) {
        _font_size = _font_size || shown_font_size;

        var width = 0;

        nodes.filter(d3_phylotree_node_visible).forEach(function(node) {
            var node_width = node_label(node).length * _font_size * 0.6;
            if (node.angle !== null) {
                node_width *= Math.max(Math.abs(Math.cos(node.angle)), Math.abs(Math.sin(node.angle)));
            }
            width = Math.max(node_width, width);
        });

        return width;
    }

    phylotree.font_size = function(attr) {
        if (!arguments.length) return font_size;
        font_size = attr === undefined ? 12 : attr;
        return phylotree;
    }

    phylotree.scale_bar_font_size = function(attr) {
        if (!arguments.length) return scale_bar_font_size;
        scale_bar_font_size = attr === undefined ? 12 : attr;
        return phylotree;
    }


    phylotree.node_circle_size = function(attr, attr2) {
        if (!arguments.length) return options['node_circle_size'];
        options['node_circle_size'] = d3.functor(attr === undefined ? 3 : attr);
        return phylotree;
    }

    phylotree.needs_redraw = function() {
        return needs_redraw;
    }

    phylotree.svg = function(svg_element) {
        if (!arguments.length) return svg_element;
        if (!(svg === svg_element)) {
            svg = svg_element;
            svg.selectAll("*").remove();
            svg_defs = svg.append("defs");
            d3.select(self.container).on("click", function(d) {
                phylotree.handle_node_click(null);
            }, true);
        }
        return phylotree;
    }

    phylotree.css = function(opt) {

        if (arguments.length == 0) return css_classes;
        if (arguments.length > 2) {
            var arg = {};
            arg[opt[0]] = opt[1];
            return phylotree.css(arg);
        }

        for (key in css_classes) {
            if (key in opt && opt[key] != css_classes[key]) {
                css_classes[key] = opt[key];
            }
        }
        return phylotree;
    }

    phylotree.options = function(opt, run_update) {
        if (!arguments.length) return options;

        var do_update = false;

        for (key in options) {
            if (key in opt && opt[key] != options[key]) {
                do_update = true;
                options[key] = opt[key];
                switch (key) {
                    case 'branches':
                        {
                            switch (opt[key]) {
                                case 'straight':
                                    {
                                        draw_branch.interpolate('linear');
                                        break;
                                    }
                                default:
                                    {
                                        draw_branch.interpolate('step-before');
                                        break;
                                    }
                            }
                        }
                        break;
                }
            }
        }

        if (run_update && do_update) {
            phylotree.layout();
        }

        return phylotree;
    }

    phylotree.transitions = function(arg) {
        if (arg !== undefined) {
            return arg;
        }
        if (options['transitions'] !== null) {
            return options['transitions'];
        }

        return nodes.length <= 300;
    }

    phylotree.update = function(transitions) {

        if (!phylotree.svg)
            return phylotree;

        transitions = phylotree.transitions(transitions);

        var node_id = 0;

        var enclosure = svg.selectAll("." + css_classes["tree-container"]).data([0]);

        enclosure.enter().append("g")
            .attr("class", css_classes["tree-container"]);

        enclosure.attr("transform", function(d) {
            return d3_phylotree_svg_translate([offsets[1] + options["left-offset"], phylotree.pad_height()]);
        });

        if (draw_scale_bar) {
            var scale_bar = svg.selectAll("." + css_classes["tree-scale-bar"]).data([0]);
            scale_bar.enter().append("g");
            scale_bar.attr("class", css_classes["tree-scale-bar"])
                .style("font-size", "" + scale_bar_font_size)
                .attr("transform", function(d) {
                    return d3_phylotree_svg_translate([offsets[1] + options["left-offset"], phylotree.pad_height() - 10]);
                })
                .call(draw_scale_bar);
            scale_bar.selectAll("text")
                .style("text-anchor", "end");
        } else {
            svg.selectAll("." + css_classes["tree-scale-bar"]).remove();
        }




        var drawn_links = enclosure.selectAll(d3_phylotree_edge_css_selectors(css_classes))
            .data(links.filter(d3_phylotree_edge_visible), function(d) {
                return d.target.id || (d.target.id = ++node_id);
            });

        if (transitions) {
            drawn_links.exit().transition().remove();
        } else {
            drawn_links.exit().remove();
        }
        drawn_links.enter().insert("path", ":first-child");
        drawn_links.each(function(d) {
            phylotree.draw_edge(this, d, transitions);
        });


        var collapsed_clades = enclosure.selectAll(d3_phylotree_clade_css_selectors(css_classes))
            .data(nodes.filter(d3_phylotree_is_node_collapsed), function(d) {
                return d.id || (d.id = ++node_id);
            });


        var spline = function() {};
        var spline_f = undefined;

        // Collapse radial differently
        if (phylotree.radial()) {

            // create interpolator
            var interpolator = function(points) {

                points.pop();

                var center_node = points.shift();
                var path_string = points.join("L");

                var polar_coords = cartesian_mapper(center_node[0], center_node[1]);

                var first_angle = cartesian_mapper(points[0][0], points[0][1])[1]
                var last_angle = cartesian_mapper(points[points.length - 1][0], points[points.length - 1][1])[1]

                var connecting_arc = "A " + polar_coords[0] + " " + polar_coords[0] + " " + (first_angle > last_angle ? 1 : 0) + " 0 0 " + points[0].join(',');

                return path_string + connecting_arc;

            }

            spline = d3.svg.line()
                .interpolate(interpolator)
                .y(function(d) {
                    return d[0];
                })
                .x(function(d) {
                    return d[1];
                });

            spline_f = function(coord, i, d, init_0, init_1) {
                if (i) {
                    return [d.screen_y + (coord[0] - init_0) / 50, d.screen_x + (coord[1] - init_1) / 50];
                } else {
                    return [d.screen_y, d.screen_x]
                }
            }

        } else {

            spline = d3.svg.line()
                .interpolate("basis")
                .y(function(d) {
                    return d[0];
                })
                .x(function(d) {
                    return d[1];
                });

            spline_f = function(coord, i, d, init_0, init_1) {
                if (i) {
                    return [d.screen_y + (coord[0] - init_0) / 50, d.screen_x + (coord[1] - init_1) / 50];
                } else {
                    return [d.screen_y, d.screen_x]
                }
            }
        }

        var cce = collapsed_clades.exit().each(function(d) {
            d.collapsed_clade = null;
        }).remove();

        if (transitions) {
            collapsed_clades.enter().insert("path", ":first-child");
            collapsed_clades.attr("class", css_classes["clade"])
                .attr("d", function(d) {
                    if (d.collapsed_clade) {
                        return d.collapsed_clade;
                    }
                    init_0 = d.collapsed[0][0];
                    init_1 = d.collapsed[0][1];
                    return spline(d.collapsed.map(spline_f, d, init_0, init_1));
                })
                .transition()
                .attr("d", function(d) {
                    return d.collapsed_clade = spline(d.collapsed);
                });
        } else {
            collapsed_clades.enter().insert("path", ":first-child")
                .attr("class", css_classes["clade"])
                .attr("d", function(d) {
                    return spline(d.collapsed);
                });
        }


        var drawn_nodes = enclosure.selectAll(d3_phylotree_node_css_selectors(css_classes))
            .data(nodes.filter(d3_phylotree_node_visible), function(d) {
                return d.id || (d.id = ++node_id);
            });

        var append_here = drawn_nodes.enter().append("g");

        if (transitions) {
            //drawn_nodes.exit().transition ().style ("opacity", "0").remove();
            drawn_nodes.exit().transition().remove();
            drawn_nodes = drawn_nodes.attr("transform", function(d) {
                return "translate(" + d.screen_x + "," + d.screen_y + ")";
            }).transition();
        } else {
            drawn_nodes.exit().remove();
        }

        drawn_nodes.attr("transform", function(d) {
                d.screen_x = x_coord(d);
                d.screen_y = y_coord(d);
                return d3_phylotree_svg_translate([d.screen_x, d.screen_y]);
            })
            .attr("class", phylotree.reclass_node).each(function(d) {
                phylotree.draw_node(this, d, transitions);
            });

        var sizes = d3_phylotree_resize_svg(phylotree, svg, transitions);

        var brush = enclosure.selectAll("." + css_classes["tree-selection-brush"]).data([0]);
        brush.enter().insert("g", ":first-child")
            .attr("class", css_classes["tree-selection-brush"]);

        var brush_object = d3.svg.brush()
            .x(d3.scale.identity().domain([0, sizes[0] - offsets[1] - options["left-offset"]]))
            .y(d3.scale.identity().domain([0, sizes[1] - phylotree.pad_height()]))
            .on("brush", function() {
                var extent = d3.event.target.extent(),
                    shown_links = links.filter(d3_phylotree_edge_visible),
                    selected_links = shown_links.filter(function(d, i) {

                        return d.source.screen_x >= extent[0][0] && d.source.screen_x <= extent[1][0] && d.source.screen_y >= extent[0][1] && d.source.screen_y <= extent[1][1] && d.target.screen_x >= extent[0][0] && d.target.screen_x <= extent[1][0] && d.target.screen_y >= extent[0][1] && d.target.screen_y <= extent[1][1];
                    }).map(function(d) {
                        return d.target;
                    });

                phylotree.modify_selection(links.map(function(d) {
                    return d.target;
                }), "tag", false, selected_links.length > 0, "false");
                phylotree.modify_selection(selected_links, "tag", false, false, "true");
            }).
        on("brushend", function() {
            brush.call(d3.event.target.clear());
        });

        brush.call(brush_object);

        return phylotree;
    };

    phylotree.css_classes = function() {
        return css_classes;
    }

    phylotree.layout = function(transitions) {
        if (svg) {
            svg.selectAll("." + css_classes["tree-container"] + ",." + css_classes["tree-scale-bar"] + ",." + css_classes["tree-selection-brush"]).remove();
            return phylotree.update(transitions);
        }
        return phylotree;
    }

    phylotree.refresh = function() {
        var self = this;

        var enclosure = svg.selectAll("." + css_classes["tree-container"]);

        var edges = enclosure.selectAll(d3_phylotree_edge_css_selectors(css_classes));
        edges.attr("class", phylotree.reclass_edge);

        if (edge_styler) {
            edges.each(function(d) {
                edge_styler(d3.select(this), d);
            });
        }

        var nodes = enclosure.selectAll(d3_phylotree_node_css_selectors(css_classes));
        nodes.attr("class", phylotree.reclass_node);

        if (node_styler) {
            nodes.each(function(d) {
                node_styler(d3.select(this), d);
            });
        }
    }

    phylotree.reclass_edge = function(edge) {
        var class_var = css_classes["branch"];
        if (d3_phylotree_item_tagged(edge)) {
            class_var += " " + css_classes["tagged-branch"];
        }
        if (d3_phylotree_item_selected(edge, selection_attribute_name)) {
            class_var += " " + css_classes["selected-branch"];
        }
        return class_var;
    }

    phylotree.reclass_node = function(node) {
        var class_var = css_classes[d3_phylotree_is_leafnode(node) ? "node" : "internal-node"];

        if (d3_phylotree_item_tagged(node)) {
            class_var += " " + css_classes["tagged-node"];
        }

        if (d3_phylotree_item_selected(node, selection_attribute_name)) {
            class_var += " " + css_classes["selected-node"];
        }

        if (d3_phylotree_is_node_collapsed(node) || d3_phylotree_has_hidden_nodes(node)) {
            class_var += " " + css_classes['collapsed-node'];
        }
        return class_var;
    }

    phylotree.select_all_descendants = function(node, terminal, internal) {
        var selection = [];

        function sel(d) {
            if (d3_phylotree_is_leafnode(d)) {
                if (terminal) {
                    if (d != node)
                        selection.push(d);
                }
            } else {
                if (internal) {
                    if (d != node)
                        selection.push(d);
                }
                d.children.forEach(sel);
            }
        }
        sel(node);
        return selection;
    }

    phylotree.path_to_root = function(node) {
        var selection = [];
        while (node) {
            selection.push(node);
            node = node.parent;
        }
        return selection;
    }

    phylotree.draw_edge = function(container, edge, transition) {

        container = d3.select(container);

        container.attr("class", phylotree.reclass_edge)
            .on("click", function(d) {
                phylotree.modify_selection([d.target], selection_attribute_name);
            });

        var new_branch_path = draw_branch([edge.source, edge.target]);

        if (transition) {
            if (container.datum().existing_path) {
                container.attr("d", function(d) {
                    return d.existing_path;
                });
            }
            container.transition().attr("d", new_branch_path);
        } else {
            container.attr("d", new_branch_path);
        }
        edge.existing_path = new_branch_path;

        var bl = branch_length_accessor(edge.target);
        if (!(bl === undefined)) {
            var haz_title = container.selectAll("title");
            if (haz_title.empty()) {
                haz_title = container.append("title");
            }
            haz_title.text("Length = " + bl);
        } else {
            container.selectAll("title").remove();
        }

        if (edge_styler) {
            edge_styler(container, edge);
        }


        return phylotree;
    }

    phylotree.clear_internal_nodes = function(respect) {
        if (!respect) {
            nodes.forEach(function(d) {
                if (!d3_phylotree_is_leafnode(d)) {
                    d[selection_attribute_name] = false;
                }
            });
        }
    }

    phylotree.draw_node = function(container, node, transitions) {
        container = d3.select(container);

        if (d3_phylotree_is_leafnode(node)) {


            var labels = container.selectAll("text").data([node]),
                tracers = container.selectAll("line");

            if (transitions) {
                labels.enter().append("text").style("opacity", 0).transition().style("opacity", 1);
            } else {
                labels.enter().append("text");
            }

            labels.on("click", function(d, i) {
                    phylotree.handle_node_click(d);
                })
                .attr("dy", function(d) {
                    return shown_font_size * 0.33;
                })
                .text(function(d) {
                    return node_label(d);
                }).style("font-size", function(d) {
                    return shown_font_size;
                });



            if (phylotree.radial()) {
                (transitions ? labels.transition() : labels).attr("transform", function(d) {
                        return d3_phylotree_svg_rotate(d.text_angle) + d3_phylotree_svg_translate(phylotree.align_tips() ? phylotree.shift_tip(d) : null)
                    })
                    .attr("text-anchor", function(d) {
                        return d.text_align;
                    });
            } else {
                (transitions ? labels.transition() : labels).attr("text-anchor", "start")
                    .attr("transform", function(d) {
                        return d3_phylotree_svg_translate(phylotree.align_tips() ? phylotree.shift_tip(d) : null)
                    });
            }

            if (phylotree.align_tips()) {
                tracers = tracers.data([node]);
                if (transitions) {
                    tracers.enter().append("line").style("opacity", 0).transition().style("opacity", 1);
                    tracers.attr("x1", function(d) {
                        return (d.text_align == "end" ? -1 : 1) * phylotree.node_bubble_size(node);
                    }).attr("x2", 0).attr("y1", 0).attr("y2", 0);
                    tracers.transition().attr("x2", function(d) {
                        return phylotree.shift_tip(d)[0];
                    }).attr("transform", function(d) {
                        return d3_phylotree_svg_rotate(d.text_angle);
                    });
                } else {
                    tracers.enter().append("line");
                    tracers.attr("x1", function(d) {
                        return (d.text_align == "end" ? -1 : 1) * phylotree.node_bubble_size(node);
                    }).attr("y2", 0).attr("y1", 0).transition().attr("x2", function(d) {
                        return phylotree.shift_tip(d)[0];
                    });
                    tracers.attr("transform", function(d) {
                        return d3_phylotree_svg_rotate(d.text_angle);
                    });
                }
                tracers.classed(css_classes['branch-tracer'], true);
            } else {
                tracers.remove();
            }


            if (options['draw-size-bubbles']) {
                var shift = phylotree.node_bubble_size(node);
                var circles = container.selectAll("circle").data([shift]);
                circles.enter().append("circle");
                if (transitions) {
                    circles = circles.transition();
                }
                circles.attr("r", function(d) {
                    return d;
                });

                if (shown_font_size >= 5) {
                    labels.attr("dx", function(d) {
                        return (d.text_align == "end" ? -1 : 1) * ((phylotree.align_tips() ? 0 : shift) + shown_font_size * 0.33);
                    });
                }

            } else {
                if (shown_font_size >= 5) {
                    labels.attr("dx", function(d) {
                        return (d.text_align == "end" ? -1 : 1) * shown_font_size * 0.33;
                    })
                }
            }

        } else {
            var circles = container.selectAll("circle").data([node]),
                radius = phylotree.node_circle_size()(node);

            if (radius > 0) {
                circles.enter().append("circle");
                circles.attr("r", function(d) {
                        return Math.min(shown_font_size * 0.75, radius);
                    })
                    .on("click", function(d) {
                        phylotree.handle_node_click(d);
                    });
            } else {
                circles.remove();
            }
        }


        if (node_styler) {
            node_styler(container, node);
        }

        return node;

    }

    phylotree.get_nodes = function() {
        return nodes;
    }

    phylotree.get_node_by_name = function(name) {
      return _.findWhere(nodes, {name : name});
    }


    phylotree.assign_attributes = function(attributes) {
      //return nodes;
      // add annotations to each matching node
      _.each(nodes, function(d) {
        if(_.indexOf(_.keys(attributes), d.name) >= 0) {
          d["annotations"] = attributes[d.name];
        }
      });

    }

    phylotree.set_partitions = function(partitions) {
      this.partitions = partitions;
    }

    phylotree.get_partitions = function(attributes) {
      return this.partitions;
    }

    d3.rebind(phylotree, d3_hierarchy, "sort", "children", "value");

    // Add an alias for nodes and links, for convenience.
    phylotree.nodes = phylotree;
    phylotree.links = d3.layout.cluster().links;

    return phylotree;
};

//------------------------------------------------------------------------------

function d3_phylotree_item_selected(item, tag) {
    return (item[tag] || false);
};

function d3_phylotree_node_visible(node) {
    return !(node.hidden || node.notshown || false);
};

function d3_phylotree_node_notshown(node) {
    return node.notshown;
};

function d3_phylotree_edge_visible(edge) {
    return !(edge.target.hidden || edge.target.notshown || false);
};

function d3_phylotree_item_tagged(item) {
    return (item.tag || false);
};

function d3_phylotree_resize_svg(tree, svg, tr) {

    var sizes = tree.size();

    if (tree.radial()) {

        var pad_radius = tree.pad_width(),
            vertical_offset = (tree.options()['top-bottom-spacing'] != 'fit-to-size' ? tree.pad_height() : 0);


        sizes = [sizes[1] + 2 * pad_radius,
            sizes[0] + 2 * pad_radius + vertical_offset
        ];

        if (svg) {
            svg.selectAll("." + tree.css_classes()['tree-container']).attr("transform", "translate (" + (pad_radius) + "," + (pad_radius + vertical_offset) + ")");
        }

    } else {
        sizes = [sizes[1] + (tree.options()['left-right-spacing'] != 'fit-to-size' ? tree.pad_width() : 0),
            sizes[0] + (tree.options()['top-bottom-spacing'] != 'fit-to-size' ? tree.pad_height() : 0)
        ];
    }

    if (svg) {
        if (tr) {
            svg = svg.transition(100);
        }

        svg.attr("height", sizes[1])
            .attr("width", sizes[0]);
    }

    return sizes;
}

function d3_phylotree_is_leafnode(node) {
    return !(node.children && node.children.length);
}

function d3_phylotree_has_hidden_nodes(node) {
    return node.has_hidden_nodes || false;
}

function d3_phylotree_is_node_collapsed(node) {
    return node.collapsed || false;
}

function d3_phylotree_node_css_selectors(css_classes) {
    return [css_classes['node'], css_classes['internal-node'], css_classes['collapsed-node'], css_classes['tagged-node']]
        .reduce(function(p, c, i, a) {
            return p += "g." + c + ((i < a.length - 1) ? "," : "");
        }, "");
}

function d3_phylotree_edge_css_selectors(css_classes) {
    return [css_classes['branch'], css_classes['selected-branch'], css_classes['tagged-branch']]
        .reduce(function(p, c, i, a) {
            return p += "path." + c + ((i < a.length - 1) ? "," : "");
        }, "");
}

function d3_phylotree_clade_css_selectors(css_classes) {
    return [css_classes['clade']]
        .reduce(function(p, c, i, a) {
            return p += "path." + c + ((i < a.length - 1) ? "," : "");
        }, "");
}

function d3_phylotree_newick_parser(nwk_str, bootstrap_values) {

    var clade_stack = [];

    function add_new_tree_level() {
        var new_level = {
            "name": null
        };
        var the_parent = clade_stack[clade_stack.length - 1];
        if (!("children" in the_parent)) {
            the_parent["children"] = [];
        }
        clade_stack.push(new_level);
        the_parent["children"].push(clade_stack[clade_stack.length - 1]);
        clade_stack[clade_stack.length - 1]["original_child_order"] = the_parent["children"].length;
    }

    function finish_node_definition() {
        var this_node = clade_stack.pop();
        if (bootstrap_values && 'children' in this_node) {
            this_node["bootstrap_values"] = current_node_name;
        } else {
            this_node["name"] = current_node_name;
        }
        this_node["attribute"] = current_node_attribute;
        this_node["annotation"] = current_node_annotation;
        current_node_name = '';
        current_node_attribute = '';
        current_node_annotation = '';
    }


    function generate_error(location) {
        return {
            "json": null,
            "error": "Unexpected '" + nwk_str[location] + "' in '" + nwk_str.substring(location - 20, location + 1) + "[ERROR HERE]" + nwk_str.substring(location + 1, location + 20) + "'"
        };
    }

    var automaton_state = 0;
    var current_node_name = '';
    var current_node_attribute = '';
    var current_node_annotation = '';
    var quote_delimiter = null;
    var name_quotes = {
        "'": 1,
        "\"": 1
    };

    var tree_json = {
        "name": "root"
    };
    clade_stack.push(tree_json);

    var space = /\s/;

    for (var char_index = 0; char_index < nwk_str.length; char_index++) {
        try {
            var current_char = nwk_str[char_index];
            switch (automaton_state) {
                case 0:
                    {
                        // look for the first opening parenthesis
                        if (current_char == '(') {
                            add_new_tree_level();
                            automaton_state = 1; // expecting node name
                        }
                        break;
                    }
                case 1: // name
                case 3: // branch length
                    {
                        // reading name
                        if (current_char == ':') {
                            if (automaton_state == 3) {
                                return generate_error(char_index);
                            }
                            automaton_state = 3;
                        } else if (current_char == ',' || current_char == ')') {
                            try {
                                finish_node_definition();
                                automaton_state = 1;
                                if (current_char == ',') {
                                    add_new_tree_level();
                                }
                            } catch (e) {
                                return generate_error(char_index);
                            }
                        } else if (current_char == '(') {
                            if (current_node_name.length > 0) {
                                return generate_error(char_index);
                            } else {
                                add_new_tree_level();
                            }
                        } else if (current_char in name_quotes) {
                            if (automaton_state == 1 && current_node_name.length == 0 && current_node_attribute.length == 0 && current_node_annotation.length == 0) {
                                automaton_state = 2;
                                quote_delimiter = current_char;
                                continue;
                            }
                            return generate_error(char_index);
                        } else {
                            if (current_char == '[') {
                                if (current_node_annotation.length) {
                                    return generate_error(char_index);
                                } else {
                                    automaton_state = 4;
                                }
                            } else {
                                if (automaton_state == 3) {
                                    current_node_attribute += current_char;
                                } else {
                                    if (space.test(current_char)) {
                                        continue;
                                    }
                                    current_node_name += current_char;
                                }
                            }
                        }

                        break;
                    }
                case 2:
                    {
                        if (current_char == quote_delimiter) {
                            if (char_index < nwk_str.length - 1) {
                                if (nwk_str[char_index + 1] == quote_delimiter) {
                                    char_index++;
                                    current_node_name += quote_delimiter;
                                    continue;
                                }
                            }
                            quote_delimiter = 0;
                            automaton_state = 1;
                            continue;
                        } else {
                            current_node_name += current_char;
                        }
                        break;
                    }
                case 4:
                    {
                        if (current_char == ']') {
                            automaton_state = 3;
                        } else {
                            if (current_char == '[') {
                                return generate_error(char_index);
                            }
                            current_node_annotation += current_char;
                        }
                        break;
                    }
            }
        } catch (e) {
            return generate_error(char_index);
        }
    }

    if (clade_stack.length != 1) {
        return generate_error(nwk_str.length - 1);
    }

    return {
        "json": tree_json,
        "error": null
    };
}

function d3_add_custom_menu(node, name, callback, condition) {
    if (!("menu_items" in node)) {
        node["menu_items"] = [];
    }
    if (!node["menu_items"].some(function(d) {
            return d[0] == name && d[1] == callback && d[2] == condition;
        })) {
        node["menu_items"].push([name, callback, condition]);
    }
}

function d3_phylotree_rootpath(attr_name, store_name) {

    attr_name = attr_name || "attribute";
    store_name = store_name || "y_scaled";

    if ('parent' in this) {
        var my_value = parseFloat(this[attr_name]);
        this[store_name] = this.parent[store_name] + (isNaN(my_value) ? 0.1 : my_value);
    } else {
        this[store_name] = 0.;
    }

    return this[store_name];
}

function d3_phylotree_rescale(scale, attr_name) {
    attr_name = attr_name || "y_scaled";
    if (attr_name in this) {
        this[attr_name] *= scale;
    }
}

function d3_phylotree_trigger_refresh(tree) {
    var event = new CustomEvent(d3_layout_phylotree_event_id, {
        'detail': ['refresh', tree]
    });
    document.dispatchEvent(event);
}

function d3_phylotree_trigger_count_update(tree, counts) {
    var event = new CustomEvent(d3_layout_phylotree_event_id, {
        'detail': ['count_update', counts, tree.count_handler()]
    });
    document.dispatchEvent(event);
}

function d3_phylotree_event_listener(event) {
    switch (event.detail[0]) {
        case 'refresh':
            event.detail[1].refresh();
            break;
        case 'count_update':
            event.detail[2](event.detail[1]);
            break;
    }
    return true;
}

function d3_phylotree_add_event_listener() {
    document.addEventListener(d3_layout_phylotree_event_id, d3_phylotree_event_listener, false);
}

function d3_phylotree_svg_translate(x) {
    if (x && (x[0] !== null || x[1] !== null))
        return "translate (" + (x[0] !== null ? x[0] : 0) + "," + (x[1] !== null ? x[1] : 0) + ") ";

    return "";
}


function d3_phylotree_svg_rotate(a) {
    if (a !== null) {
        return "rotate (" + a + ") ";
    }
    return "";
}
