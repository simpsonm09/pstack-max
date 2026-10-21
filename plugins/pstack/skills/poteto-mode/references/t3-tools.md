# T3 tool mapping for pstack

## Detection

Immediately before each dispatch, inspect the live tool list. Use this mapping only when the final name segment `delegate_task` and `orchestrator_capabilities` are both present. A tool listed by name counts as present even when its schema loads on demand. Host prefixes vary. Examples include `mcp__t3-code__delegate_task`, `mcp__t3_code__delegate_task`, and, on OpenCode, `tools["t3-code-<hash>"].delegate_task`. Match the final name, not a fixed prefix.

Do not infer T3 from an environment variable or from the host being started by T3. Neither signal is verified. If either tool is absent, follow the host's own mapping unchanged. Do not mention T3.

## Precedence

When this mapping applies, it outranks each skill's Models and Reasoning effort sections, its table defaults, the native sheet `pstack-models.md`, the native `@<level>` syntax and dispatch effort fields, and the host's `*-tools.md` file for dispatch, models, schedules, and pull request watching only. Everything else follows the host mapping. Every mention of `pstack-models.md` in a skill means `pstack-t3-models.md` while this mapping applies.

## Tool actions

| pstack action | T3 action |
| --- | --- |
| Dispatch one child | Call `delegate_task` with `mode: "async"`, the configured target when present, and a role from the table below. Keep the returned `taskId`. |
| Dispatch a panel or parallel work | Make one `delegate_task` call per entry in one response. |
| Wait for a child | End the turn and let the child's completion wake the thread. Call `task_status` only when its result is needed within the same turn. |
| Cancel a child | Call `task_cancel`, then check `task_status`. |
| Schedule a later task | Call `schedule_task` with `schedule` as an object, not JSON text. Use `list_scheduled_tasks` to find the task by its title and bound thread. Delete only the matching task when it is no longer needed. |
| Watch a pull request | Call `watch_pull_request`, then end the turn. Call `unwatch_pull_request` when handing the work back. |
| Open a pull request | After it is created, call `link_pull_request` with its full URL. Link every layer of a stack. Before finishing, call `list_thread_pull_requests` and link any pull request from this work that is missing. |

Use `t3_thread_launch` only when the user or a playbook asks for a separate top-level conversation. A delegated child is not a top-level conversation.

## Subagent policy

Map native subagent instructions to T3 as follows:

| Native instruction | T3 instruction |
| --- | --- |
| Launch all reviewers in one message with the Agent tool | Make one `delegate_task` call per entry in one response. |
| `subagent_type: "general-purpose"` | Send a plain brief. |
| `subagent_type: "pstack:poteto-agent"` or `"pstack:comment-sicko"` | Start the brief by telling the child to read the named skill or agent file in full, giving its absolute path. |
| `readonly: true` | Say in the brief: inspect only and change no file. |
| `isolation: "worktree"` | Create the worktree first and name its absolute path in the brief. |
| `model` argument | Use the configured sheet entry as the target, or omit `target` when none is configured. |

## Roles

Use the closest role from the `delegate_task` enum:

| pstack activity | T3 role |
| --- | --- |
| Reviewers and judges | `review` |
| Arena and architect runners | `design` or `implementation`, according to the requested output |
| Explorers and `how` or `why` research | `research` |
| Verification runs | `test` |
| Anything else | `general` |

## The sheet

Starting at the session's working directory and walking up its parent folders, use the first `.pstack` folder that contains either T3 file. Read both files from that same folder; a missing file there is absent and does not fall back to the host. If no such folder exists, use the host's per-user config folder.

The host's per-user config directory is:

| Host | Config directory |
| --- | --- |
| Claude Code | `$CLAUDE_CONFIG_DIR` if set, otherwise `~/.claude` |
| Codex | `$CODEX_HOME` if set, otherwise `~/.codex` |
| GitHub Copilot | `$COPILOT_HOME` if set, otherwise `~/.copilot` |
| OpenCode | `${XDG_CONFIG_HOME:-~/.config}/opencode` |
| Pi | `$PI_CODING_AGENT_DIR` if set, otherwise `~/.pi/agent` |

The optional allow-list `pstack-t3-instances.json` sits beside the sheet. A missing sheet is valid. A role absent from the sheet is unset.

Use one `role: value` line per configured role. The role must match a role in `plugins/pstack/models.json`. A value is `inherit-parent`, its alias `auto`, or a comma-separated list of entries. An entry is `<providerInstanceId>/<modelId>` followed by zero or more `<optionId>=<value>` tokens. Split at the first slash so the model ID may contain slashes. `session hook: on` and `session hook: off` are allowed. A `default effort` line and any `@<level>` syntax are invalid.

