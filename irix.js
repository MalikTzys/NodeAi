import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { CAINode } from 'cainode';

const CONFIG = {
  DISCORD_TOKEN: 'DISCORD_BOT_TOKEN',
  CAI_TOKEN: 'HTTP_TOKEN',
  CHARACTER_ID: 'CHAR_ID',
  PREFIX: '??',
  CHANNEL_IDS: [],
  TYPING_INDICATOR: true,
  MAX_MESSAGE_LENGTH: 2000,
  AUTO_REPLY_GREETINGS: true,
  GREETING_KEYWORDS: [
    'halo', 'hai', 'hey', 'hi', 'hello',
    'selamat pagi', 'pagi', 'good morning', 'morning',
    'selamat siang', 'siang', 'good afternoon', 'afternoon',
    'selamat sore', 'sore', 'good evening', 'evening',
    'selamat malam', 'malam', 'good night', 'night',
    'apa kabar', 'how are you', 'how r u',
    'p', 'ping', 'bot', 'ada', 'haloo', 'halloo',
  ],
};

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

async function authenticateCAI() {
  try {
    console.log('🔐 Mencoba login ke server Character.Ai...');
    await cai.login(CONFIG.CAI_TOKEN);
    console.log('✅ Berhasil login ke server Character.Ai');
    isAuthenticated = true;
    
    characterInfo = {
      participant__name: 'Character.Ai Server',
      title: 'Bot'
    };
    
    try {
      const info = await cai.character.info(CONFIG.CHARACTER_ID);
      if (info && info.participant__name) {
        characterInfo = info;
        console.log(`✅ Character loaded: ${characterInfo.participant__name}`);
      }
    } catch (charError) {
      console.log('ℹ️ Menggunakan default character info');
    }
    
    try {
      await cai.character.connect(CONFIG.CHARACTER_ID);
      isConnected = true;
      console.log('✅ Connected ke character chat');
    } catch (connectError) {
      console.error('⚠️ Gagal connect ke character:', connectError.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Gagal autentikasi:', error.message);
    return false;
  }
}

async function sendToCharacterAI(message) {
  try {
    console.log('📤 Mengirim pesan ke server Character.Ai...');
    const response = await cai.character.send_message(message, false);
    
    if (response && response.turn && response.turn.author) {
      const replies = response.turn.candidates || [];
      if (replies.length > 0) {
        return replies[0].raw_content || '[Tidak ada respons]';
      }
    }
    
    throw new Error('Response tidak valid dari server Character.Ai');
  } catch (error) {
    console.error('❌ Error saat mengirim pesan:', error.message);
    throw error;
  }
}

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

function isGreeting(message) {
  if (!CONFIG.AUTO_REPLY_GREETINGS) return false;
  
  const content = message.content.toLowerCase().trim();
  if (content.length > 50) return false;
  
  return CONFIG.GREETING_KEYWORDS.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(content);
  });
}

function shouldRespond(message) {
  if (message.author.bot) return false;

  if (CONFIG.CHANNEL_IDS.length > 0) {
    if (!CONFIG.CHANNEL_IDS.includes(message.channel.id)) return false;
  }

  const isMentioned = message.mentions.has(client.user);
  const isDM = message.channel.type === 1;
  const isGreetingMsg = isGreeting(message);

  return isMentioned || isDM || isGreetingMsg;
}

function extractMessage(message) {
  let content = message.content;
  content = content.replace(/<@!?\d+>/g, '').trim();
  
  if (content.startsWith(CONFIG.PREFIX)) {
    content = content.slice(CONFIG.PREFIX.length).trim();
  }
  
  return content;
}

client.once('clientReady', async () => {
  console.log(`🤖 Bot Discord siap: ${client.user.tag}`);
  
  const loginSuccess = await authenticateCAI();
  
  if (!loginSuccess) {
    console.error('⚠️ Bot tidak bisa chat dengan server');
  }
  
  if (isAuthenticated && characterInfo) {
    client.user.setPresence({
      activities: [{ name: `${characterInfo.participant__name || characterInfo.title}`, type: 0 }],
      status: 'online'
    });
  }
});

