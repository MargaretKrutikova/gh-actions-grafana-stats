import "dotenv/config";
import express from "express";
import fs from "fs";
import {
  fromApiWorkflowRun,
  fromApiWorkflowRunJob,
  JobStep,
  Workflow,
  WorkflowRun,
  WorkflowStats,
} from "./gh-actions-stats";
import {
  fetchWorkflowRunJobs,
  fetchWorkflowRuns,
  fetchWorkflowRunTiming,
  fetchWorkflows,
  GhApiConfig,
} from "./gh-api-client";

const ciSrcWorkflowId = 15879208;

const ghApiConfig: GhApiConfig = {
  orgName: process.env.ORG_NAME!,
  repoName: process.env.REPO_NAME!,
  userName: process.env.GH_USERNAME!,
  accessToken: process.env.GH_ACCESS_TOKEN!,
};

const fetchAllWorkflows = async (): Promise<WorkflowStats> => {
  const apiWorkflows = await fetchWorkflows(ghApiConfig);
  const workflowData: Workflow[] = [];

  for (const workflow of apiWorkflows) {
    const apiRuns = await fetchWorkflowRuns(ghApiConfig, workflow.id);

    const workflowRuns: WorkflowRun[] = [];
    for (const apiRun of apiRuns) {
      const apiJobs = await fetchWorkflowRunJobs(ghApiConfig, apiRun.id);
      const timing = await fetchWorkflowRunTiming(ghApiConfig, apiRun.id);

      const runJobs = apiJobs.map(fromApiWorkflowRunJob);
      const run = fromApiWorkflowRun(apiRun, runJobs, timing);
      workflowRuns.push(run);
    }

    workflowData.push({
      id: workflow.id,
      name: workflow.name,
      runs: workflowRuns,
    });
  }

  return { workflows: workflowData };
};

const updateStats = async () => {
  const stats = await fetchAllWorkflows();
  fs.writeFileSync("./workflow-stats.json", JSON.stringify(stats));
};

const readStats = () => {
  const stats = JSON.parse(fs.readFileSync("./workflow-stats.json", "utf-8"));
  return stats as WorkflowStats;
};

const app = express();
const PORT = 8000;

app.get("/", async (req, res) => {
  await updateStats();
  res.send("Express + TypeScript Server");
});

app.get("/stats", async (req, res) => {
  const name = req.query.name;
  //const stats = await fetchStats();
  const stats = readStats() as WorkflowStats;
  res.send(stats.workflows.find((w) => w.name === name));
});

app.get("/workflow-summaries", async (req, res) => {
  // const stats = await fetchWorkflowSummaries();
  const stats = readStats();

  const transformed = stats.workflows.map((workflow) => {
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
  const name = req.query.name;
  const stats = readStats();

  const steps = stats.workflows
    .find((workflow) => workflow.name === name)!
    .runs.filter((run) => run.jobs.length > 0 && run.conclusion === "success")
    .reduce((acc, run) => {
      const steps = run.jobs[0].steps.filter(
        (s) => s.conclusion === "success"
        // s.name.indexOf("checkout@v2") < 0 &&
        // s.name.indexOf("Stop containers") < 0 &&
        // s.name.indexOf("Set up job") < 0
      );
      return steps ? [...acc, ...steps] : acc;
    }, [] as JobStep[]);
  res.send(steps);
});

app.get("/runs", async (req, res) => {
  // const stats = await fetchStats();
  const name = req.query.name;
  const stats = readStats();

  const steps = stats.workflows
    .find((workflow) => workflow.name === name)!
    .runs.filter((run) => run.jobs.length > 0 && run.conclusion === "success");

  res.send(steps);
});

app.get("/duration-distribution", async (req, res) => {
  const stats = readStats();
  const name = req.query.name;

  const steps = stats.workflows
    .find((workflow) => workflow.name === name)!
    .runs.filter((run) => run.jobs.length > 0 && run.conclusion === "success")
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

app.get("/workflow-names", async (req, res) => {
  //const stats = await fetchStats();
  const stats = readStats() as WorkflowStats;

  res.send(stats.workflows.map((w) => w.name));
});

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});
