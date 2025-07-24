/************************************** 
 * ADnDI - app.js
 * Main application JavaScript file
 **************************************/

// Global state
const appState = {
  characters: [],
  currentTheme: null,
  gameState: null,
  isProcessing: false
};

/* ======= UTILITY FUNCTIONS ======= */

/**
 * Safely escape HTML strings
 */
function escapeHTML(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Convert newlines to <br> tags
 */
function renderTextToHTML(str = "") {
  return escapeHTML(str).replace(/\n/g, "<br>");
}

/**
 * Validate input fields
 */
function validateInput(input, maxLength = 500, minLength = 1) {
  return input && typeof input === "string" && 
         input.trim().length >= minLength && 
         input.length <= maxLength;
}

/**
 * Show loading state
 */
function showLoading(element, message = "Loading...") {
  if (element) {
    element.innerHTML = `<div class="loading">${message}</div>`;
  }
}

/**
 * Show error message
 */
function showError(element, message, details = "") {
  if (element) {
    element.innerHTML = `
      <div class="error">
        <p>${escapeHTML(message)}</p>
        ${details ? `<small>${escapeHTML(details)}</small>` : ''}
      </div>
    `;
  }
}
function showCharacterError(message, error = null) {
  const errorContainer = document.getElementById('errorDisplay') || 
                        document.createElement('div');
  
  errorContainer.id = 'errorDisplay';
  errorContainer.className = 'error-message';
  errorContainer.innerHTML = `
    <h4>Character Generation Failed</h4>
    <p>${escapeHTML(message)}</p>
    ${error ? `<details><summary>Technical details</summary><pre>${escapeHTML(error.message)}</pre></details>` : ''}
    <button onclick="location.reload()">Refresh Page</button>
    <button onclick="retryGeneration()">Try Again</button>
  `;
  
  if (!document.getElementById('errorDisplay')) {
    document.body.appendChild(errorContainer);
  }
}

// Example usage in your form handler:
document.getElementById('characterForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const formData = getFormData();
    const character = await generateCharacter(formData);
    window.location.href = 'character-creation.html';
  } catch (error) {
    showCharacterError("We couldn't create your character. Please check your connection and try again.", error);
  }
});
/**
 * Disable/enable all buttons
 */
function disableButtons(disable = true) {
  document.querySelectorAll("button").forEach(btn => {
    btn.disabled = disable;
  });
}

/* ======= API FUNCTIONS ======= */

/**
 * Make API requests with error handling
 */
async function makeAPIRequest(path, payload) {
  try {
    const response = await fetch(`/api/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP Error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request to ${path} failed:`, error);
    throw new Error(`Network error: ${error.message}`);
  }
}

/**
 * Generate character description using AI
 */
