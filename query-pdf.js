(async function () {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) {
      window.postMessage({ type: 'getSelectedTextReply', selectedText: '' }, '*');
      return;
    }
  
    try {
      // Locate the PDF.js viewer's text content layer
      const textLayers = document.querySelectorAll('.textLayer div');
  
      if (!textLayers.length) {
        console.warn('No text layers found in the PDF viewer.');
        window.postMessage({ type: 'getSelectedTextReply', selectedText }, '*');
        return;
      }
  
      // Iterate through text layers to match the selected text
      let extractedText = '';
      for (const textLayer of textLayers) {
        if (selectedText.includes(textLayer.textContent.trim())) {
          extractedText += `${textLayer.textContent.trim()} `;
        }
      }
  
      // Send the matched text back
      window.postMessage(
        { type: 'getSelectedTextReply', selectedText: extractedText.trim() || selectedText },
        '*'
      );
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      window.postMessage({ type: 'getSelectedTextReply', selectedText }, '*');
    }
  })();
  


// // Use the embedded plugin's postMessage API to retrieve the selected text
// document.querySelector('embed').postMessage({ type: 'getSelectedText' }, '*');
