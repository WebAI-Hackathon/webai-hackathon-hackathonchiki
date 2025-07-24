import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createHash } from 'crypto';

const app = express();
const PORT = 3000;

// Configuration
const API_BASE = 'https://api.litviva.com/v1';
const IMAGE_CACHE = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Helper functions
function hashString(str) {
    return createHash('sha256').update(str).digest('hex');
}

function getPlaceholderImage(archetype) {
    const colors = {
        barbarian: '#772422', bard: '#5a3d7a', cleric: '#e0a040',
        druid: '#5c7c3a', fighter: '#8a8a8a', monk: '#d4b16a',
        paladin: '#c0c0e0', ranger: '#6b8c42', rogue: '#735c3a',
        sorcerer: '#8a2be2', warlock: '#6a287e', wizard: '#2a4b8d'
    };
    
    const color = colors[archetype?.toLowerCase()] || '#4a2c82';
    const initials = archetype?.substring(0, 2).toUpperCase() || 'CH';
    
    return {
        url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
            <rect width="512" height="512" fill="${color}" />
            <text x="256" y="256" font-family="Arial" font-size="120" 
                fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
        </svg>`,
        isFallback: true
    };
}



// API endpoints
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt, archetype, characterId } = req.body;
        
        if (!prompt || !archetype) {
            return res.status(400).json({ 
                ...getPlaceholderImage(archetype),
                error: 'Prompt and archetype are required' 
            });
        }

        // Cache key
        const cacheKey = hashString(`${characterId || ''}-${archetype}-${prompt}`);
        
        // Check cache
        if (IMAGE_CACHE.has(cacheKey)) {
            const cached = IMAGE_CACHE.get(cacheKey);
            if (Date.now() - cached.timestamp < CACHE_DURATION) {
                return res.json(cached.data);
            }
        }

        // Generate with retries
        let retries = 3;
        while (retries > 0) {
            try {
                const response = await fetch(`${API_BASE}/images/generations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "hackathon/text2image",
                        prompt: enhancePrompt(prompt, archetype),
                        n: 1,
                        size: "512x512",
                        quality: "hd",
                        style: "fantasy"
                    })
                });

                if (!response.ok) throw new Error(`API responded with ${response.status}`);

                const data = await response.json();
                const imageData = data.data?.[0];
                
                if (!imageData) throw new Error("No image data received");
                
                const result = {
                    url: imageData.url || `data:image/png;base64,${imageData.b64_json}`,
                    prompt: prompt,
                    model: data.model,
                    timestamp: new Date().toISOString()
                };

                // Cache the result
                IMAGE_CACHE.set(cacheKey, {
                    timestamp: Date.now(),
                    data: result
                });

                return res.json(result);
            } catch (error) {
                retries--;
                if (retries === 0) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    } catch (error) {
        console.error('Image generation error:', error);
        res.status(500).json({ 
            ...getPlaceholderImage(req.body?.archetype),
            error: error.message
        });
    }
});

// API endpoints
// Make sure you have this endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const data = await makeLitvivaRequest('chat/completions', req.body);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/image', async (req, res) => {
  try {
    // You might want to add some parameters via query string
    const { prompt, model, size } = req.query;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const response = await makeLitvivaRequest('images/generations', {
      model: model || "hackathon/text2image",
      prompt: prompt,
      n: 1,
      size: size || "512x512"
    });
    
    // Normalize response format
    if (response.data && response.data[0] && !response.data[0].url) {
      const b64 = response.data[0].b64_json || response.data[0].image_base64 || response.data[0].base64;
      if (b64) {
        response.data[0].url = `data:image/png;base64,${b64}`;
      }
    }
    
    res.json(response);
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

function enhancePrompt(prompt, archetype) {
    const styleGuide = {
        barbarian: "dynamic pose, battle-scarred, wild hair, dramatic lighting",
        wizard: "intricate robes, glowing magical effects, scholarly demeanor",
        rogue: "shadowy, agile pose, leather armor, mysterious atmosphere"
        // Add more archetype styles
    };
    
    return `D&D ${archetype} character portrait: ${prompt.substring(0, 900)}. 
        ${styleGuide[archetype.toLowerCase()] || ''}
        Fantasy art, digital painting, highly detailed, vibrant colors, 
        character centered, artstation trending`;
}

function processImageResponse(response) {
    const imageData = response.data?.[0];
    if (!imageData) throw new Error("No image data received");
    
    return {
        url: imageData.url || `data:image/png;base64,${imageData.b64_json}`,
        prompt: response.prompt,
        model: response.model,
        timestamp: new Date().toISOString()
    };
}

