# Project Checklist

This document outlines the sequential step-by-step implementation plan for the MAG_dev gymnastics video analysis assistant. Each step represents a distinct block of work for an AI agent or development team.

## Group 1: Pre-Development Validation & Licensing
*Before writing production code, these business and licensing blockers must be resolved.*

- [ ] **1.1. Validate Market & UX:** (Future work) Conduct user discovery with 15-20 club coaches and build a no-code UX prototype (Figma) for the core session workflow. *(Ref: Feasibility Audit)*
- [x] **1.2. Resolve Pose Licensing:** Finalize the switch from YOLO-Pose to RTMPose/RTMW (Apache 2.0). *(Ref: 13_model_updates_2025.md)*
- [x] **1.3. Resolve Depth Licensing:** Confirm the use of Depth Anything 3 Small (Apache 2.0). *(Ref: 13_model_updates_2025.md)*
- [x] **1.4. Resolve FFmpegKit Licensing (Mobile):** Verify App Store compliance for the LGPL build of FFmpegKit or design an AVFoundation/MediaCodec alternative. *(Ref: 12_ffmpeg_resolution.md)*

## Group 2: Architecture & Foundation (Desktop-First)
*Setting up the local-first environment and core processing pipeline.*

- [x] **2.1. Initialize Desktop-First Environment:** Set up a local-first web/desktop wrapper (e.g., Electron or local web server) optimized for laptop usage. *(Ref: 01_goals_and_background.md - Differentiation)*
- [x] **2.2. Setup Local Database & Storage Lifecycle:** Implement a local database (SQLite or Realm) to store raw per-session metric distributions and athlete metadata. Implement automated pruning policies for high-framerate video. *(Ref: 02_architecture.md - Local Device Sovereignty)*
- [x] **2.3. Implement WASM/WebGPU Inference Engine:** Integrate Transformers.js with WebGPU support for local inference execution. *(Ref: 02_architecture.md - Technical Stack)*
- [x] **2.4. Establish the 3-Pass Processing Pipeline:** Scaffold the asynchronous workflow architecture:
  - Pass 1: Motion detection + auto-clip extraction (Fast)
  - Pass 2: Full pose estimation per clip (Slow/Background)
  - Pass 3: Constraint engine smoothing + metric calculation
  *(Ref: 02_architecture.md - Revised Processing Model)*

## Group 3: Phase 0 - Capture & Environment Calibration
*Ensuring the quality of input video.*

- [x] **3.1. Build Capture Guidelines UI:** Create onboarding screens recommending tripod use, side-angle capture, and proper lighting. *(Ref: 03_phase_0.md - Encouraging Controlled Capture)*
- [x] **3.2. Implement Camera Calibration Workflow:** Build a one-button "Calibrate Floor" tool using a simple reference (gymnast standing still) to establish perspective. *(Ref: 03_phase_0.md - Camera Calibration Workflow)*
- [x] **3.3. Implement Calibration Fail-safes:** Add background motion detection to alert the user or auto-recover if the camera is bumped mid-session. *(Ref: 03_phase_0.md - Calibration Fail-safes)*
- [ ] **3.4. Curate Ground Truth Dataset:** (Future work) Assemble and annotate a baseline video dataset (e.g., 100-200 attempts) with expert human judges for metric correlation. *(Ref: 03_phase_0.md - Ground Truth Validation)*
- [x] **3.5. Develop Hardware Profiling Tool:** Create a WebGPU benchmark script to test the machine's capabilities and select the appropriate model size. *(Ref: 03_phase_0.md - Technical Environment Profiling)*

## Group 4: Phase 1 - Reliable Core (MVP Features)
*Building the minimum viable product based on the 3-pass pipeline.*

- [x] **4.1. Implement Pass 1: Auto Clip Extraction:** Build motion thresholding and pose velocity logic to detect athletes, trim attempts, and group by skill. *(Ref: 04_phase_1.md - Auto Clip Detection & Extraction)*
- [x] **4.2. Implement Pass 2: 2D Pose Tracking:** Integrate RTMPose-m or RTMPose-l for background batch processing to extract skeletal joints, angles, and COM trajectories. *(Ref: 04_phase_1.md - 2D Pose Tracking & Overlay)*
- [x] **4.3. Implement Relative Depth Maps:** Integrate the selected small depth model to improve occlusion handling and temporal consistency. *(Ref: 04_phase_1.md - Relative Depth)*
- [x] **4.4. Build Side-by-Side Comparison UI:** Implement synchronized playback tools, anchor frame syncing, and overlay modes. *(Ref: 04_phase_1.md - Side-by-Side Comparison Tools)*
- [ ] **4.5. Implement Pass 3: Landing Analysis Engine:** Calculate landing stability, step count, lateral drift, and knee collapse tendency using floor plane constraints. *(Ref: 04_phase_1.md - Specialized Landing Analysis)*
- [ ] **4.6. Build Session Analytics Dashboards:** Create UI for multi-athlete management, attempt categorization, and video-linked drill-down from data points. *(Ref: 04_phase_1.md - Session Analytics & Management)*
- [ ] **4.7. Add Manual Annotation Tools:** Implement frame stepping, point editing/correction, coach drawing overlays, and tagging. Ensure the correction feedback loop overrides metadata without directly fine-tuning local base models. *(Ref: 07_additional_features.md - Manual Annotation Tools, 04_phase_1.md - Correction Feedback Loop)*

