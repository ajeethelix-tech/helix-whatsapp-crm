#!/bin/bash
# ============================================================
# HELIX BIOFAST LABS WhatsApp Bot — Oracle Cloud Server Setup
# Run this script on your Oracle Cloud Ubuntu VM
#
# Usage: bash setup-server.sh
# ============================================================

set -e  # stop on any error

echo ""
echo "============================================"
echo "  Helix BioFast Labs Bot — Server Setup"
echo "============================================"
echo ""

# --- Update system ---
echo "[1/6] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# --- Install Node.js 20 ---
echo ""
echo "[2/6] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# --- Install n8n ---
echo ""
echo "[3/6] Installing n8n..."
sudo npm install -g n8n

echo "n8n version: $(n8n --version)"

# --- Create project directory ---
echo ""
echo "[4/6] Setting up project directory..."
mkdir -p ~/helix-bot
cd ~/helix-bot

# Write package.json
cat > package.json << 'PKGEOF'
{
  "name": "helix-whatsapp-bot",
  "version": "2.0.0",
  "description": "Helix BioFast Labs WhatsApp Bot",
  "main": "whatsapp-bridge.js",
  "scripts": { "start": "node whatsapp-bridge.js" },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.7.0",
    "@hapi/boom": "^10.0.1",
    "qrcode": "^1.5.3",
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "pino": "^8.17.0"
  }
}
PKGEOF

echo "Installing npm packages (may take 2-3 minutes)..."
npm install

# --- Set up systemd services ---
echo ""
echo "[5/6] Creating auto-start services..."

# n8n service
sudo tee /etc/systemd/system/helix-n8n.service > /dev/null << 'SVCEOF'
[Unit]
Description=Helix BioFast Labs n8n Automation Engine
After=network.target

[Service]
Type=simple
User=ubuntu
Environment=HOME=/home/ubuntu
Environment=N8N_PORT=5678
WorkingDirectory=/home/ubuntu
ExecStart=/usr/bin/n8n start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=helix-n8n

[Install]
WantedBy=multi-user.target
SVCEOF

# WhatsApp bridge service
sudo tee /etc/systemd/system/helix-bridge.service > /dev/null << 'SVCEOF'
[Unit]
Description=Helix BioFast Labs WhatsApp Bridge
After=network.target helix-n8n.service
Wants=helix-n8n.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/helix-bot
ExecStart=/usr/bin/node /home/ubuntu/helix-bot/whatsapp-bridge.js
Restart=always
RestartSec=15
StandardOutput=journal
StandardError=journal
SyslogIdentifier=helix-bridge

[Install]
WantedBy=multi-user.target
SVCEOF

# Enable services (auto-start on server boot)
sudo systemctl daemon-reload
sudo systemctl enable helix-n8n
sudo systemctl enable helix-bridge

# --- Open firewall ports ---
echo ""
echo "[6/6] Opening firewall ports..."
sudo ufw allow 3000/tcp comment 'Helix WhatsApp Bridge + QR Code'
sudo ufw allow 5678/tcp comment 'Helix n8n Editor'
sudo ufw --force enable

echo ""
echo "============================================"
echo "  Setup Complete!"
echo ""
echo "  NEXT STEPS:"
echo ""
echo "  1. Copy whatsapp-bridge.js to ~/helix-bot/"
echo "     (using scp or paste the file content)"
echo ""
echo "  2. Start both services:"
echo "     sudo systemctl start helix-n8n"
echo "     sudo systemctl start helix-bridge"
echo ""
echo "  3. Open in your browser to scan QR:"
echo "     http://$(curl -s ifconfig.me):3000/qr"
echo ""
echo "  4. Open n8n editor:"
echo "     http://$(curl -s ifconfig.me):5678"
echo ""
echo "  Both services auto-start on every reboot!"
echo "============================================"
