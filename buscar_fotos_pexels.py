#!/usr/bin/env python3
"""
Busca fotos no Pexels para os produtos do Comanda (itens genéricos, sem marca)
e sobe no bucket 'comanda-products' do Supabase Storage.
"""

import os
import io
import csv
import sys
import time
import requests
from PIL import Image

PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
BUCKET = "comanda-products"

INPUT_CSV = "produtos.csv"       # colunas: nome,busca
OUTPUT_CSV = "relatorio.csv"
CROP_SIZE = 800                  # imagem final quadrada 800x800

PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search"


def checar_config():
    faltando = [n for n, v in [
        ("PEXELS_API_KEY", PEXELS_API_KEY),
        ("SUPABASE_URL", SUPABASE_URL),
        ("SUPABASE_SERVICE_KEY", SUPABASE_SERVICE_KEY),
    ] if not v]
    if faltando:
        print(f"Faltam variáveis de ambiente: {', '.join(faltando)}")
        sys.exit(1)
    if not os.path.exists(INPUT_CSV):
        print(f"Não encontrei {INPUT_CSV}. Crie com colunas: nome,busca")
        sys.exit(1)


def buscar_no_pexels(termo):
    headers = {"Authorization": PEXELS_API_KEY}
    params = {"query": termo, "per_page": 1, "orientation": "square"}
    r = requests.get(PEXELS_SEARCH_URL, headers=headers, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()
    fotos = data.get("photos", [])
    if not fotos:
        return None
    return fotos[0]["src"]["large2x"]


def baixar_e_cortar_quadrado(url):
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    img = Image.open(io.BytesIO(r.content)).convert("RGB")
    w, h = img.size
    lado = min(w, h)
    left = (w - lado) // 2
    top = (h - lado) // 2
    img = img.crop((left, top, left + lado, top + lado))
    img = img.resize((CROP_SIZE, CROP_SIZE), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    buf.seek(0)
    return buf.read()


def slugify(nome):
    s = nome.strip().lower()
    substituicoes = {
        "á": "a", "à": "a", "ã": "a", "â": "a",
        "é": "e", "ê": "e",
        "í": "i",
        "ó": "o", "ô": "o", "õ": "o",
        "ú": "u", "ü": "u",
        "ç": "c",
    }
    for orig, novo in substituicoes.items():
        s = s.replace(orig, novo)
    s = "".join(c if c.isalnum() else "-" for c in s)
    while "--" in s:
        s = s.replace("--", "-")
    return s.strip("-")


def subir_supabase(nome_arquivo, conteudo_bytes):
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{nome_arquivo}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
    }
    r = requests.post(url, headers=headers, data=conteudo_bytes, timeout=30)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Falha upload ({r.status_code}): {r.text[:200]}")
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{nome_arquivo}"


def main():
    checar_config()

    with open(INPUT_CSV, newline="", encoding="utf-8") as f:
        linhas = list(csv.DictReader(f))

    resultados = []
    for i, linha in enumerate(linhas, 1):
        nome = linha["nome"].strip()
        busca = linha.get("busca", "").strip() or nome
        print(f"[{i}/{len(linhas)}] {nome} (busca: '{busca}')...", end=" ")

        try:
            foto_url = buscar_no_pexels(busca)
            if not foto_url:
                print("NÃO ENCONTRADO")
                resultados.append({"nome": nome, "status": "nao_encontrado", "url_final": ""})
                continue

            conteudo = baixar_e_cortar_quadrado(foto_url)
            nome_arquivo = f"{slugify(nome)}.jpg"
            url_final = subir_supabase(nome_arquivo, conteudo)

            print("OK")
            resultados.append({"nome": nome, "status": "ok", "url_final": url_final})

        except Exception as e:
            print(f"ERRO: {e}")
            resultados.append({"nome": nome, "status": f"erro: {e}", "url_final": ""})

        time.sleep(0.5)

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["nome", "status", "url_final"])
        writer.writeheader()
        writer.writerows(resultados)

    ok = sum(1 for r in resultados if r["status"] == "ok")
    print(f"\nConcluído: {ok}/{len(resultados)} imagens resolvidas. Veja {OUTPUT_CSV}")


if __name__ == "__main__":
    main()