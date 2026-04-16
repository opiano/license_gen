<script setup>
import { ref } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import forge from 'node-forge'
import { saveAs } from 'file-saver'
import defaultPrivateKeyPem from './assets/private_key.pem?raw'

const privateKeyInput = ref(defaultPrivateKeyPem.trim())
const fileInput = ref(null)

const serial = ref('')
const mac = ref('')
const expire = ref('')

const isValid = ref(true)
const errorMessage = ref('')

const showDialog = ref(false)
const licenseText = ref('')
const generatedFilename = ref('')

const triggerFileSelect = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    privateKeyInput.value = e.target.result
  }
  reader.readAsText(file)
  
  // Reset input so the same file can be selected again if needed
  event.target.value = null
}

const clearPrivateKey = () => {
  privateKeyInput.value = ''
}

const validateInputs = () => {
  if (!privateKeyInput.value.includes('-----BEGIN RSA PRIVATE KEY-----')) {
    errorMessage.value = "Invalid or empty private key."
    return false
  }
  if (serial.value.length !== 6 || !/^\d{6}$/.test(serial.value)) {
    errorMessage.value = "Serial must be exactly 6 digits."
    return false
  }
  if (mac.value.length !== 12 || !/^[0-9a-f]{12}$/.test(mac.value)) {
    errorMessage.value = "MAC must be exactly 12 lowercase hex characters."
    return false
  }
  if (expire.value.length !== 8 || !/^\d{8}$/.test(expire.value)) {
    errorMessage.value = "Expire must be in YYYYMMDD format (8 digits)."
    return false
  }
  
  // Validate Date structure
  const year = parseInt(expire.value.substring(0, 4), 10)
  const month = parseInt(expire.value.substring(4, 6), 10)
  const day = parseInt(expire.value.substring(6, 8), 10)
  
  const dateObj = new Date(year, month - 1, day)
  if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
    errorMessage.value = "Expire date is invalid."
    return false
  }

  errorMessage.value = ""
  return true
}

const formatLicense = (hw_id, expireVal, signature_b64) => {
  return `hw_id="${hw_id}"\nexpire="${expireVal}"\nsignature="${signature_b64}"\n`
}

const generateLicense = () => {
  if (!validateInputs()) return

  try {
    const combined = serial.value + mac.value
    
    // Hash combined for HW_ID
    const hwMd = forge.md.sha256.create()
    hwMd.update(combined, 'utf8')
    const hw_id = hwMd.digest().toHex()
    
    // Data to sign
    const dataToSign = `${hw_id}|${expire.value}`
    
    // Convert PEM to private key object
    const privateKey = forge.pki.privateKeyFromPem(privateKeyInput.value)
    
    // Hash data for signing
    const signMd = forge.md.sha256.create()
    signMd.update(dataToSign, 'utf8')
    
    // Sign using PKCS#1 v1.5 padding and SHA-256
    const signature = privateKey.sign(signMd)
    
    // Base64 encode
    const signature_b64 = forge.util.encode64(signature)
    
    // Create text content
    const textContent = formatLicense(hw_id, expire.value, signature_b64)
    
    licenseText.value = textContent
    generatedFilename.value = `license_${hw_id.substring(0, 8)}.txt`
    showDialog.value = true
  } catch (err) {
    console.error(err)
    errorMessage.value = "Error generating license. Please verify private key and inputs."
  }
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(licenseText.value)
  } catch (err) {
    console.error("Failed to copy text: ", err)
  }
}

const downloadLicense = () => {
  const blob = new Blob([licenseText.value], { type: 'text/plain;charset=utf-8' })
  saveAs(blob, generatedFilename.value)
}
</script>

