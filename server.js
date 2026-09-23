const express = require("express");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2");

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, "data");
const localResponsesFile = path.join(dataDir, "survey_responses.json");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const ensureFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "[]", "utf8");
    }
};

const appendLocalResponse = (payload) => {
    ensureFile(localResponsesFile);

    const entries = JSON.parse(fs.readFileSync(localResponsesFile, "utf8") || "[]");
    entries.push({
        ...payload,
        savedAt: new Date().toISOString()
    });

    fs.writeFileSync(localResponsesFile, JSON.stringify(entries, null, 2), "utf8");
    return entries.length;
};

// Allow JSON payloads and consistent local browser access.
app.use(express.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});

const staticDir = path.join(__dirname, "public");
app.use(express.static(staticDir));

const db = mysql.createConnection({
    host: process.env.MYSQLHOST || "localhost",
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER || "root",
    password: process.env.MYSQLPASSWORD || "",
    database: process.env.MYSQLDATABASE || "worker_finder_survey"
});

let databaseReady = false;

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        return;
    }

    databaseReady = true;
    console.log("Connected to MySQL database!");
});

const saveSurveyToDatabase = (payload, callback) => {
    if (!databaseReady) {
        return callback(new Error("MySQL is unavailable"));
    }

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
    } = payload;

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
        toDbValue(dissatisfaction_reason),
        ratings_importance,
        toDbValue(wanted_information),
        use_platform,
        trust_factor,
        additional_feedback
    ];

    db.query(sql, values, callback);
};

app.get("/health", (req, res) => {
    res.json({
        ok: true,
        databaseReady,
        port: PORT
    });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
});

app.get("/test", (req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
});

app.post("/submit-survey", (req, res) => {
    const payload = req.body || {};

    saveSurveyToDatabase(payload, (err) => {
        if (err) {
            console.error("Database insert failed, using local fallback:", err.message);
            const savedCount = appendLocalResponse(payload);
            console.log(`Survey response saved locally (${savedCount} total records).`);
            return res.json({
                success: true,
                message: "Survey response saved successfully."
            });
        }

        console.log("Survey response saved to MySQL!");
        res.json({
            success: true,
            message: "Survey response saved successfully!"
        });
    });
});

if (require.main === module) {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

module.exports = {
    app,
    appendLocalResponse,
    saveSurveyToDatabase
};