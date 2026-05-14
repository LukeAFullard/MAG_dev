import { type PoseData } from './poseExtraction';

export class TemporalSmoother {
  // Alpha determines how much weight to give to the new measurement vs the prediction
  // Beta determines how much to adjust the velocity based on the error
  private defaultAlpha = 0.5;
  private defaultBeta = 0.05;

  public smoothPoses(poses: PoseData[]): PoseData[] {
    if (!poses || poses.length === 0) return poses;

    // Sort poses by time just in case
    const sortedPoses = [...poses].sort((a, b) => a.time - b.time);

    // We need to keep state for each keypoint (x, y) and COM (x, y)
    // Dynamic sizing based on actual keypoints length
    const state = {
      keypoints: [] as Array<{
        x: { position: number; velocity: number; initialized: boolean };
        y: { position: number; velocity: number; initialized: boolean };
      }>,
      com: {
        x: { position: 0, velocity: 0, initialized: false },
        y: { position: 0, velocity: 0, initialized: false },
      }
    };

    const smoothedPoses: PoseData[] = [];
    let prevTime = sortedPoses[0].time;

    for (const pose of sortedPoses) {
      // dt could be 0 for the first frame
      const dt = Math.max(0.001, pose.time - prevTime); // avoid division by zero

      const smoothedPose: PoseData = {
        time: pose.time,
        keypoints: pose.keypoints ? [...pose.keypoints] : [],
      };

      if (pose.com) {
        smoothedPose.com = { x: pose.com.x, y: pose.com.y };
      }

      const updateState = (
        st: { position: number, velocity: number, initialized: boolean },
        measurement: number,
        dt: number,
        confidence: number
      ) => {
        if (!st.initialized) {
          st.position = measurement;
          st.velocity = 0;
          st.initialized = true;
          return measurement;
        }

        // Adjust alpha based on confidence (low confidence = trust prediction more)
        const alpha = this.defaultAlpha * confidence;
        const beta = this.defaultBeta * confidence;

        // Predict
        const posPred = st.position + st.velocity * dt;
        const velPred = st.velocity;

        // Update
        const residual = measurement - posPred;
        st.position = posPred + alpha * residual;

        st.velocity = velPred + (beta / dt) * residual;

        return st.position;
      };

      // Process keypoints
      if (pose.keypoints) {
          for (let i = 0; i < pose.keypoints.length; i++) {
              const kp = pose.keypoints[i];
              // Ensure state array is large enough
              if (!state.keypoints[i]) {
                  state.keypoints[i] = {
                      x: { position: 0, velocity: 0, initialized: false },
                      y: { position: 0, velocity: 0, initialized: false },
                  };
              }

              const confidence = kp.score !== undefined ? kp.score : 1.0;

              smoothedPose.keypoints[i] = {
                  ...kp,
                  x: updateState(state.keypoints[i].x, kp.x, pose.time === prevTime ? 0.1 : dt, confidence),
                  y: updateState(state.keypoints[i].y, kp.y, pose.time === prevTime ? 0.1 : dt, confidence),
              };
          }
      }

      // Process COM
      if (pose.com) {
          smoothedPose.com = {
              x: updateState(state.com.x, pose.com.x, pose.time === prevTime ? 0.1 : dt, 1.0),
              y: updateState(state.com.y, pose.com.y, pose.time === prevTime ? 0.1 : dt, 1.0),
          };
      }

      smoothedPoses.push(smoothedPose);
      prevTime = pose.time;
    }

    return smoothedPoses;
  }
}