## Group 5: Phase 2 - Enhanced Motion Intelligence
*Improving the stability and realism of the tracking data.*

- [ ] **5.1. Implement Multi-Frame Depth Stabilization:** Update depth logic to analyze sequences of frames for relative spatial ordering. *(Ref: 05_phase_2.md - Multi-Frame Depth Stabilization)*
- [ ] **5.2. Add Advanced Temporal Smoothing:** Implement Kalman filtering and trajectory smoothing across keypoints. *(Ref: 05_phase_2.md - Advanced Temporal Smoothing)*
- [ ] **5.3. Build Apparatus-Aware Constraints:** Integrate fixed geometry logic for Floor, Pommel Horse, Vault, High Bar/P-Bars, and Rings. *(Ref: 08_physics_logic_engine.md - Apparatus-Specific Constraints)*
- [ ] **5.4. Enforce Human Biomechanical Constraints:** Apply optimization algorithms to limit impossible joint angles, enforce limb length consistency, and prevent teleportation. *(Ref: 08_physics_logic_engine.md - Human Biomechanical Constraints)*
- [ ] **5.5. Implement "Chalk & Noise" Filter:** Add dynamic background subtraction to keep focus on the primary athlete. *(Ref: 07_additional_features.md - Environmental Resilience)*

## Group 6: Phase 3 - Advanced Insights
*Building longitudinal tracking and proactive analysis.*

- [ ] **6.1. Develop Technique Baselines & Trend Models:** Analyze raw variance data to build historical baselines and trigger regression alerts. *(Ref: 06_phase_3.md - Athlete Trend Models)*
- [ ] **6.2. Implement Fatigue Detection:** Track consistency scores within single sessions and across weeks to plot workload fatigue curves. *(Ref: 06_phase_3.md - Fatigue Detection)*
- [ ] **6.3. Add Predictive Analytics:** Create Competition Readiness Scores and skill prerequisite tracking based on historical data. *(Ref: 06_phase_3.md - Predictive Analytics)*
- [ ] **6.4. Enhance Comparative Insights:** Track left/right symmetry indices and cross-apparatus metric correlations. *(Ref: 06_phase_3.md - Advanced Comparative Insights)*

## Group 7: Mobile App Implementation (Future Phase)
*Bringing the app to iOS and Android after the desktop version is validated.*

- [ ] **7.1. Initialize Cross-Platform Mobile Environment:** Scaffold a Flutter app using `ffmpeg_flutter` (LGPL) and ONNX Runtime Mobile. *(Ref: 10_mobile_app_implementation_plan.md - Recommended Technology Stack)*
- [ ] **7.2. Integrate Mobile-Optimized Models:** Deploy MoveNet Thunder (iOS) and RTMPose nano (Android) with offline model management. *(Ref: 10_mobile_app_implementation_plan.md - Recommended Model Strategy)*
- [ ] **7.3. Implement Mobile Video Capture & Management:** Build robust local recording capabilities without heavy real-time inference. *(Ref: 10_mobile_app_implementation_plan.md - MVP Features: Video Capture)*
- [ ] **7.4. Implement Mobile Deferred Pipeline:** Replicate the 3-pass processing architecture locally on mobile (record first -> process in background). *(Ref: 10_mobile_app_implementation_plan.md - Mobile AI Architecture)*
- [ ] **7.5. Build Mobile UI/UX:** Port the session management, frame scrubbing, and manual annotation tools to touch interfaces. *(Ref: 10_mobile_app_implementation_plan.md - MVP Features: Session Organization)*
- [ ] **7.6. Implement Pre-Rendered Overlays:** Build logic to pre-render pose overlays into video files for smooth side-by-side playback on mobile. *(Ref: 10_mobile_app_implementation_plan.md - MVP Features: Side-by-Side Comparison)*
- [ ] **7.7. Build Secure P2P Sync (Optional):** Implement local network transfer (Wi-Fi Direct / QR code) for sharing data between desktop and mobile devices. *(Ref: 07_additional_features.md - Secure Peer-to-Peer Synchronization)*
