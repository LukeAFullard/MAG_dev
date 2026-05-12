Phase 1 shifts from the static calibration of Phase 0 to **dynamic, real-time biomechanical analysis**. This phase focuses on achieving stable, high-speed 3D pose estimation and generating the core apparatus-specific metrics defined in the research.

---

## Phase 1: MVP Execution - Floor Landings (Months 4–6)

The primary goal of this phase is to transform raw video into a "Live Biomechanical Layer" that provides immediate technical feedback to the athlete, focused strictly on a single, high-value MVP.

### 1. Real-Time Inference Engine: YOLO-Pose + Depth Anything

To achieve the 30-60 FPS performance required for gymnastics analysis without overheating, the app will utilize the latest models running on a laptop or desktop environment.

* **Model Selection**: Deploying **YOLO26-Pose (Nano/Small)** via **Transformers.js (v4.2)** for 2D keypoint extraction.
* **The Z-Axis Pipeline**: Running **Depth Anything v2 (Small)** concurrently to generate a relative depth map.
* **Performance Optimization**: Running both models at 30fps will stress even modern laptop GPUs. The engine will run depth estimation every 3–5 frames and interpolate the joint depth between frames using the pose tracking trajectory, as the depth map doesn't change fast enough to require per-frame inference.
* **WebGPU Acceleration**: Utilizing the WebGPU runtime in Transformers.js to perform on-device inference, ensuring that sensitive athlete data remains local and avoids cloud processing costs.
* **Synthetic Fine-Tuning**: Training the YOLO model on gymnastics-specific datasets to handle "extreme" and "self-occluded" poses where standard models typically fail.

### 2. Apparatus-Specific MVP: Floor Landings

The core intelligence will initially focus exclusively on the Floor apparatus to build the MVP. Monocular 3D estimation is most viable here when recorded from a side-view camera.

*   **Floor Landings:** Tracks "landing stiffness" by calculating the minimum knee angle during impact.
    *   **Target:** $< 63^{\circ}$ at maximum center of mass (CM) displacement.
    *   **Validation:** Coaches intensely care about landing stiffness (for safety and scoring). We must validate that clubs are willing to pay for this single capability before building out Pommel Horse, Vault, Still Rings, P-Bars, and High Bar.

### 3. The "Slow-Motion Player" & Live AR Overlay

Visualization is the bridge between data and coaching.

* **Automated Overlays**: A customized player that automatically overlays joint angles and the CM trajectory directly onto the video frames using **FFmpegKit** for local rendering.
* **Live AR "Ghost"**: Utilizing the personalized biometric profile from Phase 0 to render a 3D skeleton in real-time, which changes color (e.g., Green to Red) when technical benchmarks (like landing knee angles) are not met.

### 4. Local-First Data Handling

* **Edge Storage**: All analyzed video clips and CSV joint data are stored in a local **SQLite** or **Realm** database.
* **Smart Pruning**: The app will automatically identify and delete "dead air" (frames where no gymnast is detected), keeping only relevant training attempts to preserve laptop storage.
* **Camera Placement/Tripod Mode**: Providing guidance and feedback on camera placement (e.g., advising side vs. front angle) since analysis quality heavily depends on view angle.

### Realistic Milestone

By the end of Month 6, the app should be a functional "Personal Lab" where a coach can set up a webcam or transfer video to their laptop and receive an immediate post-routine breakdown of their **landing stiffness** on Floor routines, without any manual annotation. This provides the core value proposition for paid validation.