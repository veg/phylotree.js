import clear_internal_nodes;

export default function max_parsimony (respect_existing) {

  clear_internal_nodes(respect_existing);

  function populate_mp_matrix(d) {
    d.mp = [
      [0, 0], // score for parent selected / not selected
      [false, false]
    ]; // selected or not

    if (inspector.is_leafnode(d)) {
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

  populate_mp_matrix(self.nodes[0]);

  this.nodes.each(function(d) {
    if (d.parent) {
      d.mp = d.mp[1][d.parent.mp ? 1 : 0];
    } else {
      d.mp = d.mp[1][d.mp[0][0] < d.mp[0][1] ? 0 : 1];
    }
  });

  this.modify_selection(function(d, callback) {

    if (inspector.is_leafnode(d.target)) {
      return d.target[selection_attribute_name];
    }
    return d.target.mp;
  });

};

