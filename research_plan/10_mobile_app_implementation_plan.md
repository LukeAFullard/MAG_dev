# Mobile Gymnastics Coach App — Implementation Plan

## Project Goal

Build a lightweight, reliable, coach-focused mobile application for iPhone and Android that provides:

* fast video capture
* automatic clip extraction
* pose overlays
* side-by-side comparison
* landing review
* athlete organization
* lightweight session analytics

The application must:

* run reliably on modern mobile devices
* prioritize stability and speed over advanced AI complexity
* function offline where possible
* avoid heavy real-time 3D reconstruction
* avoid desktop-class computational requirements
* support both iOS and Android from a shared codebase

---

# Product Positioning

## Core Value Proposition

> “Instant replay and AI-assisted review for gymnastics coaches.”

The app is NOT:

* an automated judging system
* a biomechanics laboratory
* a medical diagnostic tool
* a physics simulation engine

The app IS:

* a coaching assistant
* a video organization tool
* a movement review tool
* a consistency tracking tool

---

# Target Users

## Primary Users

* gymnastics coaches
* club coaches
* private trainers
* small gymnastics facilities

## Secondary Users

* athletes
* parents
* strength and conditioning coaches

---

# Core Design Principles

## 1. Reliability First

Stable outputs are more important than advanced AI.

## 2. Fast Workflow

The app must work naturally during live coaching sessions.

## 3. Mobile-Native Experience

Designed for use while standing on the gym floor.

## 4. Offline-First

Core functionality should not require internet.

## 5. Human-in-Control

Users must be able to:

* edit clips
* correct errors
* add notes
* override AI outputs

---

# Recommended Technology Stack

## Cross-Platform Framework

### Recommended

* Flutter

Why:

* strong iOS + Android support
* excellent performance
* mature camera support
* strong rendering performance
* easier single-codebase maintenance

Alternative:

* React Native

Flutter is preferred due to better animation/rendering consistency.

## Video Processing & Format Handling

### Recommended

* FFmpeg (via `ffmpeg_flutter`) - **Must use LGPL build**.

Why:
* Essential for handling default OS formats (HEVC on iOS, H.264/H.265 on Android).
* Required for precise clip trimming.
* Enables slow-motion frame extraction (120/240fps).
* Facilitates annotation burn-in for exporting and sharing.

*License Note:* To avoid GPL infection, ensure the LGPL build of FFmpegKit is used (never `--enable-gpl`). App Store distribution with LGPL can be complex; an alternative for basic trimming is native iOS (AVFoundation) and Android (MediaCodec) APIs, but FFmpeg is superior for annotation burn-in.

---

# AI / ML Runtime

## Recommended Primary Runtime

### ONNX Runtime Mobile

Benefits:

* optimized mobile inference
* supports quantized models
* works on Android and iOS
* lower overhead than browser-based inference

Alternative options:

* TensorFlow Lite
* CoreML (iOS-specific acceleration)

---

# Recommended Model Strategy

## Pinned Model Selection for MVP

To avoid testing overhead and ensure reliable performance, the mobile v1 will commit to:

* **iOS:** MoveNet Thunder (utilizing CoreML acceleration for fast performance). *Note: Must verify Apache 2.0 license applicability on TF Hub model card before commercial deployment.*
* **Android:** RTMPose nano (or similar MIT/Apache 2.0 alternative like ViTPose, replacing YOLOv8-pose nano due to AGPL-3.0 licensing).

Avoid:

* large transformer models
* giant multimodal models
* cloud-dependent inference

Target:

* fast inference
* low battery use
* low RAM usage

## Offline Model Management Strategy

* Models will be shipped with the app bundle or securely downloaded on the first run.
* Ensure stringent model size limits (e.g., maintaining the ~6MB constraint for the selected nano model) to minimize footprint.

---

# MVP Features

# 1. Video Capture

## Requirements

* record practice attempts
* support slow-motion capture where available
* support landscape orientation
* automatic clip saving
* local device storage

## Important Constraints

Do NOT attempt:

* continuous heavy inference during recording
* real-time advanced 3D processing

---

# 2. Automatic Clip Extraction

## Goal

Automatically split long recordings into individual attempts.

## Inputs

* motion intensity
* pose velocity
* athlete movement start/end

## Processing Strategy

Perform lightweight analysis:

* after recording
* or during idle moments

NOT continuously at high quality.

## Output

* individual clips
* sortable timeline
* athlete-linked clips

---

# 3. Pose Overlay

## Goal

Overlay a stable 2D skeleton on recorded footage.

## Recommended Features

* joint visualization
* trajectory traces
* angle estimation
* frame stepping

## Technical Recommendations

Use the pinned models (MoveNet Thunder for iOS, RTMPose nano for Android).

Prefer:

* lower resolution
* temporal smoothing
* stable tracking

over maximum precision.

---

# 4. Side-by-Side Comparison (Phase 3)

## Goal

Allow coaches to compare:

* two attempts
* athlete progression over time
* successful vs failed attempts

## Features

* synchronized playback
* scrub synchronization
* overlay trajectories (pre-rendered)
* frame matching

## Important Technical Constraint

