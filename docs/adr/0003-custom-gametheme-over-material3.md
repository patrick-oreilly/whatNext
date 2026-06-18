# Custom GameTheme over Material3 in the mobile client

The Mobile Client uses a custom `GameTheme` token system (colors, typography,
shapes, spacing) instead of Compose Material3's `MaterialTheme`. The game's
neo-brutalist visual identity — 4px hard borders, zero-radius shapes, geometric
offset shadows, high-contrast orange/black/white palette — is a product-level
brand decision, not a platform accommodation. Material3 softens edges, blurs
shadows, and applies rounded corners; letting its defaults bleed in would make
the mobile client feel like a utility app rather than a game.

**Considered option:** standard `MaterialTheme` with custom `ColorScheme` and
`Shapes`. Rejected because the M3 shape language applies rounding globally, its
elevation system uses blur shadows, and fighting its defaults through overrides
on every component is more code than building a lean custom token system — while
still leaving traces of the Material aesthetic.

**Consequence:** no Compose Material3 components (`Card`, `Button`,
`Surface`) are used for game surfaces. Common neo-brutalist primitives (`GameBox`,
`GameButton`) are built on `Box`, `Border`, and `Modifier.offset` with the custom
tokens. The Material3 dependency stays for small utility surfaces (snackbar,
bottom sheet) where soft aesthetics don't harm the brand.
