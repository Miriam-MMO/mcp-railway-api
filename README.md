📌 Project purpose
This Node.js app acts as an MCP (Microservice Control Point) server to integrate:

N8N workflows

DataForSEO API (for ranked keywords)

Claude API (for content generation)

The server exposes:

POST /ranked_keywords → Queries DataForSEO ranked keywords API.

GET /health → Health check endpoint.

🚀 Environment Variables
Please create a .env file based on .env.template: