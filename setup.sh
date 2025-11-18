#!/bin/bash

# Collections Strategy Management System - Automated Setup Script
# This script helps set up the development environment

set -e  # Exit on any error

echo "🚀 Collections Strategy Management System Setup"
echo "================================================"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v python &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.8+ from https://python.org"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+ from https://nodejs.org"
    exit 1
fi

if ! command -v conda &> /dev/null; then
    echo "❌ Conda not found. Please install Conda from https://conda.io"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Setup Conda environment
echo "🐍 Setting up Conda environment..."
if conda env list | grep -q "^serve "; then
    echo "Environment 'serve' already exists"
else
    conda create -n serve python=3.9 -y
fi

conda activate serve

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Setup frontend
echo "⚛️ Setting up frontend..."
cd frontend
npm install
cd ..

# Create .env template
if [ ! -f .env ]; then
    echo "📝 Creating .env template..."
    cat > .env << EOF
# OpenAI API Configuration (get key from https://platform.openai.com/api-keys)
# OPENAI_API_KEY=your-openai-api-key-here
# OPENAI_MODEL=gpt-4o-mini
# OPENAI_API_BASE_URL=https://api.openai.com/v1
EOF
    echo "✅ Created .env template - edit it to add your OpenAI API key"
else
    echo "ℹ️ .env file already exists"
fi

# Populate sample data
echo "🗄️ Setting up database with sample data..."
rm -f test.db
# python populate_mock_data.py

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To run the application:"
echo "1. Backend:  conda activate serve && uvicorn main:app --reload"
echo "2. Frontend: cd frontend && npm run dev"
echo ""
echo "Then visit:"
echo "- Frontend: http://localhost:3000"
echo "- API Docs: http://localhost:8000/docs"
echo ""
echo "Don't forget to add your OPENAI_API_KEY to the .env file for AI features!"
