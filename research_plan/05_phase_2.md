To expand on **Phase 2**, we move from the raw biomechanical data of Phase 1 to competitive intelligence. This stage focuses on integrating the **FIG (International Gymnastics Federation) Code of Points** and automating the role of a technical judge.

---

## Phase 2: Execution Deductions & Load Optimization

Phase 2 moves beyond raw biomechanical data by introducing automated execution deductions (E-Score) based on the FIG Code of Points and detailed training load insights. **Note: Automated Skill Recognition (ASR) and D-Score calculation are considered long-term research and have been moved to the Vision Appendix.**

### 1. The Virtual Judge: E-Score Deductions

This feature automates the objective execution component of gymnastics scoring.

*
**E-Score (Execution)**: The AI identifies objective technical errors that trigger deductions:


*
**Bent Knees**: Automatically flags deviations from a straight line (0.1 deduction).


*
**Un-pointed Toes**: Monitors foot landmarks to ensure compliance with FIG aesthetics.


*
**Verticality**: Measures the exact angle of handstands on High Bar or P-Bars, flagging deductions for being under the vertical (180°).


### 2. Training Load & Technique Optimization

Using the personalized skeleton from Phase 0, the app provides data to help coaches manage technique to optimize physical load, being careful to **avoid medical-adjacent claims**.

*
**Symmetry Tracking**: The app monitors for "favoritism" of one limb or shoulder during holds like the Iron Cross on Still Rings.


*
**Symmetry Insights**: Deviations in ring height or arm angle (e.g., asymmetrical shoulder abduction) provide insights for the coach to assess technique and strength imbalances.


*
**Impact Estimation**: By combining the athlete's calibrated mass with impact velocity, the app estimates ground reaction force (often 7.1–15.8× body weight) to inform the coach about landing stiffness, allowing them to adjust training load.



---

## Technical Feasibility: Execution Validation

Integrating objective FIG Code of Points deductions is highly feasible because it relies on the same angle tracking used in Phase 1 MVP, but applied to new rulesets.

| Feature | Tech Used | Local-First Role |
| --- | --- | --- |
| **Deduction Engine** | **Physics Engine** | Calculates angles in real-time to provide immediate "E-Score" feedback. |

### Summary of Features in Phase 2:

*
**Training Load Guardian**: Providing insights on landing impacts and symmetry for coaches to manage load.


*
**Anatomical Deduction Layer**: Automated flagging of un-pointed toes and bent knees.