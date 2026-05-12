Phase 0 is the "Calibration and Profiling" stage. While the research indicates that most apps operate in a technological vacuum, this phase transforms your application from a general video tool into a professional-grade biomechanical laboratory by establishing a **Digital Twin** of the athlete.

By accurately measuring the athlete before they ever touch an apparatus, you solve the "ill-posed problem" where 3D pose estimation struggles with depth ambiguity.

---

## Phase 0: The Digital Twin & Biomechanical Calibration

### 1. Biometric Segment Mapping

Instead of assuming universal human proportions, the app must capture the specific segment lengths of the gymnast. This is critical because the moment of inertia ($I$) is dependent on the mass ($m$) and the square of the distance from the axis of rotation ($r$).

* **Segment Lengths:** Use a guided AR/webcam interface to measure the humerus, radius, femur, and tibia. **Calibration Fallback:** If visual extraction quality is poor (e.g., bad lighting, movement), a fallback interface allows coaches to input precise manual measurements.
* **Precision:** These measurements act as "hard constraints" for the 3D lifting engine; the AI will know that a gymnast's forearm cannot physically "stretch" during a high-bar release, significantly reducing joint error.
* **Mass Distribution:** By combining the athlete's total weight with limb circumferences, the app can estimate the mass of individual segments to more accurately calculate the Center of Mass (CM).
* **Developmental Variation:** Youth gymnasts change rapidly. The system will prompt a re-calibration of the Digital Twin every 3–6 months depending on the athlete's age.



### 2. Anatomical Range of Motion (ROM) Baseline

The research notes that the AI model must use a loss function that penalizes rotations exceeding "natural anatomical ranges". Phase 0 establishes these specific ranges for the individual.

* **Joint Limit Calibration:** The athlete performs a series of controlled stretches (e.g., maximum shoulder flexion, knee extension).
*
**Compliance Checks:** This baseline allows the "Virtual Judge" to identify deductions like "bent knees" or "un-pointed toes" with higher certainty because it knows the athlete's maximum extension.


*
**Symmetry Tracking:** Establishing a baseline for shoulder and leg symmetry is essential for predicting injury risk later in training.



### 3. Static Center of Mass (CM) Calibration

The CM is the "anchor" for almost every FIG apparatus, from circular stability on Pommel Horse to the flight parabola on Vault.

* **Static Baseline:** The app identifies the athlete's resting CM while standing.
*
**Dynamic Projection:** This baseline allows the app to calculate "maximum CM displacement" during floor landings and "shoulder vs. ankle diameter" during pommel circles.



### 4. Technical Environment Profiling (GPU/WebGPU Benchmarking)

Since the architecture is "local-first," Phase 0 includes a hardware handshake to ensure the laptop/desktop can handle the workload.

* **GPU/WebGPU Warmup:** The app runs a series of synthetic inference tests using **Transformers.js** to determine if it should prioritize the Nano, Small, or larger YOLO-pose model based on available compute.
*
**Performance Logging:** It establishes the baseline frame rate capacity of the machine to maintain a stable 30-60 FPS for tracking without frame drops.



---

## Technical Integration: The "Profile.json"

All Phase 0 data is compiled into a local, encrypted **Biometric Profile**.

$$I_{athlete} = \sum_{i=1}^{n} m_i r_i^2$$

This formula is no longer a generic calculation; $m_i$ (segment mass) and $r_i$ (segment length) are now specific to the user, allowing the app to visualize the "why" behind coaching corrections—such as exactly how much faster they will rotate if they tuck their knees by an additional 5 degrees.

### Implementation Step

1. **The "Scan" UI:** Build a 60-second onboarding flow where a parent/coach uses a laptop webcam (or transfers files to it) of the athlete standing in a T-pose and a side profile, with manual override inputs available.
2. **Local Processing:** Use a lightweight photogrammetry script (WASM-based) to extract lengths.
3. **Data Lock:** Save these parameters locally; they are never uploaded, ensuring 100% privacy for the young athletes.