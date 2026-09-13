# Local subscription CLI adapters

`src/lib/dev-ai/cli.ts` is a server-only, local-development transport. The API route owns access controls, math prompts, JSON validation, and UI integration. This module exports:

- `getDevAiProviderStatuses(): Promise<DevAiProviderStatus[]>`
- `runSubscriptionCli({ provider, prompt, imageDataUrl?, signal? }): Promise<string>`

The returned string contains completed model text only. It is not semantic JSON validation. There is no provider switch, API-key fallback, token extraction, credential copying, account change, proxy service, or quota bypass.

## Provider support

| Provider    | Execution in this adapter               | Native image transport                                                | Authentication and current limitation                                                                                                                                                                                   |
| ----------- | --------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex       | Supported with required installed flags | `codex exec --image` with a temporary image file                      | `codex login status` must positively report ChatGPT, and execution forces ChatGPT login mode.                                                                                                                           |
| Claude Code | Supported with required installed flags | A base64 image content block in stdin `stream-json`                   | `claude auth status --json` must report first-party `claude.ai` authentication and a recognized subscription type.                                                                                                      |
| Antigravity | Currently unavailable                   | Not verified for the installed AGY headless interface                 | Read-only non-credential settings inspection identifies custom/API mode, extra AI credits, and global MCP configuration. The current machine has enabled global MCP servers and no verified per-request isolation flag. |
| Grok        | Currently unavailable                   | Installed CLI advertises `--prompt-json`; not enabled by this adapter | Official `grok inspect --json` includes compatibility-imported configuration. The current machine has global hooks and MCP servers without verified per-request isolation.                                              |

Absent executables are `not-installed`. Positive incompatible configuration is `unsupported`; unknown authentication or an inconclusive probe is `unverified`. Neither state allows inference. The latter two providers are inspected again on refresh, so details reflect current configuration, but removing a configuration blocker alone does not implement the missing authentication/isolation guarantees. `image` means image transport supported by this adapter, not the upstream model's theoretical capability.

## Existing login profiles

The child inherits existing credential-store locations such as `CODEX_HOME` and `CLAUDE_CONFIG_DIR`. An optional server environment variable, `DEV_AI_CODEX_HOME`, selects an existing Codex profile by absolute directory path and becomes `CODEX_HOME` only in the spawned child. It does not create, copy, or modify credentials. This is useful when the dev server's default login differs from the account selected in Orca. Do not put account-specific paths or credential content in tracked files.

Status reads do not run inference. Concurrent reads share a probe, results cache for 10 seconds, and probes have a 30-second overall deadline. A generation request always rechecks authentication. A saved login can still expire or be revoked; a positive status is not a guarantee that the next model request will succeed. Authentication failures request official CLI re-login. Usage failures report the provider's limit without claiming a remaining percentage or retrying with another billing method.

## Execution boundaries

All children receive an OS/runtime environment allowlist. API keys, token overrides, paid cloud-provider settings, custom endpoints, proxies, `NODE_OPTIONS`, and IDE/plugin control variables are omitted. The parent environment is unchanged. CLIs retain their own responsibility for the existing login and normal token refresh.

Every invocation uses fixed argv, `shell: false`, hidden Windows windows, and an owned `mkdtemp` directory outside the repository. Windows npm shims resolve to their installed JS or native executable; `.ps1` and `.cmd` are never launched. Prompts go through stdin, and images must be valid base64 PNG/JPEG/WebP with matching magic bytes.

Codex ignores user config and rules, disables hooks, shell execution, multi-agent execution, apps, and web search, and uses a read-only sandbox. Claude uses the installed `--safe-mode` and `--restricted` controls with empty tools, strict empty MCP config, disabled hooks/skills, denied permission prompts, and no session persistence. **Claude `--bare` is deliberately excluded because it does not read subscription OAuth credentials.** Managed administrator policies remain under the official CLI's control; incompatible policy fails rather than being bypassed.

Limits are two active subprocesses, eight queued processes, 128 KiB prompt text, 10 MiB decoded image, 2 MiB combined process output, and 512 KiB final text. Individual status probes allow up to 20 seconds, inference up to 120 seconds, and a request including queue/auth work up to 180 seconds. Cancellation terminates the owned Windows process tree with `taskkill /PID <owned-pid> /T /F`, or a detached POSIX process group. Cleanup waits for termination. If termination cannot be confirmed, the directory and capacity reservation are retained instead of claiming successful cleanup. Restart the local server after resolving that process state.

## Verification

On 2026-09-14 (Korea time), installed Codex 0.154 and Claude Code 2.1.270 were checked against actual help output and existing subscription status. Real text requests returned `4` through both providers. Claude read a native test image of `7 + 5 = ?` and returned `12`; Codex read `8 + 6 = ?` and returned `14`. The default Codex profile had a stale refresh token; selecting the existing active Orca profile through `DEV_AI_CODEX_HOME` succeeded. No global login/config changes were made. Root integration owns original Mathgen crop/OCR/solution validation.

The scoped unit suite covers authentication rejection, native input, output parsing, environment clearing, profile selection, Windows executable resolution, metadata blockers, status deduplication, queue cancellation, output/time limits, actual descendant-process termination, and temporary cleanup. Run:

```powershell
node node_modules/vitest/vitest.mjs run src/__tests__/unit/devAiCli.test.ts src/__tests__/unit/devAiCliProtocol.test.ts src/__tests__/unit/devAiCliProcess.test.ts
```

Additional Grok inspection tested the documented compatibility-scanner environment switches with child-only values of `0`; the installed build still reported the same discovered hooks and MCP servers. The adapter therefore does not assume those newer documented switches provide isolation here. [Grok settings reference](https://docs.x.ai/build/settings/reference) defines `GROK_HOME` as the shared location for configuration **and authentication**, so redirecting it to an empty directory does not establish reuse of the existing login.

## Official interface references

- Codex [non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) and [authentication](https://learn.chatgpt.com/docs/auth) describe `exec`, JSONL final messages, native login reuse, and subscription versus API-key authentication.
- Claude [headless mode](https://code.claude.com/docs/en/headless) describes print/streaming interfaces and the OAuth exclusion in bare mode. Installed `claude --help` supplies the version-specific isolation flags.
- Antigravity [headless mode](https://antigravity.google/docs/cli/headless/), [installation/auth](https://antigravity.google/docs/cli/install/), and [MCP configuration](https://antigravity.google/docs/cli/mcp/) establish the current CLI interface and dedicated global MCP location.
- Grok [CLI reference](https://docs.x.ai/build/cli/reference) and [headless scripting](https://docs.x.ai/build/cli/headless-scripting) describe inspection, headless transport, and cached authentication. Their existence alone does not establish isolated subscription-only execution in the installed configuration.
