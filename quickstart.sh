#!/bin/bash
# Quick Start Script for Anivo Animation

echo "🎨 Anivo Animation - Quick Start"
echo "================================"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v)
echo "✓ Node.js version: $NODE_VERSION"
echo ""

# Determine OS
if [[ "$OSTYPE" == "win32" || "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    OS_TYPE="Windows"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="macOS"
else
    OS_TYPE="Linux"
fi

echo "Using Operating System: $OS_TYPE"
echo ""
echo "=== STEP 1: Get Google OAuth Credentials ==="
echo "1. Go to https://console.cloud.google.com/"
echo "2. Create a new project"
echo "3. Enable Google+ API"
echo "4. Create OAuth 2.0 Web Application credentials"
echo "5. Add authorized origins:"
echo "   - http://localhost:3111"
echo "   - https://goofy0337.github.io"
echo "6. Copy your Client ID"
echo ""

read -p "Press ENTER when you have your Google Client ID..."
echo ""

echo "=== STEP 2: Setup Backend ==="
echo "Frontend will now setup..."
cd backend || exit 1

if [ ! -f .env ]; then
    echo "Creating .env file in backend..."
    read -p "Enter your JWT_SECRET (generate a random string): " JWT_SECRET
    read -p "Enter your GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
    
    cat > .env << EOF
JWT_SECRET=$JWT_SECRET
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
PORT=4567
EOF
    echo "✓ .env file created"
else
    echo "✓ .env file already exists"
fi

echo ""
echo "Installing backend dependencies..."
npm install > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Backend dependencies installed"
else
    echo "✗ Failed to install backend dependencies"
    exit 1
fi

echo ""
echo "=== STEP 3: Setup Frontend ==="
cd ../frontend || exit 1

if [ ! -f .env ]; then
    echo "Creating .env file in frontend..."
    read -p "Enter your GOOGLE_CLIENT_ID (same as backend): " GOOGLE_CLIENT_ID
    
    cat > .env << EOF
VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
VITE_API_URL=/api
EOF
    echo "✓ .env file created"
else
    echo "✓ .env file already exists"
fi

echo ""
echo "Installing frontend dependencies..."
npm install > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Frontend dependencies installed"
else
    echo "✗ Failed to install frontend dependencies"
    exit 1
fi

echo ""
echo "================================"
echo "✓ Setup Complete!"
echo "================================"
echo ""
echo "To start the application:"
echo ""
echo "1. Open TWO terminals"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "Terminal 2 - Frontend:"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Then visit: http://localhost:3111"
echo ""
echo "For detailed setup, see GOOGLE_SIGNIN_SETUP.md"
echo ""
