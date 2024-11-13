import React, { useEffect, useRef } from 'react';

const Waveform = ({ analyserNode }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!analyserNode) {
      console.warn("Analyser node is not available yet.");
      return;
    }

    const canvas = canvasRef.current;
    const canvasContext = canvas.getContext("2d");
    analyserNode.fftSize = 2048;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestAnimationFrame(draw);
      analyserNode.getByteTimeDomainData(dataArray);

      canvasContext.fillStyle = "#000";
      canvasContext.fillRect(0, 0, canvas.width, canvas.height);

      canvasContext.lineWidth = 2;
      canvasContext.strokeStyle = "#FF69B4";
      canvasContext.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasContext.moveTo(x, y);
        } else {
          canvasContext.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasContext.lineTo(canvas.width, canvas.height / 2);
      canvasContext.stroke();
    };

    draw();
  }, [analyserNode]);

  return <canvas ref={canvasRef} width="600" height="100" />;
};

export default Waveform;