The "physics logic" of the application is no longer about true simulation or medical-grade biomechanics. Instead, it serves as a **constraint engine** that converts raw, noisy visual landmarks into stable, reliable tracking data by applying the basic rules of geometry, anatomy, and the environment.

---

## I. Human Biomechanical Constraints

To ensure the pose model remains realistic and accurate, the engine applies "hard" anatomical constraints to the AI's 2D and relative-depth estimations.

* **Skeletal Proportions**: While exact limb lengths aren't required, the engine enforces stable skeletal proportions over time. A gymnast's femur cannot stretch or shrink from frame to frame. Any visual "jitter" that violates this rule is corrected.
* **Realistic Motion Continuity**: Humans move continuously; joints do not teleport. The engine uses optimization to enforce velocity and acceleration limits on joints, smoothing the data.
* **Anatomical Range Limits**: Joint angles are constrained by standard human flexibility limits. This prevents the AI from "hallucinating" impossible positions (like a knee bending backwards) during rapid rotations or heavy motion blur.

---

## II. Apparatus-Specific Constraints & Logic

The application leverages the known, fixed geometry of the six FIG apparatuses to drastically improve tracking stability. By knowing *where* the gymnast is, the AI can make much smarter assumptions.

### 1. Floor: Landing Plane Estimation

* **The Ground Plane**: The engine uses camera calibration or manual user input to estimate the floor plane.
* **Logic**: The system knows feet cannot pass through the floor. This provides a hard constraint for tracking the lowest point of a movement.
* **Metrics**: This enables highly accurate estimations of landing stability, lateral drift, and the minimum knee angle at impact (knee collapse tendency).

### 2. Pommel Horse: Fixed Anchor Points

* **The Apparatus**: The horse is a fixed object of known height and dimensions.
* **Logic**: By identifying the pommels or the horse body, the engine can stabilize the tracking of the gymnast's hands (which are anchored to the horse) and better estimate the relative distance of the feet from the center of rotation.

### 3. Vault: Board and Table Geometry

* **The Environment**: The springboard and vault table have fixed, standard dimensions.
* **Logic**: Detecting the moment of contact with the board and table allows the system to accurately define the distinct phases of the vault (run, board contact, pre-flight, block, post-flight, landing).

### 4. High Bar & P-Bars: Fixed Horizontal Axes

* **The Apparatus**: These apparatuses consist of rigid horizontal lines in space.
* **Logic**: During a giant swing or a release move, the gymnast's center of rotation is tied to the bar. The engine can use this fixed axis to correct depth ambiguity—if the 2D model thinks a hand is floating away from the bar during a swing, the constraint engine snaps it back.

### 5. Rings: Vertical Hanging Plumb Lines

* **The Environment**: The rings hang vertically from fixed straps.
* **Logic**: Tracking the angle of the straps provides a highly reliable indicator of off-center movement and symmetry, helping to evaluate isometric holds like the Iron Cross.

---

## III. Temporal Smoothing & Consistency

The ultimate goal of the constraint engine is **consistency**.

* **Kalman Filtering**: Applying filters to smooth the trajectory of keypoints over time, predicting where a joint *should* be based on its previous velocity if it becomes briefly occluded.
* **Predictable Outputs**: The goal is that if a coach runs the same video through the app three times, the constraint engine ensures they get the exact same smooth trajectory trace every time, building trust in the tool.
