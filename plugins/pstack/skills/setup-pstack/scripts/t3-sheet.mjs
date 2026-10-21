#!/usr/bin/env node
// Parses the optional T3 model sheet and checks entries against saved catalog data.
// It has no runtime dependency beyond Node.js built-ins and does not call T3.

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const INHERIT = new Set(["inherit-parent", "auto"]);
const PANEL_ROLES = new Set([
  "arena runners",
  "arena cross-judge pool",
  "architect runners",
  "interrogate reviewers",
]);
export const READ_ONLY_ROLES = [
  "how explorer",
  "how explainer",
  "why investigators",
  "why synthesizer",
  "reflect tooling",
  "reflect judgment, divergent, synthesizer",
  "arena cross-judge pool",
  "interrogate reviewers",
];
const READ_ONLY_ROLE_SET = new Set(READ_ONLY_ROLES);

export function findT3Files(startDir, hostConfigDir) {
  let current = resolve(startDir);
  while (true) {
    const directory = join(current, ".pstack");
    const sheetPath = join(directory, "pstack-t3-models.md");
    const allowPath = join(directory, "pstack-t3-instances.json");
    if (existsSync(sheetPath) || existsSync(allowPath)) {
      return {
        sheet: existsSync(sheetPath) ? sheetPath : null,
        allow: existsSync(allowPath) ? allowPath : null,
        source: "workspace",
      };
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  const sheetPath = join(resolve(hostConfigDir), "pstack-t3-models.md");
  const allowPath = join(resolve(hostConfigDir), "pstack-t3-instances.json");
  return {
    sheet: existsSync(sheetPath) ? sheetPath : null,
    allow: existsSync(allowPath) ? allowPath : null,
    source: "host",
  };
}

export function parseSheet(text) {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .flatMap((raw, index) => {
      const line = raw.trim();
      if (!line || line.startsWith("#")) return [];
      const match = line.match(/^([^:]+):\s*(.*?)\s*$/);
      return [{ line: index + 1, key: match?.[1]?.trim(), value: match?.[2], raw: line }];
    });
}

export function parseEntry(text) {
  const tokens = text.trim().split(/\s+/);
  const target = tokens.shift() ?? "";
  if (INHERIT.has(target)) {
    if (tokens.length) throw new Error(`entry "${text.trim()}": ${target} takes no options`);
    return null;
  }
  if (/(?:^|\s)@[A-Za-z0-9_-]+(?:$|\s)/.test(text)) {
    throw new Error(`entry "${text.trim()}": @<level> is native-only; use a listed option=value token`);
  }
  const slash = target.indexOf("/");
  if (slash < 1 || slash === target.length - 1 || /\s/.test(target)) {
    throw new Error(`entry "${text.trim()}": expected <providerInstanceId>/<modelId>`);
  }

  const options = Object.create(null);
  for (const token of tokens) {
    const separator = token.indexOf("=");
    if (separator < 1 || separator === token.length - 1) {
      throw new Error(`entry "${text.trim()}": "${token}" is not <optionId>=<value>`);
    }
    const id = token.slice(0, separator);
    const value = token.slice(separator + 1);
    if (/\s|,/.test(id) || /\s|,/.test(value)) {
      throw new Error(`entry "${text.trim()}": "${token}" is not <optionId>=<value>`);
    }
    if (Object.hasOwn(options, id)) {
      throw new Error(`entry "${text.trim()}": option "${id}" appears more than once`);
    }
    options[id] = value;
  }

  return {
    providerInstanceId: target.slice(0, slash),
    model: target.slice(slash + 1),
    options,
    text: text.trim(),
  };
}

export function family(modelId) {
  return modelId.split("/").at(-1).split("-")[0];
}

function allowListProblems(allowList) {
  const problems = [];
  const instances = allowList?.instances;
  if (!instances || typeof instances !== "object" || Array.isArray(instances)) {
    return ['allow-list: expected an "instances" object'];
  }

  for (const [id, entry] of Object.entries(instances)) {
    const hasReadOnly = Object.hasOwn(entry ?? {}, "readOnly");
    const full = Array.isArray(entry?.layers) && entry.layers.includes("pstack") && entry.gate === true && !hasReadOnly;
    const readOnly = Array.isArray(entry?.layers) && entry.layers.length === 0 && entry.gate === false && entry.readOnly === true;
    if (!full && !readOnly) {
      problems.push(`allow-list instance "${id}": expected layers including "pstack" and gate: true without readOnly, or layers: [], gate: false, readOnly: true`);
    }
  }
  return problems;
}

function targetProblems(entry, role, catalog, allowList, warnings) {
  const { providerInstanceId, model, options } = entry;
  const label = entry.text;
  const provider = catalog?.providers?.find((item) => item.providerInstanceId === providerInstanceId);
  const problems = [];
  if (!provider) {
    problems.push(`entry "${label}": provider instance "${providerInstanceId}" is not in the catalog`);
  } else {
    if (provider.canRunChildTask !== true) {
      problems.push(`entry "${label}": provider instance "${providerInstanceId}" does not have canRunChildTask: true`);
    }
    if (provider.canRunCrossProviderChildTask === false || provider.constraints?.length) {
      warnings.push(`entry "${label}": provider instance "${providerInstanceId}"${provider.canRunCrossProviderChildTask === false ? " has canRunCrossProviderChildTask: false" : " has constraints"}; constraints: ${JSON.stringify(provider.constraints ?? [])}`);
    }
    const modelInfo = provider.models?.find((item) => item.id === model);
    if (!modelInfo) {
      problems.push(`entry "${label}": model "${model}" is not listed under "${providerInstanceId}"`);
    } else {
      const availableOptions = Array.isArray(modelInfo.options) ? modelInfo.options : [];
      for (const [id, value] of Object.entries(options)) {
        const option = availableOptions.find((item) => item.id === id);
        if (!option) {
          problems.push(
            `entry "${label}": option "${id}" is not listed for "${model}" (available: ${availableOptions.map((item) => item.id).join(", ") || "none"})`,
          );
          continue;
        }
        const values = option.type === "boolean" ? ["true", "false"] : (option.options ?? []).map((item) => item.id);
        if (!values.includes(value)) {
          problems.push(
            `entry "${label}": option value ${id}=${value} is not listed (available: ${values.join(", ") || "none"})`,
          );
        }
      }
    }
  }

  if (allowList !== undefined) {
    const allowed = allowList?.instances?.[providerInstanceId];
    if (!allowed) {
      problems.push(`entry "${label}": allow-list has no instance "${providerInstanceId}"`);
    } else {
      const full = Array.isArray(allowed.layers) && allowed.layers.includes("pstack") && allowed.gate === true && !Object.hasOwn(allowed, "readOnly");
      const readOnly = Array.isArray(allowed.layers) && allowed.layers.length === 0 && allowed.gate === false && allowed.readOnly === true;
      if (readOnly && !READ_ONLY_ROLE_SET.has(role)) {
        problems.push(`entry "${label}": provider instance "${providerInstanceId}" is read-only and role "${role}" is not read-only`);
      } else if (!full && !readOnly) {
        const missing = [];
        if (!Array.isArray(allowed.layers) || !allowed.layers.includes("pstack")) missing.push('layer "pstack"');
        if (allowed.gate !== true) missing.push('gate "true"');
        problems.push(`entry "${label}": allow-list is missing ${missing.join(" and ") || "a valid entry shape"}`);
      }
    }
  }
  return problems;
}

export function checkSheet(rows, { roles, catalog, allowList, warnings = [] } = {}) {
  const problems = allowList === undefined ? [] : allowListProblems(allowList);
  const knownRoles = new Set(roles.map((item) => item.role));
  const panels = new Set(roles.filter((item) => item.models === "panel" || item.panel === true).map((item) => item.role));
  const seen = new Set();

  for (const row of rows) {
    const name = row.key || `line ${row.line}`;
    const entryText = row.value ?? row.raw;
    if (!row.key || row.value === undefined || row.value === "") {
      problems.push(`${name}: entry "${entryText}": expected role: value`);
      continue;
    }
    if (seen.has(row.key)) problems.push(`${row.key}: entry "${entryText}": role appears more than once`);
    seen.add(row.key);

    if (row.key === "session hook") {
      if (!new Set(["on", "off"]).has(row.value)) {
        problems.push(`session hook: entry "${entryText}": expected on or off`);
      }
      continue;
    }
    if (row.key === "default effort") {
      problems.push(`default effort: entry "${entryText}": this line is not allowed; T3 effort belongs in entry options`);
      continue;
    }
    if (!knownRoles.has(row.key)) {
      problems.push(`${row.key}: entry "${entryText}": unknown pstack role`);
      continue;
    }

    const texts = row.value.split(",").map((part) => part.trim());
    const isPanel = panels.has(row.key) || PANEL_ROLES.has(row.key);
    if (!isPanel && texts.length > 1) {
      problems.push(`${row.key}: entry "${entryText}": this role takes one entry, not a list`);
    }
    const parsed = [];
    for (const text of texts) {
      try {
        parsed.push(parseEntry(text));
      } catch (error) {
        problems.push(`${row.key}: ${error.message}`);
      }
    }

    const targets = parsed.filter(Boolean);
    const targetKeys = targets.map(({ providerInstanceId, model }) => `${providerInstanceId}/${model}`);
    if (new Set(targetKeys).size < targetKeys.length) {
      problems.push(`${row.key}: entry "${entryText}": the same target appears more than once`);
    }
    const validTargets = [];
    for (const target of targets) {
      const targetWarnings = [];
      const faults = targetProblems(target, row.key, catalog, allowList, targetWarnings);
      warnings.push(...targetWarnings.map((warning) => `${row.key}: ${warning}`));
      problems.push(...faults.map((fault) => `${row.key}: ${fault}`));
      if (!faults.length) validTargets.push(target);
    }

    if (isPanel && targets.length === 1) {
      problems.push(`${row.key}: entry "${entryText}": a panel cannot have a single explicit target`);
    } else if (isPanel && targets.length > 1) {
      const families = new Set(validTargets.map((target) => family(target.model)));
      if (families.size < 2) {
        problems.push(
          `${row.key}: entry "${entryText}": a panel needs at least two model families among its explicit targets`,
        );
      }
    }
  }

  return problems;
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--find") {
    if (args.length !== 3) {
      console.error("usage: t3-sheet.mjs --find <start-directory> <host-config-directory>");
      process.exitCode = 2;
      return;
    }
    console.log(JSON.stringify(findT3Files(args[1], args[2])));
    return;
  }
  if (args.length < 2 || args.length > 4 || args[2] !== undefined && args[2] !== "--allow" || args[2] === "--allow" && !args[3]) {
    console.error("usage: t3-sheet.mjs <sheet-file> <catalog.json> [--allow <allow-list.json>]");
    process.exitCode = 2;
    return;
  }
  const [sheetPath, catalogPath, , allowPath] = args;
  const modelsPath = new URL("../../../models.json", import.meta.url);
  const models = JSON.parse(readFileSync(modelsPath, "utf8"));
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  const allowList = allowPath === undefined ? undefined : JSON.parse(readFileSync(allowPath, "utf8"));
  const rows = parseSheet(readFileSync(sheetPath, "utf8"));
  const warnings = [];
  const problems = checkSheet(rows, { roles: models.roles, catalog, allowList, warnings });

  if (allowList === undefined) {
    console.error("warning: no allow-list was supplied; children may run without the pstack layer or access gate");
  }
  for (const warning of warnings) console.error(`warning: ${warning}`);
  for (const problem of problems) console.log(problem);
  if (problems.length) {
    process.exitCode = 1;
    return;
  }
  console.log("ok");
}

const invoked = process.argv[1] && existsSync(process.argv[1]) ? realpathSync(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
