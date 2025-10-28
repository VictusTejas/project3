document.addEventListener("DOMContentLoaded", () => {
    const generateButton = document.getElementById("generateWorkoutPlan");
    const downloadButton = document.getElementById("downloadPlan");
    const backButton = document.getElementById("backButton");
    const formSection = document.querySelector(".form-section");
    const outputSection = document.querySelector(".output-section");
    const workoutPlanOutput = document.getElementById("workoutPlanOutput");

    // ✅ Ensure jsPDF is loaded properly
    let jsPDF;
    if (window.jspdf) {
        jsPDF = window.jspdf.jsPDF;
    } else {
        console.error("❌ jsPDF library is not loaded. Ensure you have included the script in your HTML.");
    }

    generateButton.addEventListener("click", async () => {
        // ✅ Get user input
        const fitnessLevel = document.getElementById("fitnessLevel").value.trim();
        const goal = document.getElementById("goal").value.trim();
        const trainingDays = document.getElementById("trainingDays").value.trim();
        const equipment = document.getElementById("equipment").value.trim() || "None"; // Default to "None" if empty
        const preferredExercises = document.getElementById("preferredExercises").value.trim() || "None"; // Default to "None" if empty

        // ✅ Validate input
        if (!fitnessLevel || !goal || !trainingDays) {
            alert("⚠️ Please fill in all required fields before generating the workout plan.");
            return;
        }

        // Hide form and show loading message
        formSection.style.display = "none";
        outputSection.style.display = "block";
        workoutPlanOutput.innerHTML = "<p>⏳ Generating your workout plan, please wait...</p>";
        downloadButton.style.display = "none";

        // ✅ Prepare API request body
        const requestBody = { fitnessLevel, goal, trainingDays, equipment, preferredExercises };

        try {
            // ✅ Send request to backend API
            const response = await fetch("http://localhost:3000/api/generate-workout-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${errorData.error || "Unknown error"}`);
            }

            const data = await response.json();
            const workoutPlan = data.workoutPlan || "⚠️ Error: Could not generate a workout plan.";

            // ✅ Display workout plan
            workoutPlanOutput.innerHTML = `<pre class="formatted-text">${workoutPlan}</pre>`;
            downloadButton.style.display = "block";
            downloadButton.dataset.workoutPlan = workoutPlan;
        } catch (error) {
            console.error("❌ Error fetching workout plan:", error);
            workoutPlanOutput.innerHTML = `<p style="color: red;">⚠️ ${error.message}</p>`;
        }
    });

    // ✅ Download PDF Functionality
    downloadButton.addEventListener("click", () => {
        const workoutPlanText = downloadButton.dataset.workoutPlan;
        if (!workoutPlanText) {
            alert("⚠️ No workout plan available for download.");
            return;
        }

        if (!jsPDF) {
            alert("⚠️ jsPDF is not loaded. Cannot generate PDF.");
            return;
        }

        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Personalized Workout Plan", 20, 20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);

        const marginLeft = 20;
        const marginTop = 30;
        const pageWidth = doc.internal.pageSize.getWidth() - 40;
        const splitText = doc.splitTextToSize(workoutPlanText, pageWidth);

        doc.text(splitText, marginLeft, marginTop);
        doc.save("Workout_Plan.pdf");
    });

    // ✅ Back Button Functionality
    backButton.addEventListener("click", () => {
        formSection.style.display = "block";
        outputSection.style.display = "none";
        workoutPlanOutput.innerHTML = "";
        downloadButton.style.display = "none";
    });
});
