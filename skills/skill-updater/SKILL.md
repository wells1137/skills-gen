---
name: skill-updater
description: >
  Updates a specific skill within a repository and triggers the automated publishing pipeline. Use when the user wants to release a new version of a single skill.
---

# Skill Updater

This skill automates the release process for a **single** skill within a repository, ensuring it's published to all relevant channels without affecting other skills.

## When to Use

- When you have modified a single skill and are ready to release a new version.
- When you want to automate the process of updating the skill's version, creating a changelog commit, and publishing it to ClaWHub.

## How It Works

This skill finds and executes a release script within the target repository. It assumes the repository has been set up with the `skill-publisher` pipeline.

### Execution Steps

When this skill is activated, it will:

1.  **Ask for Target Skill**: It will ask the user for the name of the skill to update (e.g., `image-gen`).
2.  **Ask for New Version**: It will request the new version number (e.g., `2.1.0`).
3.  **Ask for Changelog**: It will ask for a short, one-line description of the changes.
4.  **Execute Release Script**: It will locate the `scripts/release.sh` script in the repository and execute it with the provided arguments.

This triggers the `publish.yml` GitHub Actions workflow, which detects the new tag and publishes the updated skill to ClaWHub.

## Example Interaction

> **User:** "Help me update the `image-gen` skill."
> 
> **Agent (using this skill):** "What is the new version number?"
> 
> **User:** "2.1.0"
> 
> **Agent:** "And what's the main change in this version?"
> 
> **User:** "Added Stable Diffusion 3 support."
> 
> **Agent:** "Got it. Releasing `image-gen` v2.1.0..."
> *Agent executes `bash scripts/release.sh image-gen 2.1.0 "Add Stable Diffusion 3 support"`*
