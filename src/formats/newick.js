var newick_parser = function(nwk_str, bootstrap_values) {
  var clade_stack = [];

  function add_new_tree_level() {
    var new_level = {
      name: null
    };
    var the_parent = clade_stack[clade_stack.length - 1];
    if (!("children" in the_parent)) {
      the_parent["children"] = [];
    }
    clade_stack.push(new_level);
    the_parent["children"].push(clade_stack[clade_stack.length - 1]);
    clade_stack[clade_stack.length - 1]["original_child_order"] =
      the_parent["children"].length;
  }

  function finish_node_definition() {
    var this_node = clade_stack.pop();
    this_node["name"] = current_node_name;
    if (bootstrap_values && "children" in this_node) {
      this_node["bootstrap_values"] = current_node_name;
    } else {
      this_node["name"] = current_node_name;
    }
    this_node["attribute"] = current_node_attribute;
    this_node["annotation"] = current_node_annotation;
    current_node_name = "";
    current_node_attribute = "";
    current_node_annotation = "";
  }

  function generate_error(location) {
    return {
      json: null,
      error:
        "Unexpected '" +
        nwk_str[location] +
        "' in '" +
        nwk_str.substring(location - 20, location + 1) +
        "[ERROR HERE]" +
        nwk_str.substring(location + 1, location + 20) +
        "'"
    };
  }

  var automaton_state = 0;
  var current_node_name = "";
  var current_node_attribute = "";
  var current_node_annotation = "";
  var quote_delimiter = null;
  var name_quotes = {
    "'": 1,
    '"': 1
  };

  var tree_json = {
    name: "root"
  };
  clade_stack.push(tree_json);

  var space = /\s/;

  for (var char_index = 0; char_index < nwk_str.length; char_index++) {
    try {
      var current_char = nwk_str[char_index];
      switch (automaton_state) {
        case 0: {
          // look for the first opening parenthesis
          if (current_char == "(") {
            add_new_tree_level();
            automaton_state = 1; // expecting node name
          }
          break;
        }
        case 1: // name
        case 3: {
          // branch length
          // reading name
          if (current_char == ":") {
            automaton_state = 3;
          } else if (current_char == "," || current_char == ")") {
            try {
              finish_node_definition();
              automaton_state = 1;
              if (current_char == ",") {
                add_new_tree_level();
              }
            } catch (e) {
              return generate_error(char_index);
            }
          } else if (current_char == "(") {
            if (current_node_name.length > 0) {
              return generate_error(char_index);
            } else {
              add_new_tree_level();
            }
          } else if (current_char in name_quotes) {
            if (
              automaton_state == 1 &&
              current_node_name.length === 0 &&
              current_node_attribute.length === 0 &&
              current_node_annotation.length === 0
            ) {
              automaton_state = 2;
              quote_delimiter = current_char;
              continue;
            }
            return generate_error(char_index);
          } else {
            if (current_char == "[") {
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
                if (current_char == ";") {
                  // semicolon terminates tree definition
                  char_index = nwk_str.length;
                  break;
                }
                current_node_name += current_char;
              }
            }
          }

          break;
        }
        case 2: {
          // inside a quoted expression
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
        case 4: {
          // inside a comment / attribute
          if (current_char == "]") {
            automaton_state = 3;
          } else {
            if (current_char == "[") {
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

  if (current_node_name.length) {
    tree_json.name = current_node_name;
  } else {
    tree_json.name = " ";
  }

  return {
    json: tree_json,
    error: null
  };
};

module.exports = newick_parser;
