(() => {
  // Function to resolve relative URLs to absolute
  const resolveUrl = (url) => {
    try {
      // Use document.baseURI as the base for resolving relative URLs
      return new URL(url, document.baseURI).href;
    } catch (e) {
      console.warn(`Page Code Extractor: Could not resolve URL: ${url}`, e);
      return null; // Skip invalid URLs
    }
  };

  // --- Collect Resources --- 

  const html = document.documentElement.outerHTML;
  const resourceUrls = new Set(); // Use a Set to avoid duplicates
  const pageTitle = document.title || window.location.hostname; 

  // 1. Linked Stylesheets
  document.querySelectorAll('link[rel="stylesheet"][href]').forEach(link => {
    const resolved = resolveUrl(link.href);
    if (resolved) resourceUrls.add(resolved);
  });

  // 2. External Scripts
  document.querySelectorAll('script[src]').forEach(script => {
    const resolved = resolveUrl(script.src);
    if (resolved) resourceUrls.add(resolved);
  });

  // 3. Inline Styles (Consider extracting later if needed)
  // document.querySelectorAll('style').forEach((styleTag, index) => {
  //   const content = styleTag.innerHTML;
  //   // To extract: Decide on naming (e.g., inline_style_1.css) and 
  //   // adjust messaging protocol to send content along with URLs.
  // });

  // 4. Inline Scripts (Consider extracting later if needed)
  // document.querySelectorAll('script:not([src])').forEach((scriptTag, index) => {
  //   const content = scriptTag.innerHTML;
  //   // To extract: Decide on naming (e.g., inline_script_1.js) and 
  //   // adjust messaging protocol.
  // });

  // --- Return Results --- 
  // The executeScript call expects the last expression to be the result.
  return { 
    html,
    resourceUrls: Array.from(resourceUrls), // Convert Set to Array for messaging
    pageTitle
  };
})(); 