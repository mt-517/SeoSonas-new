// A test-only adapter. Production functions always use authenticated Netlify storage.
export class MemoryStore {
  entries=new Map(); counter=0;
  async getWithMetadata(key,{type}={}) {const e=this.entries.get(key);if(!e)return null;return {...structuredClone(e),data:type==='arrayBuffer'?e.data:structuredClone(e.data)};}
  async get(key,options){return (await this.getWithMetadata(key,options))?.data??null;}
  async getMetadata(key){const e=this.entries.get(key);return e?{metadata:e.metadata,etag:e.etag}:null;}
  async setJSON(key,value,options={}){return this.set(key,value,options);}
  async set(key,value,options={}){
    const previous=this.entries.get(key);
    if(options.onlyIfNew&&previous||options.onlyIfMatch&&previous?.etag!==options.onlyIfMatch)return{modified:false};
    const etag=String(++this.counter);this.entries.set(key,{data:structuredClone(value),etag,metadata:options.metadata||{}});return{modified:true,etag};
  }
}
