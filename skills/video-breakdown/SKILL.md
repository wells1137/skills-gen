---
name: video-breakdown
version: 1.0.0
author: "@wells1137"
tags: ["video", "breakdown", "analysis", "critique", "shot-by-shot", "拉片"]

---

# Video Breakdown

An advanced video analysis skill that provides both high-level quality assessment and detailed shot-by-shot breakdowns. It helps content creators, editors, and marketers to objectively evaluate video quality and deconstruct narrative structures. It helps content creators, editors, and marketers to objectively evaluate video quality and deconstruct narrative structures.

This skill is powered by a custom backend service that leverages state-of-the-art video understanding models from fal.ai.

## Core Capabilities

| Capability | Description | Use Case |
| :--- | :--- | :--- |
| **Quality Critique** | Provides a quantitative score (1-10) and qualitative comments for key technical aspects of a video. | Quickly evaluate if user-generated content meets quality standards; compare different versions of a video. |
| **Shot Breakdown** | Delivers a detailed breakdown of each shot, including timestamps, visual descriptions, and camera work. | Deeply analyze a competitor's video; deconstruct a film scene for educational purposes; create a highlight reel script. |

## How It Works

This skill acts as a client to a dedicated backend service. The agent submits a video URL and an `analysis_type` to the service, which then queues the job and returns a `task_id`. The agent can then poll the status of the job until it is completed.

### Workflow

1.  **Agent**: Calls the `/analyze` endpoint with `video_url` and `analysis_type`.
2.  **Service**: Submits the job to the AI model and returns a `task_id`.
3.  **Agent**: Periodically calls the `/status/{task_id}` endpoint.
4.  **Service**: Returns the job status (`queued`, `in_progress`, or `completed`).
5.  **Agent**: Once completed, retrieves and presents the JSON result to the user.

## Usage

### 1. Quality Assessment

**Goal**: Get a technical quality report for a video.

**Agent Action**:

```json
{
  "tool": "video-breakdown.analyze",
  "args": {
    "video_url": "https://example.com/my-video.mp4",
    "analysis_type": "quality_critique"
  }
}
```

**Expected Output (after polling)**:

```json
{
  "resolution": {
    "score": 9,
    "comment": "The resolution is high, and the main subject is exceptionally sharp..."
  },
  "lighting": {
    "score": 9,
    "comment": "The lighting is excellent, effectively utilizing vibrant neon..."
  },
  "audio": {
    "score": 7,
    "comment": "Audio is clear, but some background noise is present..."
  },
  "stability": {
    "score": 10,
    "comment": "The video exhibits outstanding stability..."
  }
}
```

### 2. Shot-by-Shot Analysis (拉片)

**Goal**: Get a detailed scene breakdown of a video.

**Agent Action**:

```json
{
  "tool": "video-breakdown.analyze",
  "args": {
    "video_url": "https://example.com/scene.mp4",
    "analysis_type": "shot_breakdown"
  }
}
```

**Expected Output (after polling)**:

```json
[
  {
    "start_time": "00:00",
    "end_time": "00:04",
    "description": "A stylish young woman is walking confidently towards the camera...",
    "camera_work": "The camera is static and appears to be at a medium-low angle..."
  },
  {
    "start_time": "00:04",
    "end_time": "00:08",
    "description": "Close-up on the woman's face as she smiles subtly...",
    "camera_work": "The camera zooms in slowly, focusing on her expression..."
  }
]
```

## Backend Service API Reference

-   **`POST /analyze`**: Submits a new analysis job.
    -   **Body**: `{"video_url": "string", "analysis_type": "string"}`
-   **`GET /status/{task_id}`**: Checks the status of a job.
-   **`GET /analysis_types`**: Lists available `analysis_type` values.
