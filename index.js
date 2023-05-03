const {Client, GatewayIntentBits, Collection}= require ('discord.js');
const client = new Client({ intents: [ 
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent] });
const { SlashCommandBuilder } = require('discord.js');
const {crearCarpeta,insertarText}= require('./model/documents');
const process = require('process');
const debug = require('debug')('bot-discord');
const {config}=require('dotenv');
config();
const token_discord= process.env.TOKEN_DISCORD;

const crear = new SlashCommandBuilder()
    .setName('crear')
    .setDescription('Crea una carpeta i un document a Google Drive que captura tot el text que s\'escriu al xat')

client.commands=new Collection();

client.on('ready', async() => {
  debug(`Logged in as ${client.user.tag}!`);
  const command = await client.application.commands.create(crear);
  client.commands.set(command.name, command);
});

client.on('interactionCreate', async interaction => {
  try {  
  if (!interaction.isCommand()) return;
  if (interaction.deferred || interaction.replied) return;
  
    const { commandName } = interaction;

    if (commandName === 'crear') {

      await interaction.deferReply();
      
      const {carpetaId, canalIds} = await crearCarpeta(interaction,client);
             
      let capturant = true;

      client.on('messageCreate', async msg2 => {
        if (capturant && msg2.content !== '' && !msg2.author.bot) {
          for (const [, msg] of messages) {
            if (msg.content !== '' && !msg.author.bot) {
              const text = msg.content;
              for (const docId of canalIds) {
                await insertarText(docId, text);
              }
            }
          }
        }
      });

      await interaction.followUp("Carpeta creada correctament.")

      }} catch (error) {
          debug(error);
          interaction.reply('Error al crear la carpeta i/o el document.');
      }
      }
  );

client.login(token_discord);

/*

const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

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

authorize().then(listFiles).catch(debug);*/
