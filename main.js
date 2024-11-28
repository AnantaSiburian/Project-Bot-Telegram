require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { google } = require('googleapis');
const fs = require('fs');

// BOT TOKEN + SHEET ID
const BOT_TOKEN = process.env.BOT_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const KOLOM_NODEB = JSON.parse(process.env.KOLOM_NODEB);
const KOLOM_FTTH = process.env.KOLOM_FTTH;
const KOLOM_OLO = process.env.KOLOM_OLO;
const KOLOM_HEM = process.env.KOLOM_HEM;
const KOLOM_PT2 = process.env.KOLOM_PT2;


// Membaca user yang diberikan akses
function loadAllowedUsers() {
  if (fs.existsSync('allowed_users.json')) {
    return JSON.parse(fs.readFileSync('allowed_users.json', 'utf-8')).allowed_users;
  }
  return [];
}

// Menyimpan User yang diberikan akses
function saveAllowedUsers(users) {
  fs.writeFileSync('allowed_users.json', JSON.stringify({ allowed_users: users }, null, 2));
}

// Initialize allowed users
let allowedUsers = loadAllowedUsers();

// Bot and Google Sheets setup
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

// State for user status tracking
const userStates = {};

// Google Sheets data read function
async function readSheetData(sheetName) {
  const sheets = google.sheets({ version: 'v4', auth });
  const range = `${sheetName}!A1:CF`; // Range yang diperlukan
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: range,
  });
  return response.data.values;
}

function findPartialMatch(data, column, input) {
  const inputLower = input.toLowerCase();
  for (const row of data) {
    if (row[column] && row[column].toLowerCase().includes(inputLower)) {
      return row; 
    }
  }
  return null; 
}

function findNodeBMatch(data, colIndex1, colIndex2, input) {
  const inputLower = input.toLowerCase();
  
  for (const row of data) {
    if ((row[colIndex1] && row[colIndex1].toLowerCase().includes(inputLower)) ||
        (row[colIndex2] && row[colIndex2].toLowerCase().includes(inputLower))) {
      return row; 
    }
  }
  
  return null; 
}

