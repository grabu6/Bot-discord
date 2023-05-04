const  Discord = require('discord.js');
const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.DirectMessages,
  Discord.GatewayIntentBits.Guilds,
  Discord.GatewayIntentBits.GuildMessages,
  Discord. GatewayIntentBits.MessageContent] });
const { SlashCommandBuilder } = require('discord.js');
const {crearCarpeta,insertarText}= require('./model/documents');
const process = require('process');
const debug = require('debug')('bot-discord');
const {config}=require('dotenv');
config();
const token_discord= process.env.TOKEN_DISCORD;

client.commands=new Discord.Collection();
const crear = new SlashCommandBuilder()
    .setName('crear')
    .setDescription('Crea una carpeta i un document a Google Drive que captura tot el text que s\'escriu al xat')
;

client.on('ready', () => {
    debug(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
        if (interaction.commandName === 'crear') {
          try {
            await interaction.deferReply();
            const {carpetaId, canalIds} = await crearCarpeta(interaction,client);
            await interaction.editReply(`Carpeta creada correctament`);

            client.on('messageCreate', async msg2 => {
              if (msg2.attachments.size > 0) {
                  const attachment = msg2.attachments.first();
                  const authorName = msg2.author.username;
                  debug(authorName);
                  const text = msg2.content || attachment.name;
                for (const docId of canalIds) {
                  await insertarText(docId, authorName, text, attachment);
                }
              } else if (msg2.content !== '' && !msg2.author.bot) {               
                  const authorName = msg2.author.username;  
                  debug(authorName);
                  const text = msg2.content;
                  for (const docId of canalIds) {
                    await insertarText(docId, authorName, text);
                  }
              }
            }             
            );    
            client.on('messageUpdate', async (oldMessage, newMessage) => {
              try {
                const authorName = newMessage.author.username;
                const newText = newMessage.content;
                const oldText = oldMessage.content;
                const text=`El missatge "${oldText}" ha estat modificat per "${newText}"en el canal ${newMessage.channel.name}.`;

                for (const docId of canalIds) {
                  await insertarText(docId, authorName, text);
                }
              
              } catch (error) {
                debug(error);
              }
            }),

            client.on('messageDelete', async msg => {
              const authorName = msg.author.username;
              let text;

              if (msg.attachments.size > 0) {
                const attachment = msg.attachments.first();
                text= ` L'adjunt eliminat era: ${attachment.name}`;
              }else{
                text = `El missatge "${msg.content}" ha estat eliminat del canal ${msg.channel.name}.`;
              }

              for (const docId of canalIds) {
                await insertarText(docId, authorName, text);
              }
            
            });

            } catch (error) {
              debug(error);
              interaction.reply('Error al crear el document');
            }
          }
       }
  );

client.login(token_discord).then(() => {
  client.application.commands
    .create(crear.toJSON())
    .then(console.log)
    .catch(console.error);
});


/*
const fs = require('fs').promises;
const path = require('path');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis')

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
    debug('No files found.');
    return;
  }

  debug('Files:');
  files.map((file) => {
    debug(`${file.name} (${file.id})`);
  });
}

authorize().then(listFiles).catch(debug);
*/
