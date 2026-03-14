import newickParser from "./newick";

export default function(newick, options) {
  options.left_delimiter = '[';
  options.right_delimiter = ']';
  const parsed_newick = newickParser(newick, options);
  function parseBeastNode(node) {
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
      node.children.forEach(parseBeastNode);
    }
  }
  parseBeastNode(parsed_newick.json);
  return parsed_newick;
}
