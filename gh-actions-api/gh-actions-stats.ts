import {
  ApiJobStep,
  ApiWorkflowRun,
  ApiWorkflowRunJob,
  ApiWorkflowRunTiming,
  WithDuration,
} from "./gh-api-client";

export type JobStep = {
  name: string;
  status: string;
  conclusion: string;
  startedAt: string;
  duration: number;
};

export type WorkflowRunJob = {
  id: number;
  name: string;
  status: string;
  conclusion: string;
  startedAt: string;
  duration: number;
  steps: JobStep[];
};

export type WorkflowRun = {
  id: number;
  startedAt: string;
  conclusion: string;
  status: string;
  jobs: WorkflowRunJob[];
  duration: number;
};

export type Workflow = {
  id: number;
  name: string;
  runs: WorkflowRun[];
};

export type WorkflowStats = {
  workflows: Workflow[];
};

const calculateDuration = (obj: WithDuration) =>
  new Date(obj.completed_at).getTime() - new Date(obj.started_at).getTime();

const fromApiJobStep = (step: ApiJobStep): JobStep => ({
  name: step.name,
  status: step.status,
  conclusion: step.conclusion,
  startedAt: step.started_at,
  duration: calculateDuration(step),
});

export const fromApiWorkflowRunJob = (
  job: ApiWorkflowRunJob
): WorkflowRunJob => ({
  id: job.id,
  name: job.name,
  status: job.status,
  conclusion: job.conclusion,
  startedAt: job.started_at,
  duration: calculateDuration(job),
  steps: job.steps.map(fromApiJobStep),
});

export const fromApiWorkflowRun = (
  run: ApiWorkflowRun,
  jobs: WorkflowRunJob[],
  timing: ApiWorkflowRunTiming
): WorkflowRun => ({
  id: run.id,
  status: run.status,
  conclusion: run.conclusion,
  startedAt: run.run_started_at,
  duration: timing.run_duration_ms,
  jobs,
});
