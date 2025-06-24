require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Token validation middleware with debug logs
app.use((req, res, next) => {
  const token = req.headers['authorization'];
  const expectedToken = `Bearer ${process.env.API_KEY}`;

  console.log('Incoming Authorization header:', token);
  console.log('Expected Authorization header:', expectedToken);

  if (!token || token !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
});

// DataForSEO credentials from environment variables
const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN;
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD;

// Basic auth for DataForSEO
const auth = {
  username: DATAFORSEO_LOGIN,
  password: DATAFORSEO_PASSWORD,
};

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "DataForSEO MCP Server is running",
    endpoints: ["/ranked_keywords", "/health"],
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Main endpoint for ranked keywords
app.post("/ranked_keywords", async (req, res) => {
  try {
    const {
      domain,
      location = "United States",
      language = "en",
      limit = 50,
    } = req.body;

    if (!domain) {
      return res.status(400).json({ error: "Domain is required" });
    }

    console.log(`Fetching keywords for domain: ${domain}`);

    const dataForSEOEndpoint =
      "https://api.dataforseo.com/v3/dataforseo_labs/ranked_keywords/live";

    const requestData = [
      {
        target: domain,
        location_name: location,
        language_name: language,
        limit: parseInt(limit),
        order_by: ["search_volume,desc"],
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
        const keywords = result.map((item) => ({
          keyword: item.keyword_data.keyword,
          search_volume: item.keyword_data.search_volume,
          competition: item.keyword_data.competition,
          cpc: item.keyword_data.cpc,
          position: item.ranked_serp_element.serp_item.rank_absolute,
          url: item.ranked_serp_element.serp_item.url,
        }));

        res.json({
          domain: domain,
          location: location,
          language: language,
          total_keywords: keywords.length,
          keywords: keywords,
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