function escapeMarkdown(text) { //Mengubah beberapa entittas/simbol yang menyebabkan error
  return text
  .replace(/\\/g, '\\\\') 
  .replace(/_/g, '\\_')
  .replace(/\[/g, '\\[')
  .replace(/\]/g, '\\]')
  .replace(/~/g, '\\~')
  .replace(/`/g, '\\`')
  .replace(/>/g, '\\>');
}

// Fungsi untuk mencari laporan dari sheet NodeB berdasarkan Site ID
async function reportNodeB(siteId, reportType) {
  const data = await readSheetData('NodeB');
  const row = findNodeBMatch(data, parseInt(KOLOM_NODEB[0]), parseInt(KOLOM_NODEB[1]), siteId); 
  const ket = data[0];
  let report = '';  
    if (row){
        for (let i = 1; i < row.length; i++) {
          if (row[i] && row[i].trim() !== '') {
            report += `${escapeMarkdown(ket[i])}: ***${escapeMarkdown(row[i])}***\n\n`;
           }
          }
        return `NodeB:\n\n` + report
        + `Maps: https://maps.google.com/maps?q=${escapeMarkdown(row[9])}+${escapeMarkdown(row[10])}\n`;
      }
    return 'Site ID tidak ditemukan pada NodeB. \nSilakan mulai kembali dengan mengetik /nodeb, /ftth, /pt2, /hem, atau /olo.';
  }

// Fungsi untuk mencari laporan dari sheet FTTH berdasarkan Site Name
async function reportFTTH(siteName, reportType) {
  const data = await readSheetData('FTTH');
  const row = findPartialMatch(data, KOLOM_FTTH, siteName); 
  const ket = data[0];
  let report = '';  
  if (row){
        for (let i = 0; i < row.length; i++) {
          if (row[i] && row[i].trim() !== '') {
            report += `${escapeMarkdown(ket[i])}: ***${escapeMarkdown(row[i])}***\n\n`;
           }
          }
        return `FTTH:\n\n` + report;
      }
  return 'LOP Name tidak ditemukan pada FTTH. \nSilakan mulai kembali dengan mengetik /nodeb, /ftth, /pt2, /hem, atau /olo.';
}

// Fungsi untuk mencari laporan dari sheet HEM berdasarkan Site Name
async function reportHEM(siteName, reportType) {
  const data = await readSheetData('HEM');
  const row = findPartialMatch(data, KOLOM_HEM, siteName); 
  const ket = data[0];
  let report = '';  
  if (row){
        for (let i = 1; i < row.length; i++) {
          if (row[i] && row[i].trim() !== '') {
            report += `${escapeMarkdown(ket[i])}: ***${escapeMarkdown(row[i])}***\n\n`;
           }
          }
        return `HEM:\n\n` + report + `Maps: https://maps.google.com/maps?q=${escapeMarkdown(row[14]).replace(/\s+/g, '+').replace(/,+/g, '')}`;
        }
  return 'Site Name tidak ditemukan pada HEM. \nSilakan mulai kembali dengan mengetik /nodeb, /ftth, /pt2, /hem, atau /olo.';
}

// Fungsi untuk mencari laporan dari sheet QE berdasarkan Site Name
async function reportOLO(siteName, reportType) {
  const data = await readSheetData('OLO');
  const row = findPartialMatch(data, KOLOM_OLO, siteName); 
  const ket = data[0];
  let report = '';  
  if (row){
        for (let i = 1; i < row.length; i++) {
          if (row[i] && row[i].trim() !== '') {
            report += `${escapeMarkdown(ket[i])}: ***${escapeMarkdown(row[i])}***\n\n`;
           }
          }
        return `OLO:\n\n` + report
        + `Maps: https://maps.google.com/maps?q=${row[9].replace(/\s+/g, '+').replace(/,+/g, '')}`;
      }
  return 'Nomor AO tidak ditemukan pada OLO. \nSilakan mulai kembali dengan mengetik /nodeb, /ftth, /pt2, /hem, atau /olo.';
}

async function reportPT2(siteName, reportType) {
  const data = await readSheetData('PT2');
  const row = findPartialMatch(data, KOLOM_PT2, siteName); 
  const ket = data[0];
  let report = '';  
  if (row){
        for (let i = 0; i < row.length; i++) {
          if (row[i] && row[i].trim() !== '') {
            report += `${escapeMarkdown(ket[i])}: ***${escapeMarkdown(row[i])}***\n\n`;
           }
          }
        return `PT2:\n\n` + report;
      }
  return 'LOP Kode tidak ditemukan pada PT2. \nSilakan mulai kembali /nodeb, /ftth, /pt2, /hem, atau /olo.';
}

function sendLongMessage(chatId, message) {
  const maxMessageLength = 4096; 
  let start = 0;

  while (start < message.length) {
    let part = message.substring(start, start + maxMessageLength);

    bot.sendMessage(chatId, part, { parse_mode: 'Markdown' }).catch((error) => {
      console.error('Error sending message part:', error);
    });

    start += maxMessageLength;
  }
}

// INLINE KEYBOARD
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const reportType = callbackQuery.data;
  const username = callbackQuery.from.username || "No Username"; // Extract the username
  const name = `${callbackQuery.from.first_name || ""} ${callbackQuery.from.last_name || ""}`.trim();

  // Security Check
  if (!allowedUsers.includes(username)) {
    bot.sendMessage(chatId, "Mohon Maaf, Anda Tidak Memiliki Akses.");
    const logEntry = `Akses tidak dikenal dari username: ${username}, name: ${name}\n`;

    // Append the log entry to "access_attempts.log" file
    fs.appendFile("access_attempts.log", logEntry, (err) => {
      if (err) {
        console.error("Error", err);
      }
    });
    return;
  }

  const userState = userStates[chatId];

  if (userState && ['laporan'].includes(reportType)) {
    userStates[chatId].reportType = reportType;

    if (userState.selection === '/nodeb') {
      bot.sendMessage(chatId, 'Masukkan Site ID/Site Name:');
    } else if (userState.selection === '/ftth') {
      bot.sendMessage(chatId, 'Masukkan LoP Name:');
    } else if (userState.selection === '/pt2') {
      bot.sendMessage(chatId, 'Masukkan LoP Name:');
    } else if (userState.selection === '/hem') {
      bot.sendMessage(chatId, 'Masukkan Nomor Order:');
    } else if (userState.selection === '/olo') {
      bot.sendMessage(chatId, 'Masukkan Nomor AO:');
    } else {
      bot.sendMessage(chatId, `Masukkan Site Name ${userState.selection.slice(1).toUpperCase()}:`);
    }
    userStates[chatId].step = 'awaiting_site_input';
  } else {
    bot.sendMessage(chatId, 'Error, mulai kembali /nodeb, /ftth, /pt2, /hem, atau /olo.');
  }
});

