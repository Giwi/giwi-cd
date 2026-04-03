const express = require('express');
const router = express.Router();
const Pipeline = require('../models/Pipeline');
const Build = require('../models/Build');

function normalizeRepoUrl(url) {
  if (!url) return null;
  return url.replace(/\.git$/, '').replace(/\\/g, '/').toLowerCase();
}

function matchesRepo(pipelineUrl, webhookUrl) {
  if (!pipelineUrl || !webhookUrl) return false;
  return normalizeRepoUrl(pipelineUrl) === normalizeRepoUrl(webhookUrl);
}

router.get('/webhook/:pipelineId', (req, res) => {
  const pipeline = Pipeline.findById(req.params.pipelineId);
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }

  if (!pipeline.enabled) {
    return res.status(400).json({ error: 'Pipeline is disabled' });
  }

  const executor = req.app.get('buildExecutor');
  if (!executor) {
    return res.status(500).json({ error: 'Build executor not available' });
  }

  const build = Build.create({
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    branch: pipeline.branch || 'main',
    commit: null,
    commitMessage: 'Manual trigger via webhook',
    triggeredBy: 'webhook'
  });

  executor.execute(build, pipeline).catch(err => {
    console.error('[Webhook] Build execution error:', err.message);
  });

  res.json({ 
    message: 'Build triggered successfully',
    pipeline: pipeline.name,
    buildId: build.id
  });
});

router.post('/webhook/:pipelineId', (req, res) => {
  const pipeline = Pipeline.findById(req.params.pipelineId);
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }

  if (!pipeline.enabled) {
    return res.status(400).json({ error: 'Pipeline is disabled' });
  }

  if (!pipeline.triggers?.push) {
    return res.status(400).json({ error: 'Push triggers not enabled for this pipeline' });
  }

  const executor = req.app.get('buildExecutor');
  if (!executor) {
    return res.status(500).json({ error: 'Build executor not available' });
  }

  const payload = req.body;
  const event = req.headers['x-github-event'] || req.headers['x-gitlab-event'] || req.headers['x-event-key'];

  if (event === 'ping' || event === 'Pipeline Hook') {
    return res.json({ message: 'Webhook received successfully' });
  }

  let branch = null;
  let commit = null;
  let commitMessage = '';
  let triggeredBy = 'webhook';

  if (payload.ref) {
    branch = payload.ref.replace('refs/heads/', '');
  }

  if (payload.after) {
    commit = payload.after;
  }

  if (payload.head_commit) {
    commitMessage = payload.head_commit.message;
  }

  if (payload.commits && payload.commits.length > 0) {
    const lastCommit = payload.commits[payload.commits.length - 1];
    if (!commit) commit = lastCommit.id;
    if (!commitMessage) commitMessage = lastCommit.message;
  }

  if (pipeline.branch && pipeline.branch !== branch && pipeline.branch !== '*') {
    return res.json({ message: 'Branch does not match, skipping build' });
  }

  const build = Build.create({
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    branch: branch || pipeline.branch,
    commit: commit,
    commitMessage: commitMessage,
    triggeredBy: triggeredBy
  });

  executor.execute(build, pipeline).catch(err => {
    console.error('[Webhook] Build execution error:', err.message);
  });

  res.status(202).json({
    success: true,
    message: 'Build triggered',
    buildId: build.id
  });
});

router.post('/webhook', (req, res) => {
  const payload = req.body;
  const repoUrl = payload.repository?.url || 
                  payload.repository?.git_http_url || 
                  payload.repository?.links?.html?.href ||
                  payload.project?.web_url ||
                  req.headers['x-repo-url'];

  if (!repoUrl) {
    return res.status(400).json({ error: 'Repository URL not found in payload' });
  }

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
  if (!executor) {
    return res.status(500).json({ error: 'Build executor not available' });
  }

  let branch = null;
  let commit = null;
  let commitMessage = '';
  const event = req.headers['x-github-event'] || req.headers['x-gitlab-event'] || req.headers['x-event-key'];

  if (event === 'ping') {
    return res.json({ message: 'Webhook received successfully' });
  }

  if (payload.ref) {
    branch = payload.ref.replace('refs/heads/', '');
  }

  if (payload.after) {
    commit = payload.after;
  }

  if (payload.head_commit) {
    commitMessage = payload.head_commit.message;
  }

  if (payload.commits && payload.commits.length > 0) {
    const lastCommit = payload.commits[payload.commits.length - 1];
    if (!commit) commit = lastCommit.id;
    if (!commitMessage) commitMessage = lastCommit.message;
  }

  const triggeredBuilds = [];

  for (const pipeline of matchingPipelines) {
    const triggerBranch = branch || pipeline.branch;
    
    if (pipeline.branch && pipeline.branch !== '*' && pipeline.branch !== triggerBranch) {
      continue;
    }

    const build = Build.create({
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      branch: triggerBranch,
      commit: commit,
      commitMessage: commitMessage,
      triggeredBy: 'webhook'
    });

    executor.execute(build, pipeline).catch(err => {
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

router.get('/webhook/generate/:pipelineId', (req, res) => {
  const pipeline = Pipeline.findById(req.params.pipelineId);
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }

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

module.exports = router;
