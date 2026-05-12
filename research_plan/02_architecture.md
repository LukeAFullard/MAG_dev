A **Local-First** data architecture is a design paradigm where the primary copy of application data—and the logic required to process it—resides on the user’s local device rather than a remote server. In this model, the network is treated as an optional synchronization layer rather than a constant requirement for functionality.

For a high-performance biomechanics application, this architecture is a mechanical necessity to ensure sub-millisecond response times and ironclad data privacy.

---

## Core Pillars of the Architecture

### 1. On-Device Sovereignty & Storage

Unlike cloud-centric apps that treat the browser or mobile app as a "thin client," a local-first app treats the device as the **Source of Truth**.

*
**Persistent Local Database:** High-resolution video and biomechanical metrics are stored in local engines like **SQLite** or **Realm** by default.


*
**Asset Management:** Large video files are processed and "pruned" locally, keeping only analyzed clips to save storage without ever uploading raw, sensitive footage to a server.



### 2. Edge-Native Inference

The "intelligence" of the app—the 3D pose estimation and FIG scoring logic—happens entirely on the local hardware.

*
**Hardware Acceleration:** The app utilizes the device's **Neural Processing Unit (NPU)** or **GPU** (via WebGPU and Transformers.js) to perform real-time calculations.


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
| **Inference** | **LiteRT / YOLO-Pose** | Offloads pose estimation to the NPU to prevent device overheating.

 |
| **Storage** | **SQLite / FFmpegKit** | Manages the local relational data and performs frame manipulation without cloud APIs.

 |
| **Sync (Optional)** | **CRDTs** | (Conflict-free Replicated Data Types) Allows for syncing data across a phone and tablet without a central master.

 |

## Why it Matters for Gymnastics

In Men's Artistic Gymnastics (MAG), the "logic of motion" is complex and fast. A local-first approach ensures that the "Virtual Judge" can process a 240 FPS video of a vault and provide a D-score instantly, rather than waiting for a 1GB video file to upload, process, and return from the cloud. This transforms the app from a passive recording tool into an **active training partner**.