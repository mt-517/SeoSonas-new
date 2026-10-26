import { handlers } from '../../lib/netlify-runtime.mjs';
export default request => handlers().upload(request);
export const config = {path:"/api/upload",method:["POST"]};
