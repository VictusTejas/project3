document.addEventListener("DOMContentLoaded", async () => {
    const videoElement = document.getElementById("video");
    const canvasElement = document.getElementById("canvas");
    const ctx = canvasElement.getContext("2d");
    const feedbackElement = document.getElementById("feedback");
    const analyzeButton = document.getElementById("analyze-button");

    let detector = null;
    let isDetecting = false;
    let isSitting = false;
    let isSpeaking = false; // Flag to check if voice feedback is active
    let lastFeedback = ""; // Store last feedback to prevent repeated speech

    // 📌 Setup Camera
    async function setupCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoElement.srcObject = stream;
            return new Promise(resolve => (videoElement.onloadedmetadata = resolve));
        } catch (error) {
            feedbackElement.textContent = "⚠️ Error accessing webcam. Please allow camera permissions.";
            console.error("Webcam error:", error);
        }
    }

    // 📌 Load MoveNet Model
    async function loadMoveNet() {
        try {
            detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet);
        } catch (error) {
            feedbackElement.textContent = "⚠️ Failed to load MoveNet model.";
            console.error("MoveNet Load Error:", error);
        }
    }

    // 📌 Function to Speak Feedback
    function speakFeedback(text) {
        return new Promise((resolve) => {
            if ('speechSynthesis' in window) {
                if (text === lastFeedback) {
                    return resolve(); // Avoid repeating the same message
                }

                isSpeaking = true; // Pause detection
                lastFeedback = text; // Store last spoken feedback

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.onend = () => {
                    isSpeaking = false; // Resume detection after speech ends
                    resolve();
                };

                speechSynthesis.speak(utterance);
            } else {
                console.warn("⚠️ Speech synthesis not supported in this browser.");
                resolve();
            }
        });
    }

    // 📌 Posture Analysis Based on Sitting or Standing
    async function analyzePosture(keypoints) {
        let feedbackText = "✅ Good posture! Keep it up!";
        let issues = [];

        const nose = keypoints[0];
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        const leftKnee = keypoints[13];
        const rightKnee = keypoints[14];

        // **📌 Detect Sitting Posture**
        if (leftKnee.score < 0.5 && rightKnee.score < 0.5) {
            isSitting = true;
        } else {
            isSitting = false;
        }

        // **📌 Upper Body Posture Check (Sitting)**
        if (isSitting) {
            if (nose.y > leftShoulder.y || nose.y > rightShoulder.y) {
                issues.push("⚠️ Your head is leaning forward! Keep it straight.");
            }
            if (Math.abs(leftShoulder.y - rightShoulder.y) > 20) {
                issues.push("⚠️ Your shoulders are uneven! Adjust your posture.");
            }
            if (Math.abs(leftHip.y - rightHip.y) > 20) {
                issues.push("⚠️ Your hips are misaligned! Sit evenly.");
            }
        } 
        // **📌 Full Body Posture Check (Standing)**
        else {
            if ((leftShoulder.y > leftHip.y) || (rightShoulder.y > rightHip.y)) {
                issues.push("⚠️ Keep your back straight! Avoid slouching.");
            }
            if ((leftHip.y > leftKnee.y) || (rightHip.y > rightKnee.y)) {
                issues.push("⚠️ Your legs are not properly aligned! Adjust your stance.");
            }
        }

        // **📌 Display Feedback**
        if (issues.length > 0) {
            feedbackText = issues.join("\n");
        }
        feedbackElement.textContent = feedbackText;

        // **📌 Speak Feedback & Pause Detection While Speaking**
        await speakFeedback(feedbackText);
    }

    // 📌 MoveNet Posture Detection Loop
    async function detectPosture() {
        if (!isDetecting || !detector || isSpeaking) return; // Pause if speaking

        try {
            const poses = await detector.estimatePoses(videoElement);
            ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

            if (poses.length > 0) {
                const keypoints = poses[0].keypoints;

                keypoints.forEach(point => {
                    if (point.score > 0.5) {
                        ctx.beginPath();
                        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
                        ctx.fillStyle = "red";
                        ctx.fill();
                    }
                });

                await analyzePosture(keypoints);
            }
        } catch (error) {
            console.error("❌ Error during posture detection:", error);
            feedbackElement.textContent = "⚠️ Posture detection error. Try again.";
        }

        requestAnimationFrame(detectPosture);
    }

    // 📌 Toggle Start/Stop Button
    analyzeButton.addEventListener("click", async () => {
        if (!isDetecting) {
            isDetecting = true;
            analyzeButton.textContent = "Stop Analysis";
            feedbackElement.textContent = "⏳ Analyzing posture...";
            await setupCamera();
            await loadMoveNet();
            detectPosture();
        } else {
            isDetecting = false;
            analyzeButton.textContent = "Analyze Posture";
            feedbackElement.textContent = "Click 'Analyze Posture' to restart.";

            // Stop video stream
            if (videoElement.srcObject) {
                videoElement.srcObject.getTracks().forEach(track => track.stop());
            }
        }
    });

    // 📌 Back Button
    document.getElementById("back-button").addEventListener("click", () => {
        window.location.href = "dashboard.html";
    });

    // 📌 Auto Start Camera on Load
    window.onload = async () => {
        await setupCamera();
    };
});
