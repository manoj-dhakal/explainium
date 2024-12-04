// sidepanel.js (Unified Script)

// Import required libraries
import DOMPurify from "dompurify";
import { marked } from "marked";

document.addEventListener("DOMContentLoaded", function () {
  console.log("Side panel loaded.");

  // Elements and variables
  const responseElement = document.getElementById("response");
  const loadingElement = document.getElementById("loading");
  const errorElement = document.getElementById("error");
  const temperatureSlider = document.getElementById("temperature");
  const topKSlider = document.getElementById("top-k");
  const temperatureLabel = document.getElementById("label-temperature");
  const topKLabel = document.getElementById("label-top-k");
  const settingsPanel = document.getElementById("settings-panel");
  const toggleSettingsButton = document.getElementById("toggle-settings");
  const toggleThemeButton = document.getElementById("toggle-theme");
  const modeText = document.getElementById("mode-text");
  const modeEli5 = document.getElementById("mode-eli5");
  const modePro = document.getElementById("mode-pro");
  const contentElement = document.getElementById("content");

  let session;
  let selectedMode = "eli5"; // Default mode

  // Initialize mode text
  updateModeText();

  // Update slider labels
  temperatureSlider.addEventListener("input", () => {
    temperatureLabel.textContent = temperatureSlider.value;
  });

  topKSlider.addEventListener("input", () => {
    topKLabel.textContent = topKSlider.value;
  });

  // Toggle settings panel
  toggleSettingsButton.addEventListener("click", () => {
    settingsPanel.toggleAttribute("hidden");
  });

  // Toggle dark/light mode
  toggleThemeButton.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
  });

  // Update mode text and systemPrompt based on selected mode
  modeEli5.addEventListener("change", () => {
    selectedMode = "eli5";
    updateModeText();
  });

  modePro.addEventListener("change", () => {
    selectedMode = "pro";
    updateModeText();
    showResponse("Select text to get started!");
  });


  // Listen for messages from background.js
  chrome.runtime.onMessage.addListener(async (message) => {
    if (message.type === "NEW_TEXT") {
      const text = message.text;
      console.log("Selected text:", text);

      showLoading();

      const params = {
        systemPrompt: getSystemPrompt(),
        // temperature: parseFloat(temperatureSlider.value),
        // topK: parseInt(topKSlider.value, 10),
        temperature: 0.3,
        topK: 1,
      };
      console.log("Prompt parameters:", params);

      try {
        const response = await runPrompt(text, params);
        showResponse(response);
      } catch (error) {
        showError(error.message || "An error occurred.");
      }
    } else if (message.action === "sendExtractedText") {
      console.log("Extracted text received in side panel:", message.text);
      contentElement.textContent = message.text; // Show in the content area
    }
  });

  // Helper functions
  function updateModeText() {
    if (selectedMode === "eli5") {
      modeText.textContent = "Your tool to explain things like you're five!";
    } else {
      modeText.textContent = "Your tool to study anything like a pro!";
    }
  }

  function getSystemPrompt() {
    return selectedMode === "eli5"
      ? "Explain the following like I'm five in 100 words  "
      : "Explain this topic to an academician that is someone doing undergraduate studies in the related field in 100 words";
  }

  async function runPrompt(prompt, params) {
    try {
      // if (!session) {
        session = await chrome.aiOriginTrial.languageModel.create(params);
      // }
      return session.prompt(prompt);
    } catch (e) {
      console.error("Prompt failed:", e);
      reset();
      throw e;
    }
  }

  async function reset() {
    if (session) {
      await session.destroy();
    }
    session = null;
  }

  function showLoading() {
    responseElement.hidden = true;
    errorElement.hidden = true;
    loadingElement.hidden = false;
  }

  function showResponse(response) {
    loadingElement.hidden = true;
    errorElement.hidden = true;
    responseElement.hidden = false;

    // Sanitize and render formatted response
    const sanitizedHTML = DOMPurify.sanitize(marked.parse(response));
    responseElement.innerHTML = sanitizedHTML;
  }

  function showError(error) {
    loadingElement.hidden = true;
    responseElement.hidden = true;
    errorElement.hidden = false;
    errorElement.textContent = error;
  }
});
