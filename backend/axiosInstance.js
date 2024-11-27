// Import fetch
const fetch = require('node-fetch');

// Example function to make a request using fetch
app.get('/external-data', async (req, res) => {
  try {
    const response = await fetch('https://your-base-url.com/some-endpoint'); // Replace with full URL

    // Check if the response is OK (status 200-299)
    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.statusText}`);
    }

    const data = await response.json(); // Parse JSON response
    res.json(data);
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});
