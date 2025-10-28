document.addEventListener("DOMContentLoaded", () => {
    const bmiForm = document.getElementById("bmiForm");
    const bmiValue = document.getElementById("bmiValue");
    const bmiFeedback = document.getElementById("bmiFeedback");
    const resultBox = document.getElementById("result");
    const backButton = document.getElementById("backButton");

    bmiForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const height = parseFloat(document.getElementById("height").value);
        const weight = parseFloat(document.getElementById("weight").value);
        const age = parseInt(document.getElementById("age").value);
        const gender = document.getElementById("gender").value;
        const activity = document.getElementById("activity").value;

        if (!height || !weight || !age || gender === "" || activity === "") {
            alert("⚠️ Please fill in all the required fields.");
            return;
        }

        const bmi = (weight / ((height / 100) ** 2)).toFixed(2);
        let feedback = "";

        if (bmi < 18.5) {
            feedback = "You are underweight. Try increasing calorie intake.";
        } else if (bmi >= 18.5 && bmi < 24.9) {
            feedback = "You have a normal weight. Maintain a balanced diet!";
        } else if (bmi >= 25 && bmi < 29.9) {
            feedback = "You are overweight. Consider an active lifestyle.";
        } else {
            feedback = "You are in the obese range. Prioritize fitness and diet!";
        }

        // Show the results
        bmiValue.innerHTML = `Your BMI: <strong>${bmi}</strong>`;
        bmiFeedback.textContent = feedback;
        resultBox.style.display = "block";
    });

    // Back to Dashboard
    backButton.addEventListener("click", () => {
        window.location.href = "dashboard.html";
    });
});
