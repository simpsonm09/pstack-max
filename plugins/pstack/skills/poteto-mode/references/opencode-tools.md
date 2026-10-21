# OpenCode tool mapping for pstack

pstack skills are written in Claude Code tool language (the `Skill` tool, the `Agent` tool, `AskUserQuestion`, Claude model names). On OpenCode the skills are the same files. The pstack OpenCode plugin registers them, or OpenCode discovers them from the shared skills directory. Read this when a pstack skill names a Claude tool, a driver or bundled skill, or a Claude model. This file is OpenCode-specific.

The OpenCode tool and agent names below have not been checked in a live OpenCode 2.0 session. When a name in this file differs from the tool list of the session you are in, follow the session.

Inside T3 Code, [t3-tools.md](t3-tools.md) takes precedence for dispatch, models, schedules and pull request watching. Otherwise this file applies unchanged.

## Tool actions

| pstack / Claude action | OpenCode equivalent |
|------------------------|---------------------|
| Read a file | `read`. It reads a directory listing too. |
| Create a file | `write` |
| Edit a file | `edit` |
| Delete a file | `bash` (`rm`) |
| Run a shell command | `bash` |
| Search file contents or find files | `grep` and `glob`, or `bash` with `rg` or `find`. A `glob` with an absolute Windows path can return no matches, and a recursive `glob` can return an incomplete tree. For an absolute directory listing, use `read` on the directory or `bash`. Never treat an empty `glob` as proof that a file is absent. |
| Fetch a URL | `webfetch` |
| Search the web | `websearch` |
| Invoke a skill (the `Skill` tool, `/command`) | `skill`, with the skill's directory name as its ID, such as `poteto-mode`. With the pstack plugin, every pstack skill loads by ID, including the `principle-*` references. |
| Dispatch a subagent (the `Agent` or `Task` tool) | `subagent`, with an agent ID from Subagent policy, a description, and a prompt |
| Dispatch N parallel subagents in one turn | N `subagent` calls in one response, each with `background: true` |
| Wait for a subagent result | A background subagent returns at once and reports when it finishes. Do not poll it. |
| Continue or steer a subagent (`SendMessage`) | No verified equivalent. Start a fresh subagent with the consolidated scope, as poteto-mode's [Subagents](../SKILL.md#subagents) section asks. |
| List or stop subagents | No verified equivalent. Record each subagent's ID in `todo.md`, and do not start one you may need to stop. |
| Track tasks (`TaskCreate`, `TaskUpdate`, or `TodoWrite`) | Keep the uncommitted `todo.md` checklist poteto-mode describes. This build assumes no task-tracking tool. |
| Ask the human a fixed-choice question (`AskUserQuestion`) | `question`, when the client supports interactive questions. Otherwise ask in plain text and wait. |
| Schedule a self-paced re-invocation (`ScheduleWakeup`), or the `loop` skill | No equivalent. Re-check by hand. |
| Read this workspace's session transcripts (Claude Code's `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/`) | Not available. Export the session with `opencode session export <session>` and read the export. Do not read OpenCode's database files directly. |
| Isolate a writer in its own git worktree (`isolation: "worktree"`) | Create the worktree with `git worktree add` through `bash`, and give the subagent its path in the prompt. |

## Subagent policy

poteto-mode's [Subagents](../SKILL.md#subagents) section applies on OpenCode through the `subagent` tool, with these changes:

- The `subagent` tool has no `subagent_type` field. It takes an agent ID, and each pstack profile is installed under the ID in its file name:
  - `pstack:poteto-agent`, `general-purpose`, and no type map to `pstack-agent`.
  - `pstack:comment-sicko` maps to `pstack-comment-sicko`.
  - Read-only work maps to `pstack-reviewer`. That covers `readonly: true`, the read-only panels in `how` and `interrogate`, and the `Explore` and `Plan` types. The profile denies edits and shell commands.
- The `subagent` tool has no per-call `model` field. A subagent runs on the session's model unless its profile names one. See Model names.
- A `@<level>` suffix maps to the dispatch effort field on supported runtimes. OpenCode's `subagent` tool has no per-call effort field, so the session's effort applies.
- `run_in_background: true` maps to `background: true` on the `subagent` call.
- `pstack-agent` is the worker profile. Its permissions deny the `subagent` tool, so a worker cannot start more agents. The two read-only profiles deny every action their permission list does not allow. Use `pstack-agent` for work that needs other tools, such as MCP servers.
- Give each writing subagent its own worktree, created as Tool actions describes, or an output directory of its own.
- A review gate stays closed when no independent reviewer can run, as poteto-mode's Subagents section says. A fan-out skill run only to explore may fall back to one labelled sequential pass.

## Model names

pstack ships no default model IDs for OpenCode, as on GitHub Copilot. Skills name the Claude aliases `opus`, `fable`, `sonnet`, `haiku` in their Models sections, and none of them resolves on OpenCode, so pass none of them to any tool.

- A pstack subagent runs on the session's current model. The `subagent` tool takes no per-call model field.
- To run one role on another model, add a `model:` line naming a `provider/model` ID, with an optional `#variant`, to an agent profile outside the installer's managed set. Confirm the ID in the model list the harness shows, then run a fresh subagent and check the model it reports before you rely on it.
- Roles that default to the strongest Claude model (`strongest judgment`) run on the session's model too.
- Diverse-model panels (`arena`, `architect`, `interrogate`, `how` critics, `reflect`) lose their diversity while every reviewer runs on one model. Say so in the verdict. Distinct profiles restore it.

The `/setup-pstack` sheet does not reach OpenCode subagents, so its role lines have no effect here.

