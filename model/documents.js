const {google}=require('googleapis');
const moment=require('moment');
const credentials= require('../credentials.json');
const token=require('../token.json');
const {config}=require('dotenv');
config();
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
  
      const query = `name='${serverName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const carpetaExisteix = await drive.files.list({
      q: query,
      fields: "files(id)",
      spaces: "drive",
    });

    let carpeta;

    if (carpetaExisteix.data.files.length > 0) {
      carpeta = carpetaExisteix.data.files[0];
    } else {
      const dadesCarpeta = {
        name: serverName,
        mimeType: "application/vnd.google-apps.folder",
      };
      const novaCarpeta = await drive.files.create({
        resource: dadesCarpeta,
        fields: "id",
      });
  
      carpeta = novaCarpeta.data;
      
      const canals = await server.channels.cache.filter(
        (canal) => canal.type === "text"
      );

      const canalIds = [];

      for (const [_, canal] of canals) {
        const nomCanal = canal.name;
        const dadesCanal = {
          name: nomCanal,
          parents: [carpeta.id],
          mimeType: "application/vnd.google-apps.folder",
        };

        try{

        const canalCarpeta = await drive.files.create({
          resource: dadesCanal,
          fields: "id",
        });

        const { documentId, parentId } = await crearDoc(moment().format('YYYY-MM-DD'), canalCarpeta.data.id); 
        canalIds.push(documentId);
      }catch (error) {
        debug(`Error al crear la subcarpeta per ${nomCanal}: ${error}`);
      }
    }
      return { carpetaId: novaCarpeta.data.id, canalIds};    
    
    }}catch (error) {
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

async function insertarText(documentId, text){
    try{
        await docs.documents.batchUpdate({
            documentId,
            requestBody: {
                requests: [
                    {
                        insertText: {
                            text:text  + '\n',
                            endOfSegmentLocation: {}
                        }
                    }
                ]
            }
        });
    } catch (error){
        debug(error);
    }
}

module.exports={
    crearCarpeta,
    crearDoc,
    insertarText
};