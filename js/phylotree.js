var d3_layout_phylotree_event_id = "d3.layout.phylotree.event";


d3.layout.phylotree = function () {
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
                                    'collapsible'   : false,
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
                                   'clade' : 'clade'
                                   },
                                   
        nodes                   = [],
        links                   = [],
        x_coord                 = function (d) {return d.y},
        y_coord                 = function (d) {return d.x},
        scales                  = [1,1],
        fixed_width             = [15,100],
        font_size               = 10,
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
        
        function tree_layout (a_node) {
            // returns the x coordinate of the node (where the branch ends)
            
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
                if (a_node.collapsed && !is_under_collapsed_parent) {
                    var save_x = x, 
                        compression = 0.2;
                                            
                    is_under_collapsed_parent = true;
                    a_node.x = a_node.children.map (tree_layout).reduce (function (a,b) {return a+b;}, 0.0) / a_node.children.length;     
                    is_under_collapsed_parent = false;
                    
                    a_node.x = save_x + (a_node.x - save_x) * compression;
                    
                    a_node.collapsed = [[a_node.x, a_node.y]];
                    
                    
                    function map_me (n) {
                        n.hidden = true;
                        if (d3_phylotree_is_leafnode (n)) {
                            x = n.x = save_x + (n.x - save_x) * compression;
                            a_node.collapsed.push ([n.x, n.y]);
                        } else {
                            n.children.map (map_me);
                        }
                    } 
                    
                    
                    x = save_x;
                    map_me (a_node); 
                    a_node.collapsed.push ([a_node.x, a_node.y]);   
                    a_node.hidden = false;               
                    
                } else {
                    a_node.x = a_node.children.map (tree_layout).reduce (function (a,b) {return a+b;}, 0.0) / a_node.children.length;   
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
            d.y = d.y * scales[1];
            if (d.collapsed) {
                d.collapsed.map (function (p) { return [p[0] *= scales[0], p[1] *= scales[1]]; });
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
                
    function phylotree (nwk, bootstrap_values) {
        
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
            return 35;
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
        if (!d3_phylotree_node_collapsed (n)) {
            n.collapsed = true;
        }
    }
    

    phylotree.separation = function(attr) {
        if (!arguments.length) return separation;
        separation = attr;
        return phylotree;
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
            if (n.selected) {
                element_array.push (annotator);
            }
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
    
    phylotree.modify_selection = function (callback) {
            
        if (options["selectable"]) {
            var do_refresh = false;
        
            if (typeof callback === 'function') {
                links.forEach (function (d) {
                    var select_me = callback (d);
                    d.selected = d.selected || false;
                    if (d.selected != select_me) {
                        d.selected = select_me;
                        do_refresh = true;
                        d.target.selected = select_me;
                    }
                });
            } else {
                callback.selected = !callback.selected;
                callback.target.selected = callback.selected;
                do_refresh = true;
             }
        
            if (do_refresh) {
                
                d3_phylotree_trigger_refresh      (phylotree);
                if (phylotree.count_handler()) {
                    d3_phylotree_trigger_count_update (phylotree, {'selected' : links.reduce (function (p, c) { return p + (c.selected ? 1 : 0);}, 0)}, phylotree.count_handler());
                }
            }    
        }
    }
    
    
    phylotree.get_selection = function () {
        return nodes.filter (function (d) {return d.selected; });
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
            if (! (d3_phylotree_is_leafnode (d) || d.selected)) {
                d.selected = callback (d.children);   
            }           
        }
        
        phylotree.modify_selection (function  (d, callback) {
            if (d3_phylotree_is_leafnode (d.target)) {
                return d.target.selected;
            }
            return d.target.selected;
        });
    }
    
    phylotree.max_parsimony = function (respect_existing) {
      
        phylotree.clear_internal_nodes (respect_existing);
        
        function populate_mp_matrix (d) {        
            d.mp = [[0,0], // score for parent selected / not selected
                    [false, false]]; // selected or not  
                      
            if (d3_phylotree_is_leafnode (d)) {
                d.mp [1][0] = d.mp [1][1] = d.selected || false;
                d.mp [0][0] = d.mp [1][0] ? 1 : 0;
                d.mp [0][1] = 1 - d.mp [0][0];
            } else {
                d.children.forEach (populate_mp_matrix);
                
                var s0 = d.children.reduce (function (p,n) {return n.mp[0][0] + p;}, 0); 
                    // cumulative children score if this node is 0
                var s1 = d.children.reduce (function (p, n) {return n.mp[0][1] + p;}, 0);
                    // cumulative children score if this node is 1
                                    
                // parent = 0
                
                if (d.selected) {
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
                return d.target.selected;
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
    
    phylotree.spacing_x = function(attr) {
        if (!arguments.length) return fixed_width[0];
        if (fixed_width[0] != attr && attr >= 2 && attr <= 100) {
            fixed_width[0] = attr;
            phylotree.placenodes();
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
    
    
    
    phylotree.svg = function (svg_element) {
        if (!arguments.length) return default_scale_attribute;
        if (!( svg === svg_element)) {
            svg = svg_element;
            svg.selectAll ("*").remove();
        }
        return phylotree;
    }
    
    
    phylotree.tag  = function (callback) {
        var do_refresh = false;
    
        nodes.forEach (
            function (d) {
                var tag_me = callback(d);
                if (d.tag != tag_me) {
                    d.tag = tag_me;
                    do_refresh = true;
                    
                }
            }
        );
        
        var selected_count = 0;
        links.forEach (function (d) { selected_count += (d.tag = d.source.tag || d.target.tag); });
        if (do_refresh) {
            d3_phylotree_trigger_refresh (phylotree);
        }
        return selected_count;
         
    };  
    
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
        
        var enclosure   = svg.selectAll ("." + css_classes["tree-container"]).data ([0])
                        .enter().append ("g")
                        .attr ("class", css_classes["tree-container"])
                        .attr ("transform", function (d) { return "translate(" + offsets[1] + "," + (phylotree.pad_height()) + ")";}); 
                 
        if (draw_scale_bar) {
            var scale_bar = svg.selectAll ("." + css_classes["tree-scale-bar"]).data ([0]);
            scale_bar.enter().append("g");
            scale_bar.attr ("class", css_classes["tree-scale-bar"])
                     .attr ("transform", function (d) { return "translate(" + offsets[1] + "," + (phylotree.pad_height()-10) + ")";}) 
                     .call (draw_scale_bar);
            scale_bar.selectAll ("text")
                     .style ("text-anchor", "end");
        }    
        
        var drawn_links = enclosure.selectAll(d3_phylotree_edge_css_selectors(css_classes))
              .data(links.filter (d3_phylotree_edge_visible), function (d) {return d.target.id || (d.target.id = ++node_id);});
              
        drawn_links.enter().append("path")
              .each (function (d) { 
                phylotree.draw_edge (this, d, transitions);
               });
               
               
        if (transitions) {
            drawn_links.exit().transition().remove();          
        } else {
            drawn_links.exit().remove();  
        }                           

        label_width = 0;
    
        var drawn_nodes = enclosure.selectAll(d3_phylotree_node_css_selectors(css_classes))
            .data(nodes.filter (d3_phylotree_node_visible), function (d) { return d.id || (d.id = ++node_id);});
            
        var append_here =    drawn_nodes.enter().append("g");
        if (transitions) {
            append_here = append_here.attr("transform", function(d) {return "translate(" + d.screen_x + "," + d.screen_y + ")"; }).transition();
            drawn_nodes.exit().style ("opacity", "1").transition ().style ("opacity", "0").remove();
        }  else {
            drawn_nodes.exit().remove();
        }
            
        append_here.attr("transform", function(d) { d.screen_x = x_coord(d); d.screen_y = y_coord(d); return "translate(" + d.screen_x + "," + d.screen_y + ")"; })
            .attr("class", function (d) {  
                    if (d3_phylotree_node_collapsed (d)) {
                        return css_classes ['collapsed-node'];
                    }
                    if (!d3_phylotree_is_leafnode (d)) { 
                        return css_classes['internal-node'];
                    }
                    return css_classes['node'];
                 }
             ).each (function (d) { label_width = Math.max (label_width,phylotree.draw_node (this, d)); });                             
        
        
        
       var collapsed_clades = enclosure.selectAll(d3_phylotree_clade_css_selectors(css_classes))
          .data(nodes.filter (d3_phylotree_is_node_collapsed), function (d) {return d.id || (d.id = ++node_id);});
       
       var spline = d3.svg.line()
            .interpolate("basis")
            .y(function(d) { return d[0]; })
            .x(function(d) { return d[1]; });
            
     
       collapsed_clades.exit().remove();
       
       if (transitions) {
           collapsed_clades.enter().append("path")
                                   .attr ("class", css_classes ["clade"])
                                   .attr ("d", function (d) { 
                               
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
                                   .attr ("d", function (d) { return spline (d.collapsed); })
                                   ;
        } else {
           collapsed_clades.enter().append("path")
                                   .attr ("class", css_classes ["clade"])
                                   .attr ("d", function (d) { return spline (d.collapsed); });
        }
        
        d3_phylotree_resize_svg (phylotree, svg, transitions);
        return phylotree;
    }; 
    
    phylotree.layout = function (transitions) {
        if (svg) {
            svg.selectAll("." + css_classes["tree-container"] + ",." + css_classes["tree-scale-bar"]).remove();
            return phylotree.update(transitions);       
        }
        return phylotree;
    }
    
    phylotree.refresh = function () {
        var enclosure = svg.selectAll ("." + css_classes["tree-container"]);
        
        enclosure.selectAll(d3_phylotree_edge_css_selectors(css_classes))
                        .attr("class", phylotree.reclass_edge);
                             
        enclosure.selectAll(d3_phylotree_node_css_selectors(css_classes))
                 .attr ("class", phylotree.reclass_node);

    }

    phylotree.reclass_edge = function (edge) {
        var class_var = css_classes["branch"];
        if (d3_phylotree_item_tagged (edge)) {
            class_var += " " + css_classes ["tagged-branch"];
        }
        if (d3_phylotree_item_selected (edge)) {
            class_var += " " + css_classes ["selected-branch"];
        }
        return class_var;
    }

    phylotree.reclass_node = function (node) {
        var class_var = css_classes[ d3_phylotree_is_leafnode (node) ? "node" : "internal-node"];
        if (d3_phylotree_item_tagged (node)) {
            class_var += " " + css_classes ["tagged-node"];
        }
        if (d3_phylotree_item_selected (node)) {
            class_var += " " + css_classes ["selected-node"];
        }
        return class_var;
    }   
    
    phylotree.draw_edge = function (container, edge, transition) {
        container = d3.select(container);
        
        container.attr("class", phylotree.reclass_edge)
                 .on ("click", function (d) { phylotree.modify_selection (d); });
                  
        var new_branch_path = draw_branch ([edge.source, edge.target]);
                 
        if (transition) {
            container.attr("d", function (d) { return d.existing_path;}).transition().attr("d", new_branch_path);
        } else {
            container.attr("d", new_branch_path);
        }
        edge.existing_path = new_branch_path;
                
        if (edge_styler) {
            edge_styler (container, edge);
        }

        return phylotree;
    }
    
    phylotree.clear_internal_nodes = function (respect) {
        if (!respect) {
            nodes.forEach (function (d) {
                if (!d3_phylotree_is_leafnode(d)) {
                    d.selected = false;
                }   
            }
            );
        }
    }

    phylotree.draw_node = function (container, node) {
        container = d3.select(container);
        
        var max_x = 0;        
        if (d3_phylotree_is_leafnode (node)) {    
            if (options['draw-size-bubbles']) {
                var shift = relative_node_span (node) * scales[0] * 0.5;
            
                container.append ("circle").attr ("r", function (d) { return shift;});
                         


                if (shown_font_size >= 5) {
                    labels = container.append("text")
                       .on ("click", function (d, i) { 
                        d3_phylotree_node_selector.call (this, d,  css_classes['selected-branch']);
                       })
                      .attr("dx", function(d) { return shift + shown_font_size * 0.33; })
                      .attr("dy", function(d) { return shown_font_size * 0.33; })
                      .attr("text-anchor", function(d) { "start"; })
                      .text(function(d) { var lbl = node_label (d); max_x = lbl.length * shown_font_size * 0.5; return lbl;})
                      .style ("font-size", function (d) {return shown_font_size;});
                }
                  
            } else {
                if (shown_font_size >= 5) {
                    labels = container.append("text")
                       .on ("click", function (d, i) { 
                        d3_phylotree_node_selector.call (this, d,  css_classes['selected-branch']);
                       })
                      .attr("dx", function(d) { return shown_font_size * 0.33; })
                      .attr("dy", function(d) { return shown_font_size * 0.33; })
                      .attr("text-anchor", function(d) { "start"; })
                      .text(function(d) { var lbl = node_label (d); max_x = lbl.length * shown_font_size * 0.5; return lbl;})
                      .style ("font-size", function (d) {return shown_font_size;});          
                } 
            }  
            
        } else {
            container.append ("circle").attr ("r", function (d) { return Math.min (shown_font_size * 0.75, 3);})
                .on ("dblclick",  function (d) { phylotree.toggle_collapse(d).layout (true);} );
        }
        
        
         
        if (node_styler) {
            node_styler (container, node);
        }


        /*labels[0].forEach (function (d) { 
          
                var position = svg[0][0].createSVGPoint();
                var rect = d.getBBox(); 
                var ctm = d.getCTM();  
                position.x = rect.x + rect.width;
                position.y = rect.y + rect.height*0.5;
                position = position.matrixTransform (ctm);
                
          });*/
                 
        return max_x;
    }
    

    d3.rebind(phylotree, d3_hierarchy, "sort", "children", "value");

  // Add an alias for nodes and links, for convenience.
    phylotree.nodes = phylotree;
    phylotree.links = d3.layout.cluster().links;
  
    return phylotree;
};

//------------------------------------------------------------------------------

function d3_phylotree_item_selected (item) {
    return (item.selected || false);
};

function d3_phylotree_node_visible (node) {
    return !(node.hidden || false);
};

function d3_phylotree_edge_visible (edge) {
    return !(edge.target.hidden || false);
};


function d3_phylotree_item_tagged (item) {
    return (item.tag || false);
};

function d3_phylotree_resize_svg (tree, svg, tr) {
    if (svg) {
        if (tr) {
            svg = svg.transition (100);
        }
        svg.attr ("height", tree.size()[0] + tree.pad_height())
           .attr ("width" , tree.size()[1] + tree.pad_width());
    }
}


function d3_phylotree_is_leafnode (node) {
    return ! (node.children && node.children.length);
}

function d3_phylotree_is_node_collapsed (node) {
    return node.collapsed;
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



function d3_phylotree_newick_parser (nwk_str, bootstrap_values) {

    var clade_stack = [];

    function add_new_tree_level () {
        var new_level  = {"name" : null};
        var the_parent = clade_stack[clade_stack.length-1];
        if (!("children" in the_parent)) {
            the_parent["children"] = [];
        }
        clade_stack.push (new_level);
        the_parent["children"].push (clade_stack[clade_stack.length-1]);
    }

    function finish_node_definition () {
       var this_node = clade_stack.pop();
       if (bootstrap_values && 'children' in this_node) {
            this_node["bootstrap_values"] = current_node_name;
       } else {
            this_node["name"]      = current_node_name;
       }
       this_node["attribute"] = current_node_attribute;
       current_node_name = '';
       current_node_attribute = '';
    }

    
    function generate_error (location) {
        return {"json": null, "error": "Unexpected '" + nwk_str[location] + "' in '" + nwk_str.substring (location - 20, location + 1) + "[ERROR HERE]" + nwk_str.substring (location + 1, location + 20) + "'"};
    }

    var automaton_state        = 0; 
    var current_node_name      = '';
    var current_node_attribute = '';
    
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
            case 1:
            case 3: 
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
                } else if (current_char == "'") {
                    if (automaton_state == 1 && current_node_name.length == 0 && current_node_attribute.length == 0) {
                        automaton_state = 2;
                        continue;
                    }
                    return generate_error (char_index);
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
                
                break;
            }
            case 2: {
                if (current_char == "'") {
                    if (char_index < nwk_str.length - 1) {
                        if (nwk_str[char_index+1] == "'") {
                            char_index ++;
                            current_node_name += "'";
                            continue;
                        }
                    }
                    automaton_state = 1;
                    continue;
                } else {
                    current_node_name += current_char;
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

function d3_phylotree_default_branch_length (_node)   { 
    
}



function    d3_phylotree_add_event_listener () {
    document.addEventListener(d3_layout_phylotree_event_id,d3_phylotree_event_listener,false);
}

