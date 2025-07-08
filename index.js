import dotenv from "dotenv";
import express from "express";
import axios from "axios";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// DataForSEO credentials from environment variables
const DATA_FOR_SEO_LOGIN = process.env.DATAFORSEO_LOGIN;
const DATA_FOR_SEO_PASSWORD = process.env.DATAFORSEO_PASSWORD;

// Basic auth for DataForSEO
const auth = {
    username: DATA_FOR_SEO_LOGIN,
    password: DATA_FOR_SEO_PASSWORD,
};

// Health check endpoint
app.get("/", (req, res) => {
    res.json({
        status: "DataForSEO MCP Server is running",
        endpoints: ["/ranked_keywords", "/health"],
    });
});

// Health check endpoint
app.get("/health", (req, res) => {
    console.log("Received new request on /health");
    res.json({status: "OK", timestamp: new Date().toISOString()});
});

// Main endpoint for ranked keywords
app.post("/ranked_keywords", async (req, res) => {
    try {
        console.log("Received new request on /ranked_keywords");
        const {
            domain,
            location = "United States",
            language = "en",
            limit = 50,
        } = req.body;

        if (!domain) {
            return res.status(400).json({error: "Domain is required"});
        }

        console.log(`Fetching keywords for domain: ${domain}`);

        // DataForSEO API endpoint for ranked keywords
        const dataForSEOEndpoint = "https://api.dataforseo.com/v3/dataforseo_labs/google/organic_keywords/live";


        const requestData = [
            {
                target: domain,
                location_name: location,
                language_name: language,
                limit: parseInt(limit),
                order_by: ["keyword_data.keyword_info.search_volume,desc"]
            },
        ];

        console.log("AUTH DEBUG", auth);

        const response = await axios.post(dataForSEOEndpoint, requestData, {
            auth: auth,
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (response.data && response.data.tasks && response.data.tasks[0]) {
            const result = response.data.tasks[0].result;

            if (result && result.length > 0) {
                const keywords = result[0].items?.map((item) => {
                    return ({
                        keyword: item.keyword_data?.keyword,
                        search_volume: item.keyword_data?.search_volume,
                        competition: item.keyword_data?.competition,
                        cpc: item.keyword_data?.cpc,
                        position: item.ranked_serp_element?.serp_item?.rank_absolute,
                        url: item.ranked_serp_element?.serp_item?.url,
                    });
                });

                res.json({
                    domain: domain,
                    location: location,
                    language: language,
                    total_keywords: keywords?.length || 0,
                    keywords: keywords || [],
                });
            } else {
                res.json({
                    domain: domain,
                    message: "No ranked keywords found for this domain",
                    keywords: [],
                });
            }
        } else {
            throw new Error("Invalid response from DataForSEO API");
        }
    } catch (error) {
        console.error("Error fetching keywords:", error.message);
        res.status(500).json({
            error: "Failed to fetch keywords",
            details: error.message,
        });
    }
});

app.listen(PORT, () => {
    console.log(`DataForSEO MCP Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
