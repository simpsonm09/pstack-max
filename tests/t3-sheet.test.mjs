import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { checkSheet, family, findT3Files, parseEntry, parseSheet, READ_ONLY_ROLES } from "../plugins/pstack/skills/setup-pstack/scripts/t3-sheet.mjs";

const root = join(import.meta.dir, "..");
const models = JSON.parse(readFileSync(join(root, "plugins/pstack/models.json"), "utf8"));
const roles = models.roles;
const catalog = JSON.parse(readFileSync(join(root, "tests/fixtures/t3-sheet-catalog.json"), "utf8"));
const allowList = {
  instances: {
    "instance-alpha": { layers: ["pstack", "org"], gate: true },
    "instance-beta": { layers: ["pstack"], gate: true },
    "instance-locked": { layers: ["pstack"], gate: true },
  },
};
const PANEL = "arena runners";
const check = (text, options = {}) => checkSheet(parseSheet(text), { roles, catalog, ...options });

describe("T3 file lookup", () => {
  let temp;
  let host;
  beforeEach(() => {
    temp = mkdtempSync(join(tmpdir(), "pstack-t3-"));
    host = join(temp, "host");
    mkdirSync(host);
  });
  afterEach(() => rmSync(temp, { recursive: true, force: true }));

  test("finds workspace files from a nested directory", () => {
    const workspace = join(temp, "project");
    const config = join(workspace, ".pstack");
    const nested = join(workspace, "src", "deep");
    mkdirSync(config, { recursive: true });
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(config, "pstack-t3-models.md"), "sheet");
    writeFileSync(join(config, "pstack-t3-instances.json"), "{}");
    expect(findT3Files(nested, host)).toEqual({
      sheet: join(config, "pstack-t3-models.md"),
      allow: join(config, "pstack-t3-instances.json"),
      source: "workspace",
    });
  });

  test("uses the nearest .pstack and never mixes its files with the host", () => {
    const outer = join(temp, "outer");
    const inner = join(outer, "inner");
    mkdirSync(join(outer, ".pstack"), { recursive: true });
    mkdirSync(join(inner, ".pstack"), { recursive: true });
    mkdirSync(host, { recursive: true });
    writeFileSync(join(outer, ".pstack", "pstack-t3-instances.json"), "{}");
    writeFileSync(join(inner, ".pstack", "pstack-t3-models.md"), "sheet");
    writeFileSync(join(host, "pstack-t3-instances.json"), "{}");
    expect(findT3Files(inner, host)).toEqual({
      sheet: join(inner, ".pstack", "pstack-t3-models.md"),
      allow: null,
      source: "workspace",
    });
  });

  test("falls back to the host and returns null for missing files", () => {
    const nested = join(temp, "plain", "child");
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(host, "pstack-t3-instances.json"), "{}");
    expect(findT3Files(nested, host)).toEqual({
      sheet: null,
      allow: join(host, "pstack-t3-instances.json"),
      source: "host",
    });
    rmSync(join(host, "pstack-t3-instances.json"));
    expect(findT3Files(nested, host)).toEqual({ sheet: null, allow: null, source: "host" });
  });
});

test("T3 mapping states workspace-first file lookup", () => {
  const reference = readFileSync(
    join(root, "plugins/pstack/skills/poteto-mode/references/t3-tools.md"),
    "utf8",
  );
  expect(reference).toContain(
    "Starting at the session's working directory and walking up its parent folders, use the first `.pstack` folder that contains either T3 file. Read both files from that same folder; a missing file there is absent and does not fall back to the host. If no such folder exists, use the host's per-user config folder.",
  );
});

