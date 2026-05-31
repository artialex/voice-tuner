import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === "true";
const isUserOrOrgPagesSite = repositoryName.endsWith(".github.io");

export default defineConfig({
  base: isGitHubPagesBuild ? (isUserOrOrgPagesSite ? "/" : `/${repositoryName}/`) : "/",
  plugins: [react()]
});
