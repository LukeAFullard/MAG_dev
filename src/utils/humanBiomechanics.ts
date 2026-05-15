import { type PoseData } from './poseExtraction';

export class HumanBiomechanics {
  // Keypoint indices based on COCO/RTMW
  // 5: L Shoulder, 6: R Shoulder
  // 7: L Elbow, 8: R Elbow
  // 9: L Wrist, 10: R Wrist
  // 11: L Hip, 12: R Hip
  // 13: L Knee, 14: R Knee
  // 15: L Ankle, 16: R Ankle

  // A generic limb representation
  private static readonly LIMBS = [
    { p1: 5, p2: 7, name: 'leftUpperArm' },
    { p1: 7, p2: 9, name: 'leftLowerArm' },
    { p1: 6, p2: 8, name: 'rightUpperArm' },
    { p1: 8, p2: 10, name: 'rightLowerArm' },
    { p1: 11, p2: 13, name: 'leftUpperLeg' },
    { p1: 13, p2: 15, name: 'leftLowerLeg' },
    { p1: 12, p2: 14, name: 'rightUpperLeg' },
    { p1: 14, p2: 16, name: 'rightLowerLeg' },
  ];

  public applyConstraints(poses: PoseData[]): PoseData[] {
    if (!poses || poses.length === 0) return poses;

    // Deep copy
    const constrainedPoses = poses.map(pose => ({
      ...pose,
      keypoints: pose.keypoints.map(kp => ({ ...kp })),
      com: pose.com ? { ...pose.com } : undefined
    }));

    // Step 1: Calculate reference limb lengths
    // In a pure 2D space, limb length varies with foreshortening (depth).
    // However, over a set of frames, the max visible length is a good proxy for the true 2D length
    // when the limb is parallel to the camera.
    const referenceLengths = this.calculateReferenceLengths(constrainedPoses);

    // Apply constraints per frame
    this.enforceLimbLengths(constrainedPoses, referenceLengths);
    this.enforceMotionContinuity(constrainedPoses);
    this.enforceAnatomicalRanges(constrainedPoses);

    return constrainedPoses;
  }

  private calculateReferenceLengths(poses: PoseData[]): Map<string, number> {
    const limbLengths = new Map<string, number[]>();

    for (const limb of HumanBiomechanics.LIMBS) {
      limbLengths.set(limb.name, []);
    }

    for (const pose of poses) {
      for (const limb of HumanBiomechanics.LIMBS) {
        const kp1 = pose.keypoints[limb.p1];
        const kp2 = pose.keypoints[limb.p2];

        // Only consider high-confidence keypoints for baseline length
        if (kp1 && kp2 && kp1.score > 0.6 && kp2.score > 0.6) {
          const dist = Math.hypot(kp1.x - kp2.x, kp1.y - kp2.y);
          limbLengths.get(limb.name)!.push(dist);
        }
      }
    }

    const referenceLengths = new Map<string, number>();
    for (const [name, lengths] of limbLengths.entries()) {
      if (lengths.length > 0) {
        // Sort and take a high percentile (e.g., 90th) to account for full extension
        // but ignore extreme outliers from misdetections
        lengths.sort((a, b) => a - b);
        const refLength = lengths[Math.floor(lengths.length * 0.9)];
        referenceLengths.set(name, refLength);
      }
    }

    return referenceLengths;
  }

  private enforceLimbLengths(poses: PoseData[], referenceLengths: Map<string, number>) {
    // If a limb is detected as significantly longer than its reference length,
    // it's likely a misdetection (e.g. tracking a shadow or equipment).
    // We constrain the lower-confidence point.

    for (const pose of poses) {
      for (const limb of HumanBiomechanics.LIMBS) {
        const refLength = referenceLengths.get(limb.name);
        if (!refLength) continue;

        const kp1 = pose.keypoints[limb.p1];
        const kp2 = pose.keypoints[limb.p2];

        if (kp1 && kp2) {
          const dist = Math.hypot(kp1.x - kp2.x, kp1.y - kp2.y);

          // Allow some margin (e.g., 20% over) due to 2D projection and slight inaccuracies
          const maxAllowed = refLength * 1.2;

          if (dist > maxAllowed) {
            // Determine which point has lower confidence to adjust
            const score1 = kp1.score || 0;
            const score2 = kp2.score || 0;

            const ratio = maxAllowed / dist;

            if (score1 > score2) {
              // Adjust kp2 towards kp1
              kp2.x = kp1.x + (kp2.x - kp1.x) * ratio;
              kp2.y = kp1.y + (kp2.y - kp1.y) * ratio;
            } else {
              // Adjust kp1 towards kp2
              kp1.x = kp2.x + (kp1.x - kp2.x) * ratio;
              kp1.y = kp2.y + (kp1.y - kp2.y) * ratio;
            }
          }
        }
      }
    }
  }

  private enforceMotionContinuity(poses: PoseData[]) {
    // Prevent teleportation: a joint shouldn't jump an impossible distance
    // between adjacent frames (1/10th of a second).

    if (poses.length < 2) return;

    for (let i = 1; i < poses.length; i++) {
      const prevPose = poses[i - 1];
      const currPose = poses[i];
      const dt = currPose.time - prevPose.time;
      if (dt <= 0) continue;

      // Max velocity pixel/sec. Assume athlete height is ~300 pixels on screen
      // A joint moving more than 2000 pixels/sec is teleporting.
      const MAX_VELOCITY = 2000;
      const maxDist = MAX_VELOCITY * dt;

      for (let j = 0; j < currPose.keypoints.length; j++) {
        const prevKp = prevPose.keypoints[j];
        const currKp = currPose.keypoints[j];

        if (prevKp && currKp && (prevKp.score || 0) > 0.3 && (currKp.score || 0) > 0) {
          const dist = Math.hypot(currKp.x - prevKp.x, currKp.y - prevKp.y);

          if (dist > maxDist) {
            // Teleportation detected. Cap the movement in the direction of the jump.
            const ratio = maxDist / dist;
            currKp.x = prevKp.x + (currKp.x - prevKp.x) * ratio;
            currKp.y = prevKp.y + (currKp.y - prevKp.y) * ratio;

            // Degrade confidence to signal that this point is interpolated/capped
            currKp.score = (currKp.score || 0) * 0.5;
          }
        }
      }
    }
  }

  private enforceAnatomicalRanges(_poses: PoseData[]) {
    // Basic checks for impossible angles (e.g. knee bending backwards).
    // In a full 3D engine, this uses quaternions and IK.
    // In 2D, we can use the signed angle between hips, knee, and ankle
    // to detect extreme violations when viewed roughly from the side.

    // Knee joint: hip (11/12), knee (13/14), ankle (15/16)
    // Elbow joint: shoulder (5/6), elbow (7/8), wrist (9/10)

    // for (const pose of poses) {
    //   // We will implement a simplified check:
    //   // If the knee is strictly higher than the hip and the ankle is higher than the knee,
    //   // it might be a realistic skill (e.g. tuck).
    //   // However, detecting "backward bending" in pure 2D without depth is mathematically ambiguous
    //   // (a knee pointing left vs right could just be the athlete facing the other way).
    //   // We leave this as a stub that can be expanded with relative depth hints.
    //
    //   // Stub: Enforce that knees don't fold entirely backward if we know facing direction.
    //   // Since we don't always know facing direction in this method, we skip hard angle caps for now,
    //   // relying on limb lengths and continuity to fix major glitches.
    // }
  }
}
