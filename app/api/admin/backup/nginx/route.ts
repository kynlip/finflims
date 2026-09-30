import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { promises as fs } from 'fs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Known Nginx configuration paths on production VPS
const POSSIBLE_NGINX_PATHS = [
  '/etc/nginx/sites-enabled/phimhayhonro.net',
  '/etc/nginx/sites-available/phimhayhonro.net',
  '/etc/nginx/conf.d/phimhayhonro.net.conf',
  '/etc/nginx/sites-enabled/default',
  '/etc/nginx/conf.d/default.conf',
];

async function findNginxConfigFile(): Promise<{ path: string; content: string } | null> {
  for (const p of POSSIBLE_NGINX_PATHS) {
    try {
      const content = await fs.readFile(/*turbopackIgnore: true*/ p, 'utf-8');
      return { path: p, content };
    } catch {
      // Continue searching
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const adminCheck = await verifyAdminAuth();
  if (!adminCheck.isAuthorized) {
    return adminCheck.errorResponse;
  }

  const { searchParams } = new URL(request.url);
  const download = searchParams.get('download') === '1';

  try {
    const nginxData = await findNginxConfigFile();

    if (!nginxData) {
      // Fallback sample configuration if running locally or permissions restricted
      const sampleNginxConfig = `# Cấu hình Nginx mẫu cho phimhayhonro.net (/etc/nginx/sites-enabled/phimhayhonro.net)
server {
    listen 80;
    listen [::]:80;
    server_name phimhayhonro.net www.phimhayhonro.net;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name phimhayhonro.net www.phimhayhonro.net;

    # SSL Configuration (Let's Encrypt / Certbot)
    ssl_certificate /etc/letsencrypt/live/phimhayhonro.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/phimhayhonro.net/privkey.pem;

    # Proxy to Next.js PM2 (port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static uploads caching & direct serve
    location /uploads/ {
        alias /home/phimhay/public/uploads/;
        expires 30d;
        access_log off;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    client_max_body_size 50M;
}
`;

      if (download) {
        return new Response(sampleNginxConfig, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': 'attachment; filename="phimhayhonro.net.conf"',
          },
        });
      }

      return NextResponse.json({
        success: true,
        exists: false,
        path: '/etc/nginx/sites-enabled/phimhayhonro.net',
        isSample: true,
        content: sampleNginxConfig,
      });
    }

    if (download) {
      return new Response(nginxData.content, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': 'attachment; filename="phimhayhonro.net.conf"',
        },
      });
    }

    return NextResponse.json({
      success: true,
      exists: true,
      path: nginxData.path,
      isSample: false,
      content: nginxData.content,
    });
  } catch (error) {
    console.error('Nginx backup error:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi lấy cấu hình Nginx';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
