#!/usr/bin/env node

import { verifyClosureEvidence } from '../src/closure-evidence.js';

interface ParsedArgs {
  strict: boolean;
  runtimeProbesDir?: string;
  releaseEvidenceDir?: string;
  releaseIndexPath?: string;
  releaseTag?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const getValue = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    if (idx < 0) return undefined;
    return argv[idx + 1];
  };
  return {
    strict: argv.includes('--strict'),
    runtimeProbesDir: getValue('--runtime-probes-dir'),
    releaseEvidenceDir: getValue('--release-evidence-dir'),
    releaseIndexPath: getValue('--release-index'),
    releaseTag: getValue('--tag'),
  };
}

function printUsage(): void {
  console.log(`Usage: tsx scripts/verify-closure-evidence.ts [options]

Options:
  --strict                     Fail process when any validation error exists
  --runtime-probes-dir <path>  Runtime probe evidence directory
  --release-evidence-dir <path> Release evidence JSON directory
  --release-index <path>       Release index markdown path
  --tag <tag>                  Require release evidence file for tag (<tag>.json)
  --help                       Print help
`);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  const args = parseArgs(argv);
  const result = verifyClosureEvidence({
    runtimeProbesDir: args.runtimeProbesDir,
    releaseEvidenceDir: args.releaseEvidenceDir,
    releaseIndexPath: args.releaseIndexPath,
    releaseTag: args.releaseTag,
  });

  console.log('\nClosure Evidence Verification');
  console.log('-----------------------------');
  console.log(`pass=${result.pass}`);
  console.log(`stagingProbe=${result.selected.stagingProbe ?? 'missing'}`);
  console.log(`prodProbe=${result.selected.prodProbe ?? 'missing'}`);
  console.log(`releaseEvidence=${result.selected.releaseEvidence ?? 'missing'}`);
  console.log(`reindexEvidence=${result.selected.reindexEvidence ?? 'missing'}`);
  console.log(`alertEvidence=${result.selected.alertEvidence ?? 'missing'}`);

  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of result.errors) {
      console.log(`- ${error}`);
    }
  }

  if (args.strict && result.errors.length > 0) {
    process.exit(1);
  }
}

main();
