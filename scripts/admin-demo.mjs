// Local-only disposable studio demo. This file is not in the production deploy.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MemoryStore} from '../tests/support/memory-store.mjs';
import {CatalogueStore} from '../lib/store.mjs';
import {createHandlers} from '../lib/handlers.mjs';
if(process.env.NETLIFY==='true')throw new Error('The demo cannot run on Netlify.');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const bundle=JSON.parse(await readFile(new URL('../netlify/generated/site.json',import.meta.url),'utf8'));
const repository=new CatalogueStore(new MemoryStore(),bundle.seed);
const port=5180;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.png':'image/png','.gif':'image/gif','.svg':'image/svg+xml','.xml':'application/xml'};
createServer(async(req,res)=>{
  try {
    if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){res.writeHead(403);res.end();return;}
    const url=new URL(req.url,`http://${req.headers.host}`);const chunks=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>5000000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
    const request=new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
    let signedIn=(req.headers.cookie||'').split(';').some(c=>c.trim()==='studio_demo=owner');let cookie;
    const handlers=createHandlers({repository,templates:bundle.templates,site:bundle.site,context:'local demo (temporary memory only)',getUser:async()=>signedIn?{id:'demo-owner',email:'demo@seosonas.test',roles:['admin']}:null,auth:{
      login:async(email,password)=>{if(email!=='demo@seosonas.test'||password!=='local-demo-only')throw new Error('Use demo credentials');signedIn=true;cookie='studio_demo=owner; HttpOnly; SameSite=Strict; Path=/';},
      logout:async()=>{signedIn=false;cookie='studio_demo=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/';}
    }});
    let response;
    const routes={'/api/session':'session','/api/admin':'admin','/api/upload':'upload','/api/preview':'page','/api/catalogue':'page','/data/products.json':'page','/data/images.json':'page','/sitemap.xml':'page'};
    if(url.pathname==='/api/checkout'||req.method==='POST'&&url.pathname==='/order-received.html')response=Response.json({error:'Payment and real order submission are disabled in the local demo.'},{status:403});
    else if(routes[url.pathname])response=await handlers[routes[url.pathname]](request);
    else if(url.pathname.startsWith('/media/'))response=await handlers.media(request);
    else if(url.pathname==='/'||Object.hasOwn(bundle.templates,url.pathname.slice(1)))response=await handlers.page(request);
    else {
      let name=decodeURIComponent(url.pathname);if(name.endsWith('/'))name+='index.html';
      const file=path.resolve(root,'.'+name);
      if(!file.startsWith(root))throw new Error('Invalid path');
      const bytes=await readFile(file);response=new Response(bytes,{headers:{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}});
    }
    res.writeHead(response.status,{...Object.fromEntries(response.headers),...(cookie?{'Set-Cookie':cookie}:{})});res.end(Buffer.from(await response.arrayBuffer()));
  } catch(error){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Disposable admin demo: http://127.0.0.1:${port}/admin/\nEmail: demo@seosonas.test\nPassword: local-demo-only\nAll changes are discarded when this server stops. No Netlify data or orders are touched.`));
