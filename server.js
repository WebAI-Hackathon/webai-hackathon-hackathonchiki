import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

// Replace with your actual API key
const API_KEY = 'sk-RDjpy3tDOusiadmVRKXtbg';
const API_BASE = 'https://api.litviva.com/v1';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Helper function for API requests
async function makeLitvivaRequest(path, body) {
    const response = await fetch(`${API_BASE}/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(body)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP Error ${response.status}`);
    }
    
    return response.json();
}

// API endpoints
app.post('/api/chat', async (req, res) => {
    try {
        const data = await makeLitvivaRequest('chat/completions', req.body);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/image', async (req, res) => {
    try {
        const data = await makeLitvivaRequest('images/generations', req.body);
        
        // Normalize response format
        if (data.data && data.data[0] && !data.data[0].url) {
            const b64 = data.data[0].b64_json || data.data[0].image_base64 || data.data[0].base64;
            if (b64) {
                data.data[0].url = `data:image/png;base64,${b64}`;
            }
        }
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/audio', async (req, res) => {
    try {
        const { input, voice = 'sophia', model = 'hackathon/text2speech' } = req.body;
        
        if (!input) {
            return res.status(400).json({ error: 'Input text is required' });
        }
        
        const response = await fetch(`${API_BASE}/audio/speech`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model,
                input,
                voice,
                response_format: 'mp3'
            })
        });
        
        if (!response.ok || !response.headers.get('content-type')?.includes('audio')) {
            const errorText = await response.text();
            throw new Error(errorText || 'Audio generation failed');
        }
        
        res.setHeader('Content-Type', 'audio/mpeg');
        response.body.pipe(res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});