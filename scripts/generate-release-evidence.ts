#!/usr/bin/env node

import { generateReleaseEvidence } from '../src/release-evidence.js';

interface ParsedArgs {
  strict: boolean;
  allowIncomplete: boolean;
  updateReleaseIndex: boolean;
  tag?: string;
  commit?: string;
  releaseRunId?: string;
  releaseRunUrl?: string;
  ciRunId?: string;
  ciRunUrl?: string;
  imageRef?: string;
  runtimeProbesDir?: string;
  releaseEvidenceDir?: string;
  releaseIndexPath?: string;
  stagingProbePath?: string;
  prodProbePath?: string;
  reindexEvidence?: string;
  alertVerificationArtifact?: string;
  rollbackNote?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const getValue = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    if (index < 0) return undefined;
    return argv[index + 1];
  };

  return {
    strict: argv.includes('--strict'),
    allowIncomplete: argv.includes('--allow-incomplete'),
    updateReleaseIndex: !argv.includes('--no-update-index'),
    tag: getValue('--tag'),
    commit: getValue('--commit'),
    releaseRunId: getValue('--release-run-id'),
    releaseRunUrl: getValue('--release-run-url'),
    ciRunId: getValue('--ci-run-id'),
    ciRunUrl: getValue('--ci-run-url'),
    imageRef: getValue('--image-ref'),
    runtimeProbesDir: getValue('--runtime-probes-dir'),
    releaseEvidenceDir: getValue('--release-evidence-dir'),
    releaseIndexPath: getValue('--release-index-path'),
    stagingProbePath: getValue('--staging-probe'),
    prodProbePath: getValue('--prod-probe'),
    reindexEvidence: getValue('--reindex-evidence'),
    alertVerificationArtifact: getValue('--alert-artifact'),
    rollbackNote: getValue('--rollback-note'),
  };
}

function printUsage(): void {
  console.log(`Usage: tsx scripts/generate-release-evidence.ts [options]

Options:
  --tag <tag>                         Release tag (default: GITHUB_REF_NAME)
  --commit <sha>                      Release commit (default: GITHUB_SHA)
  --release-run-id <id>               Release workflow run ID (default: GITHUB_RUN_ID)
  --release-run-url <url>             Release workflow run URL
  --ci-run-id <id>                    CI workflow run ID
  --ci-run-url <url>                  CI workflow run URL
  --image-ref <ref>                   Canonical image reference
  --runtime-probes-dir <path>         Runtime probes directory (default: docs/evidence/runtime-probes)
  --release-evidence-dir <path>       Release evidence output directory (default: docs/evidence/release-evidence)
  --release-index-path <path>         Release index path (default: docs/RELEASE_INDEX.md)
  --staging-probe <path>              Explicit staging probe artifact
  --prod-probe <path>                 Explicit production probe artifact
  --reindex-evidence <text>           Reindex evidence reference
  --alert-artifact <path-or-url>      Alert verification artifact
  --rollback-note <text>              Rollback note
  --no-update-index                   Do not update docs/RELEASE_INDEX.md runtime ledger
  --allow-incomplete                  Allow writing output even if required fields are missing
  --strict                            Fail when warnings are present
  --help                              Show this help
`);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes('--help')) {
    printUsage();
    process.exit(0);
  }

  const args = parseArgs(argv);
  const result = generateReleaseEvidence({
    tag: args.tag,
    commit: args.commit,
    releaseRunId: args.releaseRunId,
    releaseRunUrl: args.releaseRunUrl,
    ciRunId: args.ciRunId,
    ciRunUrl: args.ciRunUrl,
    imageRef: args.imageRef,
    runtimeProbesDir: args.runtimeProbesDir,
    releaseEvidenceDir: args.releaseEvidenceDir,
    releaseIndexPath: args.releaseIndexPath,
    stagingProbePath: args.stagingProbePath,
    prodProbePath: args.prodProbePath,
    reindexEvidence: args.reindexEvidence,
    alertVerificationArtifact: args.alertVerificationArtifact,
    rollbackNote: args.rollbackNote,
    updateReleaseIndex: args.updateReleaseIndex,
    allowIncomplete: args.allowIncomplete,
  });

  console.log('Release evidence generation summary');
  console.log('-----------------------------------');
  console.log(`pass=${result.pass}`);
  console.log(`output=${result.outputPath || 'not-written'}`);
  console.log(`indexUpdated=${result.indexUpdated}`);
  if (result.record) {
    console.log(`tag=${result.record.tag}`);
    console.log(`stagingProbe=${result.record.runtimeVerification.stagingProbeArtifact}`);
    console.log(`prodProbe=${result.record.runtimeVerification.productionProbeArtifact}`);
  }
  if (result.errors.length > 0) {
    console.error('\nErrors:');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
  }
  if (result.warnings.length > 0) {
    console.warn('\nWarnings:');
    for (const warning of result.warnings) {
      console.warn(`- ${warning}`);
    }
  }

  const hasBlockingErrors = result.errors.length > 0 && !args.allowIncomplete;
  const strictFailure = args.strict && (result.errors.length > 0 || result.warnings.length > 0);
  if (!result.pass || hasBlockingErrors || strictFailure) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error('Release evidence generation failed:', error);
  process.exit(1);
}
