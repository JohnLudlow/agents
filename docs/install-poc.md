# POC: Installing this repository as an APM package

This POC demonstrates how to install the repository as an APM package using a git URL or a local path.

Install from local path (Windows):

  apm install "C:\\src\\git\\gh\\JohnLudlow\\agents"

Install from git shorthand (defaults to default branch/HEAD):

  apm install JohnLudlow/agents

Install a specific tag, branch or commit:

  apm install JohnLudlow/agents#v0.0.1-poc    # tag
  apm install JohnLudlow/agents#feature-branch # branch
  apm install JohnLudlow/agents#abcdef123456   # commit

How apm resolves versions when using git URLs:

- If no ref is supplied, apm clones the repository and installs the default branch's HEAD (latest commit). The resolved commit SHA is recorded in `apm.lock.yaml`.
- To pin a release, use a tag (recommended): `#vMAJOR.MINOR.PATCH`.
- You can also specify a branch or a commit SHA with `#ref`.
- CI reproducibility: run `apm install --update` to refresh lockfile, then CI should use `apm install --frozen` to ensure the same resolved SHAs are used.

Notes about this POC

- This POC places the `johnludlow-implementer` agent under `.apm/agents/` so `apm install` will hoist it into supported runtime directories.
- The repository's previous multi-harness plugin installer (scripts/install.js) is out-of-scope for this package and will be deprecated; APM is the supported installer going forward.

Validation

- Locally validate the package layout:

  node scripts/validate-apm-package.js

- If you have apm installed, try packing / dry-run:

  apm pack --dry-run

Next steps

- Expand `.apm/` with additional agents and skills, add `apm.lock.yaml` by running `apm install` once, and add CI that runs `apm install --frozen` to validate reproducibility.

## Versioning & Releases

- CI-driven releases: the repository's CI uses GitVersion to compute a semantic version and applies it during the build. The canonical release workflow is to create a tag `vMAJOR.MINOR.PATCH` and push it; CI will create the release artifacts and tag the commit.

  ```bash
  git tag -a v1.2.3 -m "Release v1.2.3"
  git push origin v1.2.3
  ```

- Local / ad-hoc bump: to test packaging locally you may edit the `version:` field in `apm.yml` and run `apm pack` or create a local tag as shown above. Prefer creating a tag for official releases so CI-generated metadata remains consistent.

- Lockfile: after running `apm install --update` locally, commit the generated `apm.lock.yaml` to ensure CI and other developers reproduce the same resolved SHAs.

## Testing changes

Recommended local test steps:

1. Validate markdown and frontmatter:

```bash
npx rumdl check .
node scripts/validate-apm-package.js
```

2. If `apm` CLI is installed, compile and dry-run the package:

```bash
apm compile
apm pack --dry-run
```

3. Install locally to test runtime placement:

```bash
apm install "C:\src\git\gh\JohnLudlow\agents"  # Windows
# or
apm install ./
```

4. Inspect the generated target files (e.g., `.github/agents/`, `opencode/agents/`) and test in the target runtime (Copilot, OpenCode).

5. For CI reproducibility: run `apm install --update` locally, commit `apm.lock.yaml`, then the CI job should run `apm install --frozen` to verify the same resolved content is installed.

