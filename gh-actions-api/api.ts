import "dotenv/config";
import express from "express";
import fs from "fs";
import {
  fromApiWorkflowRun,
  fromApiWorkflowRunJob,
  JobStep,
  WorkflowRun,
  WorkflowRunSummary,
  WorkflowStats,
  WorkflowSummary,
} from "./gh-actions-stats";
import {
  fetchWorkflowRunJobs,
  fetchWorkflowRuns,
  fetchWorkflowRunTiming,
  fetchWorkflows,
  GhApiConfig,
} from "./gh-api-client";

const ghApiConfig: GhApiConfig = {
  orgName: process.env.ORG_NAME!,
  repoName: process.env.REPO_NAME!,
  userName: process.env.GH_USERNAME!,
  accessToken: process.env.GH_ACCESS_TOKEN!,
};

const ciSrcWorkflowId = 15879208;

const fetchStats = async (): Promise<WorkflowStats> => {
  const apiRuns = await fetchWorkflowRuns(ghApiConfig, ciSrcWorkflowId);

  const workflowRuns: WorkflowRun[] = [];
  for (const apiRun of apiRuns) {
    const apiJobs = await fetchWorkflowRunJobs(ghApiConfig, apiRun.id);

    const runJobs = apiJobs.map(fromApiWorkflowRunJob);
    const run = fromApiWorkflowRun(apiRun, runJobs);
    workflowRuns.push(run);
  }

  return { id: ciSrcWorkflowId, name: "CI src", runs: workflowRuns };
};

const fetchWorkflowSummaries = async (): Promise<WorkflowSummary[]> => {
  const apiWorkflows = await fetchWorkflows(ghApiConfig);

  const workflowSummaries: WorkflowSummary[] = [];
  for (const workflow of apiWorkflows) {
    const apiRuns = await fetchWorkflowRuns(ghApiConfig, workflow.id);

    const runs: WorkflowRunSummary[] = [];
    for (const apiRun of apiRuns) {
      const timing = await fetchWorkflowRunTiming(ghApiConfig, apiRun.id);
      runs.push({
        conclusion: apiRun.conclusion,
        duration: timing.run_duration_ms,
        startedAt: apiRun.run_started_at,
        status: apiRun.status,
      });
    }

    workflowSummaries.push({ id: workflow.id, name: workflow.name, runs });
  }

  return workflowSummaries;
};

const app = express();
const PORT = 8000;
app.get("/", (req, res) => res.send("Express + TypeScript Server"));

app.get("/stats", async (req, res) => {
  //const stats = await fetchStats();
  const stats = JSON.parse(fs.readFileSync("./stats_ci_src.json", "utf-8"));
  res.send(stats);
});

app.get("/workflow-summaries", async (req, res) => {
  // const stats = await fetchWorkflowSummaries();
  const stats = JSON.parse(
    fs.readFileSync("./workflow-summaries.json", "utf-8")
  ) as WorkflowSummary[];

  const transformed = stats.map((workflow) => {
    const successfulRuns = workflow.runs.filter(
      (run) => run.conclusion === "success"
    );
    const failedRuns = workflow.runs.filter(
      (run) => run.conclusion === "failure"
    );

    return {
      name: workflow.name,
      numberOfSuccessfulRuns: successfulRuns.length,
      numberOfFailedRuns: failedRuns.length,

      avgDuration:
        successfulRuns.reduce((acc, run) => acc + run.duration, 0) /
        successfulRuns.length,
    };
  });

  res.send(transformed);
});

app.get("/steps", async (req, res) => {
  // const stats = await fetchStats();
  const stats = JSON.parse(
    fs.readFileSync("./stats_ci_src.json", "utf-8")
  ) as WorkflowStats;

  const steps = stats.runs
    .filter((run) => run.jobs.length > 0 && run.conclusion === "success")
    .reduce((acc, run) => {
      const steps = run.jobs[0].steps.filter((s) => s.conclusion === "success");
      return steps ? [...acc, ...steps] : acc;
    }, [] as JobStep[]);
  res.send(steps);
});

app.get("/ci-src-summary", async (req, res) => {
  const stats = JSON.parse(
    fs.readFileSync("./stats_ci_src.json", "utf-8")
  ) as WorkflowStats;

  const steps = stats.runs
    .filter((run) => run.jobs.length > 0 && run.conclusion === "success")
    .reduce((acc, run) => {
      const steps = run.jobs[0].steps.filter((s) => s.conclusion === "success");
      return steps ? [...acc, ...steps] : acc;
    }, [] as JobStep[])
    .reduce((acc, run) => {
      const current = acc.find((r) => r.name === run.name);
      const durations = current?.durations || [];
      return acc
        .filter((r) => r.name !== run.name)
        .concat({ name: run.name, durations: [...durations, run.duration] });
    }, [] as { name: string; durations: number[] }[])
    .map((s) => ({
      name: s.name,
      avgDuration:
        s.durations.reduce((acc, d) => acc + d, 0) / s.durations.length,
    }));

  const totalAverage = steps.reduce((acc, s) => acc + s.avgDuration, 0);

  const transformed = steps.map((step) => ({
    ...step,
    percent: (step.avgDuration / totalAverage) * 100,
  }));
  res.send(transformed);
});

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});