Synced dual-stream playback of two HD clips with live pose overlays is a genuine performance challenge on mobile. Instead of live compositing, overlays must be pre-rendered as video files (using FFmpeg) to ensure smooth playback. This feature is firmly placed in Phase 3.

---

# 5. Landing Review

## Goal

Analyze landing quality using lightweight heuristics.

## Metrics

* stabilization time
* landing drift
* step count
* torso lean
* knee collapse tendency

## Important Note

Metrics should be presented as:

* indicators
* trends
* approximations

NOT precise biomechanical measurements.

---

# 6. Session Organization

## Features

* athlete profiles
* session grouping
* tags
* favorites
* notes
* attempt history

## Importance

This transforms the app from:

“cool AI demo”

into:

“daily coaching workflow tool.”

---

# 7. Coach Annotation Tools

## Required Features

* draw on frames
* add comments
* slow playback
* frame stepping
* favorite attempts
* clip trimming

## Importance

Critical for trust.

Users must always remain in control.

---

# Features Explicitly Excluded From Mobile MVP

The following should NOT be part of the first mobile release.

## Excluded Features

* automated judging
* D-score estimation
* advanced 3D reconstruction
* physics simulation
* force estimation
* injury prediction
* wearable integration
* multi-athlete scene analysis
* real-time full-resolution inference
* advanced generative AI coaching

These dramatically increase:

* complexity
* battery use
* instability
* support burden

---

# Mobile AI Architecture

# Recommended Processing Pipeline

## Phase 1 — Recording

During recording:

* lightweight tracking only
* no heavy inference
* minimal CPU/GPU usage

## Phase 2 — Deferred Analysis

After clip ends:

* run pose estimation
* apply smoothing
* calculate metrics
* render overlays

This approach greatly improves:

* battery life
* thermal performance
* app responsiveness

---

# Temporal Smoothing Strategy

## Required

Raw pose estimation will jitter.

Use:

* Kalman filtering
* moving averages
* confidence-based smoothing
* joint continuity constraints

This is essential.

---

# Depth Sensing Strategy

# IMPORTANT

The mobile app should NOT depend on advanced monocular depth reconstruction.

Instead:

* use depth only as a helper signal
* focus on stability improvements
* treat outputs as approximate

---

# Recommended Depth Uses

## 1. Subject Separation

Improve athlete/background separation.

## 2. Pose Stabilization

Reduce tracking jitter.

## 3. Floor Plane Estimation

Improve landing analysis.

## 4. Relative Spatial Ordering

Help determine body configuration.

---

# LiDAR Strategy

## Optional Enhancement Only

Some devices support LiDAR.

Examples:

* iPhone Pro
* iPad Pro

Use LiDAR only for:

* enhanced floor estimation
* improved scaling
* improved separation

The app must NEVER require LiDAR.

---

# Camera Guidance System

## Extremely Important

Good input quality is more valuable than advanced AI.

The app should guide users toward:

* stable tripod placement
* proper lighting
* side-angle positioning
* adequate distance
* landscape orientation

---

# Performance Targets

## Desired Targets

### Recording

* stable 30 FPS UI
* no overheating during standard sessions

### Processing

* analysis within a few seconds
* responsive scrubbing
* smooth playback

### Battery

* usable through long training sessions

## Device Constraints & Fragmentation

Android fragmentation means ONNX Runtime performs very differently on flagship vs. mid-range devices used by club coaches.
* Minimum device specs must be established.
* A graceful degradation path is required (e.g., automatically disabling pose overlay on low-end devices while still offering core video review and clip extraction).

---

# Data Storage Strategy

## Local First

Store:

* clips
* metadata
* athlete data
* annotations

on-device first.

## Optional Cloud Backup

Possible future enhancement.

NOT required for MVP.

---

# Privacy Strategy

## Important

Youth athlete footage may be sensitive.

Recommendations:

* local processing by default
* minimal cloud dependency
* explicit export controls
* strong privacy messaging

This may become a competitive advantage.

---

# Recommended MVP Development Order

# Phase 1 — Foundation

Build:

* camera recording
* clip management
* athlete organization
* playback system

## Goal

Stable coaching workflow.

---

# Phase 2 — AI Basics

Add:

* pose estimation
* overlays
* simple smoothing
* trajectory traces

## Goal

Reliable visual analysis.

---

# Phase 3 — Coaching Features

Add:

* side-by-side comparison (with pre-rendered overlays, not live compositing)
* landing review
* annotations
* trend tracking

## Goal

Daily coach usability.

---

# Phase 4 — Enhanced Intelligence

Later additions:

* improved temporal smoothing
* optional depth assistance
* apparatus-aware tracking
* advanced consistency metrics

Only after stability is proven.

---

# Success Metrics

The mobile app succeeds if coaches:

* use it repeatedly during training
* save time reviewing footage
* trust the outputs
* can quickly compare attempts
* find the workflow faster than standard phone video review

The app does NOT need:

* perfect AI
* perfect biomechanics
* exact physics

to provide significant coaching value.

---

# Final Strategic Recommendation

The strongest version of this product is:

* lightweight
* stable
* coach-centered
* privacy-first
* mobile-native

The project should focus on becoming:

> the fastest and easiest way for gymnastics coaches to review and organize athlete attempts.

That is a realistic and commercially viable direction for a mobile application.