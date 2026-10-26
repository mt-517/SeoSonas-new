import { handlers } from '../../lib/netlify-runtime.mjs';
export default request => handlers().admin(request);
export const config = {path:"/api/admin",method:["GET", "POST"]};
