import { handlers } from '../../lib/netlify-runtime.mjs';
export default request => handlers().media(request);
export const config = {path:"/media/:id",method:["GET", "HEAD"]};
