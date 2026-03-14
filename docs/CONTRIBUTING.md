# Documentation Contributions

The source of truth for contribution policy and conduct is [CONTRIBUTOR.md](../CONTRIBUTOR.md).

If you are contributing specifically to the Mintlify docs:

1. Edit files under `docs/`.
2. Keep examples aligned with the checked-in code, not intended future behavior.
3. Run validation before opening a PR:

```bash
mint validate
mint broken-links
mint openapi-check api-reference/openapi.json
```

For a broader project contribution guide, see [docs/contributing.mdx](./contributing.mdx) and [CONTRIBUTOR.md](../CONTRIBUTOR.md).
