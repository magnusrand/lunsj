#!/bin/bash

# Lunsj Development Server
echo "🚀 Starting Lunsj development server..."

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    echo "📡 Starting HTTP server on http://localhost:8000"
    echo "🔥 Make sure Firebase emulators are running: firebase emulators:start"
    echo "🌐 Opening browser..."
    
    # Start server in background
    python3 -m http.server 8000 &
    SERVER_PID=$!
    
    # Open browser
    open http://localhost:8000
    
    echo "✅ Development server started!"
    echo "📝 Press Ctrl+C to stop the server"
    
    # Wait for user to stop
    wait $SERVER_PID
else
    echo "❌ Python 3 not found. Please install Python 3 or use another HTTP server."
    echo "💡 Alternative: npx serve ."
fi
