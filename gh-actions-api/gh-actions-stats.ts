import {
  ApiJobStep,
  ApiWorkflowRun,
  ApiWorkflowRunJob,
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
  name: string;
  status: string;
  conclusion: string;
  startedAt: string;
  duration: number;
  steps: JobStep[];
};

export type WorkflowRun = {
  startedAt: string;
  conclusion: string;
  status: string;
  jobs: WorkflowRunJob[];
};

export type WorkflowStats = {
  id: number;
  name: string;
  runs: WorkflowRun[];
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
  name: job.name,
  status: job.status,
  conclusion: job.conclusion,
  startedAt: job.started_at,
  duration: calculateDuration(job),
  steps: job.steps.map(fromApiJobStep),
});

export const fromApiWorkflowRun = (
  run: ApiWorkflowRun,
  jobs: WorkflowRunJob[]
): WorkflowRun => ({
  status: run.status,
  conclusion: run.conclusion,
  startedAt: run.run_started_at,
  jobs,
});
