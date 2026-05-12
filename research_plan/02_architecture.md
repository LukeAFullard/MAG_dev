A **Local-First** data architecture is a design paradigm where the primary copy of application data—and the logic required to process it—resides on the user’s local device (specifically, a desktop or laptop computer) rather than a remote server. In this model, the network is treated as an optional synchronization layer rather than a constant requirement for functionality.

For a high-performance biomechanics application, this architecture leverages the superior processing power of laptops/desktops to ensure sub-millisecond response times and ironclad data privacy.

---

## Core Pillars of the Architecture

### 1. Local Device Sovereignty & Storage

Unlike cloud-centric apps that treat the browser or mobile app as a "thin client," a local-first app treats the desktop/laptop as the **Source of Truth**.

*
**Persistent Local Database:** High-resolution video and biomechanical metrics are stored in local engines like **SQLite** or **Realm** by default. Crucially, the database stores the **raw per-session metric distributions (variance across attempts)**, not just session averages. A gymnast consistently hitting a 68° knee angle is biomechanically different from one averaging 68° across a 55°–80° range.


*
**Asset Management:** Large video files are processed and "pruned" locally, keeping only analyzed clips to save storage without ever uploading raw, sensitive footage to a server.



### 2. Local Hardware Inference

The "intelligence" of the app—the 3D pose estimation and FIG scoring logic—happens entirely on the local hardware.

*
**Hardware Acceleration:** The app utilizes the laptop/desktop's **GPU** (via WebGPU and Transformers.js) to perform real-time calculations without the thermal throttling and power constraints of mobile devices.


*
**Monocular 3D Reconstruction Challenges & The Depth Map Solution:** Lifting 2D video into 3D space from a single camera introduces significant depth ambiguity. To solve this, the architecture integrates a Depth Map model (e.g., **Depth Anything v2**) to generate per-pixel relative depth. Combined with YOLO-pose keypoints, this converts 2D (x, y) landmarks into 3D (x, y, z_relative) coordinates. The Phase 0 biometric profiling is then used to convert this relative scale into true metric coordinates. Note: this still struggles with heavy motion blur in explosive movements (e.g., vault flight).


*
**Zero Latency:** Because data doesn't travel to a server and back, the athlete receives immediate feedback (e.g., an audio "ping" upon hitting a vertical handstand) while still on the apparatus.



### 3. Privacy by Design

This architecture serves as a proactive guardian for sensitive environments like gymnastics clubs.

*
**Data Isolation:** Biometric data, 3D body scans, and training videos never leave the device, satisfying the privacy concerns of parents and regulatory requirements.


*
**Offline Resilience:** The app remains 100% functional in "shielded" environments or gym facilities with poor Wi-Fi connectivity.



---

## Technical Stack for Local-First Execution

| Layer | Technology | Role in Local-First |
| --- | --- | --- |
| **Data Logic** | **WASM / Transformers.js** | Runs complex C++/Python logic at near-native speeds in the browser/client.

 |
| **Inference (Pose)** | **ONNX / YOLO-Pose** | Offloads pose estimation to the GPU, extracting 2D keypoints efficiently.

 |
| **Inference (Depth)**| **Depth Anything v2** | Generates relative depth maps to provide the critical Z-axis signal.

 |
| **Storage** | **SQLite / FFmpegKit** | Manages the local relational data and performs frame manipulation without cloud APIs.

 |
| **Sync (Optional)** | **Local Network Transfer** | Simple QR-code or local network transfer for syncing data (e.g., coach reviews), avoiding the implementation complexity of CRDTs.

 |

## Why it Matters for Gymnastics

In Men's Artistic Gymnastics (MAG), the "logic of motion" is complex and fast. A local-first approach ensures that the "Virtual Judge" can process a 240 FPS video of a vault and provide a D-score instantly, rather than waiting for a 1GB video file to upload, process, and return from the cloud. This transforms the app from a passive recording tool into an **active training partner**.