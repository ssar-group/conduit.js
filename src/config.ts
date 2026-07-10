import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

import type { ConduitConfig, Options } from "./types.js";
import { formatError, isPlainObject, logDebug, logWarn } from "./utils.js";

const configNames = [
  "conduit.config.json",
  "conduit.config.js",
  "conduit.config.mjs",
];

const cache = new Map<string, Promise<ConduitConfig>>();

export function defineConduitConfig(config: ConduitConfig): ConduitConfig {
  return config;
}

export async function loadConduitConfig(
  cwd = process.cwd(),
  options: Pick<ConduitConfig, "debug" | "warnings"> = {},
): Promise<ConduitConfig> {
  const root = path.resolve(cwd);

  if (!cache.has(root)) {
    cache.set(root, readConduitConfig(root, options));
  }

  return cache.get(root)!;
}

async function readConduitConfig(
  root: string,
  options: Pick<ConduitConfig, "debug" | "warnings">,
): Promise<ConduitConfig> {
  for (const name of configNames) {
    const filePath = path.join(root, name);

    try {
      await fs.access(filePath);
    } catch {
      continue;
    }

    logDebug(options.debug, "Loading config", filePath);

    const config = name.endsWith(".json")
      ? await readJsonConfig(filePath)
      : await readJsConfig(filePath);

    if (!isPlainObject(config)) {
      throw new Error(formatError("Config must export an object", { file: filePath }));
    }

    return config as ConduitConfig;
  }

  logDebug(options.debug, "No conduit config found", root);
  return {};
}

async function readJsonConfig(filePath: string): Promise<unknown> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      formatError("Unable to read config", {
        file: filePath,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

async function readJsConfig(filePath: string): Promise<unknown> {
  try {
    const moduleUrl = pathToFileURL(filePath).href;
    const imported = await import(moduleUrl);
    return imported.default ?? imported.config;
  } catch (error) {
    throw new Error(
      formatError("Unable to load config", {
        file: filePath,
        reason: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

export function mergeConduitConfig(
  config: ConduitConfig,
  options: Options,
): Options {
  const merged = {
    ...config,
    ...options,
    context: {
      ...(config.context ?? {}),
      ...(options.context ?? {}),
    },
    env: {
      ...(config.env ?? {}),
      ...(options.env ?? {}),
    },
    headers: {
      ...(config.headers ?? {}),
      ...(options.headers ?? {}),
    },
  };

  if (config.args && options.args) {
    logWarn(merged, "Options args override config args for this execution.");
  }

  return merged;
}
