#!/usr/bin/env python3
"""
Simple script to save itinerary data.
This can be run from the browser console or used as a simple HTTP server endpoint.
"""

import json
import sys
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse

class ItinerarySaveHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/save-itinerary':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            try:
                data = json.loads(post_data.decode('utf-8'))

                # Save to itinerary.json
                with open('itinerary.json', 'w') as f:
                    json.dump(data, f, indent=2)

                # Send success response
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'message': 'Itinerary saved successfully'}).encode())

                print(f"Itinerary saved with {len(data.get('trips', []))} trips")

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode())
        else:
            super().do_POST()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def main():
    if len(sys.argv) > 1 and sys.argv[1] == 'server':
        # Run as HTTP server
        server = HTTPServer(('localhost', 8001), ItinerarySaveHandler)
        print("Save server running on http://localhost:8001")
        print("Send POST requests to /api/save-itinerary")
        server.serve_forever()
    else:
        # Command line usage
        if len(sys.argv) > 1:
            json_data = sys.argv[1]
        else:
            json_data = input("Paste the JSON data: ")

        try:
            data = json.loads(json_data)
            with open('itinerary.json', 'w') as f:
                json.dump(data, f, indent=2)
            print(f"Itinerary saved with {len(data.get('trips', []))} trips")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    main()
