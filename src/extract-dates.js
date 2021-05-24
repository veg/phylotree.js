import * as d3 from "d3";

const default_date_converter = d3.timeParse("%Y%m%d");

const default_regexp = /([0-9]{4}).?([0-9]{2}).?([0-9]{2})$/g;

const default_date_getter = function(node) {
  if (d3.layout.phylotree.isLeafNode(node)) {
    if ("name" in node) {
      var location = default_regexp.exec(node.name);
      if (location) {
        return location[1] + location[2] + location[3];
      }
    }
  }
  return null;
};

/*
 *  Extracts dates from nodes using a provided callback (defaults supplied),
 *  and also converts them to decimal dates; missing dates are allowed; if desired, missing dates 
 *  can throw exceptions 
 *  
 *  @param tree             : the tree object 
 *
 *  @param date_getter      : a function that extracts date strings from nodes (e.g. by parsing the name),
 *                            default is to extract from the end of the node name, using [YYYY] optional sep [MM] optional sep [DD] format;
 *                            default is implemented in phylotree_extensions.extract_dates.date_getter ()
 *                            
 *  @param date_converter   : if provided, will be used to parse the date string; default is %Y%m%d implemented in 
 *                            phylotree_extensions.extract_dates.date_converter
 *  
 *  
 *  @return tree with date-annotated nodes, i.e. each node will have
 *  
 *      n.date_value (date object, e.g. 2018-08-17); null for missing
 *      n.decimal_date_value (decimal object, e.g. 2018.72)
 *  
 */
const extract_dates = function(tree, date_getter, date_converter=default_date_converter) {

  date_getter = date_getter || default_date_getter;
  
  tree.traverse_and_compute(function(n) {
    var d_string = date_getter(n);
    if (d_string) {
      try {
        n.data.date_value = date_converter(d_string);
        var full_year = n.data.date_value.getFullYear();
        var year_start = new Date(full_year, 0, 1),
          year_start_p1 = new Date(full_year + 1, 0, 1);

        n.data.decimal_date_value =
          full_year +
          (n.data.date_value - year_start) / (year_start_p1 - year_start);
        return;
      } catch (e) {
        // for conversion failures
      }
    }
    n.data.date_value = null;
    n.data.decimal_date_value = null;
  });

  return tree;
};

export default extract_dates;
