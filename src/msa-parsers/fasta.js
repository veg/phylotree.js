export default function parseFasta(fastaData) {
  let sfasta = String(fastaData).split("\n");

  let starts = sfasta
    .map((d, i) => (d.startsWith(">") ? i : -1))
    .filter((d) => d != -1);

  let seqs = {};
  starts.forEach((start, k) => {
    let record = sfasta.slice(start, starts[k + 1]);
    seqs[record[0].replace(/^>+|>+$/g, "")] = record.slice(1).join("");
  });

  return seqs;
}
