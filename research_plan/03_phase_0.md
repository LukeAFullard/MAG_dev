Phase 0 is the "Environment and Capture Calibration" stage. To extract reliable tracking and perform side-by-side comparisons, the quality of the input video and the setup of the camera are everything. Phase 0 focuses on establishing predictable, high-quality baselines for capture rather than building complex "Digital Twins" of the athletes.

---

## Phase 0: Capture & Environment Calibration

### 1. Camera Calibration Workflow

To ensure that side-by-side comparisons and trajectory tracking are consistent, the application needs an understanding of the camera's perspective and the scale of the environment.

* **Perspective Estimation:** A zero-friction, one-button "Calibrate Floor" workflow designed for non-technical coaches (e.g., automatically established by having the gymnast stand still for a second or detecting a simple ball drop). The app uses this to estimate the camera's perspective relative to the ground plane without requiring a complex multi-step tapping workflow.
* **Apparatus Anchors:** Utilizing the known, fixed geometry of apparatuses (e.g., floor is planar, vault table height is fixed, high bar location is constant).
* **Benefits:** This greatly improves scale consistency across different days, enhances landing plane estimation, and makes trajectory tracking much more reliable than trying to infer scale blindly.

### 2. Encouraging Controlled Capture

Good input quality drastically improves AI reliability. The app will actively guide coaches on how to capture footage to ensure the best possible tracking results.

* **Capture Guidelines UI:** Built-in recommendations for:
    * **Tripod Use:** Essential for side-by-side comparisons and stable trajectory tracing.
    * **Side-Angle Capture:** Especially critical for landing analysis and profile views of rotation.
    * **Lighting:** Ensuring the gymnast is well-lit and separated from the background.
    * **Settings:** Minimum resolution and utilizing slow-motion recording modes when available for less motion blur.

### 3. Apparatus & Biomechanical Constraints Baseline

Instead of deep, medical-grade biometric scanning, the app establishes basic rules to prevent the AI from generating impossible poses (jitter).

* **Skeletal Proportions:** While not explicitly measured with tape, the system enforces stable skeletal proportions frame-to-frame (a femur cannot shrink during a flip).
* **Motion Continuity:** Using optimization algorithms to enforce realistic, continuous motion, preventing the tracked joints from "teleporting."
* **Landing Plane Alignment:** Calibrating the estimated floor plane so the system knows where the gymnast's feet should stop.

### 4. Technical Environment Profiling (GPU/WebGPU Benchmarking)

Since the architecture is "local-first," Phase 0 still includes a hardware handshake to ensure the laptop/desktop can handle the real-time processing workload.

* **GPU/WebGPU Warmup:** The app runs a series of synthetic inference tests using **Transformers.js** to determine if it should prioritize the Nano, Small, or larger RTMPose model based on available compute.
* **Performance Logging:** It establishes the baseline frame rate capacity of the machine to maintain a stable, high FPS for auto-clipping and tracking without dropping frames.

---

### Implementation Step

1. **Capture Onboarding UI:** Build a simple, intuitive onboarding flow that guides coaches on camera placement, tripod usage, and lighting.
2. **Calibration Tool:** Build a frictionless, one-button "Calibrate Floor" tool that uses a simple reference (like the gymnast standing still) to establish a perspective baseline for that session, avoiding complex multi-step tapping workflows.
3. **Hardware Check:** Implement the WebGPU performance benchmark script.