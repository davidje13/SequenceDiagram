# This script was used to build sequence.davidje13.com

# It will install the sequence diagram code (and necessary environment)
# and install an nginx proxy server. It will also use the "let's encrypt"
# service to get SSH keys for the site.
# Security updates will be applied automatically. Other updates can be
# applied by running:

# sudo apt-get update;
# sudo apt-get dist-upgrade;
# sudo shutdown -r now;      # if needed
# sudo apt-get autoremove;

# The github code can be updated by running:
# sudo /var/www/sequence/update.sh

# The AWS configuration used:

# EC2:
#  Community AMI: ami-0b91bd72, T2.micro, 8GB (only uses ~2GB but this is the minimum)
#  Use a security group which allows 80 (public), 443 (public) and 22 (your ip)
#  (assign elastic IP)

# Route53:
#  A   <domain>          <elastic ip>               (1day)
#  A   www.<domain>      <elastic ip>               (1day)
#  A   sequence.<domain> <elastic ip>               (1day)
#  CAA <domain>          0 issue "letsencrypt.org"  (1day)

# Once the EC2 & Route53 config is done, log in to the box and run this script.
# Pass a single parameter: the main domain name (e.g. davidje13.com)

# You can easily download this script to the box by running:
# wget https://davidje13.github.io/SequenceDiagram/docs/ubuntu-nginx-installer.sh;
# chmod 0744 ubuntu-nginx-installer.sh;
# ./ubuntu-nginx-installer.sh

# thanks,
# https://gist.github.com/nrollr/9a39bb636a820fb97eec2ed85e473d38
# https://bjornjohansen.no/redirect-to-https-with-nginx
# http://tumblr.intranation.com/post/766288369/using-nginx-reverse-proxy
# https://certbot.eff.org/
# https://help.ubuntu.com/lts/serverguide/automatic-updates.html
# https://cloud-images.ubuntu.com/locator/ec2/
# https://gist.github.com/alonisser/a2c19f5362c2091ac1e7
# https://www.freedesktop.org/software/systemd/man/systemd.service.html

set -ex

DOMAIN="$1";

if [[ -z "$DOMAIN" ]]; then
	echo "Must specify domain!";
	exit 1;
fi;

echo 'iptables-persistent iptables-persistent/autosave_v4 boolean true' | sudo debconf-set-selections;
echo 'iptables-persistent iptables-persistent/autosave_v6 boolean true' | sudo debconf-set-selections;

sudo tee -a /etc/apt/apt.conf.d/20auto-upgrades <<'EOF' > /dev/null;
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
EOF

sudo tee -a /etc/apt/apt.conf.d/50unattended-upgrades <<'EOF' > /dev/null;
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "true";
EOF

sudo add-apt-repository ppa:certbot/certbot -y;
sudo apt-get update;
sudo apt-get dist-upgrade -y;

sudo apt-get install -y \
	iptables-persistent \
	daemontools \
	certbot \
	nodejs \
	npm \
	nginx;
sudo systemctl stop nginx;

sudo useradd --system --user-group --password '' sequence-runner;

sudo mkdir -p /var/www/http/.well-known/acme-challenge;
sudo mkdir -p /var/www/https;

git clone https://github.com/davidje13/SequenceDiagram.git;
cd SequenceDiagram && npm install --production; cd - > /dev/null;
sudo mv SequenceDiagram /var/www/sequence;
sudo mkdir -p /var/www/sequence/logs;

sudo tee /var/www/sequence/runner.sh <<'EOF' > /dev/null;
#!/bin/bash
BASEDIR="$(dirname "$0")";
PORT="$1";

mkdir -p "$BASEDIR/logs/log$PORT";

FONTDIR="$BASEDIR/fonts" \
"$BASEDIR/bin/server.js" "$PORT" 2>&1 \
	> >(multilog n50 s1048576 "$BASEDIR/logs/log$PORT") &

