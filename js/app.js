const appState = {
  characters: [],
  currentTheme: null,
  gameState: null,
  isProcessing: false,
};

// Update to Litviva API
const API_CONFIG = {
  BASE_URL: "https://api.litviva.com/v1",
  API_KEY: "sk-RDjpy3tDOusiadmVRKXtbg",
  TIMEOUT: 30000, // Increased timeout for image generation
};

// Utility Functions
function escapeHTML(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function validateInput(input, maxLength = 500, minLength = 1) {
  return (
    input &&
    typeof input === "string" &&
    input.trim().length >= minLength &&
    input.length <= maxLength
  );
}

// Enhanced API Request Handler
async function makeAPIRequest(path, payload, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn("⏱️ Aborting request after timeout.");
        controller.abort();
      }, API_CONFIG.TIMEOUT);

      // Map paths to Litviva endpoints
      const endpoint =
        path === "chat"
          ? "chat/completions"
          : path === "image"
          ? "images/generations"
          : path;

      const response = await fetch(`${API_CONFIG.BASE_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_CONFIG.API_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Validate response structure
      if (path === "chat" && !data.choices?.[0]?.message?.content) {
        throw new Error("Invalid chat response format");
      }
      if (path === "image") {
        // Normalize image response
        const imageData = data.data?.[0];
        if (!imageData) throw new Error("No image data received");

        // Handle both URL and base64 responses
        if (imageData.url) {
          data.url = imageData.url;
        } else if (imageData.b64_json) {
          data.url = `data:image/png;base64,${imageData.b64_json}`;
        } else {
          throw new Error("Invalid image response format");
        }
      }

      return data;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`Attempt ${i + 1} failed, retrying...`, error);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));

      if (error.name === "AbortError" && i < retries - 1) {
        console.warn("Request aborted. Retrying with longer timeout...");
        API_CONFIG.TIMEOUT *= 2;
      }
    }
  }
}

// ... rest of app.js remains unchanged ...
function generateCharacterStats(characterData) {
  return {
    //hp: 10 + parseInt(characterData.level) * 5,
    hp: 5,
    attack: 3 + parseInt(characterData.level),
    defense: 2 + parseInt(characterData.level),
  };
}
async function generateCharacterDescription(formData) {
  try {
    const prompt = `Create a vivid D&D character description for a ${
      formData.archetype
    } named ${formData.name}. 
      They are level ${formData.level}. 
      Their gender is: ${formData.gender}.
      Background: ${formData.background}. 
      Hair: ${formData.hair || "not specified"}. 
      Conflict attitude: ${formData.conflict}. 
      Defining trait: ${formData.trait}. 
      Companion: ${formData.companion}. 
      Inner struggle: ${formData.struggle}.
      
      Describe their appearance, personality, and backstory in 1-2 sentences. 
      Focus on visual details that would help an artist create a portrait. 
      Use vivid, descriptive language.`;

    const response = await makeAPIRequest("chat", {
      model: "hackathon/qwen3",
      messages: [
        {
          role: "system",
          content:
            "You are a creative fantasy writer who specializes in vivid character descriptions. /no_think",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
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
    return (
      `${formData.name} is a ${formData.gender} ${formData.archetype} from ${formData.background}. ` +
      `They have ${
        formData.hair || "mysterious"
      } hair and are known for their ${formData.trait}. ` +
      `Their companion is ${formData.companion} and they struggle with ${formData.struggle}.`
    );
  }
}

function getLocalPlaceholder(archetype) {
  // SVG placeholder with class colors
  const colors = {
    barbarian: "#772422",
    bard: "#5a3d7a",
    cleric: "#e0a040",
    druid: "#5c7c3a",
    fighter: "#8a8a8a",
    monk: "#d4b16a",
    paladin: "#c0c0e0",
    ranger: "#6b8c42",
    rogue: "#735c3a",
    sorcerer: "#8a2be2",
    warlock: "#6a287e",
    wizard: "#2a4b8d",
  };

  const color = colors[archetype.toLowerCase()] || "#4a2c82";

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="${color}" />`;
}

// Character Generation Flow
async function generateCharacter(characterData) {
  try {
    // Generate description
    const description = await generateCharacterDescription(characterData);

    return {
      name: characterData.name,
      level: parseInt(characterData.level) || 1,
      type: characterData.archetype,
      description: description,
      stats: generateCharacterStats(characterData),
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Character generation failed:", error);
    throw new Error("Character creation failed. Please try again.");
  }
}

const IMAGE_SERVICE = {
  async generateCharacterImage(description, archetype, characterId = null) {
    const prompt = `D&D ${archetype} character portrait: ${description.substring(
      0,
      900
    )}. 
    Fantasy art, digital painting, highly detailed, vibrant colors, character centered`;

    try {
      const response = await makeAPIRequest("image", {
        // This should be a POST
        model: "hackathon/text2image",
        prompt: prompt,
        n: 1,
        size: "512x512",
        quality: "hd",
        style: "fantasy",
      });
      const imageData = response.data[0];
      let imageUrl = null;

      // Handle URL-based response
      if (imageData?.url) {
        imageUrl = imageData.url;
      }
      // Handle base64 response
      else if (imageData?.b64_json) {
        imageUrl = `data:image/png;base64,${imageData.b64_json}`;

        // Validate base64 format
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageData.b64_json)) {
          throw new Error("Invalid base64 image data");
        }
      }

      if (!imageUrl) throw new Error("No image data received");

      // Verify image loads successfully
      await this.verifyImageLoad(imageUrl);
      return imageUrl;
      // Handle both URL and base64 responses
    } catch (error) {
      console.error("Image generation failed:", error);
      return getLocalPlaceholder(archetype);
    }
  },

  async verifyImageLoad(url, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("Image load timed out"));
      }, timeout);

      const cleanup = () => {
        clearTimeout(timer);
        img.onload = img.onerror = null;
        if (url.startsWith("blob:")) {
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

  getPlaceholderImage(archetype, description = "") {
    const colors = {
      barbarian: "#772422",
      bard: "#5a3d7a",
      cleric: "#e0a040",
      druid: "#5c7c3a",
      fighter: "#8a8a8a",
      monk: "#d4b16a",
      paladin: "#c0c0e0",
      ranger: "#6b8c42",
      rogue: "#735c3a",
      sorcerer: "#8a2be2",
      warlock: "#6a287e",
      wizard: "#2a4b8d",
    };

    const color = colors[archetype?.toLowerCase()] || "#4a2c82";
    const initials = archetype?.substring(0, 2).toUpperCase() || "CH";
    const descWords = description?.split(" ").slice(0, 5).join(" ") || "";

    return {
      url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" `,
      isFallback: true,
    };
  },

  async prefetchImages(urls) {
    const results = await Promise.allSettled(
      urls.map((url) => {
        this.verifyImageLoad(url).catch(() => null);
      })
    );

    return results
      .filter((result) => result.status === "fulfilled" && result.value)
      .map((result) => result.value);
  },
};

window.generateCharacterDescription = generateCharacterDescription;
window.IMAGE_SERVICE = IMAGE_SERVICE;

// logging method
function log(msg, ...parameters) {
  console.log(msg);
  for (let parameter of parameters) {
    console.log(parameter);
  }
  console.log("Finished logging...");
}
