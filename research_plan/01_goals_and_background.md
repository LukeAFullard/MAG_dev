To create the "best gymnastics app in the world," the product must be a **local-first gymnastics video analysis assistant** that helps coaches rapidly review attempts, track athlete consistency, detect technical deviations, and monitor progress over time.

The project shifts away from "research-heavy, true physics simulation" and "automated judging" to practical, trust-building tools that serve as a daily coaching workflow enhancer.

---

## I. Core Value Proposition

Rather than promising "medical-grade biomechanics" or "perfect AI scoring," the application focuses on consistency tracking and comparative review. Single-camera video is inherently limited for exact physical measurements in gymnastics, but it is extremely powerful for:

* **Movement Consistency:** Tracking how an athlete's technique holds up across multiple attempts or sessions.
* **Side-by-Side Comparison:** Comparing an athlete against their past performance, against an ideal reference, or comparing a successful attempt to a failed one.
* **Landing Analysis:** Evaluating landing stability, step count, lateral drift, knee collapse tendency, and landing dispersion. This is a specialized feature perfectly suited for monocular video because the ground plane provides a strong constraint.
* **Session Analytics & Organization:** Automatically turning long, tedious recordings into categorized, easy-to-review clips (e.g., "all vault attempts", "all dismount landings").

---

## II. Business & Go-To-Market Layer

To build a viable product, the application must differentiate itself from incumbent video analysis tools (like Dartfish and Hudl) which primarily serve elite, well-funded programs.

* **Target Audience:** Youth gymnastics programs and competitive clubs that lack the budget for elite multi-camera setups or full-time analysts.
* **Differentiation:**
    * **Desktop-First V1:** The application is explicitly built for desktop/laptop first, adopting a "drop a video in, get analysis later" pattern like video editing tools.
    * **Affordability:** Runs on standard laptops/desktops without expensive proprietary hardware.
    * **Privacy First:** The local-first architecture ensures compliance with youth privacy laws (COPPA/GDPR) by keeping all sensitive video and biometric data on-device.
    * **Workflow Automation:** Saves coaches massive amounts of time by automatically extracting and tagging clips, reducing manual video scrubbing.
* **Monetization:** A tiered SaaS model targeting club programs (B2B), with the core value proposition centered on reducing coach workload and providing objective progress tracking over time.

---

## III. Updated Step-by-Step Development Plan

The plan has been completely revised to focus on reliability, speed, and usability in real coaching environments.

### Phase 1: Reliable Core
* **Focus:** Providing immediate utility without making unfulfillable "true 3D" promises.
* **Features:**
  * Auto Clip Extraction (detect athlete, trim attempts, group by skill).
  * 2D Pose Tracking & Overlays (joints, angles, COM approximation, trajectories).
  * Side-by-Side Comparison Tools.
  * Specialized Landing Analysis (stability, drift, knee collapse).
  * Session Analytics (attempts, consistency scores, progression over weeks).
  * Manual Coach Annotations (frame stepping, tagging, drawing).

### Phase 2: Enhanced Motion Intelligence
* **Focus:** Improving temporal stability and occlusion handling.
* **Features:**
  * Depth-assisted stabilization (using depth for relative geometry, not exact metrics).
  * Temporal smoothing (Kalman filtering, trajectory smoothing).
  * Apparatus-aware constraints (leveraging fixed geometry of floor, beam, high bar).
  * Camera calibration workflows to improve scale consistency and trajectory tracking.

### Phase 3: Advanced Insights
* **Focus:** Long-term analytics and proactive coaching insights.
* **Features:**
  * Athlete trend models.
  * Fatigue detection.
  * Personalized technique baselines.
  * Predictive analytics based on historical tracking data.

---

### Realistic Tech Assessment

| Component | Reality Check |
| --- | --- |
| **Transformers.js** | **Achievable.** V3's WebGPU support is the "missing link" for running heavy pose and tracking models on a laptop/desktop browser at optimal framerates. |
| **RTMPose** | **Best Choice.** Superior to MediaPipe for rapid, complex rotations (Vault/High Bar) where tracking "flicker" is common. Replaces YOLO-Pose due to AGPL-3.0 licensing issues. With deferred batch processing, we can use higher quality variants (like RTMPose-m or RTMPose-l). |
| **Monocular Depth** | **Re-scoped.** Used strictly for relative geometry, motion assistance, and consistency enhancement—not for extracting exact real-world distances or forces. |
| **Auto Clip Detection** | **Highly Feasible.** Can be reliably achieved using pose velocity, bounding boxes, and simple motion thresholds without needing "perfect AI." |
