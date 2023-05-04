const {google}=require('googleapis');
const moment=require('moment');
const credentials= require('../credentials.json');
const token=require('../token.json');
const {config}=require('dotenv');
config();
const axios = require('axios');
const debug = require('debug')('bot-discord');


const auth= new google.auth.OAuth2({
    clientId: credentials.installed.client_id,
    clientSecret: credentials.installed.client_secret,
    redirectUri: credentials.installed.redirect_uris[0],
    scopes: "https://www.googleapis.com/auth/drive"
});

auth.setCredentials({refresh_token: token.refresh_token});


const drive=google.drive({
    version: 'v3',
    auth: auth
});

const docs=google.docs({
    version:'v1',
    auth:auth
});

async function crearCarpeta(interaction, client) {
  try {
    const server = await client.guilds.fetch(interaction.guildId);
    const serverName = server.name;
    await server.channels.fetch();
    const canals = server.channels.cache.filter((canal) => canal.type === 0);

    let carpeta;
    try {
        carpeta = await drive.files.create({
          resource: {
            name: serverName,
            mimeType: 'application/vnd.google-apps.folder',
            fields: 'id'
          },
        });
        debug("Carpeta creada correctament");
    } catch (error) {
      debug(error);
      throw new Error("Error al crear la carpeta");
    }
    
    const canalIds = [];
    
    for (const [_, canal] of canals) {
      const nomCanal = canal.name;

      let carpetaCanal;
      try {
          carpetaCanal = await drive.files.create({
            resource: {
              name: nomCanal,
              parents: [carpeta.data.id],
              mimeType: 'application/vnd.google-apps.folder',
              fields: 'id'
            },
          })
          debug("Subcarpeta creada correctament");
      } catch (error) {
        debug(error);
        throw new Error("Error al crear les subcarpetes dels canals");
      }
      const { documentId, parentId } = await crearDoc(moment().format('YYYY-MM-DD'), carpetaCanal.data.id); 
      canalIds.push(documentId);
    }
    return { carpetaId: carpeta.data.id, canalIds};
  } catch (error) {
    debug(error);
    throw new Error("Error al crear la carpeta");
  }
}

async function crearDoc(documentName, parentId){

        try {
            const dades = {
              name: documentName,
              parents: [parentId],
              mimeType: "application/vnd.google-apps.document",
            };
        
            const resposta = await drive.files.create({
              resource: dades,
              fields: "id",
            });
            const documentId = resposta.data.id;
        
            return {documentId,parentId};

          } catch (error) {
            debug(error);
          }
}

async function insertarText(documentId, authorName, text, attachment) {
  try {
    const hora = new Date().toLocaleTimeString();
    const informacio = `${authorName}:          ${text}           ${hora}\n\n`;

    const requests = [
      {
        insertText: { 
          text: informacio,
          endOfSegmentLocation: {}
        }
      }
    ];

    if (attachment) {

      const attachmentData = await axios.get(attachment.url, { responseType: 'stream' });
      
      const res = await drive.files.create({
        requestBody: {
          name: attachment.name,
          mimeType: attachment.contentType,
        },
        media: {
          mimeType: attachment.contentType,
          body: attachmentData.data,
        },
        fields: 'id'
      });
      
      const fileId = res.data.id;
      
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        sendNotificationEmail: false,
      });

      const imageUri = `https://drive.google.com/uc?id=${fileId}`;

      requests.unshift({
        insertInlineImage: {
          endOfSegmentLocation: {},
          objectSize: {
            height: {
              magnitude: 200,
              unit: "PT"
            },
            width: {
              magnitude: 200,
              unit: "PT"
            }
          },
            uri: imageUri
          }
      });
    }
    
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: requests
      }
    });
  } catch (error) {
    debug(error);
  }
}

module.exports={
    crearCarpeta,
    crearDoc,
    insertarText
};
