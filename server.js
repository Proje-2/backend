const express = require('express');
const cors = require('cors');
const sharp = require('sharp');
const { createWorker, PSM } = require('tesseract.js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Orta sütun parlaklığına göre çift sütun mu kontrol et
async function isDoubleColumn(base64) {
  const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const image = sharp(buffer).greyscale();
  const metadata = await image.metadata();
  const { width, height } = metadata;
  const middleX = Math.floor(width / 2);

  const middleStrip = await image.extract({ left: middleX, top: 0, width: 1, height }).raw().toBuffer();
  const average = middleStrip.reduce((sum, val) => sum + val, 0) / middleStrip.length;

  console.log("🧠 Orta sütun parlaklık ortalaması:", average);
  return average > 180; // çift sütun olabilir
}

// Görseli ortadan ikiye böler
async function splitImageBase64(base64) {
  const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const metadata = await sharp(buffer).metadata();
  const halfWidth = Math.floor(metadata.width / 2);

  const leftBuffer = await sharp(buffer)
    .extract({ left: 0, top: 0, width: halfWidth, height: metadata.height })
    .toBuffer();

  const rightBuffer = await sharp(buffer)
    .extract({ left: halfWidth, top: 0, width: metadata.width - halfWidth, height: metadata.height })
    .toBuffer();

  return {
    left: `data:image/jpeg;base64,${leftBuffer.toString('base64')}`,
    right: `data:image/jpeg;base64,${rightBuffer.toString('base64')}`
  };
}

app.post('/ocr', async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image data missing' });
  }

  console.log('📸 Görsel alındı, OCR başlatılıyor...');

  const worker = await createWorker({
    logger: m => console.log(m),
  });

  try {
    await worker.loadLanguage('tur+eng');
    await worker.initialize('tur+eng');
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    });

    let finalText = '';
    const isDouble = await isDoubleColumn(image);

    if (isDouble) {
      console.log('📊 Görsel çift sütun olarak algılandı. İkiye bölünüyor...');
      const { left, right } = await splitImageBase64(image);

      const [leftResult, rightResult] = await Promise.all([
        worker.recognize(left),
        worker.recognize(right)
      ]);

      finalText = leftResult.data.text + '\n' + rightResult.data.text;
    } else {
      console.log('🧾 Görsel tek sütun olarak algılandı. Normal OCR uygulanıyor...');
      const result = await worker.recognize(image);
      finalText = result.data.text;
    }

    console.log('✅ OCR tamamlandı.');
    res.json({ text: finalText });
  } catch (err) {
    console.error('❌ OCR error:', err);
    res.status(500).json({ error: err.message || 'OCR failed' });
  } finally {
    await worker.terminate();
  }
});

app.listen(3000, () => {
  console.log('🚀 OCR server running at http://localhost:3000');
});
