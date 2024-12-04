// background.js

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

let lastSelectedText = "";

// Function to get selected text from a webpage
function getSelectedTextFromWebpage() {
  const selection = window.getSelection();
  console.log("Selection object:", selection);
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    console.log("Selected text from webpage:", selectedText);
    return selectedText;
  }
  console.error("Could not read the selected text.");
  return "Could not read the selected text.";
}

// Function to periodically check for selected text
function checkForSelectedText(tabId) {
  const intervalId = setInterval(async () => {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: getSelectedTextFromWebpage,
      });

      const selectedText = result.result;
      console.log("Selected text from webpage:", selectedText);

      if (selectedText && selectedText !== lastSelectedText) {
        lastSelectedText = selectedText;
        // Forward the selected text to the side panel
        chrome.runtime.sendMessage({ type: "NEW_TEXT", text: selectedText });
      }

      sendResponse({ status: "success", message: "Webpage text extracted." });
      clearInterval(intervalId); // Stop checking once text is found
    } catch (error) {
      console.error("Error extracting text from webpage:", error);
      sendResponse({ status: "error", message: error.message });
      clearInterval(intervalId); // Stop checking on error
    }
  }, 5000); // Check every second
}

// Execute the logic as soon as the webpage is loaded or updated
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Ensure the tab is fully loaded and has a valid URL
  if (changeInfo.status === "complete" && tab.url) {
    console.log("Tab loaded. Evaluating:", tab);

    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        if (activeTab && activeTab.id) {
          console.log("Evaluating tab:", activeTab);

          // Check if the current tab's URL indicates a PDF
          const isPdf = /\.pdf($|\?)/i.test(activeTab.url); // Robust PDF check
          console.log("isPdf:", isPdf);

          if (!isPdf) {
            // For normal webpages, use checkForSelectedText
            checkForSelectedText(activeTab.id);
          } else {
            // Handle PDFs
            try {
              console.log("Injecting PDF-specific content script.");
              await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ["content.js"],
              });
            } catch (error) {
              console.error("Error injecting PDF content script:", error);
            }
          }
        }
      }
    });
  }

  return true; // Keep the message channel open for async response
});

// Message listener to handle explicit requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_SELECTED_TEXT") {
    const tabId = sender.tab.id;
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        if (activeTab && activeTab.id) {
          // Check if the current tab's URL indicates a PDF
          const isPdf = /\.pdf($|\?)/i.test(activeTab.url); // Robust PDF check
          if (!isPdf) {
            checkForSelectedText(activeTab.id);
          }
        }
      }
    });
    return true; // Keep the message channel open for async response
  }
});

// Example: Browser action click to trigger text extraction
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        if (activeTab && activeTab.id) {
          // Check if the current tab's URL indicates a PDF
          const isPdf = /\.pdf($|\?)/i.test(activeTab.url); // Robust PDF check
          if (!isPdf) {
            chrome.runtime.sendMessage({ type: "GET_SELECTED_TEXT" }, (response) => {
              if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError);
              } else {
                console.log("Response from background script:", response);
              }
            });
          }
        }
      }
    });
  }
});
// Message listener to handle selected text from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "NEW_TEXT") {
    const selectedText = message.text;
    console.log("Received selected text from pdf content script:", selectedText);

    if (selectedText && selectedText !== lastSelectedText) {
      lastSelectedText = selectedText;
      // Forward the selected text to the side panel
      chrome.runtime.sendMessage({ type: "NEW_TEXT", text: selectedText });
    }

    sendResponse({ status: "success", message: "Text received." });
  }
});
