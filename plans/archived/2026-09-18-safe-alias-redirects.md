# Prevent alias redirect loops

- Case-only aliases normalized to canonical note slugs and overwrote note HTML.
- Added a tracked site adapter around the installed AliasRedirects emitter.
- Skip alias targets matching physical or virtual canonical URLs and folder indexes.
- Detect actual filesystem identity collisions without flattening Unicode URLs.
- Preserve original alias metadata, valid alternate aliases and emitter options.
- Full and incremental builds protect unchanged pages as well as changed ones.
- Four focused installed-emitter tests, typecheck, formatting and full build pass.
- Browser checks pass for four formerly looping notes, three Unicode controls,
  a valid alternate alias, and search navigation.
- All226 indexed pages retain content rather than redirect stubs after rebuilding.