client.on('messageCreate', async (message) => {
  if (!shouldRespond(message)) return;
  
  if (!isAuthenticated || !isConnected) {
    return message.reply('❌ Bot belum siap. Tunggu sebentar atau hubungi admin.');
  }

  const userMessage = extractMessage(message);
  if (!userMessage) {
    const charName = characterInfo?.participant__name || characterInfo?.title || 'Character';
    return message.reply(`Hai! Mention aku atau kirim DM untuk ngobrol dengan **${charName}**!`);
  }

  const isMentioned = message.mentions.has(client.user);
  const isDM = message.channel.type === 1;
  const isGreetingMsg = isGreeting(message);
  
  const interactionType = isDM ? 'DM' : isMentioned ? 'MENTION' : isGreetingMsg ? 'GREETING' : 'UNKNOWN';
  console.log(`💬 [${interactionType}] [${message.author.tag}]: ${userMessage}`);

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
      .setDescription('Maaf, terjadi kesalahan saat memproses pesan kamu.')
      .addFields({ 
        name: 'Error Details', 
        value: error.message.substring(0, 1000) 
      })
      .setFooter({ text: 'Coba lagi atau gunakan ??reconnect' })
      .setTimestamp();
    
    await message.reply({ embeds: [errorEmbed] });
  }
});

client.on('messageCreate', async (message) => {
  const content = message.content.toLowerCase();
  if (content === `${CONFIG.PREFIX}reset` || content === `<@${client.user.id}> reset`) {
    if (!isConnected) {
      return message.reply('❌ Bot belum terkoneksi ke character.');
    }
    
    try {
      await cai.character.create_new_conversation(true);
      await message.reply('✅ Conversation baru berhasil dibuat! Chat history sebelumnya sudah disimpan.');
      console.log(`🔄 Conversation reset oleh: ${message.author.tag}`);
    } catch (error) {
      console.error('❌ Gagal reset conversation:', error);
      await message.reply('❌ Gagal reset conversation: ' + error.message);
    }
  }
});

client.on('messageCreate', async (message) => {
  const content = message.content.toLowerCase();
  if (content === `${CONFIG.PREFIX}reconnect` || content === `<@${client.user.id}> reconnect`) {
    await message.reply('🔄 Mencoba reconnect...');
    
    try {
      if (isConnected) {
        await cai.character.disconnect();
      }
      await cai.character.connect(CONFIG.CHARACTER_ID);
      isConnected = true;
      await message.reply('✅ Berhasil reconnect ke character!');
      console.log(`🔄 Reconnect oleh: ${message.author.tag}`);
    } catch (error) {
      console.error('❌ Gagal reconnect:', error);
      await message.reply('❌ Gagal reconnect: ' + error.message);
    }
  }
});

client.on('messageCreate', async (message) => {
  const content = message.content.toLowerCase();
  if (content === `${CONFIG.PREFIX}info` || content === `<@${client.user.id}> info`) {
    if (!characterInfo) {
      return message.reply('❌ Character info belum dimuat.');
    }

    const charName = characterInfo.participant__name || characterInfo.title || 'Unknown';
    const charDesc = characterInfo.description || characterInfo.greeting || 'Tidak ada deskripsi';
    
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`🤖 ${charName}`)
      .setDescription(charDesc.substring(0, 4000))
      .addFields(
        { name: '🤖 Status', value: isConnected ? '✅ Connected' : '❌ Disconnected', inline: true },
        { name: '🔑 Character ID', value: CONFIG.CHARACTER_ID.substring(0, 20) + '...', inline: true },
      )
      .setFooter({ text: 'server Character.Ai Integration' })
      .setTimestamp();
    
    if (characterInfo.avatar_file_name) {
      embed.setThumbnail(`https://characterai.io/i/80/static/avatars/${characterInfo.avatar_file_name}`);
    }

    await message.reply({ embeds: [embed] });
  }
});

