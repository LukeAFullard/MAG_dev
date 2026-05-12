To expand on **Phase 2**, we move from the raw biomechanical data of Phase 1 to competitive intelligence. This stage focuses on integrating the **FIG (International Gymnastics Federation) Code of Points** and automating the role of a technical judge.

---

## Phase 2: FIG Intelligence & The Virtual Judge (Months 7–12)

The goal is to provide an "instant feedback loop" that tells the athlete not just *how* they moved, but how they would have been *scored*.

### 1. Automated Skill Recognition (ASR)

While Phase 1 tracks joint angles, Phase 2 identifies the **identity** of the movement.

*
**Implementation with Transformers.js**: Utilize temporal sequence models (Action Recognition Transformers) to analyze the trajectory of the 3D landmarks over time.


*
**Gymnastics Grammar**: Develop a logic layer that understands the sequence of a routine—identifying specific skills like a "Kasamatsu" on vault or a "Liukin" on high bar.


*
**Element Mapping**: Each recognized skill is mapped to its specific FIG difficulty value (e.g., A-value, D-value).



### 2. The Virtual Judge: D-Score and E-Score

This feature automates the two components of gymnastics scoring.

*
**D-Score (Difficulty)**: The app automatically sums the difficulty values of recognized elements to calculate the start value of a routine as it is performed.


*
**E-Score (Execution)**: The AI identifies objective technical errors that trigger deductions:


*
**Bent Knees**: Automatically flags deviations from a straight line (0.1 deduction).


*
**Un-pointed Toes**: Monitors foot landmarks to ensure compliance with FIG aesthetics.


*
**Verticality**: Measures the exact angle of handstands on High Bar or P-Bars, flagging deductions for being under the vertical (180°).





### 3. Proactive Injury Mitigation & Symmetry

Using the personalized skeleton from Phase 0, the app functions as a "digital physical therapist".

*
**Symmetry Tracking**: The app monitors for "favoritism" of one limb or shoulder during holds like the Iron Cross on Still Rings.


*
**Symmetry Alerts**: Even slight deviations in ring height or arm angle (e.g., asymmetrical shoulder abduction) can trigger alerts for underlying strength imbalances that could lead to chronic injuries like labral tears.


*
**Impact Estimation**: By combining the athlete's calibrated mass with impact velocity, the app estimates ground reaction force (often 7.1–15.8× body weight) to warn of excessive landing stiffness.



---

## Technical Feasibility: The "Gymnastics Grammar" Challenge

Integrating the FIG Code of Points is ranked as **Medium Feasibility** because it requires extensive data labeling to teach the AI the nuances of every skill.

| Feature | Tech Used | Local-First Role |
| --- | --- | --- |
| **Skill ID** | **Transformers.js** | Sequence classification happens on-device; no video leaves the phone.

 |
| **Deduction Engine** | **Physics Engine** | Calculates angles in real-time to provide immediate "E-Score" feedback.

 |
| **FIG Database** | **SQLite** | A local, searchable version of the Code of Points for instant difficulty lookups.

 |

### Summary of Missing Features Added in Phase 2:

*
**Digital Physical Therapist**: Monitoring symmetry to prevent injury.


*
**Dynamic D-Score Tracker**: Real-time summation of routine difficulty.


*
**Anatomical Deduction Layer**: Automated flagging of un-pointed toes and bent knees.