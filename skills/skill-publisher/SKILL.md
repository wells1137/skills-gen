---
name: skill-publisher
description: >
  Automates the multi-channel publishing of Agent Skills. Use when the user wants to release a new version of their skills to ClaWHub, GitHub, and other platforms.
---

# Skill Publisher

This skill automates the release process for a repository of Agent Skills, ensuring they are published to all relevant channels with a single command.

## When to Use

- When you have a GitHub repository containing one or more skills.
- When you want to release a new version of these skills.
- When you want to automate the process of publishing to ClaWHub, updating GitHub Topics, creating GitHub Releases, and submitting to awesome-lists.

## How It Works

This skill sets up a GitHub Actions-based CI/CD pipeline in the target repository. The pipeline is triggered by pushing a git tag (e.g., `v1.2.0`).

### Core Workflow

1.  **Setup (`setup.sh`)**: The main script that orchestrates the entire setup process.
2.  **CI/CD Creation**: The script copies pre-built GitHub Actions workflow files (`publish.yml`, `quality-check.yml`, `submit-awesome-lists.yml`) into the target repository's `.github/workflows` directory.
3.  **Helper Scripts**: It also adds helper scripts (`release.sh`, `setup-github-topics.sh`) to the repository's `scripts/` directory.
4.  **Secrets Configuration**: The script prompts the user for necessary API tokens (`CLAWHUB_TOKEN`, `GH_PAT`) and configures them as GitHub Actions secrets in the target repository.
5.  **Git Push**: Finally, it commits and pushes all the new files to the target repository.

### Execution Steps

When this skill is activated, it will perform the following steps:

1.  **Ask for Target Repository**: It will ask the user for the GitHub repository URL where the skills are located (e.g., `https://github.com/your-org/your-skills-repo`).
2.  **Ask for API Tokens**: It will request the necessary `CLAWHUB_TOKEN` and a `GH_PAT` with `repo` and `workflow` scopes.
3.  **Clone Repository**: It will clone the target repository into a temporary directory.
4.  **Run Setup Script**: It will execute the `setup.sh` script, which will:
    *   Copy the workflow and helper script templates from this skill's `assets/` directory into the target repository.
    *   Use the `gh` CLI to set the repository secrets.
    *   Commit and push the changes.
5.  **Confirm Success**: It will report back to the user that the automated publishing pipeline has been successfully set up and provide instructions on how to trigger the first release.

## Bundled Resources

-   **`scripts/setup.sh`**: The main orchestration script.
-   **`assets/workflows/publish.yml`**: GitHub Actions workflow for publishing on tag push.
-   **`assets/workflows/quality-check.yml`**: GitHub Actions workflow for running quality checks on PRs.
-   **`assets/workflows/submit-awesome-lists.yml`**: GitHub Actions workflow for submitting PRs to awesome-lists.
-   **`assets/scripts/release.sh`**: Helper script for users to easily create a new release.
-   **`assets/scripts/setup-github-topics.sh`**: Helper script for setting GitHub Topics.
