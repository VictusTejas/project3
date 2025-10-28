document.addEventListener("DOMContentLoaded", async () => {
    const postureButton = document.querySelector(".card-button");

    const videoElement = document.createElement("video");
    const canvasElement = document.createElement("canvas");
    const ctx = canvasElement.getContext("2d");

    const modelUrl = "http://localhost:3000/movenet_model/model.json";
    let movenetModel = null;
    let isDetecting = false;

    async function loadMoveNet() {
        if (!movenetModel) {
            console.log("Loading MoveNet model...");
            movenetModel = await tf.loadGraphModel(modelUrl);
            console.log("✅ MoveNet model loaded successfully!");
        }
    }

    async function setupCamera() {
        return new Promise((resolve, reject) => {
            navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
                .then((stream) => {
                    videoElement.srcObject = stream;
                    videoElement.onloadedmetadata = () => resolve(videoElement);
                })
                .catch((error) => reject(error));
        });
    }

    function drawKeypoints(keypoints) {
        keypoints.forEach((keypoint) => {
            if (keypoint.score > 0.5) {
                const { x, y } = keypoint;
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = "red";
                ctx.fill();
            }
        });
    }

    async function detectPosture() {
        if (!isDetecting) return;

        const tensor = tf.browser.fromPixels(videoElement)
            .resizeBilinear([192, 192])
            .expandDims(0)
            .toFloat();

        const predictions = await movenetModel.executeAsync(tensor);
        const keypoints = predictions.arraySync()[0];

        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        drawKeypoints(keypoints);

        requestAnimationFrame(detectPosture);
    }

    // ✅ Log Activity WITHOUT token
    async function logActivity(type) {
        try {
            const response = await fetch("http://localhost:3000/api/log-activity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type })
            });

            if (!response.ok) {
                throw new Error("Failed to log activity");
            }

            console.log(`✅ Activity "${type}" logged.`);
            loadRecentActivity();
        } catch (err) {
            console.error("❌ Failed to log activity:", err);
        }
    }

    postureButton.addEventListener("click", async () => {
        if (isDetecting) {
            isDetecting = false;
            postureButton.textContent = "Start Detection";
            videoElement.pause();
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            document.body.removeChild(videoElement);
            document.body.removeChild(canvasElement);
        } else {
            isDetecting = true;
            postureButton.textContent = "Stop Detection";

            await setupCamera();
            videoElement.play();
            document.body.appendChild(videoElement);
            document.body.appendChild(canvasElement);

            await loadMoveNet();
            detectPosture();

            logActivity("Posture Detection");
        }
    });

    // ✅ Load Recent Activities (latest 3)
    async function loadRecentActivity() {
        const activityList = document.getElementById("activityList");

        try {
            const response = await fetch("http://localhost:3000/api/recent-activities");
            const data = await response.json();
            activityList.innerHTML = "";

            if (data.activities && data.activities.length > 0) {
                const latestActivities = data.activities.slice(0, 3);
                latestActivities.forEach(activity => {
                    const icon = getActivityIcon(activity.type);
                    const description = getActivityDescription(activity.type);
                    const timeAgo = getTimeAgo(activity.timestamp);

                    const item = document.createElement("div");
                    item.classList.add("activity-item");

                    item.innerHTML = `
                        <div class="activity-icon"><i class="${icon}"></i></div>
                        <div class="activity-details">
                            <h4>${activity.type}</h4>
                            <p>${description}</p>
                            <span class="activity-time">${timeAgo}</span>
                        </div>
                    `;
                    activityList.appendChild(item);
                });
            } else {
                activityList.innerHTML = `<p>No recent activities yet. Try out a feature! ✅</p>`;
            }
        } catch (error) {
            console.error("❌ Error loading recent activities:", error);
            activityList.innerHTML = `<p>Could not load activities. Try again later.</p>`;
        }
    }

    function getActivityIcon(type) {
        switch (type) {
            case "Posture Detection": return "fas fa-walking";
            case "Diet Plan": return "fas fa-utensils";
            case "BMI Calculated": return "fas fa-calculator";
            case "Workout Plan": return "fas fa-dumbbell";
            default: return "fas fa-tasks";
        }
    }

    function getActivityDescription(type) {
        switch (type) {
            case "Posture Detection": return "Posture analysis completed";
            case "Diet Plan": return "Diet plan generated";
            case "BMI Calculated": return "BMI calculated successfully";
            case "Workout Plan": return "Workout plan created";
            default: return "Activity logged";
        }
    }

    function getTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const seconds = Math.floor((now - past) / 1000);

        const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
        if (seconds < 60) return "Just now";
        if (seconds < 3600) return rtf.format(-Math.floor(seconds / 60), "minutes");
        if (seconds < 86400) return rtf.format(-Math.floor(seconds / 3600), "hours");
        return rtf.format(-Math.floor(seconds / 86400), "days");
    }

    // Initial load
    loadRecentActivity();
});
