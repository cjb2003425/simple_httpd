// Configuration
const config = {
    host: '192.168.1.2',
    port: '3010',
    apiKey: 'bcf91364381d552db3957b8424bef0ca4d9e5dd8ce77b2558bc56e604b21f6e2'
};

// API endpoints
const endpoints = {
    auth: `http://${config.host}:${config.port}/auth`,
    data: `http://${config.host}:${config.port}/data?key=${config.apiKey}`
};

// Storage for auth token
let authToken = '';

// Common headers
const getHeaders = (includeAuth = true) => {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (includeAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (!includeAuth) {
        headers['x-api-key'] = config.apiKey;
    }
    
    return headers;
};

// ... (previous config and endpoints code remains the same)

// Custom error class for API errors
class APIError extends Error {
    constructor(message, status, response) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.response = response;
        this.timestamp = new Date().toISOString();
    }
}

// Enhanced error handling helper
const handleApiResponse = async (response) => {
    if (!response.ok) {
        const errorBody = await response.text().catch(() => 'No error body available');
        let parsedError;
        try {
            parsedError = JSON.parse(errorBody);
        } catch (e) {
            parsedError = errorBody;
        }

        throw new APIError(
            `API request failed with status ${response.status}`,
            response.status,
            {
                url: response.url,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                body: parsedError
            }
        );
    }
    return response;
};

const api = {
    authenticate: async () => {
        try {
            console.log('Attempting authentication...');
            const response = await fetch(endpoints.auth, {
                method: 'POST',
                headers: getHeaders(false)
            });

            await handleApiResponse(response);
            const data = await response.json();
            authToken = data.token;
            console.log('Authentication successful');
            return authToken;
        } catch (error) {
            console.error('Authentication error details:', {
                message: error.message,
                status: error.status,
                response: error.response,
                timestamp: error.timestamp
            });
            throw error;
        }
    },

    getData: async (filters = {}) => {
        try {
            if (!authToken) {
                console.log('No auth token found, attempting to authenticate...');
                await api.authenticate();
            }

            const url = new URL(endpoints.data);
            Object.keys(filters).forEach(key => 
                url.searchParams.append(key, filters[key])
            );

            console.log(`Making request to: ${url.toString()}`);
            console.log('Using headers:', getHeaders());

            const response = await fetch(url, {
                method: 'GET',
                headers: getHeaders()
            });

            await handleApiResponse(response);
            return await response.json();
        } catch (error) {
            console.error('Data fetch error details:', {
                message: error.message,
                status: error.status,
                response: error.response,
                timestamp: error.timestamp,
                token: authToken ? 'Present' : 'Missing'
            });
            throw error;
        }
    }
};

// Usage with detailed debugging
async function main() {
    try {
        console.log('Starting data fetch...');
        const allData = await api.getData();
        console.log('Data fetch successful:', allData);
    } catch (error) {
        console.error('Detailed error information:', {
            name: error.name,
            message: error.message,
            status: error.status,
            response: error.response,
            timestamp: error.timestamp,
            stack: error.stack
        });

        // Specific handling based on error status
        if (error.status === 401) {
            console.error('Authentication error: Your token might be invalid or expired');
            console.error('Current token:', authToken);
            console.error('Headers used:', getHeaders());
        }
    }
}

// Execute with debug logging
console.log('Starting application...');
main().then(() => {
    console.log('Application finished');
}).catch(err => {
    console.error('Application failed:', err);
});

