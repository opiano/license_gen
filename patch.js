const fs = require('fs');

const pkContent = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC5QrQK7he/bUDN
qA3iRxF9GNfo7QmmFpwrujFKpDg5KSM5MHmHoe0KTUsh2MvDt4G+O3DURtaZkCiA
P+thdN9n7GYtEpKZ0v6Efu2y8Ovm3gR/o4vfazid8MsUD7Ph1T2BTg26TEGHizdR
NTMBLdAS1fSafe70VSE/X6ePNXp4rWrTQyRsOW9xW8naoioUpAkJoleWX3mE+caM
L0pDRVCeO6o1LYhEDZzBtKtruTcEncQPYBgVX12UKOMnJyK0PkgGs4dyCXnCN+dl
sZpgWbPmZM6iZkNxvXUKY+qRuleb1loQqYDGPoyp5NJU2KYgPUPTXM0gkU6DkgEO
iypHbJvLAgMBAAECggEAMirY/Hi7H5BjUw2mLNdX6gtXNHE0ArDuu3yhKnhL7Vax
fiQdVNhJi1eg99pwW2CPFseb5zADnvQFs60bfXmbodXHWX9FCbi0SYbhsWpCR3Np
vnK4RtkPLN3u8FDMQmRvUlujpgZOXHkbkrcYR8JzLRaZNVjS44FGDpZFlqdBsfm1
UfPfCyQluomXCyW5CuTC1q5X68SHFhwibidtieRTfPBYKVFoH+6VX7RMJy/GxUV3
+O3KMaX/zvB57IXQ0p4yxoyzuynzoohC1FXFC6JIrukuXB/aWXbXR+W76r1lPiCM
L000D2wIg3QByNel8+osjclPYo6v8DXBYdUb1ItVaQKBgQD0OMN/gSVxVk0Kr10w
C+1P8qj/3mTDtuFqmTh+gPxlE1qQVue+iUxYuI62vEJ2DE7M3qE6LetSBR4wQFjZ
AKglkiLwMoX3sw9RfmDRGkyFoZHu/WESjgsoZPotmtXIF4RgwPvFfyyKiW5q13Qw
PCJItRqqXbo0KwF35DDAFfha5QKBgQDCMfymrY2GXlhzMkw6zsV/f7YKnZbvSzbU
04FWerIWS1b3T5ZF4V/zUuhrwa8DBW6GHyo66PcTNHLoJOi5UNGAieR3zbg79hbl
NBdPx9to9hRqsmsCkPdtc8p5hVW9PIto3JrjJ1WEow8IDm3lu/HGxUIaviL8TNse
aYNX5JTA7wKBgFI5flDCeYnEJaIwUq6nhVnCeHXVOZXPT+uk9Kla4h9hub8ZE2NK
NKM2WA5cKgA2up0tY5kD9tOhl31lXMSK/RHRNuQqDoLMDZ9BbnVYZmUjdc/CDVnC
6yzJepW6KLn6eP5eWyYuYB+wj7V3Hs5SoLRcDUNI1TVVOWRVNrilbP2lAoGAbdf0
fxtAKDcJdO+IauM2l23XvJ1zGJvEwhF44T+5qB6pbG5aI+Ddczb8PKdrpRvXbooG
SxgnWXebX3AxK1Fpj3lv/8wfX9tNDAyw+vGjS/WVitys5uC08/ZBGweufcHXYVMX
UVGYb9QD1pzC0OXEVpiRUasnAus+Li+kmXy0H4UCgYBIi48CS5UejNKa/DUMzMwk
XwxIdIqN3SFfy1zjGsQ+LipIpjoYt48r03oYWE32qVNcTAh7OHvo8Y+ovUZS/vb7
B/317rB6kczrp4NhTRgi6HdFNKXvjynUNXpwLZKFAMh1F49MxUoUxlHkGqZXrKop
/VujwiqKLCQu8s3vt9+gjw==
-----END PRIVATE KEY-----`;

fs.writeFileSync('src/assets/private_key.pem', pkContent);

let app = fs.readFileSync('src/App.vue', 'utf8');

// Inject Login Variables
const scriptInject = `const isAuthenticated = ref(false)
const loginId = ref('')
const loginPw = ref('')
const loginError = ref(false)

