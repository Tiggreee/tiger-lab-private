#!/bin/bash

echo "=== REPO FINGERPRINT START ==="

echo ""
echo "=== 1. ESTRUCTURA (3 niveles) ==="
if command -v tree &> /dev/null
then
  tree -L 3
else
  find . -maxdepth 3 -type d -print
fi

echo ""
echo "=== 2. PACKAGE.JSON ==="
cat package.json 2>/dev/null || echo "package.json no encontrado"

echo ""
echo "=== 3. PUNTOS DE ENTRADA (React / Router) ==="
grep -R "createRoot" -n src 2>/dev/null
grep -R "Router" -n src 2>/dev/null
grep -R "HashRouter" -n src 2>/dev/null
grep -R "BrowserRouter" -n src 2>/dev/null

echo ""
echo "=== 4. SERVER ==="
ls -R server 2>/dev/null || echo "Carpeta server no encontrada"

echo ""
echo "=== 5. SCRIPTS OPERATIVOS ==="
ls -R scripts 2>/dev/null || echo "Carpeta scripts no encontrada"

echo ""
echo "=== 6. OPS ==="
ls -R ops 2>/dev/null || echo "Carpeta ops no encontrada"

echo ""
echo "=== 7. COMMITS RECIENTES ==="
git log --oneline --graph --decorate -20

echo ""
echo "=== 8. DEPENDENCIAS CRÍTICAS ==="
jq '.dependencies, .devDependencies' package.json 2>/dev/null || echo "jq no instalado o package.json no válido"

echo ""
echo "=== 9. ARCHIVOS GRANDES (posibles problemas) ==="
find . -type f -size +1M -print

echo ""
echo "=== 10. ARCHIVOS SOSPECHOSOS (duplicados, backups, basura) ==="
find . -type f \( -name "*.bak" -o -name "*.tmp" -o -name "*copy*" -o -name "*backup*" \) -print

echo ""
echo "=== REPO FINGERPRINT END ==="
