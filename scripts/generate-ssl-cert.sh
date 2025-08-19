#!/bin/bash

# Generate SSL certificates for local development
mkdir -p ssl

# Generate private key
openssl genrsa -out ssl/server.key 2048

# Generate certificate signing request
openssl req -new -key ssl/server.key -out ssl/server.csr -subj "/C=US/ST=Local/L=Local/O=KaraokeHub/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -days 365 -in ssl/server.csr -signkey ssl/server.key -out ssl/server.crt

# Create combined certificate file
cat ssl/server.crt ssl/server.key > ssl/server.pem

echo "SSL certificates generated in ssl/ directory"
echo "You can now use https://localhost:8000 for development"
