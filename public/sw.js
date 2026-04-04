self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("fetch", () => {
  // 暂时不写缓存逻辑，只为了满足 PWA 安装条件
});
