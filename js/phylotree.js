var d3_layout_phylotree_event_id = "d3.layout.phylotree.event",
    d3_layout_phylotree_context_menu_id = "d3_layout_phylotree_context_menu";


d3.layout.phylotree = function (container) {
    
    var self = this;
        self.container = container;
        
    var d3_hierarchy            = d3.layout.hierarchy().sort(null).value(null),
        size                    = [1,1],
        newick_string           = null,
        separation              = function (_node,_previos) { return 0;},
        node_span               = function (_node)   { return 1; },
        relative_node_span      = function (_node)   { return node_span (_node) / rescale_node_span},
        def_branch_length_accessor  = function (_node) {
            if ("attribute" in _node && _node["attribute"] && _node["attribute"].length) {
                var bl = parseFloat(_node["attribute"]);
                if (! isNaN (bl)) {
                    return Math.max(0,bl);
                }
            }  
            return undefined; 
        },
        branch_length_accessor  = def_branch_length_accessor,
        def_node_label          = function (_node) {
            if (options ['internal-names'] || d3_phylotree_is_leafnode (_node)) {
                    return _node.name || "";
                }
                return "";
        },
        node_label              = def_node_label,          
        length_attribute        = null,
        scale_attribute         = "y_scaled",
        needs_redraw            = true,
        svg                     = null,
        layout_mode             = 'left-to-right',
        branch_mode             = 'step',
        options                 = {
                                    'layout' : 'left-to-right',
                                    'branches' : 'step',
                                    'scaling' : true,
                                    'bootstrap' : false,
                                    'internal-names': false,
                                    'selectable'    : true,
                                    'collapsible'   : true,
                                    'y-spacing' : 'fit-to-size',
                                    'x-spacing' : 'fixed-width',
                                    'show-scale' : 'top',
                                    'draw-size-bubbles': false
                                  },
                                  
        css_classes             = {'tree-container': 'phylotree-container',
                                   'tree-scale-bar': 'tree-scale-bar',
                                   'node': 'node',
                                   'internal-node': 'internal-node',
                                   'tagged-node': 'node-tagged',
                                   'selected-node' : 'node-selected',
                                   'collapsed-node': 'node-collapsed',
                                   'branch': 'branch',
                                   'selected-branch': 'branch-selected',
                                   'tagged-branch': 'branch-tagged',
                                   'tree-selection-brush': 'tree-selection-brush',
                                   'clade' : 'clade'
                                   },
                                   
        nodes                   = [],
        links                   = [],
        x_coord                 = function (d) {return d.y},
        y_coord                 = function (d) {return d.x},
        scales                  = [1,1],
        fixed_width             = [15,100],
        font_size               = 12,
        scale_bar_font_size     = 12,
        node_circle_size        = 3,
        offsets                 = [0,font_size],
                
        draw_branch             = d3.svg.line ()
                                 .x(function(d) { return x_coord(d); })
                                 .y(function(d) { return y_coord(d); })
                                 .interpolate ("step-before"),
                                                
        draw_scale_bar          = null,
        rescale_node_span       = 1,
        count_listener_handler  = undefined,
        node_styler             = undefined,
        edge_styler             = undefined,
        shown_font_size         = font_size,
        selection_attribute_name  = 'selected',
        popover_displayed       = null,
        label_width             = 0;
 
 
    phylotree.placenodes = function () {
    
        var x          = 0.,
            _extents     = [[0,0],[0,0]],
            last_node  = null,
            last_span  = 0;
    
        var do_scaling = options ["scaling"],
            undef_BL   = false,
            is_under_collapsed_parent = false,
            max_depth  = 1,
            leaf_counter = 0;
            
        function process_internal_node (a_node) {
            var count_undefined = 0;
            a_node.x = a_node.children.map (tree_layout).reduce (function (a,b) {if (typeof b == "number") return a+b; count_undefined += 1; return a;}, 0.0);
            if (count_undefined == a_node.children.length) {
                a_node.notshown = true;
                a_node.x = undefined;
                return;
            }  else {
                a_node.x /= (a_node.children.length-count_undefined);
            }
        }
        
        function tree_layout (a_node) {
            // returns the x coordinate of the node (where the branch ends)
            
            if (d3_phylotree_node_notshown (a_node)) {
                return undefined;
            }
            
            var is_leaf = d3_phylotree_is_leafnode (a_node);
            
            if ("parent" in a_node) {
               if (do_scaling) {
                    if (undef_BL) {
                        return 0;
                    }
                    a_node.y = branch_length_accessor (a_node);
                    if (typeof a_node.y === 'undefined') {
                        undef_BL = true;
                        return 0;
                    }
                    a_node.y += a_node.parent.y;
                } else {
                    a_node.y = is_leaf ? max_depth : a_node.depth;
                }
            } else {
               x          = 0.;
               _extents     = [[0,0],[0,0]];
               last_node  = null;
               last_span  = 0;         
               a_node.y   = 0.;
            }

            if (is_leaf) {
                var _node_span = node_span (a_node) / rescale_node_span;
                x = a_node.x = x + separation (last_node, a_node) + (last_span + _node_span) * 0.5;
                last_node = a_node;
                _extents[0][1] = Math.max (_extents[0][1], x + _node_span * 0.5 + separation (last_node, a_node));
                _extents[1][1] = Math.max (_extents[1][1], a_node.y);
                _extents[1][0] = Math.min (_extents[1][0], a_node.y - _node_span * 0.5);
                last_span = _node_span;     
            } else {
                var count_undefined = 0;
                if (d3_phylotree_is_node_collapsed (a_node) && !is_under_collapsed_parent) {
                    var save_x = x, 
                        compression = 0.2,
                        save_span = last_span*0.5;
                                            
                    is_under_collapsed_parent = true;
                    process_internal_node (a_node);
                    is_under_collapsed_parent = false;
                    if (typeof a_node.x === "number") {
                    
                        a_node.x = save_x + (a_node.x - save_x) * compression + save_span;
                        a_node.collapsed = [[a_node.x, a_node.y]];
                    
                        function map_me (n) {
                            n.hidden = true;
                            if (d3_phylotree_is_leafnode (n)) {
                                x = n.x = save_x + (n.x - save_x) * compression + save_span;
                                a_node.collapsed.push ([n.x, n.y]);
                            } else {
                                n.children.map (map_me);
                            }
                        } 
                    
                        x = save_x;
                        map_me (a_node); 
                    
                        a_node.collapsed.splice (1,0,[save_x, a_node.y]);   
                        a_node.collapsed.push ([x, a_node.y]);   
                        a_node.collapsed.push ([a_node.x, a_node.y]);   
                        a_node.hidden = false;            
                    } 
                    
                } else {
                    process_internal_node (a_node);
                }
            } 
            
            return a_node.x;
        }
        
        rescale_node_span = nodes.map (function (d) { return node_span (d); }).reduce (function (p,c) {return Math.min (c,p || 1e200)}, null) || 1;          
         
        nodes[0].x = tree_layout (nodes[0], do_scaling);
         
        if (do_scaling && undef_BL) {
            do_scaling = false;
            max_depth = nodes.reduce (function (p, c) { return Math.max (p,c.depth); }, 0);
            nodes[0].x = tree_layout (nodes[0]);
        }
        
        //console.log (_extents[1][0], node_span (nodes[0]) / rescale_node_span, nodes[0], rescale_node_span);
        
        if (options['y-spacing'] == 'fixed-width') {
            size[1] = _extents[1][1] * fixed_width[1];
            scales[1] = fixed_width[1];
        } else {
            if (options['x-spacing'] == 'fixed-width') {
                 offsets [1] = Math.max (font_size, -_extents[1][0] * fixed_width[0]);
                 scales  [1] = (size[1] - offsets [1])  / _extents[1][1];                 
            } else {
                scales[1] = (size[1])  / _extents[1][1];
            }
        }
        
        if (options['x-spacing'] == 'fixed-width') {
            size[0] = _extents[0][1] * fixed_width[0];
            scales[0] = fixed_width[0];
       } else {
            scales[0] = size[0] / _extents[0][1];
       }
        
       shown_font_size = Math.min (font_size, scales[0]);
       nodes.forEach (function (d) { 
            d.x *= scales[0]; 
            d.y *= scales[1];
            if (d.collapsed) {
                d.collapsed.map (function (p) { return [p[0] *= scales[0], p[1] *= scales[1]]; });
                var last_x = d.collapsed[1][0];
                d.collapsed = d.collapsed.filter (function (p, i) { 
                    if (i < 3 || i > d.collapsed.length - 4) return true;
                    if (p[0] - last_x > 3) {
                        last_x = p[0];
                        return true;
                    }
                    return false;
                });
            }
        });

       if (options['show-scale'] && do_scaling) {
            var scale = d3.scale.linear ()
                .domain ([0, _extents[1][1]])
                .range  ([0, size[1] - offsets[1]]),
                scaleTickFormatter = d3.format ("1r");    
                
            draw_scale_bar  =  d3.svg.axis().scale(scale).orient ("top")
                                .tickFormat (function (d) { if (d == 0) {return ""}; return scaleTickFormatter(d); });
            //_extentsconsole.log (scale.domain(), scale.range());
        } else {
            draw_scale_bar = null;
        }
    };
                
    function phylotree(nwk, bootstrap_values) {
        
        d3_phylotree_add_event_listener ();
        

        var _node_data = (typeof nwk == "string") ? d3_phylotree_newick_parser (nwk, bootstrap_values) : nwk;
                        // this builds children and links;
                    
        if  (!_node_data ['json']) {
            nodes = [];
        }   else {        
            newick_string = nwk;
            nodes = d3_hierarchy.call (this, _node_data.json);
        }
                
        phylotree.placenodes();
        links = phylotree.links (nodes);
        return phylotree;
    }
    
    phylotree.size = function(attr) {
        if (!arguments.length) return size;
        if (options['x-spacing'] != 'fixed-width') {
            size[0] = attr[0];
        } 
        if (options['y-spacing'] != 'fixed-width') {
            size[1] = attr[1];
        } 
        return phylotree;
    };
    
    phylotree.pad_height = function () {
        if (draw_scale_bar) {
            return scale_bar_font_size + 25;
        }
        return 0;
    }

    phylotree.pad_width = function (){
        //console.log (offsets, label_width);
        return offsets[1] + label_width;
    }
    
    phylotree.descendants = function (n) {
        var desc = [];
        function recurse_d (nd) {
            if (d3_phylotree_is_leafnode (nd)) {
                desc.push (nd);
            } else {
                nd.children.forEach (recurse_nd);
            }
        }
        recurse_d (n);
        return desc;
    }
    
    phylotree.collapse_node = function (n) {
        if (!d3_phylotree_is_node_collapsed (n)) {
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
        phylotree.sync_edge_labels ();
        return phylotree;
    };
        
    phylotree.handle_node_click = function (node) {
        var menu_object = d3.select(self.container).select("#" + d3_layout_phylotree_context_menu_id);
        
         if (menu_object.empty()) {
            menu_object = d3.select (self.container).append ("ul")
                .attr ("id", d3_layout_phylotree_context_menu_id)
                .attr ("class","dropdown-menu")
                .attr ("role", "menu");
         }
        
        menu_object.selectAll ("li").remove();
        if (node) {
            if (!d3_phylotree_is_leafnode (node)) {
                if (options["collapsible"]) {
                    menu_object.append ("li").append ("a")
                                             .attr ("tabindex", "-1")
                                             .text (d3_phylotree_is_node_collapsed (node) ? "Expand Subtree" : "Collapse Subtree")
                                             .on ("click", function (d) {menu_object.style ("display", "none"); phylotree.toggle_collapse (node).update (true);});
                    menu_object.append ("li").attr ("class", "divider");
                    menu_object.append ("li").attr ("class", "dropdown-header").text ("Toggle selection");
                }
            
                if (options["selectable"]) {
                    menu_object.append ("li").append ("a")
                                             .attr ("tabindex", "-1")
                                             .text ("All descendant branches")
                                             .on ("click", function (d) {menu_object.style ("display", "none"); phylotree.modify_selection (phylotree.select_all_descendants (node, true, true));});
                                     
                    menu_object.append ("li").append ("a")
                                             .attr ("tabindex", "-1")
                                             .text ("All terminal branches")
                                             .on ("click", function (d) {menu_object.style ("display", "none"); phylotree.modify_selection (phylotree.select_all_descendants (node, true, false));});

                    menu_object.append ("li").append ("a")
                                             .attr ("tabindex", "-1")
                                             .text ("All internal branches")
                                             .on ("click", function (d) {menu_object.style ("display", "none"); phylotree.modify_selection (phylotree.select_all_descendants (node, false, true));});
                }
            }
            
            if (node.parent) {
                
                if (options["selectable"]) {
                    menu_object.append ("li").append ("a")
                                             .attr ("tabindex", "-1")
                                             .text ("Incident branch")
                                             .on ("click", function (d) {menu_object.style ("display", "none"); phylotree.modify_selection ([node]);});

                    menu_object.append ("li").append ("a")
                                             .attr ("tabindex", "-1")
                                             .text ("Path to root")
                                             .on ("click", function (d) {menu_object.style ("display", "none"); phylotree.modify_selection (phylotree.path_to_root (node));});
                                         
                    menu_object.append ("li").attr ("class", "divider");
                }
                
                menu_object.append ("li").append ("a")
                                         .attr ("tabindex", "-1")
                                         .text ("Reroot on this node")
                                         .on ("click", function (d) {menu_object.style ("display", "none"); phylotree.reroot (node).update (true);});
                                         
                menu_object.append ("li").attr ("class", "divider");
                
                menu_object.append ("li").append ("a")
                                         .attr ("tabindex", "-1")
                                         .text ("Hide this " + (d3_phylotree_is_leafnode (node)? "node":"subtree"))
                                         .on ("click", function (d) {menu_object.style ("display", "none"); phylotree.modify_selection ([node], "notshown", true, true).update_has_hidden_nodes().update(true);});
                                         
                
                                         
            }
            
            if (d3_phylotree_has_hidden_nodes (node)) {
                    menu_object.append ("li").append ("a")
                                             .attr ("tabindex", "-1")
                                             .text ("Show all descendant nodes")
                                             .on ("click", function (d) {menu_object.style ("display", "none"); phylotree.modify_selection (phylotree.select_all_descendants (node, true, true), "notshown", true, true, "false").update_has_hidden_nodes().update(true);});
            }

            var tree_container = $(container);
            var coordinates = d3.mouse(tree_container[0]);
            menu_object.style ("position", "absolute")
                        .style("left", "" + (coordinates[0]) + "px")
                        .style("top", "" + (coordinates[1]) + "px")
                        .style("display", "block"); 

        } else {
            menu_object.style ("display", "none");
        }

    };
    
    phylotree.style_nodes = function(attr) {
        if (!arguments.length) return node_styler;
        node_styler = attr;
        return phylotree;
    };

    phylotree.style_edges = function(attr) {
        if (!arguments.length) return edge_styler;
        edge_styler = attr;
        return phylotree;
    };
    
    phylotree.get_newick = function (annotator) {
        function node_display (n) {
            if (!d3_phylotree_is_leafnode (n)) {
                element_array.push ("(");
                n.children.forEach (function (d, i) {
                    if (i) {
                        element_array.push (",");
                    }
                    node_display (d);
                });
                element_array.push (")");
            }
            element_array.push (node_label (n));
            element_array.push (annotator (n));

            var bl = branch_length_accessor (n);
            if (bl) {
                element_array.push (":" + bl);
            }
            
        }
    
    
        var element_array = [],
        annotator = annotator || "";  
        node_display (nodes[0]);
        return element_array.join ("");
    }
    
    phylotree.update_layout = function (new_json, do_hierarchy) {
        if (do_hierarchy) {
            nodes = d3_hierarchy.call (this, new_json);
            nodes.forEach (function (d) { d.id = null;});
        }
        phylotree.placenodes();
        links = phylotree.links (nodes);
        phylotree.sync_edge_labels ();
    }
    
    phylotree.sync_edge_labels = function () {
        
        links.forEach (function (d) {
            d[selection_attribute_name] = d.target[selection_attribute_name] || false;
            d.tag = d.target.tag || false;
        });
            
        d3_phylotree_trigger_refresh      (phylotree);
        if (phylotree.count_handler()) {
            var counts = {};
            counts[selection_attribute_name] = links.reduce (function (p, c) { return p + (c[selection_attribute_name] ? 1 : 0);}, 0);
            counts['tagged'] = links.reduce (function (p, c) { return p + (d3_phylotree_item_tagged(c) ? 1 : 0);}, 0);
        
            d3_phylotree_trigger_count_update (phylotree, 
            counts, phylotree.count_handler());
        }     
    };
    
    

    phylotree.modify_selection = function (callback, attr, place, skip_refresh, mode) {
            
        attr = attr || selection_attribute_name;        
        mode = mode || "toggle";
        
        if (options["selectable"]) {
            var do_refresh = false;
        
            if (typeof callback === 'function') {
                links.forEach (function (d) {
                    var select_me = callback (d);
                    d[attr] = d[attr] || false;
                    if (d[attr] != select_me) {

                        d[attr] = select_me;
                        do_refresh = true;
                        d.target[attr] = select_me;
                    }
                });
            } else {
                callback.forEach (function (d) {
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
                
                links.forEach (function(d) {
                    d[attr] = d.target[attr];
                });
                
                
             }
        
            if (do_refresh) {
                if (!skip_refresh) {
                    //console.log ("Refresh");
                    d3_phylotree_trigger_refresh      (phylotree);
                }
                if (phylotree.count_handler()) {
                    var counts = {};
                    counts[attr] = links.reduce (function (p, c) { return p + (c[attr] ? 1 : 0);}, 0);
                    d3_phylotree_trigger_count_update (phylotree, 
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
    
    
    phylotree.get_selection = function () {
        return nodes.filter (function (d) {return d[selection_attribute_name]; });
    }
    
    phylotree.count_handler = function (attr) {
        if (!arguments.length) return count_listener_handler;
        count_listener_handler = attr;
        return phylotree;
    }
    
    phylotree.internal_label = function (callback, respect_existing) {
        phylotree.clear_internal_nodes (respect_existing);
        
        for (var i = nodes.length - 1; i >= 0; i--) {
            var d = nodes[i];
            if (! (d3_phylotree_is_leafnode (d) || d3_phylotree_item_selected (d, selection_attribute_name) )) {
                d[selection_attribute_name] = callback (d.children);   
                //console.log (d[selection_attribute_name]);
             }           
        }
        
        phylotree.modify_selection (function  (d, callback) {
            if (d3_phylotree_is_leafnode (d.target)) {
                return d.target[selection_attribute_name];
            }
            return d.target[selection_attribute_name];
        });
    }
    
    phylotree.max_parsimony = function (respect_existing) {
      
        phylotree.clear_internal_nodes (respect_existing);
        
        function populate_mp_matrix (d) {        
            d.mp = [[0,0], // score for parent selected / not selected
                    [false, false]]; // selected or not  
                      
            if (d3_phylotree_is_leafnode (d)) {
                d.mp [1][0] = d.mp [1][1] = d[selection_attribute_name] || false;
                d.mp [0][0] = d.mp [1][0] ? 1 : 0;
                d.mp [0][1] = 1 - d.mp [0][0];
            } else {
                d.children.forEach (populate_mp_matrix);
                
                var s0 = d.children.reduce (function (p,n) {return n.mp[0][0] + p;}, 0); 
                    // cumulative children score if this node is 0
                var s1 = d.children.reduce (function (p, n) {return n.mp[0][1] + p;}, 0);
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
                    }  else {
                        d.mp[0][0] = s1 + 1;
                        d.mp[1][0] = true;
                    }
                
                    // parent = 1
                
                    if (s1 < s0 + 1) {
                        d.mp[0][1] = s1;
                        d.mp[1][1] = true;
                    } else {
                        d.mp[0][1] = s0+1;
                        d.mp[1][1] = false;
                    }
                }
            }        
        }
        
        
        populate_mp_matrix (nodes[0]);
        nodes.forEach (function (d) {
            if (d.parent) {
                d.mp = d.mp[1][d.parent.mp ? 1 : 0];
            } else {
                d.mp = d.mp[1][d.mp[0][0] < d.mp[0][1] ? 0 : 1];
            }
        });
        
        phylotree.modify_selection (function  (d, callback) {
            if (d3_phylotree_is_leafnode (d.target)) {
                return d.target[selection_attribute_name];
            }
            return d.target.mp;
        });
        
    }
          
    phylotree.node_span = function(attr) {
        if (!arguments.length) return node_span;
        if (typeof attr == "string" && attr == 'equal') {
            node_span = function (d) { return 1;};
        } else {
            node_span = attr;
        }
        return phylotree;
    };
    
    /*phylotree.reroot = function (node) {

    }*/
 
    phylotree.resort_children = function (comparator) {
        function sort_children (node) {
            if (node.children) {
                for (var k = 0; k < node.children.length; k++) {
                    sort_children (node.children[k]);
                }
                node.children.sort (comparator);
            }
        }
        
        sort_children (nodes[0]);
        phylotree.update_layout (nodes);
        phylotree.update(true);
    }
    
    phylotree.traverse_and_compute = function (callback, traversal_type) {
        traversal_type = traversal_type || "post-order";
        
        function post_order (node) {
            if (node.children) {
                for (var k = 0; k < node.children.length; k++) {
                    post_order (node.children[k]);
                }
            }
            callback (node);
        }
        
        if (traversal_type == 'post-order') {
            traversal_type = post_order; 
        }
        
        traversal_type (nodes[0]);
    }
    
    phylotree.reroot = function (node) {
        if (node.parent) {
        
            new_json = {'name' : 'new_root',
                        '__mapped_bl' : undefined,
                        'children' : [node]};
                 
            nodes.forEach (function (n) {n.__mapped_bl = branch_length_accessor(n);});
            phylotree.branch_length (function (n) {return n.__mapped_bl;});
                        
            var remove_me    = node,
                current_node = node.parent,
                parent_length = current_node.__mapped_bl,
                stashed_bl = undefined;
                
               
            if (current_node.parent) {
                node.__mapped_bl = node.__mapped_bl === undefined  ? undefined : node.__mapped_bl * 0.5;
                stashed_bl = current_node.__mapped_bl;
                current_node.__mapped_bl = node.__mapped_bl;
                new_json.children.push (current_node);
                while (current_node.parent) {
                    var remove_idx = current_node.children.indexOf (remove_me);
                    if (current_node.parent.parent) {
                        current_node.children.splice (remove_idx,1,current_node.parent);
                    } else {
                         current_node.children.splice (remove_idx,1);
                    }               
                    
                    var t = current_node.parent.__mapped_bl;
                    if (! (t === undefined)) {
                        current_node.parent.__mapped_bl = stashed_bl;
                        stashed_bl = t;
                    }
                    remove_me = current_node;
                    current_node = current_node.parent;
                }
                var remove_idx = current_node.children.indexOf (remove_me);
                current_node.children.splice (remove_idx,1);
           } else {
                var remove_idx = current_node.children.indexOf (remove_me);
                current_node.children.splice (remove_idx,1);
                remove_me = new_json;
                
            }
                
           // current_node is now old root, and remove_me is the root child we came up
           // the tree through
  
            if (current_node.children.length == 1) {
                if (stashed_bl) {
                    current_node.children[0].__mapped_bl += stashed_bl;
                }
                remove_me.children = remove_me.children.concat (current_node.children);
            } else {
                var new_node = {"name" : "__reroot_top_clade"};
                new_node.__mapped_bl = stashed_bl;
                new_node.children  = current_node.children.map (function (n) {return n;});
                remove_me.children.push (new_node);

            }
            /*if (parent_length) {
                remove_me.__mapped_bl += parent_length;
            }*/
            
            
            /*function echo (d) {
                console.log (d.name, d.children);
                if (d.children) {
                    d.children.forEach (echo);
                }
            }*/
            
            phylotree.update_layout (new_json, true);
            
        }
        return phylotree;
        
    };
    
    phylotree.update_key_name = function (old_key, new_key) {
        nodes.forEach (function (n) {
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
        if (fixed_width[0] != attr && attr >= 2 && attr <= 100) {
            fixed_width[0] = attr;
            if (!skip_render) {
                phylotree.placenodes();
            }
        }
        return phylotree;
    };

    phylotree.toggle_collapse = function(node) {

      if (node.collapsed) {
          node.collapsed = false;
          
          function unhide (n) {
              if (!d3_phylotree_is_leafnode (n)) {
                  if (! n.collapsed) {
                      n.children.forEach (unhide);
                  }
              } 
              n.hidden = false;
          }
          
          unhide (node);
          
      } else {
          node.collapsed = true;
      }
      
      phylotree.placenodes();
      return phylotree;
    };
    
    phylotree.update_has_hidden_nodes = function() {
        
        for (k = nodes.length - 1; k >=0 ; k -= 1) {
            if (d3_phylotree_is_leafnode (nodes[k])) {
                nodes[k].has_hidden_nodes = nodes[k].notshown;
            } else {
                nodes[k].has_hidden_nodes = nodes[k].children.reduce (function (p,c) {return c.notshown || p; }, false);
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
     
  phylotree.length = function (attr) {
      if (!arguments.length) return default_length_attribute;
      if (default_length_attribute != attr) {
          default_length_attribute = attr;
          needs_redraw = true;
      }
      return phylotree;
  }

  phylotree.scaler = function (attr) {
      if (!arguments.length) return default_scale_attribute;
      if (default_scale_attribute != attr) {
          default_scale_attribute = attr;
          needs_redraw = true;
      }
      return phylotree;
  }

  phylotree.font_size = function (attr) {
      if (!arguments.length) return font_size;
      font_size = attr ? attr : 12;
      return phylotree;
  }
  
   phylotree.scale_bar_font_size = function (attr) {
      if (!arguments.length) return scale_bar_font_size;
      scale_bar_font_size = attr ? attr : 12;
      return phylotree;
  }

 
   phylotree.node_circle_size = function (attr) {
      if (!arguments.length) return node_circle_size;
      node_circle_size = attr ? attr : 3;
      return phylotree;
  }



  phylotree.svg = function (svg_element) {
      if (!arguments.length) return default_scale_attribute;
      if (!( svg === svg_element)) {
          svg = svg_element;
          svg.selectAll ("*").remove();
          svg_defs = svg.append ("defs");
          d3.select(self.container).on("click", function (d) {phylotree.handle_node_click(null);}, true);
      }
      return phylotree;
  }


  phylotree.options = function (opt, run_update) {
      if (!arguments.length) return options;
      
      var do_update = false;
              
      for (key in options) {
          if (key in opt && opt[key] != options[key]) {
             do_update = true;
             options[key] = opt[key];
             switch (key) {
                  case 'branches': {
                     switch (opt[key]) {
                          case 'straight': {
                              draw_branch.interpolate ('linear');
                              break;
                          }
                          default: {
                              draw_branch.interpolate ('step-before');
                              break;
                          }
                      }
                  }
                  break;
              }
          }
      }
      
      if (run_update && do_update) {
          phylotree.layout ();
      }
      
      return phylotree;
  }

  phylotree.update = function (transitions) {
      if (!phylotree.svg) 
          return phylotree;
          
      var node_id = 0;
      
      var enclosure   = svg.selectAll ("." + css_classes["tree-container"]).data ([0]);
      
      enclosure.enter().append ("g")
                      .attr ("class", css_classes["tree-container"]);
                      
      enclosure.attr ("transform", function (d) { return "translate(" + offsets[1] + "," + (phylotree.pad_height()) + ")";}); 
               
      if (draw_scale_bar) {
          var scale_bar = svg.selectAll ("." + css_classes["tree-scale-bar"]).data ([0]);
          scale_bar.enter().append("g");
          scale_bar.attr ("class", css_classes["tree-scale-bar"])
                   .style ("font-size", "" + scale_bar_font_size)
                   .attr ("transform", function (d) { return "translate(" + offsets[1] + "," + (phylotree.pad_height()-10) + ")";}) 
                   .call (draw_scale_bar);
          scale_bar.selectAll ("text")
                   .style ("text-anchor", "end");
      }    
      

      
      
      var drawn_links = enclosure.selectAll(d3_phylotree_edge_css_selectors(css_classes))
            .data(links.filter (d3_phylotree_edge_visible), function (d) {return d.target.id || (d.target.id = ++node_id);});
            
      if (transitions) {
          drawn_links.exit().transition().remove();          
      } else {
          drawn_links.exit().remove();  
      }  
      drawn_links.enter().insert("path",":first-child");
      drawn_links.each (function (d) { 
              phylotree.draw_edge (this, d, transitions);
             });
             
             
      

      label_width = 0;
      
      var collapsed_clades = enclosure.selectAll(d3_phylotree_clade_css_selectors(css_classes))
        .data(nodes.filter (d3_phylotree_is_node_collapsed), function (d) {return d.id || (d.id = ++node_id);});
     
      var spline = d3.svg.line()
          .interpolate("basis")
          .y(function(d) { return d[0]; })
          .x(function(d) { return d[1]; });
          
      var cce = collapsed_clades.exit().each(function (d) {d.collapsed_clade = null;}).remove();
     
      if (transitions) {
         collapsed_clades.enter().insert("path",":first-child");
         collapsed_clades.attr ("class", css_classes ["clade"])
                         .attr ("d", function (d) {
                              if (d.collapsed_clade) {
                                  return d.collapsed_clade;
                              }
                              init_0 = d.collapsed[0][0];
                              init_1 = d.collapsed[0][1];
                          
                              return spline (d.collapsed.map (
                                  function (coord,i) { 
                                      if (i) {
                                          return [d.screen_y + (coord[0] - init_0) / 50,
                                                  d.screen_x + (coord[1] - init_1) / 50];
                                      }; 
                                      return [d.screen_y, d.screen_x];}))
                                  } )
                         .transition()
                         .attr ("d", function (d) { return d.collapsed_clade = spline (d.collapsed); })
                         ;
      } else {
         collapsed_clades.enter().insert("path",":first-child")
                                 .attr ("class", css_classes ["clade"])
                                 .attr ("d", function (d) { return spline (d.collapsed); });
      }


      var drawn_nodes = enclosure.selectAll(d3_phylotree_node_css_selectors(css_classes))
          .data(nodes.filter (d3_phylotree_node_visible), function (d) { return d.id || (d.id = ++node_id);});
          
      var append_here = drawn_nodes.enter().append("g");
              
      if (transitions) {
          //drawn_nodes.exit().transition ().style ("opacity", "0").remove();
          drawn_nodes.exit().transition ().remove();
          drawn_nodes = drawn_nodes.attr("transform", function(d) {return "translate(" + d.screen_x + "," + d.screen_y + ")"; }).transition();
      }  else {
          drawn_nodes.exit().remove();
      }
          
      drawn_nodes.attr("transform", function(d) { d.screen_x = x_coord(d); d.screen_y = y_coord(d); return "translate(" + d.screen_x + "," + d.screen_y + ")"; })
          .attr("class", phylotree.reclass_node).each (function (d) { label_width = Math.max (label_width,phylotree.draw_node (this, d, transitions)); });                             
      
      var sizes =   d3_phylotree_resize_svg (phylotree, svg, transitions);
      
      var brush = enclosure.selectAll ("." + css_classes["tree-selection-brush"]).data ([0]);
      brush.enter().insert ("g",":first-child")
                  .attr ("class", css_classes["tree-selection-brush"]);
                  
      var brush_object = d3.svg.brush()
          .x(d3.scale.identity().domain([0, sizes[0]-offsets[1]]))
          .y(d3.scale.identity().domain([0,sizes[1]-phylotree.pad_height()]))
          .on("brush", function() {
             var extent = d3.event.target.extent(),
                 shown_links = links.filter (d3_phylotree_edge_visible),
                 selected_links = shown_links.filter (function (d,i) {
               
            return d.source.screen_x >= extent[0][0]  && d.source.screen_x <= extent[1][0]
                    && d.source.screen_y >= extent[0][1] && d.source.screen_y <= extent[1][1]
                    && d.target.screen_x >= extent[0][0] && d.target.screen_x <= extent[1][0]
                    && d.target.screen_y >= extent[0][1] && d.target.screen_y <= extent[1][1];
            }).map (function (d) {return d.target;});
            
            phylotree.modify_selection (links.map (function (d) {return d.target;}),"tag",false,selected_links.length > 0,"false");
            phylotree.modify_selection (selected_links,"tag",false,false,"true");
          }).
          on ("brushend", function () {
              brush.call(d3.event.target.clear());
          });

      brush.call(brush_object);
       
      return phylotree;
  }; 

  phylotree.layout = function (transitions) {
      if (svg) {
          svg.selectAll("." + css_classes["tree-container"] + ",." + css_classes["tree-scale-bar"] + ",." + css_classes["tree-selection-brush"]).remove();
          return phylotree.update(transitions);       
      }
      return phylotree;
  }

  phylotree.refresh = function () {
      var enclosure = svg.selectAll ("." + css_classes["tree-container"]);
      
      var edges = enclosure.selectAll(d3_phylotree_edge_css_selectors(css_classes));
      edges.attr("class", phylotree.reclass_edge);
      
      if (edge_styler) {
          edges.each (function (d) {edge_styler (d3.select(this),d);});
      }           
                        
      var nodes = enclosure.selectAll(d3_phylotree_node_css_selectors(css_classes));
      nodes.attr ("class", phylotree.reclass_node);
      
      if (node_styler) {
          nodes.each (function (d) {node_styler (d3.select(this),d);});
      }        
  }

  phylotree.reclass_edge = function (edge) {
      var class_var = css_classes["branch"];
      if (d3_phylotree_item_tagged (edge)) {
          class_var += " " + css_classes ["tagged-branch"];
      }
      if (d3_phylotree_item_selected (edge, selection_attribute_name)) {
          class_var += " " + css_classes ["selected-branch"];
      }
      return class_var;
  }

  phylotree.reclass_node = function (node) {
      var class_var = css_classes[ d3_phylotree_is_leafnode (node) ? "node" : "internal-node"];
      
      if (d3_phylotree_item_tagged (node)) {
          class_var += " " + css_classes ["tagged-node"];
      }
      
      if (d3_phylotree_item_selected (node, selection_attribute_name)) {
          class_var += " " + css_classes ["selected-node"];
      }
              
      if (d3_phylotree_is_node_collapsed (node) || d3_phylotree_has_hidden_nodes (node)) {
          class_var += " " + css_classes ['collapsed-node'];           
      }
      return class_var;
  }   

  phylotree.select_all_descendants = function (node, terminal, internal) {
      var selection = [];
      function sel (d) {
          if (d3_phylotree_is_leafnode (d)) {
              if (terminal) {
                  if (d != node)
                      selection.push (d);
              }
          } else {
              if (internal) {
                   if (d != node)
                      selection.push (d);
              }
              d.children.forEach (sel);
          }
      }
      sel (node);
      return selection;
  }

   phylotree.path_to_root = function (node) {
      var selection = [];
      while (node) {
          selection.push (node);
          node = node.parent;
      }
      return selection;
  }   

  phylotree.draw_edge = function (container, edge, transition) {
      container = d3.select(container);
      
      container.attr("class", phylotree.reclass_edge)
               .on ("click", function (d) { phylotree.modify_selection ([d.target], selection_attribute_name); });
                
      var new_branch_path = draw_branch ([edge.source, edge.target]);
               
      if (transition) {
         if (container.datum().existing_path) {
              container.attr("d", function (d) { return d.existing_path;});
         }
         container.transition().attr("d", new_branch_path);
      } else {
          container.attr("d", new_branch_path);
      }
      edge.existing_path = new_branch_path;
      
      var bl = branch_length_accessor (edge.target);
      if (! (bl === undefined)) {
        var haz_title = container.selectAll ("title");
        if (haz_title.empty()) {
            haz_title = container.append ("title");
        }
        haz_title.text("Length = " + bl);
      } else {
        container.selectAll ("title").remove();
      }
              
      if (edge_styler) {
           edge_styler (container, edge);
      }
     

      return phylotree;
  }

  phylotree.clear_internal_nodes = function (respect) {
      if (!respect) {
           nodes.forEach (function (d) {
              if (!d3_phylotree_is_leafnode(d)) {
                  d[selection_attribute_name] = false;
              }   
          }
          );
      }
  }

  phylotree.draw_node = function (container, node, transitions) {
      container = d3.select(container);
      
      var max_x = 0;        
      if (d3_phylotree_is_leafnode (node)) {    
      
          var labels = container.selectAll ("text").data ([node]);
          if (transitions) {
              labels.enter().append ("text").style ("opacity", 0).transition ().style ("opacity", 1);
          } else {
              labels.enter().append("text");
          }
          
          labels.on ("click", function (d, i) { 
                        phylotree.handle_node_click(d);
                     })
                    .attr("dy", function(d) { return shown_font_size * 0.33; })
                    .attr("text-anchor", function(d) { "start"; })
                    .text(function(d) { var lbl = node_label (d); max_x = lbl.length * shown_font_size * 0.6; return lbl;})
                    .style ("font-size", function (d) {return shown_font_size;});
      
          
      
          if (options['draw-size-bubbles']) {
              var shift = relative_node_span (node) * scales[0] * 0.5;
              var circles = container.selectAll ("circle").data ([shift]);
              circles.enter().append ("circle");
              if (transitions) {
                  circles = circles.transition();
              }
              circles.attr ("r", function (d) { return d;});

              if (shown_font_size >= 5) {
                  labels.attr("dx", function(d) { return shift + shown_font_size * 0.33; })
                    
              }
                
          } else {
              if (shown_font_size >= 5) {
                   labels.attr("dx", function(d) { return shown_font_size * 0.33; })
              } 
          }  
          
      } else {
          var circles = container.selectAll("circle").data ([node]);
          circles.enter().append ("circle");
          circles.attr ("r", function (d) { return Math.min (shown_font_size * 0.75, node_circle_size);})
              .on ("click", function (d) { phylotree.handle_node_click(d); });
      }
      
      
       
      if (node_styler) {
          node_styler (container, node);
      }

      return max_x;

  }
  
    phylotree.get_nodes = function () {
        return nodes;
    }
    

    d3.rebind(phylotree, d3_hierarchy, "sort", "children", "value");

    // Add an alias for nodes and links, for convenience.
    phylotree.nodes = phylotree;
    phylotree.links = d3.layout.cluster().links;

    return phylotree;
  };

  //------------------------------------------------------------------------------

  function d3_phylotree_item_selected (item, tag) {
    return (item[tag] || false);
  };

  function d3_phylotree_node_visible (node) {
    return !(node.hidden || node.notshown || false);
  };

  function d3_phylotree_node_notshown (node) {
    return node.notshown;
  };

  function d3_phylotree_edge_visible (edge) {
    return !(edge.target.hidden || edge.target.notshown || false);
  };

  function d3_phylotree_item_tagged (item) {
    return (item.tag || false);
  };

  function d3_phylotree_resize_svg (tree, svg, tr) {
    var sizes = [tree.size()[1] + tree.pad_width(),
                tree.size()[0] + tree.pad_height()];
                 
    if (svg) {
        if (tr) {
            svg = svg.transition (100);
        }
        
        svg.attr ("height", sizes[1])
           .attr ("width" , sizes[0]);
    }

    return sizes;
  }

  function d3_phylotree_is_leafnode (node) {
    return ! (node.children && node.children.length);
  }

  function d3_phylotree_has_hidden_nodes (node) {
    return node.has_hidden_nodes || false;
  }

  function d3_phylotree_is_node_collapsed (node) {
    return node.collapsed || false;
  }

  function d3_phylotree_node_css_selectors (css_classes) {
    return [css_classes['node'], css_classes['internal-node'], css_classes['collapsed-node'], css_classes['tagged-node']]
                            .reduce ( function (p, c, i, a) {return p += "g." + c + ((i < a.length-1) ? "," : "");}, "");                  
  }

  function d3_phylotree_edge_css_selectors (css_classes) {
    return [css_classes['branch'], css_classes['selected-branch'], css_classes['tagged-branch']]
                            .reduce ( function (p, c, i, a) {return p += "path." + c + ((i < a.length-1) ? "," : "");}, "");                  
  }

  function d3_phylotree_clade_css_selectors (css_classes) {
    return [css_classes['clade']]
                            .reduce ( function (p, c, i, a) {return p += "path." + c + ((i < a.length-1) ? "," : "");}, "");                  
  }

  function d3_phylotree_newick_parser(nwk_str, container, bootstrap_values) {

    var clade_stack = [];

    function add_new_tree_level () {
        var new_level  = {"name" : null};
        var the_parent = clade_stack[clade_stack.length-1];
        if (!("children" in the_parent)) {
            the_parent["children"] = [];
        }
        clade_stack.push (new_level);
        the_parent["children"].push (clade_stack[clade_stack.length-1]);
        clade_stack[clade_stack.length-1]["original_child_order"] = the_parent["children"].length;
    }

    function finish_node_definition () {
       var this_node = clade_stack.pop();
       if (bootstrap_values && 'children' in this_node) {
            this_node["bootstrap_values"] = current_node_name;
       } else {
            this_node["name"]      = current_node_name;
       }
       this_node["attribute"] = current_node_attribute;
       this_node["annotation"] = current_node_annotation;
       current_node_name = '';
       current_node_attribute = '';
       current_node_annotation = '';
    }

    
    function generate_error (location) {
        return {"json": null, "error": "Unexpected '" + nwk_str[location] + "' in '" + nwk_str.substring (location - 20, location + 1) + "[ERROR HERE]" + nwk_str.substring (location + 1, location + 20) + "'"};
    }

    var automaton_state        = 0; 
    var current_node_name      = '';
    var current_node_attribute = '';
    var current_node_annotation = '';
    var quote_delimiter        = null;
    var name_quotes            = {"'" : 1, "\"" : 1};
    
    var tree_json = {"name": "root"};
    clade_stack.push  (tree_json);
    
    var space = /\s/;
    
    for (var char_index = 0; char_index < nwk_str.length; char_index++) {
        try {
            var current_char = nwk_str[char_index];
            switch (automaton_state) {
                case 0: {
                    // look for the first opening parenthesis
                    if (current_char == '(') {
                        add_new_tree_level ();
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
                            return generate_error (char_index);
                        }
                        automaton_state = 3; 
                    } else if (current_char == ',' || current_char == ')') {
                        try {
                            finish_node_definition ();  
                            automaton_state = 1;
                            if (current_char == ',') {
                                add_new_tree_level();
                            }
                        } 
                        catch (e) {
                            return generate_error (char_index);
                        }
                    } else if (current_char == '(') {
                        if (current_node_name.length > 0) {
                            return generate_error (char_index);
                         } else {
                            add_new_tree_level ();
                        }
                    } else if (current_char in name_quotes) {
                        if (automaton_state == 1 && current_node_name.length == 0 && current_node_attribute.length == 0 && current_node_annotation.length == 0) {
                            automaton_state = 2;
                            quote_delimiter = current_char;
                            continue;
                        }
                        return generate_error (char_index);
                    } else {
                        if (current_char == '[') {
                            if (current_node_annotation.length) {
                                return generate_error (char_index);
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
                case 2: {
                    if (current_char == quote_delimiter) {
                        if (char_index < nwk_str.length - 1) {
                            if (nwk_str[char_index+1] == quote_delimiter) {
                                char_index ++;
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
                case 4: {
                    if (current_char == ']') {
                        automaton_state = 3;
                    } else {
                        if (current_char == '[')  {
                            return generate_error (char_index);
                        }
                        current_node_annotation += current_char;
                    }
                    break;
                }
            }
        } 
        catch (e) {
            return generate_error (char_index);
        }
    }
    
    if (clade_stack.length != 1) {
        return generate_error (nwk_str.length-1);
    }
    
    return {"json": tree_json, "error": null};
  }

  function d3_phylotree_rootpath (attr_name, store_name) {

    attr_name  = attr_name  || "attribute";
    store_name = store_name || "y_scaled"; 
    
    if ('parent' in this) {
        var my_value = parseFloat(this[attr_name]);
        this[store_name] = this.parent[store_name] + (isNaN (my_value) ? 0.1 : my_value);
    } else {
        this[store_name] = 0.;
    }
    
    return this[store_name];
  }   

  function    d3_phylotree_rescale (scale, attr_name) {
    attr_name = attr_name || "y_scaled"; 
    if (attr_name in this) {
        this[attr_name] *= scale;
    }
  }

  function    d3_phylotree_trigger_refresh (tree) {
    var event = new CustomEvent (d3_layout_phylotree_event_id,
                                 {'detail' : ['refresh', tree]});
    document.dispatchEvent (event);
  }

  function    d3_phylotree_trigger_count_update (tree, counts) {
    var event = new CustomEvent (d3_layout_phylotree_event_id,
                                 {'detail' : ['count_update', counts, tree.count_handler()]});
    document.dispatchEvent (event);
  }

  function    d3_phylotree_event_listener (event) {
    switch (event.detail[0]) {
        case 'refresh':
            event.detail[1].refresh();
            break;
        case 'count_update':
            event.detail[2] (event.detail[1]);
            break;
    }
    return true;
  }

  function    d3_phylotree_add_event_listener () {
    document.addEventListener(d3_layout_phylotree_event_id,d3_phylotree_event_listener,false);
  }

