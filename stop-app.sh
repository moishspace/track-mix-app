#!/bin/bash

echo "🛑 Stopping Track Mix App..."

# Kill Electron
echo "📦 Killing Electron..."
pkill -f "electron"

# Kill React frontend
echo "🌐 Killing React frontend..."
pkill -f "react-scripts"

# Kill Node backend
echo "🧠 Killing Node backend..."
pkill -f "node .*server"

# Optionally kill Python if you run any audio mix processes
echo "🐍 Killing Python scripts (mixing)..."
pkill -f "python .*mix"

echo "✅ All components stopped."