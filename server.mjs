import http from 'node:http';
import {readFile} from 'node:fs/promises';
const files=new Map([['/','index.html'],['/index.html','index.html'],['/app.js','app.js'],['/route.js','route.js'],['/recording.js','recording.js'],['/style.css','style.css']]);
const port=Number(process.env.PORT)||5173;
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8'};
http.createServer(async(req,res)=>{const file=files.get(new URL(req.url,'http://localhost').pathname);if(!file){res.writeHead(404);res.end('Not found');return;}try{const content=await readFile(new URL(file,import.meta.url));res.writeHead(200,{'Content-Type':types[file.split('.').at(-1)],'Cache-Control':'no-cache'});res.end(content);}catch{res.writeHead(500);res.end('Unable to read application file');}}).listen(port,'127.0.0.1',()=>console.log(`Ride Replay: http://localhost:${port}`));
