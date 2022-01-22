import axios from "axios";

const getBaseUrl = (config: GhApiConfig) =>
  `https://api.github.com/repos/${config.orgName}/${config.repoName}/actions`;

export type GhApiConfig = {
  orgName: string;
  repoName: string;
  userName: string;
  accessToken: string;
};

export type WithDuration = {
  started_at: string;
  completed_at: string;
};

export type ApiWorkflow = {
  id: number;
  name: string;
  state: string;
};

export type ApiWorkflowRun = {
  id: number;
  name: string;
  run_started_at: string;
  status: string;
  conclusion: string;
};

export type ApiJobStep = {
  name: string;
  status: string;
  conclusion: string;
  number: number;
} & WithDuration;

export type ApiWorkflowRunJob = {
  id: number;
  name: string;
  status: string;
  conclusion: string;
  steps: ApiJobStep[];
} & WithDuration;

const callGhApi = async (config: GhApiConfig, path: string) => {
  const url = `${getBaseUrl(config)}/${path}`;
  try {
    const response = await axios.get(url, {
      auth: {
        username: config.userName,
        password: config.accessToken,
      },
    });

    return response.data;
  } catch (error) {
    console.log(error);
  }
};

const fetchAllPagesRec = async <T>(
  config: GhApiConfig,
  path: string,
  getItems: (d: any) => T[],
  prevPage: number,
  currentItems: T[]
): Promise<T[]> => {
  const nextPage = prevPage + 1;
  const data = await callGhApi(
    config,
    `${path}?per_page=100&page=${prevPage + 1}`
  );

  const items = getItems(data);
  if (items.length === 0) {
    return currentItems;
  }

  const newItems = currentItems.concat(items);
  return fetchAllPagesRec(config, path, getItems, nextPage, newItems);
};

const fetchAllPages = async <T>(
  config: GhApiConfig,
  path: string,
  getItems: (d: any) => T[]
) => fetchAllPagesRec(config, path, getItems, 0, []);

export const fetchWorkflowRuns = async (
  config: GhApiConfig,
  workflowId: number
) => {
  const path = `workflows/${workflowId}/runs`;
  return fetchAllPages<ApiWorkflowRun>(
    config,
    path,
    (data) => data.workflow_runs
  );
};

export const fetchWorkflowRunJobs = async (
  config: GhApiConfig,
  runId: number
) => {
  const path = `runs/${runId}/jobs`;
  return fetchAllPages<ApiWorkflowRunJob>(config, path, (data) => data.jobs);
};
