# .mnema

This is the project's mnema record: the signed, append-only log of the decisions behind the
work, kept with the repository and committed with it.

- The record changes as the work does, and each change goes in the same commit as the work
  it describes.
- Nothing here is edited by hand or reformatted. The record is signed bytes: a formatter that
  rewrites one byte of it breaks the proof, so keep prettier and the like away from this folder.
- Private keys are never here: the `.gitignore` in this folder keeps them out of git.

To check it, run `mnema verify` in the project. Without installing anything, clone
https://github.com/felipesauer/mnema and run
`python3 packages/chain/verifier/mnema_verify.py record <this folder>`.