// Handle message commands for /nodeb, /ftth, /hem, and /olo
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;
  const username = msg.from.username || 'No Username';
  const name = `${msg.from.first_name || ''} ${msg.from.last_name || ''}`.trim();

  // Security Check
  if (!allowedUsers.includes(username) && username !== ADMIN_USERNAME) {
    bot.sendMessage(chatId, 'Mohon Maaf, Anda Tidak Memiliki Akses.');

    const logEntry = `Unauthorized access attempt: username: ${username}, name: ${name}\n`;
    fs.appendFileSync('access_attempts.log', logEntry);
    return;
  }

  // Admin-only commands to add/remove users
  if (ADMIN_USERNAME.includes(username)) {
    if (userMessage.startsWith('/tambah ')) {
      const newUser = userMessage.split(' ')[1].trim();
      if (!allowedUsers.includes(newUser)) {
        allowedUsers.push(newUser);
        saveAllowedUsers(allowedUsers);
        bot.sendMessage(chatId, `${newUser} telah berhasil ditambahkan.`);
      } else {
        bot.sendMessage(chatId, `${newUser} sudah terdaftar.`);
      }
      return;
    } else if (userMessage.startsWith('/hapus ')) {
      const removeUser = userMessage.split(' ')[1].trim();
      const index = allowedUsers.indexOf(removeUser);
      if (index !== -1) {
        allowedUsers.splice(index, 1);
        saveAllowedUsers(allowedUsers);
        bot.sendMessage(chatId, `${removeUser} telah berhasil dihapus.`);
      } else {
        bot.sendMessage(chatId, `${removeUser} bukan user yang memiliki akses.`);
      }
      return;
    }
  }

  // Handle report commands
  if (['/nodeb', '/ftth', '/hem', '/qe', '/pt2', '/olo'].includes(userMessage)) {
    userStates[chatId] = { step: 'awaiting_report_type', selection: userMessage };

    // Inline keyboard for report type selection
    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Laporan', callback_data: 'laporan' }],
        ],
      },
    };

    bot.sendMessage(chatId, 'Pilih Jenis Laporan:', options);
  } else if (userStates[chatId] && userStates[chatId].step === 'awaiting_site_input') {
    const { selection, reportType } = userStates[chatId];

    let report;
    if (selection === '/nodeb') {
      report = reportNodeB(userMessage, reportType);
    } else if (selection === '/ftth') {
      report = reportFTTH(userMessage, reportType);
    } else if (selection === '/hem') {
      report = reportHEM(userMessage, reportType);
    } else if (selection === '/pt2') {
      report = reportPT2(userMessage, reportType);
    } else if (selection === '/olo') {
      report = reportOLO(userMessage, reportType);
    }

    bot.sendMessage(chatId, `Memuat Laporan ${reportType}...`);
    report.then((message) => {
    sendLongMessage(chatId, message);

  // Clear the user's state after the report is sent
  delete userStates[chatId];
    }).catch(() => {
      bot.sendMessage(chatId, 'Error Memuat Laporan. Mohon ulang /nodeb, /ftth, /pt2, /hem, atau /olo.');
    });
  } else {
    bot.sendMessage(chatId, 'Command Tidak Dikenal. Tolong Gunakan /nodeb, /ftth, /pt2 /hem, atau /olo.');
  }
});

console.log('Bot sedang berjalan...');