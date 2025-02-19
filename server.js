const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
const port = 3010;
const host = '192.168.1.2';

// JWT secret key
const JWT_SECRET = 'bb3e5dcc1836e006976942d7ddbc406ebc80fbd7f46254ccd344a296698f05f4';

// Path to your JSON data file
const dataFilePath = './data.json';

// Function to get valid API keys from data file
const getValidApiKeys = () => {
    try {
        const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
        // Extract unique keys from the data
        return [...new Set(data.map(item => item.key))].filter(key => key);
    } catch (error) {
        console.error('Error reading API keys from data file:', error);
        return [];
    }
};

// Middleware to verify API key
const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validApiKeys = getValidApiKeys();

    if (!apiKey || !validApiKeys.includes(apiKey)) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    const token = jwt.sign({ apiKey }, JWT_SECRET, { expiresIn: '1h' });
    req.token = token;
    next();
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    let token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    // Remove 'Bearer ' prefix if it exists
    if (token.startsWith('Bearer ')) {
        token = token.slice(7); // Remove 'Bearer ' (7 characters)
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.decoded = decoded;
        next();
    });
};

// Authentication endpoint
app.post('/auth', verifyApiKey, (req, res) => {
    res.json({ token: req.token });
});

// Get data endpoint
app.get('/data', verifyToken, (req, res) => {
    try {
        // Check if query parameters exist
        if (Object.keys(req.query).length === 0) {
            return res.status(400).json({ 
                error: 'Query parameters are required',
                message: 'Please provide at least one search parameter'
            });
        }

        // Read the JSON file
        const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
        
        // Filter the data based on query parameters
        const query = req.query;
        const filteredData = data.filter(item => {
            return Object.keys(query).every(key => 
                item[key] && item[key].toString() === query[key]
            );
        });

        // Return the filtered data
        res.json(filteredData);
    } catch (error) {
        res.status(500).json({ 
            error: 'Error reading data file',
            message: error.message 
        });
    }
});

// Start server
app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
});

