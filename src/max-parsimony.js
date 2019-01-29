import * as _ from "underscore";
import { is_leafnode } from "./nodes";

export default function max_parsimony(respect_existing, attr_name) {

  function populate_mp_matrix(d, attr_name) {

    d.mp = [
      [0, 0], // score for parent selected / not selected
      [false, false]
    ]; // selected or not

    if (is_leafnode(d)) {

      d.mp[1][0] = d.mp[1][1] = d.data.trait == attr_name || false;
      d.mp[0][0] = d.mp[1][0] ? 1 : 0;
      d.mp[0][1] = 1 - d.mp[0][0];

    } else {

      d.children.forEach(pop_mp_mat);

      var s0 = d.children.reduce(function(p, n) {
        return n.mp[0][0] + p;
      }, 0);

      // cumulative children score if this node is 0
      var s1 = d.children.reduce(function(p, n) {
        return n.mp[0][1] + p;
      }, 0);

      // cumulative children score if this node is 1
      // parent = 0

      if (d.data.trait == attr_name) {
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

  const pop_mp_mat = _.partial(populate_mp_matrix, _, attr_name);
  pop_mp_mat(this.nodes);

  this.nodes.each(d => {
    if (d.parent) {
      d.mp = d.mp[1][d.parent.mp ? 1 : 0];
    } else {
      d.mp = d.mp[1][d.mp[0][0] < d.mp[0][1] ? 0 : 1];
    }
    if(d.mp) d.data.trait = attr_name;
  });

  //this.display.modify_selection((d, callback) => {
  //  if (is_leafnode(d.target)) {
  //    return d.target[this.selection_attribute_name];
  //  }
  //  return d.target.mp;
  //});

}
