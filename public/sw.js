self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  // 暂时不写缓存逻辑，只为了满足 PWA 安装条件
});
