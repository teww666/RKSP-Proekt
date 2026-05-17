#!/bin/sh
set -eu

export PORT="${PORT:-8080}"

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