<template>
  <div class="app-container">
    <div class="main-card">
      <div class="card-header">
        <i class="pi pi-key text-4xl mb-3" style="color: var(--p-primary-color)"></i>
        <h2>License Gen</h2>
        <p class="subtitle">Generate encrypted license keys for hardware verification</p>
      </div>

      <div class="split-layout">
        <div class="left-panel">
          <div class="panel-title">
            <h3>PriKey</h3>
            <div style="display: flex; gap: 0.5rem;">
              <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none" accept=".pem,.key,.txt,.pm" />
              <Button label="Clear" icon="pi pi-trash" size="small" severity="danger" variant="outlined" @click="clearPrivateKey" />
              <Button label="Upload Key" icon="pi pi-upload" size="small" variant="outlined" @click="triggerFileSelect" />
            </div>
          </div>
          <Textarea v-model="privateKeyInput" class="key-textarea" placeholder="Paste private key here..." spellcheck="false" />
        </div>

        <div class="right-panel">
          <div class="panel-title">
            <h3>License Details</h3>
          </div>
          
          <div class="form-container">
            <div class="field">
              <label for="serial">Serial (6 digits)</label>
              <InputText id="serial" v-model="serial" placeholder="e.g. 123456" maxlength="6" />
            </div>
            
            <div class="field">
              <label for="mac">MAC Address (12 hex, lowercase)</label>
              <InputText id="mac" v-model="mac" placeholder="e.g. 001a2b3c4d5e" maxlength="12" />
            </div>
            
            <div class="field">
              <label for="expire">Expire (YYYYMMDD)</label>
              <InputText id="expire" v-model="expire" placeholder="e.g. 20261231" maxlength="8" />
            </div>

            <div v-if="errorMessage" class="error-msg mt-3">
              <i class="pi pi-exclamation-triangle"></i>
              {{ errorMessage }}
            </div>

            <Button label="Generate License" icon="pi pi-check" class="w-full mt-4" @click="generateLicense" size="large" />
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="showDialog" modal header="License Generated Successfully" :style="{ width: '50rem', maxWidth: '90vw' }">
      <p class="mb-4">The following license file (<strong>{{ generatedFilename }}</strong>) has been generated.</p>
      <div class="code-block">
        <pre>{{ licenseText }}</pre>
      </div>
      <template #footer>
        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
          <Button label="Copy" icon="pi pi-copy" variant="outlined" @click="copyToClipboard" />
          <Button label="Download" icon="pi pi-download" @click="downloadLicense" />
          <Button label="Close" icon="pi pi-times" variant="text" @click="showDialog = false" autofocus />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--p-surface-ground);
  font-family: var(--p-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
  padding: 2rem;
}

.main-card {
  background-color: var(--p-surface-0);
  border-radius: var(--p-border-radius);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 3rem;
  width: 100%;
  max-width: 900px;
  border: 1px solid var(--p-surface-200);
}

.card-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.card-header i {
  font-size: 2.25rem;
}

.card-header h2 {
  margin: 0 0 0.5rem 0;
  color: var(--p-surface-900);
  font-size: 1.75rem;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  color: var(--p-surface-500);
  font-size: 0.9rem;
}

.split-layout {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

@media (min-width: 768px) {
  .split-layout {
    flex-direction: row;
  }
  .left-panel, .right-panel {
    flex: 1;
    min-width: 0;
  }
}

.panel-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.panel-title h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--p-surface-800);
  font-weight: 600;
}

.key-textarea {
  width: 100%;
  height: 300px;
  font-family: monospace;
  font-size: 0.85rem;
  line-height: 1.4;
  resize: vertical;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-weight: 500;
  color: var(--p-surface-700);
  font-size: 0.95rem;
}

.error-msg {
  color: var(--p-red-500);
  background-color: var(--p-red-50);
  padding: 0.75rem;
  border-radius: var(--p-border-radius);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--p-red-200);
}

.code-block {
  background-color: var(--p-surface-900);
  color: var(--p-surface-0);
  padding: 1rem;
  border-radius: var(--p-border-radius);
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  font-family: monospace;
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-wrap: break-word;
}

@media (prefers-color-scheme: dark) {
  .main-card {
    background-color: var(--p-surface-900);
    border-color: var(--p-surface-800);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }
  .card-header h2, .panel-title h3 {
    color: var(--p-surface-0);
  }
  .subtitle {
    color: var(--p-surface-400);
  }
  .field label {
    color: var(--p-surface-200);
  }
  .error-msg {
    background-color: rgba(239, 68, 68, 0.1);
    border-color: var(--p-red-800);
    color: var(--p-red-400);
  }
  .code-block {
    background-color: var(--p-surface-950);
    border: 1px solid var(--p-surface-800);
    color: var(--p-primary-200);
  }
}
</style>