const handleLogin = () => {
  if (loginId.value === 'admin' && loginPw.value === 'gen1234') {
    isAuthenticated.value = true
    loginError.value = false
  } else {
    loginError.value = true
  }
}

const privateKeyInput = ref(defaultPrivateKeyPem.trim())`;
app = app.replace("const privateKeyInput = ref(defaultPrivateKeyPem.trim())", scriptInject);

// PK type change support
app = app.replace("!privateKeyInput.value.includes('-----BEGIN RSA PRIVATE KEY-----')", "!privateKeyInput.value.includes('-----BEGIN RSA PRIVATE KEY-----') && !privateKeyInput.value.includes('-----BEGIN PRIVATE KEY-----')");

// MAC Validate format change
const oldMacVal = `if (mac.value.length !== 12 || !/^[0-9a-f]{12}$/.test(mac.value)) {
    errorMessage.value = "MAC must be exactly 12 lowercase hex characters."
    return false
  }`;
const newMacVal = `if (mac.value.length !== 17 || !/^([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$/.test(mac.value)) {
    errorMessage.value = "MAC must be in a valid format (e.g. 00:00:aa:3e:ab:ed)."
    return false
  }`;
app = app.replace(oldMacVal, newMacVal);

// Generate License internal logic (to lowercase and strip colon)
app = app.replace("const combined = serial.value + mac.value", `const cleanMac = mac.value.replace(/:/g, '').toLowerCase()\n    const combined = serial.value + cleanMac`);

// Template changes
const oldTemplateStart = `<div class="app-container">
    <div class="main-card">`;
const newTemplateStart = `<div class="app-container">
    <div v-if="!isAuthenticated" class="login-card">
      <div class="card-header">
        <i class="pi pi-lock text-4xl mb-3" style="color: var(--p-primary-color)"></i>
        <h2>Login</h2>
        <p class="subtitle">Enter your credentials to access the license tools</p>
      </div>
      <div class="form-container">
        <div class="field">
          <label for="username">ID</label>
          <InputText id="username" v-model="loginId" @keydown.enter="handleLogin" placeholder="Admin ID" />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <InputText id="password" type="password" v-model="loginPw" @keydown.enter="handleLogin" placeholder="Password" />
        </div>
        <div v-if="loginError" class="error-msg mt-3">
          <i class="pi pi-exclamation-triangle"></i> Invalid ID or Password.
        </div>
        <Button label="Login" icon="pi pi-sign-in" class="w-full mt-4" @click="handleLogin" size="large" />
      </div>
    </div>

    <div v-else class="main-card">`;
app = app.replace(oldTemplateStart, newTemplateStart);

// Template MAC field placeholder
const oldMacInput = `<div class="field">
              <label for="mac">MAC Address (12 hex, lowercase)</label>
              <InputText id="mac" v-model="mac" placeholder="e.g. 001a2b3c4d5e" maxlength="12" />
            </div>`;
const newMacInput = `<div class="field">
              <label for="mac">MAC Address (e.g. 00:1A:2b:3C:4d:5e)</label>
              <InputText id="mac" v-model="mac" placeholder="00:00:aa:3e:ab:ed" maxlength="17" />
            </div>`;
app = app.replace(oldMacInput, newMacInput);

// Final styles
const styleInject = `  .code-block {
    background-color: var(--p-surface-950);
    border: 1px solid var(--p-surface-800);
    color: var(--p-primary-200);
  }
  .login-card {
    background-color: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }
}

.login-card {
  background-color: var(--p-surface-0);
  border-radius: var(--p-border-radius);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 3rem;
  width: 100%;
  max-width: 450px;
  border: 1px solid var(--p-surface-200);
}
</style>`;
app = app.replace(`  .code-block {
    background-color: var(--p-surface-950);
    border: 1px solid var(--p-surface-800);
    color: var(--p-primary-200);
  }
}
</style>`, styleInject);

fs.writeFileSync('src/App.vue', app);
console.log('App.vue and private_key.pem have been successfully patched!');
