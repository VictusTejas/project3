document.addEventListener("DOMContentLoaded", () => {
    const generateButton = document.getElementById("generateDietPlan");
    const downloadButton = document.getElementById("downloadPlan");
    const backButton = document.getElementById("backButton");
    const formSection = document.querySelector(".form-section");
    const outputSection = document.querySelector(".output-section");
    const dietPlanOutput = document.getElementById("dietPlanOutput");

    let jsPDF;
    if (window.jspdf) {
        jsPDF = window.jspdf.jsPDF;
    } else {
        console.error("jsPDF library is not loaded.");
    }

    generateButton.addEventListener("click", async () => {
        const height = document.getElementById("height").value;
        const weight = document.getElementById("weight").value;
        const goal = document.getElementById("goal").value;
        const dietPreference = document.getElementById("dietPreference").value;
        const supplements = Array.from(document.getElementById("supplements").selectedOptions).map(opt => opt.value);

        if (!height || !weight || !goal || !dietPreference) {
            alert("⚠️ Please fill in all fields before generating the diet plan.");
            return;
        }

        // ✅ Hide form and show loading message
        formSection.style.display = "none";
        outputSection.style.display = "block";
        dietPlanOutput.innerHTML = "<p>⏳ Generating your diet plan, please wait...</p>";
        downloadButton.style.display = "none";

        const requestBody = {
            height,
            weight,
            dietGoal: goal,
            preference: dietPreference,
            supplements
        };

        try {
            // ✅ Send request to backend API
            const response = await fetch("http://localhost:3000/api/generate-diet-plan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${errorData.error || "Unknown error"}`);
            }

            const data = await response.json();

            // ✅ Extract diet plan from response properly
            const dietPlan = data.dietPlan || "⚠️ Error: Could not generate a diet plan.";

            // ✅ Display diet plan in a properly formatted way
            dietPlanOutput.innerHTML = `<pre class="formatted-text">${dietPlan}</pre>`;
            downloadButton.style.display = "block";
            downloadButton.dataset.dietPlan = dietPlan;
        } catch (error) {
            console.error("❌ Error fetching diet plan:", error);
            dietPlanOutput.innerHTML = `<p style="color: red;">⚠️ ${error.message}</p>`;
        }
    });

    // ✅ Download PDF Functionality
    downloadButton.addEventListener("click", () => {
        const dietPlanText = downloadButton.dataset.dietPlan;
        if (!dietPlanText) {
            alert("⚠️ No diet plan available for download.");
            return;
        }

        const doc = new jsPDF();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("Personalized Diet Plan", 20, 20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(14);

        const marginLeft = 20;
        const marginTop = 30;
        const pageWidth = doc.internal.pageSize.getWidth() - 40;
        const splitText = doc.splitTextToSize(dietPlanText, pageWidth);

        doc.text(splitText, marginLeft, marginTop);
        doc.save("Diet_Plan.pdf");
    });

    // ✅ Back Button Functionality
    backButton.addEventListener("click", () => {
        formSection.style.display = "block";
        outputSection.style.display = "none";
        dietPlanOutput.innerHTML = "";
        downloadButton.style.display = "none";
    });
});
