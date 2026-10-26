import { getStore } from '@netlify/blobs';
import * as identity from '@netlify/identity';
import bundle from '../netlify/generated/site.json' with {type:'json'};
import { CatalogueStore,storeName } from './store.mjs';
import { createHandlers } from './handlers.mjs';
export function handlers() {
  const repository=new CatalogueStore(getStore({name:storeName(bundle.environment),consistency:'strong'}),bundle.seed);
  return createHandlers({repository,getUser:identity.getUser,auth:identity,templates:bundle.templates,site:bundle.site,context:bundle.environment.CONTEXT});
}
