document.addEventListener("DOMContentLoaded", async () => {
    const video = document.getElementById("webcam");
    const countDisplay = document.getElementById("repCount");
    const resetButton = document.getElementById("resetButton");
    const backButton = document.getElementById("backButton");

    let net;
    let count = 0;
    let isDownPosition = false; 
    let minConfidence = 0.5; // Ensures only confident keypoints are used

    async function loadMoveNet() {
        net = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
    }

    async function detectPose() {
        if (!net) return;
        const poses = await net.estimatePoses(video);
        if (poses.length > 0) {
            processPose(poses[0]);
        }
        requestAnimationFrame(detectPose);
    }

    function processPose(pose) {
        if (!pose.keypoints) return;

        const keypoints = getKeyPoints(pose);
        if (!keypoints) return;

        const { leftShoulder, rightShoulder, leftHip, rightHip, leftKnee, rightKnee } = keypoints;

        if (detectPushUp(leftShoulder, rightShoulder)) {
            count++;
            updateCount();
        } else if (detectSquat(leftHip, rightHip, leftKnee, rightKnee)) {
            count++;
            updateCount();
        }
    }

    function getKeyPoints(pose) {
        let keypoints = {};
        for (let point of pose.keypoints) {
            if (point.score >= minConfidence) {
                keypoints[point.name] = point;
            }
        }

        const requiredPoints = ["left_shoulder", "right_shoulder", "left_hip", "right_hip", "left_knee", "right_knee"];
        for (let point of requiredPoints) {
            if (!keypoints[point]) return null;
        }
        return keypoints;
    }

    function detectPushUp(leftShoulder, rightShoulder) {
        const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

        if (!isDownPosition && avgShoulderY > 400) {
            isDownPosition = true;
        } else if (isDownPosition && avgShoulderY < 300) {
            isDownPosition = false;
            return true;
        }
        return false;
    }

    function detectSquat(leftHip, rightHip, leftKnee, rightKnee) {
        const avgHipY = (leftHip.y + rightHip.y) / 2;
        const avgKneeY = (leftKnee.y + rightKnee.y) / 2;

        if (!isDownPosition && avgHipY > avgKneeY + 60) {
            isDownPosition = true;
        } else if (isDownPosition && avgHipY < avgKneeY - 50) {
            isDownPosition = false;
            return true;
        }
        return false;
    }

    function updateCount() {
        countDisplay.innerText = count;
    }

    resetButton.addEventListener("click", () => {
        count = 0;
        countDisplay.innerText = "0";
    });

    backButton.addEventListener("click", () => {
        window.location.href = "dashboard.html";
    });

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            loadMoveNet().then(detectPose);
        })
        .catch(err => console.error("Camera access denied!", err));
});
