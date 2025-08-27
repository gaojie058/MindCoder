self.onmessage = function (event: MessageEvent) {
  const { dotData } = event.data;

  self.postMessage(dotData); 
};
