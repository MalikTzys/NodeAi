# Character.AI Discord Bot

Bot Discord yang terintegrasi dengan Character.AI, memungkinkan karakter AI untuk berinteraksi langsung di server Discord kamu.

##  Fitur

-  **Chat dengan Character.AI** - Ngobrol langsung dengan character favorit kamu
-  **Auto-Reply Sapaan** - Bot otomatis reply untuk sapaan tanpa perlu mention
-  **Multi-Mode Chat** - Support mention, DM, dan auto-reply
-  **Conversation Management** - Reset dan kelola riwayat percakapan
-  **Fast & Lightweight** - Menggunakan WebSocket untuk response yang cepat
-  **Easy Configuration** - Konfigurasi sederhana via satu file

##  Prerequisites

Sebelum memulai, pastikan kamu sudah punya:

- [Node.js](https://nodejs.org/) versi 16.9.0 atau lebih tinggi
- Akun [Discord Developer](https://discord.com/developers/applications)
- Akun [Character.AI](https://character.ai/)
- Text editor (VS Code, Sublime, Notepad++, dll)

##  Instalasi

### 1. Clone atau Download Repository

```bash
# Clone repository (jika ada)
git clone https://github.com/MalikTzys/NodeAi
cd NodeAi

# Atau buat folder baru
mkdir cai-discord-bot
cd cai-discord-bot
```

### 2. Install Dependencies

```bash
npm install
```

**Dependencies yang akan terinstall:**
- `discord.js` - Library untuk Discord Bot
- `cainode` - Library untuk Character.AI API

### 3. Buat File `package.json`

Jika belum ada, buat file `package.json`:

```json
{
  "name": "cai-discord-bot",
  "version": "1.0.0",
  "type": "module",
  "main": "bot.js",
  "scripts": {
    "start": "node bot.js",
    "dev": "node --watch bot.js"
  },
  "dependencies": {
    "cainode": "^1.2.2",
    "discord.js": "^14.24.2"
  }
}
```

## Konfigurasi

### A. Dapatkan Discord Bot Token

1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Klik **"New Application"** dan beri nama bot kamu
3. Masuk ke menu **"Bot"** di sidebar
4. Klik **"Reset Token"** dan copy token yang muncul
5. **PENTING:** Aktifkan **Message Content Intent**:
   - Scroll ke bawah ke bagian **"Privileged Gateway Intents"**
   - Centang **"MESSAGE CONTENT INTENT"**
   - Klik **"Save Changes"**

### B. Invite Bot ke Server

1. Di Discord Developer Portal, masuk ke menu **"OAuth2"** → **"URL Generator"**
2. Centang **Scopes:**
   - `bot`
   - `applications.commands` (opsional)
3. Centang **Bot Permissions:**
   - `Send Messages`
   - `Read Messages/View Channels`
   - `Read Message History`
   - `Use Slash Commands` (opsional)
4. Copy URL yang muncul di bawah
5. Buka URL di browser dan invite bot ke server kamu

### C. Dapatkan Character.AI Token

**Metode 1: Via Browser DevTools (Recommended)**

1. Buka [character.ai](https://character.ai) dan login
2. Tekan `F12` untuk buka DevTools
3. Pilih tab **"Application"** (Chrome) atau **"Storage"** (Firefox)
4. Di sidebar kiri, klik **"Cookies"** → `https://character.ai`
5. Cari cookie bernama `HTTP_AUTHORIZATION` atau yang mengandung token
6. Copy value-nya (format: `Token xxxxxxxx...`)

**Metode 2: Via Network Tab**

1. Buka [character.ai](https://character.ai) dan login
2. Tekan `F12` → pilih tab **"Network"**
3. Refresh halaman atau kirim chat ke character
4. Cari request ke `neo.character.ai`
5. Klik request tersebut → tab **"Headers"**
6. Scroll ke **"Request Headers"** → cari `Authorization`
7. Copy token setelah kata `Token` (tanpa quotes)

### D. Dapatkan Character ID

1. Buka character yang ingin kamu gunakan di [character.ai](https://character.ai)
2. Lihat URL browser, contoh:
   ```
   https://character.ai/chat/pZ2iIwJGQEY0m6v-H9DgDWKiCsIRz1W3jUXJMD_6Scs
   ```
3. Character ID adalah string panjang setelah `/chat/`:
   ```
   pZ2iIwJGQEY0m6v-H9DgDWKiCsIRz1W3jUXJMD_6Scs
   ```

### E. Update Konfigurasi Bot

Edit file `bot.js` dan update bagian `CONFIG`:

```javascript
const CONFIG = {
  DISCORD_TOKEN: 'DISCORD_BOT_TOKEN',
  CAI_TOKEN: 'HTTP_TOKEN',
  CHARACTER_ID: 'CHAR_ID',
  PREFIX: '??',
  CHANNEL_IDS: [], // Kosongkan untuk semua channel
  TYPING_INDICATOR: true,
  MAX_MESSAGE_LENGTH: 2000,
  AUTO_REPLY_GREETINGS: true,
  GREETING_KEYWORDS: [
    'halo', 'hai', 'hey', 'hi', 'hello',
    'selamat pagi', 'pagi', 'good morning',
    // tambahkan keyword lain sesuai kebutuhan
  ],
};
```

## Menjalankan Bot

### Development Mode

```bash
npm start
```

Atau dengan auto-restart saat ada perubahan file:

```bash
npm run dev
```

### Production Mode (Recommended)

Gunakan PM2 untuk running bot 24/7:

```bash
# Install PM2 globally
npm install -g pm2

# Start bot dengan PM2
pm2 start bot.js --name cai-bot

# Command PM2 lainnya
pm2 stop cai-bot      # Stop bot
pm2 restart cai-bot   # Restart bot
pm2 logs cai-bot      # Lihat logs
pm2 delete cai-bot    # Hapus dari PM2
```

## Cara Menggunakan

### 1. Auto-Reply Sapaan (Tanpa Mention)

Bot otomatis reply untuk sapaan pendek:

```
User: halo
Bot: [otomatis reply dari character]

User: selamat pagi
Bot: [otomatis reply dari character]
```

### 2. Chat Biasa (Dengan Mention)

Untuk pertanyaan atau chat yang lebih panjang:

```
User: @BotName bagaimana cara membuat Discord bot?
Bot: [reply dari character]

User: @BotName ceritakan tentang dirimu
Bot: [reply dari character]
```

### 3. Direct Message (DM)

Kirim DM langsung ke bot:

```
User: (via DM) halo, apa kabar?
Bot: [reply dari character]
```

## Commands

| Command | Deskripsi | Contoh |
|---------|-----------|--------|
| `??ping` | Cek status dan latency bot | `??ping` |
| `??info` | Lihat informasi character | `??info` |
| `??reset` | Buat conversation baru (history disimpan) | `??reset` |
| `??reconnect` | Reconnect ke Character.AI | `??reconnect` |
| `??toggle` | Toggle auto-reply sapaan ON/OFF | `??toggle` |
| `??help` | Tampilkan panduan lengkap | `??help` |

## Konfigurasi Lanjutan

### Whitelist Channel Tertentu

Jika ingin bot hanya aktif di channel tertentu:

```javascript
CHANNEL_IDS: ['1234567890123456789', '9876543210987654321'],
```

Cara mendapatkan Channel ID:
1. Aktifkan Developer Mode di Discord: Settings → Advanced → Developer Mode
2. Klik kanan channel → Copy ID

### Custom Prefix

Ubah prefix command sesuai keinginan:

```javascript
PREFIX: '!',  // atau '.', atau 'bot!', dll
```

### Tambah/Edit Keyword Sapaan

Tambahkan keyword sapaan custom:

```javascript
GREETING_KEYWORDS: [
  'halo', 'hai', 'hey',
  'yo', 'woi', 'cuy',    // tambah slang
  'permisi', 'excuse me', // tambah formal
],
```

### Matikan Auto-Reply Sapaan

```javascript
AUTO_REPLY_GREETINGS: false,
```

## Keamanan & Best Practices

### 1. Jangan Share Token

**JANGAN PERNAH** commit atau share token kamu di GitHub/public!

Buat file `.env` untuk menyimpan token:

```bash
npm install dotenv
```

Buat file `.env`:

```env
DISCORD_TOKEN=your_discord_token_here
CAI_TOKEN=your_cai_token_here
CHARACTER_ID=your_character_id_here
```

Update `bot.js`:

```javascript
import dotenv from 'dotenv';
dotenv.config();

const CONFIG = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CAI_TOKEN: process.env.CAI_TOKEN,
  CHARACTER_ID: process.env.CHARACTER_ID,
  // ...
};
```

Tambahkan `.env` ke `.gitignore`:

```
.env
node_modules/
```

### 2. Rate Limiting

Character.AI punya rate limit. Jangan spam request!

### 3. Token Expiration

Token Character.AI bisa expired. Jika bot tiba-tiba error, dapatkan token baru.

## Troubleshooting

### Bot tidak online di Discord

- ✅ Cek token Discord sudah benar
- ✅ Pastikan **Message Content Intent** sudah diaktifkan
- ✅ Cek bot sudah di-invite ke server dengan permission yang benar

### Bot tidak reply

- ✅ Cek token Character.AI masih valid
- ✅ Pastikan `CHANNEL_IDS` kosong atau berisi ID channel yang benar
- ✅ Cek console untuk error message

### Error: "Unexpected token '<', "<!DOCTYPE "..."

Token Character.AI expired atau invalid. Dapatkan token baru.

### Bot reply lambat

- Character.AI server bisa lambat saat peak hours
- Cek koneksi internet kamu
- Coba reconnect: `??reconnect`

### Auto-reply tidak berfungsi

- Pastikan `AUTO_REPLY_GREETINGS: true`
- Pesan harus pendek (< 50 karakter)
- Pesan harus mengandung keyword sapaan

## Logs

Bot akan menampilkan log di console:

```bash
🚀 Starting bot...
🤖 Bot Discord siap: BotName#1234
🔐 Mencoba login ke server Airy...
✅ Berhasil login ke server Airy
ℹ️ Menggunakan default character info
✅ Connected ke character chat
💬 [GREETING] [Username]: halo
🤖 [Character]: Halo juga! Ada yang bisa aku bantu?
```

## Support & Kontribusi

### Menemukan Bug?

1. Cek [Issues](https://github.com/MalikTzys/NodeAi/issues) yang sudah ada
2. Buat issue baru dengan detail:
   - Versi Node.js
   - Error message lengkap
   - Langkah-langkah untuk reproduce bug

### Ingin Berkontribusi?

1. Fork repository
2. Buat branch baru: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push ke branch: `git push origin feature-name`
5. Buat Pull Request

## License

MIT License - bebas digunakan untuk project pribadi atau komersial.

## Disclaimer

Bot ini menggunakan unofficial Character.AI API. Gunakan dengan bijak dan patuhi Terms of Service Character.AI. Developer tidak bertanggung jawab atas penyalahgunaan bot ini.

## Credits

- [discord.js](https://discord.js.org/) - Discord API wrapper
- [cainode](https://github.com/KevinAdhaikal/CAINode) - Character.AI API wrapper
- [Character.AI](https://character.ai/) - AI Platform

---

**Made with love by [Malik Hanafi]**

Jika berguna, kasih ⭐ ya!
