# NHE6 Unit6 regression tests

Run from the repository root with Node.js:

```sh
node --test tests/build-my-speech/*.test.cjs
```

These tests use the real production modules and card catalog. They cover conditional 3R object choices, optional empty slots, summary text and pronunciation parts, independent second actions, MY WORDS editing, restoring older saved speeches, and real image paths. No external packages are required.

The know regression also checks the real Plus illustration and restoring questions saved when know was text-only, without changing their words or pronunciation.

The Unit6 Plus regression checks all eleven new images through the ordinary dictionary path (without speech-only overrides), identical approved artwork in both consumers, and updating older saved wildlife-product choices to “refuse to buy” while preserving their IDs and pictures.
