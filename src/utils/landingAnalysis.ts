import { type PoseData } from './poseExtraction';

export interface LandingMetrics {
  impactTime?: number;
  timeToStabilization?: number;
  stepCount?: number;
  minKneeAngle?: number;
  torsoLeanAngle?: number; // relative to vertical in degrees
  lateralDrift?: number; // absolute horizontal movement of COM after impact
}

export class LandingAnalyzer {
  public analyze(poses: PoseData[]): LandingMetrics {
    if (!poses || poses.length === 0) return {};

    let impactIndex = -1;
    // Simple heuristic for impact:
    // 1. Look for the lowest average ankle y-coordinate (max y value, since y goes down)
    // Actually, feet stay on ground, so ankle y reaches a max and stays there.
    // A better way: find the time when downward velocity of ankles approaches 0 after a period of downward movement.

    // For now, let's just find the frame where ankle Y is maximum, as it's a proxy for touching the floor.
    // Wait, the floor is at a constant Y, so ankle Y might be max for the whole landing. The FIRST time it reaches near max is impact.
    let maxAnkleY = -Infinity;
    for (const pose of poses) {
      const { keypoints } = pose;
      if (!keypoints) continue;
      const lAnkle = keypoints[15];
      const rAnkle = keypoints[16];
      if (lAnkle && rAnkle && lAnkle.score > 0.3 && rAnkle.score > 0.3) {
        const avgY = (lAnkle.y + rAnkle.y) / 2;
        if (avgY > maxAnkleY) maxAnkleY = avgY;
      }
    }

    // Impact is the first time ankle Y is within 5% of maxAnkleY
    for (let i = 0; i < poses.length; i++) {
      const pose = poses[i];
      const { keypoints } = pose;
      if (!keypoints) continue;
      const lAnkle = keypoints[15];
      const rAnkle = keypoints[16];
      if (lAnkle && rAnkle && lAnkle.score > 0.3 && rAnkle.score > 0.3) {
        const avgY = (lAnkle.y + rAnkle.y) / 2;
        if (maxAnkleY - avgY < 20) { // within 20 pixels of max y
          impactIndex = i;
          break;
        }
      }
    }

    if (impactIndex === -1) {
        // Fallback: use the middle of the clip
        impactIndex = Math.floor(poses.length / 2);
    }

    const impactPose = poses[impactIndex];
    let torsoLeanAngle = 0;
    let minKneeAngle = 180;
    let stepCount = 0;
    let timeToStabilization = 0;
    let lateralDrift = 0;

    // Calculate torso lean at impact
    const kp = impactPose.keypoints;
    if (kp) {
      const lShoulder = kp[5], rShoulder = kp[6];
      const lHip = kp[11], rHip = kp[12];
      if (lShoulder?.score > 0.3 && rShoulder?.score > 0.3 && lHip?.score > 0.3 && rHip?.score > 0.3) {
        const sX = (lShoulder.x + rShoulder.x) / 2;
        const sY = (lShoulder.y + rShoulder.y) / 2;
        const hX = (lHip.x + rHip.x) / 2;
        const hY = (lHip.y + rHip.y) / 2;

        // Vector from hip to shoulder
        const dx = sX - hX;
        const dy = sY - hY;
        // Vertical vector is (0, -1) since y goes down
        const mag = Math.sqrt(dx*dx + dy*dy);
        if (mag > 0) {
          const dot = -dy; // dx*0 + dy*(-1)
          torsoLeanAngle = Math.acos(dot / mag) * (180 / Math.PI);
        }
      }
    }

    // Post-impact analysis
    let impactCom = impactPose.com;
    let maxDrift = 0;
    let lastAnkleX = 0;
    let ankleStabilized = false;
    let stabilizationIndex = impactIndex;

    // Initialize lastAnkleX
    if (kp && kp[15]?.score > 0.3 && kp[16]?.score > 0.3) {
        lastAnkleX = (kp[15].x + kp[16].x) / 2;
    }

    for (let i = impactIndex; i < poses.length; i++) {
      const pose = poses[i];
      const pKp = pose.keypoints;
      if (!pKp) continue;

      // Min knee angle
      for (const side of [[11, 13, 15], [12, 14, 16]]) { // [hip, knee, ankle]
        const hip = pKp[side[0]];
        const knee = pKp[side[1]];
        const ankle = pKp[side[2]];
        if (hip?.score > 0.3 && knee?.score > 0.3 && ankle?.score > 0.3) {
          const v1x = hip.x - knee.x;
          const v1y = hip.y - knee.y;
          const v2x = ankle.x - knee.x;
          const v2y = ankle.y - knee.y;
          const mag1 = Math.sqrt(v1x*v1x + v1y*v1y);
          const mag2 = Math.sqrt(v2x*v2x + v2y*v2y);
          if (mag1 > 0 && mag2 > 0) {
            const dot = v1x*v2x + v1y*v2y;
            const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI);
            if (angle < minKneeAngle) minKneeAngle = angle;
          }
        }
      }

      // Step count & stabilization
      if (pKp[15]?.score > 0.3 && pKp[16]?.score > 0.3) {
        const currAnkleX = (pKp[15].x + pKp[16].x) / 2;
        if (Math.abs(currAnkleX - lastAnkleX) > 15) { // 15 pixel threshold for a step
           stepCount++;
           lastAnkleX = currAnkleX;
           stabilizationIndex = i; // Reset stabilization time
        }
      }

      // Lateral drift
      if (impactCom && pose.com) {
          const drift = Math.abs(pose.com.x - impactCom.x);
          if (drift > maxDrift) {
              maxDrift = drift;
              stabilizationIndex = Math.max(stabilizationIndex, i);
          }
      }
    }

    lateralDrift = maxDrift;

    // Time to stabilization
    if (stabilizationIndex > impactIndex) {
        timeToStabilization = poses[stabilizationIndex].time - poses[impactIndex].time;
    } else {
        timeToStabilization = 0;
    }

    return {
      impactTime: impactPose.time,
      timeToStabilization: Number(timeToStabilization.toFixed(2)),
      stepCount,
      minKneeAngle: Number(minKneeAngle.toFixed(1)),
      torsoLeanAngle: Number(torsoLeanAngle.toFixed(1)),
      lateralDrift: Number(lateralDrift.toFixed(1))
    };
  }
}
