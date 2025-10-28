require("dotenv").config(); // ✅ Load environment variables first
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const axios = require("axios");

const app = express();

// ✅ Enable CORS for frontend requests with credentials
app.use(cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
    credentials: true,
    methods: ["GET", "POST"]
}));

app.use(express.json());

// ✅ Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    token: String
});

const User = mongoose.model("User", userSchema);

// ✅ Activity Schema
const activitySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: String,
    timestamp: { type: Date, default: Date.now }
});

const Activity = mongoose.model("Activity", activitySchema);

// ✅ Signup Route
app.post("/signup", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        console.error("❌ Signup error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Login Route
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: "Invalid email or password" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid email or password" });

        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

        user.token = token;
        await user.save();

        res.status(200).json({ message: "Login successful", token });
    } catch (error) {
        console.error("❌ Login error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Authenticate Middleware
const authenticate = async (req, res, next) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "") || req.body.token || req.query.token;
        if (!token) return res.status(401).json({ error: "Unauthorized access" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded.id, token });

        if (!user) return res.status(401).json({ error: "Unauthorized access" });

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid Token" });
    }
};

// ✅ Dashboard Protected Route
app.get("/dashboard", authenticate, (req, res) => {
    res.status(200).json({ message: "Welcome to the dashboard!" });
});

// ✅ Logout Route
app.post("/logout", authenticate, async (req, res) => {
    try {
        req.user.token = null;
        await req.user.save();
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ error: "Logout failed" });
    }
});

// ✅ Enhanced Log Activity Route (using email)
app.post('/api/log-activity', async (req, res) => {
    try {
        const { email, type } = req.body;

        if (!email || !type) {
            return res.status(400).json({ message: 'Email and activity type are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const activity = new Activity({
            userId: user._id,
            type,
            timestamp: new Date()
        });

        await activity.save();
        res.status(200).json({ message: 'Activity logged successfully' });
    } catch (error) {
        console.error("❌ Error saving activity:", error);
        res.status(500).json({ message: 'Failed to log activity' });
    }
});

// ✅ Enhanced Fetch Recent Activities Route (with user email)
app.get('/api/recent-activities', async (req, res) => {
    try {
        const activities = await Activity.find()
            .sort({ timestamp: -1 })
            .limit(10)
            .populate("userId", "email"); // Populate only email from User

        res.status(200).json({ activities });
    } catch (error) {
        console.error("❌ Error fetching activities:", error);
        res.status(500).json({ message: 'Failed to fetch activities' });
    }
});

// ✅ Serve MoveNet Model
const modelPath = path.join(__dirname, "public/movenet_model");
app.use('/movenet_model', express.static(modelPath));

// ✅ Serve Static Files
app.use(express.static("public"));

// ✅ Root Route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// ✅ Gemini Diet Plan Route
app.post("/api/generate-diet-plan", async (req, res) => {
    try {
        const { height, weight, dietGoal, preference, supplements } = req.body;

        if (!height || !weight || !dietGoal || !preference) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const requestBody = {
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: `Create a full-day diet plan for: Height: ${height} cm, Weight: ${weight} kg, Goal: ${dietGoal}, Dietary Preference: ${preference}, Supplements: ${supplements.length > 0 ? supplements.join(", ") : "None"}`
                        }
                    ]
                }
            ]
        };

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
            requestBody,
            { headers: { "Content-Type": "application/json" } }
        );

        const dietPlan = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No valid diet plan generated.";

        res.json({ dietPlan });
    } catch (error) {
        console.error("❌ Gemini API error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to generate diet plan." });
    }
});

// ✅ Gemini Workout Plan Route
app.post("/api/generate-workout-plan", async (req, res) => {
    try {
        const { fitnessLevel, goal, trainingDays, equipment, preferredExercises } = req.body;

        if (!fitnessLevel || !goal || !trainingDays) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const requestBody = {
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: `Generate a personalized workout plan based on:
                                - Fitness Level: ${fitnessLevel}
                                - Goal: ${goal}
                                - Training Days per Week: ${trainingDays}
                                - Available Equipment: ${equipment || "None"}
                                - Preferred Exercises: ${preferredExercises || "None"}

                                Provide a structured workout plan including warm-up, main exercises, and cool-down.
                                Ensure the plan is well-balanced and effective for the user's fitness goal.`
                        }
                    ]
                }
            ]
        };

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
            requestBody,
            { headers: { "Content-Type": "application/json" } }
        );

        const workoutPlan = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No valid workout plan generated.";

        res.json({ workoutPlan });
    } catch (error) {
        console.error("❌ Gemini API error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to generate workout plan." });
    }
});

// ✅ Start Server
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
