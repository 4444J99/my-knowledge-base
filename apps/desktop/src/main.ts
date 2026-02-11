import { DesktopUniverseClient } from './universe-client';
import { createAttachPoint, startReindexWorkflow } from './workflows';
import { DesktopUniverseShell } from './shell';

export async function bootstrapDesktopUniverse(): Promise<{
  status: string;
  summary?: unknown;
  providers?: unknown[];
  attachPoint?: { id: string; absolutePath: string };
  reindexWorkflow?: { status: string; runId?: string };
  error?: string;
}> {
  const base = process.env.DESKTOP_API_BASE_URL || 'http://localhost:3000/api';
  const authHeader = process.env.DESKTOP_API_AUTH_HEADER;
  const client = new DesktopUniverseClient({
    baseUrl: base,
    authHeader,
  });
  const shell = new DesktopUniverseShell(client);

  try {
    const shellState = await shell.initialize();
    if (shellState.status === 'error') {
      throw new Error(shellState.error ?? 'Desktop shell failed to initialize');
    }

    const attachPoint = createAttachPoint({
      label: 'Primary Intake',
      absolutePath: process.env.DESKTOP_ATTACH_PATH || '/data/intake',
    });

    const workflow = startReindexWorkflow('pending');
    return {
      status: 'ready',
      summary: shellState.summary ?? undefined,
      providers: shellState.providers,
      attachPoint: {
        id: attachPoint.id,
        absolutePath: attachPoint.absolutePath,
      },
      reindexWorkflow: {
        status: workflow.status,
        runId: workflow.runId,
      },
    };
  } catch (error) {
    return {
      status: 'degraded',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
