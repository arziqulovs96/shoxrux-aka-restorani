#!/usr/bin/env bash
# Do'stlik Kassa — VPS'da yangilanish serveri (bir marta ishga tushiriladi, qayta ishga tushirsa ham bo'ladi).
#  * Har 2 daqiqada yopiq GitHub repodagi oxirgi relizni /opt/dostlik-kassa/www ga ko'chiradi.
#  * Kassalar shu yerdan (http://SERVER:8790/) yangilanadi. GitHub kaliti faqat shu serverda turadi.
set -euo pipefail
REPO="arziqulovs96/shoxrux-aka-restorani"
DIR=/opt/dostlik-kassa
PORT=8790
mkdir -p "$DIR/www"

ok_token() { curl -fsS -o /dev/null -H "Authorization: Bearer $1" "https://api.github.com/repos/$REPO" 2>/dev/null; }

TOKEN=""
for f in "$DIR/.gh_token" /opt/smartqassob/.gh_token; do
  if [ -s "$f" ] && ok_token "$(tr -d '[:space:]' < "$f")"; then TOKEN=$(tr -d '[:space:]' < "$f"); echo "✓ GitHub kaliti topildi: $f"; break; fi
done
if [ -z "$TOKEN" ]; then
  echo "GitHub kaliti kerak (faqat o'qish, $REPO reposiga)."
  echo "github.com → Settings → Developer settings → Fine-grained tokens → Generate:"
  echo "  Repository access: $REPO;  Permissions: Contents = Read-only"
  read -rsp "Kalitni shu yerga qo'ying (ko'rinmaydi) va Enter bosing: " TOKEN; echo
  TOKEN=$(echo "$TOKEN" | tr -d '[:space:]')
  ok_token "$TOKEN" || { echo "✗ Kalit bu repoga kira olmadi. Qayta urinib ko'ring."; exit 1; }
fi
umask 077; printf '%s' "$TOKEN" > "$DIR/.gh_token"; umask 022

cat > "$DIR/mirror.py" <<'PY'
"""GitHub (yopiq repo) oxirgi relizini kassalar uchun ko'chiradi. latest.yml eng oxirida yoziladi —
kassa yarim yuklangan faylni hech qachon ko'rmaydi."""
import json, os, sys, urllib.request
REPO = "arziqulovs96/shoxrux-aka-restorani"
DIR = "/opt/dostlik-kassa"
WWW = os.path.join(DIR, "www")
TOKEN = open(os.path.join(DIR, ".gh_token")).read().strip()

class NoAuthRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        new = super().redirect_request(req, fp, code, msg, headers, newurl)
        if new is not None:
            new.headers.pop("Authorization", None)
            new.unredirected_hdrs.pop("Authorization", None)
        return new

opener = urllib.request.build_opener(NoAuthRedirect)

def get(url, accept="application/vnd.github+json"):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}", "Accept": accept, "User-Agent": "dostlik-kassa-mirror"})
    return opener.open(req, timeout=600)

rel = json.load(get(f"https://api.github.com/repos/{REPO}/releases/latest"))
assets = {a["name"]: a for a in rel.get("assets", [])}
if "latest.yml" not in assets:
    sys.exit("relizda latest.yml yo'q")
new_yml = get(assets["latest.yml"]["url"], "application/octet-stream").read()
cur = os.path.join(WWW, "latest.yml")
if os.path.exists(cur) and open(cur, "rb").read() == new_yml:
    sys.exit(0)  # o'zgarish yo'q
for name, a in assets.items():
    if name == "latest.yml":
        continue
    dst = os.path.join(WWW, name)
    if os.path.exists(dst) and os.path.getsize(dst) == a["size"]:
        continue
    tmp = dst + ".part"
    with get(a["url"], "application/octet-stream") as r, open(tmp, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    if os.path.getsize(tmp) != a["size"]:
        os.remove(tmp)
        sys.exit(f"{name}: hajm mos emas")
    os.replace(tmp, dst)
tmp = cur + ".part"
open(tmp, "wb").write(new_yml)
os.replace(tmp, cur)
keep = set(assets)
for name in os.listdir(WWW):  # eski versiya fayllari o'chiriladi
    if name not in keep and name.endswith((".exe", ".blockmap")):
        os.remove(os.path.join(WWW, name))
print("yangi versiya ko'chirildi:", rel.get("tag_name"))
PY

cat > /etc/systemd/system/dostlik-kassa-www.service <<EOF
[Unit]
Description=Do'stlik Kassa yangilanish fayllari (port $PORT)
After=network.target
[Service]
ExecStart=/usr/bin/python3 -m http.server $PORT --directory $DIR/www
Restart=always
[Install]
WantedBy=multi-user.target
EOF
cat > /etc/systemd/system/dostlik-kassa-mirror.service <<EOF
[Unit]
Description=Do'stlik Kassa: GitHub relizini ko'chirish
[Service]
Type=oneshot
ExecStart=/usr/bin/python3 $DIR/mirror.py
EOF
cat > /etc/systemd/system/dostlik-kassa-mirror.timer <<EOF
[Unit]
Description=Do'stlik Kassa: har 2 daqiqada reliz tekshirish
[Timer]
OnBootSec=1min
OnUnitActiveSec=2min
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable -q --now dostlik-kassa-www.service
systemctl enable -q --now dostlik-kassa-mirror.timer
if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then ufw allow $PORT/tcp >/dev/null; echo "✓ ufw: $PORT ochildi"; fi
echo "Reliz ko'chirilmoqda (80 MB, biroz kuting)..."
python3 "$DIR/mirror.py" || true
sleep 1
if curl -fsS "http://127.0.0.1:$PORT/latest.yml" | head -1; then
  echo "✓ TAYYOR: kassalar http://$(curl -fsS -4 ifconfig.me 2>/dev/null || hostname -I | cut -d' ' -f1):$PORT/ dan yangilanadi"
else
  echo "✗ Nimadir ishlamadi — natijani Claude'ga yuboring: journalctl -u dostlik-kassa-mirror -n 30"
fi
