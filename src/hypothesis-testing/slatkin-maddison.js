import * as _ from "underscore";

function get_migration_events (tree) {


  return 0;

}

/*
 * Slatkin-Maddison test
 */
export default function slatkin_maddison(tree) {

  // tree has to have an attribute
  // 1) max parsimony, then 2) count migration events

  let tree_migration_events = get_migration_events(tree);

  // permute tips
  return tree_migration_events;


}
