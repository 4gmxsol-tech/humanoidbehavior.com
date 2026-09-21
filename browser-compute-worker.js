import { runBrowserEvaluation } from "./browser-compute.js?v=17";

self.onmessage = async event => {
  try {
    const result = await runBrowserEvaluation({
      ...event.data,
      onProgress: (done, total) => self.postMessage({type:"progress", done, total})
    });
    self.postMessage({type:"complete", result});
  } catch (error) {
    self.postMessage({type:"error", message:String(error?.message || error), stack:String(error?.stack || "")});
  }
};
