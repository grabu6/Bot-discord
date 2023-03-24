const Discord= require ('discord.js');
const client= new Discord.Client();
const prefix= '/';
const {crearCarpeta,crearDoc,insertarText}= require('./model/documents');
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const {config}=require('dotenv');
config();
const token_discord= process.env.TOKEN_DISCORD;



const SCOPES = ['https://www.googleapis.com/auth/drive.file',
'https://www.googleapis.com/auth/documents'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

 
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

async function listFiles(authClient) {
  const drive = google.drive({version: 'v3', auth: authClient});
  const res = await drive.files.list({
    pageSize: 10,
    fields: 'nextPageToken, files(id, name)',
  });
  const files = res.data.files;
  if (files.length === 0) {
    console.log('No files found.');
    return;
  }

  console.log('Files:');
  files.map((file) => {
    console.log(`${file.name} (${file.id})`);
  });
}

authorize().then(listFiles).catch(console.error);


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async msg => {
    if(msg.content.startsWith(prefix)) {
        const [command, ...args] = msg.content.slice(prefix.length).split(' ');
        
        if (command === 'crear') {
            const title = args.join(' ');
            try {
              const carpeta = await crearCarpeta();
              const documentId = await crearDoc(title, carpeta.id);
              msg.reply(`Document creat amb el nom: ${title}`);
      
              let capturant = true;
              client.on('message', async msg2 => {
                if (capturant && msg2.content !== '' && !msg2.author.bot && !msg2.content.startsWith(prefix)) {
                    const text = msg2.content;
                    await insertarText(documentId, text);
                }
                if (msg2.content.startsWith(prefix)) {
                  const [command] = msg2.content.slice(prefix.length).split(' ');
                  if (command === 'stop') {
                    capturant = false;
                    msg2.reply('Captura de missatges desactivat');
                  }
                }
              });
            } catch (error) {
              console.log(error);
              msg.reply('Error al crear el document');
            }
          }
            }
        }
);

client.login(token_discord);

