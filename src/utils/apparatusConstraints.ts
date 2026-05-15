import { type PoseData } from './poseExtraction';

export class ApparatusConstraints {
  public applyConstraints(poses: PoseData[], category?: string, facingCamera?: boolean): PoseData[] {
    if (!poses || poses.length === 0 || !category) return poses;

    // Create a deep copy to avoid mutating original
    const constrainedPoses = poses.map(pose => ({
      ...pose,
      keypoints: pose.keypoints.map(kp => ({ ...kp }))
    }));

    switch (category.toLowerCase()) {
      case 'floor':
        this.applyFloorConstraints(constrainedPoses);
        break;
      case 'pommel horse':
      case 'pommel':
        this.applyPommelHorseConstraints(constrainedPoses);
        break;
      case 'vault':
        this.applyVaultConstraints(constrainedPoses);
        break;
      case 'high bar':
      case 'p-bars':
      case 'parallel bars':
        this.applyBarConstraints(constrainedPoses);
        break;
      case 'rings':
        this.applyRingsConstraints(constrainedPoses, facingCamera);
        break;
      default:
        // Default constraints or no constraints
        break;
    }

    return constrainedPoses;
  }

  private applyFloorConstraints(poses: PoseData[]) {
    // Calculate a reasonable floor line based on lower percentiles of ankle height
    // to avoid outliers dragging the floor down
    const ankleHeights: number[] = [];
    poses.forEach(pose => {
        const lAnkle = pose.keypoints[15];
        const rAnkle = pose.keypoints[16];
        if (lAnkle && lAnkle.score > 0.5) ankleHeights.push(lAnkle.y);
        if (rAnkle && rAnkle.score > 0.5) ankleHeights.push(rAnkle.y);
    });

    if (ankleHeights.length > 0) {
        ankleHeights.sort((a, b) => b - a); // Sort descending (lower on screen)
        // Take the 90th percentile as the "hard floor"
        const floorY = ankleHeights[Math.floor(ankleHeights.length * 0.1)];

        poses.forEach(pose => {
          const lAnkle = pose.keypoints[15];
          const rAnkle = pose.keypoints[16];
          // Gentle snap back if feet go drastically below floor
          if (lAnkle && lAnkle.y > floorY + 20) lAnkle.y = floorY + 20;
          if (rAnkle && rAnkle.y > floorY + 20) rAnkle.y = floorY + 20;
        });
    }
  }

  private applyPommelHorseConstraints(poses: PoseData[]) {
    // Instead of a static average, smooth hand movement relative to center of mass
    // to handle camera panning and dismounts better.
    poses.forEach((pose, index) => {
        const lWrist = pose.keypoints[9];
        const rWrist = pose.keypoints[10];

        if (lWrist && rWrist && lWrist.score > 0.5 && rWrist.score > 0.5) {
            // When hands are close together, they are likely anchored on the horse.
            // If they jump wildly between frames while COM is steady, smooth them.
            if (index > 0 && pose.com && poses[index-1].com) {
                const prevPose = poses[index-1];
                const prevLWrist = prevPose.keypoints[9];
                const prevRWrist = prevPose.keypoints[10];

                if (prevLWrist && prevRWrist && prevLWrist.score > 0.5 && prevRWrist.score > 0.5) {
                    // Check if hand moved significantly relative to COM change
                    const comDiffY = pose.com.y - poses[index-1].com!.y;
                    const lWristDiffY = lWrist.y - prevLWrist.y;

                    if (Math.abs(lWristDiffY - comDiffY) > 30) {
                        lWrist.y = prevLWrist.y + comDiffY;
                    }

                    const rWristDiffY = rWrist.y - prevRWrist.y;
                    if (Math.abs(rWristDiffY - comDiffY) > 30) {
                        rWrist.y = prevRWrist.y + comDiffY;
                    }
                }
            }
        }
    });
  }

  private applyVaultConstraints(_poses: PoseData[]) {
    // Logic: Vault involves distinct phases.
    // Just enforce that COM does not teleport erratically.
    // Real vault logic would track board contact.
    // For now, no strict geometric constraints like other apparatuses.
  }

  private applyBarConstraints(poses: PoseData[]) {
    // Use the same COM-relative smoothing logic for bars to handle camera panning
    poses.forEach((pose, index) => {
        const lWrist = pose.keypoints[9];
        const rWrist = pose.keypoints[10];

        if (lWrist && rWrist && lWrist.score > 0.5 && rWrist.score > 0.5) {
            if (index > 0 && pose.com && poses[index-1].com) {
                const prevPose = poses[index-1];
                const prevLWrist = prevPose.keypoints[9];
                const prevRWrist = prevPose.keypoints[10];

                if (prevLWrist && prevRWrist && prevLWrist.score > 0.5 && prevRWrist.score > 0.5) {
                    const comDiffY = pose.com.y - poses[index-1].com!.y;
                    const lWristDiffY = lWrist.y - prevLWrist.y;

                    if (Math.abs(lWristDiffY - comDiffY) > 30) {
                        lWrist.y = prevLWrist.y + comDiffY;
                    }

                    const rWristDiffY = rWrist.y - prevRWrist.y;
                    if (Math.abs(rWristDiffY - comDiffY) > 30) {
                        rWrist.y = prevRWrist.y + comDiffY;
                    }
                }
            }
        }
    });
  }

  private applyRingsConstraints(poses: PoseData[], facingCamera: boolean = false) {
    // Enforce symmetry on the X axis relative to COM during holds
    poses.forEach(pose => {
        const lWrist = pose.keypoints[9];
        const rWrist = pose.keypoints[10];
        if (lWrist && rWrist && lWrist.score > 0.5 && rWrist.score > 0.5 && Math.abs(lWrist.y - rWrist.y) < 30) {
             if (pose.com) {
                const comX = pose.com.x;

                // If the user specifies the orientation, we can enforce it strictly to correct pose estimator swapping errors.
                // If facing the camera, the athlete's right arm (keypoint 10) is on the viewer's left (lower x).
                // If facing away, the athlete's left arm (keypoint 9) is on the viewer's left (lower x).
                const isLeftWristOnLeftSide = facingCamera ? false : true;

                const lDist = Math.abs(comX - lWrist.x);
                const rDist = Math.abs(rWrist.x - comX);
                const avgDist = (lDist + rDist) / 2;

                // Nudge wrists towards the average distance from COM, enforcing the orientation
                if (isLeftWristOnLeftSide) {
                   lWrist.x = lWrist.x * 0.8 + (comX - avgDist) * 0.2;
                   rWrist.x = rWrist.x * 0.8 + (comX + avgDist) * 0.2;
                } else {
                   lWrist.x = lWrist.x * 0.8 + (comX + avgDist) * 0.2;
                   rWrist.x = rWrist.x * 0.8 + (comX - avgDist) * 0.2;
                }
             }
        }
    });
  }
}
