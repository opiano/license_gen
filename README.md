# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

python   
pip install cryptography  

make_license.py

import hashlib
import base64
from datetime import datetime
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization

PRIVATE_KEY_PATH = "./scon_private_key.pem"


# ---------- 입력 ----------

serial = input("Enter serial: ").strip()
mac = input("Enter eth0 MAC (12 hex lowercase): ").strip()
expire = input("Enter expire (yyyymmdd): ").strip()


# ---------- 검증 ----------

if len(mac) != 12 or not all(c in "0123456789abcdef" for c in mac):
    raise ValueError("MAC must be 12 hex lowercase characters")

try:
    datetime.strptime(expire, "%Y%m%d")
except ValueError:
    raise ValueError("Expire must be yyyymmdd")


# ---------- HW ID 생성 ----------

combined = serial + mac
hw_id = hashlib.sha256(combined.encode()).hexdigest()

print(f"HW_ID: {hw_id}")


# ---------- 서명 ----------

data = f"{hw_id}|{expire}".encode()

with open(PRIVATE_KEY_PATH, "rb") as f:
    private_key = serialization.load_pem_private_key(f.read(), password=None)

signature = private_key.sign(
    data,
    padding.PKCS1v15(),
    hashes.SHA256()
)

signature_b64 = base64.b64encode(signature).decode()


# ---------- 텍스트 파일 생성 ----------

output_file = f"license_{hw_id[:8]}.txt"

with open(output_file, "w") as f:
    f.write(f'hw_id="{hw_id}"\n')
    f.write(f'expire="{expire}"\n')
    f.write(f'signature="{signature_b64}"\n')

print(f"License file created: {output_file}")