echo $! > "$BASEDIR/logs/pid$PORT";
EOF

sudo tee /var/www/sequence/update.sh <<'EOF' > /dev/null;
#!/bin/bash
BASEDIR="$(dirname "$0")";

cd "$BASEDIR";
git fetch;
if (( "$(git rev-list HEAD..origin/master --count)" > 0 )); then
	git pull;
	chmod -R g-w .;
	systemctl restart sequence8080.service;
	systemctl restart sequence8081.service;
fi;
cd - > /dev/null;
EOF

sudo tee /var/www/https/index.htm <<EOF > /dev/null;
<html lang="en">
<head>
<title>$DOMAIN</title>
<style>
body {
	font: 1em sans-serif;
	color: #444444;
	text-align: center;
	padding: 50px 20px 20px;
	margin: 0;
}
a:link, a:visited {
	color: #4466AA;
	text-decoration: underline;
}
a:active, a:hover {
	color: #6699BB;
	text-decoration: none;
}
</style>
</head>
<body>
Nothing to see here&hellip;
try <a href="https://sequence.$DOMAIN/">https://sequence.$DOMAIN/</a> instead for now.
</body>
</html>
EOF

sudo chmod 0544 /var/www/sequence/runner.sh;
sudo chmod 0744 /var/www/sequence/update.sh;

sudo chmod -R g-w /var/www/sequence;
sudo chown -R root:sequence-runner /var/www/sequence;
sudo chown -R sequence-runner:sequence-runner /var/www/sequence/logs;
sudo chown sequence-runner:sequence-runner /var/www/sequence/runner.sh;
sudo chown -R root:www-data /var/www/http;
sudo chown -R root:www-data /var/www/https;


openssl dhparam -out dhparam.pem 2048;
sudo mv dhparam.pem /etc/nginx/dhparam.pem;
sudo chmod 0600 /etc/nginx/dhparam.pem;
sudo chown root:root /etc/nginx/dhparam.pem;


sudo rm /etc/nginx/modules-enabled/50-mod-http-geoip.conf;
sudo rm /etc/nginx/modules-enabled/50-mod-http-image-filter.conf;
sudo rm /etc/nginx/modules-enabled/50-mod-http-xslt-filter.conf;
sudo rm /etc/nginx/modules-enabled/50-mod-mail.conf;
# should be mod-stream remaining
sudo rm /etc/nginx/sites-enabled/default;

sudo tee /etc/nginx/nginx.conf <<EOF > /dev/null;
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
	worker_connections 768;
}

