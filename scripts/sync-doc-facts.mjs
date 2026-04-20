#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDirectory, '..')
const openapiIndexPath = resolve(repoRoot, 'src/generated/openapi-index.json')
const budgetScriptPath = resolve(repoRoot, 'scripts/v2/check-budgets.mjs')
const budgetDistEntryPath = resolve(repoRoot, 'dist/codemode/tools/index.js')
const readmePath = resolve(repoRoot, 'README.md')
const coveragePath = resolve(repoRoot, 'docs/coverage.md')

const classicEndpointPerToolBaselineTokens = 92354
const defaultPublicTools = ['search', 'execute']
const checkMode = process.argv.includes('--check')

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function formatInteger(value) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatPercent(value) {
  return `${Math.round(value * 10) / 10}%`
}

function replaceManagedSection(document, marker, replacement) {
  const start = `<!-- docs-facts:${marker}:start -->`
  const end = `<!-- docs-facts:${marker}:end -->`
  const pattern = new RegExp(`${escapeForRegExp(start)}[\\s\\S]*?${escapeForRegExp(end)}`)

  if (!pattern.test(document)) {
    throw new Error(`Missing managed section markers for ${marker}`)
  }

  return document.replace(pattern, `${start}\n${replacement.trim()}\n${end}`)
}

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function runBudgetCheck() {
  if (!existsSync(budgetDistEntryPath)) {
    throw new Error('Budget facts require built dist artifacts. Run `npm run build` first.')
  }

  const stdout = execFileSync(process.execPath, [budgetScriptPath], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim()

  return JSON.parse(stdout)
}

function collectFacts() {
  const openapiIndex = readJson(openapiIndexPath)
  const budget = runBudgetCheck()
  const toolTokens = budget.codeModeToolsList.tokens
  const reductionRatio =
    ((classicEndpointPerToolBaselineTokens - toolTokens) / classicEndpointPerToolBaselineTokens) *
    100

  return {
    endpointCount: openapiIndex.endpointCount,
    tagCount: openapiIndex.tagCount,
    defaultPublicToolCount: defaultPublicTools.length,
    defaultPublicTools,
    codeModeBytes: budget.codeModeToolsList.bytes,
    codeModeTokens: toolTokens,
    reductionPercent: formatPercent(reductionRatio),
    budgetPassed: budget.ok === true,
  }
}

function renderReadmeFacts(facts) {
  return [
    '## Current Fact Snapshot',
    '',
    `- Generated API procedures in the pinned catalog: \`${formatInteger(facts.endpointCount)}\``,
    `- Generated tags: \`${formatInteger(facts.tagCount)}\``,
    `- Default public MCP tools: \`${facts.defaultPublicToolCount}\` (${formatToolList(facts.defaultPublicTools)})`,
    `- Default \`tools/list\` footprint from the current budget check: about \`${formatInteger(facts.codeModeTokens)}\` tokens (\`${formatInteger(facts.codeModeBytes)}\` bytes)`,
    `- Reduction versus the classic endpoint-per-tool baseline (\`${formatInteger(classicEndpointPerToolBaselineTokens)}\` tokens): \`${facts.reductionPercent}\``,
    '',
    '| | Classic endpoint-per-tool baseline | Current Code Mode default |',
    '|---|---|---|',
    `| Tool definitions sent | about \`${formatInteger(classicEndpointPerToolBaselineTokens)}\` tokens | about \`${formatInteger(facts.codeModeTokens)}\` tokens |`,
    `| Public MCP tools | hundreds of endpoint schemas | \`${facts.defaultPublicToolCount}\` |`,
    '| Context window tax | wide schema dump | compact fixed surface |',
  ].join('\n')
}

function renderCoverageSummary(facts) {
  return [
    '## Summary',
    '',
    `- Generated procedures in the pinned snapshot-backed catalog: \`${formatInteger(facts.endpointCount)}\``,
    `- Generated tags: \`${formatInteger(facts.tagCount)}\``,
    `- Default public MCP tools: \`${facts.defaultPublicToolCount}\``,
    `- Public tool surface: ${formatToolList(facts.defaultPublicTools)}`,
    `- Default \`tools/list\` footprint from the current budget check: about \`${formatInteger(facts.codeModeTokens)}\` tokens (\`${formatInteger(facts.codeModeBytes)}\` bytes)`,
    '- Optional server modes: `raw`, `hybrid`',
    '- Optional HTTP transport: `Streamable HTTP`',
  ].join('\n')
}

function renderCoverageBudgetSnapshot(facts) {
  return [
    '## Current Budget Snapshot',
    '',
    `- Current default \`tools/list\`: \`${formatInteger(facts.codeModeBytes)}\` bytes, about \`${formatInteger(facts.codeModeTokens)}\` tokens`,
    `- Classic comparison baseline: about \`${formatInteger(classicEndpointPerToolBaselineTokens)}\` tokens for endpoint-per-tool discovery`,
    `- Current reduction versus that baseline: \`${facts.reductionPercent}\``,
    `- Current \`ci:budgets\` status from the managed budget check: \`${facts.budgetPassed ? 'pass' : 'fail'}\``,
    '- Runtime latency budgets remain enforced by `scripts/v2/check-budgets.mjs` in CI.',
  ].join('\n')
}

function formatToolList(tools) {
  return tools.map((tool) => `\`${tool}\``).join(', ')
}

function updateReadme(source, facts) {
  return replaceManagedSection(source, 'readme', renderReadmeFacts(facts))
}

function updateCoverage(source, facts) {
  return replaceManagedSection(
    replaceManagedSection(source, 'coverage-summary', renderCoverageSummary(facts)),
    'coverage-budget',
    renderCoverageBudgetSnapshot(facts),
  )
}

function main() {
  const facts = collectFacts()
  const files = [
    { path: readmePath, updater: updateReadme },
    { path: coveragePath, updater: updateCoverage },
  ]

  const updates = files
    .map(({ path, updater }) => {
      const current = readFileSync(path, 'utf8')
      const next = updater(current, facts)

      return {
        path,
        current,
        next,
      }
    })
    .filter(({ current, next }) => current !== next)

  if (checkMode) {
    if (updates.length === 0) {
      console.log('Docs factual sections are current.')
      return
    }

    console.error('Docs factual sections are out of date. Run `npm run docs:sync:facts`.')
    for (const update of updates) {
      console.error(`- ${relative(repoRoot, update.path)}`)
    }
    process.exitCode = 1
    return
  }

  if (updates.length === 0) {
    console.log('Docs factual sections were already current.')
    return
  }

  for (const update of updates) {
    writeFileSync(update.path, update.next)
    console.log(`Updated ${relative(repoRoot, update.path)}`)
  }
}

main()