test("lookup CLI prints its result as JSON", () => {
  const temp = mkdtempSync(join(tmpdir(), "pstack-t3-find-"));
  try {
    const start = join(temp, "project");
    const host = join(temp, "host");
    mkdirSync(start);
    mkdirSync(host);
    const result = spawnSync(
      process.execPath,
      [
        join(root, "plugins/pstack/skills/setup-pstack/scripts/t3-sheet.mjs"),
        "--find",
        start,
        host,
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ sheet: null, allow: null, source: "host" });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

describe("T3 model sheet parsing", () => {
  test("accepts comments, blank lines, known roles, inheritance, and session hook settings", () => {
    expect(parseSheet("# local choices\n\nfeature, refactoring: auto\nsession hook: off\n")).toEqual([
      { line: 3, key: "feature, refactoring", value: "auto", raw: "feature, refactoring: auto" },
      { line: 4, key: "session hook", value: "off", raw: "session hook: off" },
    ]);
    expect(check("# local choices\n\nfeature, refactoring: inherit-parent\nsession hook: on")).toEqual([]);
  });

  test("splits the target at its first slash and maps option tokens", () => {
    expect(parseEntry("instance-beta/route-z/familyc-model effort=high")).toEqual({
      providerInstanceId: "instance-beta",
      model: "route-z/familyc-model",
      options: { effort: "high" },
      text: "instance-beta/route-z/familyc-model effort=high",
    });
    expect(family("route-z/familyc-model")).toBe("familyc");
    expect(check("bug-fix: instance-beta/route-z/familyc-model")).toEqual([]);
  });

  test("accepts a validated option and a panel with two model families", () => {
    expect(check(`${PANEL}: instance-alpha/familya-main effort=high, instance-alpha/familyb-review`, { allowList })).toEqual([]);
  });

  test.each(["true", "false"])("accepts boolean option fastMode=%s without a catalog options list", (value) => {
    expect(check(`bug-fix: instance-alpha/familya-main fastMode=${value}`)).toEqual([]);
  });

  test("rejects a boolean option value other than true or false", () => {
    expect(check("bug-fix: instance-alpha/familya-main fastMode=maybe")).toEqual([
      'bug-fix: entry "instance-alpha/familya-main fastMode=maybe": option value fastMode=maybe is not listed (available: true, false)',
    ]);
  });

  test.each([
    { canRunCrossProviderChildTask: false, constraints: ["Same-provider children only"] },
    { canRunCrossProviderChildTask: true, constraints: ["Review only"] },
    { canRunCrossProviderChildTask: false },
  ])("warns about provider restrictions without rejecting the target: %j", (restriction) => {
    const restricted = structuredClone(catalog);
    Object.assign(restricted.providers[0], restriction);
    const warnings = [];
    expect(check("bug-fix: instance-alpha/familya-main", { catalog: restricted, warnings })).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(JSON.stringify(restriction.constraints ?? []));
    if (restriction.canRunCrossProviderChildTask === false) {
      expect(warnings[0]).toContain("canRunCrossProviderChildTask: false");
    }
  });

  test("accepts a read-only instance for a read-only role", () => {
    const readOnlyAllowList = {
      instances: { "instance-beta": { layers: [], gate: false, readOnly: true } },
    };
    expect(check("how explorer: instance-beta/route-z/familyc-model", { allowList: readOnlyAllowList })).toEqual([]);
  });

  test("refuses a read-only instance for a role that may write", () => {
    const readOnlyAllowList = {
      instances: { "instance-beta": { layers: [], gate: false, readOnly: true } },
    };
    expect(check("bug-fix: instance-beta/route-z/familyc-model", { allowList: readOnlyAllowList })).toContain(
      'bug-fix: entry "instance-beta/route-z/familyc-model": provider instance "instance-beta" is read-only and role "bug-fix" is not read-only',
    );
  });

  test("a read-only panel may mix full and read-only instances", () => {
    const mixedAllowList = {
      instances: {
        "instance-alpha": { layers: ["pstack"], gate: true },
        "instance-beta": { layers: [], gate: false, readOnly: true },
      },
    };
    expect(check("arena cross-judge pool: instance-alpha/familya-main, instance-beta/route-z/familyc-model", { allowList: mixedAllowList })).toEqual([]);
  });

  test("rejects invalid allow-list entry combinations", () => {
    const invalidEntries = [
      { layers: ["pstack"], gate: true, readOnly: true },
      { layers: ["pstack"], gate: true, readOnly: false },
      { layers: ["pstack"], gate: false, readOnly: true },
      { layers: [], gate: true, readOnly: true },
      { layers: [], gate: false, readOnly: false },
    ];
    for (const entry of invalidEntries) {
      expect(check("how explorer: instance-beta/route-z/familyc-model", {
        allowList: { instances: { "instance-beta": entry } },
      })).toContain(
        'allow-list instance "instance-beta": expected layers including "pstack" and gate: true without readOnly, or layers: [], gate: false, readOnly: true',
      );
    }
  });

  test("the documented read-only role list matches the checker", () => {
    const reference = readFileSync(join(root, "plugins/pstack/skills/poteto-mode/references/t3-tools.md"), "utf8").replace(/\r\n/g, "\n");
    const roleSection = reference.split("### Read-only roles\n")[1].split("\n## Rejections and fallback")[0];
    const documentedRoles = [...roleSection.matchAll(/^\| `([^`]+)` \|/gm)].map((match) => match[1]);
    expect(documentedRoles).toEqual(READ_ONLY_ROLES);
  });

  test("an unset panel is valid", () => {
    expect(check("session hook: on", { allowList })).toEqual([]);
  });

  test("an unknown role names its entry", () => {
    expect(check("unknown role: instance-alpha/familya-main")).toEqual([
      'unknown role: entry "instance-alpha/familya-main": unknown pstack role',
    ]);
  });

  test("an unknown provider instance names its role and entry", () => {
    expect(check("bug-fix: instance-missing/familya-main")).toContain(
      'bug-fix: entry "instance-missing/familya-main": provider instance "instance-missing" is not in the catalog',
    );
  });

  test("a provider that cannot run a child task is rejected", () => {
    expect(check("bug-fix: instance-locked/familyd-model")).toContain(
      'bug-fix: entry "instance-locked/familyd-model": provider instance "instance-locked" does not have canRunChildTask: true',
    );
  });

  test("an unknown model is rejected", () => {
    expect(check("bug-fix: instance-alpha/familyx-missing")).toContain(
      'bug-fix: entry "instance-alpha/familyx-missing": model "familyx-missing" is not listed under "instance-alpha"',
    );
  });

  test("an unknown option is rejected", () => {
    expect(check("bug-fix: instance-alpha/familya-main unknown=high")).toContain(
      'bug-fix: entry "instance-alpha/familya-main unknown=high": option "unknown" is not listed for "familya-main" (available: effort, fastMode, mode)',
    );
  });

  test("an option value outside its catalog list is rejected", () => {
    expect(check("bug-fix: instance-alpha/familya-main effort=extreme")).toContain(
      'bug-fix: entry "instance-alpha/familya-main effort=extreme": option value effort=extreme is not listed (available: low, high)',
    );
  });

  test("default effort is rejected with a direct explanation", () => {
    expect(check("default effort: high")).toEqual([
      'default effort: entry "high": this line is not allowed; T3 effort belongs in entry options',
    ]);
  });

  test("@level is rejected as native-only syntax", () => {
    expect(check("bug-fix: instance-alpha/familya-main @high")).toEqual([
      'bug-fix: entry "instance-alpha/familya-main @high": @<level> is native-only; use a listed option=value token',
    ]);
  });

  test("a panel with one explicit target is rejected", () => {
    expect(check(`${PANEL}: instance-alpha/familya-main`)).toContain(
      `${PANEL}: entry "instance-alpha/familya-main": a panel cannot have a single explicit target`,
    );
  });

  test("a panel whose targets belong to one family is rejected", () => {
    expect(check(`${PANEL}: instance-alpha/familya-main, instance-alpha/familya-alt`)).toContain(
      `${PANEL}: entry "instance-alpha/familya-main, instance-alpha/familya-alt": a panel needs at least two model families among its explicit targets`,
    );
  });

  test("an allow-list missing the provider instance is rejected", () => {
    const restricted = { instances: { "instance-alpha": allowList.instances["instance-alpha"] } };
    expect(check("bug-fix: instance-beta/route-z/familyc-model", { allowList: restricted })).toContain(
      'bug-fix: entry "instance-beta/route-z/familyc-model": allow-list has no instance "instance-beta"',
    );
  });

  test("an allow-list without the pstack layer is rejected", () => {
    const noLayer = { instances: { "instance-alpha": { layers: ["org"], gate: true } } };
    expect(check("bug-fix: instance-alpha/familya-main", { allowList: noLayer })).toContain(
      'bug-fix: entry "instance-alpha/familya-main": allow-list is missing layer "pstack"',
    );
  });

  test("an allow-list without the access gate is rejected", () => {
    const noGate = { instances: { "instance-alpha": { layers: ["pstack"], gate: false } } };
    expect(check("bug-fix: instance-alpha/familya-main", { allowList: noGate })).toContain(
      'bug-fix: entry "instance-alpha/familya-main": allow-list is missing gate "true"',
    );
  });
});

describe("T3 model defaults", () => {
  test("the reference has none of t3-pstack's shipped provider or model defaults", () => {
    const reference = readFileSync(join(root, "plugins/pstack/skills/poteto-mode/references/t3-tools.md"), "utf8");
    const t3ModelBlock = JSON.stringify(models.t3 ?? {});
    const shippedDefaults = [
      "claudeAgent",
      "codex/",
      "grok/",
      "claude-opus-5-5",
      "claude-fable-5-1",
      "gpt-6.1-sol",
      "grok-4.7",
    ];
    for (const value of shippedDefaults) {
      expect(reference).not.toContain(value);
      expect(t3ModelBlock).not.toContain(value);
    }
    expect(reference).not.toContain("t3-pstack-models.md");
    expect(reference).not.toContain("Read every `pstack:<name>` as");
  });

  test("the reference states precedence and keeps unset panels on native dispatch", () => {
    const reference = readFileSync(join(root, "plugins/pstack/skills/poteto-mode/references/t3-tools.md"), "utf8");
    expect(reference).toContain("## Precedence");
    expect(reference).toContain(
      "If a panel role is absent, `inherit-parent`, or `auto` in the T3 sheet, use the host's native dispatch and that skill's own defaults exactly as outside T3.",
    );
    expect(reference).toContain("Tell the user once per session: `setup-pstack` can configure a mixed-model panel for T3.");
  });
});

describe("t3-sheet.mjs command line", () => {
  test("prints one warning when no allow-list is supplied and still accepts a valid sheet", () => {
    const result = runFixture("t3-sheet-valid.md");
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("ok\n");
    expect(result.stderr).toBe(
      "warning: no allow-list was supplied; children may run without the pstack layer or access gate\n",
    );
  });

  test("prints provider constraints as warnings and exits 0", () => {
    const temp = mkdtempSync(join(tmpdir(), "pstack-t3-warning-"));
    try {
      const restricted = structuredClone(catalog);
      Object.assign(restricted.providers[0], {
        canRunCrossProviderChildTask: false,
        constraints: ["Same-provider children only"],
      });
      const catalogPath = join(temp, "catalog.json");
      const sheetPath = join(temp, "sheet.md");
      writeFileSync(catalogPath, JSON.stringify(restricted));
      writeFileSync(sheetPath, "bug-fix: instance-alpha/familya-main fastMode=true");
      const result = spawnSync(process.execPath, [
        join(root, "plugins/pstack/skills/setup-pstack/scripts/t3-sheet.mjs"),
        sheetPath, catalogPath,
      ], { encoding: "utf8" });
      expect(result.status).toBe(0);
      expect(result.stdout).toBe("ok\n");
      expect(result.stderr).toContain('warning: bug-fix: entry "instance-alpha/familya-main fastMode=true": provider instance "instance-alpha" has canRunCrossProviderChildTask: false; constraints: ["Same-provider children only"]');
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  test("prints one role-and-entry problem and exits 1 for an invalid sheet", () => {
    const result = runFixture("t3-sheet-invalid.md");
    expect(result.status).toBe(1);
    expect(result.stdout).toBe(
      'bug-fix: entry "instance-alpha/familya-main @high": @<level> is native-only; use a listed option=value token\n',
    );
    expect(result.stderr).toContain("warning: no allow-list was supplied");
  });

  function runFixture(sheetName) {
    return spawnSync(
      process.execPath,
      [
        join(root, "plugins/pstack/skills/setup-pstack/scripts/t3-sheet.mjs"),
        join(root, "tests/fixtures", sheetName),
        join(root, "tests/fixtures/t3-sheet-catalog.json"),
      ],
      { encoding: "utf8" },
    );
  }
});
