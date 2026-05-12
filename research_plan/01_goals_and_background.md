To create the "best gymnastics app in the world," the plan must move beyond generic pose estimation to a **Personalized Biomechanical Model**. By measuring the specific limb lengths and mass distribution of the individual athlete, the app can transition from "visual estimation" to "true physics simulation."

---

## I. Biometric Profiling: Calibrating the Physics Engine

Generic AI models often assume "average" human proportions, which can lead to a 40% error in predicting joint forces. By integrating a personalized onboarding phase, we can refine the physics accuracy.

### 1. Manual Measurement & 3D Body Scanning (Phase 2 Enhancement)

* **Method:** The primary and most reliable path is **manual physical measurement** (a coach with a tape measure). A 60-second 3D scan (front, back, sides) from a laptop webcam is framed as a *Phase 2 enhancement*, as consumer-grade monocular photogrammetry is unreliable without controlled lighting and calibration targets.
* **Extraction & Calibration:** Coaches **enter real physical measurements manually** to ground-truth the physics engine. In Phase 2, automated extraction from scans will be introduced as a supplemental enhancement.
* **Impact:** This allows the app to calculate the **exact Center of Mass (CM)** and **Moment of Inertia** for that specific gymnast, rather than relying solely on a population average.

### 2. Digital Skeleton Personalization

* **Custom Humanoid Model:** The 2D landmarks from the pose model are mapped onto the athlete's specific biometric skeleton.
* **Depth Ambiguity Resolution:** Using the athlete's known limb lengths as "hard constraints," the AI can more accurately "lift" 2D video into 3D space by knowing that a forearm cannot physically stretch or shrink during a vault.

---

## II. Business & Go-To-Market Layer

To build a viable product, the application must differentiate itself from incumbent video analysis tools (like Dartfish and Hudl) which primarily serve elite, well-funded programs.

* **Target Audience:** Youth gymnastics programs and competitive clubs that lack the budget for elite multi-camera setups or full-time analysts.
* **Differentiation:**
    * **Affordability:** Runs on standard laptops/desktops without expensive proprietary hardware.
    * **Privacy First:** The local-first architecture ensures compliance with youth privacy laws (COPPA/GDPR) by keeping all sensitive video and biometric data on-device.
    * **Personalized Biometrics:** Unlike generic tools, the system calibrates to the individual athlete's body, providing actionable physics-based feedback rather than just simple video playback.
* **Monetization:** A tiered SaaS model targeting club programs (B2B), with the core value proposition centered on reducing coach workload and objectively tracking athlete progression and safety (e.g., landing impact).

## III. Strategic Feature Expansion (The "Missing" Layer)

Based on current market gaps and emerging 2026 tech, the following features should be integrated:

* **Live AR Coaching Overlay:** Use **Transformers.js (v3) with WebGPU** to provide sub-100ms latency. An AR skeleton is overlaid on the live camera feed, turning red when a joint angle (like a knee at landing) deviates from the FIG-compliant target.
* **Dynamic Injury Risk Dashboard:** Combine biomechanical data (e.g., landing impact velocity) with **wearable data** (Heart Rate Variability, sleep, and training load). This creates a "susceptibility model" that alerts the coach when an athlete is at high risk for an ACL or labral tear.
* **Gamified Skill Trees:** Implement a visual "progression map" based on the FIG levels. Athletes earn "XP" and digital badges for mastering specific biomechanical benchmarks, such as maintaining a 180° handstand for 5 seconds.
* **"Ghost" Pro Overlay:** Allow athletes to record a routine and immediately overlay a transparent 3D "ghost" of an Olympic-level execution for direct visual comparison of body shapes.

---

## IV. Updated Step-by-Step Development Plan

The plan has been revised to focus on an MVP execution strategy, validating market demand before scaling to complex, multi-year research goals.

### Phase 0: The "Digital Twin" Onboarding (Months 1–3)

* **Focus:** Biometric measurement and calibration via manual entry.
* **Tech:** Implement a simple UX for coaches to input precise physical measurements (limb lengths, weight) to build the athlete's personalized profile. 3D scanning SDK integration is deferred to Phase 2.
* **Goal:** A "Physics Profile" for every user that stores their unique mass distribution.

### Phase 0.5: Camera Calibration & Placement (Month 3)

* **Focus:** Establishing accurate 3D lifting from 2D video.
* **Tech:** Implement a checkerboard or apparatus-marker-based homography calibration.
* **Goal:** Improve 3D lifting accuracy and provide camera placement guidance to ensure optimal keypoint visibility (e.g., side angles for floor landings).

### Phase 1: The MVP Execution - Floor Landings (Months 4–6)

* **Focus:** Desktop/laptop-native inference focused exclusively on Floor landings.
* **Tech:** Export YOLO models to ONNX; use WebGPU for browser/desktop acceleration.
* **Goal:** Live joint-angle tracking for knee angle at impact. Validate that coaches are willing to pay for this single, high-value capability before expanding.

### Phase 2: Execution Deductions & Load Optimization (Months 7–12)

* **Focus:** FIG Code of Points integration (Execution only) and training load management.
* **Tech:** Expanding the Phase 1 physics engine to evaluate other rulesets (e.g., knee angle, toe point).
* **Goal:** Automated E-Score deductions and long-term technique insights.

### Phase 3: The Social & Professional Ecosystem (Vision)

* **Focus:** Gamification and external data sync.
* **Tech:** Integrate HealthKit/Google Fit and Garmin APIs.
* **Goal:** Skill trees, community challenges, and full training load visualization.

---

### Realistic Tech Assessment

| Component | Reality Check |
| --- | --- |
| **Transformers.js** | **Achievable.** V3's WebGPU support is the "missing link" for running heavy YOLO-pose models on a laptop/desktop browser at optimal framerates. |
| **YOLO-pose** | **Best Choice.** Superior to MediaPipe for rapid, complex rotations (Vault/High Bar) where tracking "flicker" is common. |
| **3D Scanning** | **Reliability Barrier.** Consumer-grade monocular photogrammetry is unreliable. Manual entry is the default; 3D scanning is deferred to Phase 2, and must ensure 100% local processing of body scan images on the laptop to comply with youth privacy laws (COPPA/GDPR). |