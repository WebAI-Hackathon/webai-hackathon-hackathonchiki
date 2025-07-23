/************************************** 
 * Magic Story Weaver - app.js
 **************************************/

let characterImage = "";
let storyText = "";
let selectedVoice = "sophia";
let isProcessing = false;

/* ======= UTILITIES ======= */
function escapeHTML(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
function renderTextToHTML(str = "") {
  return escapeHTML(str).replace(/\n/g, "<br>");
}
function validateInput(input, maxLength = 500) {
  return input && typeof input === "string" && input.trim().length > 0 && input.length <= maxLength;
}

/* ======= API HELPERS ======= */
async function makeAPIRequest(path, payload) {
  try {
    const resp = await fetch(`http://localhost:3000/api/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP Error ${resp.status}`);
    }
    return await resp.json();
  } catch (error) {
    console.error(`API request to ${path} failed:`, error);
    throw new Error(`Network error: ${error.message}`);
  }
}

/* ======= UI HELPERS ======= */
function showLoading(element, message) {
  if (element) element.innerHTML = `<p class="loading">${message}</p>`;
}
function showError(element, message, details = "") {
  if (element) {
    element.innerHTML = `
      <div class="error" style="color:red;">
        <p>${escapeHTML(message)}</p>
        ${details ? `<p><small>${escapeHTML(details)}</small></p>` : ""}
      </div>
    `;
  }
}
function disableButtons(disable = true) {
  document.querySelectorAll("button").forEach((btn) => (btn.disabled = disable));
}

/* ======= STEP NAVIGATION ======= */
function nextStep(stepNum) {
  document.querySelectorAll(".step").forEach((s) => s.classList.remove("active"));
  const newStep = document.getElementById(`step${stepNum}`);
  if (newStep) {
    newStep.classList.add("active");
    newStep.scrollIntoView({ behavior: "smooth" });
  }
}

/* ======= CHARACTER GENERATION ======= */
async function generateCharacter() {
  if (isProcessing) return;
  const inputEl = document.getElementById("characterPrompt");
  const resultEl = document.getElementById("characterResult");
  if (!inputEl || !resultEl) return;

  const prompt = inputEl.value.trim();
  if (!validateInput(prompt)) return alert("Please enter a valid character description.");

  isProcessing = true;
  disableButtons(true);
  showLoading(resultEl, "Creating your character... ✨");

  try {
    // 1. Generate character description
    const descriptionData = await makeAPIRequest("chat", {
      model: "hackathon/qwen3",
      messages: [
        {
          role: "user",
          content: `Create a detailed description for a fairy tale character based on: "${prompt}". Include physical appearance, clothing, and distinctive features. Respond with just the description.`,
        },
      ],
      temperature: 0.7,
    });

    const description = (descriptionData.choices?.[0]?.message?.content || "A wonderful fairy tale character").trim();

    // 2. Generate character image
    showLoading(resultEl, "Drawing your character... 🎨");
    const imageData = await makeAPIRequest("image", {
      model: "hackathon/text2image",
      prompt: `Fairy tale character: ${description}, storybook illustration style, vibrant colors, high quality`,
      n: 1,
      size: "512x512",
    });

    let imgUrl = imageData.data?.[0]?.url;
    if (!imgUrl) {
      const item = imageData.data?.[0];
      const b64 = item?.b64_json || item?.image_base64 || item?.base64;
      if (b64) {
        imgUrl = `data:image/png;base64,${b64}`;
      }
    }
    characterImage = imgUrl || "https://via.placeholder.com/512";

    // Display results
    resultEl.innerHTML = `
      <h3>Your Character:</h3>
      <img src="${characterImage}" alt="Character Image" class="character-image" onerror="this.src='https://via.placeholder.com/512'" />
      <p>${renderTextToHTML(description)}</p>
    `;
    document.getElementById("nextStep1").style.display = "inline-block";

  } catch (err) {
    console.error("Character creation error:", err);
    showError(resultEl, "Something went wrong. Please try again.", err.message);
  } finally {
    isProcessing = false;
    disableButtons(false);
  }
}

/* ======= STORY GENERATION ======= */
async function generateStory() {
  if (isProcessing) return;
  const inputEl = document.getElementById("storyPrompt");
  const resultEl = document.getElementById("storyResult");
  if (!inputEl || !resultEl) return;

  const prompt = inputEl.value.trim();
  if (!validateInput(prompt)) return alert("Please enter a valid story prompt.");

  isProcessing = true;
  disableButtons(true);
  showLoading(resultEl, "Weaving your story... 📖");

  try {
    const storyData = await makeAPIRequest("chat", {
      model: "hackathon/qwen3",
      messages: [
        {
          role: "user",
          content: `Write a fairy tale story based on this plot: "${prompt}". The story should be about 300 words with a clear beginning, middle, and end.`,
        },
      ],
      temperature: 0.7,
    });

    storyText = (storyData.choices?.[0]?.message?.content || "Once upon a time...").trim();

    resultEl.innerHTML = `
      <h3>Your Story:</h3>
      <p>${renderTextToHTML(storyText)}</p>
    `;
    document.getElementById("nextStep2").style.display = "inline-block";
    document.getElementById("storyText").innerHTML = `<p>${renderTextToHTML(storyText)}</p>`;

  } catch (err) {
    console.error("Story generation error:", err);
    showError(resultEl, "Something went wrong. Please try again.", err.message);
  } finally {
    isProcessing = false;
    disableButtons(false);
  }
}

/* ======= VOICE SELECTION ======= */
function selectVoice(voice, el) {
  selectedVoice = voice;
  document.querySelectorAll(".voice-option").forEach((opt) => opt.classList.remove("selected"));
  if (el) el.classList.add("selected");
}

/* ======= NARRATION ======= */
async function narrateStory() {
  if (!storyText) return alert("Please generate your story first.");
  if (isProcessing) return;

  isProcessing = true;
  disableButtons(true);

  const statusEl = document.getElementById("narrationStatus");
  if (statusEl) statusEl.textContent = "Generating narration... 🎤";

  try {
    const resp = await fetch("http://localhost:3000/api/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "hackathon/text2speech",
        voice: selectedVoice || "sophia",
        input: storyText.substring(0, 1000),
      }),
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${resp.status}`);
    }

    const audioBlob = await resp.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    audio.play();
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      if (statusEl) statusEl.textContent = "";
    };
  } catch (err) {
    console.error("Narration error:", err);
    alert(`Narration failed: ${err.message}`);
    if (statusEl) statusEl.textContent = "";
  } finally {
    isProcessing = false;
    disableButtons(false);
  }
}

/* ======= SAVE STORY ======= */
function saveStory() {
  if (!storyText) return alert("Please generate your story first");
  try {
    const storyHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>My Fairy Tale</title>
<style>
  body {
    font-family: 'Georgia', serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
    line-height: 1.6;
    color: #333;
    background-color: #fff9f0;
  }
  h1 {
    color: #8b4513;
    text-align: center;
    border-bottom: 2px solid #deb887;
  }
  img {
    display: block;
    margin: 20px auto;
    max-width: 100%;
    border-radius: 8px;
  }
</style>
</head>
<body>
<h1>My Fairy Tale</h1>
${characterImage ? `<img src="${characterImage}" alt="Character Image" />` : ""}
<pre style="white-space: pre-wrap; font-family: serif;">${escapeHTML(storyText)}</pre>
</body>
</html>`;

    const blob = new Blob([storyHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "my-fairy-tale.html";
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error("Save story error:", err);
    alert("Failed to save story");
  }
}
