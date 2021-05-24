import * as _ from "underscore";

/**
 * Return CSV of nodes sorted by longest branches.
 *
 * @returns {Array} An array of all tips and associated lengths of the form :
 * [{
 *    name : <tip_name>,
 *    length: <tip_length>
 * }, ...]
 */

export default function getTipLengths() {

  // Get nodes and branch lengths
  let self = this;
  let tips = self.getTips();

  // Transform to name, attribute key-pair and sort by attribute length, descending
  let toExport = _.map(tips, d => { return {'name' : d.data.name, 'length' : parseFloat(d.data.attribute) } });
  toExport = _.sortBy(toExport, d=> -d.length)
  return toExport;
  
  
}
