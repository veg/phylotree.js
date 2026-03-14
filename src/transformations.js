function handleRotate(only_self, this_node) {
  // TODO: This might need tested
  tree.resortChildren( // eslint-disable-line
    function(node1, node2) {
      return node2.ordering - node1.ordering;
    },
    this_node,
    only_self
      ? function(node) {
          return node == this_node;
        }
      : null
  );

  this_node.children.forEach(function(n, i) {
    n.ordering = i;
  });
}

export default handleRotate;
