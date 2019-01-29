# Hypothesis testing

## Slatkin-Maddison

An implementation of the [Slatkin-Maddison](http://www.genetics.org/content/123/3/603.short) test for compartmentalization.

```
slatkin-maddison --newick $PATH_TO_NEWICK_FILE \
	--iterations $NUMBER_OF_BOOTSTRAP_ITERATIONS \
	--seed $RANDOM_NUMBER_GENERATOR_SEED \
	--regex $COMPARMENT_1_NAME,$COMPARMENT_1_REGEX ... $COMPARMENT_N_NAME,$COMPARMENT_N_REGEX
```

### Examples

Show help:

```
slatkin-maddison --help
```

Test on tree with two compartments:

```
slatkin-maddison --newick data/compartmentalization/compartmentalized_NL_NP.new --regex NL,NL NP,NP
```

Test on tree with three compartments:

```
slatkin-maddison --newick data/compartmentalization/multiple_BR_LG_LN.new --regex BR,BR LG,LG LN,LN
```