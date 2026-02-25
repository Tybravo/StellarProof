#!/bin/bash

# Deployment script for Provenance Contract
# This script builds, deploys, and tests the provenance contract on Stellar testnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NETWORK="testnet"
IDENTITY="provenance-deployer"

echo -e "${GREEN}=== Provenance Contract Deployment ===${NC}\n"

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    echo -e "${RED}Error: stellar CLI not found${NC}"
    echo "Install it with: cargo install --locked stellar-cli --features opt"
    exit 1
fi

echo -e "${YELLOW}Step 1: Building contract...${NC}"
cargo build --release --target wasm32-unknown-unknown
echo -e "${GREEN}✓ Build complete${NC}\n"

# Check if identity exists, create if not
if ! stellar keys show $IDENTITY &> /dev/null; then
    echo -e "${YELLOW}Step 2: Creating identity '$IDENTITY'...${NC}"
    stellar keys generate --global $IDENTITY --network $NETWORK
    echo -e "${GREEN}✓ Identity created${NC}\n"
    
    echo -e "${YELLOW}Step 3: Funding identity from friendbot...${NC}"
    stellar keys fund $IDENTITY --network $NETWORK
    echo -e "${GREEN}✓ Identity funded${NC}\n"
else
    echo -e "${GREEN}✓ Identity '$IDENTITY' already exists${NC}\n"
fi

# Get the identity address
DEPLOYER_ADDRESS=$(stellar keys address $IDENTITY)
echo -e "Deployer address: ${GREEN}$DEPLOYER_ADDRESS${NC}\n"

echo -e "${YELLOW}Step 4: Deploying contract...${NC}"
CONTRACT_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/provenance.wasm \
    --source $IDENTITY \
    --network $NETWORK)

echo -e "${GREEN}✓ Contract deployed${NC}"
echo -e "Contract ID: ${GREEN}$CONTRACT_ID${NC}\n"

# Save contract ID to file
echo $CONTRACT_ID > .contract-id
echo -e "Contract ID saved to .contract-id\n"

echo -e "${YELLOW}Step 5: Initializing contract...${NC}"
# For now, we'll use the deployer as the oracle address
# In production, this should be the actual oracle contract address
ORACLE_ADDRESS=$DEPLOYER_ADDRESS

stellar contract invoke \
    --id $CONTRACT_ID \
    --source $IDENTITY \
    --network $NETWORK \
    -- initialize \
    --oracle $ORACLE_ADDRESS

echo -e "${GREEN}✓ Contract initialized with oracle: $ORACLE_ADDRESS${NC}\n"

echo -e "${YELLOW}Step 6: Testing mint function...${NC}"
# Create a test recipient address
RECIPIENT_ADDRESS=$DEPLOYER_ADDRESS

# Mint a test certificate
CERT_ID=$(stellar contract invoke \
    --id $CONTRACT_ID \
    --source $IDENTITY \
    --network $NETWORK \
    -- mint \
    --to $RECIPIENT_ADDRESS \
    --details '{"content_hash":"test_hash_123","metadata":"test deployment certificate"}')

echo -e "${GREEN}✓ Test certificate minted with ID: $CERT_ID${NC}\n"

echo -e "${YELLOW}Step 7: Verifying certificate...${NC}"
CERTIFICATE=$(stellar contract invoke \
    --id $CONTRACT_ID \
    --source $IDENTITY \
    --network $NETWORK \
    -- get_certificate \
    --certificate_id $CERT_ID)

echo -e "${GREEN}✓ Certificate retrieved:${NC}"
echo "$CERTIFICATE"
echo ""

echo -e "${GREEN}=== Deployment Complete ===${NC}\n"
echo -e "Contract ID: ${GREEN}$CONTRACT_ID${NC}"
echo -e "Oracle Address: ${GREEN}$ORACLE_ADDRESS${NC}"
echo -e "Network: ${GREEN}$NETWORK${NC}"
echo -e "\nYou can interact with the contract using:"
echo -e "  stellar contract invoke --id $CONTRACT_ID --source $IDENTITY --network $NETWORK -- <function_name> <args>"
