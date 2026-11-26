'use strict';

window.setUpPizzaScanner = function (receive) {
  const dialog = document.getElementById('camera');
  const video = dialog.querySelector('video');
  const message = document.getElementById('camera-status');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  let stream = null;
  let session = 0;
  let timer = null;
  let lastCode = null;

  function stop() {
    session++;
    clearTimeout(timer);
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
    lastCode = null;
  }

  function close() {
    stop();
    if (dialog.open) dialog.close();
  }

  function readFrame(token) {
    if (session !== token || !dialog.open) return;
    if (video.readyState >= 2 && video.videoWidth > 0) {
      canvas.width = Math.min(800, video.videoWidth);
      canvas.height = Math.round(canvas.width * video.videoHeight / video.videoWidth);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = window.jsQR(frame.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });
      if (result && result.data !== lastCode) {
        lastCode = result.data;
        const error = receive(result.data);
        if (!error) {
          close();
          return;
        }
        message.textContent = error;
      }
    }
    timer = setTimeout(() => readFrame(token), 180);
  }

  document.getElementById('scan').addEventListener('click', async () => {
    stop();
    dialog.showModal();
    message.textContent = 'カメラの使用を許可してください。';
    const token = session;
    try {
      if (typeof window.jsQR !== 'function' || !context) {
        message.textContent = 'QRの読み取りを準備できませんでした。ページを開き直してください。';
        return;
      }
      const camera = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false
      });
      if (token !== session || !dialog.open) {
        camera.getTracks().forEach(track => track.stop());
        return;
      }
      stream = camera;
      video.srcObject = stream;
      await video.play();
      if (token !== session) return;
      message.textContent = 'QR全体をカメラに映してください。';
      readFrame(token);
    } catch {
      if (token !== session) return;
      stop();
      message.textContent = 'カメラを開けませんでした。Chromeのカメラ許可を確認して、もう一度試してください。';
    }
  });
  document.getElementById('close').addEventListener('click', close);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    close();
  });
  window.addEventListener('pagehide', close);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) close();
  });
};
