import * as _ from "lodash";

export default function parseFasta(fastaData) {


  let sfasta = _.split(fastaData, "\n");

  let seqs = _.chain(sfasta)
    .map((d, i) => (d.startsWith(">") ? i : -1))
    .filter((d) => d != -1)
    .map((d, i, c) => _.slice(sfasta, c[i], c[i + 1]))
    .keyBy((d) => _.trim(d[0], ">"))
    .mapValues((d) => _.tail(d).join(""))
    .value();

  return seqs;

}
