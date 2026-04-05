import type { Request, Response } from 'express';
import express, { type Router } from 'express';
import { Pipeline } from '../models/Pipeline';
import { Build } from '../models/Build';
import { RateLimiter } from '../middleware/rateLimiter';
import { sendError } from '../middleware/errorHandler';
import type { Pipeline as IPipeline, Build as IBuild } from '../types/index';

const router: Router = express.Router();

const webhookLimiter = new RateLimiter({
  windowMs: 60000,
  max: 30,
  message: 'Too many webhook requests, please try again later'
});

router.use(webhookLimiter.middleware());

function normalizeRepoUrl(url: string | undefined): string | null {
  if (!url) return null;
  return url.replace(/\.git$/, '').replace(/\\/g, '/').toLowerCase();
}

function matchesRepo(pipelineUrl: string | undefined, webhookUrl: string | undefined): boolean {
  if (!pipelineUrl || !webhookUrl) return false;
  return normalizeRepoUrl(pipelineUrl) === normalizeRepoUrl(webhookUrl);
}

interface BuildExecutor {
  execute: (build: IBuild, pipeline: IPipeline) => Promise<void>;
}

router.get('/webhook/:pipelineId', (req: Request, res: Response) => {
  const pipeline = Pipeline.findById(req.params.pipelineId);
  if (!pipeline) return sendError(res, 404, 'Pipeline not found');
  if (!pipeline.enabled) return sendError(res, 400, 'Pipeline is disabled');

  const executor = req.app.get('buildExecutor');
  if (!executor) return sendError(res, 500, 'Build executor not available');

  const build = Build.create({
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    branch: pipeline.branch || 'main',
    commit: undefined,
    commitMessage: 'Manual trigger via webhook',
    triggeredBy: 'webhook'
  });

  executor.execute(build, pipeline).catch((err: Error) => {
    console.error('[Webhook] Build execution error:', err.message);
  });

  res.json({
    message: 'Build triggered successfully',
    pipeline: pipeline.name,
    buildId: build.id
  });
});

router.post('/webhook/:pipelineId', (req: Request, res: Response) => {
  const pipeline = Pipeline.findById(req.params.pipelineId);
  if (!pipeline) return sendError(res, 404, 'Pipeline not found');
  if (!pipeline.enabled) return sendError(res, 400, 'Pipeline is disabled');
  if (!pipeline.triggers?.push) return sendError(res, 400, 'Push triggers not enabled for this pipeline');

  const executor = req.app.get('buildExecutor');
  if (!executor) return sendError(res, 500, 'Build executor not available');

  const payload = req.body as Record<string, unknown>;
  const event = (req.headers['x-github-event'] || req.headers['x-gitlab-event'] || req.headers['x-event-key']) as string | undefined;

  if (event === 'ping' || event === 'Pipeline Hook') {
    return res.json({ message: 'Webhook received successfully' });
  }

  let branch: string | null = null;
  let commit: string | null = null;
  let commitMessage = '';
  const triggeredBy = 'webhook';

  if (payload.ref) {
    branch = (payload.ref as string).replace('refs/heads/', '');
  }

  if (payload.after) {
    commit = payload.after as string;
  }

  if (payload.head_commit) {
    commitMessage = ((payload.head_commit as Record<string, string>).message) || '';
  }

  if (payload.commits && Array.isArray(payload.commits) && (payload.commits as unknown[]).length > 0) {
    const lastCommit = (payload.commits as Record<string, unknown>[])[(payload.commits as unknown[]).length - 1];
    if (!commit) commit = lastCommit.id as string;
    if (!commitMessage) commitMessage = (lastCommit.message as string) || '';
  }

  if (pipeline.branch && pipeline.branch !== branch && pipeline.branch !== '*') {
    return res.json({ message: 'Branch does not match, skipping build' });
  }

  const build = Build.create({
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    branch: branch || pipeline.branch,
    commit: commit || undefined,
    commitMessage: commitMessage || undefined,
    triggeredBy: triggeredBy
  });

  executor.execute(build, pipeline).catch((err: Error) => {
    console.error('[Webhook] Build execution error:', err.message);
  });

  res.status(202).json({
    success: true,
    message: 'Build triggered',
    buildId: build.id
  });
});

