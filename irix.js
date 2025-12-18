import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { CAINode } from 'cainode';

// ============ KONFIGURASI ============
const CONFIG = {
  DISCORD_TOKEN: 'YOUR_DISCORD_TOKEN',
  CAI_TOKEN: 'YOUR_HTTP_TOKEN',
  CHARACTER_ID: 'YOUT_CHARACTER_ID',
  PREFIX: '???',
  CHANNEL_IDS: [],
  TYPING_INDICATOR: true,
  MAX_MESSAGE_LENGTH: 2000,
  AUTO_RESET_HOURS: [0, 12], // Reset di jam 00:00 dan 12:00 WIB
  AUTO_RECONNECT_INTERVAL: 30000, // Cek koneksi setiap 30 detik
  MAX_RECONNECT_ATTEMPTS: 10, // Maksimal percobaan reconnect berturut-turut
};

// ============ INISIALISASI ============
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

const cai = new CAINode();
let isAuthenticated = false;
let isConnected = false;
let characterInfo = null;
let reconnectAttempts = 0;
let isReconnecting = false;
let lastResetDate = new Date().toDateString();
let lastResetHour = -1;

// ============ FUNGSI HELPER ============

// Autentikasi ke Xeno
async function authenticateCAI() {
  try {
    console.log('🔐 Mencoba login ke Xeno...');
    await cai.login(CONFIG.CAI_TOKEN);
    console.log('✅ Berhasil login ke Xeno');
    isAuthenticated = true;
    
    characterInfo = {
      participant__name: 'Xeno Server',
      title: 'Character Server',
      description: 'Xeno Integration'
    };
    
    try {
      const info = await cai.character.info(CONFIG.CHARACTER_ID);
      if (info && info.participant__name) {
        characterInfo = info;
        console.log(`✅ Character loaded: ${characterInfo.participant__name}`);
      }
    } catch (charError) {
      console.log('ℹ️ Menggunakan default character info (API mungkin limited)');
    }
    
    try {
      await cai.character.connect(CONFIG.CHARACTER_ID);
      isConnected = true;
      reconnectAttempts = 0;
      console.log('✅ Connected ke character chat');
    } catch (connectError) {
      console.error('⚠️ Gagal connect ke character:', connectError.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Gagal autentikasi:', error.message);
    console.error('Token mungkin expired atau invalid. Silakan dapatkan token baru!');
    return false;
  }
}

// Auto reconnect function
async function attemptReconnect() {
  if (isReconnecting || !isAuthenticated) return;
  
  isReconnecting = true;
  reconnectAttempts++;
  
  console.log(`🔄 Percobaan reconnect ke-${reconnectAttempts}...`);
  
  try {
    if (isConnected) {
      try {
        await cai.character.disconnect();
      } catch (e) {
        console.log('ℹ️ Disconnect sebelum reconnect gagal (mungkin sudah terputus)');
      }
      isConnected = false;
    }
    
    await cai.character.connect(CONFIG.CHARACTER_ID);
    isConnected = true;
    reconnectAttempts = 0;
    console.log('✅ Reconnect berhasil!');
    
    // Update presence
    if (characterInfo) {
      client.user.setPresence({
        activities: [{ name: `${characterInfo.participant__name || characterInfo.title}`, type: 0 }],
        status: 'online'
      });
    }
  } catch (error) {
    console.error(`❌ Reconnect gagal (percobaan ${reconnectAttempts}):`, error.message);
    
    if (reconnectAttempts >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.error('⚠️ Maksimal percobaan reconnect tercapai, akan coba autentikasi ulang...');
      reconnectAttempts = 0;
      
      try {
        await authenticateCAI();
      } catch (authError) {
        console.error('❌ Autentikasi ulang gagal:', authError.message);
      }
    }
  } finally {
    isReconnecting = false;
  }
}

// Cek dan auto reconnect jika terputus
async function checkConnectionHealth() {
  if (!isAuthenticated) {
    console.log('⚠️ Belum terotentikasi, mencoba login...');
    await authenticateCAI();
    return;
  }
  
  if (!isConnected && !isReconnecting) {
    console.log('⚠️ Koneksi terputus, mencoba reconnect...');
    await attemptReconnect();
  }
}

// Auto reset conversation di jam tertentu
async function checkAutoReset() {
  const now = new Date();
  const wibOffset = 7 * 60; // WIB = UTC+7
  const wibTime = new Date(now.getTime() + wibOffset * 60 * 1000);
  
  const currentHour = wibTime.getUTCHours();
  const currentDate = wibTime.toDateString();
  
  // Cek apakah sudah ganti hari
  if (currentDate !== lastResetDate) {
    lastResetDate = currentDate;
    lastResetHour = -1;
  }
  
  // Cek apakah jam reset dan belum direset di jam ini
  if (CONFIG.AUTO_RESET_HOURS.includes(currentHour) && lastResetHour !== currentHour) {
    console.log(`⏰ Auto reset conversation di jam ${currentHour}:00 WIB`);
    
    try {
      if (isConnected) {
        await cai.character.create_new_conversation(true);
        lastResetHour = currentHour;
        console.log(`✅ Auto reset berhasil di ${wibTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`);
      } else {
        console.log('⚠️ Skip auto reset karena tidak terkoneksi');
      }
    } catch (error) {
      console.error('❌ Auto reset gagal:', error.message);
    }
  }
}

// Kirim pesan ke Xeno dengan auto-reconnect
async function sendToCharacterAI(message) {
  try {
    console.log('📤 Mengirim pesan ke Xeno...');
    
    const response = await cai.character.send_message(message, false);
    
    if (response && response.turn && response.turn.author) {
      const replies = response.turn.candidates || [];
      if (replies.length > 0) {
        reconnectAttempts = 0; // Reset counter jika sukses
        return replies[0].raw_content || '[Tidak ada respons]';
      }
    }
    
    throw new Error('Response tidak valid dari Xeno');
    
  } catch (error) {
    console.error('❌ Error saat mengirim pesan:', error.message);
    
    // Jika error, tandai sebagai disconnected dan coba reconnect
    isConnected = false;
    console.log('⚠️ Menandai sebagai disconnected, akan auto-reconnect...');
    
    throw error;
  }
}

// Split pesan panjang
function splitMessage(text, maxLength = CONFIG.MAX_MESSAGE_LENGTH) {
  if (!text) return ['[Tidak ada respons]'];
  
  const messages = [];
  let current = '';

  const lines = text.split('\n');
  for (const line of lines) {
    if ((current + line + '\n').length > maxLength) {
      if (current) messages.push(current.trim());
      current = line + '\n';
    } else {
      current += line + '\n';
    }
  }
  
  if (current) messages.push(current.trim());
  return messages.length > 0 ? messages : ['[Tidak ada respons]'];
}

// Cek apakah pesan untuk Server
function shouldRespond(message) {
  if (message.author.bot) return false;

  if (CONFIG.CHANNEL_IDS.length > 0) {
    if (!CONFIG.CHANNEL_IDS.includes(message.channel.id)) return false;
  }

  const isMentioned = message.mentions.has(client.user);
  const isDM = message.channel.type === 1;

  return isMentioned || isDM;
}

// Ekstrak pesan (hapus mention)
function extractMessage(message) {
  let content = message.content;
  
  content = content.replace(/<@!?\d+>/g, '').trim();
  
  if (content.startsWith(CONFIG.PREFIX)) {
    content = content.slice(CONFIG.PREFIX.length).trim();
  }
  
  return content;
}

// ============ EVENT HANDLERS ============

client.once('ready', async () => {
  console.log(`🤖 Server Discord siap: ${client.user.tag}`);
  
  const loginSuccess = await authenticateCAI();
  
  if (!loginSuccess) {
    console.error('⚠️ Server tidak bisa chat dengan Xeno');
    console.error('Silakan cek token dan restart Server');
  }
  
  if (isAuthenticated && characterInfo) {
    client.user.setPresence({
      activities: [{ name: `${characterInfo.participant__name || characterInfo.title}`, type: 0 }],
      status: 'online'
    });
  }
  
  // Start auto reconnect checker
  setInterval(checkConnectionHealth, CONFIG.AUTO_RECONNECT_INTERVAL);
  console.log(`🔄 Auto-reconnect checker dimulai (interval: ${CONFIG.AUTO_RECONNECT_INTERVAL/1000}s)`);
  
  // Start auto reset checker (cek setiap 1 menit)
  setInterval(checkAutoReset, 60000);
  console.log(`⏰ Auto-reset checker dimulai (reset jam: ${CONFIG.AUTO_RESET_HOURS.join(', ')} WIB)`);
});

client.on('messageCreate', async (message) => {
  if (!shouldRespond(message)) return;
  
  if (!isAuthenticated) {
    return message.reply('❌ Server belum terotentikasi. Menunggu login...');
  }
  
  if (!isConnected) {
    return message.reply('⚠️ Server sedang reconnect... Tunggu sebentar ya!');
  }

  const userMessage = extractMessage(message);
  if (!userMessage) {
    const charName = characterInfo?.participant__name || characterInfo?.title || 'Character';
    return message.reply(`Hai! Mention aku atau kirim DM untuk ngobrol dengan **${charName}**!`);
  }

  console.log(`💬 [${message.author.tag}]: ${userMessage}`);

  if (CONFIG.TYPING_INDICATOR) {
    await message.channel.sendTyping();
  }

  try {
    const response = await sendToCharacterAI(userMessage);
    
    const charName = characterInfo?.participant__name || characterInfo?.title || 'Character';
    console.log(`🤖 [${charName}]: ${response}`);

    const messages = splitMessage(response);
    
    for (const msg of messages) {
      await message.reply(msg);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Error')
      .setDescription('Maaf, terjadi kesalahan. Server akan mencoba reconnect otomatis.')
      .addFields({ 
        name: 'Error Details', 
        value: error.message.substring(0, 1000) 
      })
      .setFooter({ text: 'Auto-reconnect aktif' })
      .setTimestamp();
    
    await message.reply({ embeds: [errorEmbed] });
  }
});

// Command: Reset conversation (manual)
client.on('messageCreate', async (message) => {
  const content = message.content.toLowerCase();
  if (content === `${CONFIG.PREFIX}reset` || content === `<@${client.user.id}> reset`) {
    if (!isConnected) {
      return message.reply('❌ Server belum terkoneksi ke character.');
    }
    
    try {
      await cai.character.create_new_conversation(true);
      await message.reply('✅ Conversation baru berhasil dibuat! Chat history sebelumnya sudah disimpan.');
      console.log(`🔄 Conversation reset manual oleh: ${message.author.tag}`);
    } catch (error) {
      console.error('❌ Gagal reset conversation:', error);
      await message.reply('❌ Gagal reset conversation: ' + error.message);
    }
  }
});

// Command: Reconnect (manual)
client.on('messageCreate', async (message) => {
  const content = message.content.toLowerCase();
  if (content === `${CONFIG.PREFIX}reconnect` || content === `<@${client.user.id}> reconnect`) {
    await message.reply('🔄 Mencoba reconnect...');
    
    await attemptReconnect();
    
    if (isConnected) {
      await message.reply('✅ Berhasil reconnect ke character!');
      console.log(`🔄 Reconnect manual oleh: ${message.author.tag}`);
    } else {
      await message.reply('❌ Reconnect gagal, akan dicoba otomatis dalam beberapa saat.');
    }
  }
});

// Command: Info
client.on('messageCreate', async (message) => {
  const content = message.content.toLowerCase();
  if (content === `${CONFIG.PREFIX}info` || content === `<@${client.user.id}> info`) {
    if (!characterInfo) {
      return message.reply('❌ Character info belum dimuat.');
    }

    const charName = characterInfo.participant__name || characterInfo.title || 'Unknown';
    const charDesc = characterInfo.description || characterInfo.greeting || 'Tidak ada deskripsi';
    
    const now = new Date();
    const wibOffset = 7 * 60;
    const wibTime = new Date(now.getTime() + wibOffset * 60 * 1000);
    const nextResetHours = CONFIG.AUTO_RESET_HOURS.filter(h => h > wibTime.getUTCHours());
    const nextReset = nextResetHours.length > 0 ? nextResetHours[0] : CONFIG.AUTO_RESET_HOURS[0];
    
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`🤖 ${charName}`)
      .setDescription(charDesc.substring(0, 4000))
      .addFields(
        { name: '🤖 Status', value: isConnected ? '✅ Connected' : '⚠️ Reconnecting...', inline: true },
        { name: '🔄 Auto-Reconnect', value: '✅ Aktif', inline: true },
        { name: '⏰ Next Reset', value: `${String(nextReset).padStart(2, '0')}:00 WIB`, inline: true },
        { name: '🔑 Character ID', value: CONFIG.CHARACTER_ID.substring(0, 20) + '...', inline: false },
      )
      .setFooter({ text: 'Xeno Integration with Auto-Reset & Reconnect' })
      .setTimestamp();
    
    if (characterInfo.avatar_file_name) {
      embed.setThumbnail(`https://characterai.io/i/80/static/avatars/${characterInfo.avatar_file_name}`);
    }

    await message.reply({ embeds: [embed] });
  }
});

// Command: Ping
client.on('messageCreate', async (message) => {
  const content = message.content.toLowerCase();
  if (content === `${CONFIG.PREFIX}ping` || content === `<@${client.user.id}> ping`) {
    const embed = new EmbedBuilder()
      .setColor(isConnected ? '#00ff00' : '#ff9900')
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '⏱️ Latency', value: `${Date.now() - message.createdTimestamp}ms`, inline: true },
        { name: '🌐 API Latency', value: `${Math.round(client.ws.ping)}ms`, inline: true },
        { name: '🤖 CAI Status', value: isConnected ? '✅ Connected' : '⚠️ Reconnecting', inline: true },
        { name: '🔄 Reconnect Attempts', value: `${reconnectAttempts}/${CONFIG.MAX_RECONNECT_ATTEMPTS}`, inline: true },
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
});

// Command: Help
client.on('messageCreate', async (message) => {
  const content = message.content.toLowerCase();
  if (content === `${CONFIG.PREFIX}help` || content === `<@${client.user.id}> help`) {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📚 Command List')
      .setDescription('Berikut adalah command yang tersedia:')
      .addFields(
        { name: '💬 Chat', value: `Mention Server atau kirim DM untuk chat dengan character`, inline: false },
        { name: `${CONFIG.PREFIX}ping`, value: 'Cek status & latency Server', inline: true },
        { name: `${CONFIG.PREFIX}info`, value: 'Lihat info character & sistem', inline: true },
        { name: `${CONFIG.PREFIX}reset`, value: 'Buat conversation baru (manual)', inline: true },
        { name: `${CONFIG.PREFIX}reconnect`, value: 'Reconnect ke character (manual)', inline: true },
        { name: `${CONFIG.PREFIX}help`, value: 'Tampilkan help ini', inline: true },
      )
      .addFields(
        { name: '🔄 Auto Features', value: '• Auto-Reconnect: Aktif setiap 30 detik\n• Auto-Reset: Setiap jam 00:00 & 12:00 WIB', inline: false }
      )
      .setFooter({ text: 'Xeno Discord Bot v2.0' })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
});

// Error handling
client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down...');
  if (isConnected) {
    try {
      await cai.character.disconnect();
    } catch (e) {
      console.log('ℹ️ Disconnect error saat shutdown (diabaikan)');
    }
  }
  if (isAuthenticated) {
    try {
      await cai.logout();
    } catch (e) {
      console.log('ℹ️ Logout error saat shutdown (diabaikan)');
    }
  }
  process.exit(0);
});

// ============ START Server ============
console.log('🚀 Starting Server...');
client.login(CONFIG.DISCORD_TOKEN).catch((error) => {
  console.error('❌ Gagal login ke Discord:', error);
  process.exit(1);
});
