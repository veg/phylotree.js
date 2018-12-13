function handle_rotate(only_self, this_node) {

  tree.resort_children(
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

export default handle_rotate;
