(() => {
  const API_ORIGIN = "https://api.humanoidbehavior.com";
  window.HB_API_ORIGIN = API_ORIGIN;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      return nativeFetch(API_ORIGIN + input, init);
    }

    if (input instanceof Request && input.url.startsWith(window.location.origin + "/api/")) {
      const next = new Request(API_ORIGIN + new URL(input.url).pathname + new URL(input.url).search, input);
      return nativeFetch(next, init);
    }

    return nativeFetch(input, init);
  };
})();