## Session routing

The pstack OpenCode plugin registers the shared skills and adds a routing instruction to every session's context. That instruction names this file by its absolute path, and it tells the agent to read this file rather than load a separate skill. Set `routing: false` in the plugin's options to turn the instruction off.

The plugin does not load the `setup-pstack` override sheet, because OpenCode subagents take their model from their profile or the session. A session with no plugin gets no instruction. Load `poteto-mode` with the `skill` tool, or add a standing instruction to `AGENTS.md`.

## Driver and bundled skills pstack references

The [driver policy](../SKILL.md#non-negotiables) selects the app driver. For skills and drivers named by these workflows, use these OpenCode equivalents:

| Skill or driver named in pstack | On OpenCode |
|---------------------------------|-------------|
| `run` (drive a CLI or TUI to see a change work) | No bundled equivalent. Run the app through `bash` and observe the real output, or use a project verification skill. |
| `verify` (the project's `.claude/skills/verify/`, or Claude Code's bundled `/verify`) | A project skill. Read it by path, or write it to `.opencode/skills/verify/`, OpenCode's project skill directory. |
| Project UI driver | Drive the UI with the automation you have, or hand the user a concrete manual check. Do not claim done without observing the artifact. |
| `plugin-dev:skill-development` (Claude's SKILL.md authoring guidance) | No bundled equivalent. Follow the Agent Skills specification: `name` and `description` frontmatter, a directory named after the skill, and progressive disclosure. |
| `loop` (recurring or self-paced re-invocation, used by `babysit`) | No equivalent. Re-check by hand. |

## Per-skill notes

Most skills need only the tables above. These need one more mapping:

| Skill | On OpenCode |
|-------|-------------|
| `poteto-mode` | The todo list falls back to `todo.md`. The Subagents defaults map through Subagent policy above. The Session pickup and Eval playbooks read transcripts through the session export in Tool actions, and mark the step unsupported when that export is not available. |
| `how` | The explorers and the explainer are background `subagent` calls. The explorers take `pstack-reviewer`, and the explainer takes `pstack-agent`. |
| `why` | The investigators and the synthesizer are background `subagent` calls. List MCP servers from the tools the session exposes, not from `.mcp.json` or `claude mcp list`. Start the synthesizer only after every investigator's report has arrived. |
| `interrogate` | The reviewers take `pstack-reviewer`, which is read-only. Keep the panel on distinct models (see Model names). Without distinct profiles the panel runs on one model, so say that in the verdict. |
| `arena` | The candidates run as background `pstack-agent` calls, each in its own worktree. The cross-judge runs as `pstack-reviewer` calls. |
| `architect` | Its runner panel goes through `arena`, so the `arena` row applies. |
| `swarm` | Each worker is a background `pstack-agent` call. Each writing worker gets its own worktree or output directory. |
| `reflect` | The three reviewers take `pstack-reviewer`, and the synthesizer takes `pstack-agent`. The transcript finder reads the session export in Tool actions, not `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/`. |
| `recall` | Search the session export, not `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/`. That directory holds Claude Code transcripts, not this session's history. |
| `show-me-your-work` | Check the log against the session export, not a Claude Code transcript. |
| `teach` | Running `how` and `why` in parallel maps to two background `subagent` calls. This build has no image generation tool, so draw with Mermaid or plain text. |
| `no-comments` | `pstack:comment-sicko` maps to `pstack-comment-sicko`. Pass it the scope, and do not ask it to run `/no-comments`. Run it without a worktree, because a worktree starts from `HEAD` and lacks the scope's uncommitted changes. |
| `setup-pstack` | The override sheet does not reach OpenCode subagents, so its role lines have no effect here. Do not add the sheet to an `instructions` array. Set a role's model on an agent profile, as Model names describes. The `session hook` line does not apply: the plugin's `routing` option controls the routing instruction. |
| `babysit` | `loop` has no equivalent, so re-check by hand. `AskUserQuestion` maps to `question`. |
| `create-verification-skill` | Write the generated skill to `.opencode/skills/verify/`, not `.claude/skills/verify/`. The app-driving harness does not change. |
| `maintain-verification-skill` | The project-local skill lives under `.opencode/skills/`. Its per-feature readers take background `subagent` calls. |
| `automate-me` | Write the personal mode skill to `.opencode/skills/<handle>-mode/SKILL.md`. Read the session export for the workspace's history, not `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects/`. |
| `benchmark-checklist` | Its named Unix tools (`uptime`, `nproc`, `pidstat`, `strace`, `py-spy`, `perf`) may be missing on Windows. Use the platform equivalent, keep the checklist's questions, and use `node --cpu-prof` as the baseline profiler. |
| `correct` | Its rule table goes in the agent instruction file, which OpenCode reads as `AGENTS.md`. |
| `poteto-help` | The workspace installer installs the plugin, and no plugin marketplace command applies. The model sheet does not apply, so set models on agent profiles. With the pstack plugin, every skill loads by ID with `skill`, including the principle references that the Claude Code menu hides. |

## Vendored scripts

`skills/poteto-mode/scripts/` ships the `watch-pr` PR watcher, the `orch` store CLI, and `worktree-audit.mjs`. Run them through `bash`. They need `bun`, `gh`, and, for stack work, `gt`. Run `worktree-audit.mjs` with `node`, as its shebang does. The audit finds each worktree's last chat in Claude Code, Codex, and Pi transcript directories only, so a worktree whose only chats ran on OpenCode is not matched to one.

## Instructions file

Where a pstack skill says "your instructions file", on OpenCode that is `AGENTS.md`. On Claude Code it is `CLAUDE.md`.
