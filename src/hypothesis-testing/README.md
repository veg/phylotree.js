# Hypothesis testing

## Slatkin-Maddison

An implementation of the [Slatkin-Maddison](http://www.genetics.org/content/123/3/603.short) test for compartmentalization.

```
slatkin-maddison --newick $PATH_TO_NEWICK_FILE \
	--iterations $NUMBER_OF_BOOTSTRAP_ITERATIONS \
	--seed $RANDOM_NUMBER_GENERATOR_SEED \
	--csv $PATH_TO_CSV \
	--regex $COMPARMENT_1_NAME,$COMPARMENT_1_REGEX ... $COMPARMENT_N_NAME,$COMPARMENT_N_REGEX
```

Show help:

```
slatkin-maddison --help
```

### Regular expressions

Comma delimited regexes can be used, of the form

```
$COMPARTMENT_NAME,$REGULAR_EXPRESSION
```

The idea is to give a verbose name for the compartment, and a regular expression to be ran on all leaf names to test whether a leaf belongs to that compartment.

Test on tree with two compartments:

```
slatkin-maddison --newick data/compartmentalization/compartmentalized_NL_NP.new --regex NL,NL NP,NP
```

Test on tree with three compartments:

```
slatkin-maddison --newick data/compartmentalization/multiple_BR_LG_LN.new --regex BR,BR LG,LG LN,LN
```

### CSV files

Alternatively, a CSV file of leaf name/compartment associations can be provided, so long as it is in the following format.

| branch_name | compartment |
| --- | --- |
| Leaf1 | Blood |
| Leaf2 | Blood |
| Leaf3 | CSF |
| Leaf4 | CSF |

Column names are unimportant, but they must be in the order above, i.e. leaf name first, compartment second. Also, leaf names in the first columns must match leaf names in the newick file.

Test on a tree with two compartments:

```
slatkin-maddison --newick data/compartmentalization/not_compartmentalized_CL_CP.new --csv data/compartmentalization/not_compartmentalized_CL_CP.csv
```