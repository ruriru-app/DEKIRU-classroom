# NHE6 Unit6 regression tests

Run from the repository root with Node.js:

```sh
node --test tests/build-my-speech/*.test.cjs
```

These tests use the real production modules and card catalog. They cover conditional 3R object choices, optional empty slots, summary text and pronunciation parts, independent second actions, MY WORDS editing, restoring older saved speeches, and real image paths. No external packages are required.

The know regression also checks the real Plus illustration and restoring questions saved when know was text-only, without changing their words or pronunciation.
