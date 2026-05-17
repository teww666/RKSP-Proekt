#!/bin/sh
set -eu

export PORT="${PORT:-8080}"

# Публичный URL API для браузера (Railway: Variables → API_PUBLIC_URL)
API_PUBLIC_URL="${API_PUBLIC_URL:-${VITE_API_URL:-}}"

escape_js() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

SAFE_API="$(escape_js "$API_PUBLIC_URL")"
cat > /usr/share/nginx/html/config.js <<EOF
window.__MEETINGHUB_API__ = "${SAFE_API}";
EOF

if [ -n "${API_UPSTREAM:-}" ]; then
  envsubst '${PORT} ${API_UPSTREAM}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
else
  cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen       ${PORT};
    server_name  localhost;
    root   /usr/share/nginx/html;
    gzip on;
    gzip_types text/css application/javascript application/json;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
fi

exec "$@"
