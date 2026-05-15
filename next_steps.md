# Next Steps: Replacing Mocked/Simulated Features

This document outlines the implementation plan to replace currently mocked or simulated features in the MAG_dev desktop-first environment with fully functional, production-ready code.

## 1. Manual Annotation (`src/components/ManualAnnotation.tsx`)

**Current State:** Uses hardcoded `mockPoints` and a static image/canvas setup to demonstrate point dragging and editing.
**Goal:** Integrate directly with real extracted poses and video frames from the database/pipeline.

**Implementation Plan:**
- [x] **Data Integration:** Update the component to accept a specific `ExtractedClip` and an array of `poses` as props, rather than using `mockPoints`.
- [x] **Video Frame Extraction:** Instead of drawing a solid gray rectangle, use the actual video file (`video_path` from the database) and HTML5 `<video>` to extract the true frame at the selected `currentTime`.
- [x] **Data Persistence:** When a user drags a point to correct it, dispatch an update back to the database. Overwrite the `metrics_json` for that specific attempt so the corrected pose is saved.
- [x] **Model Drift Protection:** Ensure the UI strictly edits the *metadata* stored in SQLite. Do NOT send these corrections back to `@huggingface/transformers` or `rtmlib-ts` to fine-tune the local model.

## 2. Video Pruning Lifecycle (`src/db/index.ts`)

**Current State:** The `pruneOldVideos` function simulates pruning by setting the `video_path` field to `NULL` for attempts older than `video_retention_days`, but it does not actually delete any files from disk.
**Goal:** Implement true file deletion via the Origin Private File System (OPFS).

**Implementation Plan:**
- [x] **OPFS Integration:** Implement utility functions to read, write, and delete raw video blobs using the OPFS API (`navigator.storage.getDirectory()`).
- [x] **Update Upload Logic:** Modify `handleFileUpload` in `App.tsx` (or the pipeline) to save the uploaded file into OPFS and store the OPFS path/handle identifier in the database's `video_path` column.
- [x] **Implement Deletion:** Update `pruneOldVideos` in `src/db/index.ts`. Before nullifying the `video_path` row in SQLite, retrieve the file identifier, access OPFS, and invoke `fileHandle.remove()` to free up local disk space.

## 3. Camera Calibration Workflow (`src/components/CameraCalibration.tsx`)

**Current State:** Relies on `setTimeout` to simulate a "Calibrating..." loading state and includes a mock "Simulate Camera Bump" button to trigger the fail-safe alert.
**Goal:** Implement real image analysis to establish a floor plane and detect background shifts.

**Implementation Plan:**
- [ ] **Real Video Stream:** Hook up a live camera feed (via `navigator.mediaDevices.getUserMedia()`) or require the user to provide a short setup clip.
- [ ] **Floor Plane Estimation:** Pass the calibration frame through the `PoseExtractor`. Ask the user to stand still. Extract their ankle coordinates and calculate the 2D line equation that represents the floor plane. Store this equation in the database/state.
- [ ] **Fail-safe Implementation:** During active recording or Pass 1, periodically sample a background region (e.g., top 10% of the frame where athletes shouldn't be). If the pixel differencing (like in `autoClip.ts`) detects a massive sudden shift across the *entire* background, trigger the `onBumpDetected` callback.

## 4. Pipeline Simulation Mode (`src/pipeline.ts`)

**Current State:** If a `File` object is not provided to `startJob`, the pipeline falls back to a simulated mode with `setInterval`, dummy clips, and `setTimeout`.
**Goal:** Remove the mock data and gracefully handle edge cases using actual pipeline logic.

**Implementation Plan:**
- [ ] **Enforce File Requirement:** Refactor `startJob` to make the `File` argument mandatory, or at least require a valid OPFS path.
- [ ] **Remove Mock Branches:** Delete the `else` branches in `pass1_autoClipExtraction` and `pass2_poseEstimation` that generate dummy data.
- [ ] **Graceful Failure:** If a clip extraction yields zero clips, the pipeline should immediately transition to 'completed' with a message ("No motion detected"), rather than generating dummy clips to satisfy downstream processes.
- [ ] **Test File Integration:** Update `App.tsx`'s "Simulate Video Drop" button to fetch a small, actual test video (e.g., from the `public/` directory) and pass it into the pipeline, proving the pipeline works end-to-end without needing user input every time.
