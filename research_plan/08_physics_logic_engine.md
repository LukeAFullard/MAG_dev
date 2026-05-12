The physics logic of the application serves as the "engine" that converts raw visual landmarks into objective biomechanical truth. By applying fundamental laws of mechanics to the personalized **Digital Twin** established in Phase 0, the app moves from simple motion tracking to high-fidelity simulation.

---

## I. Fundamental Kinematics & Constraints

To ensure the 3D model remains realistic and accurate, the engine applies "hard" physics constraints to the AI's pose estimation.

* **Biometric Constraints**: The engine uses the specific limb lengths measured in Phase 0 as fixed variables. Since a gymnast's bones cannot physically stretch or shrink, any 2D visual "jitter" is corrected by mapping it to a rigid 3D skeleton.


* **Center of Mass (CM) Stabilization**: The model calculates the CM in real-time. In static or slow-moving positions (like a handstand), it applies a loss function that penalizes any pose where the CM deviates from the base of support.


*
**Anatomical Range Calibration**: Joint angles are constrained by the athlete's specific flexibility baseline (e.g., maximum shoulder flexion), preventing the AI from "hallucinating" impossible positions during rapid rotations.



---

## II. Apparatus-Specific Physics Logic

The application applies different mechanical formulas based on the specific requirements of the six FIG apparatus.

### 1. Floor: Impact Dynamics & Energy Dissipation

*
**Landing Stiffness**: The app monitors the knee joint angle to differentiate between elite "stiff" landings and recreational "soft" landings.


*
**Logic**: To reduce heel loading and increase stability, the knee angle should remain above $63^{\circ}$ at the point of maximum compression.




*
**Impact Force Estimation**: By combining the athlete's mass ($m$) with the vertical impact velocity ($v$), the app estimates the Ground Reaction Force (GRF).



$$F = m \cdot \frac{\Delta v}{\Delta t}$$



### 2. Pommel Horse: Circular Kinematics

*
**Amplitude (HTDh)**: Mastery is measured by the horizontal distance between the head and toes.


* **Centripetal Coordination**: The app tracks the diameter of horizontal ankle rotation. A decreasing "shoulder diameter" or "ankle diameter" indicates fatigue and a loss of dynamic balance.



### 3. Vault: Projectile Motion & Power

*
**Impulse-Momentum**: The app calculates the power generated during the board and table contact phases.


*
**Benchmark**: Table contact time is tracked against an elite target of $\approx 0.26\text{s}$.




*
**Flight Parabola**: Once the gymnast leaves the table, the app maps the CM trajectory to predict the landing success based on vertical height and angular velocity ($\omega$).



### 4. Rings: Static Equilibrium & Symmetry

*
**Vector Analysis**: For isometric holds like the Iron Cross, the app calculates the symmetry of shoulder abduction.


*
**Deduction Logic**: Even a $1^{\circ}$ deviation from a $90^{\circ}$ horizontal arm position or a slight shift in CM height triggers an automated FIG deduction.



### 5. High Bar & P-Bars: Rotational Mechanics

*
**Conservation of Angular Momentum**: During release moves, the app visualizes the relationship between body shape and rotation speed.


*
**Moment of Inertia ($I$)**: Calculated using the athlete's personalized mass distribution.



$$I = \sum m_i r_i^2$$


*
**Optimization**: The app explains the "why" behind coaching—showing that a tighter tuck (smaller $r$) reduces the moment of inertia, thereby increasing angular velocity ($\omega$) for faster rotations.



---

## III. Forensic Accuracy & Defensibility

Consistent with your interest in **forensic auditing (Vouch)** and **edge-native privacy (Percolo)**, the physics logic is designed to be:

* **Deterministic**: The same input video and biometric profile will always yield the same physics results.
* **Cryptographically Signed**: Each analysis "log" is signed locally, ensuring the biomechanical data used for coaching or judging is authentic and hasn't been tampered with.

This framework ensures that when the app tells a gymnast to "tuck tighter" or "land stiffer," it is providing advice rooted in the immutable laws of physics tailored specifically to their body.