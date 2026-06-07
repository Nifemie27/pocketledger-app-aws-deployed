#!/bin/bash
yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs git

# Clone the project (replace with your actual GitHub repo URL)
cd /home/ec2-user
git clone https://github.com/YOUR-USERNAME/pocketledger.git
cd pocketledger/backend

# Set environment variables — replace with your actual RDS endpoint
cat > .env << EOF
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=PocketLedger2024!
DB_NAME=pocketledger
DB_PORT=3306
PORT=4000
EOF

# Install dependencies
npm install

# Start the backend as a background service
npm start &

# Verify it is running
sleep 5
curl -s http://localhost:4000/health
