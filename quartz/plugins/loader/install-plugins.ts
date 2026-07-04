#!/usr/bin/env node
import fs from "fs"
import path from "path"
import YAML from "yaml"
import { installPlugins, parsePluginSource } from "./gitLoader.js"
import { PluginSource, QuartzPluginsJson } from "./types.js"

const CONFIG_YAML_PATH = path.join(process.cwd(), "quartz.config.yaml")
const DEFAULT_CONFIG_YAML_PATH = path.join(process.cwd(), "quartz.config.default.yaml")
const LEGACY_PLUGINS_JSON_PATH = path.join(process.cwd(), "quartz.plugins.json")
const LEGACY_DEFAULT_PLUGINS_JSON_PATH = path.join(process.cwd(), "quartz.plugins.default.json")

function resolveConfigPath(): string | null {
  if (fs.existsSync(CONFIG_YAML_PATH)) return CONFIG_YAML_PATH
  if (fs.existsSync(LEGACY_PLUGINS_JSON_PATH)) return LEGACY_PLUGINS_JSON_PATH
  if (fs.existsSync(DEFAULT_CONFIG_YAML_PATH)) return DEFAULT_CONFIG_YAML_PATH
  if (fs.existsSync(LEGACY_DEFAULT_PLUGINS_JSON_PATH)) return LEGACY_DEFAULT_PLUGINS_JSON_PATH
  return null
}

function readPluginSources(): PluginSource[] {
  const configPath = resolveConfigPath()
  if (!configPath) {
    return []
  }

  const raw = fs.readFileSync(configPath, "utf-8")
  const config = (
    configPath.endsWith(".yaml") || configPath.endsWith(".yml") ? YAML.parse(raw) : JSON.parse(raw)
  ) as QuartzPluginsJson

  return config.plugins.filter((plugin) => plugin.enabled).map((plugin) => plugin.source)
}

async function main() {
  const externalPlugins = readPluginSources()

  if (externalPlugins.length === 0) {
    console.log("No external plugins to install.")
    return
  }

  console.log(`Installing ${externalPlugins.length} plugin(s) from Git...`)

  const specs = externalPlugins.map((source) => parsePluginSource(source))
  const installed = await installPlugins(specs, { verbose: true })

  if (installed.size === externalPlugins.length) {
    console.log("✓ All plugins installed successfully")
  } else {
    console.error(`✗ Only ${installed.size}/${externalPlugins.length} plugins installed`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Failed to install plugins:", err)
  process.exit(1)
})
