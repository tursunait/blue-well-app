#!/bin/bash

# Calorie Estimator API - Quick Setup Script
# This script automates the initial setup process

echo "🍔 Calorie Estimator API - Setup Script"
echo "========================================"
echo ""

# Check Python version
echo "Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "Found Python $PYTHON_VERSION"
echo ""

# Create virtual environment
echo "Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi
echo ""

# Activate virtual environment and install dependencies
echo "Installing dependencies..."
source venv/bin/activate
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt
echo "✓ Dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your OpenAI API key!"
    echo "   Run: nano .env"
    echo "   Or use your preferred text editor"
else
    echo "✓ .env file already exists"
fi
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your OpenAI API key to .env file"
echo "2. Activate the virtual environment: source venv/bin/activate"
echo "3. Run the server: uvicorn app.main:app --reload"
echo "4. Visit http://localhost:8000/docs for API documentation"
echo ""
echo "Need help? Check README.md for detailed instructions."
