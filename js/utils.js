// API Helper Functions
export async function makeAPIRequest(path, payload) {
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

// UI Helper Functions
export function showLoading(element, message) {
    if (element) {
        element.innerHTML = `<div class="loading">${message}</div>`;
    }
}

export function showError(element, message, details = "") {
    if (element) {
        element.innerHTML = `
            <div class="error">
                <p>${escapeHTML(message)}</p>
                ${details ? `<p><small>${escapeHTML(details)}</small></p>` : ""}
            </div>
        `;
    }
}

export function escapeHTML(str = "") {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

export function renderTextToHTML(str = "") {
    return escapeHTML(str).replace(/\n/g, "<br>");
}

// Dice Roll Functions
export function rollDice(sides = 20) {
    return Math.floor(Math.random() * sides) + 1;
}

export function rollMultipleDice(count, sides) {
    return Array.from({ length: count }, () => rollDice(sides));
}