http {
	sendfile on;
	tcp_nopush on;
	tcp_nodelay on;
	keepalive_timeout 65;
	types_hash_max_size 2048;

	include /etc/nginx/mime.types;
	default_type application/octet-stream;

	access_log /var/log/nginx/access.log;
	error_log /var/log/nginx/error.log;

	include /etc/nginx/conf.d/*.conf;
	include /etc/nginx/sites-enabled/*;
}
EOF

sudo tee /etc/nginx/conf.d/custom.conf <<EOF > /dev/null;
server_tokens off;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
EOF

sudo tee /etc/nginx/conf.d/mime.conf <<EOF > /dev/null;
types {
	application/javascript mjs;
}
EOF

sudo tee /etc/nginx/sites-available/shared-ssl.inc <<EOF > /dev/null;
ssl on;
ssl_session_cache shared:SSL:5m;
ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
ssl_prefer_server_ciphers on;
ssl_dhparam /etc/nginx/dhparam.pem;
ssl_certificate /etc/letsencrypt/live/all/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/all/privkey.pem;
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/letsencrypt/live/all/fullchain.pem;
EOF

sudo tee /etc/nginx/sites-available/http <<EOF > /dev/null;
server {
	listen 8000 default_server;
	listen [::]:8000 default_server;
	root /var/www/http;

	keepalive_requests 1;
	keepalive_timeout 0s;

	client_header_timeout 5s;
	client_body_timeout 5s;
	client_max_body_size 1;

	location / {
		access_log off;
		expires max;
		return 301 https://\$host\$request_uri;
	}

	location /.well-known/acme-challenge/ {
	}
}
EOF

sudo tee /etc/nginx/sites-available/root <<EOF > /dev/null;
server {
	server_name $DOMAIN www.$DOMAIN;
	listen 8443 ssl http2;
	listen [::]:8443 ssl http2;
#	listen 8000
#	listen [::]:8000
	root /var/www/https;
	include /etc/nginx/sites-available/shared-ssl.inc;

	index index.htm index.html;

	client_header_timeout 5s;
	client_body_timeout 5s;
	client_max_body_size 1;

	gzip on;
	gzip_comp_level 4;
	gzip_types *;

	location /errors/ {
		internal;
	}

	error_page 404 /errors/404.htm;
}
EOF

sudo tee /etc/nginx/sites-available/sequence <<EOF > /dev/null;
upstream sequence_backend {
	server 127.0.0.1:8080 max_conns=64;
	server 127.0.0.1:8081 max_conns=64;
	keepalive 16;
}

server {
	server_name sequence.$DOMAIN;
	listen 8443 ssl http2;
	listen [::]:8443 ssl http2;
#	listen 8000
#	listen [::]:8000
	include /etc/nginx/sites-available/shared-ssl.inc;

	client_header_timeout 5s;
	client_body_timeout 5s;
	client_max_body_size 1;

	access_log off;
	error_log off;

	merge_slashes off;

	location / {
		proxy_pass http://sequence_backend;
		proxy_http_version 1.1;
		proxy_set_header Connection "";
		proxy_redirect off;
		proxy_buffering off;
		proxy_connect_timeout 5s;
		proxy_read_timeout 10s;
	}
}
EOF

sudo ln -s /etc/nginx/sites-available/http /etc/nginx/sites-enabled/http;
sudo systemctl start nginx;

sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8000;
sudo iptables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port 8443;
sudo ip6tables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8000;
sudo ip6tables -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-port 8443;

sudo certbot certonly --agree-tos --register-unsafely-without-email --cert-name all --webroot \
	-w /var/www/http \
	-d "$DOMAIN" \
	-d "www.$DOMAIN" \
	-d "sequence.$DOMAIN";

make_sequence_service() {
	PORT="$1";
	sudo tee "/lib/systemd/system/sequence$PORT.service" <<EOF > /dev/null;
[Unit]
Description=Sequence Diagram Server $PORT
After=network.target

[Service]
Type=forking
PIDFile=/var/www/sequence/logs/pid$PORT
User=sequence-runner
ExecStart=/var/www/sequence/runner.sh $PORT
KillMode=process
KillSignal=SIGINT
Restart=always

[Install]
WantedBy=multi-user.target
EOF

	sudo chmod 0644 "/lib/systemd/system/sequence$PORT.service";
	sudo systemctl enable "sequence$PORT.service";
}

make_sequence_service 8080;
make_sequence_service 8081;
sudo systemctl start sequence8080.service;
sudo systemctl start sequence8081.service;

sudo ln -s /etc/nginx/sites-available/root /etc/nginx/sites-enabled/root;
sudo ln -s /etc/nginx/sites-available/sequence /etc/nginx/sites-enabled/sequence;
sudo nginx -s reload;

sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null;
sudo ip6tables-save | sudo tee /etc/iptables/rules.v6 > /dev/null;

sudo tee /etc/cron.daily/sequence-pull <<'EOF' > /dev/null;
/var/www/sequence/update.sh;
EOF
sudo chmod 0755 /etc/cron.daily/sequence-pull;

sudo rm /etc/cron.d/certbot;
sudo tee /etc/cron.daily/certbot-renew <<'EOF' > /dev/null;
certbot renew -q --deploy-hook "nginx -s reload";
EOF
sudo chmod 0755 /etc/cron.daily/certbot-renew;
