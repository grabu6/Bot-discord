const {google}=require('googleapis');
const moment=require('moment');
const credentials= require('../credentials.json');
const token=require('../token.json');

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

let carpeta;

async function crearCarpeta(){

    if(!carpeta){
        const dadesCarpeta={
            name:`${moment().format('YYYY-MM-DD')}`,
            mimeType: 'application/vnd.google-apps.folder'
        };

        const carpetaResposta= await drive.files.create({
            resource: dadesCarpeta,
            fields: 'id'
        });

        carpeta=carpetaResposta.data;
    }
        return carpeta;
}

async function crearDoc(title){
    try{
        const carpeta=await crearCarpeta();
        const dades={
            name: title,
            parents:[carpeta.id],
            mimeType: 'application/vnd.google-apps.document'
        };
    
        const resposta= await drive.files.create({
        resource: dades,
        fields: 'id',
    });
    const documentId=resposta.data.id;

    return documentId;

} catch (error){
    console.log(error);
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
                            text:text,
                            endOfSegmentLocation: {}
                        }
                    }
                ]
            }
        });
    } catch (error){
        console.log(error);
    }
}

module.exports={
    crearCarpeta,
    crearDoc,
    insertarText
};