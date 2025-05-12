// Import JSZip (make sure jszip.min.js is in the extension's root)
try {
  importScripts('jszip.min.js');
} catch (e) {
  console.error("Page Code Extractor: Failed to load JSZip library. Make sure jszip.min.js is in the extension's root directory.", e);
}

// Listen for the extension action (toolbar icon) click
chrome.action.onClicked.addListener(async (tab) => {
  // Check if we can run on this tab
  if (!tab.id || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("about:")) {
    console.log("Page Code Extractor: Cannot extract from this type of page (e.g., internal chrome page, about:blank).");
    // Optional: Provide user feedback here (e.g., change icon, notification)
    return;
  }

  console.log(`Page Code Extractor: Initiating extraction for tab ${tab.id} (${tab.url})`);

  try {
    // Execute the content script in the active tab
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content_script.js']
    });

    // Check if script execution was successful and returned data
    if (chrome.runtime.lastError) {
        console.error(`Page Code Extractor: Script injection failed: ${chrome.runtime.lastError.message}`);
        return;
    }

    if (results && results[0] && results[0].result) {
      const { html, resourceUrls, pageTitle } = results[0].result;
      console.log(`Page Code Extractor: Received ${resourceUrls.length} resource URLs.`);
      // Proceed to process and download the collected data
      await processAndDownload(html, resourceUrls, pageTitle, tab.url);
    } else {
      console.error("Page Code Extractor: No result received from content script.");
      // Optional: Provide user feedback
    }
  } catch (error) {
    console.error("Page Code Extractor: Error during script execution or processing:", error);
    // Optional: Provide user feedback
  }
});

// Function to fetch resources, zip them, and trigger download
async function processAndDownload(html, resourceUrls, pageTitle, pageUrl) {
  if (typeof JSZip === 'undefined') {
    console.error("Page Code Extractor: JSZip is not loaded. Cannot create ZIP file.");
    // Optional: Provide user feedback
    return;
  }

  const zip = new JSZip();

  // Add the main HTML file
  zip.file("index.html", html);
  console.log("Page Code Extractor: Added index.html to ZIP.");

  const fetchPromises = [];

  // Create fetch promises for all resource URLs
  for (const url of resourceUrls) {
    fetchPromises.push(
      fetch(url)
        .then(response => {
          if (!response.ok) {
            console.warn(`Page Code Extractor: Failed to fetch ${url}: ${response.status} ${response.statusText}`);
            // Return an object indicating failure for this specific resource
            return { 
              originalUrl: url,
              name: generateSafeFilename(url, pageUrl) + ".fetch-error.txt", 
              content: `Failed to fetch ${url}\nStatus: ${response.status} ${response.statusText}`,
              isError: true
            };
          }
          // Get response as text (suitable for CSS, JS)
          // Note: For binary files (images, fonts), response.blob() would be needed.
          return response.text().then(text => ({
            originalUrl: url,
            name: generateSafeFilename(url, pageUrl),
            content: text,
            isError: false
          }));
        })
        .catch(error => {
          console.error(`Page Code Extractor: Network error fetching ${url}:`, error);
          // Return an object indicating failure
          return { 
            originalUrl: url,
            name: generateSafeFilename(url, pageUrl) + ".network-error.txt", 
            content: `Network error fetching ${url}\nError: ${error.message}`,
            isError: true
          };
        })
    );
  }

  // Wait for all fetch operations to complete (or fail)
  const fetchedFiles = await Promise.all(fetchPromises);
  console.log(`Page Code Extractor: Completed fetching ${fetchedFiles.length} resources.`);

  // Add fetched files (or error files) to the ZIP
  fetchedFiles.forEach(file => {
    if (file) { // Ensure the promise resolved to a valid object
      let path = file.name;
      // Basic directory structure within the zip
      if (!file.isError) {
          if (file.name.endsWith('.css')) path = `css/${file.name}`;
          else if (file.name.endsWith('.js')) path = `js/${file.name}`;
          // Add more rules here for images, fonts etc. if extending later
      } else {
          path = `errors/${file.name}`; // Put error files in a separate folder
      }
      zip.file(path, file.content);
      console.log(`Page Code Extractor: Added ${path} to ZIP.`);
    }
  });

  try {
    // Generate the ZIP file as a Blob
    console.log("Page Code Extractor: Generating ZIP file...");
    const blob = await zip.generateAsync({ type: "blob" });
    console.log("Page Code Extractor: ZIP generated.");

    // Sanitize the filename based on the page title
    const safePageTitle = (pageTitle || "page").replace(/[<>:"/\\|?*]+/g, '_'); // Replace forbidden characters
    const downloadFilename = `${safePageTitle}_extract_${Date.now()}.zip`;

    // Convert Blob to data URL to use with downloads API in service worker
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      
      // Use the downloads API to save the file using the data URL
      chrome.downloads.download({
        url: dataUrl, // Use the data URL here
        filename: downloadFilename,
        saveAs: true // Prompt user for save location
      }, (downloadId) => {
          if (chrome.runtime.lastError) {
              console.error(`Page Code Extractor: Download initiation failed: ${chrome.runtime.lastError.message}`);
          } else if (downloadId) {
              console.log(`Page Code Extractor: Download started with ID: ${downloadId}`);
          } else {
              console.warn(`Page Code Extractor: Download did not start (maybe cancelled by user or another issue).`);
          }
      });
    };
    reader.onerror = (event) => {
        console.error("Page Code Extractor: Error reading Blob as Data URL:", event.target.error);
    };
    reader.readAsDataURL(blob);

  } catch (error) {
    console.error("Page Code Extractor: Error generating or downloading ZIP:", error);
    // Optional: Notify user of ZIP generation/download failure
  }
}

// Function to generate a safe filename from a URL
function generateSafeFilename(urlString, pageBaseUrl) {
  let filename = "unknown_resource"; // Default
  try {
    // Resolve the URL relative to the page's base URL if necessary
    const url = new URL(urlString, pageBaseUrl);
    let path = url.pathname;

    // Basic extraction of filename from path
    if (path && path !== '/') {
      filename = path.substring(path.lastIndexOf('/') + 1);
    }

    // If filename is empty (e.g., root path like "/"), try using hostname
    if (!filename && url.hostname) {
        filename = url.hostname;
    }

    // Remove query parameters and hash
    filename = filename.split('?')[0].split('#')[0];

    // Ensure it's not empty after stripping
    if (!filename) {
        filename = `resource_${Date.now()}`;
    }

    // Basic check for common extensions if the derived name doesn't have one
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(filename);
    if (!hasExtension) {
        if (url.pathname.toLowerCase().includes('.css') || urlString.toLowerCase().includes('.css')) filename += '.css';
        else if (url.pathname.toLowerCase().includes('.js') || urlString.toLowerCase().includes('.js')) filename += '.js';
        // Add checks for other types if needed
    }

    // Sanitize the filename (replace forbidden characters)
    return filename.replace(/[<>:"/\\|?*\s]+/g, '_').substring(0, 200); // Limit length too
  } catch (e) {
    console.warn(`Page Code Extractor: Error parsing URL for filename: ${urlString}`, e);
    // Fallback for invalid URLs: use hash or timestamp
    // Simple timestamp fallback for now
    filename = `malformed_url_${Date.now()}.txt`;
    return filename.replace(/[<>:"/\\|?*\s]+/g, '_');
  }
} 