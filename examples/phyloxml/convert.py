from sys import argv
from Bio import Phylo

xml_filename = argv[1] + '.xml'
newick_filename = argv[1] + '.new'

tree = Phylo.read(xml_filename, 'phyloxml')
Phylo.write(tree, newick_filename, 'newick')
