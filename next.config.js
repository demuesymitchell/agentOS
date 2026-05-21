/** @type {import('next').NextConfig} */
const nextConfig={webpack:(c)=>{c.resolve.fallback={...c.resolve.fallback,fs:false,path:false};return c}};
module.exports=nextConfig;
