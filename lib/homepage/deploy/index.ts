export { VercelClient } from "./vercel-client";
export type {
  VercelConfig,
  CreateProjectParams,
  CreateDeploymentParams,
  EnvVar,
  DeploymentInfo,
} from "./vercel-client";
export { VercelApiError } from "./vercel-client";

export { DeployManager } from "./deploy-manager";
export type { DeployResult, ProjectStatus } from "./deploy-manager";

export {
  generateSubdomain,
  validateSubdomain,
  isSubdomainAvailable,
  generateUniqueSubdomain,
} from "./subdomain-manager";
