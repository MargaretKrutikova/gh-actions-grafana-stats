import "dotenv/config";
import express from "express";
import fs from "fs";
import {
  fromApiWorkflowRun,
  fromApiWorkflowRunJob,
  JobStep,
  WorkflowRun,
  WorkflowStats,
} from "./gh-actions-stats";
import {
  fetchWorkflowRunJobs,
  fetchWorkflowRuns,
  GhApiConfig,
} from "./gh-api-client";

const ghApiConfig: GhApiConfig = {
  orgName: process.env.ORG_NAME!,
  repoName: process.env.REPO_NAME!,
  userName: process.env.GH_USERNAME!,
  accessToken: process.env.GH_ACCESS_TOKEN!,
};

const ciSrcWorkflowId = 1;

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

const app = express();
const PORT = 8000;
app.get("/", (req, res) => res.send("Express + TypeScript Server"));

app.get("/stats", async (req, res) => {
  //const stats = await fetchStats();
  const stats = JSON.parse(fs.readFileSync("./stats_ci_src.json", "utf-8"));
  res.send(stats);
});

app.get("/steps", async (req, res) => {
  // const stats = await fetchStats();
  const stats = JSON.parse(
    fs.readFileSync("./stats_ci_src.json", "utf-8")
  ) as WorkflowStats;

  const steps = stats.runs
    .filter((run) => run.jobs.length > 0 && run.conclusion === "success")
    .reduce((acc, run) => {
      const steps = run.jobs[0].steps;
      return steps ? [...acc, ...steps] : acc;
    }, [] as JobStep[]);
  res.send(steps);
});

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
});
