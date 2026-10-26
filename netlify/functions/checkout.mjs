import { handlers } from '../../lib/netlify-runtime.mjs';
export default request => handlers().checkout(request);
export const config = {path:"/api/checkout",method:["POST"]};
