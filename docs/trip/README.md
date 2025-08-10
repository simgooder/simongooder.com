# Trip Itinerary Timeline

## How to Use

1. **Run a Local Web Server**
   - This app loads the itinerary data from a JSON file using fetch. Most browsers block fetch from `file://` URLs for security reasons.
   - To use the app, run a local web server in the project directory. For example, with Python 3:

     ```sh
     python3 -m http.server 8000
     ```

   - Then open [http://localhost:8000/index.html](http://localhost:8000/index.html) in your browser.

2. **Itinerary Data**
   - The itinerary data is stored in a separate JSON file (default: `itinerary.json`).
   - You can change the file loaded by calling `loadItinerary('yourfile.json')` in the browser console or in the code.


## Troubleshooting

- If you see a network error, make sure you are running a local web server and not opening the HTML file directly.
