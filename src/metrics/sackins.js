import * as _ from "underscore";

/*
 * The Sackin's index is computed as the sum of the number of ancestors for each
 * tips of the tree.
 *
 * The less balanced a tree is, the larger its Sackin's index.
 *
 */

export default function sackin(tree) {

  // Get tips of tree
  let tips = tree.get_tips();

  // Count number of ancestors to root for each tree
  let depths = _.map(tips, d => { return d.depth });

  return _.reduce(depths, function(memo, num){ return memo + num; }, 0);

}
