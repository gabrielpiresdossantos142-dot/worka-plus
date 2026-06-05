/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: false,
  // Quando o user vai pra "/", manda pra /index.html que serve o app legado.
  async rewrites() {
    return [{ source: "/", destination: "/index.html" }];
  },
};
