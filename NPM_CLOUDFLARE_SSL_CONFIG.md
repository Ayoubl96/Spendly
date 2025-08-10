# NPM with Cloudflare Tunnel SSL Configuration

## Problem
Let's Encrypt certificate generation fails when using Nginx Proxy Manager behind Cloudflare tunnel because Let's Encrypt cannot reach your server directly to verify domain ownership.

## Solution: Use Cloudflare SSL

### 1. Cloudflare Dashboard Configuration

#### SSL/TLS Settings:
1. Go to **SSL/TLS** → **Overview**
2. Set **SSL mode** to **Full** 
3. Enable **Always Use HTTPS**
4. Go to **SSL/TLS** → **Edge Certificates**
5. Enable **HTTP Strict Transport Security (HSTS)**

#### DNS Settings:
- Ensure `spendly.ayoublefhim.com` is **Proxied** (orange cloud)
- TTL: Auto

### 2. NPM Configuration (No SSL)

#### Proxy Host Settings:
```
Domain Names: spendly.ayoublefhim.com
Scheme: http
Forward Hostname/IP: spendly-frontend  
Forward Port: 80

SSL Tab: 
- No SSL certificate
- Do not force SSL (Cloudflare handles this)

Advanced Tab:
```
```nginx
# API routes
location /api/ {
    proxy_pass http://spendly-backend:8001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    client_max_body_size 50m;
}

location /uploads/ {
    proxy_pass http://spendly-backend:8001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 50m;
}
```

### 3. Architecture Flow
```
Browser → Cloudflare (HTTPS) → Tunnel (HTTP) → NPM (HTTP) → Containers
         ↑                     ↑
    SSL Termination      No SSL needed
```

### 4. Benefits
- ✅ Cloudflare handles SSL certificates automatically
- ✅ No Let's Encrypt rate limits
- ✅ Better performance (SSL termination at edge)
- ✅ Built-in DDoS protection
- ✅ Simpler configuration

### 5. Testing
After configuration:
1. Test: `https://spendly.ayoublefhim.com`
2. Verify SSL certificate shows "Cloudflare Inc ECC CA-3"
3. Check response headers for Cloudflare
4. Test API endpoints: `https://spendly.ayoublefhim.com/api/v1/health`

## Alternative: DNS Challenge (If you need Let's Encrypt)

### 1. Create Cloudflare API Token
1. Go to Cloudflare dashboard → **My Profile** → **API Tokens**
2. Create token with permissions:
   - Zone:Zone:Read
   - Zone:DNS:Edit
   - Include: Specific zone: ayoublefhim.com

### 2. NPM DNS Challenge Configuration
When creating SSL certificate in NPM:
- **DNS Challenge**: Yes
- **DNS Provider**: Cloudflare  
- **Credentials**: Paste your API token
- **Propagation Seconds**: 120

### 3. Certificate Generation
NPM will:
1. Create TXT record for verification
2. Let's Encrypt verifies via DNS
3. Certificate is issued
4. TXT record is cleaned up

## Troubleshooting

### Cloudflare SSL Mode Issues
- **Flexible**: Browser ↔ Cloudflare (HTTPS), Cloudflare ↔ Server (HTTP) - Can cause redirect loops
- **Full**: Browser ↔ Cloudflare (HTTPS), Cloudflare ↔ Server (HTTP/HTTPS) - Recommended
- **Full (Strict)**: Requires valid certificate on server - Use only if you have Let's Encrypt working

### NPM Behind Cloudflare Checklist
- [ ] Cloudflare SSL mode set to "Full"
- [ ] NPM proxy host configured for HTTP only
- [ ] Cloudflare tunnel points to port 80 (not 443)
- [ ] No SSL certificate configured in NPM
- [ ] API routes configured in NPM Advanced tab
