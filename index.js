// Importation des modules necessaires
const { Configuration, OpenAIApi } = require('openai');
const { LocalAuth, Client } = require('whatsapp-web.js');
const fs = require('fs');
const dotenv = require('dotenv');
const qrcode = require('qrcode-terminal');

//Initialisation des modules necessitant une initialisation
const contextPath = './context.json';
dotenv.config();
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        headless:true, 
        args: ['--disable-gpu', '--disable-setuid-sandbox', '--no-sandbox', '--no-zygote'] 
    }
});

const config = new Configuration({
    apiKey:process.env.OPENAI_API_KEY
})

const openai = new OpenAIApi(config)


// Fonction de reception et de gestions des messages
const messageHandler = async (client, message) => {
    if(!message.isStatus || message.from !=="status@broadcast"){
        // Recuperer le contexte associé à l'utilisateur
        fs.readFile(contextPath, 'utf8', (error, contextData) => {
            if(error){
               console.log(error);
               return;
            }
            const data = JSON.parse(contextData);

            // if(!data[message.from]){
            //     const userResponse = `Salut👋🏾\nJe suis ton assistant conversationnel basé sur l'IA ChatGPT\nMalheureusement tu ne fais pas partie des personnes autorisées à discuter avec moi pour l'instant.\nTu peux contacter l'administrateur pour t'autoriser sur le numéro suivant: wa.me/2250777250961`
            //     client.sendMessage(message.from, userResponse)
            // }else{
            if(data[message.from]!=='status@broadcast'){

                if(!data[message.from]){
                    context = [{
                        role:"user",
                        content:message.body
                    }]
                }else{
                context = [...data[message.from], {
                    role:"user",
                    content:message.body
                }].slice(-4)
                }
                console.log(context);
                openai.createChatCompletion({
                    model:"gpt-3.5-turbo",
                    messages: context,
                    max_tokens:256
                })
                .then(response=>{
                    context = [...context, {
                        role:"assistant",
                        content:response.data.choices[0].message.content
                    }]
                    data[message.from]=context
                    fs.writeFile(contextPath, JSON.stringify(data), (error)=>{
                        if(error){
                            console.log(error);
                            return;
                         }
                    })
                    console.log(response.data);
                    client.sendMessage(message.from, response.data.choices[0].message.content)
                    console.log(data[message]);

                })
                .catch()
                .finally()
            }

            
            //}
       
       })
        
        // Completer ce contexte avec le message reçu et l'envoyer à ChatGPT
        
        
        // Recevoir la réponse de ChatGPT, l'ajouter au contexte puis renvoyer à l'utilisateur
    }
}

const messageHandler2 = async (client, message) =>{
    const newMessage = {
        from:message.from,
        body:message.body,
        user:message._data.notifyName,
    };
    if(message.from!=="status@broadcast" && message.from['length']<=18){
        console.log(newMessage);
        //console.dir(message)

        fs.readFile(contextPath, 'utf8', (error, contextData) => {
            if(error){
               console.log(error);
               return;
            }
            const data = JSON.parse(contextData);
            context = data[message.from]?[
                ...data[message.from],
                {
                    role:"user",
                    content:message.body
                }
            ]:[
                {
                    role:"user",
                    content:message.body
                }
            ]
            context = determineIdealContext(context);
            openai.createChatCompletion({
                model:"gpt-3.5-turbo",
                messages: context,
                max_tokens:256
            })
            .then(response=>{
                context = [...context, {
                    role:"assistant",
                    content:response.data.choices[0].message.content
                }]
                console.log(context)
                data[message.from]=context
                fs.writeFile(contextPath, JSON.stringify(data), (error)=>{
                    if(error){
                        console.log(error);
                        return;
                     }
                })
                client.sendMessage(message.from, response.data.choices[0].message.content)
            })
        })

    }else if(message.from==='status@broadcast'){
        console.log("status message has been sent")
        console.log(newMessage);
    }else{
        console.log('Group message has been sent')
        console.log(newMessage);
    }
}
const determineIdealContext = (context)=>{
    return context.slice(-8);
}

client.on('qr', (qr) => {
    qrcode.generate(qr,{
        small: true,
    })
});
client.on('message', message=>messageHandler2(client, message))

client.on('ready', () => {
    console.log('Client is ready!');
});

client.initialize();
