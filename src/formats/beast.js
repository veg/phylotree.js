import newick_parser from "./newick";

export default function(newick, options) {
  options.left_delimiter = '[';
  options.right_delimiter = ']';
  const parsed_newick = newick_parser(newick, options);
  function parse_beast_node(node) {
    if(node.annotation) {
      node.beast = {};
      const tokens = node.annotation.split(/=|,|{|}/)
        .filter(token => token);
      for(var i = 0; i < tokens.length; i+=2) {
        let key = tokens[i].replace(/&|%/g, '');
        if(/[a-df-zA-DF-Z]+/.test(tokens[i+2])) {
          node.beast[key] = +tokens[i+1];
        } else {
          node.beast[key] = [+tokens[i+1], +tokens[i+2]];
          i++;
        }
      }
    }
    node.annotation = undefined;
    if(node.children) {
      node.children.forEach(parse_beast_node);
    }
  }
  parse_beast_node(parsed_newick.json);
  return parsed_newick;
}
