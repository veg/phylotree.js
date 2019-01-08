export function postOrder(node, callback, backtrack) {
  let nodes = [node],
    next = [],
    children,
    i,
    n;

  while ((node = nodes.pop())) {
    if (!(backtrack && backtrack(node))) {
      next.push(node), (children = node.children);
      if (children)
        for (i = 0, n = children.length; i < n; ++i) {
          nodes.push(children[i]);
        }
    }
  }

  while ((node = next.pop())) {
    callback(node);
  }

  return node;
}

export function preOrder(node, callback, backtrack) {
  let nodes = [node],
    children,
    i;

  while ((node = nodes.pop())) {
    if (!(backtrack && backtrack(node))) {
      callback(node), (children = node.children);
      if (children)
        for (i = children.length - 1; i >= 0; --i) {
          nodes.push(children[i]);
        }
    }
  }

  return node;
}

export default function inOrder(node, callback, backtrack) {
  let current,
    next = [node],
    children,
    i,
    n;

  do {
    (current = next.reverse()), (next = []);
    while ((node = current.pop())) {
      if (!(backtrack && backtrack(node))) {
        callback(node), (children = node.children);
        if (children)
          for (i = 0, n = children.length; i < n; ++i) {
            next.push(children[i]);
          }
      }
    }
  } while (next.length);

  return node;
}