The panel roles are `arena runners`, `arena cross-judge pool`, `architect runners`, and `interrogate reviewers`. If a panel role is absent, `inherit-parent`, or `auto` in the T3 sheet, use the host's native dispatch and that skill's own defaults exactly as outside T3. Tell the user once per session: `setup-pstack` can configure a mixed-model panel for T3. A configured panel needs at least two model families. Determine a model's family from the first segment of the model ID's last slash-separated part, before its first hyphen. Different provider instances do not make models from one family diverse.

For a non-panel role, an unset value means call `delegate_task` without `target`. Validate each configured entry against a saved `orchestrator_capabilities` result before dispatch. A dispatch without `target` needs no catalog check. The provider instance must exist and have `canRunChildTask: true`. The model must be listed under that instance. Each option must exist for that model, and its value must be listed for that option. When checking is run with an allow-list, each configured provider instance must also be listed with the `pstack` layer and `gate: true`.

### Allow-list entries

Each `instances` entry must use one of these shapes:

- Full access: `{ "layers": ["pstack", ...], "gate": true }`. The `layers` array may include other layer names.
- Read-only: `{ "layers": [], "gate": false, "readOnly": true }`.

Every other combination is invalid. A full entry that includes `readOnly` is rejected. A read-only entry may be used only by a role in the read-only role table below. The checker exports the role list, and a test keeps this table in sync.

When a child is sent to a read-only instance, its brief must say not to edit files, commit, push, or open pull requests. The parent must not later ask that child, or a follow-up round on that instance, to do any of those things.

### Read-only roles

These roles ask children only to read, analyse, and report. The list is defined in `t3-sheet.mjs`; the test verifies that the role names here match it.

| Role | Why its children are read-only |
| --- | --- |
| `how explorer` | Explores source and returns findings. |
| `how explainer` | Produces an explanation from source and findings. |
| `why investigators` | Investigates evidence and returns findings; the skill explicitly says investigators should not write. |
| `why synthesizer` | Synthesizes evidence and reports the rationale. |
| `reflect tooling` | Reviews a transcript for tooling lessons and returns findings; the parent applies any edits. |
| `reflect judgment, divergent, synthesizer` | Reviews, judges, and synthesizes findings; the parent applies any edits. |
| `arena cross-judge pool` | Scores candidate artifacts and recommends a base without changing them. |
| `interrogate reviewers` | Reviews changes and returns a verdict; the skill forbids auto-applying changes. |

## Rejections and fallback

If a target is rejected, try only another explicitly configured, validated entry from the same model family. Do not invent a target or option. If no such entry is available, report that role as unavailable.

Use the host's native dispatch only when the T3 tools are absent or T3 definitively refused the request before creating a task. Say when native dispatch follows a definite refusal. After a timeout or an ambiguous acceptance, check `task_status` first. Never retry natively while a T3 child may exist. If a completed child's result cannot be read, say so and do not dispatch it again without the user's say.

If the T3 tools vanish mid-session, stop new T3 dispatches. For a role that has not started, use native dispatch only after confirming T3 did not accept a task. Do not duplicate an in-flight child.

## Parent hosts

Claude Code and Codex are documented as able to dispatch as a parent in T3 by t3-pstack. OpenCode exposes the tools in its live tool list, measured, but a dispatch has not been measured. Copilot and Pi are unknown.

## Per-skill notes

These skills dispatch children, choose role models, schedule work, or watch pull requests. The generator stamps the conditional T3 line on exactly these entry points.

| Skill | On T3 Code |
| --- | --- |
| `arena` | Runner and judge dispatch uses this mapping. |
| `architect` | Runner dispatch uses this mapping. |
| `automate-me` | Parallel transcript readers use this mapping. |
| `babysit` | PR watching and scheduled follow-up use this mapping. |
| `how` | Explorer and explainer dispatch uses this mapping. |
| `interrogate` | Reviewer dispatch uses this mapping. |
| `maintain-verification-skill` | Parallel source readers use this mapping. |
| `no-comments` | Reviewer dispatch uses this mapping. |
| `poteto-mode` | Shared dispatch policy uses this mapping. |
| `reflect` | Reviewer and synthesizer dispatch uses this mapping. |
| `setup-pstack` | T3 capability and role choices use this mapping. |
| `swarm` | Worker dispatch uses this mapping. |
| `teach` | Composed skill dispatch uses this mapping. |
| `thermos` | Review dispatch uses this mapping. |
| `why` | Investigator and synthesizer dispatch uses this mapping. |

## Source

Adapted from [t3-pstack](https://github.com/chhoumann/t3-pstack) by Christian Bager Bach Houmann, released under the MIT License. The repository root has the license text in `LICENSE-t3-pstack`.