client.on('messageCreate', async (message) => {
  const content = message.content.toLowerCase();
  if (content === `${CONFIG.PREFIX}ping` || content === `<@${client.user.id}> ping`) {
    const embed = new EmbedBuilder()
      .setColor(isConnected ? '#00ff00' : '#ff0000')
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '⏱️ Latency', value: `${Date.now() - message.createdTimestamp}ms`, inline: true },
        { name: '🌐 API Latency', value: `${Math.round(client.ws.ping)}ms`, inline: true },
        { name: '🤖 CAI Status', value: isConnected ? '✅ Connected' : '❌ Disconnected', inline: true },
      )
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
});

client.on('messageCreate', async (message) => {
  const content = message.content.toLowerCase();
  if (content === `${CONFIG.PREFIX}help` || content === `<@${client.user.id}> help`) {
    const charName = characterInfo?.participant__name || characterInfo?.title || 'Character';
    
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📚 Command List')
      .setDescription(`Bot ini terintegrasi dengan **${charName}** dari Character.AI`)
      .addFields(
        { 
          name: '💬 Cara Chat', 
          value: '**Sapaan:** Kirim sapaan seperti "halo", "pagi", dll (otomatis reply)\n**Chat biasa:** Mention bot `@' + client.user.username + '` atau kirim DM', 
          inline: false 
        },
        { name: `${CONFIG.PREFIX}ping`, value: 'Cek status & latency bot', inline: true },
        { name: `${CONFIG.PREFIX}info`, value: 'Lihat info character', inline: true },
        { name: `${CONFIG.PREFIX}reset`, value: 'Buat conversation baru', inline: true },
        { name: `${CONFIG.PREFIX}reconnect`, value: 'Reconnect ke character', inline: true },
        { name: `${CONFIG.PREFIX}toggle`, value: 'Toggle auto-reply sapaan', inline: true },
        { name: `${CONFIG.PREFIX}help`, value: 'Tampilkan help ini', inline: true },
      )
      .setFooter({ text: 'server Character.Ai Discord Bot' })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
  }
});

client.on('messageCreate', async (message) => {
  const content = message.content.toLowerCase();
  if (content === `${CONFIG.PREFIX}toggle` || content === `<@${client.user.id}> toggle`) {
    CONFIG.AUTO_REPLY_GREETINGS = !CONFIG.AUTO_REPLY_GREETINGS;
    
    const status = CONFIG.AUTO_REPLY_GREETINGS ? '✅ AKTIF' : '❌ NONAKTIF';
    const embed = new EmbedBuilder()
      .setColor(CONFIG.AUTO_REPLY_GREETINGS ? '#00ff00' : '#ff0000')
      .setTitle('🔄 Auto-Reply Sapaan')
      .setDescription(`Auto-reply untuk sapaan sekarang: **${status}**`)
      .addFields({
        name: 'ℹ️ Info',
        value: CONFIG.AUTO_REPLY_GREETINGS 
          ? 'Bot akan otomatis reply sapaan seperti "halo", "pagi", dll tanpa perlu mention'
          : 'Bot hanya akan reply jika di-mention atau DM'
      })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    console.log(`🔄 Auto-reply greetings ${status} oleh: ${message.author.tag}`);
  }
});

client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down...');
  if (isConnected) {
    await cai.character.disconnect();
  }
  if (isAuthenticated) {
    await cai.logout();
  }
  process.exit(0);
});

console.log('🚀 Starting bot...');
client.login(CONFIG.DISCORD_TOKEN).catch((error) => {
  console.error('❌ Gagal login ke Discord:', error);
  process.exit(1);
});