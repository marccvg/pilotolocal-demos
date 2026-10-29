#!/bin/bash
# Inicia servidor de demo PilotoLocal en puerto 8765
# Acceso tablet: http://[IP-LAPTOP]:8765/demos.html
pkill -f "python3 -m http.server 8765" 2>/dev/null
sleep 0.5
cd "$(dirname "$0")"
python3 -m http.server 8765 --bind 0.0.0.0 &
echo "Servidor iniciado PID $! en http://$(hostname -I | awk '{print $1}'):8765/demos.html"
