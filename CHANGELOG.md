# Changelog

## 0.5.6 - 2026-05-27

- Fix n8n verification review issues
- Merge pull request #1 from uprockcom/fix/n8n-verification-review

## 0.5.5 - 2026-05-25

- fix: gate sweep behind a feature flag and tag MCP requests

## 0.5.4 - 2026-05-24

- Add sweep MCP request debugging

## 0.5.3 - 2026-05-13

- fix: add credential-level test

## 0.5.2 - 2026-05-13

- Delete .github/workflows/deploy.yml
- chore: align publish workflow with n8n verification

## 0.5.1 - 2026-04-30

- chore: generalize release version bumping
- docs: refine UpRock crawler descriptions
- test: expand UpRock crawler coverage

## 0.5.0 - 2026-04-25

- fix: skip npm provenance for private repo releases

## 0.4.0 - 2026-04-25

- fix: move npm package to uprock-ai scope

## 0.3.0 - 2026-04-25

- fix: publish npm package as public

## 0.2.0 - 2026-04-25

- Initial commit
- chore: ignore local runtime artifacts
- docs: add repository agent guidance
- chore: add TypeScript and lint configuration
- chore: scaffold package metadata
- ci: add package workflow
- docs: add UpRock crawler planning epic
- feat(credentials): add UpRock crawler credential
- feat(icons): add UpRock node icons
- feat(commands): add shared command types
- feat(commands): add crawl fetch fields
- feat(commands): add resource fetch fields
- feat(commands): add sweep fields
- feat(commands): add web research fields
- feat(commands): aggregate command descriptions
- feat(shared): add options and argument cleanup helpers
- feat(shared): implement MCP transport
- feat(shared): normalize MCP outputs
- feat(node): add UpRock crawler node
- test: add mocked transport coverage
- test: add static verification coverage
- docs: document UpRock crawler usage
- chore(docker): add local n8n harness
- chore: mark local work committed
- feat(commands): add composite fetch command
- Update README.md
- ci(deploy): add workflow to install built node into upt-build-main n8n
- ci(deploy): set up Node.js before reading package.json version
- ci(deploy): chown tarball to node user after docker cp
- ci(deploy): run chown as root inside n8n container
- chore: automate GitHub release publishing
