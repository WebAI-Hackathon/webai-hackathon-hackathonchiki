// utils.js - Optimized Version
export async function makeAPIRequest(path, payload) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`http://localhost:3000/api/${path}`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache"
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        
        clearTimeout(timeout);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Validate image response
        if (path === 'image' && !data.data?.[0]?.url && !data.data?.[0]?.b64_json) {
            throw new Error("Invalid image response");
        }
        
        return data;
    } catch (error) {
        console.error(`API request failed: ${error.message}`);
        throw error;
    }
}

export function showLoading(element, message) {
    if (!element) return;
    element.innerHTML = `<div class="loading-spinner"></div><p>${escapeHTML(message)}</p>`;
    element.style.display = 'block';
}

export function showError(element, message, details = "") {
    if (!element) return;
    element.innerHTML = `
        <div class="error-alert">
            <p>${escapeHTML(message)}</p>
            ${details ? `<details><summary>Details</summary>${escapeHTML(details)}</details>` : ""}
            <button onclick="this.parentElement.style.display='none'">Dismiss</button>
        </div>
    `;
    element.style.display = 'block';
}

export function escapeHTML(str = "") {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag]));
}

// Dice functions remain the same
export function rollDice(sides = 20) {
    return Math.floor(Math.random() * sides) + 1;
}

export function rollMultipleDice(count, sides) {
    return Array.from({ length: count }, () => rollDice(sides));
}