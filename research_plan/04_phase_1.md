Phase 1 shifts from the static calibration of Phase 0 to **dynamic, real-time biomechanical analysis**. This phase focuses on achieving stable, high-speed 3D pose estimation and generating the core apparatus-specific metrics defined in the research.

---

## Phase 1: The Biomechanical Core (Months 4–9)

The primary goal of this phase is to transform raw video into a "Live Biomechanical Layer" that provides immediate technical feedback to the athlete.

### 1. Real-Time Inference Engine: YOLO26-Pose & WebGPU

To achieve the 30-60 FPS performance required for gymnastics analysis without overheating, the app will utilize the latest models running on a laptop or desktop environment.

* **Baseline Model Benchmark:** The *first task* of Phase 1 is to evaluate pre-fine-tuned accuracy on severe gymnastics poses (e.g., handstands, release moves, pommel circles). Standard COCO-trained models often fail on these non-upright orientations.
* **Model Selection**: Deploying **YOLO26-Pose (Nano/Small)** via **Transformers.js (v4.2)**. This model is natively NMS-free (Non-Maximum Suppression), reducing latency significantly on laptop GPUs and maintaining high accuracy for the 17-33 keypoints required.
* **WebGPU Acceleration**: Utilizing the WebGPU runtime in Transformers.js to perform on-device inference, ensuring that sensitive athlete data remains local and avoids cloud processing costs.
* **Synthetic Fine-Tuning**: Training the model on gymnastics-specific datasets to handle "extreme" and "self-occluded" poses where standard models typically fail.

### 2. Apparatus-Specific Metric Modules

The core intelligence will be modularized based on the six FIG apparatus to provide targeted feedback.

| Apparatus | Implementation Logic | Key Target/Benchmark |
| --- | --- | --- |
| **Floor** | Tracks "landing stiffness" by calculating the minimum knee angle during impact. | **Target:** $< 63^{\circ}$ at maximum center of mass (CM) displacement. |
| **Pommel Horse** | Measures circular amplitude using the horizontal Head-Toe Distance (HTDh). | **Target:** Maintain maximum amplitude over 50+ repetitions. |
| **Vault** | High-speed tracking of the "flight parabola" and board/table contact time. | **Target:** Table contact time $\approx 0.26\text{s}$; maximize CM height. |
| **Still Rings** | Monitors shoulder abduction symmetry to detect strength imbalances or injury risk. | **Target:** $90^{\circ}$ symmetrical hold for elements like the Iron Cross. |
| **P-Bars / High Bar** | Calculates angular momentum and release timing using the "moment of inertia" formula. | **Target:** $180^{\circ}$ verticality on handstands; optimized release velocity. |

### 3. The "Slow-Motion Player" & Live AR Overlay

Visualization is the bridge between data and coaching.

* **Automated Overlays**: A customized player that automatically overlays joint angles and the CM trajectory directly onto the video frames using **FFmpegKit** for local rendering.
* **Live AR "Ghost"**: Utilizing the personalized biometric profile from Phase 0 to render a 3D skeleton in real-time, which changes color (e.g., Green to Red) when technical benchmarks (like landing knee angles) are not met.

### 4. Local-First Data Handling

* **Edge Storage**: All analyzed video clips and CSV joint data are stored in a local **SQLite** or **Realm** database.
* **Smart Pruning**: The app will automatically identify and delete "dead air" (frames where no gymnast is detected), keeping only relevant training attempts to preserve laptop storage.
* **Camera Placement/Tripod Mode**: Providing guidance and feedback on camera placement (e.g., advising side vs. front angle) since analysis quality heavily depends on view angle.

### Realistic Milestone

By the end of Month 9, the app should be a functional "Personal Lab" where a coach can set up a webcam or transfer video to their laptop and receive an immediate post-routine breakdown of their **landing stiffness**, **vault height**, and **circular amplitude** without any manual annotation.