async function generateCharacter(characterData) {
  const MAX_RETRIES = 2;
  let retryCount = 0;
  
  while (retryCount < MAX_RETRIES) {
    try {
      // 1. Generate Description
      const description = await generateCharacterDescription(characterData);
      if (!description) throw new Error("Empty description generated");
      
      // 2. Generate Image
      const imageUrl = await generateCharacterImage(description, characterData.archetype);
      
      // 3. Create Character Object
      const character = {
        name: characterData.name,
        level: parseInt(characterData.level) || 1,
        type: characterData.archetype,
        description: description,
        image: imageUrl,
        stats: {
          hp: 10 + (parseInt(characterData.level) || 1) * 5,
          attack: 3 + (parseInt(characterData.level) || 1),
          defense: 2 + (parseInt(characterData.level) || 1)
        }
      };
      
      // 4. Save Character
      if (!saveCharacter(character)) {
        throw new Error("Failed to save character");
      }
      
      return character;
      
    } catch (error) {
      console.error(`Attempt ${retryCount + 1} failed:`, error);
      retryCount++;
      
      if (retryCount >= MAX_RETRIES) {
        throw new Error(`Character generation failed after ${MAX_RETRIES} attempts: ${error.message}`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }
}

/**
 * Generate character image using AI
 */
async function generateCharacterImage(description, archetype) {
  try {
    const prompt = `D&D ${archetype} character: ${description}. 
      Fantasy art style, detailed, vibrant colors`;

    const response = await makeAPIRequest("image", {
      model: "hackathon/text2image",
      prompt: prompt,
      n: 1,
      size: "512x512",
      quality: "standard"
    });

    // Handle different response formats
    const imageData = response.data?.[0];
    if (imageData?.url) {
      return imageData.url;
    } else if (imageData?.b64_json) {
      return `data:image/png;base64,${imageData.b64_json}`;
    } else {
      throw new Error("No image data received");
    }
  } catch (error) {
    console.error("Image generation failed:", error);
    // Return placeholder if generation fails
    return "https://via.placeholder.com/512";
  }
}

/* ======= CHARACTER MANAGEMENT ======= */

/**
 * Save character to local storage
 */
function saveCharacter(character) {
  try {
    let characters = [];
    const storedChars = localStorage.getItem('adndiCharacters');
    
    if (storedChars) {
      characters = JSON.parse(storedChars);
      if (!Array.isArray(characters)) {
        characters = [];
      }
    }

    characters.push(character);
    localStorage.setItem('adndiCharacters', JSON.stringify(characters));
    return true;
  } catch (error) {
    console.error("Failed to save character:", error);
    return false;
  }
}

/**
 * Load characters from local storage
 */
function loadCharacters() {
  try {
    const storedChars = localStorage.getItem('adndiCharacters');
    if (storedChars) {
      const characters = JSON.parse(storedChars);
      if (Array.isArray(characters)) {
        appState.characters = characters;
        return characters;
      }
    }
    return [];
  } catch (error) {
    console.error("Failed to load characters:", error);
    return [];
  }
}

/* ======= GAME FUNCTIONS ======= */

/**
 * Generate game story segment
 */
async function generateStorySegment(theme, characters, previousEvents = [], diceRoll = null) {
  try {
    const prompt = `Continue this D&D adventure based on:
      Theme: ${theme}
      Characters: ${characters.map(c => `${c.name} (${c.type} level ${c.level})`).join(', ')}
      ${previousEvents.length ? `Previous events: ${previousEvents.slice(-3).join(' ')}` : ''}
      ${diceRoll ? `Last dice roll: ${diceRoll}` : ''}

      Create the next part of the story with a clear narrative progression.`;

    const response = await makeAPIRequest("chat", {
      model: "hackathon/qwen3",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 500
    });

    return response.choices?.[0]?.message?.content || "The adventure continues...";
  } catch (error) {
    console.error("Story generation failed:", error);
    throw error;
  }
}

/**
 * Generate final story conclusion
 */
async function generateFinalStory(theme, characters, storyEvents) {
  try {
    const prompt = `Conclude this D&D adventure:
      Theme: ${theme}
      Characters: ${characters.map(c => `${c.name} (${c.type} level ${c.level})`).join(', ')}
      Story so far: ${storyEvents.join('\n\n')}

      Write a satisfying conclusion to the adventure in 3-5 paragraphs.`;

    const response = await makeAPIRequest("chat", {
      model: "hackathon/qwen3",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 600
    });

    return response.choices?.[0]?.message?.content || "And so their adventure came to an end...";
  } catch (error) {
    console.error("Final story generation failed:", error);
    throw error;
  }
}

/* ======= UI FUNCTIONS ======= */

/**
 * Render character cards
 */
function renderCharacterCards(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const characters = loadCharacters();
  container.innerHTML = '';

  characters.forEach(character => {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.innerHTML = `
      <img src="${character.image}" alt="${character.name}" onerror="this.src='https://via.placeholder.com/512'">
      <h3>${character.name}</h3>
      <p><strong>Level ${character.level} ${character.type}</strong></p>
      <p>${character.description}</p>
      <div class="character-stats">
        <span>HP: ${character.stats.hp}</span>
        <span>ATK: ${character.stats.attack}</span>
        <span>DEF: ${character.stats.defense}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * Initialize the application
 */
function initApp() {
  // Load any saved characters
  loadCharacters();
  
  // Set up event listeners
  document.addEventListener('DOMContentLoaded', () => {
    // Character creation page
    if (document.getElementById('characterCards')) {
      renderCharacterCards('characterCards');
    }
    
    // Other page-specific initializations...
  });
}

// Initialize the application
initApp();

/* ======= EXPORTS FOR MODULE USAGE ======= */
// Note: Remove if not using modules
export {
  escapeHTML,
  renderTextToHTML,
  validateInput,
  makeAPIRequest,
  generateCharacterDescription,
  generateCharacterImage,
  saveCharacter,
  loadCharacters,
  generateStorySegment,
  generateFinalStory,
  renderCharacterCards
};