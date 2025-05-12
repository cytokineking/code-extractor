# Page Code Extractor Chrome Extension

This Chrome extension allows you to easily extract the core HTML, CSS, and JavaScript resources of the currently active webpage and download them as a single ZIP archive.

## Features

*   **One-Click Extraction**: Simply click the extension icon in your toolbar to start the process.
*   **Resource Fetching**: Automatically fetches externally linked CSS (`<link rel="stylesheet">`) and JavaScript (`<script src="...">`) files referenced in the HTML.
*   **Absolute URL Resolution**: Resolves relative resource URLs to absolute URLs based on the page's base URI.
*   **ZIP Packaging**: Bundles the main `index.html` and all successfully fetched resources into a `.zip` file using JSZip.
*   **Error Handling**: If a resource fails to fetch (e.g., 404 Not Found, network error), an error file is created in an `errors/` directory within the ZIP, detailing the issue.
*   **Safe Filenames**: Generates a safe filename for the ZIP archive based on the page title and a timestamp.

## Setup

1.  **Get the Code**:
    *   Ensure you have the following files in a single directory (e.g., `code-extractor/`):
        *   `manifest.json`
        *   `background.js`
        *   `content_script.js`
2.  **Add JSZip Library**:
    *   Download the `jszip.min.js` file from the [JSZip website](https://stuk.github.io/jszip/ - Click the "download" link for the minified version).
    *   Place the downloaded `jszip.min.js` file directly into the same directory as the other extension files.
3.  **Load the Extension in Chrome**:
    *   Open Chrome and navigate to `chrome://extensions/`.
    *   Enable "Developer mode" using the toggle switch (usually in the top-right corner).
    *   Click the "Load unpacked" button.
    *   Select the directory containing `manifest.json`, `background.js`, `content_script.js`, and `jszip.min.js`.
    *   The "Page Code Extractor" extension should now appear in your list of extensions and its icon should be visible in your toolbar.

## How to Use

1.  Navigate to the webpage you wish to extract.
2.  Click the "Page Code Extractor" icon in your Chrome toolbar.
3.  A "Save As" dialog box will appear. Choose a location and save the generated `.zip` file.

## ZIP File Structure

The downloaded ZIP file will typically contain the following structure:

```
your_page_title_extract_timestamp.zip
├── index.html          # The main outer HTML of the page
├── css/                # Directory for fetched CSS files
│   └── example_style.css
│   └── another_style.css
├── js/                 # Directory for fetched JavaScript files
│   └── script1.js
│   └── library.js
└── errors/             # Directory for fetch errors (if any)
    └── some_resource.css.fetch-error.txt
    └── another_script.js.network-error.txt
```

*   **`index.html`**: Contains the complete HTML source (`document.documentElement.outerHTML`) of the page at the time of extraction. Resource links within this file may still point to their original online locations.
*   **`css/`**: Contains the content of successfully fetched CSS files linked via `<link rel="stylesheet">`.
*   **`js/`**: Contains the content of successfully fetched JavaScript files linked via `<script src="...">`.
*   **`errors/`**: Contains `.txt` files for any linked CSS or JS resources that could not be fetched. The filename indicates the original resource, and the file content details the fetch error (e.g., HTTP status, network error message).

## Limitations and Notes

*   **Resource Scope**: The extension currently only extracts HTML, and linked CSS/JS files. It does **not** extract:
    *   Inline CSS (`<style>...</style>`) as separate files.
    *   Inline JavaScript (`<script>...</script>`) as separate files.
    *   Images, fonts, videos, or other asset types.
    *   Resources loaded via JavaScript after the initial page load (e.g., via fetch/XHR).
*   **Dynamic Content**: The extension captures the state of the DOM *at the moment the icon is clicked*. Content loaded or modified dynamically *after* the click will not be included in the `index.html`.
*   **Fetch Restrictions**: Fetching resources is subject to the browser's security policies, including Cross-Origin Resource Sharing (CORS). Some resources might be blocked from being fetched by the extension depending on the server's CORS configuration.
*   **Service Workers/Complex Apps**: For highly complex web applications, especially those heavily reliant on service workers or intricate JavaScript loading mechanisms, the extracted code might not fully represent the application's runnable state without significant manual adjustments.
*   **Internal Pages**: The extension cannot run on internal Chrome pages (e.g., `chrome://extensions`, `chrome://settings`) or `about:blank`. 