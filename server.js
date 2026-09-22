const express = require("express");
const mysql = require("mysql2");

const app = express();
const PORT = 3000;

// Allow our server to receive JSON data
app.use(express.json());

// Allow the survey page to submit when opened from a local development server.
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

// Serve the survey files from the project folder
app.use(express.static(__dirname));

// Connect to MySQL
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "worker_finder_survey"
});

// Test the database connection
db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
        return;
    }

    console.log("Connected to MySQL database!");
});

// Home route
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});
app.get("/test", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// Receive survey responses
app.post("/submit-survey", (req, res) => {

    const toDbValue = (value) => Array.isArray(value) ? value.join(", ") : (value ?? "");

    const {
        region,
        city_town,
        area_community,
        needed_worker,
        finding_method,
        struggled_finding,
        difficult_worker_type,
        biggest_problem,
        dissatisfied_hire,
        dissatisfaction_reason,
        ratings_importance,
        wanted_information,
        use_platform,
        trust_factor,
        additional_feedback
    } = req.body;

    const sql = `
        INSERT INTO survey_responses (
            region,
            city_town,
            area_community,
            needed_worker,
            finding_method,
            struggled_finding,
            difficult_worker_type,
            biggest_problem,
            dissatisfied_hire,
            dissatisfaction_reason,
            ratings_importance,
            wanted_information,
            use_platform,
            trust_factor,
            additional_feedback
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        region,
        city_town,
        area_community,
        needed_worker,
        toDbValue(finding_method),
        struggled_finding,
        difficult_worker_type,
        toDbValue(biggest_problem),
        dissatisfied_hire,
        dissatisfaction_reason,
        ratings_importance,
        toDbValue(wanted_information),
        use_platform,
        trust_factor,
        additional_feedback
    ];

    db.query(sql, values, (err, result) => {

        if (err) {
            console.error("Error saving survey:", err);

            return res.status(500).json({
                success: false,
                message: "Failed to save survey response."
            });
        }

        console.log("Survey response saved!");

        res.json({
            success: true,
            message: "Survey response saved successfully!"
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});