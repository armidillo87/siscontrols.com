#!/bin/bash
# ============================================
# Bearroot Digital — New Site Generator
# Usage: ./scripts/new-site.sh "Client Name"
# ============================================

set -e

CLIENT_NAME="$1"

if [ -z "$CLIENT_NAME" ]; then
    echo "Usage: ./scripts/new-site.sh \"Client Name\""
    echo "Example: ./scripts/new-site.sh \"Acme Landscaping\""
    exit 1
fi

# Paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_DIR="$(dirname "$SCRIPT_DIR")"
SITES_DIR="$(dirname "$TEMPLATE_DIR")"
CLIENT_DIR="$SITES_DIR/Clients/$CLIENT_NAME"
SLUG=$(echo "$CLIENT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-')

echo ""
echo "============================================"
echo "  Bearroot Digital — New Site Generator"
echo "============================================"
echo ""
echo "  Client: $CLIENT_NAME"
echo "  Slug:   $SLUG"
echo "  Path:   $CLIENT_DIR/$SLUG-astro"
echo ""

# Check if already exists
if [ -d "$CLIENT_DIR/$SLUG-astro" ]; then
    echo "ERROR: Site already exists at $CLIENT_DIR/$SLUG-astro"
    exit 1
fi

# Copy template
echo "[1/4] Copying template..."
mkdir -p "$CLIENT_DIR"
cp -r "$TEMPLATE_DIR" "$CLIENT_DIR/$SLUG-astro"

# Remove template-specific files
rm -rf "$CLIENT_DIR/$SLUG-astro/scripts/new-site.sh"
rm -rf "$CLIENT_DIR/$SLUG-astro/SETUP.md"

# Update package.json name
cd "$CLIENT_DIR/$SLUG-astro"
if command -v sed &> /dev/null; then
    sed -i "s/\"name\": \"client-site\"/\"name\": \"$SLUG\"/" package.json
fi

# Init git
echo "[2/4] Initializing git repo..."
git init
git checkout -b staging

# Install dependencies
echo "[3/4] Installing dependencies..."
npm install

# Summary
echo ""
echo "[4/4] Done!"
echo ""
echo "============================================"
echo "  Site created at:"
echo "  $CLIENT_DIR/$SLUG-astro"
echo ""
echo "  Next steps:"
echo "  1. Fill in ONBOARDING.md with client"
echo "  2. Add logo to src/assets/img/logo.png"
echo "  3. Fill in src/data/site-config.json"
echo "  4. Fill in src/data/services.json"
echo "  5. Fill in src/data/cities.json"
echo "  6. Fill in src/data/copy.json"
echo "  7. npm run dev"
echo "============================================"
echo ""