router.post('/webhook', (req: Request, res: Response) => {
  const payload = req.body as Record<string, unknown>;
  const repoLink = (payload.repository as Record<string, unknown>)?.links as Record<string, unknown> | undefined;
  const repoUrl = (payload.repository as Record<string, unknown>)?.url as string ||
                  (payload.repository as Record<string, unknown>)?.git_http_url as string ||
                  (repoLink?.html as Record<string, unknown>)?.href as string ||
                  (payload.project as Record<string, unknown>)?.web_url as string ||
                  req.headers['x-repo-url'] as string;

  if (!repoUrl) return sendError(res, 400, 'Repository URL not found in payload');

  const allPipelines = Pipeline.findAll();
  const matchingPipelines = allPipelines.filter(p =>
    p.enabled &&
    p.triggers?.push &&
    matchesRepo(p.repositoryUrl, repoUrl)
  );

  if (matchingPipelines.length === 0) {
    return res.json({ message: 'No matching pipelines found', triggered: 0 });
  }

  const executor = req.app.get('buildExecutor');
  if (!executor) return sendError(res, 500, 'Build executor not available');

  let branch: string | null = null;
  let commit: string | null = null;
  let commitMessage = '';
  const event = (req.headers['x-github-event'] || req.headers['x-gitlab-event'] || req.headers['x-event-key']) as string | undefined;

  if (event === 'ping') {
    return res.json({ message: 'Webhook received successfully' });
  }

  if (payload.ref) {
    branch = (payload.ref as string).replace('refs/heads/', '');
  }

  if (payload.after) {
    commit = payload.after as string;
  }

  if (payload.head_commit) {
    commitMessage = ((payload.head_commit as Record<string, string>).message) || '';
  }

  if (payload.commits && Array.isArray(payload.commits) && (payload.commits as unknown[]).length > 0) {
    const lastCommit = (payload.commits as Record<string, unknown>[])[(payload.commits as unknown[]).length - 1];
    if (!commit) commit = lastCommit.id as string;
    if (!commitMessage) commitMessage = (lastCommit.message as string) || '';
  }

  const triggeredBuilds: { pipelineId: string; pipelineName: string; buildId: string }[] = [];

  for (const pipeline of matchingPipelines) {
    const triggerBranch = branch || pipeline.branch;

    if (pipeline.branch && pipeline.branch !== '*' && pipeline.branch !== triggerBranch) {
      continue;
    }

    const build = Build.create({
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      branch: triggerBranch,
      commit: commit || undefined,
      commitMessage: commitMessage || undefined,
      triggeredBy: 'webhook'
    });

    executor.execute(build, pipeline).catch((err: Error) => {
      console.error('[Webhook] Build execution error:', err.message);
    });

    triggeredBuilds.push({
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      buildId: build.id
    });
  }

  res.status(202).json({
    success: true,
    message: `${triggeredBuilds.length} build(s) triggered`,
    builds: triggeredBuilds
  });
});

router.get('/webhook/generate/:pipelineId', (req: Request, res: Response) => {
  const pipeline = Pipeline.findById(req.params.pipelineId);
  if (!pipeline) return sendError(res, 404, 'Pipeline not found');

  const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhooks/${pipeline.id}`;

  res.json({
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    webhookUrl: webhookUrl,
    instructions: {
      github: `Go to your GitHub repository → Settings → Webhooks → Add webhook. Enter the URL and select "push" events.`,
      gitlab: `Go to your GitLab repository → Settings → Webhooks. Enter the URL and select "Push events".`,
      bitbucket: `Go to your Bitbucket repository → Repository settings → Webhooks → Add webhook. Enter the URL and select "Repository push".`
    }
  });
});

export default router;
