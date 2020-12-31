import * as d3 from "d3";
import * as _ from "underscore";

/**
 * Return CSV of nodes sorted by longest branches.
 *
 * @param {Function} annotator - Function to apply to each node, determining
 * what label is written (optional).
 * @returns {Array} newick - Phylogenetic tree serialized as a Newick string.
 */

export default function getTipLengths() {

  // Get nodes and branch lengths
  let self = this;
  let tips = self.get_tips();

  // Transform to name, attribute key-pair and sort by attribute length, descending
  let toExport = _.map(tips, d => { return {'name' : d.data.name, 'length' : parseFloat(d.data.attribute) } });
  toExport = _.sortBy(toExport, d=> -d.length)
  return toExport;
  
  
}
