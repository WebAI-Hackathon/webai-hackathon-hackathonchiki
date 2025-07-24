/************************************** 
 * ADnDI - app.js - Optimized Version
 **************************************/

const appState = {
  characters: [],
  currentTheme: null,
  gameState: null,
  isProcessing: false
};

const API_CONFIG = {
  BASE_URL: 'http://localhost:3000',
  API_KEY: 'sk-RDjpy3tDOusiadmVRKXtbg',
  TIMEOUT: 15000 // Increased timeout for image generation
};

// Utility Functions
function escapeHTML(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function validateInput(input, maxLength = 500, minLength = 1) {
  return input && typeof input === "string" && 
         input.trim().length >= minLength && 
         input.length <= maxLength;
}

// Enhanced API Request Handler
async function makeAPIRequest(path, payload, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/${path}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_CONFIG.API_KEY}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Validate response structure
      if (path === 'chat' && (!data.choices?.[0]?.message?.content)) {
        console.log(data);
        console.log(!data.choices?.[0]?.message?.content);
        throw new Error("Invalid chat response format");
      }
      if (path === 'image' && (!data.data?.[0]?.url && !data.data?.[0]?.b64_json)) {
        throw new Error("Invalid image response format");
      }
      
      return data;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Attempt ${i+1} failed, retrying...`, error);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
// Add this function to app.js
async function generateCharacterDescription(formData) {
  try {
    const prompt = `Create a vivid D&D character description for a ${formData.archetype} named ${formData.name}. 
      They are level ${formData.level}. 
      Their gender is: ${formData.gender}.
      Background: ${formData.background}. 
      Hair: ${formData.hair || 'not specified'}. 
      Conflict attitude: ${formData.conflict}. 
      Defining trait: ${formData.trait}. 
      Companion: ${formData.companion}. 
      Inner struggle: ${formData.struggle}.
      
      Describe their appearance, personality, and backstory in 3-4 sentences. 
      Focus on visual details that would help an artist create a portrait. 
      Use vivid, descriptive language.`;

    const response = await makeAPIRequest("chat", {
      model: "hackathon/qwen3",
      messages: [
        {
          role: "system",
          content: "You are a creative fantasy writer who specializes in vivid character descriptions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    const description = response.choices[0].message.content.trim();
    
    // Basic validation
    if (!description || description.length < 50) {
      throw new Error("Description generation failed - response too short");
    }
    
    return description;
  } catch (error) {
    console.error("Description generation failed:", error);
    console.log("Description generation failes: " + error);
    // Fallback description
    return `${formData.name} is a ${formData.gender} ${formData.archetype} from ${formData.background}. ` +
           `They have ${formData.hair || 'mysterious'} hair and are known for their ${formData.trait}. ` +
           `Their companion is ${formData.companion} and they struggle with ${formData.struggle}.`;
  }
}
// Improved Image Generation
async function generateCharacterImage(description, archetype) {
  const prompt = `D&D ${archetype} character portrait: ${description.substring(0, 900)}. 
    Fantasy art, digital painting, highly detailed, vibrant colors, character centered`;
  
  try {
    const response = await makeAPIRequest("image", {  // This should be a POST
      model: "hackathon/text2image",
      prompt: prompt,
      n: 1,
      size: "512x512",
      quality: "hd",
      style: "fantasy"
    });

    // Handle both URL and base64 responses
    const imageData = response.data[0];
    const imageUrl = imageData?.url || 
                   (imageData?.b64_json ? `data:image/png;base64,${imageData.b64_json}` : null);
    console.log(imageUrl, imageData);
    if (!imageUrl) throw new Error("No image data received");

    // Verify image loads
    await verifyImageLoad(imageUrl);
    return imageUrl;
  } catch (error) {
    console.error("Image generation failed:", error);
    return getLocalPlaceholder(archetype);
  }
}

async function verifyImageLoad(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = url;
  });
}

function getLocalPlaceholder(archetype) {
  // SVG placeholder with class colors
  const colors = {
    barbarian: '#772422',
    bard: '#5a3d7a',
    cleric: '#e0a040',
    druid: '#5c7c3a',
    fighter: '#8a8a8a',
    monk: '#d4b16a',
    paladin: '#c0c0e0',
    ranger: '#6b8c42',
    rogue: '#735c3a',
    sorcerer: '#8a2be2',
    warlock: '#6a287e',
    wizard: '#2a4b8d'
  };
  
  const color = colors[archetype.toLowerCase()] || '#4a2c82';
  const initials = archetype.substring(0, 2).toUpperCase();
  
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="${color}" />
    <text x="256" y="256" font-family="Arial" font-size="120" 
          fill="white" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;
}

// Character Generation Flow
async function generateCharacter(characterData) {
  try {
    // Generate description
    const description = await generateCharacterDescription(characterData);
    
    // Generate image (with retries built into makeAPIRequest)
    const imageUrl = await generateCharacterImage(description, characterData.archetype);
    
    return {
      name: characterData.name,
      level: parseInt(characterData.level) || 1,
      type: characterData.archetype,
      description: description,
      image: imageUrl,
      stats: generateCharacterStats(characterData),
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Character generation failed:", error);
    throw new Error("Character creation failed. Please try again.");
  }
}

const IMAGE_SERVICE = {
    
    async generateCharacterImage(description, archetype, characterId = null) {
        try {
            const response = await makeAPIRequest('generate-image', {
                prompt: description,
                archetype,
                characterId
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Verify and load image
            const loadedUrl = await this.verifyImageLoad(response.url);
            return {
                url: loadedUrl,
                isFallback: false,
                ...response
            };
        } catch (error) {
            console.error("Image generation failed:", error);
            return {
                ...this.getPlaceholderImage(archetype, description),
                error: error.message
            };
        }
    },

    async verifyImageLoad(url, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timer = setTimeout(() => {
                cleanup();
                reject(new Error("Image load timed out"));
            }, timeout);

            const cleanup = () => {
                clearTimeout(timer);
                img.onload = img.onerror = null;
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            };

            img.onload = () => {
                cleanup();
                resolve(url);
            };
            img.onerror = () => {
                cleanup();
                reject(new Error("Image failed to load"));
            };
            img.src = url;
        });
    },

    getPlaceholderImage(archetype, description = '') {
        const colors = {
            barbarian: '#772422', bard: '#5a3d7a', cleric: '#e0a040',
            druid: '#5c7c3a', fighter: '#8a8a8a', monk: '#d4b16a',
            paladin: '#c0c0e0', ranger: '#6b8c42', rogue: '#735c3a',
            sorcerer: '#8a2be2', warlock: '#6a287e', wizard: '#2a4b8d'
        };
        
        const color = colors[archetype?.toLowerCase()] || '#4a2c82';
        const initials = archetype?.substring(0, 2).toUpperCase() || 'CH';
        const descWords = description?.split(' ').slice(0, 5).join(' ') || '';
        
        return {
            url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" 
                width="512" height="512" viewBox="0 0 512 512">
                <rect width="512" height="512" fill="${color}" />
                <text x="256" y="220" font-family="Arial" font-size="120" 
                    fill="white" text-anchor="middle">${initials}</text>
                <text x="256" y="300" font-family="Arial" font-size="24" 
                    fill="white" text-anchor="middle" width="400">${descWords}</text>
            </svg>`,
            isFallback: true
        };
    },

    async prefetchImages(urls) {
        const results = await Promise.allSettled(
            urls.map(url => this.verifyImageLoad(url).catch(() => null))
        );
        
        return results
            .filter(result => result.status === 'fulfilled' && result.value)
            .map(result => result.value);
    }
};
// Initialize the app
function initApp() {
  // Emptying the cache and localStorage
  localStorage.clear();

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('characterForm')) {
      initCharacterForm();
    }
    if (document.getElementById('characterCards')) {
      renderCharacterCards();
    }
  });
}

initApp();
// Export the function if using modules

window.generateCharacterDescription = generateCharacterDescription;
window.generateCharacterImage = generateCharacterImage;
window.IMAGE_SERVICE = IMAGE_SERVICE;