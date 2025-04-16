const express = require('express');
const cors = require('cors');
const Tesseract = require('tesseract.js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' })); 

app.post('/ocr', async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image data missing' });
  }

  try {
    console.log('📸 Received image for OCR');

    const result = await Tesseract.recognize(
      image,
      'tur', 
      {
        logger: m => console.log('🔍', m),
        langPath: 'https://tessdata.projectnaptha.com/4.0.0_best', 
      }
    );

    console.log('✅ OCR Result:', result.data.text);
    res.json({ text: result.data.text });
  } catch (err) {
    console.error('❌ OCR error:', err);
    res.status(500).json({ error: err.message || 'Failed to recognize text' });
  }
});

app.listen(3000, () => {
  console.log('🚀 OCR server running on http://localhost:3000');
});
