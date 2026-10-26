import { handlers } from '../../lib/netlify-runtime.mjs';
export default request => handlers().session(request);
export const config = {path:"/api/session",method:["GET", "POST"]};
